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

cli
  .command('openapi:generate', 'Generate OpenAPI spec from NestJS app')
  .option('--module <path>', 'Path to NestJS app module', { default: './src/app.module.ts' })
  .option('--output <path>', 'Output path for spec file', { default: './docs/openapi.json' })
  .option('--title <title>', 'API documentation title')
  .option('--description <desc>', 'API documentation description')
  .option('--version <version>', 'API version')
  .action(async (options: { module?: string; output?: string; title?: string; description?: string; version?: string }) => {
    const { generateSpec } = await import('../presets/nestjs.js');
    await generateSpec({
      appModule: options.module,
      output: options.output,
      title: options.title,
      description: options.description,
      version: options.version,
    });
  });

cli.help();
cli.version('1.5.1');
cli.parse();
