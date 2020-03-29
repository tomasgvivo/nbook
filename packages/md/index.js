const { Result } = require('@nbook/core');
const Markdown = require('marli');
const md = Markdown();

class MarkdownResult extends Result {

    constructor(rawStringArgs) {
        super();
        this.md = String.raw(...rawStringArgs)
        this.html = `<div class="markdown">${md(...rawStringArgs)}</div>`;
    }

    valueOf() {
        return {
            html: this.html,
            md: this.md
        };
    }

}

module.exports = (...args) => new MarkdownResult(args);
