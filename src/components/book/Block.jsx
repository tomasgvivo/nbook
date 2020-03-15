import React from 'react';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-dracula";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTimes, faCircle, faPlay, faPlus } from '@fortawesome/free-solid-svg-icons'
import resolveView from '../../viewers/resolver';

export default ({ book, block, index }) => {
  let status = null;
  if(block.hasRun) {
    status = block.error ? 'failed' : 'runned';
  } else {
    status = 'idle';
  }

  const statusIcon = {
    runned: faCheck,
    failed: faTimes,
    idle: faCircle
  }

  return (
    <div className={`block ${status} ${block.error ? 'has-error' : ''}`} key={index}>
      <div className="sidebar">
        <div className="status">
          <FontAwesomeIcon icon={statusIcon[status]} className={`status-${status}`} />
        </div>
        <div className="run" onClick={() => book.run(index)}>
          <FontAwesomeIcon icon={faPlay} />
        </div>
        <div className="add" onClick={() => book.createBlock(index + 1)}>
          <FontAwesomeIcon icon={faPlus} />
        </div>
      </div>
      <AceEditor
        mode="javascript"
        theme="dracula"
        onChange={value => book.updateBlockScript(index, value)}
        name={`block_${index}`}
        editorProps={{ $blockScrolling: true }}
        value={block.script || ''}
        minLines={5}
        maxLines={Infinity}
        fontSize={16}
        setOptions={{
          useWorker: false,
          tabSize: 2
        }}
        focus={ book.focus === index }
        commands={[
          {
            name: "run",
            exec: () => book.run(index),
            bindKey: { mac: "cmd-enter", win: "ctrl-enter" }
          },
          {
            name: "runAndCreate",
            exec: () => this.runAndCreate(index),
            bindKey: { mac: "shift-enter", win: "shift-enter" }
          },
          {
            name: "delete",
            exec: () => book.deleteBlock(index),
            bindKey: { mac: "shift-del", win: "shift-del" }
          },
          {
            name: "clear",
            exec: () => book.clearBlock(index),
            bindKey: { mac: "cmd-del", win: "ctrl-del" }
          }
        ]}
      />
      <details className="error">
        <summary>
          { block.error?.message }
          <span>{block.error?.line}:{block.error?.column}</span>
        </summary>
        <pre>
          { block.error?.stack }
        </pre>
      </details>
      <div className="result">
        { resolveView(block) }
      </div>
    </div>
  );
}