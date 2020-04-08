const IO = require('socket.io');
const wildcard = require('socketio-wildcard')();
const Book = require('./Book');
const Path = require('path');

module.exports = (server, workspace) => {
    let bookSessionCounter = 0;

    const io = IO(server);

    io.use(wildcard);

    io.on('connection', socket => {
        let book = null;
        let sessionId = null;

        socket.on('open', path => {
            console.log('open', path)
            if (book) {
                book.close();
            }

            book = Book.load(Path.join(workspace.path, path));
            book.initialize().then(() => {
                sessionId = bookSessionCounter++;
                socket.emit('book', { sessionId, ...book.toJSON() });

                for (let eventName of book.eventNames()) {
                    book.on(eventName, data => {
                        socket.emit(`${eventName}`, { sessionId, ...data });
                        if (eventName === 'stats') { return; }
                        console.log(`[${sessionId}][book][${eventName}]`, data);
                    });
                }
            });
        });

        const bookActions = {
            'runtime:gc': () => book.forceRuntimeGC(),
            'runtime:recreate': () => book.recreateRuntime(),
            'save': () => book.save(),
            'save:as': ({ path }) => book.saveAs(path),
            'run': ({ targetIndex }) => book.run(targetIndex),
            'block:update:options': ({ index, ...options }) => book.updateBlockOptions(index, options),
            'block:update:script': ({ index, script }) => book.updateBlockScript(index, script),
            'block:create': ({ index, newBlock }) => book.createBlock(index, newBlock),
            'block:delete': ({ index }) => book.deleteBlock(index),
            'block:clear': ({ index }) => book.clearBlock(index),
            'language:request': ({ id, request }) => {
                book.processLanguageRequest(request).then(result => {
                    socket.emit(`language:response`, { sessionId, id, response: { result } });
                }).catch(error => {
                    socket.emit(`language:response`, { sessionId, id, response: { error: error.message } });
                });
            }
        }

        for (let action in bookActions) {
            socket.on(`action:${action}`, ({ sessionId: receivedSessionId, ...data }) => {
                console.log(`[${receivedSessionId}][book][action][${action}]`, data);
                if (sessionId === receivedSessionId) {
                    try {
                        bookActions[action](data);
                    } catch (error) {
                        console.error(error);
                        socket.emit('error', { sessionId, ...error });
                    }
                }
            });
        }

        socket.on('disconnect', () => {
            if (book) {
                book.close();
            }
        });
    });
}