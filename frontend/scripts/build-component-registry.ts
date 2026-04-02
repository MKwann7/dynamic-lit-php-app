import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface ComponentDependency {
    id: string;
    required?: boolean;
    type?: string;
    sortOrder?: number;
    mount_id?: string | null;
    path?: string | null;
}

interface ComponentSourceMeta {
    id: string;
    name: string;
    tag: string;
    uri?: string;
    version: string;
    framework: string;
    entry: string;
    cssPath: string | null;
    integrity: string | null;
    renderMode: string;
    themeAware: true;
    exposeParts: string[];
    exports: Record<string, string>;
    dependencies?: ComponentDependency[];
    isPublic?: boolean;
    /**
     * Human-readable label for this component's URL segment used by the
     * breadcrumb system.  Set on section-shell manifests only (e.g. "Users",
     * "Sites", "Home").  Leave absent on dashboard/list components — those
     * supply their own label at runtime via runtime.setBreadcrumbLabel().
     */
    breadcrumbLabel?: string | null;
}

interface RegistryComponent {
    id: string;
    name: string;
    tag: string;
    uri?: string;
    version: string;
    framework: string;
    entry: string;
    cssPath: string | null;
    integrity: string | null;
    renderMode: string;
    themeAware: true;
    exposeParts: string[];
    exports: Record<string, string>;
    dependencies: ComponentDependency[];
    isPublic?: boolean;
    breadcrumbLabel?: string | null;
}

interface ComponentRegistry {
    generatedAt: string;
    components: RegistryComponent[];
}

const WIDGETS_ROOT = path.resolve('packages/widgets');
const DIST_ROOT = path.resolve('dist');
const REGISTRY_OUTPUT = path.join(DIST_ROOT, 'component-registry.json');
const SQL_OUTPUT = path.resolve('../docker/database/init-scripts/initialize.99.LoadComponents.sql');

function normalizeUuid(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeTagName(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeRoute(value: string): string {
    const trimmed = value.trim();

    if (trimmed === '') {
        return '/';
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function findComponentJsonFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...await findComponentJsonFiles(fullPath));
            continue;
        }

        if (entry.isFile() && entry.name === 'component.json') {
            files.push(fullPath);
        }
    }

    return files;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
}

function validateComponentSourceMeta(meta: ComponentSourceMeta, filePath: string): void {
    const prefix = `Invalid component.json at ${filePath}`;

    assert(typeof meta.id === 'string' && meta.id.trim() !== '', `${prefix}: missing "id".`);
    assert(typeof meta.name === 'string' && meta.name.trim() !== '', `${prefix}: missing "name".`);
    assert(typeof meta.version === 'string' && meta.version.trim() !== '', `${prefix}: missing "version".`);
    assert(typeof meta.framework === 'string' && meta.framework.trim() !== '', `${prefix}: missing "framework".`);
    assert(typeof meta.tag === 'string' && meta.tag.trim() !== '', `${prefix}: missing "tag".`);
    assert(typeof meta.entry === 'string' && meta.entry.trim() !== '', `${prefix}: missing "entry".`);
    assert(meta.cssPath === null || typeof meta.cssPath === 'string', `${prefix}: invalid "cssPath".`);
    assert(meta.integrity === null || typeof meta.integrity === 'string', `${prefix}: invalid "integrity".`);

    assert(meta.renderMode === null || typeof meta.renderMode === 'string', `${prefix}: invalid "render_mode".`);
    assert(meta.exposeParts !== null && typeof meta.exposeParts === 'object', `${prefix}: invalid "expose_parts".`);

    assert(meta.exports !== null && typeof meta.exports === 'object', `${prefix}: invalid "exports".`);

    if (meta.dependencies !== undefined) {
        assert(Array.isArray(meta.dependencies), `${prefix}: "dependencies" must be an array.`);

        for (const [index, dependency] of Array.from(meta.dependencies.entries())) {
            const depPrefix = `${prefix}: dependency at index ${index}`;

            assert(dependency !== null && typeof dependency === 'object', `${depPrefix} is invalid.`);
            assert(typeof dependency.id === 'string' && dependency.id.trim() !== '', `${depPrefix} missing "id".`);
            assert(
                dependency.required === undefined || typeof dependency.required === 'boolean',
                `${depPrefix} invalid "required".`
            );
            assert(
                dependency.sortOrder === undefined || Number.isInteger(dependency.sortOrder),
                `${depPrefix} invalid "sortOrder".`
            );
            assert(
                dependency.mount_id === undefined || dependency.mount_id === null || typeof dependency.mount_id === 'string',
                `${depPrefix} invalid "mount_id".`
            );
            assert(
                dependency.path === undefined || dependency.path === null || typeof dependency.path === 'string',
                `${depPrefix} invalid "path".`
            );
        }
    }

    if (meta.isPublic !== undefined) {
        assert(typeof meta.isPublic === 'boolean', `${prefix}: invalid "isPublic".`);
    }
}

function validateRegistryUniqueness(components: RegistryComponent[]): void {
    const seenIds = new Map<string, string>();
    const seenSlugs = new Map<string, string>();
    const seenTagNames = new Map<string, string>();

    for (const component of components) {
        const id = normalizeUuid(component.id);
        const tag = normalizeTagName(component.tag);
        const uniqueName = normalizeTagName(component.name);

        if (seenIds.has(id)) {
            throw new Error(`Duplicate component UUID found: ${component.id} conflicts with ${seenIds.get(id)}.`);
        }
        seenIds.set(id, component.tag);

        if (seenSlugs.has(tag)) {
            throw new Error(`Duplicate component slug found: ${component.tag} conflicts with ${seenSlugs.get(tag)}.`);
        }
        seenSlugs.set(tag, component.id);

        if (seenTagNames.has(uniqueName)) {
            throw new Error(`Duplicate component tagName found: ${component.name} conflicts with ${seenTagNames.get(uniqueName)}.`);
        }
        seenTagNames.set(uniqueName, component.id);
    }
}

function validateDependencyTargets(components: RegistryComponent[]): void {
    const componentIds = new Set(
        components.map((component) => normalizeUuid(component.id))
    );

    for (const component of components) {
        const ownId = normalizeUuid(component.id);

        for (const dependency of component.dependencies) {
            const depId = normalizeUuid(dependency.id);

            if (!componentIds.has(depId)) {
                throw new Error(
                    `Component ${component.name} (${component.id}) depends on missing component UUID ${dependency.id}.`
                );
            }

            if (depId === ownId) {
                throw new Error(
                    `Component ${component.name} (${component.id}) cannot depend on itself.`
                );
            }
        }
    }
}

function detectCircularDependencies(components: RegistryComponent[]): void {
    const graph = new Map<string, string[]>();

    for (const component of components) {
        graph.set(
            normalizeUuid(component.id),
            component.dependencies.map((dependency) => normalizeUuid(dependency.id))
        );
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];

    const dfs = (node: string): void => {
        if (visited.has(node)) {
            return;
        }

        if (visiting.has(node)) {
            const cycleStart = stack.indexOf(node);
            const cyclePath = [...stack.slice(cycleStart), node];
            throw new Error(`Circular dependency detected during registry build: ${cyclePath.join(' -> ')}`);
        }

        visiting.add(node);
        stack.push(node);

        const neighbors = graph.get(node) ?? [];
        for (const neighbor of neighbors) {
            dfs(neighbor);
        }

        stack.pop();
        visiting.delete(node);
        visited.add(node);
    };

    for (const node of Array.from(graph.keys())) {
        dfs(node);
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function toDistDiskPath(assetPath: string): string {
    const normalized = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
    return path.join(DIST_ROOT, normalized.replace(/^assets\//, ''));
}

async function validateBuiltAssets(meta: ComponentSourceMeta, filePath: string): Promise<void> {
    const entryDiskPath = toDistDiskPath(meta.entry);
    const hasEntry = await fileExists(entryDiskPath);

    assert(
        hasEntry,
        `Built entry asset missing for ${meta.tag}@${meta.version} referenced in ${filePath}: ${entryDiskPath}`
    );

    // CSS is optional — warn if declared but missing so the developer knows to build it,
    // but don't fail. toRegistryComponent will null it out so it never reaches the DB.
    if (meta.cssPath) {
        const cssDiskPath = toDistDiskPath(meta.cssPath);
        const hasCss = await fileExists(cssDiskPath);
        if (!hasCss) {
            console.warn(
                `[warn] CSS asset missing for ${meta.tag}@${meta.version} — ` +
                `cssPath will be set to null in the registry. ` +
                `Expected: ${cssDiskPath}`
            );
        }
    }
}

async function resolveCssPath(meta: ComponentSourceMeta): Promise<string | null> {
    if (!meta.cssPath) return null;
    const cssDiskPath = toDistDiskPath(meta.cssPath);
    const exists = await fileExists(cssDiskPath);
    return exists ? meta.cssPath.trim() : null;
}

async function toRegistryComponent(meta: ComponentSourceMeta): Promise<RegistryComponent> {
    const cssPath = await resolveCssPath(meta);

    return {
        id: normalizeUuid(meta.id),
        name: meta.name.trim(),
        tag: normalizeTagName(meta.tag),
        version: meta.version.trim(),
        framework: meta.framework.trim(),
        entry: meta.entry.trim(),
        cssPath,                          // null when file is missing on disk
        integrity: meta.integrity ? meta.integrity.trim() : null,
        renderMode: meta.renderMode,
        themeAware: meta.themeAware,
        exposeParts: meta.exposeParts,
        exports: meta.exports,
        dependencies: (meta.dependencies ?? []).map((dependency) => ({
            id: normalizeUuid(dependency.id),
            required: dependency.required ?? true,
            type: dependency.type ?? 'inline',
            sortOrder: dependency.sortOrder ?? 0,
            mount_id: dependency.mount_id ?? null,
            path: dependency.path ?? null,
        })),
        uri: meta.uri ? normalizeRoute(meta.uri) : undefined,
        isPublic: meta.isPublic ?? false,
        breadcrumbLabel: meta.breadcrumbLabel ?? null,
    };
}

function sqlString(value: string | null): string {
    if (typeof value === "undefined" || value === null) {

        return 'NULL';
    }

    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function generateElName(value: string | null): string {
    return `dynlit-${value}`;
}


function buildComponentsSql(registry: ComponentRegistry): string {
    const lines: string[] = [];

    lines.push('-- Auto-generated by build-component-registry.ts');
    lines.push(`-- Generated at: ${registry.generatedAt}`);
    lines.push('SET FOREIGN_KEY_CHECKS=0;');
    lines.push('');
    lines.push('USE `dynlit_components`;');
    lines.push('');

    for (const component of registry.components) {
        lines.push(`-- ${component.uri}@${component.version}`);
        lines.push(`
INSERT INTO component (
    name,
    tag,
    el_name,
    uri,
    framework,
    public_id,
    created_at,
    updated_at
) VALUES (
    ${sqlString(component.name)},
    ${sqlString(component.tag)},
    ${sqlString(generateElName(component.tag))},
    ${sqlString(component.uri)},
    ${sqlString(component.framework)},
    UUID_TO_BIN(${sqlString(component.id)}),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    tag = VALUES(tag),
    el_name = VALUES(el_name),
    uri = VALUES(uri),
    framework = VALUES(framework),
    updated_at = CURRENT_TIMESTAMP;
`.trim());
        lines.push('');
    }

    for (const component of registry.components) {
        const exportsJson = JSON.stringify(component.exports).replace(/'/g, "\\'");
        const exposeParts = JSON.stringify(component.exposeParts).replace(/'/g, "\\'");
        const manifestJson = JSON.stringify({
            id: component.id,
            name: component.name,
            tag: component.tag,
            uri: component.uri,
            version: component.version,
            framework: component.framework,
            entry: component.entry,
            cssPath: component.cssPath,
            integrity: component.integrity,
            renderMode: component.renderMode,
            themeAware: component.themeAware,
            exposeParts: component.exposeParts,
            dependencies: component.dependencies,
            exports: component.exports,
            breadcrumbLabel: component.breadcrumbLabel ?? null,
        }).replace(/'/g, "\\'");

        lines.push(`
INSERT INTO component_version (
    component_id,
    version,
    entry_path,
    css_path,
    integrity,
    render_mode,
    theme_aware,
    expose_parts,
    breadcrumb_label,
    exports_json,
    manifest_json,
    status,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM component WHERE public_id = UUID_TO_BIN(${sqlString(component.id)}) LIMIT 1),
    ${sqlString(component.version)},
    ${sqlString(component.entry)},
    ${sqlString(component.cssPath)},
    ${sqlString(component.integrity)},
    ${sqlString(component.renderMode)},
    ${component.themeAware},
    CAST(${sqlString(exposeParts)} AS JSON),
    ${sqlString(component.breadcrumbLabel ?? null)},
    CAST(${sqlString(exportsJson)} AS JSON),
    CAST(${sqlString(manifestJson)} AS JSON),
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
    entry_path       = VALUES(entry_path),
    css_path         = VALUES(css_path),
    integrity        = VALUES(integrity),
    render_mode      = VALUES(render_mode),
    theme_aware      = VALUES(theme_aware),
    expose_parts     = VALUES(expose_parts),
    breadcrumb_label = VALUES(breadcrumb_label),
    exports_json     = VALUES(exports_json),
    manifest_json    = VALUES(manifest_json),
    status           = 'active',
    updated_at       = CURRENT_TIMESTAMP;
`.trim());
        lines.push('');
    }

    lines.push('-- Rebuild dependency rows for active versions');
    for (const component of registry.components) {
        lines.push(`
DELETE cd
FROM component_dependency cd
INNER JOIN component_version cv ON cv.id = cd.component_version_id
INNER JOIN component c ON c.id = cv.component_id
WHERE c.public_id = UUID_TO_BIN(${sqlString(component.id)})
  AND cv.version = ${sqlString(component.version)};
`.trim());
        lines.push('');

        const sortedDependencies = [...component.dependencies].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

        for (const dependency of sortedDependencies) {
            lines.push(`
INSERT INTO component_dependency (
    component_version_id,
    dependency_component_id,
    required,
    type,
    sort_order,
    mount_id,
    path,
    created_at,
    updated_at
) VALUES (
    (
        SELECT cv.id
        FROM component_version cv
        INNER JOIN component c ON c.id = cv.component_id
        WHERE c.public_id = UUID_TO_BIN(${sqlString(component.id)})
          AND cv.version = ${sqlString(component.version)}
        LIMIT 1
    ),
    (
        SELECT id
        FROM component
        WHERE public_id = UUID_TO_BIN(${sqlString(dependency.id)})
        LIMIT 1
    ),
    ${(dependency.required ?? true) ? 1 : 0},
    ${sqlString(dependency.type ?? 'inline')},
    ${dependency.sortOrder ?? 0},
    ${sqlString(dependency.mount_id ?? null)},
    ${sqlString(dependency.path ?? null)},
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
`.trim());
            lines.push('');
        }
    }

    lines.push('-- Upsert routes');
    for (const component of registry.components) {
        if (!component.uri) {
            continue;
        }

        lines.push(`
INSERT INTO component_route (
    uri,
    component_id,
    is_public,
    created_at,
    updated_at
) VALUES (
    ${sqlString(component.uri)},
    (SELECT id FROM component WHERE public_id = UUID_TO_BIN(${sqlString(component.id)}) LIMIT 1),
    ${component.isPublic ? 1 : 0},
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON DUPLICATE KEY UPDATE
    component_id = VALUES(component_id),
    is_public = VALUES(is_public),
    updated_at = CURRENT_TIMESTAMP;
`.trim());
        lines.push('');
    }

    lines.push('-- Activate latest declared versions');
    for (const component of registry.components) {
        lines.push(`
UPDATE component
SET active_version_id = (
    SELECT cv.id
    FROM component_version cv
    WHERE cv.component_id = component.id
      AND cv.version = ${sqlString(component.version)}
    LIMIT 1
),
updated_at = CURRENT_TIMESTAMP
WHERE public_id = UUID_TO_BIN(${sqlString(component.id)});
`.trim());
        lines.push('');
    }

    lines.push('SET FOREIGN_KEY_CHECKS=1;');
    lines.push('');

    return lines.join('\n');
}

async function main(): Promise<void> {
    const componentJsonFiles = await findComponentJsonFiles(WIDGETS_ROOT);

    assert(componentJsonFiles.length > 0, `No component.json files found under ${WIDGETS_ROOT}.`);

    const components: RegistryComponent[] = [];

    for (const filePath of componentJsonFiles) {
        const meta = await readJsonFile<ComponentSourceMeta>(filePath);

        validateComponentSourceMeta(meta, filePath);
        await validateBuiltAssets(meta, filePath);

        const newComponent = await toRegistryComponent(meta);
        if (components.some(c => normalizeUuid(c.id) === normalizeUuid(newComponent.id))) {
            console.warn(`[warn] Skipping duplicate component ID ${newComponent.id} found at ${filePath}.`);
            continue;
        }

        components.push(newComponent);
    }

    validateRegistryUniqueness(components);
    validateDependencyTargets(components);
    detectCircularDependencies(components);

    const registry: ComponentRegistry = {
        generatedAt: new Date().toISOString(),
        components,
    };

    await fs.mkdir(DIST_ROOT, { recursive: true });

    await fs.writeFile(REGISTRY_OUTPUT, JSON.stringify(registry, null, 2), 'utf8');
    console.log(
        `[build-component-registry] Wrote registry with ${components.length} component(s) → ${REGISTRY_OUTPUT}`
    );

    const sql = buildComponentsSql(registry);
    await fs.writeFile(SQL_OUTPUT, sql, 'utf8');
    console.log(`[build-component-registry] Wrote SQL → ${SQL_OUTPUT}`);
}

main().catch((error: unknown) => {
    console.error('[build-component-registry] Fatal error:', error);
    process.exit(1);
});
