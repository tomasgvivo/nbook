const Bundler = require('parcel-bundler');
const Path = require('path');

module.exports = () => {
    const entryFiles = Path.resolve('src/index.html');

    const options = {
        outDir: Path.resolve('build'),
        outFile: 'index.html', // The name of the outputFile
        publicUrl: '.',
        cache: true,
        cacheDir: Path.resolve('cache'),
        contentHash: false,
        minify: true,
        target: 'browser',
        bundleNodeModules: true,
        hmr: true,
        hmrPort: 8080,
        sourceMaps: true,
        autoInstall: true
    };


    const bundler = new Bundler(entryFiles, options);
    return bundler.bundle();
}
