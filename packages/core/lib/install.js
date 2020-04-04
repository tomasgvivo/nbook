const { execSync } = require('child_process');
const path = require('path');
const npm_bin = path.resolve(require.resolve('npm'), '../../bin/npm-cli.js');
const rootDir = process.cwd();
const contextRequire = require('./require');
const semver = require('semver');

const parsePackageName = require('./parsePackageName');

const Path = require('path');
const paths = [ Path.join(process.cwd(), 'lib', 'node_modules') ];

class InstallError {
    constructor(output) {
        this.output = output;
    }

    get message() {
        return 'Unable to install one or more packages.';
    }

    get stack() {
        return this.output
            .toString()
            .split('\n')
            .filter(line => line.startsWith('npm ERR'))
            .join('\n');
    }
}

module.exports = (...packages) => {
    const packageFullNames = packages.map(package => {
        const { name, version } = parsePackageName(package);
        return `${name}${version && '@'}${version}`;
    });

    const packagesToInstall = [];

    for(let package of packages) {
        const { name, version } = parsePackageName(package);
        try {
            const { version: installedVersion } = contextRequire(name + '/package.json');
            if(version && !semver.satisfies(installedVersion, version)) {
                throw null;
            }
        } catch {
            packagesToInstall.push(`${name}${version && '@'}${version}`);
        }
    }

    try {
        const result = execSync(`node ${npm_bin} install ${packagesToInstall.join(' ')}`, {
            cwd: rootDir,
            env: {
                NPM_CONFIG_JSON: true,
                NPM_CONFIG_GLOBAL: true,
                NPM_CONFIG_PREFIX: rootDir
            }
        });

        return JSON.parse(result.toString());
    } catch (error) {
        throw new InstallError(error.output);
    }
};
