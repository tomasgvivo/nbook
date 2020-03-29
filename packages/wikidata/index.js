const request = require('@nbook/request');
const wdk = require('wikidata-sdk');

module.exports = (...args) => {
    const sparql = String.raw(...args);
    const response = request({
        uri: wdk.sparqlQuery(sparql),
        headers: {
            'user-agent': '@nbook/wikidata',
            accept: 'application/sparql-results+json'
        },
        returnResponse: true
    });

    if(response.statusCode !== 200) {
        throw new Error(`Server responded with unexpected status ${response.statusCode}.`);
    }

    const { results: { bindings } } = JSON.parse(response.body.toString());
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
}