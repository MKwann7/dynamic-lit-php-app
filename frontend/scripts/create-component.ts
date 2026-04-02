import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface Args {
    location: string;
    uri: string;
    name: string;
    uuid: string;
    tag: string;
}

const WIDGETS_ROOT = path.resolve('packages/widgets');

function parseArgs(argv: string[]): Args {
    const result: Partial<Args> = {};

    for (const arg of argv) {
        const match = arg.match(/^--([^=]+)=(.*)$/);
        if (!match) {
            continue;
        }

        const [, key, value] = match;

        if (key === 'location') {
            result.location = value.trim();
        } else if (key === 'name') {
            result.name = value.trim();
        } else if (key === 'uuid') {
            result.uuid = value.trim().toLowerCase();
        } else if (key === 'tag') {
            result.tag = value.trim().toLowerCase();
        } else if (key === 'uri') {
            result.uri = value.trim().toLowerCase();
        }
    }

    if (!result.location || !result.name || !result.uuid || !result.tag || !result.uri) {
        throw new Error(
            'Usage: npm run create:component -- --location="account/account-dashboard" --name="AccountDashboard" --uuid="a-uuid" --tag="account-dash" --uri="account-dash"'
        );
    }

    return result as Args;
}

function uriPathFromUri(tag: string): string {
    if (!tag || tag === '') {
        return '';
    }
    return `/${tag}`;
}

function packageNameFromTag(tag: string): string {
    return `@dynlit/${tag}`;
}

function fullTagFromTag(tag: string): string {
    return `dynlit-${tag}`;
}

function componentJson(args: Args, fullName: string, uriPath: string, tagName: string, location: string): string {
    const cleanedLocation = normalizeLocation(location);
    return JSON.stringify(
        {
            id: args.uuid,
            name: fullName,
            tag: tagName,
            uri: uriPath,
            version: '1.0.0',
            framework: 'lit',
            entry: `/assets/widgets/${cleanedLocation}/1.0.0/index.js`,
            cssPath: `/assets/widgets/${cleanedLocation}/1.0.0/index.css`,
            integrity: null,
            renderMode: 'shadow',
            themeAware: true,
            exposeParts: [],
            exports: {
                define: 'defineWidget'
            },
            dependencies: [],
            isPublic: false
        },
        null,
        2
    ) + '\n';
}

function packageJson(tagFullName: string): string {
    return JSON.stringify(
        {
            name: tagFullName,
            version: '1.0.0',
            private: true,
            type: 'module',
            scripts: {
                build: 'vite build',
                dev: 'vite build --watch'
            },
            dependencies: {
                lit: '^3.2.0'
            }
        },
        null,
        2
    ) + '\n';
}

function tsconfigJson(location: string): string {
    const rootRelative = relativePathToFrontendRoot(location);

    return JSON.stringify(
        {
            extends: `${rootRelative}/tsconfig.base.json`,
            compilerOptions: {
                outDir: 'dist',
                rootDir: 'src',
                module: 'ESNext',
                target: 'ES2022',
                moduleResolution: 'Bundler',
                experimentalDecorators: true,
                useDefineForClassFields: false
            },
            include: ['src/**/*']
        },
        null,
        2
    ) + '\n';
}

function viteConfigTs(location: string): string {
    const cleanedLocation = normalizeLocation(location);
    const rootRelative = relativePathToFrontendRoot(location);

    return `import { defineConfig } from 'vite';
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
        outDir: path.resolve(__dirname, \`${rootRelative}/dist/widgets/${cleanedLocation}/\${version}\`),
        emptyOutDir: true,
        rollupOptions: {
            external: [
                'lit',
                'lit/decorators.js',
                '@dynlit/shared/runtime-export',
            ],
        },
    },
});
`;
}

function componentTs(name: string, tagFullName: string): string {
    const className = name.replace(/[^a-zA-Z0-9]/g, '');

    return `import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('${tagFullName}')
export class ${className} extends RuntimeWidgetElement {
    @property({ type: String })
    title = '${name}';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html\`
    <section>
        <h2>${name}</h2>
        <p>${name} widget loaded.</p>
      </section>\`;
    }
}
`;
}

function indexTs(name: string, tagName: string, tagFullName: string): string {
    const className = name.replace(/[^a-zA-Z0-9]/g, '');

    return `import { ${className} } from './${tagName}';

export async function defineWidget(): Promise<void> {
    if (!customElements.get('${tagFullName}')) {
        customElements.define('${tagFullName}', ${className});
    }
}
`;
}

async function ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
}

async function writeFileSafe(filePath: string, content: string): Promise<void> {
    try {
        await fs.access(filePath);
        throw new Error(`File already exists: ${filePath}`);
    } catch (error: any) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }

    await fs.writeFile(filePath, content, 'utf8');
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const fullName = "DynLit " + args.name;
    const tagName = args.tag;
    const tagFullName = fullTagFromTag(tagName);
    const packageFullName = packageNameFromTag(tagName);
    const uriPath = uriPathFromUri(args.uri);
    const componentDir = path.join(WIDGETS_ROOT, args.location);
    const srcDir = path.join(componentDir, 'src');

    await ensureDir(srcDir);

    await writeFileSafe(path.join(componentDir, 'component.json'), componentJson(args, fullName, uriPath, tagName, args.location));
    await writeFileSafe(path.join(componentDir, 'package.json'), packageJson(packageFullName));
    await writeFileSafe(path.join(componentDir, 'tsconfig.json'), tsconfigJson(args.location));
    await writeFileSafe(path.join(componentDir, 'vite.config.ts'), viteConfigTs(args.location));

    await writeFileSafe(path.join(srcDir, 'index.ts'), indexTs(fullName, tagName, tagFullName));
    await writeFileSafe(path.join(srcDir, tagName + '.ts'), componentTs(fullName, tagFullName));

    console.log(`Created component at: ${componentDir}`);
}

function normalizeLocation(location: string): string {
    return location.replace(/^\/+|\/+$/g, '');
}

function relativePathToFrontendRoot(location: string): string {
    const cleaned = normalizeLocation(location);
    const depth = cleaned.split('/').filter(Boolean).length;

    // component dir is frontend/packages/widgets/<location>
    // need relative path from component dir back to frontend root
    // so: depth for nested folders + 2 for packages/widgets
    return '../'.repeat(depth + 2).replace(/\/$/, '');
}

function widgetAssetPath(location: string, version = '1.0.0'): string {
    const cleaned = normalizeLocation(location);
    return `/assets/widgets/${cleaned}/${version}`;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});