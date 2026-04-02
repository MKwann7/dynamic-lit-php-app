import type { LoadComponentOptions, MountRoutingContext } from '@maxr/shared/types';

const FLOAT_MOUNT_ID = 'dyn-float-mount';

const SHIELD_STYLES = `
#dyn-float-shield {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw;
    height: 100vh;
    height: -webkit-fill-available;
    z-index: 9000;
    overflow-y: auto;
    justify-content: center;
    align-items: center;
    display: flex;
}

/* ── Spinner ───────────────────────────────────────── */
#dyn-float-shield[data-mode="spinner"] {
    background:
        url(/website/images/LoadingIcon2.gif) no-repeat left 50% center / auto 35px,
        rgba(255, 255, 255, 0.35);
}

/* ── Centred modal ─────────────────────────────────── */
#dyn-float-shield[data-mode="modal"] {
    background: rgba(0, 0, 0, 0.5);
}

.dyn-float-shield-inner {
    display: flex;
    flex-direction: column;
    max-height: 100vh;
    max-height: -webkit-fill-available;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.24);
    min-width: 320px;
    max-width: 90vw;
    width: 100%;
}

/* ── Anchored popover ──────────────────────────────── */
#dyn-float-shield[data-mode="anchored"] {
    background: transparent;
    /* don't center — panel is absolutely positioned */
    align-items: flex-start;
    justify-content: flex-start;
    overflow: visible;
}

.dyn-float-anchored-panel {
    position: fixed;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.16);
    min-width: 180px;
    overflow: visible;
}

/* Arrow element sits outside the panel's overflow boundary */
.dyn-float-anchor-arrow {
    position: absolute;
    width: 24px;
    height: 13px;
    pointer-events: none;
    overflow: visible;
}

/* Up-pointing arrow: panel is BELOW the anchor */
.dyn-float-anchor-arrow::before {
    content: '';
    display: block;
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 9px solid #f8f9fa;
    filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.08));
}

/* Down-pointing arrow: panel is ABOVE the anchor */
.dyn-float-anchor-arrow.arrow-down::before {
    border-bottom: none;
    border-top: 9px solid #fff;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.08));
}
`;

// ── Public types ──────────────────────────────────────────────────────────────

export type PopoverPlacement =
    | 'bottom-end'
    | 'bottom-start'
    | 'bottom'
    | 'top-end'
    | 'top-start'
    | 'top';

export interface ModalOptions {
    routingContext?: MountRoutingContext;
    onClose?: () => void;
    /** CSS max-width applied to the modal panel, e.g. "640px" or "50vw". */
    maxWidth?: string;
}

export interface AnchoredModalOptions {
    /** Where to place the panel relative to the anchor element. Default: bottom-end */
    placement?: PopoverPlacement;
    /** Pixel gap between anchor edge and panel. Default: 8 */
    offset?: number;
    routingContext?: MountRoutingContext;
    onClose?: () => void;
}

// ── FloatShield ───────────────────────────────────────────────────────────────

export class FloatShield {
    private readonly shieldEl: HTMLElement;
    private onCloseCallback: (() => void) | null = null;
    private anchorCleanup: (() => void) | null = null;

    constructor(
        private readonly loadOnMount: (
            widgetId: string,
            mountId: string,
            options?: LoadComponentOptions
        ) => Promise<void>,
        private readonly destroyMount: (mountId: string) => void
    ) {
        this.injectStyles();
        this.shieldEl = this.buildShieldEl();
        document.body.appendChild(this.shieldEl);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    showSpinner(): void {
        this.teardown();
        this.shieldEl.innerHTML = '';
        this.shieldEl.setAttribute('data-mode', 'spinner');
        this.shieldEl.style.display = 'flex';
    }

    hideSpinner(): void {
        if (this.shieldEl.getAttribute('data-mode') === 'spinner') {
            this.shieldEl.style.display = 'none';
            this.shieldEl.removeAttribute('data-mode');
        }
    }

    async openModal(widgetId: string, options?: ModalOptions): Promise<void> {
        this.teardown();
        this.onCloseCallback = options?.onClose ?? null;

        const inner = document.createElement('div');
        inner.className = 'dyn-float-shield-inner';
        if (options?.maxWidth) {
            inner.style.maxWidth = options.maxWidth;
        }
        const mount = document.createElement('dyn-mount');
        mount.id = FLOAT_MOUNT_ID;
        inner.appendChild(mount);

        this.shieldEl.innerHTML = '';
        this.shieldEl.appendChild(inner);
        this.shieldEl.setAttribute('data-mode', 'modal');
        this.shieldEl.style.display = 'flex';

        await this.loadOnMount(widgetId, FLOAT_MOUNT_ID, {
            pushHistory:    false,
            transitionType: 'none',
            routingContext: options?.routingContext,
        });
    }

    /**
     * Open a popover panel anchored to a specific DOM element.
     *
     * The panel is positioned relative to the anchor's bounding rect and
     * includes a directional arrow.  Clicking outside or scrolling/resizing
     * the window closes the popover automatically.
     */
    async openAnchoredModal(
        widgetId: string,
        anchorEl: Element,
        options?: AnchoredModalOptions
    ): Promise<void> {
        this.teardown();
        this.onCloseCallback = options?.onClose ?? null;

        // ── Build DOM ────────────────────────────────────────────────────────
        const arrow = document.createElement('div');
        arrow.className = 'dyn-float-anchor-arrow';

        const panel = document.createElement('div');
        panel.className = 'dyn-float-anchored-panel';
        panel.appendChild(arrow);

        const mount = document.createElement('dyn-mount');
        mount.id = FLOAT_MOUNT_ID;
        panel.appendChild(mount);

        this.shieldEl.innerHTML = '';
        this.shieldEl.appendChild(panel);
        this.shieldEl.setAttribute('data-mode', 'anchored');
        this.shieldEl.style.display = 'flex';

        // Initial position (panel has no size yet — best-effort pass)
        this.positionPanel(panel, arrow, anchorEl, options);

        // Load the component
        await this.loadOnMount(widgetId, FLOAT_MOUNT_ID, {
            pushHistory:    false,
            transitionType: 'none',
            routingContext: options?.routingContext,
        });

        // Re-position once the component has rendered and panel has real size
        requestAnimationFrame(() => {
            this.positionPanel(panel, arrow, anchorEl, options);
        });

        // Close on any scroll or resize (once)
        const close = () => this.closeModal();
        window.addEventListener('scroll', close, { once: true, capture: true });
        window.addEventListener('resize', close, { once: true });
        this.anchorCleanup = close;
    }

    /**
     * Close the currently active overlay (modal, anchored popover, or nothing).
     */
    closeModal(): void {
        const mode = this.shieldEl.getAttribute('data-mode');
        if (mode !== 'modal' && mode !== 'anchored') return;

        this.removeAnchorListeners();
        this.teardown();
        this.shieldEl.style.display = 'none';
        this.shieldEl.removeAttribute('data-mode');

        const cb = this.onCloseCallback;
        this.onCloseCallback = null;
        cb?.();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * Destroy the mounted component and clear the panel contents.
     * Safe to call in any mode.
     */
    private teardown(): void {
        const mode = this.shieldEl.getAttribute('data-mode');
        if (mode === 'modal' || mode === 'anchored') {
            this.destroyMount(FLOAT_MOUNT_ID);
        }
        this.removeAnchorListeners();
        this.shieldEl.innerHTML = '';
    }

    private removeAnchorListeners(): void {
        if (this.anchorCleanup) {
            window.removeEventListener('scroll', this.anchorCleanup, { capture: true });
            window.removeEventListener('resize', this.anchorCleanup);
            this.anchorCleanup = null;
        }
    }

    /**
     * Position the anchored panel and its arrow relative to the anchor element.
     * Called twice — once immediately (pre-render estimate) and once after
     * the first paint so the panel's real height is known.
     *
     * For *-end placements the panel is pinned with CSS `right` (not `left`) so
     * it tracks the right side of the viewport naturally, and nudged 15 px
     * closer to the right edge.  The arrow offset is adjusted by the same
     * amount so it keeps pointing at the anchor element.
     */
    private positionPanel(
        panel: HTMLElement,
        arrow: HTMLElement,
        anchorEl: Element,
        options?: AnchoredModalOptions
    ): void {
        const rect      = anchorEl.getBoundingClientRect();
        const placement = options?.placement ?? 'bottom-end';
        const offset    = options?.offset    ?? 12;

        const panelRect   = panel.getBoundingClientRect();
        const panelWidth  = panelRect.width  || 200;
        const panelHeight = panelRect.height || 100;

        // ── Vertical ────────────────────────────────────────────────────────
        const goAbove = placement.startsWith('top') ||
            (placement.startsWith('bottom') &&
                rect.bottom + panelHeight + offset > window.innerHeight - 8);

        const top = goAbove
            ? rect.top  - panelHeight - offset
            : rect.bottom             + offset;

        panel.style.top = `${top}px`;

        // ── Horizontal ──────────────────────────────────────────────────────
        const END_NUDGE     = 15;   // px closer to the right edge for *-end
        const anchorCentreX = rect.left + rect.width / 2;
        let   arrowLeft: number;

        if (placement.endsWith('-end')) {
            // Pin panel by its RIGHT edge, shifted END_NUDGE px into the viewport
            const rightVal = Math.max(8, window.innerWidth - rect.right - END_NUDGE);
            panel.style.right = `${rightVal}px`;
            panel.style.left  = 'auto';

            // Derive the panel's logical left edge so the arrow can be centred
            // over the anchor regardless of whether the panel has rendered yet.
            const panelLeftEdge = window.innerWidth - rightVal - panelWidth;
            arrowLeft = anchorCentreX - panelLeftEdge - 13;

        } else if (placement.endsWith('-start')) {
            panel.style.left  = `${Math.max(8, rect.left)}px`;
            panel.style.right = 'auto';
            arrowLeft = anchorCentreX - rect.left - 13;

        } else {
            const centreLeft = Math.max(8, Math.min(
                rect.left + rect.width / 2 - panelWidth / 2,
                window.innerWidth - panelWidth - 8
            ));
            panel.style.left  = `${centreLeft}px`;
            panel.style.right = 'auto';
            arrowLeft = anchorCentreX - centreLeft - 13;
        }

        // ── Arrow ────────────────────────────────────────────────────────────
        arrow.style.left = `${Math.max(8, Math.min(arrowLeft, panelWidth - 24))}px`;

        if (goAbove) {
            arrow.classList.add('arrow-down');
            arrow.style.top    = 'auto';
            arrow.style.bottom = '-9px';
        } else {
            arrow.classList.remove('arrow-down');
            arrow.style.top    = '-9px';
            arrow.style.bottom = 'auto';
        }
    }

    private buildShieldEl(): HTMLElement {
        const el = document.createElement('div');
        el.id        = 'dyn-float-shield';
        el.className = 'universal-float-shield dyn-float-shield';
        el.style.display = 'none';

        // Close on backdrop click (anchored & modal both respect this)
        el.addEventListener('click', (e) => {
            if (e.target === el) this.closeModal();
        });

        return el;
    }

    private injectStyles(): void {
        const id = 'dyn-float-shield-styles';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id          = id;
        style.textContent = SHIELD_STYLES;
        document.head.appendChild(style);
    }
}

