// ============================================================
// canvas-renderer.ts  (Phase 6 — CanvasRenderer implementation)
// DefaultCanvasRenderer — concrete implementation of CanvasRenderer.
//
// PRIMARY CONTRACT:
//   Every block element rendered into the canvas carries:
//     data-block-uuid="<block.blockUuid>"
//     data-block-kind="<native-layout|native-content|managed-component>"
//
//   This is what allows ContentBuilderEngine._serializeContent() to recover
//   rich-text HTML from the live DOM:
//     canvas.querySelector('[data-block-uuid="<uuid>"]').innerHTML
//
// Block → DOM mapping:
// ┌─────────────────────────────────┬──────────────────────────────────────────┐
// │ Block type                      │ DOM element                              │
// ├─────────────────────────────────┼──────────────────────────────────────────┤
// │ native-layout                   │ <div data-block-uuid data-block-kind>    │
// │   └─ column                     │   <div data-col-uuid class="col-…">      │
// │        └─ column children       │     [recursively rendered]               │
// │ native-content / rich-text      │ <div data-block-uuid contenteditable>    │
// │ native-content / image          │ <figure data-block-uuid> <img> </figure> │
// │ native-content / heading        │ <h1–6 data-block-uuid contenteditable>   │
// │ native-content / divider        │ <hr data-block-uuid>                     │
// │ native-content / spacer         │ <div data-block-uuid class="cb-spacer">  │
// │ native-content / code           │ <pre data-block-uuid> <code> </pre>      │
// │ native-content / button         │ <a data-block-uuid class="cb-button">    │
// │ managed-component               │ <div data-block-uuid data-component-…>   │
// └─────────────────────────────────┴──────────────────────────────────────────┘
//
// Managed-component blocks render a lightweight placeholder div.
// The actual widget/component rendering is the host's responsibility.
//
// collectBlocks() is a stub for now — full DOM→model reconciliation is a
// future-phase feature.
// ============================================================

import type { CanvasRenderer } from './content-builder-engine';
import type {
    PageDocument,
    AnyBlock,
    NativeLayoutBlock,
    NativeLayoutColumn,
    NativeContentBlock,
    ManagedComponentBlock,
} from './page-document-model';

/** Attribute name written to every rendered block element */
const ATTR_BLOCK_UUID = 'data-block-uuid';
const ATTR_BLOCK_KIND = 'data-block-kind';
const ATTR_COL_UUID   = 'data-col-uuid';

export class DefaultCanvasRenderer implements CanvasRenderer {

    private _canvas: HTMLElement | null = null;

    // ------------------------------------------------------------------
    // CanvasRenderer interface
    // ------------------------------------------------------------------

    attach(canvas: HTMLElement): void {
        this._canvas = canvas;
    }

    detach(): void {
        this._canvas = null;
    }

    /**
     * Render a PageDocument into the canvas.
     *
     * CLEARS existing canvas content before rendering — only call this
     * from a load() context, not during live editing.
     *
     * After this call every content element in the canvas carries a
     * `data-block-uuid` attribute, enabling the serializer to read back
     * rich-text HTML without knowing any block structure upfront.
     */
    render(doc: PageDocument): void {
        if (!this._canvas) return;

        // Hard clear — we own the canvas subtree exclusively while active.
        this._canvas.innerHTML = '';

        for (const block of doc.blocks) {
            const el = this._renderBlock(block);
            if (el) this._canvas.appendChild(el);
        }
    }

    /**
     * Walk the live canvas DOM and collect blocks back into a flat list.
     *
     * Stub implementation — returns an empty array.
     * Full reconciliation (DOM → PageDocument) is a Phase 7 feature.
     */
    collectBlocks(_doc: PageDocument): AnyBlock[] {
        return [];
    }

    // ------------------------------------------------------------------
    // Private: block dispatch
    // ------------------------------------------------------------------

    private _renderBlock(block: AnyBlock): HTMLElement | null {
        switch (block.kind) {
            case 'native-layout':     return this._renderLayout(block);
            case 'native-content':    return this._renderContent(block);
            case 'managed-component': return this._renderManagedComponent(block);
        }
    }

    // ------------------------------------------------------------------
    // Private: layout
    // ------------------------------------------------------------------

    private _renderLayout(block: NativeLayoutBlock): HTMLElement {
        const row = document.createElement('div');
        this._stamp(row, block.blockUuid, 'native-layout');
        this._applyClasses(row, block.rowStyleClasses);

        for (const col of block.columns) {
            row.appendChild(this._renderColumn(col));
        }

        return row;
    }

    private _renderColumn(col: NativeLayoutColumn): HTMLElement {
        const el = document.createElement('div');
        el.setAttribute(ATTR_COL_UUID, col.colUuid);
        this._applyClasses(el, col.styleClasses);

        for (const child of col.blocks) {
            const childEl = this._renderBlock(child);
            if (childEl) el.appendChild(childEl);
        }

        return el;
    }

    // ------------------------------------------------------------------
    // Private: content blocks
    // ------------------------------------------------------------------

    private _renderContent(block: NativeContentBlock): HTMLElement {
        switch (block.contentType) {
            case 'rich-text': return this._renderRichText(block);
            case 'image':     return this._renderImage(block);
            case 'heading':   return this._renderHeading(block);
            case 'divider':   return this._renderDivider(block);
            case 'spacer':    return this._renderSpacer(block);
            case 'code':      return this._renderCode(block);
            case 'button':    return this._renderButton(block);
        }
    }

    /** Rich-text: editable div whose innerHTML is the live source of truth */
    private _renderRichText(block: NativeContentBlock): HTMLElement {
        const el = document.createElement('div');
        this._stamp(el, block.blockUuid, 'native-content');
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
        el.setAttribute('data-content-type', 'rich-text');
        this._applyClasses(el, block.styleClasses);
        // innerHTML is the source of truth for rich-text; set it directly.
        el.innerHTML = block.html ?? '';
        return el;
    }

    /** Image: <figure> wrapping an <img> */
    private _renderImage(block: NativeContentBlock): HTMLElement {
        const figure = document.createElement('figure');
        this._stamp(figure, block.blockUuid, 'native-content');
        figure.setAttribute('data-content-type', 'image');
        this._applyClasses(figure, block.styleClasses);

        const img = document.createElement('img');
        if (block.src) img.src = block.src;
        img.alt = block.alt ?? '';
        figure.appendChild(img);

        return figure;
    }

    /** Heading: h1–h6 with contenteditable text */
    private _renderHeading(block: NativeContentBlock): HTMLElement {
        const level = Math.min(6, Math.max(1, block.level ?? 2)) as 1 | 2 | 3 | 4 | 5 | 6;
        const el = this._createHeadingEl(level);
        this._stamp(el, block.blockUuid, 'native-content');
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-content-type', 'heading');
        this._applyClasses(el, block.styleClasses);
        el.textContent = block.text ?? '';
        return el;
    }

    /** Divider: <hr> */
    private _renderDivider(block: NativeContentBlock): HTMLElement {
        const el = document.createElement('hr');
        this._stamp(el, block.blockUuid, 'native-content');
        el.setAttribute('data-content-type', 'divider');
        this._applyClasses(el, block.styleClasses);
        return el;
    }

    /** Spacer: empty div with a height class */
    private _renderSpacer(block: NativeContentBlock): HTMLElement {
        const el = document.createElement('div');
        this._stamp(el, block.blockUuid, 'native-content');
        el.setAttribute('data-content-type', 'spacer');
        el.classList.add('cb-spacer');
        this._applyClasses(el, block.styleClasses);
        return el;
    }

    /** Code: <pre><code> block */
    private _renderCode(block: NativeContentBlock): HTMLElement {
        const pre = document.createElement('pre');
        this._stamp(pre, block.blockUuid, 'native-content');
        pre.setAttribute('data-content-type', 'code');
        this._applyClasses(pre, block.styleClasses);

        const code = document.createElement('code');
        // Use textContent — code blocks are not innerHTML-editable.
        code.textContent = block.html ?? '';
        pre.appendChild(code);

        return pre;
    }

    /** Button / CTA: <a class="cb-button"> */
    private _renderButton(block: NativeContentBlock): HTMLElement {
        const el = document.createElement('a');
        this._stamp(el, block.blockUuid, 'native-content');
        el.setAttribute('data-content-type', 'button');
        el.classList.add('cb-button');
        this._applyClasses(el, block.styleClasses);
        if (block.href) el.href = block.href;
        el.textContent = block.text ?? '';
        return el;
    }

    // ------------------------------------------------------------------
    // Private: managed component
    // ------------------------------------------------------------------

    /**
     * Managed component: lightweight placeholder div.
     *
     * The host layer (ContentBuilderHost or a parent widget) is responsible
     * for loading the actual component widget into this placeholder after
     * the engine fires onComponentActivate.
     */
    private _renderManagedComponent(block: ManagedComponentBlock): HTMLElement {
        const el = document.createElement('div');
        this._stamp(el, block.blockUuid, 'managed-component');
        el.setAttribute('data-component-type-id', block.componentTypeId);
        if (block.componentInstanceUuid) {
            el.setAttribute('data-component-instance-uuid', block.componentInstanceUuid);
        }
        el.classList.add('cb-managed-component');
        this._applyClasses(el, block.styleClasses);
        return el;
    }

    // ------------------------------------------------------------------
    // Private: utilities
    // ------------------------------------------------------------------

    /**
     * Stamp the two canonical identity attributes onto a block element.
     * Everything else in the codebase keys off data-block-uuid.
     */
    private _stamp(el: HTMLElement, blockUuid: string, kind: AnyBlock['kind']): void {
        el.setAttribute(ATTR_BLOCK_UUID, blockUuid);
        el.setAttribute(ATTR_BLOCK_KIND, kind);
    }

    private _applyClasses(el: HTMLElement, classes: string[]): void {
        for (const cls of classes) {
            if (cls) el.classList.add(cls);
        }
    }

    /**
     * Type-safe heading element factory.
     * Using a switch avoids the TypeScript template-literal overload issue
     * with document.createElement(`h${n}`).
     */
    private _createHeadingEl(level: 1 | 2 | 3 | 4 | 5 | 6): HTMLHeadingElement {
        switch (level) {
            case 1: return document.createElement('h1');
            case 2: return document.createElement('h2');
            case 3: return document.createElement('h3');
            case 4: return document.createElement('h4');
            case 5: return document.createElement('h5');
            case 6: return document.createElement('h6');
        }
    }
}

