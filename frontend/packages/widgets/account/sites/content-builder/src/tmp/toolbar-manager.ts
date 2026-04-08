// ============================================================
// toolbar-manager.ts  (Phase 6)
// DefaultToolbarManager — concrete implementation of ToolbarManager.
//
// Extracted from ContentBuilderHelpers toolbar-related logic:
//   clearActiveElement() (toolbar portion), clearControls() (rte sections).
//
// Responsibilities:
//   - Mount a floating toolbar panel into the uiRoot.
//   - Track the currently active block context.
//   - Show / hide the toolbar in response to engine lifecycle calls.
//   - Expose context so future RTE buttons can read the active block kind.
//
// Architecture note:
//   The toolbar element sits inside the same uiRoot as the OverlayManager.
//   It uses pointer-events:auto so clicks on toolbar buttons are not eaten
//   by the overlay root's pointer-events:none container.
//
//   Full button / RTE wiring is deferred to a future phase when the RTE
//   tool implementation is extracted from ContentBuilderHelpers.
// ============================================================

import type { ToolbarManager, ToolbarContext } from './content-builder-engine';

export class DefaultToolbarManager implements ToolbarManager {

    private _uiRoot: HTMLElement | null = null;
    private _toolbarEl: HTMLElement | null = null;
    private _activeContext: ToolbarContext | null = null;

    // ------------------------------------------------------------------
    // ToolbarManager interface
    // ------------------------------------------------------------------

    /**
     * Create the toolbar element and mount it into uiRoot.
     * The toolbar is hidden until show() is called.
     */
    attach(uiRoot: HTMLElement): void {
        this._uiRoot = uiRoot;
        this._toolbarEl = this._createToolbarEl();
        this._uiRoot.appendChild(this._toolbarEl);
    }

    detach(): void {
        this._toolbarEl?.parentNode?.removeChild(this._toolbarEl);
        this._toolbarEl = null;
        this._activeContext = null;
        this._uiRoot = null;
    }

    /**
     * Show the toolbar for the given block context.
     *
     * Sets data attributes on the toolbar element so CSS selectors and
     * future button wiring can inspect the active context without holding
     * a direct JS reference to the block.
     *
     * Positioning relative to `context.targetElement` is a TODO for the
     * phase when the RTE tool buttons are wired.
     */
    show(context: ToolbarContext): void {
        if (!this._toolbarEl) return;

        this._activeContext = context;
        this._toolbarEl.setAttribute('data-active-block', context.blockUuid);
        this._toolbarEl.setAttribute('data-active-kind', context.blockKind);
        this._toolbarEl.style.display = 'flex';

        // TODO (Phase 7): position toolbar relative to context.targetElement
        // using getBoundingClientRect + scroll offset.
        this._positionNearElement(context.targetElement);
    }

    /**
     * Hide the toolbar and clear the stored context.
     *
     * Mirrors ContentBuilderHelpers behaviour for hiding .is-rte-tool and
     * .is-elementrte-tool when clicking outside an active element.
     */
    hide(): void {
        if (!this._toolbarEl) return;

        this._activeContext = null;
        this._toolbarEl.style.display = 'none';
        this._toolbarEl.removeAttribute('data-active-block');
        this._toolbarEl.removeAttribute('data-active-kind');
    }

    // ------------------------------------------------------------------
    // Accessors
    // ------------------------------------------------------------------

    /** The block context the toolbar is currently showing for, or null. */
    get activeContext(): ToolbarContext | null {
        return this._activeContext;
    }

    /** The toolbar's DOM element, or null if not yet attached. */
    get element(): HTMLElement | null {
        return this._toolbarEl;
    }

    // ------------------------------------------------------------------
    // Private
    // ------------------------------------------------------------------

    private _createToolbarEl(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'cb-toolbar';
        el.setAttribute('role', 'toolbar');
        el.setAttribute('aria-label', 'Block editing toolbar');
        el.style.cssText = [
            'display:none',
            'position:absolute',
            'z-index:30',
            'pointer-events:auto',
            'align-items:center',
            'gap:4px',
            'padding:4px 6px',
            'background:#fff',
            'border:1px solid rgba(0,0,0,0.12)',
            'border-radius:4px',
            'box-shadow:0 2px 8px rgba(0,0,0,0.12)',
        ].join(';');

        // Placeholder — RTE buttons will be injected here in Phase 7.
        el.innerHTML = `
            <span class="cb-toolbar-placeholder"
                  style="font-size:11px;color:#999;padding:0 4px;pointer-events:none;">
                toolbar
            </span>
        `;

        return el;
    }

    /**
     * Rough initial positioning — places the toolbar directly above the
     * target element. Proper viewport-aware placement is Phase 7 work.
     */
    private _positionNearElement(target: HTMLElement): void {
        if (!this._toolbarEl || !this._uiRoot) return;

        const uiRect = this._uiRoot.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const top = targetRect.top - uiRect.top - (this._toolbarEl.offsetHeight || 40) - 6;
        const left = targetRect.left - uiRect.left;

        this._toolbarEl.style.top = `${Math.max(0, top)}px`;
        this._toolbarEl.style.left = `${Math.max(0, left)}px`;
    }
}

