
const EventEmitter = require('events');
const { fork } = require('child_process');
const pidusage = require('pidusage');
const Path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const { runtimePath } = require('../packages/core');


module.exports = class Book extends EventEmitter {

    static create() {
        return new Book(fs.mkdtempSync('nbook-'));
    }

    static load(path) {
        let isBackup = fs.existsSync(Path.join(path, 'book-backup.json'));
        let data = null;

        if(isBackup) {
            data = fs.readFileSync(Path.join(path, 'book-backup.json')).toString();
        } else {
            data = fs.readFileSync(Path.join(path, 'book.json')).toString();
        }

        return new Book(path, {
            ...JSON.parse(data),
            saved: !isBackup
        });
    }

    constructor(path, state = {}) {
        super();
        this.setStatus('initializing');
        this.id = state.id || uuid();
        this.saved = typeof state.saved === 'boolean' ? state.saved : false;
        this.path = path;
        this.title = state.title || "untitled book";
        this.blocks = (state.blocks || []).map(block => ({ ...block, id: block.id || uuid() }));
        this.timeoutMs = state.timeoutMs || 1000 * 60 * 5;
        this.statsFrequencyDivider = 2;
        this.statsIntervalId = null;
        this.stats = { current: {}, histogram: [] };
        this.timeoutId = null;
        if(this.blocks.length === 0) {
            this.createBlock();
        }
        this.createRuntime();
        this.setStatus('idle');
        this.watchRuntimeStatus();
    }

    createRuntime() {
        if(this.status === 'closed') {
            return;
        }

        this.runtime = fork(runtimePath, [], {
            cwd: this.path,
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ],
            execArgv: ['--expose-gc']
        });

        this.runtime.stdout.on('data', data => this.emit('runtime:stdout', data.toString()));
        this.runtime.stderr.on('data', data => this.emit('runtime:stderr', data.toString()));
        this.runtime.on('close', code => this.emit('runtime:close', { code }));

        this.runtime.on('message', data => {
            this.onMessage(JSON.parse(data));
        });

        this.runtime.on('error', error => {
            this.onError(error);
        });
    }

    killRuntime() {
        if(this.runtime) {
            this.runtime.kill();
        }
    }

    recreateRuntime() {
        this.killRuntime();
        this.createRuntime();
    }

    forceRuntimeGC() {
        this.send({ action: 'gc' });
    }

    watchRuntimeStatus() {
        console.log('watching')
        let iteration = 0;

        this.statsIntervalId = setInterval(() => {
            if(iteration % this.statsFrequencyDivider === 0) {
                if(this.runtime) {
                    pidusage(this.runtime.pid, (error, stats) => {
                        this.updateStats(stats);
                    });
                } else {
                    this.updateStats({});
                }
            }

            iteration++;
        }, 125);
    }

    updateStats(stats) {
        this.emit('stats', { ...stats, timestamp: new Date });
    }

    onMessage({ action, ...data }) {
        if(action === 'block_output') {
            const { index, ...output } = data;
            this.onBlockOutput(index, output);
            this.startTimer();
        } else if(action === 'progress') {
            this.onProgress(data);
        } else if(action === 'finalized') {
            this.onFinalized();
        }
    }

    onBlockOutput(index, output) {
        Object.assign(this.blocks[index], output);
        this.emit('block:output', { index, output });
    }

    onProgress({ index, value, message }) {
        console.log(index, value, message);
    }

    onFinalized() {
        this.setStatus('idle');
        this.emit('finalized');
        this.stopTimer();
    }

    onError(error) {
        this.emit('fail', { error });
        this.setStatus('failed');
        this.stopTimer();
    }

    onTimeout() {
        this.recreateRuntime();
        this.emit('timeout');
        this.setStatus('timed_out');
        this.stopTimer();
    }

    run(targetIndex = this.blocks.length - 1) {
        if(this.status === 'running') {
            throw new Error('Book already running.');
        }

        this.setStatus('running');
        this.emit('run', { targetIndex });
        this.send({ action: 'run', book: this, targetIndex });
        this.startTimer();
    }

    send(payload) {
        this.runtime.send(JSON.stringify(payload));
    }

    startTimer() {
        this.stopTimer();
        this.timeoutId = setTimeout(
            () => this.onTimeout(),
            this.timeoutMs
        );
    }

    stopTimer() {
        if(this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = null;
    }

    setStatus(status) {
        this.status = status;
        this.emit('status', { status });
    }

    updateBlockScript(index, script) {
        const blcokUpdatedData = { script, hasRun: false };
        Object.assign(this.blocks[index], blcokUpdatedData);
        this.focusBlock(index);
        this.update({ action: 'script', script });
    }

    focusBlock(index) {
        console.log(4)
        this.emit('block:focus', { index });
        this.focus = index;
    }

    update(data) {
        this.saved = data.saved || false;
        this.emit('update', { ...data, saved: this.saved });
    }

    createBlock(index = this.blocks.length, newBlock = {}) {
        newBlock = {
            id: uuid(),
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

        this.update({ action: 'create', block: newBlock, index });
    }

    deleteBlock(index) {
        this.blocks = this.blocks.filter((b, i) => i !== index);
        this.focus = this.blocks[index] ? index : index - 1;

        this.update({ action: 'delete', index });

        if(this.blocks.length === 0) {
            this.createBlock();
        }
    }

    clearBlock(index) {
        this.updateBlockScript(index, '');
    }

    saveBook(path) {
        fs.writeFileSync(path, JSON.stringify(this, null, 2));
    }

    saveAs(path) {
        if(this.status !== 'idle') {
            throw new Error(`Can't save on status ${this.status}.`)
        }

        this.setStatus('saving');
        this.saveBook(Path.join(path, 'book.json'));
        this.update({ saved: true });
        this.setStatus('idle');
    }

    save() {
        this.saveAs(this.path);
    }

    toJSON() {
        return {
            title: this.title,
            timeoutMs: this.timeoutMs,
            saved: this.saved,
            status: this.status,
            blocks: this.blocks.map(block => ({
                id: block.id,
                script: block.script,
                results: block.results,
                error: block.error
            }))
        }
    }

    close() {
        this.setStatus('closed');
        clearInterval(this.statsIntervalId);
        clearTimeout(this.timeoutId);
        this.emit('close');
        this.removeAllListeners();
    }

    eventNames() {
        return [
            'runtime:stdout',
            'runtime:stderr',
            'runtime:close',
            'stats',
            'block:output',
            'block:focus',
            'finalized',
            'fail',
            'timeout',
            'run',
            'status',
            'update',
            'close'
        ];
    }
}
