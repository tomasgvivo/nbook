const Path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const mime = require('mime-types');
const { isBinaryFile } = require('isbinaryfile');

module.exports = class Workspace {

    constructor(path) {
        this.path = Path.resolve(path);
    }

    async validatePath(path) {
        path = this.resolve(path || '.');
        if(!this.inWorkspace(path)) {
          throw new Error('Invalid path.');
        }
    
        await fsp.access(path);
    }

    getRelativePath(path) {
        return Path.relative(this.path, path);
    }

    inWorkspace(path) {
        return path.startsWith(this.path);
    }

    async inNotebook(path) {
        while(this.inWorkspace(path)) {
            const stats = await fsp.stat(path);
            if(stats.isDirectory()) {
                const files = await fsp.readdir(path);

                if(files.includes('notebook.json')) {
                    return await this.parse(Path.join(path, 'notebook.json'), 0);
                }
            }

            path = Path.resolve(path, '..');
        }

        return null;
    }

    async parse(path, depth = 1) {
        path = this.resolve(path);
        const stats = await fsp.stat(path);
        const parsedPath = Path.parse(path);
        const name = parsedPath.name + parsedPath.ext;
        const inNodeModules = path.includes('/lib/node_modules');
        const inNodeModulesRoot = inNodeModules && path.endsWith('/lib/node_modules');
        if (stats.isDirectory()) {
            const content = await fsp.readdir(path);
            if (inNodeModules && inNodeModulesRoot) {
                return {
                    type: 'node_modules',
                    name,
                    path: this.getRelativePath(path),
                    access: true,
                    content: depth < 1 ? undefined : content.filter(item => !item.startsWith('.')).map(
                        item => ({
                            type: 'node_module',
                            name: item,
                            path: this.getRelativePath(path),
                            access: false
                        })
                    ),
                    notebook: depth < 1 ? undefined : await this.inNotebook(path)
                };
            } else if (inNodeModules) {
                throw new Error('Can not access node_modules.');
            } else if (content.includes('notebook.json')) {
                const bookData = await fsp.readFile(Path.join(path, 'notebook.json'));
                const { title } = JSON.parse(bookData);
                return {
                    type: 'notebook',
                    name,
                    path: this.getRelativePath(path),
                    access: true,
                    title,
                    content: depth < 1 ? undefined : await Promise.all(content.map(item => this.parse(Path.join(path, item), depth - 1)))
                };
            } else {
                return {
                    type: 'directory',
                    name,
                    path: this.getRelativePath(path),
                    access: true,
                    content: depth < 1 ? undefined : await Promise.all(content.map(item => this.parse(Path.join(path, item), depth - 1))),
                    notebook: depth < 1 ? undefined : await this.inNotebook(path)
                };
            }
        } else if (stats.isFile()) {
            return {
                type: 'file',
                name,
                path: this.getRelativePath(path),
                access: true,
                atime: stats.atime,
                mtime: stats.mtime,
                ctime: stats.ctime,
                mime: mime.lookup(path) || (await isBinaryFile(await fsp.readFile(path), stats.size) ? 'application/octet-stream' : 'text/plain'),
                notebook: depth < 1 ? undefined : await this.inNotebook(path)
            }
        }
    }

    resolve(path) {
        return Path.resolve(this.path, path);
    }

    open(path) {
        return fs.createReadStream(this.resolve(path));
    }

    read(path) {
        console.log(path, this.resolve(path))
        return fsp.readFile(this.resolve(path));
    }

    write(path, data) {
        return fsp.writeFile(this.resolve(path), data);
    }
}
