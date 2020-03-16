const Path = require('path');

module.exports = request => {
    const paths = [ Path.join(process.cwd(), 'lib', 'node_modules') ];
    const path = require.resolve(request, { paths });
    return require(path);
};
