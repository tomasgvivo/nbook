const { createContext, runInContext } = require('vm');
const cloneDeep = require('lodash.clonedeep');
const cloneDeepWith = require('lodash.clonedeepwith');
const { createHash } = require('crypto');
const EventEmitter = require('events');
const processTopLevelAwait = require('./processTopLevelAwait');
const Result = require('./Result');
const Secrets = require('./Secrets');

const SkipSymbol = Symbol('skip');
const CancelSymbol = Symbol('cancel');
const isSecret = Symbol('isSecret');

Secrets.setSymbol(isSecret);

const clone = value => cloneDeepWith(value, value => {
    if (value && value[isSecret]) {
        return Secrets.get(value.path);
    } else {
        return cloneDeep(value);
    }
});

const isCyclic = obj => {
    const seenObjects = [];

    function detect(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        if (seenObjects.includes(obj)) {
            return true;
        }

        seenObjects.push(obj);

        for (let key in obj) {
            if (obj.hasOwnProperty(key) && detect(obj[key])) {
                return true;
            }
        }

        return false;
    }

    return detect(obj);
}

let cachedContexts = new Map();

class Runtime extends EventEmitter {

    static main() {
        if (process.channel) {
            this.startIPC();
        } else {
            this.startSTDIN();
        }
    }

    static startIPC() {
        let isRunning = false;

        process.on('message', async payload => {
            const { action, ...data } = JSON.parse(payload);

            if (action === 'run') {
                if (isRunning) {
                    throw new Error('already running');
                }

                isRunning = true;

                const runtime = new Runtime(data.book);

                runtime.on('output', ({ index, output }) => {
                    process.send(JSON.stringify({ action: 'block_output', index, ...output }));
                });

                runtime.on('progress', data => {
                    process.send(JSON.stringify({ action: 'progress', ...data }));
                });

                runtime.on('finalized', () => {
                    process.send(JSON.stringify({ action: 'finalized' }));
                    isRunning = false;
                });

                runtime.run(data.targetIndex);
            } else if (action === 'gc') {
                global.gc();
            }
        });

        process.on('disconnect', () => {
            process.exit();
        });
    }

    static startSTDIN() {
        let data = "";

        process.stdin.setEncoding('utf8');

        process.stdin.on('data', chunk => {
            data += chunk;
        });

        process.stdin.on('end', () => {
            const book = JSON.parse(data);
            const runtime = new Runtime(book);

            runtime.on('finalized', result => {
                console.log(JSON.stringify(result, null, 4));
            });

            runtime.run().catch(error => {
                console.error(error);
                process.exit(1);
            });
        });
    }

    get cachedContexts() {
        return cachedContexts;
    }

    set cachedContexts(cctx) {
        cachedContexts = cctx;
    }

    constructor(book) {
        super();
        this.book = { blocks: [], ...book };
    }

    createOutput(block) {
        let timeStartedAt = null;
        let context = null;

        return {
            stratergy: null,
            context: null,
            results: [],
            error: null,
            time: null,
            executionCount: block.executionCount || 0,
            increseExecutionCount() {
                this.executionCount++;
            },
            startTimer() {
                timeStartedAt = new Date;
            },
            stopTimer() {
                this.time = (new Date) - timeStartedAt;
            },
            setStratergy(stratergy) {
                this.stratergy = stratergy;
            },
            setContext(_context) {
                context = _context;
            },
            getContext() {
                try {
                    return clone(context);
                } catch {
                    throw new Error('Unable to clone context.');
                }
            },
            setResults(results) {
                this.results = results;
            },
            setError(error) {
                this.error = error;
                if (error) {
                    this.results = [];
                }
            },
            addResult(result) {
                if(isCyclic(result.toJSON())) {
                    throw new Error('Trying to serialize a cyclic result.');
                }

                this.results.push(result);
            }
        };
    }

    async run(targetIndex = this.book.blocks.length) {
        const contexts = new Map();
        const outputs = [];
        const count = this.book.blocks.length;

        let rollingContext = this.baseContext;
        let ignoreCache = false;
        let failed = false;
        let canceled = false;
        let hash = '';
        let progress = 0;

        this.emit('progress', { value: progress, index: null, message: 'running' });

        for (let index = 0; index < count; index++) {
            const block = this.book.blocks[index];
            const output = this.createOutput(block);

            try {
                createContext(rollingContext);

                hash = this.hashBlock(block, hash);
                this.emit('progress', { value: progress, index: index, hash, hasCache: this.cachedContexts.has(hash), message: `running block ${index} (${block.id})` });

                if(block.options.noCache && !block.options.noContext) {
                    ignoreCache = true;
                }

                if (!failed && !canceled) {
                    if (this.cachedContexts.has(hash) && index < targetIndex && !ignoreCache) {
                        // Use cache if necessary
                        output.setStratergy('cache');
                        output.setContext(this.cachedContexts.get(hash));
                        output.setResults(block.results);
                        output.setError(block.error);
                    } else if (index <= targetIndex) {
                        output.increseExecutionCount();
                        output.startTimer();
                        const context = block.options.noContext ? createContext(this.baseContext) : rollingContext;
                        await this.runBlock(block, context, output);
                        output.stopTimer();
                    }

                    if (output.getContext()) {
                        rollingContext = block.options.noContext ? rollingContext : output.getContext();
                        contexts.set(hash, output.getContext());
                    }
                }
            } catch (error) {
                output.setError(error);
            }

            if (output.error && !block.options.canFail) {
                failed = true;
            }

            if (output.stratergy === 'cancel') {
                canceled = true;
            }

            outputs.push(output);
            this.emit('output', { index, output });

            progress = Math.round(((index + 1) / this.book.blocks.length) * 100);
            this.emit('progress', { value: progress, index, hash, message: `output block ${index} (${block.id})` });
        }

        this.cachedContexts.clear();
        this.cachedContexts = contexts;

        this.emit('progress', { value: progress, index: null, message: `done` });
        this.emit('finalized', outputs);
        return outputs;
    }

    async runBlock(block, rollingContext, output) {
        try {
            let awaitPromise = false;
            let code = block.script || '';

            if (code.includes('await')) {
                const potentialWrappedCode = processTopLevelAwait(code);
                if (potentialWrappedCode !== null) {
                    code = potentialWrappedCode;
                    awaitPromise = true;
                }
            }

            output.setStratergy('run');
            Result.setCollector(result => output.addResult(result));

            if (awaitPromise) {
                await runInContext(code, rollingContext);
            } else {
                runInContext(code, rollingContext);
            }

            output.setContext(rollingContext);
            Result.unsetCollector();
        } catch (error) {
            if (error === SkipSymbol) {
                output.setStratergy('skip');
                return;
            } else if (error === CancelSymbol) {
                output.setStratergy('cancel');
                return;
            }

            const parsedStack = (
                error.stack.match(/evalmachine.*:(\d{1,}):(\d{1,})/) ||
                error.stack.match(/evalmachine.*:(\d{1,})/) ||
                []
            );

            const message = error.message;
            const line = parsedStack[1] ? parseInt(parsedStack[1], 0) : null;
            const column = parsedStack[2] ? parseInt(parsedStack[2], 0) : null;
            const stack = error.stack
                .replace(/\n    at Script.runInContext(.*?\n){1,}.*/m, '')
                .replace(/evalmachine\.\<anonymous\>/g, '(current block)');

            output.setError({ message, line, column, stack });
        }
    }

    get baseContext() {
        return clone({
            install: Object.freeze(require('./install')),
            require: Object.freeze(require('./require')),
            Secrets: Object.freeze(Secrets),
            Result: Object.freeze(Result),
            Runtime: {
                skip() {
                    throw SkipSymbol;
                },
                cancel() {
                    throw CancelSymbol;
                }
            }
        });
    }

    hashBlock(block, parentBlockHash) {
        const hash = createHash('sha256');
        hash.update(parentBlockHash);
        hash.update(block.script.trim());
        hash.update(block.options.noContext ? 'x' : '');
        return hash.digest('hex');
    }

}

Runtime.main();
