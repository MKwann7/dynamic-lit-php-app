// ============================================================
// selection-manager.ts  (Phase 6)
// DefaultSelectionManager — concrete implementation of SelectionManager.
//
// Extracted from ContentBuilderHelpers.saveSelection / restoreSelection.
//
// Key differences from the legacy implementation:
//   - No dependency on ContentBuilderRuntime or any shared mutable state.
//   - Saves ranges in an instance field, not on the runtime object.
//   - Auto-saves selection on canvas focusout (user clicks a toolbar button,
//     causing focus to leave the canvas — selection is preserved so the
//     toolbar action can still operate on it via restoreSelection()).
//   - IE / document.selection code paths are dropped; modern browsers only.
// ============================================================

import type { SelectionManager } from './content-builder-engine';

export class DefaultSelectionManager implements SelectionManager {

    private _canvas: HTMLElement | null = null;
    private _savedRanges: Range[] | null = null;

    /** Bound reference kept so the same function pointer is removed on detach */
    private _onFocusOut: ((e: FocusEvent) => void) | null = null;

    // ------------------------------------------------------------------
    // SelectionManager interface
    // ------------------------------------------------------------------

    /**
     * Bind to the canvas element.
     * Registers a focusout listener that auto-saves the selection whenever
     * focus leaves the canvas subtree (e.g. user clicks a toolbar button).
     */
    attach(canvas: HTMLElement): void {
        this._canvas = canvas;
        this._onFocusOut = (e: FocusEvent) => {
            // Only auto-save when focus moves outside the canvas entirely.
            const relatedTarget = e.relatedTarget as Node | null;
            if (!relatedTarget || !canvas.contains(relatedTarget)) {
                this.saveSelection();
            }
        };
        canvas.addEventListener('focusout', this._onFocusOut);
    }

    detach(): void {
        if (this._canvas && this._onFocusOut) {
            this._canvas.removeEventListener('focusout', this._onFocusOut);
        }
        this._canvas = null;
        this._onFocusOut = null;
        this._savedRanges = null;
    }

    /**
     * Snapshot the current browser selection.
     * Returns the saved ranges, or null if nothing is selected.
     */
    saveSelection(): Range[] | null {
        const selection = window.getSelection();

        if (!selection?.getRangeAt || !selection.rangeCount) {
            this._savedRanges = null;
            return null;
        }

        const ranges: Range[] = [];
        for (let i = 0; i < selection.rangeCount; i++) {
            ranges.push(selection.getRangeAt(i));
        }
        this._savedRanges = ranges;
        return ranges;
    }

    /**
     * Restore the last saved selection.
     * No-op if nothing was previously saved.
     */
    restoreSelection(): void {
        if (!this._savedRanges?.length) return;

        const selection = window.getSelection();
        if (!selection) return;

        selection.removeAllRanges();
        for (const range of this._savedRanges) {
            try {
                selection.addRange(range);
            } catch {
                // Range may be stale if the DOM was mutated; skip silently.
            }
        }
    }

    /**
     * Discard the saved snapshot and collapse the live browser selection.
     * Called by ContentBuilderEngine.suspend().
     */
    clearSelection(): void {
        this._savedRanges = null;
        const selection = window.getSelection();
        selection?.removeAllRanges();
    }

    // ------------------------------------------------------------------
    // Accessors (useful for testing / toolbar context)
    // ------------------------------------------------------------------

    /** Returns the currently saved ranges, or null if nothing was saved. */
    get savedRanges(): Range[] | null {
        return this._savedRanges;
    }

    /** True when there is a saved selection that can be restored. */
    get hasSavedSelection(): boolean {
        return this._savedRanges !== null && this._savedRanges.length > 0;
    }
}

