const { Result } = require('@nbook/core');
const Papa = require('papaparse');

const table = (data, options = {}) => {
    options = {
        dense: true,
        pagination: true,
        paginationRowsPerPageOptions: [ 10, 15, 20, 25, 30, 50, 100 ],
        paginationPerPage: 10,
        ...options
    };

    class TableResult extends Result {
        getRenderer() {
            return {
                path: this.relative(__dirname, './dist/table.js')
            };
        }

        valueOf() {
            return { data, options };
        }
    }

    return new TableResult;
}

table.from_csv = (csvString, { format = {}, ...options } = {}) => {
    format = {
        skipEmptyLines: true,
        header: true,
        ...format
    }
    const { errors, meta, data } = Papa.parse(csvString, format);
    return table(data, { ...options, from_csv: { errors, meta } });
}

module.exports = table;
