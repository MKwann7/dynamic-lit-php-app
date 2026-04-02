import { defineConfig } from 'vite';
import * as path from 'node:path';
import { createRequire } from 'node:module';
const { version } = createRequire(import.meta.url)('./package.json');

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: () => 'index.js',
        },
        outDir: path.resolve(__dirname, `../../../../dist/widgets/account/dashboard/${version}`),
        emptyOutDir: true,
        rollupOptions: {
            external: [
                'lit',
                'lit/decorators.js',
                '@dynlit/shared/runtime-export'
            ],
        },
    },
});
