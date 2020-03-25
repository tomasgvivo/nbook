const request = require('sync-request');
const wdk = require('wikidata-sdk');

module.exports = {

    install: require('./install'),
    require: require('./require'),
    request,

    ...require('./tags'),
    wikidata: (...args) => {
        const sparql = String.raw(...args);
        const url = wdk.sparqlQuery(sparql);
        const response = request('GET', url, {
            headers: {
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
                accept: 'application/sparql-results+json'
            }
        });

        if(response.statusCode !== 200) {
            throw new Error(`Server responded with unexpected status ${response.statusCode}.`);
        }

        const { head, results: { bindings } } = JSON.parse(response.body.toString());
        const results = [];

        for(let result of bindings) {
            results.push(
                Object.keys(result).reduce((res, key) => {
                    const variable = result[key];

                    if(variable.type !== 'literal') {
                        return {
                            ...res,
                            [key]: {
                                error: `type "${variable.type}" not supported`,
                                raw: variable
                            }
                        };
                    }

                    const datatype = variable.datatype ? variable.datatype.split('#')[1] : "string";
                    let value = variable.value;

                    if(datatype === 'integer' || datatype === 'decimal') {
                        value = parseInt(value, 10);
                    } else if(datatype !== 'string') {
                        value = {
                            [`$${datatype}`]: value
                        }
                    }

                    return {
                        ...res,
                        [key]: value
                    };
                }, {})
            );
        }

        return results;
    },

    table: array => {
        const header = Object.keys(array[0]);
        const rows = array.map(row => header.map(key => row[key]));
        return {
            table: {
                header,
                rows
            }
        }
    },

    plot: (type, data, options) => {
        return { plot: { type, data, options } };
    },

    output: (...outputs) => {
        if(outputs.length === 0) {
            throw new Error('output requires one or more arguments.');
        }

        if(outputs.length === 1) {
            return outputs[0];
        } else {
            return {
                outputs: outputs
            }
        }
    }

}