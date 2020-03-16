
import { EventEmitter } from 'events';
const { fork } = require('child_process');
const pidusage = require('pidusage');
const Path = require('path');
const fs = require('fs');

export default class Book extends EventEmitter {

    constructor(path, state = {}) {
        super();
        this.setStatus('initializing');
        this.path = path;
        this.name = state.name || "untitled book";
        this.blocks = state.blocks || [];
        this.timeoutMs = state.timeoutMs || 30000;
        this.stats = { current: {}, evolutive: [] };
        if(this.blocks.length === 0) {
            this.createBlock();
        }
        this.createRuntime();
        this.setStatus('idle');

        setInterval(() => {
            if(this.runtime) {
                pidusage(this.runtime.pid, (error, stats) => {
                    this.updateStats(stats);
                });
            } else {
                this.updateStats({});
            }
        }, 250);
    }

    createRuntime() {
        this.runtime = fork(Path.join(__dirname, '..', 'lib', 'Runtime.js'), [], {
            cwd: this.path,
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ],
            execArgv: ['--expose-gc']
        });

        this.runtime.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
          
        this.runtime.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
          
        this.runtime.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    }

    recreateRuntime() {
        if(this.runtime) {
            this.runtime.kill();
        }
        this.createRuntime();
    }

    forceRuntimeGC() {
        this.send({ action: 'gc' });
    }

    updateStats(stats) {
        this.stats.current = { ...stats, timestamp: new Date };
        const evolutive = [ ...this.stats.evolutive, this.stats.current ];
        this.stats.evolutive = evolutive.slice(Math.max(evolutive.length - 100, 0));
        this.emit('stats', this.stats);
    }

    send(payload) {
        this.runtime.send(JSON.stringify(payload));
    }

    run(index = this.blocks.length - 1) {
        if(this.status === 'running') {
            throw new Error('Book already running.');
        }

        this.setStatus('running');
        this.send({ action: 'run', book: this, targetIndex: index });

        const onMessage = payload => {
            console.log(payload);
            const { action, ...data } = JSON.parse(payload);

            if(action === 'block_output') {
                const { index, ...output } = data;
                this.updateBlockOutput(index, output);
            } else if(action === 'finalized') {
                clean();
                this.onFinalized();
            }
        }

        const onError = error => {
            console.error(error);
            clean();
            this.onError(error);
        };

        const onTimeout = () => {
            clean();
            this.onTimeout();
        }

        this.runtime.on('message', onMessage);
        this.runtime.on('error', onError);
        const timeoutId = setTimeout(onTimeout, this.timeoutMs);

        const clean = () => {
            this.runtime.off('message', onMessage);
            this.runtime.off('error', onError);
            clearTimeout(timeoutId);
        }

        for(let block of this.blocks) {
            block.hasRun = false;
        }

        this.emit('update');
    }

    updateBlockOutput(index, output) {
        Object.assign(this.blocks[index], output);
        this.emit('update');
    }

    updateBlockScript(index, script) {
        Object.assign(this.blocks[index], { script, hasRun: false });
        this.focus = index;
        this.emit('update');
    }

    createBlock(index = this.blocks.length, newBlock = {}) {
        newBlock = {
            script: '',
            hasRun: false,
            result: null,
            error: null,
            ...newBlock
        }

        if(index === this.blocks.length) {
            this.blocks = [ ...this.blocks, newBlock ];
        } else {
            this.blocks = this.blocks.reduce((res, block, i) => {
                if(i === index) {
                    return [ ...res, newBlock, block ];
                } else {
                    return [ ...res, block ];
                }
            }, []);
        }

        this.focus = index;

        this.emit('update');
    }

    deleteBlock(index) {
        this.blocks = this.blocks.filter((b, i) => i !== index);
        this.focus = this.blocks[index] ? index : index - 1;
        if(this.blocks.length === 0) {
            this.create();
        } else {
            this.emit('update');
        }
    }

    clearBlock(index) {
        this.updateBlockScript(index, '');
    }

    setStatus(status) {
        this.status = status;
        this.emit('update');
    }

    onFinalized() {
        this.setStatus('idle');
    }

    onTimeout() {
        this.recreateRuntime();
        this.setStatus('timed_out');
    }

    onError(error) {
        this.error = error;
        this.setStatus('failed');
    }

    eventNames() {
        return [ 'update' ];
    }

    saveAs(path) {
        if(this.status !== 'idle') {
            throw new Error(`Can't save on status ${this.status}.`)
        }

        this.setStatus('saving');
        fs.writeFileSync(Path.join(path, 'book.json'), JSON.stringify(this, null, 2));
        this.setStatus('idle');
    }

    save() {
        this.saveAs(this.path);
    }

    toJSON() {
        return {
            name: this.name,
            timeoutMs: this.timeoutMs,
            blocks: this.blocks.map(block => ({
                script: block.script,
                result: block.result,
                error: block.error
            }))
        }
    }

    static create() {
        return new Book(fs.mkdtempSync('nbook-'));
    }

    static load(path) {
        const data = fs.readFileSync(Path.join(path, 'book.json')).toString();
        const state = JSON.parse(data);
        return new Book(path, state);
    }
}
