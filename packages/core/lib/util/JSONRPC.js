module.exports = class JSONRPC {
    static fromProcess(process) {
        if(process.channel) {
            const instance = Reflect.construct(this, [ message => process.send(message) ]);
            process.on('message', message => instance.handleMessage(message));
            return instance;
        } else {
            return this.fromStreams(process.stdin, process.stdout);
        }
    }

    static fromStreams(input, output) {
        const instance = Reflect.construct(this, (message => {
            output.write(JSON.stringify(message) + '\n');
        }));

        let pendingData = "";
        input.on('data', data => {
            pendingData += data;
            while(pendingData.includes('\n')) {
                const message = pendingData.substring(0, pendingData.indexOf('\n'));
                pendingData = pendingData.substr(data.indexOf('\n') + 1);
                instance.handleMessage(JSON.parse(message));
            }
        });

        return instance;
    }

    constructor(sender) {
        this.debug = false;
        this.autoIncrementedId = 0;
        this.pendingResponses = new Map();
        this.eventHandlers = {};
        this.handlers = {};
        this.sender = sender;
        this.awaitedNotifications = {};
    }

    sendMessage(message) {
        this.debug && console.log('--->', JSON.stringify(message, null, 2));
        this.sender(message);
    }

    async handleMessage({ id, method, params, result, error, event, args }) {
        this.debug && console.log('<---', JSON.stringify({ id, method, params, result, error, event, args }, null, 2));

        if(event) {
            return process.nextTick(() => {
                const handlers = this.eventHandlers[event] || [];
                for(let handler of handlers) {
                    process.nextTick(() => {
                        handler(...args);
                    });
                }
            });
        }

        if(id || id === 0) {
            if(method) {
                try {
                    const handler = this.handlers[method];

                    if(!handler) {
                        throw new Error(`Undefined request handler for method ${method}`);
                    }

                    let result = handler(params);
                    while(result instanceof Promise) {
                        result = await result;
                    }

                    this.sendMessage({ id, result, error: null });
                } catch(error) {
                    this.sendMessage({
                        id,
                        result: null,
                        error: !error ? null : {
                            error: error.message || error,
                            stack: this.debug ? error.stack : undefined
                        }
                    });
                }
            } else {
                const handler = this.pendingResponses.get(id);

                if(handler) {
                    handler(result, error);
                    this.pendingResponses.delete(id);
                }
            }
        } else if(method) {
            const handler = this.handlers[method];

            if(this.awaitedNotifications[method]) {
                const awaitedHandlers = this.awaitedNotifications[method];
                delete this.awaitedNotifications[method];

                for(let awaitedHandler of awaitedHandlers) {
                    awaitedHandler(params);
                }
            }

            if(handler) {
                handler(params);
            }
        }
    }

    getIncrementalId() {
        return this.autoIncrementedId++;
    }

    sendRequest(method, params) {
        const id = this.getIncrementalId();
        this.sendMessage({ id, method, params });

        return new Promise((resolve, reject) => {
            this.pendingResponses.set(id, (result, error) => {
                if(error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    sendNotification(method, params) {
        this.sendMessage({ method, params });
    }

    emit(event, ...args) {
        this.sendMessage({ event, args })
    }

    on(event, handler) {
        this.eventHandlers[event] = this.eventHandlers[event] || [];
        this.eventHandlers[event].push(handler);
    }

    off(event, handler) {
        if(handler) {
            this.eventHandlers[event] = (this.eventHandlers[event] || []).filter(_handler => handler !== _handler);
        } else {
            this.eventHandlers[event] = [];
        }
    }

    handle(method, handler) {
        this.handlers[method] = handler;
    }

    awaitNotification(method, timeout = 0) {
        return new Promise((resolve, reject) => {
            let timeoutId = null;
            this.awaitedNotifications[method] = this.awaitedNotifications[method] || [];
            this.awaitedNotifications[method].push(params => {
                if(timeoutId) {
                    clearTimeout(timeoutId);
                }

                resolve(params);
            });

            if(timeout) {
                timeoutId = setTimeout(reject, timeout, new Error(`Timed out while awaiting ${method} notification.`));
            }
        });
    }
}
