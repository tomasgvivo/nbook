const Path = require('path');
const Result = require('./lib/Result');

module.exports = {
    runtimePath: Path.join(__dirname, 'lib/Runtime.js'),
    Result
};