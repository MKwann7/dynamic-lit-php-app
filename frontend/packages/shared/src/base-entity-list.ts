import { css, html, PropertyValues, TemplateResult, CSSResultGroup } from 'lit';
import { state, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from './runtime-widget';
import type { FieldDef, FilterDef, ListApiResponse } from './list-types';

export abstract class BaseEntityList<
    T extends Record<string, unknown>
> extends RuntimeWidgetElement {

    // ── Abstract — subclass must provide ─────────────────────────────────────

    /** REST endpoint, e.g. "/api/v1/sites" */
    protected abstract apiPath: string;

    /** Field metadata driving columns, search hints, and card display */
    protected abstract fields: FieldDef<T>[];

    /** Called when the user double-clicks a card or row */
    protected abstract onItemOpen(item: T): void;

    // ── Optional overrides ────────────────────────────────────────────────────

    /** Filter dropdown options. First entry is selected by default. */
    protected get filters(): FilterDef[] {
        return [{ value: 'Everything', label: 'Everything' }];
    }

    /** Label for the primary create/action button */
    protected get createLabel(): string { return 'Create New'; }

    /**
     * DOM event name that signals an item was updated externally.
     * The base class subscribes in connectedCallback and merges the payload.
     */
    protected get itemUpdatedEvent(): string { return 'dynlit:entity:updated'; }

    /** Override to return a banner/thumbnail URL from an item */
    protected getBannerUrl(_item: T): string | null { return null; }

    /**
     * Override to inject extra query parameters into every API request.
     * Account lists scope to owned records; admin lists scope to whitelabel.
     */
    protected buildExtraParams(): Record<string, string> { return {}; }

    /**
     * Primary card label — defaults to the first card-visible field's value.
     */
    protected getCardTitle(item: T): string {
        const f = this.cardFields[0];
        return f ? String(item[f.key] ?? '') : '';
    }

    /**
     * Secondary card label — defaults to the second card-visible field's value.
     */
    protected getCardSubtitle(item: T): string {
        const f = this.cardFields[1];
        return f ? String(item[f.key] ?? '') : '';
    }

    // ── Derived field lists ───────────────────────────────────────────────────

    protected get cardFields(): FieldDef<T>[] {
        return this.fields.filter(f => f.card !== false);
    }

    protected get listFields(): FieldDef<T>[] {
        return this.fields.filter(f => f.list !== false);
    }

    private get searchableKeys(): string {
        return this.fields
            .filter(f => f.searchable)
            .map(f => f.key)
            .join(',');
    }

    // ── State ─────────────────────────────────────────────────────────────────

    @state() protected items: T[]          = [];
    @state() protected currentPage         = 1;
    @state() protected totalPages          = 1;
    @state() protected isLoading           = false;
    @state() protected errorMessage        = '';
    @state() protected displayMode: 'grid' | 'list' = 'grid';
    @state() protected searchQuery         = '';
    @state() protected filterValue         = '';

    /**
     * Stored reference to the bound item-updated handler so the same function
     * object can be passed to both addEventListener and removeEventListener.
     */
    private _boundItemUpdated: EventListener | null = null;

    // ── Configurable attribute ────────────────────────────────────────────────

    @property({ type: Number, attribute: 'per-page' })
    perPage = 20;

    // ── Base styles ───────────────────────────────────────────────────────────

    static styles: CSSResultGroup = css`
        .ent-card {
            cursor: pointer;
            transition: box-shadow 0.15s ease;
        }
        .ent-card:hover {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }
        .ent-card .card-thumb {
            height: 140px;
            overflow: hidden;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ent-card .card-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .ent-list-thumb {
            width: 60px;
            height: 42px;
            object-fit: cover;
            border-radius: 4px;
            display: block;
        }
        /* Badge size used by the default status formatter */
        .badge { font-size: 0.7rem; }
    `;

    // ── Light DOM ─────────────────────────────────────────────────────────────

    override createRenderRoot() {
        this._injectLightStyles();
        return this;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override connectedCallback() {
        super.connectedCallback();
        this.filterValue = this.filters[0]?.value ?? 'Everything';
        void this.fetchItems();
        this._boundItemUpdated = (e: Event) =>
            this.onItemUpdated(e as CustomEvent<T>);
        window.addEventListener(this.itemUpdatedEvent, this._boundItemUpdated);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        if (this._boundItemUpdated) {
            window.removeEventListener(this.itemUpdatedEvent, this._boundItemUpdated);
            this._boundItemUpdated = null;
        }
    }

    override updated(changed: PropertyValues): void {
        super.updated(changed);
        // When runtime is injected AFTER connectedCallback (e.g. embedded in a parent
        // component), the initial fetchItems() call returned early. Retry now.
        if (changed.has('runtime') && this.runtime && !this.isLoading && this.items.length === 0) {
            void this.fetchItems(1);
        }
    }

    // ── Data fetching ─────────────────────────────────────────────────────────

    protected async fetchItems(page = 1): Promise<void> {
        if (!this.runtime) return;   // will be retried by updated() once runtime arrives
        this.isLoading    = true;
        this.errorMessage = '';
        try {
            const params = new URLSearchParams({
                page:   String(page),
                q:      this.searchQuery,
                filter: this.filterValue,
                ...this.buildExtraParams(),
            });
            if (this.searchableKeys) {
                params.set('search_fields', this.searchableKeys);
            }

            const res = await this.runtime?.apiFetch(
                `${this.apiPath}?${params}`
            );
            if (!res?.ok) {
                this.errorMessage = 'Could not load data.';
                return;
            }
            const body = await res.json() as ListApiResponse<T>;
            this.items       = body.data        ?? [];
            this.totalPages  = body.meta?.pages ?? 1;
            this.currentPage = body.meta?.page  ?? 1;
        } catch {
            this.errorMessage = 'Could not load data.';
        } finally {
            this.isLoading = false;
        }
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    protected onItemUpdated(e: CustomEvent<T>): void {
        const updated = e.detail;
        // Match on the first field named "uuid", "id", or ending in "_id"
        const idKey = this.fields.find(
            f => f.key === 'uuid' || f.key === 'id' || f.key.endsWith('_id')
        )?.key;
        if (!idKey) return;
        this.items = this.items.map(item =>
            item[idKey] === updated[idKey] ? { ...item, ...updated } : item
        );
    }

    private onSearch(e: Event): void {
        this.searchQuery = (e.target as HTMLInputElement).value;
        void this.fetchItems(1);
    }

    private onFilterChange(e: Event): void {
        this.filterValue = (e.target as HTMLSelectElement).value;
        void this.fetchItems(1);
    }

    private onPageChange(dir: 'prev' | 'next'): void {
        const next = dir === 'prev'
            ? Math.max(1, this.currentPage - 1)
            : Math.min(this.totalPages, this.currentPage + 1);
        void this.fetchItems(next);
    }

    // ── Default renderers — override in subclass for custom output ─────────────

    /**
     * Card body content.
     * The outer .card wrapper and @dblclick handler are applied by the base.
     * Override for fully custom card interiors.
     */
    protected renderCard(item: T): TemplateResult {
        const banner = this.getBannerUrl(item);
        return html`
            <div class="card-thumb">
                ${banner
                    ? html`<img src="${banner}" alt="${this.getCardTitle(item)}">`
                    : html`<span class="text-muted"><i class="fas fa-image fa-2x"></i></span>`}
            </div>
            <div class="card-body p-2 text-center">
                <div class="small text-truncate fw-semibold">${this.getCardTitle(item)}</div>
                <div class="text-muted" style="font-size:0.75rem;">${this.getCardSubtitle(item)}</div>
            </div>`;
    }

    /**
     * One row's <td> cells, auto-generated from listFields.
     * The <tr> wrapper and @dblclick handler are applied by the base.
     * Override for fully custom row cells.
     */
    protected renderRow(item: T): TemplateResult {
        return html`${this.listFields.map(f => html`
            <td class="${f.truncate ? 'text-truncate' : ''}"
                style="${f.truncate ? 'max-width:180px;' : ''}">
                ${f.format
                    ? f.format(item[f.key], item)
                    : (item[f.key] ?? '—')}
            </td>`)}`;
    }

    // ── Toolbar ───────────────────────────────────────────────────────────────

    protected renderToolbar(): TemplateResult {
        return html`
            <div class="d-flex align-items-center flex-wrap gap-2 px-3 py-2 border-bottom">

                <select class="form-select form-select-sm"
                        style="width:auto; min-width:130px;"
                        @change=${this.onFilterChange}>
                    ${this.filters.map(f => html`
                        <option value="${f.value}">${f.label}</option>`)}
                </select>

                <input class="form-control form-control-sm"
                       style="max-width:220px;"
                       type="search"
                       placeholder="Search..."
                       .value=${this.searchQuery}
                       @input=${this.onSearch} />

                <button class="btn btn-primary btn-sm">
                    <i class="fas fa-plus me-1"></i> ${this.createLabel}
                </button>

                <!-- Right side: pagination + view toggle -->
                <div class="ms-auto d-flex align-items-center gap-3">
                    <span class="text-muted small text-nowrap">
                        Current: ${this.currentPage} &nbsp; Pages: ${this.totalPages}
                    </span>
                    <div class="d-flex gap-1">
                        <button class="btn btn-outline-secondary btn-sm bg-light"
                                ?disabled=${this.currentPage <= 1}
                                @click=${() => this.onPageChange('prev')}>Prev</button>
                        <button class="btn btn-outline-secondary btn-sm bg-light"
                                ?disabled=${this.currentPage >= this.totalPages}
                                @click=${() => this.onPageChange('next')}>Next</button>
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn ${this.displayMode === 'grid' ? 'btn-secondary' : 'btn-outline-secondary'}"
                                @click=${() => { this.displayMode = 'grid'; }}>
                            <i class="fas fa-th-large"></i>
                        </button>
                        <button class="btn ${this.displayMode === 'list' ? 'btn-secondary' : 'btn-outline-secondary'}"
                                @click=${() => { this.displayMode = 'list'; }}>
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    // ── Grid / list containers ────────────────────────────────────────────────

    private renderGridView(): TemplateResult {
        return html`
            <div class="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3 p-3">
                ${this.items.map(item => html`
                    <div class="col">
                        <div class="card ent-card h-100"
                             @dblclick=${() => this.onItemOpen(item)}>
                            ${this.renderCard(item)}
                        </div>
                    </div>`)}
            </div>`;
    }

    private renderListView(): TemplateResult {
        return html`
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            ${this.listFields.map(f => html`<th>${f.label}</th>`)}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.items.map(item => html`
                            <tr @dblclick=${() => this.onItemOpen(item)}
                                style="cursor:pointer;">
                                ${this.renderRow(item)}
                            </tr>`)}
                    </tbody>
                </table>
            </div>`;
    }

    // ── Root render ───────────────────────────────────────────────────────────

    override render(): TemplateResult {
        return html`
            ${this.renderToolbar()}
            ${this.isLoading
                ? html`
                    <div class="d-flex justify-content-center align-items-center p-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading…</span>
                        </div>
                    </div>`
                : this.errorMessage
                    ? html`<div class="alert alert-danger mx-3 mt-3">${this.errorMessage}</div>`
                    : this.items.length === 0
                        ? html`<p class="text-center text-muted p-5 mb-0">No items found.</p>`
                        : this.displayMode === 'grid'
                            ? this.renderGridView()
                            : this.renderListView()}`;
    }
}

