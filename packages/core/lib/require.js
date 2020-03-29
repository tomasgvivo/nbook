const Path = require('path');
const paths = [ Path.join(process.cwd(), 'lib', 'node_modules') ];
module.exports = request => require(require.resolve(request, { paths }));
