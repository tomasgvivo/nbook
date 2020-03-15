const Markdown = require('marli');
const md = Markdown();
const fetch = require('node-fetch');
const requireFromWeb = require('require-from-web');

module.exports = {

    require: requireFromWeb,

    fetch,

    html: () => {

    },

    md: (...args) => {
        return {
            html: `<div class="markdown">${md(...args)}</div>`
        };
    },

    output: (...outputs) => {
        if(outputs.length === 0) {
            throw new Error('output requires one or more arguments.');
        }

        if(outputs.length === 1) {
            return outputs[0];
        } else {
            return {
                outputs: outputs
            }
        }
    }

}