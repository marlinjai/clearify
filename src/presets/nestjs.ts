import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface NestJSPresetOptions {
  /** Path to the NestJS app module (default: './src/app.module.ts') */
  appModule?: string;
  /** Output path for the generated spec (default: './docs/openapi.json') */
  output?: string;
  /** Swagger document title */
  title?: string;
  /** Swagger document description */
  description?: string;
  /** API version */
  version?: string;
}

/**
 * Bundle a TypeScript module via esbuild so it can be imported at runtime.
 * NestJS decorators and TypeScript syntax require compilation before import().
 */
async function bundleModule(entryPoint: string): Promise<any> {
  const { build } = await import('esbuild');
  const tmpId = randomBytes(4).toString('hex');
  const outFile = resolve(tmpdir(), `clearify-nestjs-${tmpId}.mjs`);

  try {
    await build({
      entryPoints: [entryPoint],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      write: true,
      // Keep NestJS packages external — they're loaded from node_modules at runtime
      external: ['@nestjs/*', 'reflect-metadata', 'class-transformer', 'class-validator', 'rxjs', 'rxjs/*'],
    });
    return await import(pathToFileURL(outFile).href);
  } finally {
    try { rmSync(outFile, { force: true }); } catch {}
  }
}

export async function generateSpec(options: NestJSPresetOptions = {}): Promise<void> {
  const {
    appModule = './src/app.module.ts',
    output = './docs/openapi.json',
    title = 'API Documentation',
    description = '',
    version = '1.0.0',
  } = options;

  let NestFactory: any;
  let SwaggerModule: any;
  let DocumentBuilder: any;

  // Use variable-based imports to prevent TypeScript from resolving these optional dependencies
  const nestCorePkg = '@nestjs/core';
  const swaggerPkg = '@nestjs/swagger';

  try {
    const nestCore = await import(/* @vite-ignore */ nestCorePkg);
    NestFactory = nestCore.NestFactory;
  } catch {
    throw new Error(
      '@nestjs/core is not installed. Install it to use the NestJS preset:\n  npm install @nestjs/core @nestjs/common'
    );
  }

  try {
    const swagger = await import(/* @vite-ignore */ swaggerPkg);
    SwaggerModule = swagger.SwaggerModule;
    DocumentBuilder = swagger.DocumentBuilder;
  } catch {
    throw new Error(
      '@nestjs/swagger is not installed. Install it to generate OpenAPI specs:\n  npm install @nestjs/swagger'
    );
  }

  // Resolve and bundle the app module (NestJS uses TypeScript decorators)
  const modulePath = resolve(process.cwd(), appModule);
  let AppModule: any;
  try {
    const mod = modulePath.endsWith('.ts') || modulePath.endsWith('.tsx')
      ? await bundleModule(modulePath)
      : await import(/* @vite-ignore */ pathToFileURL(modulePath).href);
    AppModule = mod.AppModule ?? mod.default;
  } catch (err) {
    throw new Error(
      `Failed to import NestJS app module from "${modulePath}":\n  ${err instanceof Error ? err.message : err}`
    );
  }

  if (!AppModule) {
    throw new Error(`No AppModule export found in "${modulePath}"`);
  }

  // Create the NestJS application without listening
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const config = new DocumentBuilder()
      .setTitle(title)
      .setDescription(description)
      .setVersion(version)
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Write the spec to disk
    const outputPath = resolve(process.cwd(), output);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log(`  OpenAPI spec written to ${output}`);
  } finally {
    await app.close();
  }
}
