// ============================================================
// overlay-manager.ts  (Phase 6)
// DefaultOverlayManager — concrete implementation of OverlayManager.
//
// Extracted from ContentBuilderHelpers overlay + control logic:
//   clearControls(), hideControls(), clearActiveCell(), clearActiveElement()
//
// Responsibilities:
//   - Track and manage floating edit-tool elements (.is-tool) overlaid on
//     canvas rows and columns.
//   - Deactivate selection CSS classes on hide() / detach().
//   - Provide refresh() to re-anchor tool positions after layout changes.
//     (Full positioning via getBoundingClientRect is a future-phase TODO.)
//
// Architecture note:
//   The overlay panel lives in the uiRoot — a sibling element to the canvas
//   that is absolutely positioned over it (pointer-events:none at the
//   container level; individual tool elements opt in with pointer-events:auto).
//   This avoids interfering with the canvas's own event propagation.
// ============================================================

import type { OverlayManager } from './content-builder-engine';

/** CSS classes that mark an element as a tool overlay inside the canvas */
const TOOL_CLASSES = ['is-tool', 'is-row-tool', 'is-rowadd-tool', 'is-row-overlay', 'is-column-tool'] as const;

/** CSS classes applied to canvas content elements to indicate active selection */
const ACTIVE_CLASSES = ['cell-active', 'row-outline', 'row-active', 'builder-active', 'elm-active', 'elm-inspected'] as const;

export class DefaultOverlayManager implements OverlayManager {

    private _canvas: HTMLElement | null = null;
    private _uiRoot: HTMLElement | null = null;

    /** The overlay container element injected into uiRoot */
    private _overlayRoot: HTMLElement | null = null;

    // ------------------------------------------------------------------
    // OverlayManager interface
    // ------------------------------------------------------------------

    /**
     * Bind to the canvas and the separate UI-root element.
     *
     * The overlay container is appended to `uiRoot`, which should be
     * absolutely positioned over the canvas (see .cb-ui styles).
     */
    attach(canvas: HTMLElement, uiRoot: HTMLElement): void {
        this._canvas = canvas;
        this._uiRoot = uiRoot;
        this._overlayRoot = this._createOverlayRoot();
        this._uiRoot.appendChild(this._overlayRoot);
    }

    detach(): void {
        this.hide();
        this._overlayRoot?.parentNode?.removeChild(this._overlayRoot);
        this._overlayRoot = null;
        this._canvas = null;
        this._uiRoot = null;
    }

    /**
     * Refresh overlay positions after a DOM layout change.
     *
     * Currently a stub — future implementation will walk active tool elements
     * in the overlayRoot and reposition them using getBoundingClientRect()
     * relative to their associated canvas rows/columns.
     *
     * Called by ContentBuilderEngine.resume() after un-suspending.
     */
    refresh(): void {
        // TODO (Phase 7): reposition .is-row-tool and .is-column-tool elements
        // by querying getBoundingClientRect on their associated canvas rows.
    }

    /**
     * Hide all active overlay tools and clear editor-selection CSS classes
     * from the canvas.
     *
     * Mirrors the combined effect of:
     *   ContentBuilderHelpers.hideControls()
     *   ContentBuilderHelpers.clearActiveCell()
     *   ContentBuilderHelpers.clearControls()
     *
     * Called by ContentBuilderEngine.suspend() and during deactivation.
     */
    hide(): void {
        // Hide all tool elements inside the overlay root
        if (this._overlayRoot) {
            const tools = this._overlayRoot.querySelectorAll<HTMLElement>('.is-tool');
            tools.forEach((t) => { t.style.display = ''; });
        }

        if (!this._canvas) return;

        // Remove active-selection CSS classes from canvas content elements
        for (const cls of ACTIVE_CLASSES) {
            this._canvas.querySelectorAll(`.${cls}`).forEach((el) => el.classList.remove(cls));
        }

        // Restore visibility of any overlay elements embedded in the canvas
        // (legacy: .ovl divs that sit on top of rows for drag-handle purposes)
        this._canvas.querySelectorAll<HTMLElement>('.ovl').forEach((ovl) => {
            ovl.style.display = 'block';
        });

        // Clean up any leftover tool elements inside the canvas itself
        // (should not exist in the new architecture, but guard against legacy HTML)
        for (const cls of TOOL_CLASSES) {
            this._canvas.querySelectorAll<HTMLElement>(`.${cls}`).forEach((t) => {
                t.style.display = '';
            });
        }
    }

    // ------------------------------------------------------------------
    // Future public helpers (wired up in Phase 7)
    // ------------------------------------------------------------------

    /**
     * Show the row tool anchored to a specific row element.
     * TODO: implement positioning once tool HTML is defined.
     */
    showRowTool(_rowEl: HTMLElement): void {
        // TODO (Phase 7)
    }

    /**
     * Show the column tool anchored to a specific column element.
     * TODO: implement positioning once tool HTML is defined.
     */
    showColumnTool(_colEl: HTMLElement): void {
        // TODO (Phase 7)
    }

    // ------------------------------------------------------------------
    // Private
    // ------------------------------------------------------------------

    private _createOverlayRoot(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'cb-overlay-root';
        el.style.cssText = [
            'position:absolute',
            'inset:0',
            'pointer-events:none',
            'z-index:20',
            'overflow:visible',
        ].join(';');
        return el;
    }
}

