import React, { Component } from 'react';

import Container from '@material-ui/core/Container';
import { withRouter } from 'react-router-dom';
import AppBar from './AppBar'
import Content from './Content';
import io from 'socket.io-client';
const patch = require('socketio-wildcard')(io.Manager);

export default withRouter(class Book extends Component {

  get initialState() {
    return {
      sessionId: null,
      book: {
        stats: {
          current: {},
          histogram: []
        },
        blocks: []
      },
      isCodeHidden: false
    };
  }

  constructor(props) {
    super(props);
    this.state = this.initialState;
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
    this.setState(this.initialState);

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

    this.socket.on('book:update', ({ sessionId, saved, action, ...data }) => {
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
      } else {
        this.setState({
          book: { ...this.state.book, saved }
        });
      }
    });

    this.socket.on('book:status', ({ sessionId, status }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      this.setState({
        book: { ...this.state.book, status }
      });
    });

    this.socket.on('book:stats', ({ sessionId, ...current }) => {
      if(sessionId !== this.state.sessionId) {
        return;
      }

      let histogram = [...this.state.book.stats.histogram, current];
      histogram = histogram.slice(Math.max(histogram.length - 100, 0))

      this.setState({
        book: { ...this.state.book, stats: { current, histogram } }
      });
    });

    this.socket.on('book:block:output', ({ sessionId, index: updateIndex, output }) => {
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

    this.socket.on('book:action:block:update:script', ({ sessionId, index: updateIndex, script }) => {
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

    this.createActions();
    this.socket.open();
  }

  createActions() {
    const actionEventNames = {
      forceRuntimeGC: 'runtime:gc',
      recreateRuntime: 'runtime:recreate',
      save: 'save',
      saveAs:'save:as',
      run: 'run',
      updateBlockScript: 'block:update:script',
      createBlock: 'block:create',
      deleteBlock: 'block:delete',
      clearBlock: 'block:clear'
    };

    const actions = {
      hideCode: () => this.setState({ isCodeHidden: true }),
      showCode: () => this.setState({ isCodeHidden: false })
    };

    for(let action in actionEventNames) {
      actions[action] = (data = {}) => {
        const sessionId = this.state.sessionId;
        this.socket.emit(`book:action:${actionEventNames[action]}`, { sessionId, ...data });
      };
    }

    this.actions = actions;
  }

  getContext() {
    return {
      ...this.state.book,
      isCodeHidden: this.state.isCodeHidden,
      actions: this.actions
    };
  }

  render() {
    return (
      <>
        <AppBar {...this.getContext()}/>
        <Container>
          <Content {...this.getContext()} />
        </Container>
      </>
    );
  }
});
