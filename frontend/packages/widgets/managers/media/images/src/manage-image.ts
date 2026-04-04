import { css, html, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CropLibraryImage {
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

interface LibraryImage {
    image_id: number;
    image_uuid: string;
    parent_uuid?: string;   // present when this image is a cropped derivative
    url: string;
    thumb: string;
    width: number;
    height: number;
    x_offset?: number | null;  // crop box left edge in original-image pixels
    y_offset?: number | null;  // crop box top  edge in original-image pixels
    image_class: string;
    entity_name: string;
    type: string;
    /** Cropped derivatives — populated by the new nested API response. */
    crops?: CropLibraryImage[];
}

type View = 'manage' | 'upload' | 'library';

// ── Component ─────────────────────────────────────────────────────────────────

@customElement('dynlit-manage-image')
export class DynLitManageImage extends RuntimeWidgetElement {

    // ── Props ─────────────────────────────────────────────────────────────────

    @property({ type: String, attribute: 'user-uuid' })    userUuid = '';
    @property({ type: String, attribute: 'entity-id' })    entityId = '';
    @property({ type: String, attribute: 'entity-uuid' })  entityUuid = '';
    @property({ type: String, attribute: 'entity-name' })  entityName = '';
    @property({ type: String, attribute: 'image-class' })  imageClass = '';
    /** URL of the image currently assigned to the entity (null = no image yet). */
    @property({ type: String, attribute: 'current-image-url' })  currentImageUrl = '';
    /** UUID of the current image — used as parent_uuid when saving a revision. */
    @property({ type: String, attribute: 'current-image-uuid' }) currentImageUuid = '';
    /**
     * URL of the original (pre-crop) image.
     * Pass this when the current image is a cropped derivative so "Edit / Crop"
     * always loads the full original rather than cropping a crop.
     */
    @property({ type: String, attribute: 'parent-image-url' })  parentImageUrl = '';
    /** UUID of the original image — used when parentImageUrl is not directly available. */
    @property({ type: String, attribute: 'parent-image-uuid' }) parentImageUuid = '';

    // ── State ─────────────────────────────────────────────────────────────────

    @state() private _view: View = 'manage';
    @state() private _src: string | null = null;
    @state() private _saving = false;
    @state() private _resolvingEdit = false;
    @state() private _error = '';
    @state() private _dragOver = false;
    @state() private _libraryImages: LibraryImage[] = [];
    @state() private _libraryLoading = false;
    @state() private _libraryError = '';
    /** 'grid' = root originals  |  'crops' = one parent's derivatives */
    @state() private _libraryView: 'grid' | 'crops' = 'grid';
    /** Root image whose crops are currently being shown inside the library panel. */
    @state() private _libraryCropsParent: LibraryImage | null = null;
    /** Holds the server response from the most recent upload, used by "Update Image". */
    @state() private _pendingImageData: Record<string, unknown> | null = null;

    private _cropper: Cropper | null = null;
    private _pasteHandler!: (e: ClipboardEvent) => void;
    private _initialViewSet = false;
    /** Tracks the original (pre-crop) URL after a two-step save so Edit/Crop can use it. */
    private _resolvedOriginalUrl = '';
    private _resolvedOriginalUuid = '';
    /** UUID for which _fetchImageDetails() was last dispatched — prevents duplicate fetches. */
    private _lastFetchedUuid = '';
    /**
     * Crop-box geometry from the last saved crop, in original-image pixel coordinates.
     * Passed to CropperJS setData() when re-opening Edit/Crop so the selection is restored.
     */
    private _cropData: { x: number; y: number; width: number; height: number } | null = null;

    // ── Media server URL ──────────────────────────────────────────────────────

    private get _mediaUrl(): string {
        const boot = (window as unknown as { __dynlit_BOOTSTRAP__?: Record<string, unknown> }).__dynlit_BOOTSTRAP__ ?? {};
        const media = boot['media'] as { serverUrl?: string } | undefined;
        return (media?.serverUrl ?? 'http://localhost:3002').replace(/\/$/, '');
    }

    // ── Styles ────────────────────────────────────────────────────────────────

    static styles = css`
        .dynlit-mi { display: flex; flex-direction: column; width: 100%; height: 100%; background: #fff; }

        /* Header */
        .dynlit-mi__header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 24px 12px; border-bottom: 1px solid #dee2e6; flex-shrink: 0;
        }
        .dynlit-mi__header h4 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #212529; }
        .dynlit-mi__close {
            background: none; border: none; cursor: pointer;
            font-size: 1.3rem; color: #6c757d; line-height: 1; padding: 2px 6px;
        }
        .dynlit-mi__close:hover { color: #212529; }

        /* Body — flex:1 fills the remaining height of .dynlit-mi */
        .dynlit-mi__body {
            flex: 1; min-height: 0; overflow: hidden;
            display: flex; flex-direction: column;
        }

        /* Upload panel (full-width with padding) */
        .dynlit-mi__panel-main {
            padding: 20px 24px; flex: 1; box-sizing: border-box; overflow-y: auto;
        }

        /* ── Two-panel manage layout ─────────────────────────────────────── */
        .dynlit-mi__manage-layout {
            /* flex:1 fills .dynlit-mi__slide-pane (flex column) — height:100% is unreliable here */
            display: flex; flex: 1; min-height: 0;
        }
        .dynlit-mi__sidebar {
            width: 160px; flex-shrink: 0;
            background: #e9ecef;
            padding: 16px 12px;
            display: flex; flex-direction: column; gap: 8px;
            border-right: 1px solid #dee2e6;
        }
        .dynlit-mi__sidebar .btn {
            width: 100%; justify-content: center; text-align: center;
        }
        .dynlit-mi__preview {
            /* flex:1 fills the row; no need for height:100% once the chain is all flex:1 */
            flex: 1; display: flex; align-items: center; justify-content: center;
            padding: 16px; overflow: hidden;
        }
        .dynlit-mi__preview img {
            max-width: 100%; max-height: 100%; object-fit: contain;
            border-radius: 6px; border: 1px solid #dee2e6;
        }

        /*
         * ── Coordinated horizontal slider ─────────────────────────────────
         * Both "manage" and "library" panels sit side-by-side inside a
         * 200%-wide slider.  Toggling --library shifts the whole slider left
         * so both panels move in unison — identical to the on-page nav behaviour.
         */
        .dynlit-mi__slider {
            display: flex;
            width: 200%;
            flex: 1;           /* fills .dynlit-mi__body (flex column) */
            transition: transform 0.3s ease-in-out;
            will-change: transform;
        }
        .dynlit-mi__slider--library { transform: translateX(-50%); }

        /* Each slide-pane = 50% of the 200%-wide slider.
         * Height: NO explicit value — the parent row-flex's align-items:stretch
         * gives each pane the full slider height via the flex algorithm.
         * (height:100% is unreliable here because slider's height comes from
         * flex:1, not an explicit value, and browsers may not treat that as
         * "definite" for percentage resolution.) */
        .dynlit-mi__slide-pane {
            width: 50%;
            flex-shrink: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* Library panel (lives inside the second slide-pane) */
        .dynlit-mi__panel-library {
            /* flex:1 fills .dynlit-mi__slide-pane (flex column) */
            display: flex; flex-direction: column; flex: 1;
            overflow: hidden; background: #fff;
            border-left: 1px solid #dee2e6;
        }
        .dynlit-mi__lib-header {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 20px; border-bottom: 1px solid #dee2e6; flex-shrink: 0;
        }
        .dynlit-mi__lib-header span { font-weight: 600; font-size: 0.95rem; }
        .dynlit-mi__lib-body { flex: 1; overflow-y: auto; padding: 16px 20px; }

        /* Manage placeholder (no image) */
        .dynlit-mi__placeholder {
            /* align-self:stretch overrides the parent's align-items:center so the dashed
               border fills the full preview area; flex layout centres the icon + text */
            align-self: stretch; width: 100%;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #6c757d; padding: 16px;
            border: 2px dashed #dee2e6; border-radius: 8px; box-sizing: border-box;
        }
        .dynlit-mi__placeholder svg { opacity: 0.35; margin-bottom: 8px; }
        .dynlit-mi__placeholder p { margin: 0; font-size: 0.9rem; }

        /* Upload / drop zone */
        .dynlit-mi__dropzone {
            border: 2px dashed #adb5bd; border-radius: 8px; padding: 32px 20px;
            text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s;
            background: #f8f9fa;
        }
        .dynlit-mi__dropzone.drag-over { border-color: #0d6efd; background: #e8f0fe; }
        .dynlit-mi__dropzone svg { opacity: 0.5; }
        .dynlit-mi__dropzone p { margin: 8px 0 4px; color: #495057; font-size: 0.9rem; }
        .dynlit-mi__dropzone small { color: #6c757d; font-size: 0.8rem; }
        .dynlit-mi__file-input { display: none; }

        /* Cropper — fixed height so CropperJS can measure correctly */
        .dynlit-mi__cropper-wrap {
            width: 100%;
            height: 310px;
            overflow: hidden;
        }
        .dynlit-mi__cropper-wrap > img { display: block; max-width: 100%; }

        /* Library grid */
        .dynlit-mi__lib-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 10px;
        }
        .dynlit-mi__lib-item {
            aspect-ratio: 1; border-radius: 6px; overflow: hidden; cursor: pointer;
            border: 2px solid transparent; transition: border-color 0.15s, transform 0.1s;
            background: #f1f3f5; position: relative;
        }
        .dynlit-mi__lib-item:hover { border-color: #0d6efd; transform: scale(1.03); }
        .dynlit-mi__lib-item img { width: 100%; height: 100%; object-fit: cover; }

        /* Crop-count corner badge — CSS right-triangle in top-right of each lib item */
        .dynlit-mi__lib-badge {
            position: absolute; top: 0; right: 0;
            width: 0; height: 0;
            border-top: 35px solid #0d6efd;
            border-left: 35px solid transparent;
            cursor: pointer; z-index: 1;
            transition: border-top-color 0.15s;
        }
        .dynlit-mi__lib-badge:hover { border-top-color: #0b5ed7; }
        .dynlit-mi__lib-badge-count {
            position: absolute; top: 5px; right: 4px;
            color: #fff; font-size: 0.75rem; font-weight: 700;
            line-height: 1; pointer-events: none; z-index: 2;
        }

        /* Library crops view — parent banner */
        .dynlit-mi__lib-parent-banner {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 0 12px; border-bottom: 1px solid #dee2e6; margin-bottom: 12px;
        }
        .dynlit-mi__lib-parent-banner img {
            width: 40px; height: 40px; object-fit: cover;
            border-radius: 4px; border: 1px solid #dee2e6; flex-shrink: 0;
        }
        .dynlit-mi__lib-parent-banner__label {
            font-size: 0.65rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .dynlit-mi__lib-parent-banner__class {
            font-size: 0.8rem; font-weight: 600; color: #212529;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .dynlit-mi__lib-empty { color: #6c757d; text-align: center; padding: 32px 0; }

        /* Footer */
        .dynlit-mi__footer {
            display: flex; justify-content: flex-end; gap: 8px;
            padding: 12px 24px 16px; border-top: 1px solid #dee2e6; flex-shrink: 0;
        }

        /* Buttons */
        .btn {
            padding: 6px 16px; border-radius: 4px; border: 1px solid #dee2e6;
            cursor: pointer; font-size: 0.875rem; background: #fff; color: #212529;
            display: inline-flex; align-items: center; gap: 5px;
        }
        .btn:hover { background: #f8f9fa; }
        .btn-primary { background: #0d6efd; color: #fff; border-color: #0d6efd; }
        .btn-primary:hover:not(:disabled) { background: #0b5ed7; border-color: #0a58ca; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-sm { padding: 4px 10px; font-size: 0.8rem; }

        /* Error */
        .dynlit-mi__error { color: #dc3545; font-size: 0.85rem; margin-top: 8px; }

        /* Loading spinner */
        .dynlit-mi__spinner {
            display: inline-block; width: 20px; height: 20px;
            border: 2px solid #dee2e6; border-top-color: #0d6efd;
            border-radius: 50%; animation: dynlit-spin 0.7s linear infinite;
        }
        .dynlit-mi__spinner--sm { width: 12px; height: 12px; border-width: 1.5px; }
        @keyframes dynlit-spin { to { transform: rotate(360deg); } }
    `;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /** Always render to light DOM so CropperJS global styles apply correctly. */
    override createRenderRoot(): HTMLElement | DocumentFragment {
        this._injectLightStyles();
        return this;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this._pasteHandler = this._onPaste.bind(this);
        document.addEventListener('paste', this._pasteHandler);
        // routingContext may already be set synchronously; handle the async case in updated().
        this._applyRouteParams();
    }

    override updated(changed: PropertyValues): void {
        super.updated(changed);

        // ── Modal re-open: routingContext reference changed ───────────────────
        if (changed.has('routingContext')) {
            // Reset the fetch-lock so we always re-fetch for the new context,
            // even if the UUID happens to be the same image as last time.
            this._lastFetchedUuid      = '';
            this.parentImageUrl        = '';
            this.parentImageUuid       = '';
            this._resolvedOriginalUrl  = '';
            this._resolvedOriginalUuid = '';
            this._cropData             = null;
            this._pendingImageData     = null;
            this._src                  = null;
            this._destroyCropper();
            this._applyRouteParams();
            this._view = this.currentImageUrl ? 'manage' : 'upload';
            this._initialViewSet = true;

            // Fire immediately if we have a UUID or can extract one from the URL.
            if (this.currentImageUuid || this.currentImageUrl) {
                void this._fetchImageDetails();
            }
        }

        // ── Primary trigger: UUID or URL became available / changed ──────────
        // Covers the async path where _applyRouteParams sets them in the next cycle,
        // and also covers callers that only supply currentImageUrl (no UUID prop).
        if (changed.has('currentImageUuid') && this.currentImageUuid) {
            this._resolvedOriginalUrl  = '';
            this._resolvedOriginalUuid = '';
            void this._fetchImageDetails();
        }
        if (changed.has('currentImageUrl') && this.currentImageUrl && !this.currentImageUuid) {
            this._resolvedOriginalUrl  = '';
            this._resolvedOriginalUuid = '';
            void this._fetchImageDetails();
        }

        // ── First-render path (synchronous routingContext before connection) ──
        if (!this._initialViewSet) {
            this._initialViewSet = true;
            if (!this.currentImageUrl) this._view = 'upload';
            if (this.currentImageUuid || this.currentImageUrl) void this._fetchImageDetails();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        document.removeEventListener('paste', this._pasteHandler);
        this._destroyCropper();
    }

    // ── Route params hydration ────────────────────────────────────────────────

    private _applyRouteParams(): void {
        const p = this.routingContext?.routeParams;
        if (!p) return;
        if (p['userUuid']   && !this.userUuid)   this.userUuid   = p['userUuid'];
        if (p['entityId']   && !this.entityId)   this.entityId   = p['entityId'];
        if (p['entityUuid'] && !this.entityUuid) this.entityUuid = p['entityUuid'];
        if (p['entityName'] && !this.entityName) this.entityName = p['entityName'];
        if (p['imageClass'] && !this.imageClass) this.imageClass = p['imageClass'];
        // Always overwrite so re-opening with a new URL/UUID takes effect.
        if (p['currentImageUrl']  !== undefined) this.currentImageUrl  = p['currentImageUrl'];
        if (p['currentImageUuid'] !== undefined) this.currentImageUuid = p['currentImageUuid'];
        // Accept both the explicit prop names and the aliases emitted by _save()
        // in the dynlit:image:saved event (original_image_url / original_image_uuid).
        if (p['parentImageUrl']    !== undefined) this.parentImageUrl   = p['parentImageUrl'];
        else if (p['original_image_url']  !== undefined) this.parentImageUrl   = p['original_image_url'];
        if (p['parentImageUuid']   !== undefined) this.parentImageUuid  = p['parentImageUuid'];
        else if (p['original_image_uuid'] !== undefined) this.parentImageUuid  = p['original_image_uuid'];
    }

    // ── Cropper helpers ───────────────────────────────────────────────────────

    private _destroyCropper(): void {
        if (this._cropper) { this._cropper.destroy(); this._cropper = null; }
    }

    private _initCropper(cropData?: { x: number; y: number; width: number; height: number }): void {
        const img = this.querySelector<HTMLImageElement>('#cropper-img');
        if (!img) return;
        this._destroyCropper();
        requestAnimationFrame(() => {
            this._cropper = new Cropper(img, {
                viewMode: 1,
                autoCropArea: 0.8,
                responsive: true,
                restore: false,
                // If we have saved crop geometry, restore it once CropperJS is ready.
                ready: cropData ? () => { this._cropper?.setData(cropData); } : undefined,
            });
        });
    }

    // ── View transitions ──────────────────────────────────────────────────────

    private _switchView(view: View): void {
        if (view !== 'upload') { this._destroyCropper(); this._src = null; }
        this._error = '';
        this._view = view;
        // Reset library sub-view whenever we navigate away from the library.
        if (view !== 'library') {
            this._libraryView        = 'grid';
            this._libraryCropsParent = null;
        }
        if (view === 'library' && this._libraryImages.length === 0 && !this._libraryLoading) {
            void this._loadLibrary();
        }
    }

    private _startUpload(preloadUrl?: string): void {
        this._destroyCropper();
        this._src = null;
        this._error = '';
        this._view = 'upload';
        if (preloadUrl) {
            void this.updateComplete.then(() => {
                this._src = preloadUrl;
                void this.updateComplete.then(() => this._initCropper());
            });
        }
    }

    /**
     * Extracts the image UUID from a media URL.
     *
     * The media server stores images at paths like:
     *   /images/users/{USER-UUID}/{IMAGE-UUID}.webp
     *   /images/{entity}s/{ENTITY-UUID}/{IMAGE-UUID}.webp
     *
     * The IMAGE UUID is always the filename stem — never the directory UUID.
     * We strip query strings and extensions, then check the filename first.
     * If the stem isn't a UUID (e.g. "thumb_..."), we fall back to the last
     * UUID found anywhere in the URL.
     */
    private _extractUuidFromUrl(url: string): string {
        const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        // Strip query string / fragment then grab the filename stem.
        const clean   = url.split('?')[0].split('#')[0];
        const stem    = (clean.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
        if (uuidRe.test(stem)) return stem;
        // Fallback: last UUID in the URL (still avoids picking up the directory UUID
        // which always appears before the image UUID).
        const all = [...clean.matchAll(new RegExp(uuidRe.source, 'gi'))];
        return all.length > 0 ? all[all.length - 1][0] : '';
    }

    /**
     * Called once when the modal opens with a known `currentImageUuid`.
     * Makes a single request to `GET /api/v1/images/{uuid}`.
     *
     * The media server is expected to return the requested image AND embed its
     * root ancestor (the image with no parent_uuid) under an `original` or
     * `parent` key.  Example response shape:
     *
     *   { data: { image_uuid, image, parent_uuid, original: { image_uuid, image } } }
     *
     * If the current image has no parent it IS the original, so `_resolvedOriginalUrl`
     * is set to `data.image` directly.  Either way, Edit/Crop will use a resolved
     * URL immediately — no further API calls needed.
     */
    private async _fetchImageDetails(): Promise<void> {
        // Resolve UUID — prefer the explicit prop, fall back to extracting from the URL.
        const uuid = this.currentImageUuid || this._extractUuidFromUrl(this.currentImageUrl);
        if (!uuid) return;

        // Deduplicate: if we already fetched for this exact UUID skip the network call.
        if (this._lastFetchedUuid === uuid) return;
        this._lastFetchedUuid = uuid;

        // Back-fill the prop so the rest of the component always has it available.
        if (!this.currentImageUuid) this.currentImageUuid = uuid;

        // Fast path: caller already supplied the parent URL explicitly — trust it.
        if (this.parentImageUrl) {
            this._resolvedOriginalUrl  = this.parentImageUrl;
            this._resolvedOriginalUuid = this.parentImageUuid || '';
            return;
        }

        try {
            const token   = this.runtime?.getAccessToken();
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
            const toFull  = (v: string | undefined) =>
                v ? (v.startsWith('/') ? `${this._mediaUrl}${v}` : v) : '';

            const res = await fetch(
                `${this._mediaUrl}/api/v1/images/${encodeURIComponent(uuid)}`,
                { headers },
            );
            if (!res.ok) return;

            const body = await res.json() as {
                data?: {
                    image_uuid?: string;
                    url?: string;           // CDN path to this image
                    width?: number;
                    height?: number;
                    x_offset?: number | null;
                    y_offset?: number | null;
                    parent_uuid?: string | null;
                    /** Root ancestor embedded by the server when the image is a crop. */
                    original?: { image_uuid?: string; url?: string };
                    parent?:   { image_uuid?: string; url?: string };
                };
            };
            const d = body.data;
            if (!d) return;

            // Prefer the embedded `original`, fall back to `parent` key
            const ancestor = d.original ?? d.parent;
            if (ancestor?.url) {
                // Current image is a crop — use the embedded ancestor as the edit source
                this._resolvedOriginalUrl  = toFull(ancestor.url);
                this._resolvedOriginalUuid = ancestor.image_uuid ?? '';
            } else {
                // No parent embedded — this image is already the root original
                this._resolvedOriginalUrl  = toFull(d.url) || this.currentImageUrl;
                this._resolvedOriginalUuid = d.image_uuid  ?? this.currentImageUuid;
            }

            // Restore crop data if present
            if (d.parent_uuid && d.x_offset != null && d.y_offset != null) {
                this._cropData = {
                    x:      d.x_offset,
                    y:      d.y_offset,
                    width:  d.width  ?? 0,
                    height: d.height ?? 0,
                };
            } else {
                this._cropData = null;
            }
        } catch { /* silently fall back to currentImageUrl */ }
    }

    /**
     * Starts Edit / Crop.  By the time the user clicks the button, `_fetchImageDetails`
     * will already have resolved the original URL on modal open, so this is instant.
     * The fetch is re-triggered here only as a safety net for edge cases.
     */
    private async _startEditCropAsync(): Promise<void> {
        this._resolvingEdit = true;
        try {
            // If the proactive fetch on open hasn't resolved the original yet, force a fresh
            // fetch by resetting the dedup lock.  The background fetch that ran on modal open
            // may have set _lastFetchedUuid before the await resolved, which would cause
            // _fetchImageDetails() to return early and leave _resolvedOriginalUrl empty.
            if (!this._resolvedOriginalUrl && (this.currentImageUuid || this.currentImageUrl)) {
                this._lastFetchedUuid = '';   // bypass dedup — we must have a resolved URL
                await this._fetchImageDetails();
            }
            const url = this._resolvedOriginalUrl || this.currentImageUrl;
            this._destroyCropper();
            this._src = url;
            this._error = '';
            this._view = 'upload';
            await this.updateComplete;
            // Pass saved crop data so the cropper restores the previous selection.
            this._initCropper(this._cropData ?? undefined);
        } catch (err) {
            this._error = err instanceof Error ? err.message : 'Could not load image for editing.';
        } finally {
            this._resolvingEdit = false;
        }
    }

    // ── File loading ──────────────────────────────────────────────────────────

    private _loadFile(file: File): void {
        this._destroyCropper();
        this._src = null;
        this._error = '';
        const reader = new FileReader();
        reader.onload = (evt) => {
            this._src = evt.target?.result as string;
            void this.updateComplete.then(() => this._initCropper());
        };
        reader.readAsDataURL(file);
    }

    private _onFileChange(e: Event): void {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) this._loadFile(file);
    }

    private _onDragOver(e: DragEvent): void { e.preventDefault(); this._dragOver = true; }
    private _onDragLeave(): void { this._dragOver = false; }
    private _onDrop(e: DragEvent): void {
        e.preventDefault(); this._dragOver = false;
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) this._loadFile(file);
    }

    private _onPaste(e: ClipboardEvent): void {
        if (this._view !== 'upload') return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) { this._loadFile(file); break; }
            }
        }
    }

    private _openFilePicker(): void {
        this.querySelector<HTMLInputElement>('.dynlit-mi__file-input')?.click();
    }

    // ── Library ───────────────────────────────────────────────────────────────

    private async _loadLibrary(): Promise<void> {
        this._libraryLoading = true;
        this._libraryError = '';
        try {
            const token = this.runtime?.getAccessToken();
            const url = `${this._mediaUrl}/api/v1/images?user_uuid=${encodeURIComponent(this.userUuid)}`;
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error(`Failed to load images (${res.status})`);
            const body = await res.json() as { data?: LibraryImage[] };
            const images = body.data ?? [];
            this._libraryImages = images;

            // If the user refreshed while viewing a parent's crops sub-view,
            // re-anchor _libraryCropsParent to the freshly loaded object so
            // the crops list reflects the latest data.  If the parent image
            // has been deleted, fall back to the root grid.
            if (this._libraryCropsParent) {
                const refreshed = images.find(
                    img => img.image_uuid === this._libraryCropsParent!.image_uuid,
                );
                if (refreshed) {
                    this._libraryCropsParent = refreshed;
                } else {
                    this._libraryView        = 'grid';
                    this._libraryCropsParent = null;
                }
            }
        } catch (err) {
            this._libraryError = err instanceof Error ? err.message : 'Failed to load images';
        } finally {
            this._libraryLoading = false;
        }
    }

    private _openLibraryCrops(e: Event, image: LibraryImage): void {
        e.stopPropagation(); // don't also fire _selectLibraryImage on the thumbnail
        this._libraryCropsParent = image;
        this._libraryView = 'crops';
    }

    private _backToLibraryGrid(): void {
        this._libraryView        = 'grid';
        this._libraryCropsParent = null;
    }

    /** Selecting a library image loads it into the manage preview; "Update Image" finalises. */
    private _selectLibraryImage(image: LibraryImage | CropLibraryImage): void {
        const toFull = (v: string) => v.startsWith('/') ? `${this._mediaUrl}${v}` : v;
        const imageUrl = toFull(image.url);
        const thumbUrl = toFull(image.thumb);

        // Reset the fetch-lock so _fetchImageDetails fires for the new UUID.
        this._lastFetchedUuid      = '';
        this._resolvedOriginalUrl  = '';
        this._resolvedOriginalUuid = '';

        this.currentImageUrl  = imageUrl;
        this.currentImageUuid = image.image_uuid;

        if (image.parent_uuid) {
            this.parentImageUuid       = image.parent_uuid;
            this._resolvedOriginalUuid = image.parent_uuid;
            this.parentImageUrl        = '';
            this._resolvedOriginalUrl  = '';
            this._cropData = (image.x_offset != null && image.y_offset != null)
                ? { x: image.x_offset, y: image.y_offset, width: image.width, height: image.height }
                : null;
        } else {
            this.parentImageUrl        = imageUrl;
            this.parentImageUuid       = image.image_uuid;
            this._resolvedOriginalUrl  = imageUrl;
            this._resolvedOriginalUuid = image.image_uuid;
            this._cropData = null;
        }

        this._pendingImageData = { ...image, image: imageUrl, thumb: thumbUrl };
        this._switchView('manage');
    }

    // ── Blob helper ───────────────────────────────────────────────────────────

    private async _dataUrlToBlob(dataUrl: string): Promise<Blob> {
        const res = await fetch(dataUrl);
        return res.blob();
    }

    // ── Save: upload original then (if cropped) upload crop ──────────────────

    private async _save(): Promise<void> {
        if (!this._cropper || !this._src) return;
        this._saving = true;
        this._error  = '';
        try {
            const token       = this.runtime?.getAccessToken();
            const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

            const toFullOrig = (v: unknown) =>
                typeof v === 'string' && v.startsWith('/') ? `${this._mediaUrl}${v}` : (v as string) ?? '';

            // ── Step 1: Upload original — only for brand-new files ────────────
            // When the user picks a new file (drag-drop / file-picker / paste),
            // _src is a data: URL and we must upload it as a new original.
            //
            // When the user clicks "Edit / Crop" on an existing image,
            // _startEditCropAsync sets _src to the resolved original's HTTP URL.
            // Re-uploading that blob would create a duplicate original every time.
            // Instead, we reuse _resolvedOriginalUuid which was already resolved
            // by _fetchImageDetails when the modal opened.
            const srcIsDataUrl = this._src.startsWith('data:');

            let originalUuid: string | undefined;
            let originalData: Record<string, unknown> = {};

            if (srcIsDataUrl) {
                // Fresh file — upload as a new root original.
                const originalBlob = await this._dataUrlToBlob(this._src);
                const ext          = originalBlob.type.split('/')[1] ?? 'bin';
                const originalForm = new FormData();
                originalForm.append('file', originalBlob, `original.${ext}`);
                originalForm.append('entity_name', this.entityName);
                originalForm.append('image_class', this.imageClass);
                if (this.entityId)   originalForm.append('entity_id',   this.entityId);
                if (this.entityUuid) originalForm.append('entity_uuid', this.entityUuid);
                // NOTE: do NOT send parent_uuid for the original — it is always a root image.

                const originalRes = await fetch(`${this._mediaUrl}/api/v1/upload-image`, {
                    method: 'POST', headers: authHeaders, body: originalForm,
                });
                if (!originalRes.ok) {
                    const msg = await originalRes.text().catch(() => originalRes.statusText);
                    throw new Error(`Original upload failed (${originalRes.status}): ${msg}`);
                }
                const originalJson = await originalRes.json() as { data?: Record<string, unknown> };
                originalData = originalJson.data ?? {};
                originalUuid = originalData['image_uuid'] as string | undefined;

                // Remember the original so "Edit / Crop" always opens the full-resolution source.
                this._resolvedOriginalUrl  = toFullOrig(originalData['image']);
                this._resolvedOriginalUuid = originalUuid ?? '';
            } else {
                // Existing server image — _resolvedOriginalUuid was already set by
                // _fetchImageDetails on modal open (or by _selectLibraryImage).
                // Do NOT re-upload; just reuse the existing root original.
                originalUuid = this._resolvedOriginalUuid || undefined;
                originalData = {
                    image:      this._resolvedOriginalUrl || this._src,
                    image_uuid: originalUuid,
                    thumb:      '',
                };
            }

            // ── Step 2: Capture crop-box geometry and check if cropping occurred ──
            // getData(true) returns x,y,width,height in the original image's pixel
            // coordinate space (integers).  We persist this so Edit/Crop can restore
            // the exact selection the next time the modal opens.
            const cropBoxData   = this._cropper.getData(true);
            const croppedCanvas = this._cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 });
            const srcImg        = this.querySelector<HTMLImageElement>('#cropper-img');
            const wasCropped    = !srcImg ||
                croppedCanvas.width  !== srcImg.naturalWidth ||
                croppedCanvas.height !== srcImg.naturalHeight;

            let finalData: Record<string, unknown>;

            if (wasCropped) {
                // Upload cropped version, linking it to the original via parent_uuid
                const croppedBlob = await new Promise<Blob>((resolve, reject) => {
                    croppedCanvas.toBlob(
                        (b) => b ? resolve(b) : reject(new Error('Canvas export failed')),
                        'image/webp', 0.85,
                    );
                });
                const croppedForm = new FormData();
                croppedForm.append('file', croppedBlob, 'image.webp');
                croppedForm.append('entity_name', this.entityName);
                croppedForm.append('image_class', this.imageClass);
                if (this.entityId)   croppedForm.append('entity_id',   this.entityId);
                if (this.entityUuid) croppedForm.append('entity_uuid', this.entityUuid);
                if (originalUuid)    croppedForm.append('parent_uuid', originalUuid);
                // Store the crop-box origin on the image record so it can be restored later.
                croppedForm.append('x_offset', String(cropBoxData.x));
                croppedForm.append('y_offset', String(cropBoxData.y));

                const croppedRes = await fetch(`${this._mediaUrl}/api/v1/upload-image`, {
                    method: 'POST', headers: authHeaders, body: croppedForm,
                });
                if (!croppedRes.ok) {
                    const msg = await croppedRes.text().catch(() => croppedRes.statusText);
                    throw new Error(`Crop upload failed (${croppedRes.status}): ${msg}`);
                }
                const croppedJson = await croppedRes.json() as { data?: Record<string, unknown> };
                finalData = croppedJson.data ?? {};
            } else {
                // No actual crop — the original IS the final image.
                // For an existing server image, fall back to _pendingImageData so
                // the full record (including thumb) is preserved for downstream consumers.
                finalData = (!srcIsDataUrl && this._pendingImageData)
                    ? this._pendingImageData
                    : originalData;
            }

            // ── Normalize relative CDN paths to absolute URLs ─────────────────
            const toFullUrl = (v: unknown): unknown =>
                typeof v === 'string' && v.startsWith('/') ? `${this._mediaUrl}${v}` : v;
            finalData['image'] = toFullUrl(finalData['image']);
            finalData['thumb'] = toFullUrl(finalData['thumb']);

            // ── If we uploaded a crop, enrich finalData with the original's info ──
            // This lets callers round-trip original_image_url / original_image_uuid
            // back as parentImageUrl / parentImageUuid on the next modal open, so
            // Edit/Crop always has the full-resolution source without an API lookup.
            if (wasCropped) {
                finalData['parent_uuid']         = finalData['parent_uuid'] ?? originalUuid;
                finalData['original_image_url']  = this._resolvedOriginalUrl;
                finalData['original_image_uuid'] = this._resolvedOriginalUuid;

                // Persist on this component instance so the next routingContext reset
                // (modal re-open) seeds _resolvedOriginalUrl from the prop rather than
                // needing another API call.
                this.parentImageUrl  = this._resolvedOriginalUrl;
                this.parentImageUuid = this._resolvedOriginalUuid;

                // Cache the crop geometry so Edit/Crop can restore it instantly.
                this._cropData = {
                    x:      cropBoxData.x,
                    y:      cropBoxData.y,
                    width:  cropBoxData.width,
                    height: cropBoxData.height,
                };
            } else {
                this._cropData = null;
            }

            // ── Store result and return to the manage view ────────────────────
            this._pendingImageData = finalData;
            this.currentImageUrl   = (finalData['image']      as string) ?? '';
            this.currentImageUuid  = (finalData['image_uuid'] as string) ?? '';

            this._destroyCropper();
            this._src  = null;
            this._view = 'manage';

        } catch (err) {
            console.error('Image upload error:', err);
            this._error = err instanceof Error ? err.message : 'Failed to update image.';
        } finally {
            this._saving = false;
        }
    }

    // ── Update image: dispatch pending data and close modal ───────────────────

    private _updateImage(): void {
        const data = this._pendingImageData
            ?? { image: this.currentImageUrl, image_uuid: this.currentImageUuid };
        window.dispatchEvent(new CustomEvent('dynlit:image:saved', { detail: data, bubbles: true }));
        this.runtime?.closeModal();
    }

    // ── Render helpers ────────────────────────────────────────────────────────

    private _renderManageView(): TemplateResult {
        return html`
            <div class="dynlit-mi__manage-layout">
                <!-- Left sidebar with action buttons -->
                <div class="dynlit-mi__sidebar">
                    <button class="btn" @click=${() => this._startUpload()}>Upload New</button>
                    ${this.currentImageUrl ? html`
                        <button class="btn"
                            ?disabled=${this._resolvingEdit}
                            @click=${() => this._startEditCropAsync()}>
                            ${this._resolvingEdit
                                ? html`<span class="dynlit-mi__spinner dynlit-mi__spinner--sm"></span>`
                                : ''}
                            Edit / Crop
                        </button>
                    ` : ''}
                    <button class="btn" @click=${() => this._switchView('library')}>Image Library</button>
                </div>

                <!-- Right image preview -->
                <div class="dynlit-mi__preview">
                    ${this.currentImageUrl
                        ? html`<img src=${this.currentImageUrl} alt="Current image" />`
                        : html`
                            <div class="dynlit-mi__placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="m21 15-5-5L5 21"/>
                                </svg>
                                <p>No image selected</p>
                            </div>
                        `}
                </div>
            </div>
        `;
    }

    private _renderUploadView(): TemplateResult {
        // Image loaded — show the cropper only.
        if (this._src) {
            return html`
                <div class="dynlit-mi__cropper-wrap">
                    <img id="cropper-img"
                         src=${this._src}
                         crossorigin="anonymous"
                         alt="Image to crop" />
                </div>
                ${this._error ? html`<span class="dynlit-mi__error">${this._error}</span>` : ''}
            `;
        }

        // No image yet — show the drop zone.
        return html`
            <div
                class="dynlit-mi__dropzone ${this._dragOver ? 'drag-over' : ''}"
                @click=${this._openFilePicker}
                @dragover=${this._onDragOver}
                @dragleave=${this._onDragLeave}
                @drop=${this._onDrop}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none"
                     stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M12 3v11M8 7l4-4 4 4"/>
                </svg>
                <p>Drag & drop, paste, or <u>click to browse</u></p>
                <small>JPG, PNG, GIF, WebP, SVG — max 10 MB</small>
            </div>
            <input class="dynlit-mi__file-input" type="file" accept="image/*"
                   @change=${this._onFileChange} />
            ${this._error ? html`<p class="dynlit-mi__error">${this._error}</p>` : ''}
        `;
    }

    private _renderLibraryPanel(): TemplateResult {
        const inCrops = this._libraryView === 'crops' && this._libraryCropsParent !== null;

        return html`
            <div class="dynlit-mi__lib-header">
                ${inCrops
                    ? html`<button class="btn btn-sm" @click=${this._backToLibraryGrid}>← Back</button>`
                    : html`<button class="btn btn-sm" @click=${() => this._switchView('manage')}>← Back</button>`
                }
                <span>${inCrops ? 'Cropped Image Versions' : 'Your Images'}</span>
                <button class="btn btn-sm" style="margin-left:auto" @click=${this._loadLibrary}>↺ Refresh</button>
            </div>
            <div class="dynlit-mi__lib-body">
                ${this._libraryLoading
                    ? html`<div style="text-align:center;padding:32px"><span class="dynlit-mi__spinner"></span></div>`
                    : this._libraryError
                        ? html`<p class="dynlit-mi__error">${this._libraryError}</p>`
                        : inCrops
                            ? this._renderLibraryCropsGrid(this._libraryCropsParent!)
                            : this._renderLibraryRootGrid()}
            </div>
        `;
    }

    private _renderLibraryRootGrid(): TemplateResult {
        if (this._libraryImages.length === 0) {
            return html`<p class="dynlit-mi__lib-empty">No images uploaded yet.</p>`;
        }
        return html`
            <div class="dynlit-mi__lib-grid">
                ${this._libraryImages.map(img => html`
                    <div class="dynlit-mi__lib-item" @click=${() => this._selectLibraryImage(img)}>
                        <img src="${this._mediaUrl}${img.thumb}" alt="${img.image_class}" loading="lazy" />
                        ${img.crops && img.crops.length > 0 ? html`
                            <div
                                class="dynlit-mi__lib-badge"
                                title="${img.crops.length} cropped version${img.crops.length === 1 ? '' : 's'} — click to view"
                                @click=${(e: Event) => this._openLibraryCrops(e, img)}
                            ></div>
                            <span class="dynlit-mi__lib-badge-count">${img.crops.length}</span>
                        ` : ''}
                    </div>
                `)}
            </div>
        `;
    }

    private _renderLibraryCropsGrid(parent: LibraryImage): TemplateResult {
        const crops = parent.crops ?? [];
        return html`
            <!-- Parent image context banner -->
            <div class="dynlit-mi__lib-parent-banner">
                <img src="${this._mediaUrl}${parent.thumb}" alt="${parent.image_class}" />
                <div>
                    <div class="dynlit-mi__lib-parent-banner__label">Original</div>
                    <div class="dynlit-mi__lib-parent-banner__class">${parent.image_class}</div>
                </div>
            </div>
            ${crops.length === 0
                ? html`<p class="dynlit-mi__lib-empty">No cropped versions yet.</p>`
                : html`
                    <div class="dynlit-mi__lib-grid">
                        ${crops.map(crop => html`
                            <div class="dynlit-mi__lib-item" @click=${() => this._selectLibraryImage(crop)}>
                                <img src="${this._mediaUrl}${crop.thumb}" alt="${crop.image_class}" loading="lazy" />
                            </div>
                        `)}
                    </div>
                `}
        `;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    override render(): TemplateResult {
        const isUpload  = this._view === 'upload';
        const isLibrary = this._view === 'library';

        return html`
            <div class="dynlit-mi">
                <div class="dynlit-mi__header">
                    <h4>${isUpload
                        ? (this._src ? 'Edit / Crop Image' : 'Upload Image')
                        : isLibrary
                            ? (this._libraryView === 'crops' ? 'Cropped Versions' : 'Image Library')
                            : 'Manage Image'
                    }</h4>
                    <button class="dynlit-mi__close" @click=${() => this.runtime?.closeModal()}>✕</button>
                </div>

                <div class="dynlit-mi__body">
                    ${isUpload
                        ? html`<div class="dynlit-mi__panel-main">${this._renderUploadView()}</div>`
                        : html`
                            <!-- Slider: manage (left) + library (right) move in unison -->
                            <div class="dynlit-mi__slider ${isLibrary ? 'dynlit-mi__slider--library' : ''}">
                                <div class="dynlit-mi__slide-pane">
                                    ${this._renderManageView()}
                                </div>
                                <div class="dynlit-mi__slide-pane">
                                    <div class="dynlit-mi__panel-library">
                                        ${this._renderLibraryPanel()}
                                    </div>
                                </div>
                            </div>
                        `
                    }
                </div>

                <div class="dynlit-mi__footer">
                    ${isUpload ? html`
                        <button class="btn" @click=${() => this._switchView('manage')}>← Back</button>
                        <button
                            class="btn btn-primary"
                            ?disabled=${!this._src || this._saving}
                            @click=${this._save}
                        >
                            ${this._saving
                                ? html`<span class="dynlit-mi__spinner"></span> Saving…`
                                : 'Crop & Save'}
                        </button>
                    ` : html`
                        <button class="btn" @click=${() => this.runtime?.closeModal()}>Cancel</button>
                        <button
                            class="btn btn-primary"
                            ?disabled=${!this.currentImageUrl}
                            @click=${this._updateImage}
                        >Update Image</button>
                    `}
                </div>
            </div>
        `;
    }
}
