import React, { Component } from 'react';
import isEqual from 'lodash.isequal';
import MonacoEditor from './MonacoEditor';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/languageFeatures';
import 'monaco-editor/esm/vs/language/json/jsonMode';
import 'monaco-editor/esm/vs/language/json/languageFeatures';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/editor/contrib/suggest/suggest';
import { languages } from 'monaco-editor';
import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from 'monaco-languageclient/lib/monaco-converter';

import { readFileSync } from 'fs';
{
    // readFileSync will be transpiled to a call to Buffer("...data...", 'base64').
    // And for some reason, Buffer is not defined in the browser.
    // Maybe report this to parcel as a bug?
    const Buffer = (encodedData, encoding) => {
        if(encoding !== 'base64') {
            throw new Error(`Mocked Buffer can't handle "${encoding}" encoding.`);
        }

        return atob(encodedData);
    }

    languages.typescript.javascriptDefaults.addExtraLib(
        readFileSync('src/resources/runtime.d.ts').toString()
    );
}

// validation settings
languages.typescript.javascriptDefaults.setDiagnosticsOptions({
	noSemanticValidation: true,
	noSyntaxValidation: false
});

// compiler options
languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    noLib: true,
	allowNonTsExtensions: true
});

const m2p = new MonacoToProtocolConverter();
const p2m = new ProtocolToMonacoConverter();

monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems(model, position, context) {
        return model.languageService.doComplete(m2p.asPosition(position.lineNumber, position.column), context).then((list) => {
            const wordUntil = model.getWordUntilPosition(position);
            const defaultRange = new monaco.Range(position.lineNumber, wordUntil.startColumn, position.lineNumber, wordUntil.endColumn);
            return p2m.asCompletionResult(list, defaultRange);
        });
    },

    resolveCompletionItem(model, position, item, token) {
        return model.languageService.doResolve(m2p.asCompletionItem(item)).then(result => p2m.asCompletionItem(result, item.range));
    }
});

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
        switch(label) {
            case 'json':
                return './editor/json.worker.js';
            case 'typescript':
            case 'javascript':
                return './editor/ts.worker.js';
            default:
                return './editor/editor.worker.js';
        }
	}
};

export default class Editor extends Component {

    constructor(props) {
        super(props);
        this.state = {
          script: props.block.script || '',
          height: 0
        };
    
        this.updateScriptTimeoutId = null;
        this.options = {};
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !isEqual(this.props.block, nextProps.block) ||
            this.props.inFocus !== nextProps.inFocus ||
            this.state.script !== nextState.script
        );
    }

    componentWillUnmount() {
        this.model.dispose();
    }

    createModel(doCreate) {
        const model = doCreate(this.props.block.script || '', 'javascript', `inmemory://editor/block/${this.props.block.id}`);
        model.languageService = this.getLanguageService();
        this.model = model;
        return model;
    }

    getLanguageService() {
        return {
            configure: (settings) => {},
            doValidation: (document) => {},
            doResolve: (item) => {
                console.log(item);
                const method = "resolve";
                const params = item;

                console.log('languageserver', 'resolve:request', method, params);
                return this.props.actions.language(method, params).then(response => {
                    console.log('languageserver', 'resolve:response', response);
                    return response;
                });
            },
            doComplete: (position) => {
                const method = "complete";
                const params = {
                    blockId: this.props.block.id,
                    position
                };

                console.log('languageserver', 'complete:request', method, params);
                return this.props.actions.language(method, params).then(response => {
                    console.log('languageserver', 'complete:response', response);
                    return response;
                });
            },
            findDocumentSymbols: (document, context) => {},
            findDocumentSymbols2: (document, context) => {},
            /** deprecated, use findDocumentColors instead */
            findColorSymbols: (document) => {},
            findDocumentColors: (document, context) => {},
            getColorPresentations: (document, color, range) => {},
            doHover: (document, position) => {},
            format: (document, range, options) => {},
            getFoldingRanges: (document, context) => {},
            getSelectionRanges: (document, positions) => {}
        };
    }

    getOptions() {
        return {
            selectOnLineNumbers: true,
            minimap: { enabled: false },
            //suggestOnTriggerCharacters: true,
            //acceptSuggestionOnCommitCharacter: true,
            //acceptSuggestionOnEnter: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
                vertical: 'hidden',
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                verticalScrollbarSize: 0,
                handleMouseWheel: false,
                
            },
            cursorStyle: 'line-thin',
            multiCursorMergeOverlapping: true,
            multiCursorModifier: 'ctrlKey',
            multiCursorPaste: 'spread',
            wordWrap: 'on',
            contextmenu: true,
            quickSuggestions: true,
            dragAndDrop: true,
            emptySelectionClipboard: true,
            tabCompletion: 'on',
            wrappingIndent: 'deepIndent'
        };
    }

    createActions(editor, monaco) {
        const { CtrlCmd, Shift } = monaco.KeyMod;
        const { KEY_S, Enter, Delete } = monaco.KeyCode;

        this.editor.addCommand(CtrlCmd | KEY_S, () => this.props.onKeyDown('ctrl+s'));
        this.editor.addCommand(Shift | Enter, () => this.props.actions.run({ targetIndex: this.props.index }));
        this.editor.addCommand(Shift | Delete, () => this.props.actions.deleteBlock({ index: this.props.index }));

        let itemPosition = 0;

        const createOptionActions = (id, labelOn, labelOff, flag, keybindings = null) => {
            this.options[flag] = editor.createContextKey(flag, this.props.block.options[flag] || false);
            const order = itemPosition;
            itemPosition++;

            return [
                {
                    id: id + '-on',
                    label: labelOn,
                    precondition: '!' + flag,
                    contextMenuGroupId: 'options',
                    contextMenuOrder: order,
                    run: () => {
                        this.options[flag].set(true);
                        this.props.actions.updateBlockOptions({ index: this.props.index, [flag]: true });
                        this.forceUpdate();
                    }
                },
                {
                    id: id + '-off',
                    label: labelOff,
                    precondition: flag,
                    contextMenuGroupId: 'options',
                    contextMenuOrder: order,
                    run: () => {
                        this.options[flag].set(false);
                        this.props.actions.updateBlockOptions({ index: this.props.index, [flag]: false });
                        this.forceUpdate();
                    }
                }
            ]
        }


        const actions = [
            ...createOptionActions('lock', 'Lock Block', 'Unlock Block', 'isLocked'),
            ...createOptionActions('no-cache', 'Disable Cache', 'Enable Cache', 'noCache'),
            ...createOptionActions('can-fail', 'Allow Failure', 'Disallow Failure', 'canFail'),
            ...createOptionActions('show-source', 'Show Source on visualization mode', 'Hide Source on visualization mode', 'showSource'),
            ...createOptionActions('no-context', 'Run out of context', 'Run in context', 'noContext')
        ];

        for(let action of actions) {
            editor.addAction(action);
        }

        this.actionLabels = actions.map(item => item.label);
    }

    editorDidMount(editor, monaco) {
        this.editor = editor;
        this.monaco = monaco;
        this.animationId = requestAnimationFrame(() => this.calculateEditorHeight());
        //this.registerActions();
        this.model = editor.getModel();
        this.model.updateOptions({ tabSize: 2 });
        this.createActions(editor, monaco);
    }

    onChange(script, event) {
        if(this.updateScriptTimeoutId) {
            clearTimeout(this.updateScriptTimeoutId);
        }

        this.updateScriptTimeoutId = setTimeout(() => {
            this.props.actions.updateBlockScript({ index: this.props.index, script });
        }, 200);

        this.setState({ script }, () => this.calculateEditorHeight());
    }

    calculateEditorHeight() {
        if(this.editor) {
            const editorElement = this.editor.getDomNode();
            if(!editorElement) {
                return;
            }
          
            const lineHeight = this.editor.getOption(this.monaco.editor.EditorOption.lineHeight)
            const model = this.editor.getModel();
            const lineCount = model ? model.getLineCount() : 1;
            const height = this.editor.getTopForLineNumber(lineCount + 1) + lineHeight;

            if(this.prevHeight !== height) {
                this.prevHeight = height
                editorElement.style.height = `${height}px`;
                this.editor.layout()
            }
        }
    }

    registerActions() {
        const { CtrlCmd, Shift } = this.monaco.KeyMod;
        const { KEY_S, Enter, Delete } = this.monaco.KeyCode;
        
        this.editor.addCommand(CtrlCmd | KEY_S, () => this.props.onKeyDown('ctrl+s'));
        this.editor.addCommand(Shift | Enter, () => this.props.actions.run({ targetIndex: this.props.index }));
        this.editor.addCommand(Shift | Delete, () => this.props.actions.deleteBlock({ index: this.props.index }));
    }

    render() {
        const script = this.state.script;

        return (
            <MonacoEditor
                language="javascript"
                theme="vs-dark"
                value={script}
                options={this.getOptions()}
                onChange={(script, event) => this.onChange(script, event)}
                editorDidMount={(editor, monaco) => this.editorDidMount(editor, monaco)}
                readOnly={this.props.readOnly || this.options.isLocked && this.options.isLocked.get() }
                createModel={doCreate => this.createModel(doCreate)}
            />
        );
    }
}
