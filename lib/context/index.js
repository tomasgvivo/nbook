const request = require('sync-request');

module.exports = {

    install: require('./install'),
    require: require('./require'),
    request,

    ...require('./tags'),
    
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