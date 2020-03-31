const { Result } = require('@nbook/core');

module.exports = (...args) => {
    class MarkdownResult extends Result {
        getRenderer() {
            return {
                path: this.relative(__dirname, './dist/md.js')
            }
        }
    
        valueOf() {
            return String.raw(...args);
        }
    }

    return new MarkdownResult;
};
