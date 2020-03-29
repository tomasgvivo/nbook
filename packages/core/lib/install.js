const { execSync } = require('child_process');
const path = require('path');
const npm_bin = path.resolve(require.resolve('npm'), '../../bin/npm-cli.js');
const rootDir = process.cwd();

const parsePackageName = require('./parsePackageName');

module.exports = (...packages) => {
    const packageFullNames = packages.map(package => {
        const { name, version } = parsePackageName(package);
        return `${name}${version && '@'}${version}`;
    });

    try {
        const result = execSync(`node ${npm_bin} install ${packageFullNames.join(' ')}`, {
            cwd: rootDir,
            env: {
                NPM_CONFIG_JSON: true,
                NPM_CONFIG_GLOBAL: true,
                NPM_CONFIG_PREFIX: rootDir
            }
        });

        return JSON.parse(result.toString());
    } catch (error) {
        console.log(error);
        throw new Error(`Unable to install package ${package}`);
    }
};
