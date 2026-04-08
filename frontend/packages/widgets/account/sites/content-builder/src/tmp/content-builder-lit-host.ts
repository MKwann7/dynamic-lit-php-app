// ============================================================
// content-builder-lit-host.ts  (Phase 4 / updated Phase 6)
// Lit component shell that activates and manages a ContentBuilderEngine.
//
// DOM ownership rule:
//   Lit owns the shell element and its template structure.
//   The engine owns the .cb-canvas subtree exclusively while active.
//   Lit must NOT re-render the canvas subtree while the engine is loaded —
//   doing so would clobber the engine's live DOM.
//
// Shadow DOM choice:
//   This component uses LIGHT DOM (createRenderRoot returns `this`).
//   Rationale:
//     - Text selection ranges, drag-drop events, and overlay z-indexing
//       all work more predictably without shadow DOM boundaries.
//     - External overlay/toolbar UI can reference canvas elements directly.
//     - If shadow DOM is needed for style encapsulation later, wrap only
//       the shell chrome (toolbar, panel) — keep the canvas in light DOM.
//
// Lifecycle integration:
//   connectedCallback  → generate leaseId; no engine yet (lazy)
//   active = true      → acquireLease → attach → load
//   active = false     → suspend (engine state retained, not destroyed)
//   disconnectedCallback → serialize state → releaseLease (engine destroyed)
//   page navigation    → call suspend() / resume() via the `active` property
//
// Events dispatched (bubbles + composed):
//   content-change     detail: PageDocument  — on any document mutation
//   component-activate detail: { blockUuid, componentTypeId }
//   component-deactivate detail: { blockUuid }
//   editor-ready       detail: PageDocument  — once first load() completes
//   editor-error       detail: Error
// ============================================================

import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { builderRuntime } from './content-builder-runtime';
import { DomUtils } from './dom-utils';
import { emptyPageDocument, type PageDocument } from './page-document-model';
import type { ContentBuilderEngine, EngineConfig } from './content-builder-engine';
// Phase 6: concrete service implementations
import { DefaultSelectionManager } from './selection-manager';
import { DefaultOverlayManager } from './overlay-manager';
import { DefaultToolbarManager } from './toolbar-manager';
import { DefaultCanvasRenderer } from './canvas-renderer';
// Phase 6b: host-level services (not wired into the engine)
import { ModalService } from './modal-service';
import { UIStyleService } from './ui-style-service';

// ------------------------------------------------------------------
// Custom element
// ------------------------------------------------------------------

@customElement('content-builder-host')
export class ContentBuilderHost extends LitElement {

    // ------------------------------------------------------------------
    // Use light DOM — see module-level comment above.
    // ------------------------------------------------------------------
    override createRenderRoot(): HTMLElement {
        return this;
    }

    // ------------------------------------------------------------------
    // Public properties
    // ------------------------------------------------------------------

    /**
     * When true, the editor is active and the engine is running.
     * Set to false to suspend (state retained; engine not destroyed).
     * The engine is only created on the first time this flips to true.
     */
    @property({ type: Boolean, reflect: true })
    active = false;

    /**
     * Logical page ID — used when creating an empty PageDocument if no
     * document is provided via loadDocument() before the editor activates.
     */
    @property({ attribute: 'page-id' })
    pageId = '';

    // ------------------------------------------------------------------
    // Internal state (drives render, not public API)
    // ------------------------------------------------------------------

    @state() private _loading = false;
    @state() private _editorReady = false;
    @state() private _errorMessage = '';

    // ------------------------------------------------------------------
    // Private fields
    // ------------------------------------------------------------------

    /** Stable ID for the runtime lease — generated once on connect */
    private _leaseId = '';

    /** Current engine instance (null when not leased) */
    private _engine: ContentBuilderEngine | null = null;

    /**
     * Serialized page document. This is the source of truth between sessions.
     * Updated on every onChange callback and on releaseLease().
     */
    private _pageDocument: PageDocument | null = null;

    /** Protect against acquireLease() being called twice in a race */
    private _activating = false;

    /**
     * Host-level services — owned by the host, not the engine.
     * Created lazily in _activate() once the uiRoot element exists.
     * Nulled on teardown so the next activation gets fresh instances.
     */
    private _modalService: ModalService | null = null;
    private _uiStyleService: UIStyleService | null = null;

    // ------------------------------------------------------------------
    // Lit lifecycle
    // ------------------------------------------------------------------

    override connectedCallback(): void {
        super.connectedCallback();
        // Generate a stable lease ID that persists for the life of this element.
        this._leaseId = `cbhost-${Math.random().toString(36).slice(2, 11)}`;
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        // Serialize and release on removal. Handles tab close, navigation, and
        // programmatic element removal equally.
        this._teardown();
    }

    override updated(changed: PropertyValues<this>): void {
        super.updated(changed);

        if (changed.has('active')) {
            if (this.active) {
                void this._activate();
            } else {
                this._suspend();
            }
        }
    }

    override render() {
        return html`
            <div class="cb-shell" part="shell">

                ${this._loading ? html`
                    <div class="cb-loading" part="loading" aria-label="Loading editor…" role="status">
                        <span class="cb-loading-indicator"></span>
                    </div>
                ` : ''}

                ${this._errorMessage ? html`
                    <div class="cb-error" part="error" role="alert">
                        ${this._errorMessage}
                    </div>
                ` : ''}

                <!--
                    .cb-canvas is owned by the engine once active.
                    Lit must not touch this element's children while
                    _editorReady === true.
                -->
                <div
                    class="cb-canvas"
                    part="canvas"
                    ?contenteditable="${this._editorReady}"
                    aria-label="Page content editor"
                    spellcheck="false"
                ></div>

                <!--
                    .cb-ui is the mount point for OverlayManager and ToolbarManager.
                    Absolutely positioned over the canvas; pointer-events:none at
                    the container level so the canvas remains interactive.
                    Individual tool elements inside it opt back in with
                    pointer-events:auto (see DefaultOverlayManager._createOverlayRoot).
                -->
                <div class="cb-ui" part="ui"></div>

            </div>
        `;
    }

    // ------------------------------------------------------------------
    // Public API — callable from outside (parent component, DynComponentManager)
    // ------------------------------------------------------------------

    /**
     * Load a PageDocument into the host.
     *
     * If the engine is already active, the document is applied immediately.
     * If the engine is not yet active, the document is retained and will
     * be passed to engine.load() when the editor next activates.
     *
     * Call this before setting active = true for a pre-populated editor.
     */
    loadDocument(doc: PageDocument): void {
        this._pageDocument = doc;

        if (this._engine) {
            const s = this._engine.state;
            if (s === 'attached') {
                this._engine.load(doc);
            }
            // If loaded or suspended: TODO support hot-reloading a document
            // into an already-running engine. For now the host must deactivate
            // and re-activate to pick up a new document.
        }
    }

    /**
     * Return the current serialized page document.
     *
     * If the engine is active, this calls engine.serialize() to capture
     * the latest DOM state. Otherwise returns the last retained snapshot.
     */
    getDocument(): PageDocument | null {
        if (this._engine && (this._engine.state === 'loaded' || this._engine.state === 'suspended')) {
            return this._engine.serialize();
        }
        return this._pageDocument;
    }

    /**
     * Update props for a managed component block.
     * Delegates to engine.updateComponentProps() if the engine is active.
     */
    updateComponentProps(blockUuid: string, props: Record<string, unknown>): void {
        this._engine?.updateComponentProps(blockUuid, props);
    }

    /**
     * Store the server-assigned componentInstanceUuid after a registration call.
     * Delegates to engine.assignComponentInstanceUuid() if the engine is active.
     */
    assignComponentInstanceUuid(
        blockUuid: string,
        componentInstanceUuid: string,
        record: Omit<import('./page-document-model').ComponentInstanceRecord, 'blockUuid'>,
    ): void {
        this._engine?.assignComponentInstanceUuid(blockUuid, componentInstanceUuid, record);
    }

    // ------------------------------------------------------------------
    // Private: engine lifecycle
    // ------------------------------------------------------------------

    private async _activate(): Promise<void> {
        // Resume if engine already exists and is suspended
        if (this._engine) {
            this._engine.resume();
            return;
        }

        // Guard against concurrent activations (e.g., rapid active=true toggles)
        if (this._activating) return;
        this._activating = true;
        this._loading = true;
        this._errorMessage = '';

        try {
            const engine = await builderRuntime.acquireLease(this._leaseId, this._buildConfig());
            this._engine = engine;

            // Wait for Lit to render the canvas and ui-root elements into the DOM
            await this.updateComplete;

            const canvas = this.querySelector<HTMLElement>('.cb-canvas');
            if (!canvas) {
                throw new Error('ContentBuilderHost: .cb-canvas element not found after render.');
            }

            const uiRoot = this.querySelector<HTMLElement>('.cb-ui') ?? canvas;

            // Initialise host-level services that live outside the engine.
            this._modalService   = new ModalService(uiRoot);
            this._uiStyleService = new UIStyleService(uiRoot);

            engine.attach(canvas, uiRoot);

            const doc = this._pageDocument ?? emptyPageDocument(this.pageId || 'new-page');
            if (!this._pageDocument) {
                this._pageDocument = doc;
            }

            engine.load(doc);

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this._errorMessage = error.message;
            console.error('ContentBuilderHost: activation failed', error);
            this._dispatchEvent('editor-error', error);

            // Clean up the lease if it was acquired before the error
            if (builderRuntime.getEngine(this._leaseId)) {
                builderRuntime.releaseLease(this._leaseId);
            }
            this._engine = null;

        } finally {
            this._activating = false;
            this._loading = false;
        }
    }

    /** Suspend without destroying — use when hiding the screen */
    private _suspend(): void {
        this._engine?.suspend();
    }

    /** Serialize, destroy engine, release lease */
    private _teardown(): void {
        if (!this._engine) return;

        // Capture final document state before destroying
        const finalDoc = this._engine.serialize();
        if (finalDoc) this._pageDocument = finalDoc;

        builderRuntime.releaseLease(this._leaseId);
        this._engine = null;
        this._editorReady = false;
        this._modalService = null;
        this._uiStyleService = null;
    }

    // ------------------------------------------------------------------
    // Private: engine config factory
    // ------------------------------------------------------------------

    private _buildConfig(): EngineConfig {
        return {
            services: {
                dom:              new DomUtils(),
                selectionManager: new DefaultSelectionManager(),
                overlayManager:   new DefaultOverlayManager(),
                toolbarManager:   new DefaultToolbarManager(),
                canvasRenderer:   new DefaultCanvasRenderer(),
            },
            callbacks: {
                onLoad: (doc) => {
                    this._editorReady = true;
                    this._dispatchEvent('editor-ready', doc);
                },
                onChange: (doc) => {
                    this._pageDocument = doc;
                    this._dispatchEvent('content-change', doc);
                },
                onError: (err) => {
                    this._errorMessage = err.message;
                    this._dispatchEvent('editor-error', err);
                },
                onComponentActivate: (blockUuid, componentTypeId) => {
                    this._dispatchEvent('component-activate', { blockUuid, componentTypeId });
                },
                onComponentDeactivate: (blockUuid) => {
                    this._dispatchEvent('component-deactivate', { blockUuid });
                },
            },
        };
    }

    // ------------------------------------------------------------------
    // Private: event dispatch helper
    // ------------------------------------------------------------------

    private _dispatchEvent(name: string, detail: unknown): void {
        this.dispatchEvent(new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true,
        }));
    }

    // ------------------------------------------------------------------
    // Styles (shell chrome only — canvas styles are not scoped here
    // because we are using light DOM)
    // ------------------------------------------------------------------
    static override styles = css`
        :host {
            display: block;
            position: relative;
        }

        .cb-shell {
            position: relative;
            width: 100%;
            height: 100%;
        }

        .cb-canvas {
            outline: none;
            min-height: 120px;
            width: 100%;
        }

        .cb-ui {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 20;
            overflow: visible;
        }

        .cb-loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255 255 255 / 0.6);
            z-index: 10;
        }

        .cb-loading-indicator {
            width: 32px;
            height: 32px;
            border: 3px solid currentColor;
            border-top-color: transparent;
            border-radius: 50%;
            animation: cb-spin 0.7s linear infinite;
            opacity: 0.5;
        }

        @keyframes cb-spin {
            to { transform: rotate(360deg); }
        }

        .cb-error {
            padding: 8px 12px;
            background: #fff0f0;
            color: #c00;
            border: 1px solid #fcc;
            border-radius: 4px;
            font-size: 13px;
            margin-bottom: 8px;
        }
    `;
}

// ------------------------------------------------------------------
// TypeScript module augmentation for custom event types
// ------------------------------------------------------------------

declare global {
    interface HTMLElementTagNameMap {
        'content-builder-host': ContentBuilderHost;
    }
    interface HTMLElementEventMap {
        'content-change':      CustomEvent<PageDocument>;
        'editor-ready':        CustomEvent<PageDocument>;
        'editor-error':        CustomEvent<Error>;
        'component-activate':  CustomEvent<{ blockUuid: string; componentTypeId: string }>;
        'component-deactivate': CustomEvent<{ blockUuid: string }>;
    }
}

