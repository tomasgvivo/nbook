const Connection = require('./lib/connection');
const Workspace = require('./lib/workspace');
const fileUrl = require('file-url');

module.exports = class LanguageService {
    constructor(notebook, path) {
        this.notebook = notebook;
        this.path = path;
        this.loaded = false;
        this.loadPromise = new Promise(resolve => {
            this.resolveLoad = resolve;
        });

        this.documents = new Map;
    }

    connect({ logPath, debug, logLevel }) {
        this.connection = new Connection({ workspacePath: this.path, logPath, debug, logLevel });
        this.workspace = new Workspace(this.path, this.connection);
        this.blockMapper = new Map;
        return this.connection.sendRequest('initialize', {
            rootPath: this.path,
            rootUri: fileUrl(this.path),
            capabilities: clientCapabilities,
            initializationOptions: {
                compilerOptionsForInferredProjects: {
                    options: {
                        "moduleResolution": "Node",
                        "isolatedModules": true,
                        "target": "ES2020",
                        "allowJs": true,
                        "noLib": true,
                        "baseUrl": "./lib/node_modules",
                        "checkJs": true
                    }
                }
            },
            trace: 'verbose',
            workspaceFolders: [
                {
                    uri: fileUrl(this.path),
                    name: this.notebook.title
                }
            ]
        }).then(result => {
            this.serverCapabilities = result.capabilities;
            this.loadBlocks();
            this.loaded = true;
            this.resolveLoad();
        });
    }

    async ensureLoaded() {
        if(!this.loaded) {
            await this.loadPromise;
        }
    }

    loadBlocks() {
        const HEADER_OFFSET = 4;
        const header = block => [
            `/**`,
            ` * @blockId ${block.id}`,
            ` */`,
            `{`
        ];

        const FOOTER_OFFSET = 1;
        const footer = block => [
            `}`
        ]

        let mainDocument = null;
        const mainFilePath = 'main.js';
        const mainContent = this.notebook.blocks
            .filter(block => !block.options.noContext)
            .reduce((acc, block) => {
                return [
                    ...acc,
                    ...header(block),
                    block.script,
                    ...footer(block)
                ];
            }, [])
            .join('\n');


        if(this.documents.has(mainFilePath)) {
            mainDocument = this.documents.get(mainFilePath);
            mainDocument.change(mainContent);
        } else {
            mainDocument = this.workspace.open(mainFilePath, 'javascript', mainContent);
            this.documents.set(mainFilePath, mainDocument);
        }

        let mainOffset = 0;

        for(let block of this.notebook.blocks) {
            let content = block.script;
            let lines = content.split('\n').length;
            let range = [ HEADER_OFFSET, HEADER_OFFSET + lines ];
            let fullRange = [ 0, lines + HEADER_OFFSET + FOOTER_OFFSET ];
            let document = null;

            if(block.options.noContext) {
                const filePath = block.id + '.js';
                let encapsulatedContent = [
                    ...header(block),
                    block.script,
                    ...footer(block)
                ].join('\n');

                if(this.documents.has(filePath)) {
                    document = this.documents.get(filePath);
                    document.change(encapsulatedContent);
                } else {
                    document = this.workspace.open(filePath, 'javascript', encapsulatedContent);
                    this.documents.set(filePath, document);
                }
            } else {
                range = range.map(v => v + mainOffset);
                fullRange = fullRange.map(v => v + mainOffset);
                mainOffset = fullRange[1];
                document = mainDocument;
            }

            this.blockMapper.set(block.id, { id: block.id, range, fullRange, document });
        }
    }

    close() {
        this.connection.close();
    }

    async complete({ blockId, position, context }) {
        await this.ensureLoaded();

        const mappedBlock = this.blockMapper.get(blockId);
        const result = await this.connection.sendRequest('textDocument/completion', {
            textDocument: {
                uri: mappedBlock.document.uri
            },
            position: {
                line: position.line + mappedBlock.range[0],
                character: position.character
            },
            context
        }) || [];

        return result.map(item => {
            return {
                ...item,
                data: {
                    ...item.data,
                    file: { blockId },
                    line: item.data.line - mappedBlock.range[0]
                }
            }
        });
    }

    async resolve(securedItem) {
        await this.ensureLoaded();

        const mappedBlock = this.blockMapper.get(securedItem.data.file.blockId);
        const result = await this.connection.sendRequest('completionItem/resolve', {
            ...securedItem,
            data: {
                ...securedItem.data,
                file: mappedBlock.document.file,
                line: securedItem.data.line + mappedBlock.range[0]
            }
        });

        return { ...result, data: securedItem.data };
    }
}


const clientCapabilities = {
    workspace: {
        applyEdit: true,
        workspaceEdit: {
          documentChanges: true
        },
        didChangeConfiguration: {
          dynamicRegistration: true
        },
        didChangeWatchedFiles: {
          dynamicRegistration: true
        },
        executeCommand: {
            dynamicRegistration: true
        },
        configuration: true,
        workspaceFolders: true
    },
    textDocument: {
        synchronization: {
            dynamicRegistration: true,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true
        },
        completion: {
            contextSupport: true,
            completionItem: {
                snippetSupport: true,
                commitCharactersSupport: true,
                documentationFormat: [ "plaintext" ],
                deprecatedSupport: true
            },
            completionItemKind: { valueSet: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25 ] }
        }
    }
}
