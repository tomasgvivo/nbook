const Path = require('path');

module.exports = {
    runtimePath: Path.join(__dirname, 'lib/Runtime.js'),
    RuntimeService: require('./lib/runtime'),
    JSONRPC: require('./lib/util/JSONRPC'),
    Block: require('./lib/Block'),
    Notebook: require('./lib/Notebook'),
    Result: require('@nbook/result'),
    RuntimeTimeoutError: require('./lib/runtime/errors/RuntimeTimeoutError')
};