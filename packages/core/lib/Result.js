
const defaultCollector = result => {
    console.warn('Created result without collector. This result will be lost.');
}

global._resultCollector = defaultCollector;

module.exports = class Result {

    constructor() {
        global._resultCollector(this);
    }

    toJSON() {
        return this.valueOf();
    }

    valueOf() {
        throw new Error(`Method not implemented.`);
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
