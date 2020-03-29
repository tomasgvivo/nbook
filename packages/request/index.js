const request = require('sync-request');

const defaultOptions = {
    method: 'GET',
    returnResponse: false
}

module.exports = (uri, options = {}) => {
    if(typeof uri === 'object') {
        options = uri;
    } else if(typeof uri === 'string') {
        options = { uri, ...options };
    }

    options = { ...defaultOptions, ...options };

    var { uri, method, returnResponse, ...options } = options;

    const response = request(method, uri, options);
    const contentType = response.headers['content-type'] || '';

    if(returnResponse) {
        return response;
    } else if(contentType.startsWith('application/json')) {
        return JSON.parse(response.body.toString());
    } else if(contentType.startsWith('text/')) {
        return response.body.toString();
    } else {
        return response.body;
    }
};
