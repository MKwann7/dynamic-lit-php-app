export class DomUtils {
    createElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
        return document.createElement(tag);
    }

    appendChild(parent: Node | null | undefined, child: Node): void {
        parent?.appendChild(child);
    }

    appendHtml(parent: Element | null | undefined, html: string): void {
        parent?.insertAdjacentHTML('beforeend', html);
    }

    addEventListener(
        element: EventTarget | null | undefined,
        eventName: string,
        handler: EventListenerOrEventListenerObject,
    ): void {
        element?.addEventListener(eventName, handler);
    }

    addClass(element: Element | null | undefined, className: string): void {
        if (!element) return;
        if (!this.hasClass(element, className)) {
            if (element.classList.length === 0) {
                element.className = className;
            } else {
                element.className = `${element.className} ${className}`.replace(/  +/g, ' ');
            }
        }
    }

    removeClass(element: Element | null | undefined, className: string): void {
        if (!element || element.classList.length === 0) return;

        const names = className.split(' ');
        for (const name of names) {
            if (!name) continue;
            const kept: string[] = [];
            for (const existing of element.className.split(' ')) {
                if (existing && existing !== name) kept.push(existing);
            }
            element.className = kept.join(' ').trim();
        }

        if (element.className === '') {
            element.removeAttribute('class');
        }
    }

    hasClass(element: Element | null | undefined, className: string): boolean {
        if (!element) return false;
        try {
            const value = element.getAttribute('class') ?? '';
            return new RegExp(`\\b${className}\\b`).test(value);
        } catch {
            return false;
        }
    }

    moveAfter(node: Node, referenceNode: Node): void {
        referenceNode.parentNode?.insertBefore(node, referenceNode);
        referenceNode.parentNode?.insertBefore(referenceNode, (referenceNode as Element).previousElementSibling);
    }

    elementChildren(element: Element): HTMLElement[] {
        const nodes = element.childNodes;
        const children: HTMLElement[] = [];
        let index = nodes.length;
        while (index--) {
            if (nodes[index].nodeType === Node.ELEMENT_NODE) {
                children.unshift(nodes[index] as HTMLElement);
            }
        }
        return children;
    }

    parentsHasClass(element: Node | null, className: string): boolean {
        let current: Node | null = element;
        while (current) {
            if (!(current as Element).tagName) return false;
            const tagName = (current as Element).tagName;
            if (tagName === 'BODY' || tagName === 'HTML') return false;
            if (this.hasClass(current as Element, className)) return true;
            current = current.parentNode;
        }
        return false;
    }

    parentsHasId(element: Node | null, id: string): boolean {
        let current: Node | null = element;
        while (current) {
            if (!(current as Element).tagName) return false;
            const tagName = (current as Element).tagName;
            if (tagName === 'BODY' || tagName === 'HTML') return false;
            if ((current as Element).id === id) return true;
            current = current.parentNode;
        }
        return false;
    }

    parentsHasTag(element: Node | null, tagName: string): boolean {
        let current: Node | null = element;
        while (current) {
            if (!(current as Element).tagName) return false;
            const currentTag = (current as Element).tagName;
            if (currentTag === 'BODY' || currentTag === 'HTML') return false;
            if (currentTag.toLowerCase() === tagName.toLowerCase()) return true;
            current = current.parentNode;
        }
        return false;
    }

    parentsHasAttribute(element: Node | null, attributeName: string): boolean {
        let current: Node | null = element;
        while (current) {
            if (!(current as Element).tagName) return false;
            const tagName = (current as Element).tagName;
            if (tagName === 'BODY' || tagName === 'HTML') return false;
            try {
                if ((current as Element).hasAttribute(attributeName)) return true;
            } catch {
                return false;
            }
            current = current.parentNode;
        }
        return false;
    }

    parentsHasElement(element: Node | null, tagName: string): boolean {
        let current: Node | null = element;
        while (current) {
            if (!(current as Element).tagName) return false;
            const currentTag = (current as Element).tagName;
            if (currentTag === 'BODY' || currentTag === 'HTML') return false;
            current = current.parentNode;
            if (!current || !(current as Element).tagName) return false;
            if ((current as Element).tagName.toLowerCase() === tagName) return true;
        }
        return false;
    }

    getParentElement<T extends keyof HTMLElementTagNameMap>(
        element: Node | null,
        tagName: T,
    ): HTMLElementTagNameMap[T] | false {
        let current: Node | null = element;
        while (current) {
            if (!(current as Element).tagName) return false;
            const currentTag = (current as Element).tagName;
            if (currentTag === 'BODY' || currentTag === 'HTML') return false;
            current = current.parentNode;
            if (!current || !(current as Element).tagName) return false;
            if ((current as Element).tagName.toLowerCase() === tagName.toLowerCase()) {
                return current as HTMLElementTagNameMap[T];
            }
        }
        return false;
    }

    removeClasses(elements: Element[], className: string): void {
        for (const element of elements) element.classList.remove(className);
    }

    removeAttributes(elements: Element[], attributeName: string): void {
        for (const element of elements) element.removeAttribute(attributeName);
    }

    removeElements(elements: Element[] | NodeListOf<Element>): void {
        Array.prototype.forEach.call(elements, (element: Element) => {
            element.parentNode?.removeChild(element);
        });
    }

    moveCursorToElement(element: HTMLElement): void {
        if (window.getSelection && document.createRange) {
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            return;
        }

        if ((document.body as any).createTextRange) {
            const range = (document.body as any).createTextRange();
            range.moveToElementText(element);
            range.collapse(false);
            range.select();
        }
    }

    selectElementContents(element: HTMLElement): void {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    getSelected(): string | false | undefined {
        if (window.getSelection) return window.getSelection()?.toString();
        if ((document as any).getSelection) return (document as any).getSelection().toString();
        const range = (document as any).selection?.createRange?.();
        return !!range?.text && range.text;
    }

    checkEditable(): boolean {
        try {
            let element: Node | null;
            if (window.getSelection) {
                const ancestor = window.getSelection()!.getRangeAt(0).commonAncestorContainer;
                element = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor;
            } else {
                const selection = (document as any).selection?.createRange?.();
                element = selection?.parentElement?.() ?? null;
            }
            return !!element && this.parentsHasAttribute(element, 'contenteditable');
        } catch {
            return false;
        }
    }

    textSelection(): HTMLElement | false {
        try {
            const ancestor = window.getSelection()!.getRangeAt(0).commonAncestorContainer;
            if (ancestor.nodeType === Node.TEXT_NODE) {
                const parent = ancestor.parentNode as HTMLElement;
                return this.parentsHasClass(parent, 'is-builder') ? parent : false;
            }

            const element = ancestor as HTMLElement;
            const name = element.nodeName.toLowerCase();
            const valid =
                (name === 'i' && element.innerHTML === '' && this.parentsHasClass(element, 'is-builder')) ||
                ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote'].includes(name);

            return valid ? element : false;
        } catch {
            return false;
        }
    }

    getStyle(element: HTMLElement, styleName: string): string {
        if (window.getComputedStyle) return window.getComputedStyle(element, null).getPropertyValue(styleName);
        return (element.style as any)[styleName.replace(/-([a-z])/g, (match: string) => match[1].toUpperCase())];
    }

    doFunction(element: HTMLElement, callback: (node: HTMLElement) => void, includeChildren?: boolean): void {
        callback(element);
        if (!includeChildren) return;

        const descendants = Array.prototype.slice.call(element.getElementsByTagName('*')) as HTMLElement[];
        for (const node of descendants) callback(node);
    }
}
