const { Result } = require('@nbook/core');
const katex = require('katex');

class LatexResult extends Result {

    constructor(rawStringArgs) {
        super();
        this.latex = String.raw(...rawStringArgs)
        this.html = katex.renderToString(this.latex, {
            throwOnError: false,
            output: 'html'
        });
    }

    valueOf() {
        return {
            html: this.html,
            latex: this.latex
        };
    }

}

module.exports = (...args) => new LatexResult(args);
