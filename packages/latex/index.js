const { Result } = require('@nbook/core');

module.exports = (...args) => {
    class LatexResult extends Result {
        getRenderer() {
            return {
                path: this.relative(__dirname, './dist/latex.js'),
                css: [
                    this.relative(__dirname, './dist/latex.css')
                ]
            };
        }

        valueOf() {
            return String.raw(...args);
        }
    }

    return new LatexResult;
};
