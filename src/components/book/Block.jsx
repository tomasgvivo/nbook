import React, { Component } from 'react';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faRecycle } from '@fortawesome/free-solid-svg-icons/faRecycle';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import prettyMs from 'pretty-ms';
import Action from './Action';
import Result from './Result';
import Editor from './Editor';
import { withNotebook } from './NotebookService';

export default withNotebook([ 'notebookPath', 'mode', 'runtime', 'createBlock' ], class Block extends Component {

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
    const { block, index, runtime, createBlock, mode } = this.props;
    const status = this.getStatus();

    const statusIcon = {
      runned: faCheck,
      cached: faRecycle,
      failed: faTimes,
      skipped: faCircle,
      idle: faCircle
    }

    if(mode !== 'edit' && block.options.showSource) {
      return (
        <div className={`editor read-only ${block.error ? 'has-error' : ''}`}>
          <Editor {...this.props} readOnly={true} />
        </div>
      );
    } else if(mode !== 'edit') {
      return null;
    } else {
      return (
        <div className={`editor ${block.error ? 'has-error' : ''}`}>
          <div className="sidebar">
            <div className="sidebar-content">
              <Action className={`status status-${status} disabled`} title={"Block " + status} icon={statusIcon[status]} />
              <Action className="run" title="Run block" icon={faPlay} onRun={() => runtime.run({ targetIndex: index })} />
              <Action className="add" title="Add block" icon={faPlus} onRun={() => createBlock({ index: index + 1 })} />
            </div>
          </div>

          <Editor {...this.props} readOnly={mode !== 'edit'} />

          <details className="error">
            <summary>
              { block.error && block.error.message }
              <span>{block.error && block.error.line}:{block.error && block.error.column}</span>
            </summary>
            <pre>
              { block.error && block.error.stack }
            </pre>
          </details>

          <div className="statusbar">
            {
              [
                { flag: 'isLocked', label: 'locked' },
                { flag: 'noCache', label: 'cache disabled' },
                { flag: 'canFail', label: 'allowed to fail' },
                { flag: 'showSource', label: 'always visible' },
                { flag: 'noContext', label: 'out of context' }
              ].filter(({ flag }) => block.options[flag])
              .map(({ label }, index) => <span key={index}>{ label }</span>)
              .reduce((acc, item) => acc === null ? <><span>Is:</span> {item}</> : <>{acc}, {item}</>, null)
            }
            {
              typeof block.time === 'number' && (
                <span className="time">
                  {prettyMs(block.time)} <FontAwesomeIcon icon={faStopwatch} />
                </span>
              )
            }
          </div>
        </div>
      );
    }
  }

  render() {
    const { block, index, notebookPath } = this.props;
    const status = this.getStatus();

    return (
      <div className={`block ${status}`} key={index}>
        { this.renderEditor() }
        { (block.results || []).map((result, index) => <Result {...result} notebookPath={notebookPath} key={index} />) }
      </div>
    );
  }
});
