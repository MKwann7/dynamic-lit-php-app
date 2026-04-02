import { defineConfig } from 'vite';
import * as path from 'node:path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'dyn-component-manager.js'
        },
        outDir: path.resolve(__dirname, '../../dist/runtime'),
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        rollupOptions: {
            external: [
                'lit',
                '@maxr/shared/runtime-widget',
                '@maxr/shared/types',
            ],
            output: {
                entryFileNames: 'dyn-component-manager.js'
            }
        }
    }
});