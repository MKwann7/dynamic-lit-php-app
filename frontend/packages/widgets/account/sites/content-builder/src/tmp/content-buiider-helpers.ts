import type { AddContentMode, ContentBuilderRuntime, TextRange } from './content-builder-types';
import { DomUtils } from './dom-utils';

interface FontDefinition {
    provider: '' | 'google';
    family: string;
    preview: string;
    style?: string;
    display?: string;
    label?: string;
    transform?: string;
}

export class ContentBuilderHelpers {
    private readonly dom = new DomUtils();

    constructor(private readonly builder: ContentBuilderRuntime) {}

    cellSelected(): HTMLElement | null {
        return document.querySelector<HTMLElement>('.cell-active');
    }

    builderStuff(): HTMLElement | null {
        return document.querySelector<HTMLElement>('#_cbhtml');
    }

    cellNext(cell: HTMLElement): HTMLElement | null {
        const next = cell.nextElementSibling as HTMLElement | null;
        if (!next) return null;
        if (
            this.dom.hasClass(next, 'is-row-tool') ||
            this.dom.hasClass(next, 'is-rowadd-tool') ||
            this.dom.hasClass(next, 'is-row-overlay')
        ) {
            return null;
        }
        return next;
    }

    out(key: string): string {
        const translated = this.builder?.opts.lang[key];
        if (!translated && this.builder?.opts.checkLang) console.log(key);
        return translated || key;
    }

    confirm(message: string, callback: (confirmed: boolean) => void): void {
        const html = `
      <div class="is-modal is-confirm">
        <div class="is-modal-content" style="padding-bottom:20px;">
          <p>${message}</p>
          <button title="${this.out('Delete')}" class="input-ok classic">${this.out('Delete')}</button>
        </div>
      </div>`;

        const root = this.builder.builderStuff;
        let modal = root.querySelector<HTMLElement>('.is-confirm');
        if (!modal) {
            this.dom.appendHtml(root, html);
            modal = root.querySelector<HTMLElement>('.is-confirm')!;
        }

        this.showModal(
            modal,
            false,
            () => {
                modal?.parentNode?.removeChild(modal);
                callback(false);
            },
            true,
        );

        const button = modal.querySelector<HTMLElement>('.is-confirm .input-ok');
        this.dom.addEventListener(button, 'click', () => {
            this.hideModal(modal!);
            modal?.parentNode?.removeChild(modal);
            callback(true);
        });
    }

    showModal(modal: HTMLElement, overlayStay: boolean, onOverlayClick?: () => void, forceAnimate?: boolean): void {
        this.dom.addClass(modal, 'active');

        let shouldScaleBackground = false;
        if (this.builder) {
            shouldScaleBackground = !!this.builder.opts.animateModal;
            if (forceAnimate) shouldScaleBackground = true;
            if (!forceAnimate && !this.builder.opts.animateModal) shouldScaleBackground = false;
        } else if (forceAnimate) {
            shouldScaleBackground = true;
        }

        if (shouldScaleBackground) {
            const containers = document.querySelectorAll<HTMLElement>(this.builder.opts.container);
            Array.prototype.forEach.call(containers, (container: HTMLElement) => {
                const scale = this.builder.opts.zoom - 0.02;
                container.style.transform = `scale(${scale})`;
                (container.style as any).WebkitTransform = `scale(${scale})`;
                (container.style as any).MozTransform = `scale(${scale})`;
                container.setAttribute('scaled-down', '1');
            });
        }

        if (modal.querySelector('.is-modal-overlay')) return;

        const overlayHtml = overlayStay
            ? '<div class="is-modal-overlay overlay-stay"></div>'
            : '<div class="is-modal-overlay"></div>';
        modal.insertAdjacentHTML('afterbegin', overlayHtml);

        if (!overlayStay) {
            const overlay = modal.querySelector<HTMLElement>('.is-modal-overlay');
            this.dom.addEventListener(overlay, 'click', () => {
                onOverlayClick?.();
                this.hideModal(modal);
            });
        }
    }

    hideModal(modal: HTMLElement): void {
        const containers = document.querySelectorAll<HTMLElement>(this.builder.opts.container);
        Array.prototype.forEach.call(containers, (container: HTMLElement) => {
            if (!container.getAttribute('scaled-down')) return;
            container.style.transform = `scale(${this.builder.opts.zoom})`;
            (container.style as any).WebkitTransform = `scale(${this.builder.opts.zoom})`;
            (container.style as any).MozTransform = `scale(${this.builder.opts.zoom})`;
            container.removeAttribute('scaled-down');
        });

        this.dom.removeClass(modal, 'active');
    }

    fixLayout(row: HTMLElement): void {
        let overlayOffset = 2;
        if (row.querySelector('.is-row-overlay')) overlayOffset = 3;

        const columnCount = row.childElementCount - overlayOffset;
        const { row: rowClass, cols, colequal } = this.builder.opts;

        if (colequal.length > 0) {
            this.dom.elementChildren(row).forEach((child) => {
                if (
                    this.dom.hasClass(child, 'is-row-tool') ||
                    this.dom.hasClass(child, 'is-rowadd-tool') ||
                    this.dom.hasClass(child, 'is-row-overlay')
                ) return;

                for (const col of cols) this.dom.removeClass(child, col);
                for (const equalGroup of colequal) {
                    if (equalGroup.length === columnCount) {
                        this.dom.addClass(child, equalGroup[0]);
                        break;
                    }
                }
                if (columnCount === 1) this.dom.addClass(child, cols[cols.length - 1]);
            });
            return;
        }

        if (rowClass === '' || cols.length === 0) return;

        let index = 0;
        this.dom.elementChildren(row).forEach((child) => {
            if (
                this.dom.hasClass(child, 'is-row-tool') ||
                this.dom.hasClass(child, 'is-rowadd-tool') ||
                this.dom.hasClass(child, 'is-row-overlay')
            ) return;

            index += 1;
            for (const col of cols) this.dom.removeClass(child, col);

            if (columnCount === 1) this.dom.addClass(child, cols[11]);
            if (columnCount === 2) this.dom.addClass(child, cols[5]);
            if (columnCount === 3) this.dom.addClass(child, cols[3]);
            if (columnCount === 4) this.dom.addClass(child, cols[2]);
            if (columnCount === 5) this.dom.addClass(child, index === 5 ? cols[3] : cols[1]);
            if (columnCount === 6) this.dom.addClass(child, cols[1]);
            if (columnCount === 7) this.dom.addClass(child, index >= 6 ? cols[0] : cols[1]);
            if (columnCount === 8) this.dom.addClass(child, index >= 5 ? cols[0] : cols[1]);
            if (columnCount === 9) this.dom.addClass(child, index >= 4 ? cols[0] : cols[1]);
            if (columnCount === 10) this.dom.addClass(child, index >= 3 ? cols[0] : cols[1]);
            if (columnCount === 11) this.dom.addClass(child, index >= 2 ? cols[0] : cols[1]);
            if (columnCount === 12) this.dom.addClass(child, cols[0]);
        });
    }

    addContent(html: string, mode: AddContentMode, attributeName?: string): false | void {
        if (this.builder.opts.onAdd) html = this.builder.opts.onAdd(html);

        const selectedCell = this.cellSelected();
        let row: HTMLElement | null;
        if (selectedCell) {
            row = selectedCell.parentNode as HTMLElement;
        } else {
            row = document.querySelector<HTMLElement>('.row-active');
            if (!row) return;
            mode = 'row';
        }

        if (mode === 'cell' || mode === 'cell-left' || mode === 'cell-right') {
            const maxColumns = this.builder.maxColumns ?? 4;
            let overlayOffset = 2;
            if (row.querySelector('.is-row-overlay')) overlayOffset = 3;

            if (row.childElementCount >= maxColumns + overlayOffset) {
                alert(this.out('You have reached the maximum number of columns'));
                return false;
            }

            this.builder.uo.saveForUndo();

            let cell: HTMLElement;
            if (this.builder.opts.row === '') {
                const cellFormat = this.builder.opts.cellFormat;
                const closingIndex = cellFormat.indexOf('</');
                const merged = cellFormat.substring(0, closingIndex) + html + cellFormat.substring(closingIndex);
                cell = this.createElementFromHTML(merged);
            } else {
                cell = selectedCell!.cloneNode(true) as HTMLElement;
                cell.removeAttribute('data-noedit');
                cell.removeAttribute('data-protected');
                cell.removeAttribute('data-module');
                cell.removeAttribute('data-module-desc');
                cell.removeAttribute('data-dialog-width');
                cell.removeAttribute('data-html');
                cell.removeAttribute('data-settings');
                for (let i = 1; i <= 20; i += 1) cell.removeAttribute(`data-html-${i}`);
                this.dom.removeClass(cell, 'cell-active');
                cell.removeAttribute('data-click');
                if (attributeName) cell.setAttribute(attributeName, '');
                cell.innerHTML = html;
            }

            row.insertBefore(cell, selectedCell!);
            if (mode === 'cell' || mode === 'cell-right') this.dom.moveAfter(cell, selectedCell!);

            this.builder.applyBehavior();
            this.fixLayout(row);
            cell.click();
        }

        if (mode === 'row') {
            this.builder.uo.saveForUndo();

            let newRow: HTMLElement;
            let newCell: HTMLElement;
            if (this.builder.opts.row === '') {
                newRow = this.htmlToElement(this.builder.opts.rowFormat);
                const cellFormat = this.builder.opts.cellFormat;
                const closingIndex = cellFormat.indexOf('</');
                html = cellFormat.substring(0, closingIndex) + html + cellFormat.substring(closingIndex);

                let target: HTMLElement | HTMLElement[] = this.dom.elementChildren(newRow);
                while (Array.isArray(target) || this.dom.elementChildren(target as HTMLElement).length > 0) {
                    const next: HTMLElement | undefined = Array.isArray(target) ? target[0] : this.dom.elementChildren(target as HTMLElement)[0];
                    if (!next) break;
                    target = next;
                    if (this.dom.elementChildren(target as HTMLElement).length === 0) break;
                }

                newCell = target as HTMLElement;
                newCell.innerHTML = html;
                const firstChild = newCell.firstChild as HTMLElement | null;
                if (attributeName && firstChild) firstChild.setAttribute(attributeName, '');
            } else {
                newCell = this.dom.createElement('div');
                this.dom.addClass(newCell, this.builder.opts.cols[this.builder.opts.cols.length - 1]);
                newCell.innerHTML = html;
                if (attributeName) newCell.setAttribute(attributeName, '');
                newRow = this.dom.createElement('div');
                this.dom.addClass(newRow, this.builder.opts.row);
                this.dom.appendChild(newRow, newCell);
            }

            row.parentNode?.insertBefore(newRow, row);
            this.dom.moveAfter(newRow, row);
            this.builder.applyBehavior();
            newCell.click();
        }

        if (mode === 'elm') {
            const active = this.builder.activeElement;
            if (!active) return;

            this.builder.uo.saveForUndo();
            active.insertAdjacentHTML('afterend', html);
            this.builder.applyBehavior();
            const next = active.nextElementSibling as HTMLElement | null;
            if (!next) return;

            if (next.tagName.toLowerCase() === 'img') {
                const timeoutId = window.setTimeout(() => {
                    const image = next as HTMLImageElement;
                    if (image.complete) image.click();
                }, 200);
                window.clearTimeout(timeoutId - 1);
            } else {
                next.click();
            }
        }

        this.builder.opts.onChange();
    }

    htmlToElement(html: string): HTMLElement {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild as HTMLElement;
    }

    createElementFromHTML(html: string): HTMLElement {
        return this.htmlToElement(html);
    }

    addSnippet(html: string, forceMode?: boolean, noEdit?: boolean): void {
        this.builder.uo.saveForUndo();

        const quickAdd = this.builder.builderStuff.querySelector('.quickadd');
        const mode = quickAdd?.getAttribute('data-mode') as AddContentMode | null;

        let row: HTMLElement | null = null;
        let newRow: HTMLElement | null = null;
        let newCell: HTMLElement | null = null;
        let tool: HTMLElement | null = null;
        let fallbackToLastBuilder = false;

        if (!forceMode || (mode !== 'cell' && mode !== 'cell-left' && mode !== 'cell-right')) {
            if (forceMode && mode === 'row') {
                newCell = document.createElement('div');
                newCell.className = this.builder.opts.cols[this.builder.opts.cols.length - 1];
                newCell.innerHTML = html;
                if (noEdit) newCell.setAttribute('data-noedit', '');

                newRow = document.createElement('div');
                newRow.className = this.builder.opts.row;
                newRow.appendChild(newCell);

                const selected = this.cellSelected();
                if (selected) row = selected.parentNode as HTMLElement;
                else {
                    row = document.querySelector<HTMLElement>('.row-active');
                    if (!row) fallbackToLastBuilder = true;
                }

                if (fallbackToLastBuilder) {
                    const builders = document.querySelectorAll<HTMLElement>('.is-builder');
                    const lastBuilder = builders[builders.length - 1];
                    const children = this.dom.elementChildren(lastBuilder);
                    row = children[children.length - 1];
                }

                row!.parentNode?.insertBefore(newRow, row!);
                this.dom.moveAfter(newRow!, row!);
                this.builder.applyBehavior();
                newCell.click();
                newRow.className = newRow.className.replace('row-outline', '');
                tool = document.querySelector<HTMLElement>('.is-column-tool');
                if (tool) tool.className = tool.className.replace('active', '');
            } else {
                if (forceMode) {
                    if (noEdit) this.addContent(html, mode!, 'data-noedit');
                    else this.addContent(html, mode!);
                    this.builder.opts.onChange();
                    return;
                }

                const wrapper = document.createElement('div');
                wrapper.innerHTML = html;

                const templatedNodes = wrapper.querySelectorAll<HTMLElement>('[data-html]');
                Array.prototype.forEach.call(templatedNodes, (node: HTMLElement) => {
                    let decoded = decodeURIComponent(node.getAttribute('data-html') ?? '').replace(/{id}/g, this.makeId());
                    for (let i = 1; i <= 20; i += 1) {
                        decoded = decoded.replace(
                            `[%HTML${i}%]`,
                            node.getAttribute(`data-html-${i}`) === undefined
                                ? ''
                                : decodeURIComponent(node.getAttribute(`data-html-${i}`) ?? ''),
                        );
                    }
                    node.innerHTML = decoded;
                });

                if (
                    wrapper.childNodes.length === 1 &&
                    wrapper.childNodes[0].childNodes.length === 1 &&
                    (mode === 'cell' || mode === 'cell-left' || mode === 'cell-right')
                ) {
                    const selected = this.cellSelected();
                    const selectedRow = selected!.parentNode as HTMLElement;
                    const maxColumns = this.builder.maxColumns ?? 4;
                    const childCount = selectedRow.childElementCount;
                    const limit = selectedRow.querySelector('.is-row-overlay') ? maxColumns + 3 : maxColumns + 2;

                    if (childCount >= limit) {
                        alert(this.out('You have reached the maximum number of columns'));
                        return;
                    }

                    this.builder.uo.saveForUndo();
                    const newNode = wrapper.childNodes[0].childNodes[0] as HTMLElement;
                    const range = document.createRange();
                    selected!.parentNode!.insertBefore(range.createContextualFragment(newNode.outerHTML), selected!);

                    if (mode === 'cell' || mode === 'cell-right') {
                        selected!.parentNode!.insertBefore(selected!.previousElementSibling!, selected!);
                        selected!.parentNode!.insertBefore(selected!, selected!.previousElementSibling!);
                    }

                    this.builder.applyBehavior();
                    this.fixLayout(selectedRow);
                    newNode.click();
                    this.builder.opts.onChange();
                    return;
                }

                row = this.builder.activeCol ? this.builder.activeCol.parentNode as HTMLElement : document.querySelector<HTMLElement>('.row-active');
                if (!row) fallbackToLastBuilder = true;

                if (fallbackToLastBuilder) {
                    const builders = document.querySelectorAll<HTMLElement>('.is-builder');
                    const lastBuilder = builders[builders.length - 1];
                    const children = this.dom.elementChildren(lastBuilder);
                    row = children[children.length - 1];
                }

                const range = document.createRange();
                row!.parentNode?.insertBefore(range.createContextualFragment(wrapper.innerHTML), row!.nextSibling);

                const top = row!.getBoundingClientRect().top + row!.offsetHeight + window.pageYOffset - 120;
                window.scroll({ top, behavior: 'smooth' });

                newRow = row!.nextElementSibling as HTMLElement | null;
                this.builder.applyBehavior();
                newCell = newRow?.childNodes[0] as HTMLElement | null;
                newCell?.click();

                if (newRow) newRow.className = newRow.className.replace('row-outline', '');
                tool = document.querySelector<HTMLElement>('.is-column-tool');
                if (tool) tool.className = tool.className.replace('active', '');
            }

            this.builder.opts.onChange();
            return;
        }

        if (noEdit) this.addContent(html, mode!, 'data-noedit');
        else this.addContent(html, mode!);
    }

    clearActiveCell(): void {
        const root = this.builder.builderStuff;
        if (!root) return;

        if (root.getAttribute('preventDevault')) {
            setTimeout(() => root.removeAttribute('preventDevault'), 30);
            return;
        }

        let matches = document.getElementsByClassName('cell-active');
        while (matches.length) matches[0].classList.remove('cell-active');
        matches = document.getElementsByClassName('row-outline');
        while (matches.length) matches[0].classList.remove('row-outline');
        matches = document.getElementsByClassName('row-active');
        while (matches.length) matches[0].classList.remove('row-active');
        matches = document.getElementsByClassName('builder-active');
        while (matches.length) matches[0].classList.remove('builder-active');

        const tool = root.querySelector('.is-column-tool');
        if (tool) this.dom.removeClass(tool, 'active');

        const elementTool = root.querySelector<HTMLElement>('.is-element-tool');
        if (elementTool) elementTool.style.display = '';

        this.builder.activeCol = null;
    }

    clearAfterUndoRedo(): void {
        const root = this.builder.builderStuff;
        const tools = root.querySelectorAll<HTMLElement>('.is-tool');
        Array.prototype.forEach.call(tools, (tool: HTMLElement) => {
            tool.style.display = '';
        });

        this.builder.moveable.updateRect();
        const moveableControlBox = document.querySelector<HTMLElement>('.moveable-control-box');
        if (moveableControlBox) moveableControlBox.style.display = 'none';

        this.builder.activeSpacer = null;
        this.builder.activeCodeBlock = null;
        this.builder.activeLink = null;
        this.builder.activeIframe = null;
        this.builder.activeTd = null;
        this.builder.activeTable = null;
        this.builder.activeModule = null;

        const activeIcons = document.querySelectorAll<HTMLElement>('.icon-active');
        Array.prototype.forEach.call(activeIcons, (icon: HTMLElement) => this.dom.removeClass(icon, 'icon-active'));
        this.builder.activeIcon = null;

        let buttons = root.querySelector('.is-rte-tool')?.querySelectorAll('button') ?? [];
        Array.prototype.forEach.call(buttons, (button: HTMLElement) => this.dom.removeClass(button, 'on'));
        buttons = root.querySelector('.is-elementrte-tool')?.querySelectorAll('button') ?? [];
        Array.prototype.forEach.call(buttons, (button: HTMLElement) => this.dom.removeClass(button, 'on'));

        const pops = root.querySelectorAll<HTMLElement>('.is-pop');
        Array.prototype.forEach.call(pops, (pop: HTMLElement) => {
            pop.style.display = '';
        });
    }

    hideControls(): void {
        const tools = this.builder.builderStuff.querySelectorAll<HTMLElement>('.is-tool');
        Array.prototype.forEach.call(tools, (tool: HTMLElement) => {
            tool.style.display = '';
        });
        this.builder.moveable.updateRect();
        const moveableControlBox = document.querySelector<HTMLElement>('.moveable-control-box');
        if (moveableControlBox) moveableControlBox.style.display = 'none';
    }

    clearActiveElement(resetBuilderRefs: boolean): void {
        const root = this.builder.builderStuff;

        const activeIcons = document.querySelectorAll<HTMLElement>('.icon-active');
        Array.prototype.forEach.call(activeIcons, (icon: HTMLElement) => this.dom.removeClass(icon, 'icon-active'));

        let inspected = document.querySelectorAll<HTMLElement>('.elm-inspected');
        Array.prototype.forEach.call(inspected, (element: HTMLElement) => this.dom.removeClass(element, 'elm-inspected'));

        let activeElements = document.querySelectorAll<HTMLElement>('.elm-active');
        Array.prototype.forEach.call(activeElements, (element: HTMLElement) => this.dom.removeClass(element, 'elm-active'));

        const elementTool = root.querySelector<HTMLElement>('.is-element-tool');
        if (elementTool) elementTool.style.display = '';

        const linkTool = root.querySelector<HTMLElement>('#divLinkTool');
        if (linkTool) linkTool.style.display = '';

        if (!resetBuilderRefs) return;

        this.builder.activeIcon = null;
        this.builder.inspectedElement = null;
        this.builder.activeElement = null;

        const rteTool = root.querySelector<HTMLElement>('.is-rte-tool');
        if (rteTool) rteTool.style.display = 'none';

        const elementRteTool = root.querySelector<HTMLElement>('.is-elementrte-tool');
        if (elementRteTool) elementRteTool.style.display = 'flex';

        const rteMore = root.querySelector<HTMLElement>('.rte-more-options');
        if (rteMore) rteMore.style.display = '';

        const elementRteMore = root.querySelector<HTMLElement>('.elementrte-more-options');
        if (elementRteMore) elementRteMore.style.display = '';

        const alignButtons = elementRteTool?.querySelectorAll<HTMLElement>('button[data-align]') ?? [];
        Array.prototype.forEach.call(alignButtons, (button: HTMLElement) => {
            button.style.display = 'none';
        });

        this.builder.rte.positionToolbar();
    }

    clearControls(): void {
        const root = this.builder.builderStuff;
        if (!root) return;

        if (root.getAttribute('preventDevault')) {
            setTimeout(() => root.removeAttribute('preventDevault'), 30);
            return;
        }

        const tools = root.querySelectorAll<HTMLElement>('.is-tool');
        Array.prototype.forEach.call(tools, (tool: HTMLElement) => {
            tool.style.display = '';
        });

        this.builder.moveable.updateRect();
        const moveableControlBox = document.querySelector<HTMLElement>('.moveable-control-box');
        if (moveableControlBox) moveableControlBox.style.display = 'none';

        this.builder.activeSpacer = null;
        this.builder.activeCodeBlock = null;
        this.builder.activeLink = null;
        this.builder.activeIframe = null;
        this.builder.activeTd = null;
        this.builder.activeTable = null;
        this.builder.activeModule = null;
        this.builder.activeImage = null;

        const activeIcons = document.querySelectorAll<HTMLElement>('.icon-active');
        Array.prototype.forEach.call(activeIcons, (icon: HTMLElement) => this.dom.removeClass(icon, 'icon-active'));
        this.builder.activeIcon = null;

        const overlays = document.querySelectorAll<HTMLElement>('.ovl');
        Array.prototype.forEach.call(overlays, (overlay: HTMLElement) => {
            overlay.style.display = 'block';
        });

        const sidePanels = root.querySelectorAll<HTMLElement>('.is-side.elementstyles');
        Array.prototype.forEach.call(sidePanels, (panel: HTMLElement) => this.dom.removeClass(panel, 'active'));

        let dirtyNodes = document.querySelectorAll<HTMLElement>('[data-saveforundo]');
        Array.prototype.forEach.call(dirtyNodes, (node: HTMLElement) => node.removeAttribute('data-saveforundo'));
        dirtyNodes = document.querySelectorAll<HTMLElement>('.elm-inspected');
        Array.prototype.forEach.call(dirtyNodes, (node: HTMLElement) => this.dom.removeClass(node, 'elm-inspected'));

        const rteTool = root.querySelector<HTMLElement>('.is-rte-tool');
        if (rteTool) rteTool.style.display = 'none';

        const elementRteTool = root.querySelector<HTMLElement>('.is-elementrte-tool');
        if (elementRteTool) elementRteTool.style.display = 'none';

        const rteMore = root.querySelector<HTMLElement>('.rte-more-options');
        if (rteMore) rteMore.style.display = '';

        const elementRteMore = root.querySelector<HTMLElement>('.elementrte-more-options');
        if (elementRteMore) elementRteMore.style.display = '';

        dirtyNodes = document.querySelectorAll<HTMLElement>('.elm-active');
        Array.prototype.forEach.call(dirtyNodes, (node: HTMLElement) => this.dom.removeClass(node, 'elm-active'));

        const rtePops = root.querySelectorAll<HTMLElement>('.is-rte-pop');
        Array.prototype.forEach.call(rtePops, (pop: HTMLElement) => {
            pop.style.display = '';
            this.dom.removeClass(pop, 'active');
            this.dom.removeClass(pop, 'deactive');
        });

        if (this.builder.colTool?.lockIndicator) this.builder.colTool.lockIndicator.style.display = '';
    }

    makeId(): string {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const alphaNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        let head = '';
        for (let i = 0; i < 2; i += 1) head += letters.charAt(Math.floor(Math.random() * letters.length));

        let tail = '';
        for (let i = 0; i < 5; i += 1) tail += alphaNum.charAt(Math.floor(Math.random() * alphaNum.length));
        return head + tail;
    }

    saveSelection(): Range[] | TextRange | null {
        if (window.getSelection) {
            const selection = window.getSelection();
            if (selection?.getRangeAt && selection.rangeCount) {
                const ranges: Range[] = [];
                for (let i = 0; i < selection.rangeCount; i += 1) ranges.push(selection.getRangeAt(i));
                this.builder.selection = ranges;
                return ranges;
            }
        } else if ((document as any).selection?.createRange) {
            const range = (document as any).selection.createRange();
            this.builder.selection = range;
            return range;
        }

        this.builder.selection = null;
        return null;
    }

    restoreSelection(): void {
        const selectionState = this.builder.selection;
        if (!selectionState) return;

        if (window.getSelection) {
            const selection = window.getSelection();

            if ((document.body as any).createTextRange) {
                const range = (document.body as any).createTextRange();
                range.collapse();
                range.select();
            } else if ((selection as any)?.empty) {
                (selection as any).empty();
            } else if (selection?.removeAllRanges) {
                selection.removeAllRanges();
            } else if ((document as any).selection?.empty) {
                (document as any).selection.empty();
            }

            if (Array.isArray(selectionState)) for (const range of selectionState) selection?.addRange(range);
        } else if ((document as any).selection && (selectionState as any).select) {
            (selectionState as any).select();
        }
    }

    cleanHTML(html: string, preserveSpanTags?: boolean): string {
        let result = html.replace(/(\n|\r| class=(")?Mso[a-zA-Z]+(")?)/g, ' ');
        result = result.replace(/<!--(.*?)-->/g, '');

        let tagPattern = preserveSpanTags
            ? new RegExp('<(/)*(meta|link|span|\\?xml:|st1:|o:|font)(.*?)>', 'gi')
            : new RegExp('<(/)*(meta|link|\\?xml:|st1:|o:|font)(.*?)>', 'gi');
        result = result.replace(tagPattern, '');

        const stripBlocks = ['style', 'script', 'applet', 'embed', 'noframes', 'noscript'];
        for (const tag of stripBlocks) {
            tagPattern = new RegExp(`<${tag}.*?${tag}(.*?)>`, 'gi');
            result = result.replace(tagPattern, '');
        }

        const attributes = preserveSpanTags ? ['style', 'start'] : ['start'];
        for (const attribute of attributes) result = result.replace(new RegExp(` ${attribute}="(.*?)"`, 'gi'), '');

        result = result.replace(/<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|img|meta|link|style|\w:\w+)(?=[\s/>]))[^>]*>/gi, '');
        result = result.replace(/<(\/?)s>/gi, '<$1strike>');
        result = result.replace(/&nbsp;/gi, ' ');
        result = result.replace(/background-color: rgba\(200, 200, 201, 0.11\);/gi, '');
        result = result.replace(/background-color: rgba\(200, 200, 201, 0.11\)/gi, '');
        return result;
    }

    checkEmpty(): void {
        const containers = document.querySelectorAll<HTMLElement>(this.builder.opts.container);

        Array.prototype.forEach.call(containers, (container: HTMLElement) => {
            const children = this.dom.elementChildren(container);
            let isEmpty = true;

            children.forEach((child) => {
                if (!this.dom.hasClass(child, 'row-add-initial') && !this.dom.hasClass(child, 'dummy-space')) isEmpty = false;
            });

            if (!isEmpty) {
                const initialButton = container.querySelector('.row-add-initial');
                initialButton?.parentNode?.removeChild(initialButton);
                return;
            }

            let button = container.querySelector<HTMLButtonElement>('.row-add-initial');
            if (!button) {
                container.innerHTML = `<button type="button" class="row-add-initial">${this.out('Empty')}<br><span>${this.out('+ Click to add content')}</span></div>`;
                button = container.querySelector<HTMLButtonElement>('.row-add-initial')!;
            }

            button.addEventListener('click', () => {
                this.clearActiveCell();
                this.dom.addClass(button!, 'row-active');

                const quickAdd = this.builder.builderStuff.querySelector<HTMLElement>('.quickadd');
                const tabs = quickAdd?.querySelector<HTMLElement>('.is-pop-tabs');
                if (tabs) tabs.style.display = 'none';

                const windowHeight = window.innerHeight;
                let top = button!.getBoundingClientRect().top;
                const left = button!.getBoundingClientRect().left + (button!.offsetWidth * this.builder.opts.zoom) / 2 - 11;

                if (!quickAdd) return;
                quickAdd.style.display = 'flex';
                const width = quickAdd.offsetWidth;
                const height = quickAdd.offsetHeight;

                if (windowHeight - top > height) {
                    top = top + button!.offsetHeight * this.builder.opts.zoom - 19;
                    quickAdd.style.top = `${top + window.pageYOffset + 27}px`;
                    quickAdd.style.left = `${left - width / 2 + 7}px`;
                    this.dom.removeClass(quickAdd, 'arrow-bottom');
                    this.dom.removeClass(quickAdd, 'arrow-right');
                    this.dom.removeClass(quickAdd, 'arrow-left');
                    this.dom.removeClass(quickAdd, 'center');
                    this.dom.addClass(quickAdd, 'arrow-top');
                    this.dom.addClass(quickAdd, 'center');
                } else {
                    quickAdd.style.top = `${top + window.pageYOffset - height - 8}px`;
                    quickAdd.style.left = `${left - width / 2 + 7}px`;
                    this.dom.removeClass(quickAdd, 'arrow-top');
                    this.dom.removeClass(quickAdd, 'arrow-right');
                    this.dom.removeClass(quickAdd, 'arrow-left');
                    this.dom.removeClass(quickAdd, 'center');
                    this.dom.addClass(quickAdd, 'arrow-bottom');
                    this.dom.addClass(quickAdd, 'center');
                }

                quickAdd.setAttribute('data-mode', 'row');
            });
        });
    }

    clearPreferences(): void {
        const keys = [
            '_theme', '_zoom', '_buildermode', '_editingtoolbar', '_editingtoolbardisplay', '_hidecelltool', '_rowtool',
            '_hideelementtool', '_hidesnippetaddtool', '_outlinemode', '_hiderowcoloutline', '_outlinestyle',
            '_hideelementhighlight', '_opensnippets', '_toolstyle', '_snippetssidebardisplay', '_pasteresult',
            '_scrollableeditor', '_animatedsorting', '_addbuttonplace', '_hiderowtool', '_dragwithouthandle',
            '_advancedhtmleditor', '_hidecolhtmleditor', '_hiderowhtmleditor',
        ];
        keys.forEach((key) => localStorage.removeItem(key));
    }

    pasteHtmlAtCaret(html: string, selectInsertedContent?: boolean): void {
        this.restoreSelection();

        if (window.getSelection) {
            if (!this.builder.activeCol) return;

            const selection = window.getSelection();
            if (!selection?.getRangeAt || !selection.rangeCount) return;

            let range = selection.getRangeAt(0);
            range.deleteContents();

            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            const fragment = document.createDocumentFragment();
            let child: ChildNode | null;
            let lastNode: ChildNode | null = null;
            while ((child = wrapper.firstChild)) lastNode = fragment.appendChild(child);
            const firstNode = fragment.firstChild;
            range.insertNode(fragment);

            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                if (selectInsertedContent && firstNode) range.setStartBefore(firstNode);
                else range.collapse(true);
                selection.removeAllRanges();
                if (!this.builder.isTouchSupport) selection.addRange(range);
            }
            return;
        }

        const legacySelection = (document as any).selection;
        if (!legacySelection || legacySelection.type === 'Control') return;
        if (!this.builder.activeCol) return;

        const collapsed = legacySelection.createRange();
        collapsed.collapse(true);
        legacySelection.createRange().pasteHTML(html);

        if (selectInsertedContent) {
            const range = legacySelection.createRange();
            range.setEndPoint('StartToStart', collapsed);
            if (!this.builder.isTouchSupport) range.select();
        }
    }

    refreshModule(): void {
        const module = this.builder.activeModule;
        if (!module) return;

        let index = 1;
        const subBlocks = module.querySelectorAll<HTMLElement>('[data-subblock]');
        Array.prototype.forEach.call(subBlocks, (subBlock: HTMLElement) => {
            module.setAttribute(`data-html-${index}`, encodeURIComponent(subBlock.innerHTML));
            index += 1;
        });

        let html = decodeURIComponent(module.getAttribute('data-html') ?? '');
        html = html.replace(/{id}/g, this.makeId());
        module.innerHTML = '';

        const range = document.createRange();
        range.setStart(module, 0);
        module.appendChild(range.createContextualFragment(html));

        const rebuiltBlocks = module.querySelectorAll<HTMLElement>('[data-subblock]');
        let rebuiltIndex = 1;
        Array.prototype.forEach.call(rebuiltBlocks, (subBlock: HTMLElement) => {
            const value = module.getAttribute(`data-html-${rebuiltIndex}`);
            if (value) subBlock.innerHTML = decodeURIComponent(value);
            rebuiltIndex += 1;
        });
    }

    isTouchSupport(): boolean {
        return !!window.matchMedia('(pointer: coarse)').matches;
    }

    detectIE(): boolean {
        return !!(document as any).documentMode;
    }

    lightenDarkenColor(color: string, amount: number): string {
        let useHash = false;
        let value = color;

        if (value[0] === '#') {
            value = value.slice(1);
            useHash = true;
        }

        const num = parseInt(value, 16);
        let red = (num >> 16) + amount;
        let green = ((num >> 8) & 0xff) + amount;
        let blue = (num & 0xff) + amount;

        red = Math.max(0, Math.min(255, red));
        green = Math.max(0, Math.min(255, green));
        blue = Math.max(0, Math.min(255, blue));

        return `${useHash ? '#' : ''}${`000000${(blue | (green << 8) | (red << 16)).toString(16)}`.slice(-6)}`;
    }

    getUIStyles(): void {
        this.dom.appendHtml(
            this.builder.builderStuff,
            '<button class="style-helper"><svg><use xlink:href="#ion-code-working"></use></svg></button>' +
            '<input type="text" class="style-helper-input" style="display:none;">' +
            '<label class="style-helper-label" style="display:none;"></label>' +
            '<input class="style-helper-checkbox" type="checkbox" style="display:none;">' +
            '<button class="style-helper-button-classic classic" style="display:none;"><svg><use xlink:href="#ion-code-working"></use></svg></button>' +
            '<select class="style-helper-select" style="display:none;"><option value=""></option></select>',
        );

        const helper = this.builder.builderStuff.querySelector<HTMLElement>('.style-helper')!;
        const input = this.builder.builderStuff.querySelector<HTMLInputElement>('.style-helper-input')!;
        const label = this.builder.builderStuff.querySelector<HTMLElement>('.style-helper-label')!;
        const select = this.builder.builderStuff.querySelector<HTMLSelectElement>('.style-helper-select')!;
        const classicButton = this.builder.builderStuff.querySelector<HTMLElement>('.style-helper-button-classic')!;

        this.builder.styleModalColor = this.getUIStyleValue(helper, 'modal-color', 'background-color');
        this.builder.styleModalBackground = this.getUIStyleValue(helper, 'modal-background', 'background-color');
        this.builder.styleButtonPickColorBorder = this.getUIStyleValue(helper, 'button-pickcolor-border', 'border');
        this.builder.styleButtonPickColorBackground = this.getUIStyleValue(helper, 'button-pickcolor-background', 'background-color');
        this.builder.styleToolBackground = window.getComputedStyle(helper, null).getPropertyValue('background-color');
        this.builder.styleButtonColor = window.getComputedStyle(helper, null).getPropertyValue('color');
        this.builder.styleButtonSvgFill = window.getComputedStyle(helper.querySelector('svg')!, null).getPropertyValue('fill');
        this.builder.styleButtonBackgroundHover = this.getUIStyleValue(helper, 'hover', 'background-color');
        this.builder.styleSnippetColor = this.getUIStyleValue(helper, 'snippet-color', 'background-color');
        this.builder.styleSnippetBackground = this.getUIStyleValue(helper, 'snippet-background', 'background-color');
        this.builder.styleSnippetTabsBackground = this.getUIStyleValue(helper, 'snippet-tabs-background', 'background-color');
        this.builder.styleSnippetTabItemBackground = this.getUIStyleValue(helper, 'snippet-tab-item-background', 'background-color');
        this.builder.styleSnippetTabItemBackgroundActive = this.getUIStyleValue(helper, 'snippet-tab-item-background-active', 'background-color');
        this.builder.styleSnippetTabItemBackgroundHover = this.getUIStyleValue(helper, 'snippet-tab-item-background-hover', 'background-color');
        this.builder.styleSnippetTabItemColor = this.getUIStyleValue(helper, 'snippet-tab-item-color', 'background-color');
        this.builder.styleSnippetMoreItemBackground = this.getUIStyleValue(helper, 'snippet-more-item-background', 'background-color');
        this.builder.styleSnippetMoreItemBackgroundActive = this.getUIStyleValue(helper, 'snippet-more-item-background-active', 'background-color');
        this.builder.styleSnippetMoreItemBackgroundHover = this.getUIStyleValue(helper, 'snippet-more-item-background-hover', 'background-color');
        this.builder.styleSnippetMoreItemColor = this.getUIStyleValue(helper, 'snippet-more-item-color', 'background-color');
        this.builder.styleTabsBackground = this.getUIStyleValue(helper, 'tabs-background', 'background-color');
        this.builder.styleTabItemBorderBottomActive = this.getUIStyleValue(helper, 'tab-item-active-border-bottom', 'border');
        this.builder.styleTabItemColor = this.getUIStyleValue(helper, 'tab-item-color', 'background-color');
        this.builder.styleTabsMoreBackground = this.getUIStyleValue(helper, 'tabs-more-background', 'background-color');
        this.builder.styleTabsMoreBorder = this.getUIStyleValue(helper, 'tabs-more-border', 'border');
        this.builder.styleTabsMoreItemColor = this.getUIStyleValue(helper, 'tabs-more-item-color', 'background-color');
        this.builder.styleTabsMoreBackgroundHover = this.getUIStyleValue(helper, 'tabs-more-item-background-hover', 'background-color');
        this.builder.styleSeparatorColor = this.getUIStyleValue(helper, 'separator-color', 'background-color');
        this.builder.styleSelectBackground = window.getComputedStyle(select, null).getPropertyValue('background-color');
        this.builder.styleSelectColor = window.getComputedStyle(select, null).getPropertyValue('color');
        this.builder.styleSelectOptionBackground = window.getComputedStyle(select.querySelector('option')!, null).getPropertyValue('background-color');
        this.builder.styleInputBackground = window.getComputedStyle(input, null).getPropertyValue('background-color');
        this.builder.styleInputBorderBottom = window.getComputedStyle(input, null).getPropertyValue('border-bottom');
        this.builder.styleInputColor = window.getComputedStyle(input, null).getPropertyValue('color');
        this.builder.styleLabelColor = window.getComputedStyle(label, null).getPropertyValue('color');
        this.builder.styleButtonClassicBackground = window.getComputedStyle(classicButton, null).getPropertyValue('background-color');
        this.builder.styleButtonClassicColor = window.getComputedStyle(classicButton, null).getPropertyValue('color');
        this.builder.styleButtonClassicBackgroundHover = this.getUIStyleValue(classicButton, 'hover', 'background-color');

        this.builder.styleDark = false;
        this.builder.styleColored = false;
        this.builder.styleColoredDark = false;
        this.builder.styleLight = false;

        const bodyClass = document.body.getAttribute('class') ?? '';
        if (bodyClass.includes('colored-dark')) this.builder.styleColoredDark = true;
        else if (bodyClass.includes('dark')) this.builder.styleDark = true;
        else if (bodyClass.includes('colored')) this.builder.styleColored = true;
        else if (bodyClass.includes('light')) this.builder.styleLight = true;
    }

    getUIStyleValue(element: HTMLElement, className: string, property: string): string {
        this.dom.addClass(element, className);
        const value = window.getComputedStyle(element, null).getPropertyValue(property);
        this.dom.removeClass(element, className);
        return value;
    }

    getFontFamilyStyle(modal = false): string {
        const color = modal ? this.builder.styleModalColor : this.builder.styleButtonColor;
        const background = modal ? this.builder.styleModalBackground : this.builder.styleToolBackground;
        const hover = modal ? this.builder.styleButtonClassicBackgroundHover : this.builder.styleButtonBackgroundHover;
        const baseModeMix = this.builder.styleDark || this.builder.styleColoredDark || (this.builder as any).styleColore ? '' : `
      #divFontList > div img { mix-blend-mode: multiply; }
    `;

        return `
      html, body { height:100% }
      body {
        overflow:hidden;
        margin:0;
        font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size:100%;
        line-height:1.7;
      }
      #divFontList { margin:0; padding:0 0 9px 9px; height:100%; overflow-y:scroll !important; box-sizing:border-box; }
      #divFontList > div { width:100%; cursor:pointer; overflow:hidden; text-align:center; position:relative; color:${color}; background:${background}; }
      #divFontList > div img { margin:7px 5px 0 5px; max-width:230px; max-height:27px; }
      #divFontList > div div { position:absolute; top:0; left:0; width:100%; height:100%; }
      #divFontList > div > div:after {
        background:${hover}; position:absolute; content:""; display:block; top:0; left:0; right:0; bottom:0; opacity:0;
      }
      #divFontList > div:hover > div:after, #divFontList > div.on > div:after { opacity:1; }
      ${baseModeMix}
      .dark #divFontList > div img { ${modal ? '' : 'mix-blend-mode: screen;'} filter:invert(1); }
      .colored-dark #divFontList > div img { ${modal ? '' : 'mix-blend-mode: screen;'} ${modal ? '' : 'filter:invert(1);'} }
      .colored #divFontList > div img { ${modal ? '' : 'mix-blend-mode: screen;'} ${modal ? '' : 'filter:invert(1);'} }
      .dark *, .colored-dark *, .colored *, .light * { scrollbar-width:thin; }
      .dark * { scrollbar-color:rgba(255,255,255,0.3) auto; }
      .colored-dark * { scrollbar-color:rgb(100,100,100) auto; }
      .colored *, .light * { scrollbar-color:rgba(0,0,0,0.4) auto; }
      .dark *::-webkit-scrollbar, .colored-dark *::-webkit-scrollbar, .colored *::-webkit-scrollbar, .light *::-webkit-scrollbar { width:12px; }
      .dark *::-webkit-scrollbar-track, .colored-dark *::-webkit-scrollbar-track, .colored *::-webkit-scrollbar-track, .light *::-webkit-scrollbar-track { background:transparent; }
      .dark *::-webkit-scrollbar-thumb { background-color:rgba(255,255,255,0.3); }
      .colored-dark *::-webkit-scrollbar-thumb { background-color:rgb(100,100,100); }
      .colored *::-webkit-scrollbar-thumb, .light *::-webkit-scrollbar-thumb { background-color:rgba(0,0,0,0.4); }
    `;
    }

    refreshFontFamilyStyle1(): void {
        const iframeDoc = this.builder.rte.rteFontFamilyOptions?.querySelector('iframe')?.contentWindow?.document;
        if (!iframeDoc) return;
        const mainStyle = iframeDoc.querySelector<HTMLElement>('#mainstyle');
        if (mainStyle) mainStyle.innerHTML = this.getFontFamilyStyle();
        iframeDoc.body.className = this.getThemeClass();
    }

    refreshFontFamilyStyle2(): void {
        const iframeDoc = this.builder.builderStuff
            .querySelector<HTMLIFrameElement>('.is-modal.pickfontfamily iframe')
            ?.contentWindow?.document;
        if (!iframeDoc) return;
        const mainStyle = iframeDoc.querySelector<HTMLElement>('#mainstyle');
        if (mainStyle) mainStyle.innerHTML = this.getFontFamilyStyle(true);
        iframeDoc.body.className = this.getThemeClass();
    }

    getFontPreview(): string {
        const assetPath = this.builder.fontAssetPath ?? '';
        const fonts: FontDefinition[] = [
            { provider: '', family: '', preview: '', label: this.out('None') },
            { provider: '', family: 'Arial, sans-serif', preview: 'arial.png' },
            { provider: '', family: 'courier', preview: 'courier.png' },
            { provider: '', family: 'Georgia, serif', preview: 'georgia.png' },
            { provider: '', family: 'monospace', preview: 'monospace.png' },
            { provider: '', family: 'sans-serif', preview: 'sans_serif.png' },
            { provider: '', family: 'serif', preview: 'serif.png' },
            { provider: 'google', family: 'Abel, sans-serif', preview: 'abel.png' },
            { provider: 'google', family: 'Abril Fatface', preview: 'abril_fatface.png' },
            { provider: 'google', family: 'Alegreya, serif', preview: 'alegreya.png', style: '400,400i,500,500i,700,700i,800,800i,900,900i' },
            { provider: 'google', family: 'Amatic SC, cursive', preview: 'amatic_sc.png', style: '400,700' },
            { provider: 'google', family: 'Anton, sans-serif', preview: 'anton.png' },
            { provider: 'google', family: 'Archivo Narrow, sans-serif', preview: 'archivo_narrow.png' },
            { provider: 'google', family: 'Cabin Condensed, sans-serif', preview: 'cabin_condensed.png' },
            { provider: 'google', family: 'Caveat, cursive', preview: 'caveat.png', style: '400,700' },
            { provider: 'google', family: 'Cinzel, serif', preview: 'cinzel.png' },
            { provider: 'google', family: 'Cormorant, serif', preview: 'cormorant.png', style: '300,300i,600,600i,700,700i' },
            { provider: 'google', family: 'EB Garamond, serif', preview: 'eb_garamond.png', style: '400,400i,600,600i,700,700i,800,800i' },
            { provider: 'google', family: 'Exo 2, sans-serif', preview: 'exo_2.png', style: '200,200i,600,600i,700,700i,800,800i,900,900i', display: 'swap' },
            { provider: 'google', family: 'Fira Sans, sans-serif', preview: 'fira_sans.png', style: '200,200i,500,500i,700,700i,800,800i,900,900i' },
            { provider: 'google', family: 'IBM Plex Sans, sans-serif', preview: 'ibm_plex_sans.png', style: '300,300i,500,500i,600,600i,700,700i' },
            { provider: 'google', family: 'Inconsolata, monospace', preview: 'inconsolata.png', style: '400,700' },
            { provider: 'google', family: 'Josefin Sans, sans-serif', preview: 'josefin_sans.png', style: '300,700' },
            { provider: 'google', family: 'Lato, sans-serif', preview: 'lato.png', style: '300,700' },
            { provider: 'google', family: 'Lobster, cursive', preview: 'lobster.png' },
            { provider: 'google', family: 'Lora, serif', preview: 'lora.png', style: '400,700' },
            { provider: 'google', family: 'Merriweather, serif', preview: 'merriweather.png', style: '300,700' },
            { provider: 'google', family: 'Montserrat, sans-serif', preview: 'montserrat.png', style: '300,400,700' },
            { provider: 'google', family: 'Noto Sans, sans-serif', preview: 'noto_sans.png', style: '400,400i,700,700i' },
            { provider: 'google', family: 'Nunito, sans-serif', preview: 'nunito.png', style: '200,200i,600,600i,700,700i,800,800i,900,900i' },
            { provider: 'google', family: 'Open Sans, sans-serif', preview: 'open_sans.png', style: '300,400,600,800' },
            { provider: 'google', family: 'Oswald, sans-serif', preview: 'oswald.png', style: '300,400,700' },
            { provider: 'google', family: 'Playfair Display, serif', preview: 'playfair_display.png', style: '400,400i,700,700i,900,900i' },
            { provider: 'google', family: 'Poppins, sans-serif', preview: 'poppins.png', style: '400,600' },
            { provider: 'google', family: 'PT Sans, sans-serif', preview: 'pt_sans.png', style: '400,400i,700,700i' },
            { provider: 'google', family: 'Quicksand, sans-serif', preview: 'quicksand.png' },
            { provider: 'google', family: 'Raleway, sans-serif', preview: 'raleway.png', style: '100' },
            { provider: 'google', family: 'Roboto, sans-serif', preview: 'roboto.png', style: '300' },
            { provider: 'google', family: 'Roboto Condensed, sans-serif', preview: 'roboto_condensed.png', style: '300,300i,700,700i' },
            { provider: 'google', family: 'Roboto Slab, serif', preview: 'roboto_slab.png', style: '200,600,700,800,900' },
            { provider: 'google', family: 'Rubik, sans-serif', preview: 'rubik.png', style: '300,300i,500,500i,700,700i,900,900i' },
            { provider: 'google', family: 'Source Sans Pro, sans-serif', preview: 'source_sans_pro.png', style: '200' },
            { provider: 'google', family: 'Source Code Pro, monospace', preview: 'source_code_pro.png', style: '300,700' },
            { provider: 'google', family: 'Ubuntu, sans-serif', preview: 'ubuntu.png', style: '300,300i,500,500i,700,700i' },
            { provider: 'google', family: 'Vollkorn, serif', preview: 'vollkorn.png', style: '400,400i,600,600i,700,700i,900,900i' },
            { provider: 'google', family: 'Yanone Kaffeesatz, sans-serif', preview: 'yanone_kaffeesatz.png', style: '300,700' },
        ];

        return fonts
            .map((font) => {
                if (font.label) {
                    return `<div data-provider="${font.provider}" data-font-family="${font.family}" style="font-size:12px;padding:10px 7px;box-sizing:border-box;"><div></div><span style="z-index:1;position:relative;">${font.label}</span></div>`;
                }
                const styleAttr = font.style ? ` data-font-style="${font.style}"` : '';
                const displayAttr = font.display ? ` data-font-display="${font.display}"` : '';
                const transform = font.transform ? ` style="transform:${font.transform};"` : '';
                return `<div data-provider="${font.provider}" data-font-family="${font.family}"${styleAttr}${displayAttr}><div></div><img${transform} src="${assetPath}${font.preview}"></div>`;
            })
            .join('\n');
    }

    getFontFamilyHTML(modal = false): string {
        const themeClass = this.getThemeClass();
        return `
      <!DOCTYPE HTML>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Fonts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="">
        <style id="mainstyle">${this.getFontFamilyStyle(modal)}</style>
      </head>
      <body${themeClass ? ` class="${themeClass}"` : ''}>
        <div id="divFontList">${this.getFontPreview()}</div>
        <script type="text/javascript">
          var elms = document.querySelectorAll('#divFontList > div');
          for (var i = 0; i < elms.length; i++) {
            elms[i].addEventListener('click', function (e) {
              var elm = e.target.parentNode;
              var on = false;
              if (elm.className && elm.className.indexOf('on') !== -1) on = true;
              if (on) {
                parent._cb.clearFont();
              } else {
                var provider = elm.getAttribute('data-provider');
                var fontfamily = elm.getAttribute('data-font-family');
                var fontstyle = elm.getAttribute('data-font-style');
                var fontdisplay = elm.getAttribute('data-font-display');
                parent._cb.setFont(fontfamily, fontstyle, fontdisplay, provider);
              }
            });
          }
        <\/script>
      </body>
      </html>
    `;
    }

    getFontFamilyEmail(modal = false): string {
        const assetPath = this.builder.fontAssetPath ?? '';
        const themeClass = this.getThemeClass();
        return `
      <!DOCTYPE HTML>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Fonts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="">
        <style>${this.getFontFamilyStyle(modal)}</style>
      </head>
      <body${themeClass ? ` class="${themeClass}"` : ''}>
        <div id="divFontList">
          <div data-provider="" data-font-family="" style="font-size:12px;padding:10px 7px;box-sizing:border-box;"><div></div>${this.out('None')}</div>
          <div data-provider="" data-font-family="Arial, sans-serif"><div></div><img src="${assetPath}arial.png"></div>
          <div data-provider="" data-font-family="courier"><div></div><img src="${assetPath}courier.png"></div>
          <div data-provider="" data-font-family="Georgia, serif"><div></div><img src="${assetPath}georgia.png"></div>
          <div data-provider="" data-font-family="monospace"><div></div><img src="${assetPath}monospace.png"></div>
          <div data-provider="" data-font-family="sans-serif"><div></div><img src="${assetPath}sans_serif.png"></div>
          <div data-provider="" data-font-family="serif"><div></div><img src="${assetPath}serif.png"></div>
        </div>
        <script type="text/javascript">
          var elms = document.querySelectorAll('#divFontList > div');
          for (var i = 0; i < elms.length; i++) {
            elms[i].addEventListener('click', function (e) {
              var elm = e.target.parentNode;
              var on = false;
              if (elm.className && elm.className.indexOf('on') !== -1) on = true;
              if (on) {
                parent._cb.clearFont();
              } else {
                var provider = elm.getAttribute('data-provider');
                var fontfamily = elm.getAttribute('data-font-family');
                var fontstyle = elm.getAttribute('data-font-style');
                var fontdisplay = elm.getAttribute('data-font-display');
                parent._cb.setFont(fontfamily, fontstyle, fontdisplay, provider);
              }
            });
          }
        <\/script>
      </body>
      </html>
    `;
    }

    private getThemeClass(): string {
        if (this.builder.styleDark) return 'dark';
        if (this.builder.styleColored) return 'colored';
        if (this.builder.styleColoredDark) return 'colored-dark';
        if (this.builder.styleLight) return 'light';
        return '';
    }
}
