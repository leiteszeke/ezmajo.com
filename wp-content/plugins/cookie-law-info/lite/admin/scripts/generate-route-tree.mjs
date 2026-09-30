/**
 * Generates src/routeTree.gen.ts so that tsc can type-check before the full Vite build.
 * Uses the same options as vite.config.ts tanstackRouter({ target: 'react', ... }).
 */
import { Generator, getConfig } from '@tanstack/router-generator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const config = getConfig(
  {
    target: 'react',
    routesDirectory: './src/routes',
    generatedRouteTree: './src/routeTree.gen.ts',
  },
  root
);

const generator = new Generator({ config, root });

try {
  await generator.run();
  console.log('✅ routeTree.gen.ts generated');
} catch (e) {
  console.error('Route tree generation failed:', e);
  process.exit(1);
}
