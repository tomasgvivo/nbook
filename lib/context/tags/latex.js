const katex = require('katex');

module.exports = (...args) => {
    return {
        html: katex.renderToString(String.raw(...args), {
            throwOnError: false,
            output: 'html'
        }),
        latex: String.raw(...args)
    };
};