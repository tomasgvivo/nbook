import React, { Component } from 'react';
import { Prompt } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import AppBar from './AppBar'
import Content from './Content';
import Hotkeys from 'react-hot-keys';
import io from 'socket.io-client';
const patch = require('socketio-wildcard')(io.Manager);

const BlocksContext = React.createContext();



export default withRouter(class BookController extends Component {

  get initialState() {
    return {
      sessionId: null,
      book: {
        blocks: []
      },
      stats: {
        current: {},
        histogram: []
      },
      isCodeHidden: false
    };
  }

  constructor(props) {
    super(props);
    this.state = this.initialState;
    this.autoIncrement = 0;
  }

  componentDidMount() {
    const pathname = this.props.location.pathname;
    this.start(pathname.substring(pathname.indexOf('explore') + 'explore'.length));
  }

  componentDidUpdate(oldProps) {
    const pathname = this.props.location.pathname;
    if(pathname !== oldProps.location.pathname) {
      this.start(pathname.substring(pathname.indexOf('explore') + 'explore'.length));
    }
  }

  start(path) {
    this.setState({
      ...this.initialState,
      notebookPath: path
    });

    if(this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('http://localhost:8000', {
      autoConnect: false
    });

    patch(this.socket);

    this.socket.on('connect', () => {
      this.socket.emit('open', path);
    });

    this.socket.on('book', ({ sessionId, ...book }) => {
      this.setState({
        sessionId,
        book: {
          ...this.initialState.book,
          ...book
        }
      });
    });

    this.socket.on('update', ({ sessionId, saved, action, ...data }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      if(action === 'create') {
        let blocks = this.state.book.blocks;

        if(data.index === blocks.length) {
          blocks = [ ...blocks, data.block ];
        } else {
          blocks = blocks.reduce((res, block, i) => {
            if(i === data.index) {
              return [ ...res, data.block, block ];
            } else {
              return [ ...res, block ];
            }
          }, []);
        }

        this.setState({
          book: { ...this.state.book, blocks, saved }
        });
      } else if(action === 'delete') {
        const blocks = this.state.book.blocks.filter((block, index) => index !== data.index);

        this.setState({
          book: { ...this.state.book, blocks, saved }
        });
      } else if(action === 'options') {
        this.setState({
          book: {
            ...this.state.book,
            saved,
            blocks: this.state.book.blocks.map((block, index) => {
              if(index === data.index) {
                return {
                  ...block,
                  options: {
                    ...block.options,
                    ...data.options
                  }
                }
              } else {
                return block;
              }
            })
          }
        });
      } else {
        this.setState({
          book: { ...this.state.book, saved }
        });
      }
    });

    this.socket.on('status', ({ sessionId, status }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      this.setState({
        book: { ...this.state.book, status }
      });
    });

    this.socket.on('stats', ({ sessionId, ...current }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      let histogram = [...this.state.stats.histogram, current];
      histogram = histogram.slice(Math.max(histogram.length - 100, 0))

      this.setState({
        stats: { current, histogram }
      });
    });

    this.socket.on('block:output', ({ sessionId, index: updateIndex, output }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      this.setState({
        book: {
          ...this.state.book,
          blocks: this.state.book.blocks.map((block, index) => index == updateIndex ? ({ ...block, ...output }) : block)
        }
      });
    });

    this.socket.on('action:block:update:script', ({ sessionId, index: updateIndex, script }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      this.setState({
        book: {
          ...this.state.book,
          blocks: this.state.book.blocks.map((block, index) => index == updateIndex ? ({ ...block, script }) : block)
        }
      });
    });

    this.socket.on('progress', ({ sessionId, progress, status }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      this.setState({
        book: { ...this.state.book, status, progress }
      });
    });

    this.createActions();
    this.socket.open();
  }

  emit(eventName, payload = {}) {
    const sessionId = this.state.sessionId;
    this.socket.emit(eventName, { sessionId, ...payload });
  }

  createActions() {
    const actionEventNames = {
      forceRuntimeGC: 'runtime:gc',
      recreateRuntime: 'runtime:recreate',
      save: 'save',
      saveAs:'save:as',
      run: 'run',
      updateBlockOptions: 'block:update:options',
      updateBlockScript: 'block:update:script',
      createBlock: 'block:create',
      deleteBlock: 'block:delete',
      clearBlock: 'block:clear'
    };

    const actions = {
      hideCode: () => this.setState({ isCodeHidden: true }),
      showCode: () => this.setState({ isCodeHidden: false }),

      language: (method, params) => {
        const id = this.autoIncrement++;
        this.emit(`action:language:request`, {
          sessionId: this.state.sessionId,
          id,
          request: { method, params }
        });

        return new Promise((resolve, reject) => {
          const responseHandler = ({ sessionId, id: responseId, response }) => {
            if(sessionId !== this.state.sessionId) {
              return;
            }

            if(responseId !== id) {
              return;
            }

            if(response.error) {
              reject(response.error);
            } else {
              resolve(response.result);
            }
  
            this.socket.off(`language:response`, responseHandler);
          }
  
          this.socket.on(`language:response`, responseHandler);
        });
      }
    };

    for(let action in actionEventNames) {
      actions[action] = (data = {}) => {
        this.emit(`action:${actionEventNames[action]}`, data);
      };
    }

    this.actions = actions;
  }

  getContext() {
    return {
      ...this.state.book,
      notebookPath: this.state.notebookPath,
      isCodeHidden: this.state.isCodeHidden,
      actions: this.actions,
      onKeyDown: (keyName, event) => this.onKeyDown(keyName, event)
    };
  }

  onKeyUp(keyName, event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  onKeyDown(keyName, event) {
    switch(keyName) {
      case 'ctrl+s': {
        this.emit(`action:save`);
      }
    }

    if(event) {
      event.preventDefault();
      event.stopPropagation();
    }
    return false;
  }

  render() {
    return (
      <Hotkeys
        keyName="ctrl+s"
        onKeyDown={this.onKeyDown.bind(this)}
      >
        <Prompt when={!this.state.book.saved} message="You have unsaved changes, are you sure you want to leave?" />
        <AppBar {...this.getContext()} stats={this.state.stats}/>
        <Content {...this.getContext()} />
      </Hotkeys>
    );
  }
});
