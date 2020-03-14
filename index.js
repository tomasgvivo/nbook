const { app, BrowserWindow } = require('electron');
const Bundler = require('parcel-bundler');
const Path = require('path');

const entryFiles = Path.join(__dirname, 'src/index.html');

const options = {
  outDir: './build',
  outFile: 'index.html', // The name of the outputFile
  publicUrl: '.',
  watch: false,
  cache: true,
  cacheDir: 'cache',
  contentHash: false,
  minify: false,
  target: 'electron',
  bundleNodeModules: false,
  hmr: true,
  hmrPort: 8889,
  sourceMaps: true,
  autoInstall: true
};

const main = async () => {
  const bundler = new Bundler(entryFiles, options);
  const bundle = await bundler.bundle();
  console.log(bundle);
  
  app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  });

  await app.whenReady();

  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('build/index.html')
}

main().catch(console.error);
