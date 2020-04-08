import React, { Component } from 'react';
import { faCheck, faTimes, faCircle, faPlay, faPlus, faRecycle, faStopwatch, faExclamationCircle, faAngleDoubleRight, faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Action from './Action';
import prettyMs from 'pretty-ms';
import isEqual from 'lodash.isequal';
import Result from './Result';
import Editor from './Editor';

export default class Block extends Component {

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

  shouldComponentUpdate(nextProps, nextState) {
    return (
      !isEqual(this.props.block, nextProps.block) ||
      this.props.isCodeHidden !== nextProps.isCodeHidden
    );
}

  renderEditor() {
    const { block, index, actions, isCodeHidden } = this.props;
    const status = this.getStatus();

    const statusIcon = {
      runned: faCheck,
      cached: faRecycle,
      failed: faTimes,
      skipped: faCircle,
      idle: faCircle
    }

    if(isCodeHidden && block.options.showSource) {
      return (
        <div className={`editor read-only ${block.error ? 'has-error' : ''}`}>
          <Editor {...this.props} readOnly={true} />
        </div>
      );
    } else if(isCodeHidden) {
      return null;
    } else {
      return (
        <div className={`editor ${block.error ? 'has-error' : ''}`}>
          <div className="sidebar">
            <div className="sidebar-content">
              <Action className={`status status-${status} disabled`} title={"Block " + status} icon={statusIcon[status]} />
              <Action className="run" title="Run block" icon={faPlay} onRun={() => actions.run({ targetIndex: index })} />
              <Action className="add" title="Add block" icon={faPlus} onRun={() => actions.createBlock({ index: index + 1 })} />
            </div>
          </div>

          <Editor {...this.props} readOnly={isCodeHidden} />

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

}