// ============================================================
// content-builder-engine.ts  (Phase 2)
// Core editor engine — plain TypeScript, zero Lit dependency.
//
// Lifecycle state machine:
//   idle ──attach()──► attached ──load()──► loaded ◄──resume()────┐
//                          │                   │                  │
//                          │               suspend()              │
//                          │                   ↓                  │
//                          │              suspended ──────────────┘
//                          │                   │
//                          └────detach()───────┘
//                                   ↓
//                               detached ──destroy()──► destroyed
//
// Key invariants:
//   - No Lit dependency.
//   - Canvas is passed at attach(), not construction time.
//   - serialize() reads DOM only for 'rich-text' native blocks.
//   - Managed component blocks are NEVER serialized from raw DOM innerHTML.
//   - destroy() is idempotent.
// ============================================================

import type {
    PageDocument, AnyBlock, NativeContentBlock, NativeLayoutBlock, ColumnBlock,
    ComponentInstanceRecord,
} from './page-document-model';
import { DomUtils } from './dom-utils';

// ------------------------------------------------------------------
// Sub-service interfaces (thin contracts; implementations extracted later)
// ------------------------------------------------------------------

/** Tracks text/element selection within the editor canvas.
 *  Migration source: ContentBuilderHelpers.saveSelection / restoreSelection */
export interface SelectionManager {
    attach(canvas: HTMLElement): void;
    detach(): void;
    saveSelection(): Range[] | null;
    restoreSelection(): void;
    clearSelection(): void;
}

/** Manages overlay UI: row/column handles, resize grips.
 *  Migration source: ContentBuilderHelpers overlay + control logic */
export interface OverlayManager {
    attach(canvas: HTMLElement, uiRoot: HTMLElement): void;
    detach(): void;
    refresh(): void;
    hide(): void;
}

/** Manages the floating toolbar and contextual state.
 *  Migration source: ContentBuilderHelpers toolbar-related logic */
export interface ToolbarManager {
    attach(uiRoot: HTMLElement): void;
    detach(): void;
    show(context: ToolbarContext): void;
    hide(): void;
}

export interface ToolbarContext {
    blockUuid: string;
    blockKind: AnyBlock['kind'];
    targetElement: HTMLElement;
}

/** Renders a PageDocument into the canvas DOM and collects changes back.
 *  TODO: Extract from ContentBuilderHelpers.addContent / fixLayout / addSnippet */
export interface CanvasRenderer {
    attach(canvas: HTMLElement): void;
    detach(): void;
    render(doc: PageDocument): void;
    collectBlocks(doc: PageDocument): AnyBlock[];
}

// ------------------------------------------------------------------
// Engine configuration
// ------------------------------------------------------------------

export interface EngineServices {
    dom: DomUtils;
    selectionManager?: SelectionManager;
    overlayManager?: OverlayManager;
    toolbarManager?: ToolbarManager;
    canvasRenderer?: CanvasRenderer;
}

export interface EngineCallbacks {
    onChange?: (doc: PageDocument) => void;
    onLoad?: (doc: PageDocument) => void;
    onError?: (error: Error) => void;
    /** Called when user clicks a managed component block */
    onComponentActivate?: (blockUuid: string, componentTypeId: string) => void;
    onComponentDeactivate?: (blockUuid: string) => void;
}

export interface EngineOptions {
    maxColumns: 1 | 2 | 3 | 4;
    enableManagedComponents: boolean;
    enableUndoRedo: boolean;
    undoSnapshots: number;
}

const DEFAULT_OPTIONS: Readonly<EngineOptions> = {
    maxColumns: 4,
    enableManagedComponents: true,
    enableUndoRedo: true,
    undoSnapshots: 30,
};

export interface EngineConfig {
    services: EngineServices;
    callbacks: EngineCallbacks;
    options?: Partial<EngineOptions>;
}

// ------------------------------------------------------------------
// Lifecycle states
// ------------------------------------------------------------------

export type EngineState =
    | 'idle'       // constructed, not attached
    | 'attached'   // canvas bound, document not yet loaded
    | 'loaded'     // document rendered, editing active
    | 'suspended'  // paused (screen hidden), state retained
    | 'detached'   // removed from DOM, state retained
    | 'destroyed'; // fully disposed

// Internal listener tracking
interface BoundListener {
    target: EventTarget;
    type: string;
    handler: EventListener;
}

// ------------------------------------------------------------------
// ContentBuilderEngine
// ------------------------------------------------------------------

export class ContentBuilderEngine {
    private _state: EngineState = 'idle';
    private _canvas: HTMLElement | null = null;
    private _uiRoot: HTMLElement | null = null;
    private _document: PageDocument | null = null;
    private _listeners: BoundListener[] = [];

    private readonly _opts: Readonly<EngineOptions>;
    private readonly _dom: DomUtils;
    private readonly _selection: SelectionManager | null;
    private readonly _overlay: OverlayManager | null;
    private readonly _toolbar: ToolbarManager | null;
    private readonly _renderer: CanvasRenderer | null;

    constructor(private readonly config: EngineConfig) {
        this._opts = { ...DEFAULT_OPTIONS, ...(config.options ?? {}) };
        this._dom = config.services.dom;
        this._selection = config.services.selectionManager ?? null;
        this._overlay = config.services.overlayManager ?? null;
        this._toolbar = config.services.toolbarManager ?? null;
        this._renderer = config.services.canvasRenderer ?? null;
    }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    /**
     * Bind the engine to a canvas DOM element.
     * @param canvas  The editable content area. The engine owns this subtree.
     * @param uiRoot  Optional separate root for overlays/toolbar UI.
     *                Defaults to canvas if omitted.
     */
    attach(canvas: HTMLElement, uiRoot?: HTMLElement): void {
        this._assertState('attach', 'idle', 'detached');
        this._canvas = canvas;
        this._uiRoot = uiRoot ?? canvas;
        this._state = 'attached';

        this._selection?.attach(canvas);
        this._overlay?.attach(canvas, this._uiRoot);
        this._toolbar?.attach(this._uiRoot);
        this._renderer?.attach(canvas);
        this._bindCanvasEvents();
    }

    /**
     * Load a PageDocument and render it into the canvas.
     * Must be called after attach().
     */
    load(doc: PageDocument): void {
        this._assertState('load', 'attached');
        this._document = this._cloneDoc(doc);
        this._state = 'loaded';

        this._renderer?.render(this._document);
        this.config.callbacks.onLoad?.(this._document);
    }

    /**
     * Suspend the editor — hide UI controls without destroying state.
     * Safe to call when the host screen is hidden.
     */
    suspend(): void {
        if (this._state !== 'loaded') return;
        this._state = 'suspended';
        this._overlay?.hide();
        this._toolbar?.hide();
        this._selection?.clearSelection();
    }

    /**
     * Resume the editor from a suspended state.
     */
    resume(): void {
        if (this._state !== 'suspended') return;
        this._state = 'loaded';
        this._overlay?.refresh();
    }

    /**
     * Serialize the current editor state to a PageDocument snapshot.
     *
     * - 'rich-text' native blocks: HTML collected from live DOM.
     * - All other native blocks: structured fields copied as-is.
     * - Managed component blocks: props copied as-is. NO DOM scraping.
     */
    serialize(): PageDocument | null {
        if (!this._document) return null;
        return {
            ...this._document,
            version: this._document.version + 1,
            updatedAt: new Date().toISOString(),
            blocks: this._serializeBlocks(this._document.blocks),
            componentInstances: { ...this._document.componentInstances },
        };
    }

    /**
     * Detach from DOM without destroying. Document is retained.
     * Re-attach to a new canvas and call load() to resume editing.
     */
    detach(): void {
        if (this._state === 'destroyed') return;
        if (this._state === 'loaded' || this._state === 'suspended') {
            this._document = this.serialize();
        }
        this._unbindCanvasEvents();
        this._selection?.detach();
        this._overlay?.detach();
        this._toolbar?.detach();
        this._renderer?.detach();
        this._canvas = null;
        this._uiRoot = null;
        this._state = 'detached';
    }

    /**
     * Fully dispose the engine. Idempotent after first call.
     */
    destroy(): void {
        if (this._state === 'destroyed') return;
        this.detach();
        this._document = null;
        this._state = 'destroyed';
    }

    // ------------------------------------------------------------------
    // Accessors
    // ------------------------------------------------------------------

    get state(): EngineState { return this._state; }
    get document(): PageDocument | null { return this._document; }
    get canvas(): HTMLElement | null { return this._canvas; }
    get options(): Readonly<EngineOptions> { return this._opts; }

    // ------------------------------------------------------------------
    // Document mutation helpers
    // ------------------------------------------------------------------

    /**
     * Update props for a managed component block by blockUuid.
     * This is the primary mutation path for managed blocks — does NOT touch DOM.
     */
    updateComponentProps(blockUuid: string, props: Record<string, unknown>): void {
        this._assertState('updateComponentProps', 'loaded', 'suspended');
        if (!this._document) return;

        const updated = this._mutateBlock(this._document.blocks, blockUuid, (block) => {
            if (block.kind !== 'managed-component') return block;
            return { ...block, props: { ...block.props, ...props } };
        });

        if (updated) {
            this._document = { ...this._document, blocks: updated };
            this.config.callbacks.onChange?.(this._document);
        }
    }

    /**
     * Store the server-assigned componentInstanceUuid after a registration API call.
     */
    assignComponentInstanceUuid(
        blockUuid: string,
        componentInstanceUuid: string,
        record: Omit<ComponentInstanceRecord, 'blockUuid'>,
    ): void {
        this._assertState('assignComponentInstanceUuid', 'loaded', 'suspended');
        if (!this._document) return;

        const updated = this._mutateBlock(this._document.blocks, blockUuid, (block) => {
            if (block.kind !== 'managed-component') return block;
            return { ...block, componentInstanceUuid };
        });

        if (!updated) return;

        this._document = {
            ...this._document,
            blocks: updated,
            componentInstances: {
                ...this._document.componentInstances,
                [componentInstanceUuid]: { ...record, blockUuid },
            },
        };

        this.config.callbacks.onChange?.(this._document);
    }

    // ------------------------------------------------------------------
    // Private: serialization
    // ------------------------------------------------------------------

    private _serializeBlocks(blocks: AnyBlock[]): AnyBlock[] {
        return blocks.map((b) => this._serializeBlock(b));
    }

    private _serializeBlock(block: AnyBlock): AnyBlock {
        switch (block.kind) {
            case 'native-layout': return this._serializeLayout(block);
            case 'native-content': return this._serializeContent(block);
            case 'managed-component': return { ...block }; // never scrape DOM
        }
    }

    private _serializeLayout(block: NativeLayoutBlock): NativeLayoutBlock {
        return {
            ...block,
            columns: block.columns.map((col) => ({
                ...col,
                blocks: col.blocks.map((b) => this._serializeBlock(b) as ColumnBlock),
            })),
        };
    }

    private _serializeContent(block: NativeContentBlock): NativeContentBlock {
        if (block.contentType !== 'rich-text' || !this._canvas) return { ...block };

        const domEl = this._canvas.querySelector<HTMLElement>(
            `[data-block-uuid="${block.blockUuid}"]`,
        );
        return domEl ? { ...block, html: domEl.innerHTML } : { ...block };
    }

    // ------------------------------------------------------------------
    // Private: immutable block mutation (depth-first)
    // ------------------------------------------------------------------

    private _mutateBlock(
        blocks: AnyBlock[],
        targetUuid: string,
        mutate: (b: AnyBlock) => AnyBlock,
    ): AnyBlock[] | null {
        let found = false;

        const next = blocks.map((block) => {
            if (block.blockUuid === targetUuid) {
                found = true;
                return mutate(block);
            }
            if (block.kind === 'native-layout') {
                const cols = block.columns.map((col) => {
                    const updatedBlocks = this._mutateBlock(col.blocks as AnyBlock[], targetUuid, mutate);
                    if (updatedBlocks) { found = true; return { ...col, blocks: updatedBlocks as ColumnBlock[] }; }
                    return col;
                });
                return { ...block, columns: cols };
            }
            return block;
        });

        return found ? next : null;
    }

    // ------------------------------------------------------------------
    // Private: canvas events
    // ------------------------------------------------------------------

    private _bindCanvasEvents(): void {
        if (!this._canvas) return;
        this._on(this._canvas, 'click', (e) => this._onCanvasClick(e as MouseEvent));
        this._on(this._canvas, 'focusin', (e) => this._onCanvasFocusIn(e as FocusEvent));
    }

    private _on(target: EventTarget, type: string, fn: (e: Event) => void): void {
        const h = fn as EventListener;
        target.addEventListener(type, h);
        this._listeners.push({ target, type, handler: h });
    }

    private _unbindCanvasEvents(): void {
        for (const { target, type, handler } of this._listeners) {
            target.removeEventListener(type, handler);
        }
        this._listeners = [];
    }

    private _onCanvasClick(e: MouseEvent): void {
        if (!this._document) return;
        const blockEl = (e.target as HTMLElement).closest<HTMLElement>('[data-block-uuid]');
        if (!blockEl) return;
        const uuid = blockEl.getAttribute('data-block-uuid');
        if (!uuid) return;
        const block = this._findBlock(uuid, this._document.blocks);
        if (!block) return;

        if (block.kind === 'managed-component') {
            this.config.callbacks.onComponentActivate?.(block.blockUuid, block.componentTypeId);
        }
        // TODO: notify SelectionManager of newly active block
    }

    private _onCanvasFocusIn(_e: FocusEvent): void {
        // TODO: update toolbar context when a focusable element gains focus
    }

    // ------------------------------------------------------------------
    // Private: utilities
    // ------------------------------------------------------------------

    private _findBlock(uuid: string, blocks: AnyBlock[]): AnyBlock | null {
        for (const block of blocks) {
            if (block.blockUuid === uuid) return block;
            if (block.kind === 'native-layout') {
                for (const col of block.columns) {
                    const found = this._findBlock(uuid, col.blocks as AnyBlock[]);
                    if (found) return found;
                }
            }
        }
        return null;
    }

    private _cloneDoc(doc: PageDocument): PageDocument {
        return { ...doc, blocks: [...doc.blocks], componentInstances: { ...doc.componentInstances } };
    }

    private _assertState(op: string, ...allowed: EngineState[]): void {
        if (!allowed.includes(this._state)) {
            throw new Error(
                `ContentBuilderEngine: cannot call ${op}() in state "${this._state}". ` +
                `Expected: ${allowed.join(', ')}.`,
            );
        }
    }
}

