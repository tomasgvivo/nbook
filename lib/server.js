const Bundler = require('parcel-bundler');
const { createServer } = require('http');
const WebSocket = require('ws');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const Path = require('path');
const fs = require('fs').promises;

const Workspace = require('./Workspace');
const LanguageService = require('@nbook/language-service');
const { RuntimeService, Notebook, RuntimeTimeoutError, JSONRPC } = require('@nbook/core');

module.exports = class Server {

  constructor({ host = 'localhost', port = 80, workspacePath = './workspace', build = true } = {}) {
    this.host = host;
    this.port = port;
    this.workspacePath = workspacePath;
    this.build = build;

    this.express = express();
    this.express.use(compression());
    this.express.use(helmet());
    this.httpServer = createServer(this.express);
    this.socket = new WebSocket.Server({ server: this.httpServer });
    this.workspace = new Workspace(this.workspacePath);

    this.openNotebooks = new Map;
    this.socketConnections = new Map;
  }

  async start() {
    if(this.build) {
      await this.buildFrontend();
    }

    this.createNotebookSocket();
    this.createWorkspaceExplorer();
    this.express.use('/', express.static('./build'));
    this.express.use('/workspace', express.static(this.workspacePath));

    await new Promise(resolve => {
      this.httpServer.listen(this.port, this.host, resolve)
    });
  }

  async buildFrontend() {
    fs.copyFile(
      require.resolve('@nbook/core/lib/runtime/runtime.d.ts'),
      Path.join(__dirname, '..', 'src/dynamic/runtime.d.ts')
    );

    const entryFiles = Path.resolve('src/index.html');
    const bundler = new Bundler(entryFiles, {
      outDir: Path.resolve('build'),
      outFile: 'index.html', // The name of the outputFile
      publicUrl: '.',
      cache: false,
      cacheDir: Path.resolve('cache'),
      contentHash: false,
      minify: false,
      sourceMaps: true,
      detailedReport: true,
      watch: true,
      hmr: true,
      hmrPort: 8080,
      autoInstall: true
    });

    return bundler.bundle();
  }

  createNotebookSocket() {
    this.socket.on('connection', this.handleNotebookConnection.bind(this));
  }

  createWorkspaceExplorer() {
    this.express.get(['/api/explore/*', '/api/explore'], async (req, res, next) => {
      try {
        const path = req.params[0];
        await this.workspace.validatePath(path);
        const result = await this.workspace.parse(path);

        if (req.query.hasOwnProperty('open')) {
          if (result.type === 'file') {
            res.type(result.mime || 'application/octet-stream');
            return this.workspace.open(path).pipe(res);
          }
        }

        res.json(result);
      } catch (error) {
        console.error(error)
        next(error);
      }
    });
  }

  handleNotebookConnection(connection) {
    const jsonrpc = new JSONRPC(message => connection.send(JSON.stringify(message)));
    connection.on('message', message => jsonrpc.handleMessage(JSON.parse(message)))

    jsonrpc.debug = true;

    const initialStatus = {
      notebook: {
        isOpen: false,
        isSaved: false
      },
      runtime: {
        isRunning: false,
        isTimeout: false
      }
    };

    let file = null;
    let notebook = new Notebook;
    let runtimeService = null;
    let languageService = null;
    let statsFrequency = 2000;
    let statsTimeoutlId = null;
    let status = initialStatus;

    jsonrpc.handle('open', async ({ path, withRuntime = true, withLanguage = true }) => {
      if(status.notebook.isOpen) {
        throw new Error('Notebook already open.');
      }

      await this.workspace.validatePath(path);
      const parsedPath = await this.workspace.parse(path);

      if(parsedPath.type !== 'notebook') {
        throw new Error('The given path does not refere to a notebook.');
      }

      file = parsedPath.content.find(({ name }) => name === 'notebook.json');
      const data = await this.workspace.read(file.path);
      const serializedNotebook = JSON.parse(data);

      notebook = Notebook.deserialize(serializedNotebook);

      if(withRuntime) {
        runtimeService = new RuntimeService(notebook, this.workspace.resolve(path));
        await runtimeService.start();
        createTimeoutLoop();
      }

      if(withLanguage) {
        languageService = new LanguageService(notebook, this.workspace.resolve(path));
        await languageService.connect({});
      }

      updateNotebookStatus({ isOpen: true, isSaved: true });

      return notebook;
    });

    jsonrpc.handle('save', () => {
      if(!status.notebook.isOpen) {
        throw new Error('There is no notebook open.');
      }

      notebook.commit();
      const serializedNotebook = Notebook.serialize(notebook);
      const data = JSON.stringify(serializedNotebook, null, 2);
      this.workspace.write(file.path, data);

      updateNotebookStatus({ isSaved: true });
    });

    const updateStatus = newStatus => {
      status = { ...status, ...newStatus };
      jsonrpc.sendNotification('status', status);
    }

    const updateNotebookStatus = newStatus => {
      updateStatus({ ...status, notebook: { ...status.notebook, ...newStatus } });
    }

    const updateRuntimeStatus = newStatus => {
      updateStatus({ ...status, runtime: { ...status.runtime, ...newStatus } });
    }

    const onBlocksUpdated = index => {
      if(typeof index === 'number') {
        jsonrpc.sendNotification('notebook/block/updated', { index, block: notebook.blocks[index] });
        updateNotebookStatus({ isSaved: status.notebook.isSaved && notebook.blocks[index].hasChanged() });
      } else {
        jsonrpc.sendNotification('notebook/blocks/updated', { blocks: notebook.blocks });
        updateNotebookStatus({ isSaved: false });
      }

      if(languageService) {
        languageService.loadBlocks();
      }
    }

    jsonrpc.handle('notebook/block/update/options', ({ index, options }) => {
      notebook.updateBlockOptions(index, options);
      onBlocksUpdated(index);
    });

    jsonrpc.handle('notebook/block/update/script', ({ index, script }) => {
      notebook.updateBlockScript(index, script);
      onBlocksUpdated(index);
    });

    jsonrpc.handle('notebook/block/clear', ({ index }) => {
      notebook.clearBlock(index);
      onBlocksUpdated(index);
    });

    jsonrpc.handle('notebook/block/create', ({ index }) => {
      notebook.createBlock(index);
      onBlocksUpdated();
    });

    jsonrpc.handle('notebook/block/delete', ({ index }) => {
      notebook.deleteBlock(index);
      onBlocksUpdated();
    });

    jsonrpc.handle('language/complete', request => languageService.complete(request));
    jsonrpc.handle('language/resolve', item => languageService.resolve(item));

    const MINUTE = 1000 * 60 * 60;
    jsonrpc.handle('runtime/run', async ({ targetIndex = notebook.blocks.length - 1, timeoutMs = MINUTE * 1 } = {}) => {
      if(!runtimeService) {
        throw new Error('Notebook was not loaded with a runtime service.');
      } else if(status.runtime.isRunning) {
        throw new Error('Runtime already running.');
      }

      updateRuntimeStatus({ isRunning: true });

      const maxTimeout = MINUTE * 5;
      const minTimeout = MINUTE / 2; // 30 seconds.

      if(timeoutMs > maxTimeout) {
        throw new Error('Maximum timeout is 5 minutes.');
      } else if(timeoutMs < minTimeout) {
        throw new Error('Minimum timeout is 5 minutes.');
      }

      runtimeService.jsonrpc.on('output', ({ index, output }) => {
        const block = notebook.blocks[index];
        block.setResults(output.results);
        block.setError(output.error);
        block.setExecutionCount(output.executionCount);
        block.setHasRun(output.hasRun);
        block.setStratergy(output.stratergy);
        block.setTime(output.time);
        onBlocksUpdated(index);
      });

      runtimeService.on('progress', data => {
        jsonrpc.sendNotification('runtime/progress', data);
      });

      try {
        await runtimeService.run(targetIndex, timeoutMs);
        updateRuntimeStatus({ isRunning: false, isTimeout: false });
      } catch(error) {
        if(error instanceof RuntimeTimeoutError) {
          updateRuntimeStatus({ isRunning: false, isTimeout: true });
        } else {
          updateRuntimeStatus({ isRunning: false, isTimeout: false });
        }

        throw error;
      } finally {
        runtimeService.off('output');
        runtimeService.off('progress');
      }
    });

    jsonrpc.handle('runtime/stop', async () => {
      runtimeService.restart();
    });

    const createTimeoutLoop = () => {
      statsTimeoutlId = setTimeout(() => {
        createTimeoutLoop();
        runtimeService.getStats().then(stats => jsonrpc.sendNotification('runtime/stats', stats));
      }, statsFrequency);
    }

    jsonrpc.handle('runtime/stats/frequency', ({ frequency  }) => {
      if(!runtimeService) {
        throw new Error('Notebook was not loaded with a runtime service.');
      } else if(frequency < 200) {
        throw new Error('Invalid frequency.');
      }

      statsFrequency = frequency;

      if(statsTimeoutlId) {
        clearTimeout(statsTimeoutlId);
      }
  
      createTimeoutLoop();
    });

    jsonrpc.handle('runtime/restart', () => {
      if(!runtimeService) {
        throw new Error('Notebook was not loaded with a runtime service.');
      }

      updateRuntimeStatus({ isRunning: false, isTimeout: false });
      runtimeService.restart()
    });

    jsonrpc.handle('runtime/collectGarbahe', () => {
      if(!runtimeService) {
        throw new Error('Notebook was not loaded with a runtime service.');
      }

      runtimeService.collectGarbage()
    });

    connection.on('close', () => {
      if(status.notebook.isOpen) {
        if(statsTimeoutlId) {
          clearTimeout(statsTimeoutlId);
        }
    
        if(runtimeService) {
          runtimeService.stop();
          runtimeService = null;
        }

        if(languageService) {
          languageService.close();
          languageService = null;
        }

        status = initialStatus;
      }
    });

    jsonrpc.sendNotification('ready');
  }
}
