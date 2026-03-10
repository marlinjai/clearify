#!/usr/bin/env node
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { ClearifyDataSchema } from '../dist/node/core/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../dist/config-schema.json');

const schema = z.toJSONSchema(ClearifyDataSchema, { target: 'draft-2020-12' });

schema.$id = 'https://docs.lumitra.co/schemas/clearify-data.json';
schema.title = 'Clearify Data Config';

writeFileSync(outPath, JSON.stringify(schema, null, 2) + '\n', 'utf-8');
console.log('Generated config-schema.json');
