export class DynSlotElement extends HTMLElement {
    // noinspection JSUnusedGlobalSymbols — called by the browser custom element lifecycle
    connectedCallback(): void {
        this.setAttribute('data-dyn-slot-ready', 'true');
    }

    // noinspection JSUnusedGlobalSymbols — accessed by consuming components at runtime
    get componentId(): string | null {
        const value = this.getAttribute('component_id');
        return value && value.trim() ? value.trim() : null;
    }

    // noinspection JSUnusedGlobalSymbols — accessed by consuming components at runtime
    get slotName(): string | null {
        const value = this.getAttribute('name');
        return value && value.trim() ? value.trim() : null;
    }
}

/**
 * <dyn-mount id="..."> — a named mount point placed inside a widget's render
 * template. Its `id` attribute matches the `mount_id` field on a type:"slot"
 * dependency, telling DynComponentManager where to mount that dependency.
 */
export class DynMountElement extends HTMLElement {
    // noinspection JSUnusedGlobalSymbols — called by the browser custom element lifecycle
    connectedCallback(): void {
        this.setAttribute('data-dyn-mount-ready', 'true');
        this.style.display = 'block';
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
    }

    // noinspection JSUnusedGlobalSymbols — read by DynComponentManager at runtime
    get mountId(): string | null {
        const value = this.getAttribute('id');
        return value && value.trim() ? value.trim() : null;
    }
}

export async function defineDynSlotElement(): Promise<void> {
    if (!customElements.get('dyn-slot')) {
        customElements.define('dyn-slot', DynSlotElement);
    }
}

export async function defineDynMountElement(): Promise<void> {
    if (!customElements.get('dyn-mount')) {
        customElements.define('dyn-mount', DynMountElement);
    }
}

// Register both custom elements with TypeScript's DOM type system.
declare global {
    // noinspection JSUnusedGlobalSymbols
    interface HTMLElementTagNameMap {
        'dyn-slot': DynSlotElement;
        'dyn-mount': DynMountElement;
    }
}
