import React, { Component } from 'react';
import MonacoEditor from 'react-monaco-editor';
import isEqual from 'lodash.isequal';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';

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

    editorDidMount(editor, monaco) {
        editor.focus();
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
        const options = {
            selectOnLineNumbers: true,
            minimap: { enabled: false },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: true,
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

        return (
            <MonacoEditor
                language="javascript"
                theme="vs-dark"
                value={script}
                options={{ ...options }}
                onChange={(script, event) => this.onChange(script, event)}
                editorDidMount={(editor, monaco) => this.editorDidMount(editor, monaco)}
            />
        );
    }
}
