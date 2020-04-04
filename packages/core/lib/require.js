const Path = require('path');
const paths = [ Path.join(process.cwd(), 'lib', 'node_modules') ];

module.exports = request => {
    const path = require.resolve(request, { paths });
    const module = require(path)
    delete require.cache[path];
    return module;
};
