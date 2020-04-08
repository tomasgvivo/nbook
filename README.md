# nbook
### Beautiful notebook for javscript enthusiasts, data analists and more.

This project is under active development and it has no stable release yet.

### TODO
- General
  - [x] Dockerization
  - [ ] Publish on dockerhub
  - [ ] Publish server on npm
  - [ ] Write better readme
  - [ ] Write documentation
  - [ ] Write some typescript declarations for packages
  - [ ] Authentication
  - [ ] Notebook Auto-save
  - [ ] Notebook Auto-backup
  - [ ] Notebook versioning / checkpoints
  - [ ] Use json-rpc on top of socket.io instead of only events
  - [ ] SSR for notebook renderers
  - [ ] Service worker for cache and handling offline
  - [ ] Add more examples
  - [ ] Use linux namespaces (or docker) for runtime isolation
- File explorer
  - [x] File navigation
  - [x] Open notebook from file explorer
  - [ ] Filesystem CRUD
- Notebook editor
  - [x] Code editor using Microsoft Monaco Editor
  - [x] Visualization mode
  - [x] Show runtime resource usage
  - [x] Hotkeys for saving and running block
  - [x] Allow user to reload runtime
  - [x] Allow user to run garbage collector on runtime process
  - [x] Allow user to disable edition (Lock Block)
  - [x] Allow user to disable cache for a block
  - [x] Allow user to mark block as visible in visualization mode
  - [x] Allow user to mark block for running out of the main block context
  - [x] Print button
  - [x] Show timings for blocks
  - [x] Show code suggestions and docs considering context and installed packages
  - [ ] Stop button
  - [ ] Show runtime log
  - [ ] Repl mode
  - [ ] Locked editor mode (lock full view)
  - [ ] Allow user to move blocks (reorder)
  - [ ] Allow user to mark block as disabled (runtime should not run that block)
  - [ ] Cache renderer assets
- Notebook runtime
  - [x] Allow top-level await on blocks
  - [x] Block level cache
  - [x] Block level error handling
  - [x] Register block timings
  - [x] Install npm packages from block
  - [x] Require npm packages and js/json files from block
  - [x] Programmatically stop execution
  - [x] Programmatically skip block execution
  - [x] Add functionality to export block results to the frontend
  - [x] Store and provide secrets
  - [ ] Skip disabled blocks
  - [ ] Block level logging
  - [ ] Block breakpoints and debugging
  - [ ] Secure access to filesystem
- Packages
  - [x] @nbook/core (runtime)
  - [x] @nbook/md (markdown renderer)
  - [x] @nbook/plot (chart.js data renderer)
  - [x] @nbook/table (data table renderer)
  - [x] @nbook/request (synchronic requests for nbook)
  - [ ] @nbook/result (move from @nbook/core)
  - [ ] @nbook/dev (toolkit for nbook package development)
  - [ ] @nbook/p5 (processing.js renderer)
- Examples
  - [x] Install packages from block
  - [x] Results
  - [x] Secrets
  - [x] @nbook/request
  - [x] @nbook/plot
  - [x] @nbook/md
  - [x] @nbook/table
  - [x] mongodb connection
  - [ ] mysql connection
  - [ ] google spreadsheets connection
  - [ ] access filesystem
