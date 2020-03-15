
import { EventEmitter } from 'events';
const { fork } = require('child_process');
const pidusage = require('pidusage');
const Path = require('path');
const fs = require('fs');

export default class Book extends EventEmitter {

    constructor(path) {
        super();
        this.path = path;
        this.blocks = [];
        this.timeoutMs = 30000;
        this.stats = { current: {}, evolutive: [] };
        this.createWorker();
        this.createBlock(0, { script: '123' });
        this.on('update', () => console.log('update', this));
        this.on('stats', (stats) => console.log('stats', stats));

        setInterval(() => {
            if(this.runtime) {
                pidusage(this.runtime.pid, (error, stats) => {
                    this.updateStats(stats);
                });
            } else {
                this.updateStats({});
            }
        }, 1000);
    }

    createWorker() {
        this.runtime = fork(Path.join('lib', 'Runtime.js'), [], {
            cwd: this.path,
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
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

    recreateWorker() {
        if(this.runtime) {
            this.runtime.kill();
        }
        this.createWorker();
    }

    updateStats(stats) {
        this.stats.current = { ...stats, timestamp: new Date };
        const evolutive = [ ...this.stats.evolutive, this.stats.current ];
        this.stats.evolutive = evolutive.slice(Math.max(evolutive.length - 20, 0));
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
        this.send({ action: 'run', book: this, index });

        const onMessage = payload => {
            console.log(payload);
            const { action, ...data } = JSON.parse(payload);

            if(action === 'block_output') {
                const { index, ...output } = data;
                this.updateBlockOutput(index, output);
            } else if(action === 'finalized') {
                clean();
                this.setStatus('finalized');
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

        const clean = (output, error) => {
            this.runtime.off('message', onMessage);
            this.runtime.off('error', onError);
            clearTimeout(timeoutId);
        }
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
        this.setStatus('finalized');
    }
    
    onTimeout() {
        this.recreateWorker();
        this.setStatus('timed_out');
    }

    onError(error) {
        this.error = error;
        this.setStatus('failed');
    }

    eventNames() {
        return [ 'update' ];
    }

    static create() {
        return new Book(fs.mkdtempSync('nbook-'));
    }

    static load(path) {

    }
}
