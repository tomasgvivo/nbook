const cloneDeep = require('lodash.clonedeep');
const Path = require('path');

const defaultCollector = result => {
    console.warn('Created result without collector. This result will be lost.');
}

global._resultCollector = global._resultCollector || defaultCollector;

module.exports = class Result {

    constructor() {
        global._resultCollector(this);
    }

    getRenderer() {
        return 'json';
    }

    relative(...path) {
        return Path.relative(process.cwd(), Path.join(...path));
    }

    toJSON() {
        return { value: this.valueOf(), renderer: this.getRenderer() };
    }

    valueOf() {
        throw new Error(`Method not implemented.`);
    }

    get value() {
        return cloneDeep(this.valueOf());
    }

    static setCollector(fn) {
        global._resultCollector = fn;
    }

    static unsetCollector() {
        global._resultCollector = defaultCollector;
    }

    static literal(value) {
        class LiteralResult extends this {
            valueOf() {
                return value;
            }
        }

        return new LiteralResult;
    }
};
