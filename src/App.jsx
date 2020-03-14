import React, { Component } from 'react';
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-dracula";
import { Container, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTimes, faCircle, faPlay, faPlus } from '@fortawesome/free-solid-svg-icons'
import { cloneDeep } from 'lodash';

import JSONViewer from './viewers/JSONViewer';

const vm = require('vm');

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      blocks: [ {  } ],
      baseContext: {}
    };
  }

  async run(index) {
    const blocks = [];

    let context = cloneDeep(this.state.baseContext);
    vm.createContext(context);

    let failed = false;

    for(let i in this.state.blocks) {
      const block = this.state.blocks[i];

      debugger

      if(failed || i > index) {
        blocks.push({
          ...block,
          context: null,
          result: null,
          hasRun: null
        });
        continue;
      }

      if(block.hasRun && i !== index) {
        context = block.context;
        blocks.push(block);
        continue;
      }

      if(!block.value) {
        blocks.push(block);
        continue;
      }

      let result = null;
      let error = null;

      try {
        result = vm.runInContext(block.value, context);
      } catch (err) {
        error = err;
      }

      if(result instanceof Promise) {
        try {
          result = await result;
        } catch (err) {
          failed = true;
          error = err;
        }
      }

      if(error) {
        failed = true;
        result = null;
        console.error(error);

        const parsedStack = (
          error.stack.match(/evalmachine.*:(\d{1,}):(\d{1,})/) ||
          error.stack.match(/evalmachine.*:(\d{1,})/) ||
          []
        );

        const line = parsedStack[1] ? parseInt(parsedStack[1], 0) : null;
        const column = parsedStack[2] ? parseInt(parsedStack[2], 0) : null;

        error = {
          originalError: error,
          message: error.message,
          line,
          column
        }
      }

      blocks.push({
        ...block,
        error,
        result,
        failed: !!error,
        hasRun: true,
        context: cloneDeep(context)
      });
    }

    await new Promise(resolve => this.setState({ blocks }, resolve));

    return !failed;
  }

  create(index, newBlock = {}) {
    const blocks = this.state.blocks;
    let newBlocks = null;

    if(index === blocks.length || index === -1 || typeof index !== 'number') {
      newBlocks = [ ...blocks, newBlock ];
      index = blocks.length;
    } else {
      newBlocks = blocks.reduce((res, block, i) => {
        if(i === index) {
          return [ ...res, newBlock, block ];
        } else {
          return [ ...res, block ];
        }
      }, []);
    }

    this.setState({ blocks: newBlocks, focus: index });
  }

  delete(index) {
    const blocks = this.state.blocks.filter((b, i) => i !== index);
    const focus = blocks[index] ? index : index - 1;
    
    this.setState({ blocks, focus });
    if(blocks.length === 0) {
      this.create(0);
    }
  }

  clear(index) {
    this.update('', index);
  }

  update(value, index) {
    const blocks = this.state.blocks.map((block, i) => {
      if(index === i) {
        return {
          ...block,
          value,
          hasRun: false
        };
      } else {
        return block;
      }
    });

    this.setState({ blocks, focus: index });
  }

  async runAndCreate(index) {
    if(await this.run(index)) {
      this.create(index + 1);
    }
  }

  async runAndCreate(index) {
    if(await this.run(index)) {
      this.create(index + 1);
    }
  }

  renderBlock(block, index) {
    let status = null;
    if(block.hasRun) {
      status = block.failed ? 'failed' : 'runned';
    } else {
      status = 'idle';
    }

    const statusIcon = {
      runned: faCheck,
      failed: faTimes,
      idle: faCircle
    }

    return (
      <Row className="block">
        <Col>
          <div className="sidebar">
            <div className="run" onClick={() => this.run(index)}>
              <FontAwesomeIcon icon={faPlay} />
            </div>
            <div className="status">
              <FontAwesomeIcon icon={statusIcon[status]} className={`status-${status}`} />
            </div>
            <div className="add" onClick={() => this.create(index + 1)}>
              <FontAwesomeIcon icon={faPlus} />
            </div>
          </div>
          <AceEditor
            mode="javascript"
            theme="dracula"
            onChange={value => this.update(value, index)}
            name={`block_${index}`}
            editorProps={{ $blockScrolling: true }}
            value={block.value || ''}
            maxLines={Infinity}
            fontSize={16}
            setOptions={{
              useWorker: false,
              tabSize: 2
            }}
            focus={ this.state.focus === index }
            annotations={ () => block.annotations }
            commands={[
              {
                name: "run",
                exec: () => this.run(index),
                bindKey: { mac: "cmd-enter", win: "ctrl-enter" }
              },
              {
                name: "runAndCreate",
                exec: () => this.runAndCreate(index),
                bindKey: { mac: "shift-enter", win: "shift-enter" }
              },
              {
                name: "delete",
                exec: () => this.delete(index),
                bindKey: { mac: "shift-del", win: "shift-del" }
              },
              {
                name: "clear",
                exec: () => this.clear(index),
                bindKey: { mac: "cmd-del", win: "ctrl-del" }
              }
            ]}
          />
          <div className="error">
            { block.error?.message }
          </div>
          <div className="result">
            <JSONViewer {...block} />
          </div>
        </Col>
      </Row>
    );
  }

  render() {
    return (
      <Container>
        { this.state.blocks.map((block, index) => this.renderBlock(block, index)) }
      </Container>
    );
  }

}
