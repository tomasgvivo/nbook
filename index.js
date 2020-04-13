const Server = require('./lib/server');

const main = async () => {
  console.log('Starting server');

  const server = new Server({
    port: process.env.NBOOK_PORT || 8000,
    host: process.env.NBOOK_HOSTNAME || 'localhost',
    workspacePath: process.env.NBOOK_WORKSPACE || './workspace',
    build: !!process.env.NBOOK_BUILD || process.env.NODE_ENV === "development" || false,
    publicUrl: process.env.NBOOK_PUBLIC_URL
  });

  await server.start();

  console.log('Server started');
}

main().catch(console.error);
