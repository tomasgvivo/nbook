import React, { useState } from 'react';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-dracula";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTimes, faCircle, faPlay, faPlus, faRecycle } from '@fortawesome/free-solid-svg-icons'
import ViewResolver from './viewers/resolver';

export default ({ block, index, actions, inFocus, isCodeHidden }) => {
  let [ script, updateLocalScript ] = useState(block.script);

  let updateScript = script => {
    updateLocalScript(script);
    actions.updateBlockScript({ index, script });
  }

  let status = null;
  if(block.error) {
    status = 'failed';
  } else if(block.stratergy) {
    status = ({
      cache: 'cached',
      run: 'runned',
      skip: 'skipped'
    })[block.stratergy];
  } else {
    status = 'idle';
  }

  const statusIcon = {
    runned: faCheck,
    cached: faRecycle,
    failed: faTimes,
    skipped: faCircle,
    idle: faCircle
  }

  return (
    <div className={`block ${status} ${block.error ? 'has-error' : ''}`} key={index}>
      {
        !isCodeHidden && (
          <>
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
              mode="javascript"
              theme="dracula"
              onChange={updateScript}
              name={`block_${index}`}
              editorProps={{ $blockScrolling: true }}
              value={script || ''}
              minLines={5}
              maxLines={Infinity}
              fontSize={16}
              setOptions={{
                useWorker: false,
                tabSize: 2,
                navigateWithinSoftTabs: true
              }}
              focus={ inFocus }
              commands={[
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
                }
              ]}
            />
            <details className="error">
              <summary>
                { block.error && block.error.message }
                <span>{block.error && block.error.line}:{block.error && block.error.column}</span>
              </summary>
              <pre>
                { block.error && block.error.stack }
              </pre>
            </details>
          </>
        )
      }
      <div className="result">
        <ViewResolver result={block.result} />
      </div>
    </div>
  );
};