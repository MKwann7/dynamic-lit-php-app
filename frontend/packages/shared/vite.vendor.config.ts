import { defineConfig } from 'vite';
import * as path from 'node:path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/vendor/lit.ts'),
            formats: ['es'],
            fileName: () => 'lit.js',
        },
        outDir: path.resolve(__dirname, '../../dist/runtime/vendor'),
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        rollupOptions: {
            output: {
                entryFileNames: 'lit.js',
            },
        },
    },
});