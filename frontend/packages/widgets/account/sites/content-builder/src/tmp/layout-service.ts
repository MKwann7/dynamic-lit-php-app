// ============================================================
// layout-service.ts  (Phase 6b)
// LayoutService — manages row/column layout operations.
//
// Extracted from ContentBuilderHelpers.fixLayout().
//
// Responsibilities:
//   - fixLayout(row): after adding or removing a column from a row, walk
//     the row's column children and redistribute CSS grid/width classes.
//   - Column-count → CSS class mapping is driven by BuilderOptions.
//
// Intentional scope limit:
//   addContent() and addSnippet() are NOT migrated here.  Those methods
//   depend on legacy global state (`.cell-active`, `.row-active` CSS
//   classes, `.quickadd` UI panel) and will be replaced wholesale by the
//   new block-insertion API in a later phase once the CanvasRenderer
//   is fully wired.
// ============================================================

import type { BuilderOptions } from './content-builder-types';
import { DomUtils } from './dom-utils';

/** CSS classes used exclusively for UI chrome — not column-width classes */
const TOOL_CLASS_NAMES = ['is-row-tool', 'is-rowadd-tool', 'is-row-overlay'] as const;

export class LayoutService {

    private readonly _dom = new DomUtils();

    constructor(private readonly _opts: BuilderOptions) {}

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Redistribute column-width CSS classes across a row's column children
     * after the column count has changed (column added or removed).
     *
     * The distribution strategy depends on BuilderOptions:
     *   - If `colequal` groups are configured: assign the first class from
     *     the matching equal-width group.
     *   - Otherwise: use the built-in 12-column grid index map.
     *
     * Mirrors ContentBuilderHelpers.fixLayout().
     *
     * @param row  The row element whose column children need rebalancing.
     */
    fixLayout(row: HTMLElement): void {
        const hasOverlay = !!row.querySelector('.is-row-overlay');
        const overlayOffset = hasOverlay ? 3 : 2;
        const columnCount = row.childElementCount - overlayOffset;

        const { cols, colequal, row: rowClass } = this._opts;

        if (colequal.length > 0) {
            this._fixLayoutEqualGroups(row, columnCount, cols, colequal);
            return;
        }

        if (!rowClass || cols.length === 0) return;
        this._fixLayoutGrid(row, columnCount, cols);
    }

    // ------------------------------------------------------------------
    // Private: equal-width group strategy
    // ------------------------------------------------------------------

    private _fixLayoutEqualGroups(
        row: HTMLElement,
        columnCount: number,
        cols: string[],
        colequal: string[][],
    ): void {
        this._dom.elementChildren(row).forEach((child) => {
            if (this._isToolChild(child)) return;

            // Remove all known column classes
            for (const col of cols) this._dom.removeClass(child, col);

            // Find the matching equal-width group
            for (const group of colequal) {
                if (group.length === columnCount) {
                    this._dom.addClass(child, group[0]);
                    return;
                }
            }

            // Fallback: single column → full width
            if (columnCount === 1) this._dom.addClass(child, cols[cols.length - 1]);
        });
    }

    // ------------------------------------------------------------------
    // Private: 12-column grid index strategy
    // ------------------------------------------------------------------

    private _fixLayoutGrid(row: HTMLElement, columnCount: number, cols: string[]): void {
        let index = 0;

        this._dom.elementChildren(row).forEach((child) => {
            if (this._isToolChild(child)) return;
            index++;

            for (const col of cols) this._dom.removeClass(child, col);

            const colIndex = this._resolveColIndex(columnCount, index);
            if (colIndex >= 0 && colIndex < cols.length) {
                this._dom.addClass(child, cols[colIndex]);
            }
        });
    }

    /**
     * Map (columnCount, 1-based column index) → 0-based index into cols[].
     *
     * The legacy mapping uses 0 for the narrowest class and 11 for the
     * widest (full-row) class, matching a 12-column grid.
     *
     * Returns -1 for unrecognised column counts.
     */
    private _resolveColIndex(columnCount: number, index: number): number {
        switch (columnCount) {
            case 1:  return 11;                          // full width
            case 2:  return 5;                           // half / half
            case 3:  return 3;                           // thirds
            case 4:  return 2;                           // quarters
            case 5:  return index === 5 ? 3 : 1;
            case 6:  return 1;
            case 7:  return index >= 6 ? 0 : 1;
            case 8:  return index >= 5 ? 0 : 1;
            case 9:  return index >= 4 ? 0 : 1;
            case 10: return index >= 3 ? 0 : 1;
            case 11: return index >= 2 ? 0 : 1;
            case 12: return 0;                           // all narrowest
            default: return -1;
        }
    }

    // ------------------------------------------------------------------
    // Private: helpers
    // ------------------------------------------------------------------

    private _isToolChild(el: HTMLElement): boolean {
        return TOOL_CLASS_NAMES.some((cls) => this._dom.hasClass(el, cls));
    }
}

