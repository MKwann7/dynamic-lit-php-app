import { defineConfig } from 'vite';
import * as path from 'node:path';

export default defineConfig({
    build: {
        outDir: path.resolve(__dirname, '../../dist/runtime'),
        emptyOutDir: false,
        lib: {
            entry: {
                'runtime-widget': path.resolve(__dirname, 'src/runtime-widget.ts'),
                'types': path.resolve(__dirname, 'src/types.ts'),
            },
            formats: ['es'],
        },
        rollupOptions: {
            external: ['lit', 'lit/decorators.js'],
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
        },
    },
});