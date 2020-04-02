import React, { Component } from 'react';
import { faCheck, faTimes, faCircle, faPlay, faPlus, faRecycle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import isEqual from 'lodash.isequal';
import prettyMs from 'pretty-ms';
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/ext-language_tools";
import { StatusBar } from "ace-builds/src-noconflict/ext-statusbar";

import Result from './Result';

export default class Block extends Component {

  constructor(props) {
    super(props);
    this.state = {
      script: props.block.script || ''
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

  componentDidUpdate(prevProps) {
    console.log(this.props.block)
    if(!prevProps.block.error && this.props.block.error || this.props.block.error && prevProps.block.executionCount < this.props.block.executionCount) {
      this.editor.gotoLine(this.props.block.error.line);
      this.editor.container.scrollIntoView({ behavior: "smooth", block: 'center' });
      this.editor.getSession().setAnnotations([{
        row: this.props.block.error.line - 1,
        column: this.props.block.error.column,
        text: this.props.block.error.message,
        type: "error"
      }]);
    }
  }

  registerEditor(ref) {
    if(ref && ref.editor && ref !== this.editorRef) {
      this.editor = ref.editor;
      this.editorRef = ref;
      this.editor.commands.removeCommand('find');
      this.forceUpdate();
    }
  }

  updateScript(script) {
    if(this.updateScriptTimeoutId) {
      clearTimeout(this.updateScriptTimeoutId);
    }

    this.setState({ script });

    this.updateScriptTimeoutId = setTimeout(() => {
      this.props.actions.updateBlockScript({ index: this.props.index, script });
    }, 200);
  }

  getCommands() {
    const { index, actions, onKeyDown } = this.props;

    return [
      {
        name: "run",
        exec: () => actions.run({ targetIndex: index }),
        bindKey: { mac: "cmd-enter", win: "ctrl-enter" }
      },
      {
        name: "delete",
        exec: () => actions.deleteBlock({ index }),
        bindKey: { mac: "shift-del", win: "shift-del" }
      },
      {
        name: "clear",
        exec: () => actions.clearBlock({ index }),
        bindKey: { mac: "cmd-del", win: "ctrl-del" }
      },
      {
        name: "save",
        exec: (...args) => onKeyDown('ctrl-s'),
        bindKey: { mac: 'cmd-s', win: 'ctrl-s' }
      }
    ];
  }

  getStatus() {
    const block = this.props.block;

    if(block.error) {
      return 'failed';
    } else if(block.stratergy) {
      return ({
        cache: 'cached',
        run: 'runned',
        skip: 'skipped'
      })[block.stratergy];
    } else {
      return 'idle';
    }
  }

  renderEditor() {
    const { block, index, actions, inFocus } = this.props;
    const status = this.getStatus();

    const statusIcon = {
      runned: faCheck,
      cached: faRecycle,
      failed: faTimes,
      skipped: faCircle,
      idle: faCircle
    }

    const aceConfig = {
      props: {
        $blockScrolling: true,
        $enableMultiselect: true
      },
      options: {
        cursorStyle: 'slim',
        firstLineNumber: 1,
        fontSize: 16,
        tabSize: 2,
        minLines: 5,
        maxLines: Infinity,
        displayIndentGuides: true,
        navigateWithinSoftTabs: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        useWorker: false
      }
    }

    return (
      <div className={`editor ${block.error ? 'has-error' : ''}`}>
        <div className="sidebar">
          <div className="status">
            <FontAwesomeIcon icon={statusIcon[status]} className={`status-${status}`} />
          </div>
          <div className="run" onClick={() => actions.run({ targetIndex: index })}>
            <FontAwesomeIcon icon={faPlay} />
          </div>
          <div className="add" onClick={() => actions.createBlock({ index: index + 1 })}>
            <FontAwesomeIcon icon={faPlus} />
          </div>
        </div>

        <AceEditor
          name={`block_${index}`}
          mode="javascript"
          theme="dracula"
          editorProps={aceConfig.props}
          setOptions={aceConfig.options}
          commands={this.getCommands()}
          focus={ inFocus }
          value={this.state.script || ''}
          onChange={script => this.updateScript(script)}
          onKeyDown={(...args) => console.log(...args)}
          ref={ ref => this.registerEditor(ref) }
        />

        <div className="status-bar" style={{ paddingLeft: this.editor && this.editor.renderer.gutterWidth }}>
          <div>time: { block.time && prettyMs(block.time, { unitCount: 1 }) || 'none' }</div>
        </div>

        <details className="error">
          <summary>
            { block.error && block.error.message }
            <span>{block.error && block.error.line}:{block.error && block.error.column}</span>
          </summary>
          <pre>
            { block.error && block.error.stack }
          </pre>
        </details>
      </div>
    );
  }

  render() {
    const { block, index, isCodeHidden, notebookPath } = this.props;
    const status = this.getStatus();

    return (
      <div className={`block ${status}`} key={index}>
        { !isCodeHidden && this.renderEditor() }
        { (block.results || []).map((result, index) => <Result {...result} notebookPath={notebookPath} key={index} />) }
      </div>
    );
  }

}
/*
export default () => {
  let [ script, updateLocalScript ] = useState(block.script);

  let updateScript = script => {
    updateLocalScript(script);
    actions.updateBlockScript({ index, script });
  }

};*/