import React, { Component } from 'react';
import { faCheck, faTimes, faCircle, faPlay, faPlus, faRecycle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import isEqual from 'lodash.isequal';
import prettyMs from 'pretty-ms';

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

  renderEditor() {
    const { block, index, actions } = this.props;
    const status = this.getStatus();

    const statusIcon = {
      runned: faCheck,
      cached: faRecycle,
      failed: faTimes,
      skipped: faCircle,
      idle: faCircle
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

        <Editor {...this.props} />
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