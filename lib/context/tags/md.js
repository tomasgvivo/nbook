const Markdown = require('marli');
const md = Markdown();

module.exports = (...args) => {
    return {
        html: `<div class="markdown">${md(...args)}</div>`,
        md: String.raw(...args)
    };
};