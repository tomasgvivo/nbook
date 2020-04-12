import React, { Component } from 'react';
import isEqual from 'lodash.isequal';
import MonacoEditor from './MonacoEditor';

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
            this.state.script !== nextState.script
        );
    }

    componentWillUnmount() {
        this.model.dispose();
        if(this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    createModel(doCreate) {
        const model = doCreate(this.props.block.script || '', 'javascript', `inmemory://editor/block/${this.props.block.id}`);
        this.model = model;
        this.model.updateOptions({ tabSize: 2 })
        this.model.languageService = this.getLanguageService();
        return this.model;
    }

    getLanguageService() {
        return {
            doResolve: item => this.props.language.resolve(item),
            doComplete: (position, context) => this.props.language.complete({ blockId: this.props.block.id, position, context })
        };
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
                handleMouseWheel: false,
                
            },
            cursorStyle: 'line-thin',
            multiCursorMergeOverlapping: true,
            multiCursorModifier: 'ctrlKey',
            multiCursorPaste: 'spread',
            wordWrap: 'on',
            contextmenu: true,
            dragAndDrop: true,
            emptySelectionClipboard: true,
            tabCompletion: 'on',
            wrappingIndent: 'deepIndent'
        };
    }

    createActions() {
        this.actionLabels = [];
        let itemPosition = 0;

        const createAction = (id, label, precondition, contextMenuGroupId, contextMenuOrder, run) => {
            this.editor.addAction({ id, label, precondition, contextMenuGroupId, contextMenuOrder, run });
            this.actionLabels.push(label);
        }

        const createOptionActions = (id, labelOn, labelOff, flag) => {
            this.options[flag] = this.editor.createContextKey(flag, this.props.block.options[flag] || false);
            const order = itemPosition;
            itemPosition++;

            createAction(id + '-on', labelOn, '!' + flag, 'options', order, () => {
                this.options[flag].set(true);
                this.props.updateBlockOptions({ index: this.props.index, options: { [flag]: true } });
                this.forceUpdate();
            });

            createAction(id + '-off', labelOff, flag, 'options', order, () => {
                this.options[flag].set(false);
                this.props.updateBlockOptions({ index: this.props.index, options: { [flag]: false } });
                this.forceUpdate();
            });
        }

        createOptionActions('lock', 'Lock Block', 'Unlock Block', 'isLocked');
        createOptionActions('no-cache', 'Disable Cache', 'Enable Cache', 'noCache');
        createOptionActions('can-fail', 'Allow Failure', 'Disallow Failure', 'canFail');
        createOptionActions('show-source', 'Show Source on visualization mode', 'Hide Source on visualization mode', 'showSource');
        createOptionActions('no-context', 'Run out of context', 'Run in context', 'noContext');
    }

    editorDidMount(editor, monaco) {
        this.editor = editor;
        this.monaco = monaco;
        this.calculateEditorHeight();
        this.createActions();

        const { CtrlCmd, Shift } = monaco.KeyMod;
        const { KEY_S, Enter, Delete } = monaco.KeyCode;
        this.editor.addCommand(CtrlCmd | KEY_S, () => this.props.save());
        this.editor.addCommand(Shift | Enter, () => this.props.runtime.run({ targetIndex: this.props.index }));
        this.editor.addCommand(Shift | Delete, () => this.props.deleteBlock({ index: this.props.index }));
    }

    calculateEditorHeight() {
        this.animationId = requestAnimationFrame(() => {
            if(!this.editor || !this.editor.getDomNode()) {
                return;
            }
    
            const lineHeight = this.editor.getOption(this.monaco.editor.EditorOption.lineHeight);
            const lineCount = this.model ? this.model.getLineCount() : 1;
            const height = this.editor.getTopForLineNumber(lineCount + 1) + lineHeight;
    
            if(this.prevHeight === height) {
                return;
            }
    
            this.prevHeight = height
            this.editor.getDomNode().style.height = `${height}px`;
            this.editor.layout();
        });
    }

    onChange(script, event) {
        if(this.updateScriptTimeoutId) {
            clearTimeout(this.updateScriptTimeoutId);
        }

        this.updateScriptTimeoutId = setTimeout(() => {
            this.props.updateBlockScript({ index: this.props.index, script });
        }, 200);

        this.setState({ script }, () => this.calculateEditorHeight());
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
