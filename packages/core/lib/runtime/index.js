const pidusage = require('pidusage');
const { fork } = require('child_process');
const JSONRPC = require('../util/JSONRPC');
const RuntimeTimeoutError = require('./errors/RuntimeTimeoutError');

module.exports = class RuntimeService {

    constructor(notebook, path) {
        this.initialized = false;
        this.disposed = false;
        this.notebook = notebook;
        this.timeoutId = null;
        this.path = path;
    }

    start() {
        if(this.runtime && this.initialized || this.disposed) {
            return;
        }

        this.runtime = fork(require.resolve('./Runtime'), [], {
            cwd: this.path,
            stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ],
            execArgv: ['--expose-gc']
        });

        this.jsonrpc = JSONRPC.fromProcess(this.runtime);
        this.runtime.stdout.pipe(process.stdout);
        this.runtime.stderr.pipe(process.stderr);

        return this.jsonrpc.awaitNotification('ready');
    }

    stop() {
        if(this.runtime) {
            this.runtime.kill();
            this.runtime = null;
        }
    }

    restart() {
        this.stop();
        return this.start();
    }

    getStats() {
        return new Promise((resolve, reject) => {
            if(this.runtime) {
                pidusage(this.runtime.pid, (error, stats) => {
                    if(error) {
                        reject(error);
                    } else {
                        resolve(stats);
                    }
                });
            } else {
                resolve(null);
            }
        });
    }

    run(targetIndex, timeoutMs = null) {
        return new Promise(async (resolve, reject) => {
            let timedOut = false;
            let timeoutId = null;

            if(timeoutMs) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    this.restart();
                    reject(new RuntimeTimeoutError);
                }, timeoutMs);
            }

            try {
                const result = await this.jsonrpc.sendRequest('run', { targetIndex, notebook: this.notebook });

                if(!timedOut) {
                    resolve(result);
                }
            } catch(error) {
                reject(error);
            } finally {
                if(timeoutId && !timedOut) {
                    clearTimeout(timeoutId);
                }
            }
        });
    }

    collectGarbage() {
        this.jsonrpc.sendNotification('collectGarbage');
    }

    on(event, handler) {
        this.jsonrpc.on(event, handler);
    }

    off(event, handler) {
        this.jsonrpc.off(event, handler);
    }
}
