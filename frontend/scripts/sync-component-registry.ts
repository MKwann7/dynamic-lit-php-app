import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({
    path: '../docker/env/app-local.env',
});

interface ComponentDependency {
    id: string;
    required?: boolean;
    type?: string;
    sortOrder?: number;
    mount_id?: string | null;
    path?: string | null;
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
    themeAware: boolean;
    exposeParts: string[];
    exports: Record<string, string>;
    dependencies: ComponentDependency[];
    isPublic?: boolean;
    /**
     * Human-readable label for this component's URL segment used by the
     * breadcrumb system.  Set on section-shell manifests only.
     */
    breadcrumbLabel?: string | null;
}

interface ComponentRegistry {
    generatedAt: string;
    components: RegistryComponent[];
}

interface SyncedComponentRef {
    publicId: string;
    componentId: number;
    componentVersionId: number;
    component: RegistryComponent;
}

const REGISTRY_PATH = path.resolve('dist/component-registry.json');

function normalizeUuid(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeTag(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeRoute(value: string): string {
    const trimmed = value.trim();

    if (trimmed === '') {
        return '/';
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function generateElName(tag: string): string {
    return `maxr-${normalizeTag(tag)}`;
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function loadRegistry(): Promise<ComponentRegistry> {
    const raw = await fs.readFile(REGISTRY_PATH, 'utf8');
    return JSON.parse(raw) as ComponentRegistry;
}

function buildManifest(component: RegistryComponent): Record<string, unknown> {
    return {
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
        dependencies: component.dependencies.map((dependency) => ({
            id: dependency.id,
            required: dependency.required ?? true,
            type: dependency.type ?? 'inline',
            sortOrder: dependency.sortOrder ?? 0,
            mount_id: dependency.mount_id ?? null,
            path: dependency.path ?? null,
        })),
        exports: component.exports,
        breadcrumbLabel: component.breadcrumbLabel ?? null,
    };
}

function validateRegistryShape(registry: ComponentRegistry): void {
    assert(
        registry !== null && typeof registry === 'object',
        'Registry file is invalid: expected an object.'
    );

    assert(
        Array.isArray(registry.components),
        'Registry file is invalid: expected "components" to be an array.'
    );

    for (const [index, component] of Array.from(registry.components.entries())) {
        const prefix = `Registry component at index ${index}`;

        assert(typeof component.id === 'string' && component.id.trim() !== '', `${prefix} is missing "id".`);
        assert(typeof component.name === 'string' && component.name.trim() !== '', `${prefix} is missing "name".`);
        assert(typeof component.tag === 'string' && component.tag.trim() !== '', `${prefix} is missing "tag".`);
        assert(typeof component.version === 'string' && component.version.trim() !== '', `${prefix} is missing "version".`);
        assert(typeof component.framework === 'string' && component.framework.trim() !== '', `${prefix} is missing "framework".`);
        assert(typeof component.entry === 'string' && component.entry.trim() !== '', `${prefix} is missing "entry".`);
        assert(component.cssPath === null || typeof component.cssPath === 'string', `${prefix} has invalid "cssPath".`);
        assert(component.integrity === null || typeof component.integrity === 'string', `${prefix} has invalid "integrity".`);
        assert(typeof component.renderMode === 'string' && component.renderMode.trim() !== '', `${prefix} has invalid "renderMode".`);
        assert(typeof component.themeAware === 'boolean', `${prefix} has invalid "themeAware".`);
        assert(Array.isArray(component.exposeParts), `${prefix} has invalid "exposeParts".`);
        assert(component.exports !== null && typeof component.exports === 'object', `${prefix} has invalid "exports".`);
        assert(Array.isArray(component.dependencies), `${prefix} has invalid "dependencies".`);

        for (const [partIndex, part] of Array.from(component.exposeParts.entries())) {
            assert(
                typeof part === 'string',
                `${prefix} exposeParts entry at index ${partIndex} must be a string.`
            );
        }

        for (const [depIndex, dep] of Array.from(component.dependencies.entries())) {
            const depPrefix = `${prefix} dependency at index ${depIndex}`;

            assert(dep !== null && typeof dep === 'object', `${depPrefix} is invalid.`);
            assert(typeof dep.id === 'string' && dep.id.trim() !== '', `${depPrefix} is missing "id".`);
            assert(dep.required === undefined || typeof dep.required === 'boolean', `${depPrefix} has invalid "required".`);
            assert(dep.sortOrder === undefined || Number.isInteger(dep.sortOrder), `${depPrefix} has invalid "sortOrder".`);
            assert(
                dep.mount_id === undefined || dep.mount_id === null || typeof dep.mount_id === 'string',
                `${depPrefix} has invalid "mount_id".`
            );
            assert(
                dep.path === undefined || dep.path === null || typeof dep.path === 'string',
                `${depPrefix} has invalid "path".`
            );
        }

        if (component.uri !== undefined) {
            assert(typeof component.uri === 'string', `${prefix} has invalid "uri".`);
        }

        if (component.isPublic !== undefined) {
            assert(typeof component.isPublic === 'boolean', `${prefix} has invalid "isPublic".`);
        }
    }
}

function validateUniqueness(registry: ComponentRegistry): void {
    const seenIds = new Map<string, string>();
    const seenTags = new Map<string, string>();
    const seenNames = new Map<string, string>();

    for (const component of registry.components) {
        const id = normalizeUuid(component.id);
        const tag = normalizeTag(component.tag);
        const name = component.name.trim().toLowerCase();

        if (seenIds.has(id)) {
            throw new Error(`Duplicate component UUID found: ${component.id} conflicts with ${seenIds.get(id)}.`);
        }
        seenIds.set(id, component.tag);

        if (seenTags.has(tag)) {
            throw new Error(`Duplicate component tag found: ${component.tag} conflicts with ${seenTags.get(tag)}.`);
        }
        seenTags.set(tag, component.id);

        if (seenNames.has(name)) {
            throw new Error(`Duplicate component name found: ${component.name} conflicts with ${seenNames.get(name)}.`);
        }
        seenNames.set(name, component.id);
    }
}

function validateDependencyTargets(registry: ComponentRegistry): void {
    const componentIds = new Set(
        registry.components.map((component) => normalizeUuid(component.id))
    );

    for (const component of registry.components) {
        const componentId = normalizeUuid(component.id);

        for (const dependency of component.dependencies) {
            const dependencyId = normalizeUuid(dependency.id);

            if (!componentIds.has(dependencyId)) {
                throw new Error(
                    `Component ${component.name} (${component.id}) depends on missing component UUID ${dependency.id}.`
                );
            }

            if (dependencyId === componentId) {
                throw new Error(
                    `Component ${component.name} (${component.id}) cannot depend on itself.`
                );
            }
        }
    }
}

function detectCircularDependencies(registry: ComponentRegistry): void {
    const graph = new Map<string, string[]>();

    for (const component of registry.components) {
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
            throw new Error(`Circular dependency detected: ${cyclePath.join(' -> ')}`);
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

function validateRegistry(registry: ComponentRegistry): void {
    validateRegistryShape(registry);
    validateUniqueness(registry);
    validateDependencyTargets(registry);
    detectCircularDependencies(registry);
}

async function getComponentIdByPublicId(
    conn: mysql.Connection,
    publicId: string
): Promise<number | null> {
    const [rows] = await conn.query<any[]>(
        `
            SELECT id
            FROM component
            WHERE public_id = UUID_TO_BIN(?)
                LIMIT 1
        `,
        [publicId]
    );

    if (rows.length === 0) {
        return null;
    }

    return Number(rows[0].id);
}

async function upsertComponent(
    conn: mysql.Connection,
    component: RegistryComponent
): Promise<number> {
    const existingId = await getComponentIdByPublicId(conn, component.id);
    const normalizedTag = normalizeTag(component.tag);
    const normalizedUri = component.uri ? normalizeRoute(component.uri) : null;
    const elName = generateElName(normalizedTag);

    if (existingId !== null) {
        await conn.query(
            `
            UPDATE component
            SET
                name = ?,
                tag = ?,
                el_name = ?,
                uri = ?,
                framework = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                component.name,
                normalizedTag,
                elName,
                normalizedUri,
                component.framework,
                existingId,
            ]
        );

        return existingId;
    }

    const [result] = await conn.query<mysql.ResultSetHeader>(
        `
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
            ?, ?, ?, ?, ?, UUID_TO_BIN(?), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        `,
        [
            component.name,
            normalizedTag,
            elName,
            normalizedUri,
            component.framework,
            component.id,
        ]
    );

    return Number(result.insertId);
}

async function getComponentVersionId(
    conn: mysql.Connection,
    componentId: number,
    version: string
): Promise<number | null> {
    const [rows] = await conn.query<any[]>(
        `
            SELECT id
            FROM component_version
            WHERE component_id = ? AND version = ?
                LIMIT 1
        `,
        [componentId, version]
    );

    if (rows.length === 0) {
        return null;
    }

    return Number(rows[0].id);
}

async function upsertComponentVersion(
    conn: mysql.Connection,
    componentId: number,
    component: RegistryComponent
): Promise<number> {
    const existingVersionId = await getComponentVersionId(conn, componentId, component.version);

    const exportsJson = JSON.stringify(component.exports);
    const exposePartsJson = JSON.stringify(component.exposeParts);
    const manifestJson = JSON.stringify(buildManifest(component));

    if (existingVersionId !== null) {
        await conn.query(
            `
                UPDATE component_version
                SET
                    entry_path       = ?,
                    css_path         = ?,
                    integrity        = ?,
                    render_mode      = ?,
                    theme_aware      = ?,
                    expose_parts     = CAST(? AS JSON),
                    breadcrumb_label = ?,
                    exports_json     = CAST(? AS JSON),
                    manifest_json    = CAST(? AS JSON),
                    status           = 'active',
                    updated_at       = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            [
                component.entry,
                component.cssPath,
                component.integrity,
                component.renderMode,
                component.themeAware ? 1 : 0,
                exposePartsJson,
                component.breadcrumbLabel ?? null,
                exportsJson,
                manifestJson,
                existingVersionId,
            ]
        );

        return existingVersionId;
    }

    const [result] = await conn.query<mysql.ResultSetHeader>(
        `
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
                         ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, CAST(? AS JSON), CAST(? AS JSON), 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                     )
        `,
        [
            componentId,
            component.version,
            component.entry,
            component.cssPath,
            component.integrity,
            component.renderMode,
            component.themeAware ? 1 : 0,
            exposePartsJson,
            component.breadcrumbLabel ?? null,
            exportsJson,
            manifestJson,
        ]
    );

    return Number(result.insertId);
}

async function deleteDependenciesForVersion(
    conn: mysql.Connection,
    componentVersionId: number
): Promise<void> {
    await conn.query(
        `
            DELETE FROM component_dependency
            WHERE component_version_id = ?
        `,
        [componentVersionId]
    );
}

async function insertDependency(
    conn: mysql.Connection,
    componentVersionId: number,
    dependencyComponentId: number,
    required: boolean,
    type: string,
    sortOrder: number,
    mountId: string | null,
    path: string | null
): Promise<void> {
    await conn.query(
        `
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
            componentVersionId,
            dependencyComponentId,
            required ? 1 : 0,
            type,
            sortOrder,
            mountId,
            path,
        ]
    );
}

async function syncDependenciesForComponent(
    conn: mysql.Connection,
    ref: SyncedComponentRef,
    componentIdByPublicId: Map<string, number>
): Promise<void> {
    await deleteDependenciesForVersion(conn, ref.componentVersionId);

    const sortedDependencies = [...ref.component.dependencies].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

    for (const dependency of sortedDependencies) {
        const normalizedDependencyId = normalizeUuid(dependency.id);
        const dependencyComponentId = componentIdByPublicId.get(normalizedDependencyId);

        if (!dependencyComponentId) {
            throw new Error(
                `Unable to resolve dependency component ID for ${dependency.id} while syncing ${ref.component.name}.`
            );
        }

        await insertDependency(
            conn,
            ref.componentVersionId,
            dependencyComponentId,
            dependency.required ?? true,
            dependency.type ?? 'inline',
            dependency.sortOrder ?? 0,
            dependency.mount_id ?? null,
            dependency.path ?? null
        );
    }
}

async function syncRouteForComponent(
    conn: mysql.Connection,
    componentId: number,
    component: RegistryComponent
): Promise<void> {
    if (!component.uri || component.uri.trim() === '') {
        return;
    }

    const normalizedRoute = normalizeRoute(component.uri);

    await conn.query(
        `
            INSERT INTO component_route (
                uri,
                component_id,
                is_public,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                                     component_id = VALUES(component_id),
                                     is_public = VALUES(is_public),
                                     updated_at = CURRENT_TIMESTAMP
        `,
        [
            normalizedRoute,
            componentId,
            (component.isPublic ?? false) ? 1 : 0,
        ]
    );
}

async function activateComponentVersion(
    conn: mysql.Connection,
    componentId: number,
    componentVersionId: number
): Promise<void> {
    await conn.query(
        `
            UPDATE component
            SET
                active_version_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
        [componentVersionId, componentId]
    );
}

// ── DB connection with retry ──────────────────────────────────────────────────

const TRANSIENT_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST']);

async function createConnectionWithRetry(
    config: mysql.ConnectionOptions,
    maxWaitMs = 30_000,
    retryIntervalMs = 2_000,
): Promise<mysql.Connection> {
    const deadline = Date.now() + maxWaitMs;
    let lastError: unknown;
    let firstAttempt = true;

    while (Date.now() < deadline) {
        try {
            return await mysql.createConnection(config);
        } catch (err: unknown) {
            lastError = err;
            const code = (err as NodeJS.ErrnoException).code ?? '';

            if (!TRANSIENT_CODES.has(code)) {
                // Non-connectivity error (e.g. bad credentials) — fail immediately.
                throw err;
            }

            if (firstAttempt) {
                firstAttempt = false;
                console.warn(
                    `\n⚠️  Cannot reach database at ${config.host}:${config.port} (${code}).` +
                    `\n   Make sure the Docker containers are running: make run` +
                    `\n   Retrying for up to ${maxWaitMs / 1000}s...\n`,
                );
            }

            const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
            process.stdout.write(`   Waiting for database... ${remaining}s remaining\r`);
            await new Promise<void>((r) => setTimeout(r, retryIntervalMs));
        }
    }

    console.error(`\n❌  Database still unreachable after ${maxWaitMs / 1000}s.`);
    console.error(`   Host: ${config.host}:${config.port}`);
    console.error(`   Run 'make run' to start the Docker stack first.\n`);
    throw lastError;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const registry = await loadRegistry();

    console.log(`Loaded registry from ${REGISTRY_PATH}`);
    console.log(`Generated at: ${registry.generatedAt}`);
    console.log(`Component count: ${registry.components.length}`);

    validateRegistry(registry);

    console.log('Registry validation passed.');

    const dbConfig: mysql.ConnectionOptions = {
        host: process.env.DB_HOST_EXTERNAL,
        port: Number(process.env.DB_PORT_EXTERNAL ?? 3306),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE ?? 'maxr_components',
        multipleStatements: false,
        connectTimeout: 5_000,
    };

    const conn = await createConnectionWithRetry(dbConfig);

    try {
        await conn.beginTransaction();

        const syncedRefs: SyncedComponentRef[] = [];
        const componentIdByPublicId = new Map<string, number>();

        for (const component of registry.components) {
            const componentId = await upsertComponent(conn, component);
            const componentVersionId = await upsertComponentVersion(conn, componentId, component);
            const normalizedPublicId = normalizeUuid(component.id);

            componentIdByPublicId.set(normalizedPublicId, componentId);

            syncedRefs.push({
                publicId: normalizedPublicId,
                componentId,
                componentVersionId,
                component,
            });

            console.log(`Prepared ${component.tag}@${component.version}`);
        }

        for (const ref of syncedRefs) {
            await syncDependenciesForComponent(conn, ref, componentIdByPublicId);
            await syncRouteForComponent(conn, ref.componentId, ref.component);
            await activateComponentVersion(conn, ref.componentId, ref.componentVersionId);

            console.log(`Synced ${ref.component.tag}@${ref.component.version}`);
        }

        await conn.commit();
        console.log('Component registry sync complete.');
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        await conn.end();
    }
}

main().catch((error) => {
    console.error('Component registry sync failed.');
    console.error(error);
    process.exit(1);
});

