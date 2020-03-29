const { Result } = require('@nbook/core');

class TableResult extends Result {

    constructor(array) {
        super();
        const header = Object.keys(array[0]);
        const rows = array.map(row => header.map(key => row[key]));
        this.table = { header, rows };
    }

    valueOf() {
        return {
            table: this.table
        };
    }

}

module.exports = array => new TableResult(array);
