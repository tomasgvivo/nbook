import React, { Component } from 'react';
import get from 'lodash.get';
import isEqual from 'lodash.isequal';
import JSONRPC from '../../../packages/core/lib/util/JSONRPC';

const NotebookContext = React.createContext();

export default class NotebookService extends Component {

  get initialState() {
    return {
      isReady: false,
      connected: false,
      notebook: null,
      mode: "edit",
      currentBlockIndex: null,
      progress: null,
      stats: {
        current: {},
        histogram: (new Array(25)).fill({ cpu: 0, memory: 0 })
      },
      status: {
        notebook: {
          isOpen: false,
          isSaved: false
        },
        runtime: {
          isRunning: false,
          isTimeout: false
        }
      }
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      ...this.initialState,
      mode: this.props.mode || this.initialState.mode
    };
    this.mounted = false;
  }

  componentDidMount() {
    this.mounted = true;
    this.start(this.props.path);
  }

  componentWillUnmount() {
    this.stop();
    this.mounted = false;
  }

  componentDidUpdate(oldProps) {
    if(this.props.path !== oldProps.path) {
      this.stop();
      this.start(this.props.path);
    }

    if(this.props.mode !== oldProps.mode) {
      this.setState({ mode: this.props.mode });
    }
  }

  setStateAsync(state) {
    return new Promise(resolve => this.mounted && this.setState(state, resolve));
  }

  async start(path) {
    this.socket = new WebSocket(this.props.url || `ws://${document.location.host}`);
    this.jsonrpc = new JSONRPC(message => this.socket.send(JSON.stringify(message)));
    this.socket.addEventListener('message', event => this.jsonrpc.handleMessage(JSON.parse(event.data)));

    this.jsonrpc.handle('status', this.handleStatus.bind(this));
    this.jsonrpc.handle('runtime/stats', this.handleRuntimeStats.bind(this));
    this.jsonrpc.handle('runtime/progress', this.handleRuntimeProgress.bind(this));
    this.jsonrpc.handle('notebook/block/updated', this.handleNotebookBlockUpdated.bind(this));
    this.jsonrpc.handle('notebook/blocks/updated', this.handleNotebookBlocksUpdated.bind(this));

    console.log('waiting')
    await this.jsonrpc.awaitNotification('ready');
    console.log('is ready')
    await this.setStateAsync({ connected: true });
    console.log('connected')
    const notebook = await this.jsonrpc.sendRequest('open', { path });
    await this.setStateAsync({ notebook });
  }

  stop() {
    this.socket.close();
    this.jsonrpc = null;
  }

  handleStatus(status) {
    console.log(status)
    this.setState({ status });
  }

  handleNotebookBlockUpdated({ index, block }) {
    this.setState({
      ...this.state,
      notebook: {
        ...this.state.notebook,
        blocks: this.state.notebook.blocks.map((_block, _index) => index === _index ? block : _block)
      }
    });
  }

  handleNotebookBlocksUpdated({ blocks }) {
    this.setState({
      ...this.state,
      notebook: { ...this.state.notebook, blocks }
    });
  }

  handleRuntimeStats(stats) {
    const [ oldest, ...histogram ] = [ ...this.state.stats.histogram, stats ];
    this.setState({ stats: { current: stats, histogram } });
  }

  handleRuntimeProgress(progress) {
    this.setState({ progress });
  }

  getContext() {
    return {
      ...this.state,
      notebookPath: this.props.path,
      setMode: mode => !this.props.mode && this.setState({ mode }),
      changeCurrentBlockIndex: currentBlockIndex => this.setState({ currentBlockIndex }),
      save: () => this.jsonrpc.sendNotification('save'),
      createBlock: params => this.jsonrpc.sendNotification('notebook/block/create', params),
      deleteBlock: params => this.jsonrpc.sendNotification('notebook/block/delete', params),
      clearBlock: params => this.jsonrpc.sendNotification('notebook/block/clear', params),
      updateBlockScript: params => this.jsonrpc.sendNotification('notebook/block/update/script', params),
      updateBlockOptions: params => this.jsonrpc.sendNotification('notebook/block/update/options', params),
      runtime: {
        run: params => this.jsonrpc.sendRequest('runtime/run', params),
        stop: () => this.jsonrpc.sendNotification('runtime/restart'),
        restart: () => this.jsonrpc.sendNotification('runtime/restart'),
        collectGarbage: () => this.jsonrpc.sendNotification('runtime/collectGarbage'),
      },
      language: {
        complete: params => this.jsonrpc.sendRequest('language/complete', params),
        resolve: params => this.jsonrpc.sendRequest('language/resolve', params)
      }
    };
  }

  render() {
    return <NotebookContext.Provider value={this.getContext()} children={this.props.children} />;
  }
}


class WithNotebookWraper extends Component {
  shouldComponentUpdate(nextProps) {
    for(let key of this.props.observed) {
      if(!isEqual(get(this.props, key), get(nextProps, key))) {
        return true;
      }
    }

    return isEqual(this.props.childProps, nextProps.childProps);
  }

  getChildrenProps() {
    return { ...this.props.childProps, ...this.props, updateKey: Symbol('UpdateKey') };
  }

  render() {
    const Child = this.props.Child;
    return <Child {...this.getChildrenProps()} />
  }
}


export const withNotebook = (observed = [], Child) => props => (
  <NotebookContext.Consumer>
    { context => <WithNotebookWraper Child={Child} observed={observed} {...context} childProps={props} /> }
  </NotebookContext.Consumer>
);
