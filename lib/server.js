const { createServer } = require('http');
const express = require('express');
const build_frontend = require('./build_frontend');
const load_book_socket = require('./load_book_socket');
const Workspace = require('./Workspace');

const main = async () => {
  await build_frontend();

  const WORKSPACE_DIR = './workspace';
  const workspace = new Workspace(WORKSPACE_DIR);
  const app = express();
  const server = createServer(app);

  load_book_socket(server, workspace);
  
  app.use('/', express.static('./build'));
  app.use('/workspace', express.static(WORKSPACE_DIR));

  app.get([ '/api/explore/*', '/api/explore' ], async (req, res, next) => {
    try {
      const path = req.params[0];
      await workspace.validatePath(path);
      const result = await workspace.parse(path);

      if(req.query.hasOwnProperty('open')) {
        if(result.type === 'file') {
          res.type(result.mime || 'application/octet-stream');
          return workspace.open(path).pipe(res);
        }
      }

      res.json(result);
    } catch(error) {
      console.error(error)
      next(error);
    }
  });

  server.listen(8000, () => {
    console.log('Server running.')
  });
}

main().catch(console.error);
