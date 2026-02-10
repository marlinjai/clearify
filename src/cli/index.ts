import cac from 'cac';

const cli = cac('clearify');

cli
  .command('dev', 'Start development server')
  .option('--port <port>', 'Port to listen on')
  .option('--host', 'Expose to network')
  .action(async (options: { port?: number; host?: boolean }) => {
    const { createServer } = await import('../node/index.js');
    const server = await createServer({
      port: options.port,
      host: options.host,
    });
    await server.listen();
    console.log(`\n  Clearify dev server running at:\n`);
    server.printUrls();
    console.log();
  });

cli
  .command('build', 'Build static documentation site')
  .action(async () => {
    const { build } = await import('../node/index.js');
    await build();
  });

cli
  .command('init', 'Scaffold a docs folder')
  .option('--no-internal', 'Skip creating the internal docs section')
  .action(async (options: { noInternal?: boolean }) => {
    const { init } = await import('../node/index.js');
    await init({ noInternal: options.noInternal });
  });

cli
  .command('check', 'Check for broken internal links')
  .action(async () => {
    const { checkLinks } = await import('../node/check.js');
    await checkLinks();
  });

cli.help();
cli.version('0.2.0');
cli.parse();
