const { createContext, runInContext } = require('vm');
const cloneDeep = require('lodash.clonedeep');
const cloneDeepWith = require('lodash.clonedeepwith');
const { createHash } = require('crypto');
const Result = require('@nbook/result');
const JSONRPC = require('../util/JSONRPC');
const Secrets = require('./Secrets');
const processTopLevelAwait = require('./utils/processTopLevelAwait');

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

class Runtime extends JSONRPC {

    static main() {
        const runtime = Runtime.fromProcess(process);
        runtime.handle('run', ({ notebook, targetIndex }) => runtime.run(notebook, targetIndex));
        runtime.sendNotification('ready');
    }

    get cachedContexts() {
        return cachedContexts;
    }

    set cachedContexts(cctx) {
        cachedContexts = cctx;
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

    async run(notebook, targetIndex) {
        const blocks = notebook.blocks;
        targetIndex = typeof targetIndex === "number" ? targetIndex : blocks.length;

        const contexts = new Map();
        const outputs = [];
        const count = blocks.length;

        let rollingContext = this.baseContext;
        let ignoreCache = false;
        let failed = false;
        let canceled = false;
        let hash = '';
        let progress = 0;

        this.emit('progress', { value: progress, index: null, message: 'running' });

        for (let index = 0; index < count; index++) {
            const block = blocks[index];
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

            progress = Math.round(((index + 1) / blocks.length) * 100);
            this.emit('progress', { value: progress, index, hash, message: `output block ${index} (${block.id})` });
        }

        this.cachedContexts.clear();
        this.cachedContexts = contexts;

        this.emit('progress', { value: progress, index: null, message: `done` });
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
