// ============================================================
// modal-service.ts  (Phase 6b)
// ModalService — manages modal overlay dialogs.
//
// Extracted from ContentBuilderHelpers.showModal / hideModal / confirm.
//
// Key differences from the legacy implementation:
//   - No dependency on ContentBuilderRuntime (opts.animateModal, opts.zoom).
//   - Container scale animation is opt-in via ShowModalOptions.scaleContainerTo
//     rather than driven by a global zoom setting.
//   - Probe elements, scale targets, and container selector are passed
//     explicitly rather than read from a shared runtime state object.
//   - The uiRoot (builder chrome root) is injected at construction time,
//     so confirm() does not reach into the global document.
// ============================================================

import { DomUtils } from './dom-utils';

// ------------------------------------------------------------------
// Options
// ------------------------------------------------------------------

export interface ShowModalOptions {
    /**
     * When true the dark overlay cannot be clicked to dismiss the modal.
     * Useful for blocking confirmations and progress dialogs.
     */
    overlayStay?: boolean;

    /**
     * Called when the user clicks the background overlay and `overlayStay`
     * is false. The modal is hidden automatically after this callback.
     */
    onOverlayClick?: () => void;

    /**
     * If provided, every element matching `containerSelector` is scaled to
     * this CSS `scale()` value while the modal is open, then restored when
     * it closes. Mirrors ContentBuilderHelpers `opts.animateModal` + `opts.zoom`.
     */
    scaleContainerTo?: number;

    /** CSS selector for elements to scale. Required when scaleContainerTo is set. */
    containerSelector?: string;
}

// ------------------------------------------------------------------
// Service
// ------------------------------------------------------------------

export class ModalService {

    private readonly _dom = new DomUtils();
    private readonly _uiRoot: HTMLElement;

    constructor(uiRoot: HTMLElement) {
        this._uiRoot = uiRoot;
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Activate a modal element by adding the `active` CSS class and
     * injecting a backdrop overlay child element.
     *
     * The modal element must already exist in the DOM (either stamped into
     * the builder chrome HTML or created dynamically).
     *
     * Mirrors ContentBuilderHelpers.showModal().
     */
    showModal(modal: HTMLElement, options: ShowModalOptions = {}): void {
        this._dom.addClass(modal, 'active');

        // Scale down background containers for the zoom-out effect.
        if (options.scaleContainerTo !== undefined && options.containerSelector) {
            document.querySelectorAll<HTMLElement>(options.containerSelector).forEach((container) => {
                container.style.transform = `scale(${options.scaleContainerTo})`;
                container.setAttribute('scaled-down', '1');
            });
        }

        // Guard against injecting a second overlay on repeated calls.
        if (modal.querySelector('.is-modal-overlay')) return;

        const overlayClass = options.overlayStay
            ? 'is-modal-overlay overlay-stay'
            : 'is-modal-overlay';
        modal.insertAdjacentHTML('afterbegin', `<div class="${overlayClass}"></div>`);

        if (!options.overlayStay) {
            const overlay = modal.querySelector<HTMLElement>('.is-modal-overlay');
            this._dom.addEventListener(overlay, 'click', () => {
                options.onOverlayClick?.();
                this.hideModal(modal, options.containerSelector);
            });
        }
    }

    /**
     * Deactivate a modal element by removing the `active` CSS class and
     * restoring any scaled containers.
     *
     * Mirrors ContentBuilderHelpers.hideModal().
     */
    hideModal(modal: HTMLElement, containerSelector?: string): void {
        if (containerSelector) {
            document.querySelectorAll<HTMLElement>(containerSelector).forEach((container) => {
                if (!container.getAttribute('scaled-down')) return;
                container.style.transform = '';
                container.removeAttribute('scaled-down');
            });
        }
        this._dom.removeClass(modal, 'active');
    }

    /**
     * Show a blocking confirmation dialog with a single "Delete" action button.
     *
     * If a `.is-confirm` modal already exists in the uiRoot it is reused;
     * otherwise a new one is created and appended.
     *
     * @param message   The message to display. Rendered as HTML — callers are
     *                  responsible for escaping untrusted content.
     * @param label     Button label. Defaults to "Delete".
     * @param callback  Receives `true` if the user confirmed, `false` if cancelled.
     *
     * Mirrors ContentBuilderHelpers.confirm().
     */
    confirm(message: string, callback: (confirmed: boolean) => void, label = 'Delete'): void {
        const html = `
            <div class="is-modal is-confirm">
                <div class="is-modal-content" style="padding-bottom:20px;">
                    <p>${message}</p>
                    <button type="button" class="input-ok classic">${label}</button>
                </div>
            </div>`;

        let modal = this._uiRoot.querySelector<HTMLElement>('.is-confirm');
        if (!modal) {
            this._uiRoot.insertAdjacentHTML('beforeend', html);
            modal = this._uiRoot.querySelector<HTMLElement>('.is-confirm')!;
        }

        this.showModal(modal, {
            overlayStay: false,
            onOverlayClick: () => {
                modal?.parentNode?.removeChild(modal!);
                callback(false);
            },
        });

        const okButton = modal.querySelector<HTMLElement>('.input-ok');
        this._dom.addEventListener(okButton, 'click', () => {
            this.hideModal(modal!);
            modal!.parentNode?.removeChild(modal!);
            callback(true);
        });
    }

    // ------------------------------------------------------------------
    // Utility: escape HTML for use inside confirm() messages
    // ------------------------------------------------------------------

    /**
     * HTML-escape a plain-text string so it is safe to use as a
     * `confirm()` message without XSS risk.
     */
    static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

