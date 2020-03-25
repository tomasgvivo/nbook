const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const npm_bin = path.resolve(require.resolve('npm'), '../../bin/npm-cli.js');
console.log(npm_bin);

const parsePackageName = input => {
    const RE_SCOPED = /^(@[^/]+\/[^/@]+)(?:\/([^@]+))?(?:@([\s\S]+))?/
    const RE_NORMAL = /^([^/@]+)(?:\/([^@]+))?(?:@([\s\S]+))?/

    if (typeof input !== 'string') {
        throw new TypeError('Expected a string')
    }

    const matched = input.charAt(0) === '@' ? input.match(RE_SCOPED) : input.match(RE_NORMAL)

    if (!matched) {
        throw new Error(`[parse-package-name] "${input}" is not a valid string`)
    }

    return {
        name: matched[1],
        path: matched[2] || '',
        version: matched[3] || ''
    }
}

module.exports = (...packages) => {
    const rootDir = process.cwd();
    const packageFullNames = packages.map(package => {
        const { name, version } = parsePackageName(package);
        return `${name}${version && '@'}${version}`;
    })

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
}