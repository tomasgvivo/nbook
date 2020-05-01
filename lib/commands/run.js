const { Command, flags } = require('@oclif/command');
const Path = require('path');

module.exports = class RunCommand extends Command {

    static description = "Run nbook server";

    static examples = [
        '$ nbook run',
        '$ nbook run --host 0.0.0.0 --port 80 --workspacePath /usr/local/nbook/workspace',
    ];

    static flags = {
        port: flags.integer({
            char: 'p',
            description: "Port number to listen from.",
            default: 7491,
            env: 'NBOOK_PORT',
            required: false
        }),
        host: flags.string({
            char: 'h',
            description: "Hostname or ip address to listen from.",
            default: 'localhost',
            env: 'NBOOK_HOST',
            required: false
        }),
        workspacePath: flags.string({
            char: 'w',
            description: "Workspace directory absolute path or relative to current directory.",
            default: Path.resolve(__dirname, '../../workspace'),
            env: 'NBOOK_WORKSPACE',
            required: false
        }),
        build: flags.boolean({
            char: 'b',
            description: "Build frontend application on server startup.",
            default: false || process.env.NBOOK_BUILD === 'true',
            hidden: true,
            required: false
        })
    };

    async run() {
        const { flags: { host, port, workspacePath, build } } = this.parse(RunCommand);
        const Server = require('../server');
        const server = new Server({ host, port, workspacePath, build });
        this.log('server: starting');
        await server.start();
        this.log('server: started');
        this.log(`server: listening on http://${host}:${port}`);
    }

}
