import { css, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CropItem {
    image_id: number;
    image_uuid: string;
    parent_uuid: string;
    url: string;
    thumb: string;
    width: number;
    height: number;
    x_offset?: number | null;
    y_offset?: number | null;
    image_class: string;
    entity_name: string;
    type: string;
}

interface ImageItem {
    image_id: number;
    image_uuid: string;
    url: string;
    thumb: string;
    width: number;
    height: number;
    image_class: string;
    entity_name: string;
    type: string;
    /** Cropped derivatives of this original image. Always an array (may be empty). */
    crops: CropItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

@customElement('maxr-list-images')
export class MaxrListImages extends RuntimeWidgetElement {

    // ── Props ─────────────────────────────────────────────────────────────────

    @property({ type: String, attribute: 'user-uuid' })
    userUuid = '';

    /** Override the media server base URL. Falls back to window.__MAXR_BOOTSTRAP__.media.serverUrl. */
    @property({ type: String, attribute: 'media-server-url' })
    mediaServerUrl = '';

    // ── State ─────────────────────────────────────────────────────────────────

    @state() private _images: ImageItem[] = [];
    @state() private _loading = false;
    @state() private _error = '';
    /** 'grid' = root originals list  |  'crops' = one parent's derivatives */
    @state() private _view: 'grid' | 'crops' = 'grid';
    /** The root image whose crops are currently being displayed. */
    @state() private _cropsParent: ImageItem | null = null;

    // ── Media server URL ──────────────────────────────────────────────────────

    private get _resolvedMediaUrl(): string {
        if (this.mediaServerUrl) return this.mediaServerUrl.replace(/\/$/, '');
        const boot = (window as unknown as { __MAXR_BOOTSTRAP__?: Record<string, unknown> }).__MAXR_BOOTSTRAP__ ?? {};
        const media = boot['media'] as { serverUrl?: string } | undefined;
        return (media?.serverUrl ?? 'http://localhost:3002').replace(/\/$/, '');
    }

    // ── Styles ────────────────────────────────────────────────────────────────

    static styles = css`
        :host { display: block; }

        .li-root { padding: 16px; }

        .li-header {
            display: flex; align-items: center; gap: 8px;
            margin-bottom: 16px;
        }
        .li-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #212529; flex: 1; }

        .li-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
        }

        /* ── Grid item ─────────────────────────────────────────────────────── */
        .li-item {
            aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer;
            border: 2px solid transparent; transition: border-color 0.15s, transform 0.1s;
            background: #f1f3f5; position: relative;
        }
        .li-item:hover { border-color: #0d6efd; transform: scale(1.04); }
        .li-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .li-item__class {
            position: absolute; bottom: 0; left: 0; right: 0;
            background: rgba(0,0,0,0.45); color: #fff;
            font-size: 0.7rem; padding: 3px 6px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Crop-count corner badge — CSS right-triangle in top-right ─────── */
        .li-item__badge {
            position: absolute; top: 0; right: 0;
            width: 0; height: 0;
            border-top: 28px solid #0d6efd;
            border-left: 28px solid transparent;
            cursor: pointer; z-index: 1;
            transition: border-top-color 0.15s;
        }
        .li-item__badge:hover { border-top-color: #0b5ed7; }
        /* Count number sits inside the blue triangle area */
        .li-item__badge-count {
            position: absolute; top: 3px; right: 4px;
            color: #fff; font-size: 0.6rem; font-weight: 700;
            line-height: 1; pointer-events: none; z-index: 2;
        }

        /* ── Crops view — parent image context banner ────────────────────────── */
        .li-parent-banner {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 0 14px; border-bottom: 1px solid #dee2e6; margin-bottom: 14px;
        }
        .li-parent-banner img {
            width: 48px; height: 48px; object-fit: cover;
            border-radius: 6px; border: 1px solid #dee2e6; flex-shrink: 0;
        }
        .li-parent-banner__meta { flex: 1; overflow: hidden; }
        .li-parent-banner__label {
            font-size: 0.68rem; color: #6c757d; text-transform: uppercase;
            letter-spacing: 0.05em; margin-bottom: 2px;
        }
        .li-parent-banner__class {
            font-size: 0.85rem; font-weight: 600; color: #212529;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Common ──────────────────────────────────────────────────────────── */
        .li-empty { color: #6c757d; text-align: center; padding: 48px 0; }
        .li-error { color: #dc3545; font-size: 0.875rem; text-align: center; padding: 24px 0; }

        .li-spinner { display: flex; justify-content: center; padding: 48px 0; }
        .li-spinner__ring {
            display: inline-block; width: 32px; height: 32px;
            border: 3px solid #dee2e6; border-top-color: #0d6efd;
            border-radius: 50%; animation: li-spin 0.7s linear infinite;
        }
        @keyframes li-spin { to { transform: rotate(360deg); } }

        .btn {
            padding: 5px 14px; border-radius: 4px; border: 1px solid #dee2e6;
            cursor: pointer; font-size: 0.8rem; background: #fff; color: #212529;
            white-space: nowrap;
        }
        .btn:hover { background: #f8f9fa; }
    `;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override connectedCallback(): void {
        super.connectedCallback();
        if (this.userUuid) void this._loadImages();
    }

    override updated(changed: Map<string, unknown>): void {
        if (changed.has('userUuid') && this.userUuid) {
            void this._loadImages();
        }
    }

    // ── Data fetching ─────────────────────────────────────────────────────────

    private async _loadImages(): Promise<void> {
        if (!this.userUuid) return;
        this._loading = true;
        this._error = '';
        try {
            const token = this.runtime?.getAccessToken();
            const url = `${this._resolvedMediaUrl}/api/v1/images?user_uuid=${encodeURIComponent(this.userUuid)}`;
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            const body = await res.json() as { success: boolean; data?: ImageItem[] };
            const images = body.data ?? [];
            this._images = images;

            // If the crops sub-view is open, re-anchor _cropsParent to the
            // refreshed data (e.g. after a userUuid change or future refresh).
            // If the parent image is no longer in the list, fall back to grid.
            if (this._cropsParent) {
                const refreshed = images.find(
                    img => img.image_uuid === this._cropsParent!.image_uuid,
                );
                if (refreshed) {
                    this._cropsParent = refreshed;
                } else {
                    this._view        = 'grid';
                    this._cropsParent = null;
                }
            }
        } catch (err) {
            this._error = err instanceof Error ? err.message : 'Failed to load images';
        } finally {
            this._loading = false;
        }
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    private _openCrops(e: Event, image: ImageItem): void {
        e.stopPropagation(); // prevent the parent thumbnail click from also firing
        this._cropsParent = image;
        this._view = 'crops';
    }

    private _backToGrid(): void {
        this._view = 'grid';
        this._cropsParent = null;
    }

    // ── Selection ─────────────────────────────────────────────────────────────

    private _select(item: ImageItem | CropItem): void {
        this.dispatchEvent(new CustomEvent('maxr:image:selected', {
            detail: item, bubbles: true, composed: true,
        }));
        window.dispatchEvent(new CustomEvent('maxr:image:selected', { detail: item }));
    }

    // ── Render ────────────────────────────────────────────────────────────────

    override render(): TemplateResult {
        return this._view === 'crops' && this._cropsParent
            ? this._renderCropsView(this._cropsParent)
            : this._renderGridView();
    }

    private _renderGridView(): TemplateResult {
        return html`
            <div class="li-root">
                <div class="li-header">
                    <h3>Your Images</h3>
                    <button class="btn" @click=${this._loadImages}>↺ Refresh</button>
                </div>

                ${this._loading
                    ? html`<div class="li-spinner"><span class="li-spinner__ring"></span></div>`
                    : this._error
                        ? html`<p class="li-error">${this._error}</p>`
                        : this._images.length === 0
                            ? html`<p class="li-empty">No images uploaded yet.</p>`
                            : html`
                                <div class="li-grid">
                                    ${this._images.map(img => html`
                                        <div class="li-item" @click=${() => this._select(img)}>
                                            <img
                                                src="${this._resolvedMediaUrl}${img.thumb}"
                                                alt="${img.image_class}"
                                                loading="lazy"
                                            />
                                            <span class="li-item__class">${img.image_class}</span>

                                            ${img.crops.length > 0 ? html`
                                                <div
                                                    class="li-item__badge"
                                                    title="${img.crops.length} cropped version${img.crops.length === 1 ? '' : 's'} — click to view"
                                                    @click=${(e: Event) => this._openCrops(e, img)}
                                                ></div>
                                                <span class="li-item__badge-count">${img.crops.length}</span>
                                            ` : ''}
                                        </div>
                                    `)}
                                </div>
                            `}
            </div>
        `;
    }

    private _renderCropsView(parent: ImageItem): TemplateResult {
        return html`
            <div class="li-root">
                <div class="li-header">
                    <button class="btn" @click=${this._backToGrid}>← Back</button>
                    <h3>Cropped Image Versions</h3>
                </div>

                <!-- Show the original image as context so the user knows which root they're in -->
                <div class="li-parent-banner">
                    <img
                        src="${this._resolvedMediaUrl}${parent.thumb}"
                        alt="${parent.image_class}"
                    />
                    <div class="li-parent-banner__meta">
                        <div class="li-parent-banner__label">Original</div>
                        <div class="li-parent-banner__class">${parent.image_class}</div>
                    </div>
                </div>

                ${parent.crops.length === 0
                    ? html`<p class="li-empty">No cropped versions yet.</p>`
                    : html`
                        <div class="li-grid">
                            ${parent.crops.map(crop => html`
                                <div class="li-item" @click=${() => this._select(crop)}>
                                    <img
                                        src="${this._resolvedMediaUrl}${crop.thumb}"
                                        alt="${crop.image_class}"
                                        loading="lazy"
                                    />
                                    <span class="li-item__class">${crop.image_class}</span>
                                </div>
                            `)}
                        </div>
                    `}
            </div>
        `;
    }
}
