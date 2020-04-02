const { Result } = require('@nbook/core');

const md = (...args) => {
    class MarkdownResult extends Result {
        getRenderer() {
            return {
                path: this.relative(__dirname, './dist/md.js'),
                css: [
                    this.relative(__dirname, './dist/md.css')
                ]
            }
        }
    
        valueOf() {
            return {
                md: String.raw(...args)
            };
        }
    }

    return new MarkdownResult;
};

md.code = (code) => {
    return '`' + code.replace(/\`/gm, '\\`') + '`';
}

md.codeBlock = (type, code) => {
    if(typeof code !== 'string') {
        code = type;
        type = '';
    }

    return '```' + type + '\n' + code.replace(/\`/gm, '\\`').trim() + '\n```';
}

module.exports = md;
