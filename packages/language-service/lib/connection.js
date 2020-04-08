const { fork } = require('child_process');
const Path = require('path');

const LOG_LEVELS = Object.freeze({
    4: 'log',
    3: 'info',
    2: 'warn',
    1: 'error',
    log: 4,
    info: 3,
    warn: 2,
    error: 1
});

module.exports = class Connection {

    static get LOG_LEVELS() {
        return LOG_LEVELS;
    }

    constructor({ logLevel = LOG_LEVELS.warn, debug = false, workspacePath, logPath }) {
        this.debug = debug;
        this.autoIncrementalId = 0;
        this.languageServer = fork(
            require.resolve('@nbook/typescript-language-server/lib/cli'),
            [
                '--node-ipc',
                '--log-level', logLevel,
                ...(logPath ? [ '--tsserver-log-file', Path.join(logPath, 'language.log') ] : []),
                '--tsserver-log-verbosity', 'verbose',
                '--tsserver-path', require.resolve('typescript/bin/tsserver')
            ],
            {
                stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ],
                cwd: workspacePath
            }
        );

        if(debug) {
            this.languageServer.stdout.on('data', data => console.log('language-service:stdout', data.toString()));
            this.languageServer.stderr.on('data', data => console.log('language-service:stderr', data.toString()));
            this.languageServer.on('close', code => console.log('language-service:close', { code }));
        }

        this.languageServer.on('message', message => {
            this.handleMessage(message)
        });

        this.pendingRequests = new Map();
    }

    sendNotification(method, params) {
        const message = { jsonrpc: '2.0', method, params };
        this.debug && console.log('--->', message);
        this.languageServer.send(message);
    }

    sendRequest(method, params) {
        const id = this.getIncrementalId();
        const message = { jsonrpc: '2.0', id, method, params };
        this.debug && console.log('--->', message);
        this.languageServer.send(message);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, (result, error) => {
                if(error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            })
        });
    }

    handleMessage(message) {
        if(message.method === 'window/logMessage') {
            this.handleLog(message.params.type, message.params.message);
            return;
        }

        this.debug && console.log('<---', JSON.stringify(message, null, 2));

        if(this.pendingRequests.has(message.id)) {
            const hendler = this.pendingRequests.get(message.id);
            hendler(message.result, message.error);
        } else if(message.id) {
            this.handleRequest(message);
        } else {
            this.handleNotification(message);
        }
    }

    handleRequest(message) {
        this.debug && console.log('handle', 'request', message.method);
    }

    handleNotification(message) {
        this.debug && console.log('handle', 'notification', message.method);
    }

    handleLog(type, message) {
        if(console[LOG_LEVELS[type]]) {
            console[LOG_LEVELS[type]]('language-service', message.replace(/\n/gm, ' '));
        } else {
            console.log('language-service', [LOG_LEVELS[type]], message.replace(/\n/gm, ' '));
        }
    }

    getIncrementalId() {
        return this.autoIncrementalId++;
    }

}