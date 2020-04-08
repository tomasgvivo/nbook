const fileUrl = require('file-url');
const Path = require('path');
const fs = require('fs');

module.exports = class Workspace {

    constructor(path, connection) {
        this.path = path;
        this.connection = connection;
        this.documents = new Map;
    }

    pathToUri(...path) {
        return fileUrl(this.getFullPath(...path));
    }

    getFullPath(...path) {
        return Path.join(this.path, ...path);
    }

    open(filePath, languageId, text) {
        const uri = this.pathToUri(filePath);

        if(this.documents.has(uri)) {
            throw new Error(`File ${filePath} already opened.`);
        }

        this.documents.set(uri, {
            uri,
            languageId,
            version: 1,
            text
        });

        this.connection.sendNotification('textDocument/didOpen', {
            textDocument: this.documents.get(uri)
        });

        return {
            uri,
            file: this.getFullPath(filePath),

            readRange: (fromLine, toLine) => {
                const document = this.documents.get(uri);

                if(!document) {
                    throw new Error(`File ${filePath} is closed.`);
                }

                return document.text
                    .split('\n')
                    .slice(fromLine, toLine)
                    .join('\n');
            },

            change: text => {
                const document = this.documents.get(uri);

                if(!document) {
                    throw new Error(`File ${filePath} is closed.`);
                }

                document.text = text;
                document.version++;
                this.connection.sendNotification('textDocument/didChange', {
                    textDocument: { uri },
                    contentChanges: [ { text } ]
                });
            },

            commit: () => {
                const document = this.documents.get(uri);

                if(!document) {
                    throw new Error(`File ${filePath} is closed.`);
                }

                fs.writeFileSync(this.getFullPath(filePath), document.text);
            },

            close: text => {
                if(!this.documents.has(uri)) {
                    throw new Error(`File ${filePath} is closed.`);
                }

                this.connection.sendNotification('textDocument/didClose', {
                    textDocument: { uri }
                });

                this.documents.delete(uri);
            }
        }
    }

    openFromFile(filePath, languageId) {
        return this.open(filePath, languageId, fs.readFileSync(this.getFullPath(filePath)).toString());
    }
}