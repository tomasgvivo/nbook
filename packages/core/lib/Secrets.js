const fs = require('fs');
const Path = require('path');
const get = require('lodash.get');

let symbol = null;

module.exports = {

    setSymbol(_symbol) {
        symbol = _symbol;
    },

    get(path = '') {
        const filePath = Path.join(process.cwd(), 'secrets.json');

        try {
            fs.accessSync(filePath);
        } catch {
            throw new Error(`Can't access secrets.json file.`);
        }

        const rawSecrets = fs.readFileSync(filePath).toString();
        let secrets = null;

        try {
            secrets = JSON.parse(rawSecrets);
        } catch {
            throw new Error(`The file secrets.json has invalid format.`);
        }

        const value = get(secrets, path);

        return new Proxy({}, {
            get(target, key) {
                switch(key) {
                    case 'valueOf':
                        return () => value;
                    case 'path':
                        return path;
                    case symbol:
                        return true;
                    default:
                        throw new Error('You are trying to serialize a secured value.');
                }
            }
        });
    }
}
