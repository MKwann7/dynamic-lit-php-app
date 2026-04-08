// ============================================================
// content-builder-runtime.ts  (Phase 3)
// Shared lazy runtime manager for ContentBuilderEngine.
//
// Responsibilities:
//   - Load the engine module exactly once via dynamic import().
//   - Issue leases — one ContentBuilderEngine per lease ID.
//   - Release leases and destroy engines when consumers disconnect.
//   - Schedule idle disposal when all leases are gone (clears instance
//     memory; the browser module cache is unaffected by design).
//
// Usage pattern (from a Lit host):
//
//   const engine = await builderRuntime.acquireLease(this.leaseId, config);
//   engine.attach(canvasEl);
//   engine.load(pageDocument);
//   ...
//   builderRuntime.releaseLease(this.leaseId);
//
// ============================================================

import { ContentBuilderEngine, type EngineConfig } from './content-builder-engine';

// ------------------------------------------------------------------
// Lease record
// ------------------------------------------------------------------

interface LeaseRecord {
    id: string;
    engine: ContentBuilderEngine;
    acquiredAt: number;
}

// ------------------------------------------------------------------
// Runtime manager (singleton)
// ------------------------------------------------------------------

class ContentBuilderRuntimeManager {
    private static _instance: ContentBuilderRuntimeManager | null = null;

    /** True once the engine module has been resolved */
    private _moduleReady = false;

    /**
     * Deduplicates concurrent acquireLease() calls that race before the
     * module import resolves. Cleared once the import settles.
     */
    private _modulePromise: Promise<void> | null = null;

    /** Active lease registry */
    private _leases = new Map<string, LeaseRecord>();

    /** Timer handle for the idle-disposal window */
    private _idleTimer: ReturnType<typeof setTimeout> | null = null;

    /** How long (ms) to wait after all leases are gone before flushing state */
    private readonly IDLE_DISPOSE_DELAY_MS = 30_000;

    static getInstance(): ContentBuilderRuntimeManager {
        if (!ContentBuilderRuntimeManager._instance) {
            ContentBuilderRuntimeManager._instance = new ContentBuilderRuntimeManager();
        }
        return ContentBuilderRuntimeManager._instance;
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Acquire a lease and receive a new ContentBuilderEngine instance.
     *
     * The engine module is dynamically imported on first call and cached
     * for subsequent calls (no repeated network/parse cost).
     *
     * @param id      Unique identifier for this lease. Must match the id
     *                passed to releaseLease(). Use a stable host-scoped
     *                value (e.g., the custom element's id attribute or
     *                a UUID generated in connectedCallback).
     * @param config  Engine services, callbacks, and options.
     */
    async acquireLease(id: string, config: EngineConfig): Promise<ContentBuilderEngine> {
        if (this._leases.has(id)) {
            throw new Error(
                `ContentBuilderRuntime: lease "${id}" is already active. ` +
                `Call releaseLease() before re-acquiring.`,
            );
        }

        await this._ensureModuleLoaded();
        this._cancelIdleDisposal();

        const engine = new ContentBuilderEngine(config);
        this._leases.set(id, { id, engine, acquiredAt: Date.now() });

        return engine;
    }

    /**
     * Release a lease and destroy its engine instance.
     *
     * The engine's detach() + destroy() are called automatically.
     * If this was the last active lease, the idle disposal timer is started.
     */
    releaseLease(id: string): void {
        const record = this._leases.get(id);
        if (!record) {
            console.warn(`ContentBuilderRuntime: no active lease for id "${id}".`);
            return;
        }

        record.engine.destroy();
        this._leases.delete(id);

        if (this._leases.size === 0) {
            this._scheduleIdleDisposal();
        }
    }

    /**
     * Look up the engine for an active lease without releasing it.
     * Returns undefined if the lease is not active.
     */
    getEngine(id: string): ContentBuilderEngine | undefined {
        return this._leases.get(id)?.engine;
    }

    /** Number of currently active engine leases. */
    get activeLeaseCount(): number {
        return this._leases.size;
    }

    // ------------------------------------------------------------------
    // Private: module loading
    // ------------------------------------------------------------------

    /**
     * Ensure the engine module is loaded.
     *
     * Currently ContentBuilderEngine is imported statically at the top of
     * this file, so this is a deferred no-op. When the engine is moved to a
     * separate async chunk (code-split), replace _loadModule() with:
     *
     *   const mod = await import('./content-builder-engine');
     *   // ContentBuilderEngine available as mod.ContentBuilderEngine
     *
     * The _modulePromise guard prevents duplicate import() calls if multiple
     * acquireLease() callers race before the first import resolves.
     */
    private _ensureModuleLoaded(): Promise<void> {
        if (this._moduleReady) return Promise.resolve();
        if (!this._modulePromise) {
            this._modulePromise = this._loadModule();
        }
        return this._modulePromise;
    }

    private async _loadModule(): Promise<void> {
        // TODO: Replace with dynamic import for code-splitting:
        //   const _mod = await import('./content-builder-engine');
        // For now the static import at the top of this file covers it.
        this._moduleReady = true;
        this._modulePromise = null;
    }

    // ------------------------------------------------------------------
    // Private: idle disposal
    // ------------------------------------------------------------------

    private _scheduleIdleDisposal(): void {
        if (this._idleTimer !== null) return;
        this._idleTimer = setTimeout(() => this._flushIdleState(), this.IDLE_DISPOSE_DELAY_MS);
    }

    private _cancelIdleDisposal(): void {
        if (this._idleTimer !== null) {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
    }

    /**
     * Clear module-level cached state after the idle window expires.
     *
     * Note: the imported JS module itself stays in the browser's module registry
     * because there is no API to evict it. What we release here is the
     * runtime-level "module is loaded" flag so that re-acquiring a lease after
     * a long idle period re-evaluates any lazy-init module logic.
     *
     * Instance memory (engine objects, DOM refs, listeners) is already gone
     * because all leases were destroyed before this runs.
     */
    private _flushIdleState(): void {
        if (this._leases.size > 0) return; // safety guard
        this._moduleReady = false;
        this._idleTimer = null;
    }
}

// ------------------------------------------------------------------
// Exported singleton
// ------------------------------------------------------------------

/** The shared runtime manager. Import this wherever you need an engine lease. */
export const builderRuntime = ContentBuilderRuntimeManager.getInstance();

/** Exported for unit-testing the manager class directly. */
export { ContentBuilderRuntimeManager };

