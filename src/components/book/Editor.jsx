import React, { Component } from 'react';
import isEqual from 'lodash.isequal';
//import { KeyCode, KeyMod, editor as Monaco } from 'monaco-editor';
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

languages.typescript.javascriptDefaults.addExtraLib(`
declare function require(moduleName: string): any;
/**
 * This class allows you to generate notebook resuts.
 */
declare class Result {
    /**
     * Generates a JSON result.
     * Useful for rapid visualization of data.
     */
    static literal(value: any): InstanceType<typeof Result>

    value: any;
}

/**
 * This method allows you to install npm packages in your notebook directory.
 * You can provide one or more arguments.
 * You must specify the package name.
 * You can also specify a desired package version.
 * Ex: install("lodash@4.17.15");
 */
declare function install(packageName: string, ...morePackageNames: string[]): any

/**
 * This namespace provides runtime tools.
 */
declare namespace Runtime {

    /**
     * Skips current block and moves to the next one.
     */
    function skip(): void

    /**
     * Cancels the execution.
     */
    function cancel(): void
}
`);

// validation settings
languages.typescript.javascriptDefaults.setDiagnosticsOptions({
	noSemanticValidation: true,
	noSyntaxValidation: false
});

// compiler options
languages.typescript.javascriptDefaults.setCompilerOptions({
	target: monaco.languages.typescript.ScriptTarget.ES2020,
	allowNonTsExtensions: true
});

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
        console.log(moduleId, label);
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
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !isEqual(this.props.block, nextProps.block) ||
            this.props.inFocus !== nextProps.inFocus ||
            this.state.script !== nextState.script
        );
    }

    getOptions() {
        return {
            selectOnLineNumbers: true,
            minimap: { enabled: false },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
                vertical: 'hidden',
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                verticalScrollbarSize: 0,
                handleMouseWheel: false
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

    editorDidMount(editor, monaco) {
        console.log(editor, monaco)
        //monaco.languages = languages;

        this.editor = editor;
        this.monaco = monaco;
        this.animationId = requestAnimationFrame(() => this.calculateEditorHeight());
        this.registerActions();
        this.model = editor.getModel();
        this.model.updateOptions({ tabSize: 2 });
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
            />
        );
    }
}
