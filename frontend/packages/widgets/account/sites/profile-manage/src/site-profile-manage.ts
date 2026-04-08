import { css, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

type FieldStatus = 'idle' | 'checking' | 'ok' | 'taken';

@customElement('dynlit-site-profile-manage')
export class DynLitSiteProfileManage extends RuntimeWidgetElement {

    static styles = css`
        :host { display: block; width: 100%; background: #fff; }

        /* ── Modal chrome ────────────────────────────────────────────────── */
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 24px 14px;
            border-bottom: 1px solid #dee2e6;
        }
        .modal-header h4 {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: #212529;
        }
        .close-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.3rem;
            color: #6c757d;
            line-height: 1;
            padding: 2px 6px;
        }
        .close-btn:hover { color: #212529; }

        .modal-body { padding: 20px 24px; }

        /* ── Form rows ───────────────────────────────────────────────────── */
        .form-row {
            display: flex;
            align-items: center;
            margin-bottom: 14px;
            gap: 0;
        }
        .form-label {
            width: 110px;
            flex-shrink: 0;
            font-size: 0.875rem;
            color: #212529;
        }
        /* Owner row gets the grey label block */
        .form-row.owner-row .form-label {
            background: #e9ecef;
            padding: 9px 14px;
            border: 1px solid #ced4da;
            border-right: none;
            border-radius: 6px 0 0 6px;
            font-weight: 500;
            display: flex;
            align-items: center;
            height: 38px;
            box-sizing: border-box;
        }
        .form-control {
            flex: 1;
            padding: 8px 12px;
            font-size: 0.875rem;
            color: #212529;
            background: #fff;
            border: 1px solid #ced4da;
            border-radius: 6px;
            outline: none;
            box-sizing: border-box;
            height: 38px;
            transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-control:focus {
            border-color: #198754;
            box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.15);
        }
        /* Owner input attaches to the grey label */
        .form-row.owner-row .form-control {
            border-radius: 0 6px 6px 0;
        }
        select.form-control {
            appearance: auto;
            cursor: pointer;
        }

        /* ── Typeahead owner dropdown ────────────────────────────────────── */
        .owner-wrap {
            flex: 1;
            position: relative;
        }
        .owner-wrap .form-control { width: 100%; }
        .owner-dropdown {
            position: absolute;
            top: calc(100% + 2px);
            left: 0;
            right: 0;
            background: #fff;
            border: 1px solid #ced4da;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-height: 180px;
            overflow-y: auto;
            z-index: 10;
        }
        .owner-option {
            padding: 8px 12px;
            font-size: 0.875rem;
            cursor: pointer;
            color: #212529;
        }
        .owner-option:hover { background: #f0f2f5; }
        .owner-option.loading { color: #6c757d; font-style: italic; }

        /* ── Footer ──────────────────────────────────────────────────────── */
        .modal-footer {
            padding: 0 24px 20px;
        }
        .btn-submit {
            display: block;
            width: 100%;
            padding: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            background: #0d6efd;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s;
        }
        .btn-submit:hover   { background: #0b5ed7; }
        .btn-submit:disabled { background: #6ea8fe; cursor: not-allowed; }

        /* ── Alerts ──────────────────────────────────────────────────────── */
        .alert {
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 0.85rem;
            margin-bottom: 14px;
        }
        .alert-danger  { background: #f8d7da; color: #58151c; }
        .alert-success { background: #d1e7dd; color: #0a3622; }

        /* ── Uniqueness status indicator ─────────────────────────────────── */
        .field-wrap { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .field-status {
            font-size: 0.78rem;
            padding-left: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .field-status.ok       { color: #198754; }
        .field-status.taken    { color: #dc3545; }
        .field-status.checking { color: #6c757d; }
        .form-control.status-ok     { border-color: #198754; }
        .form-control.status-taken  { border-color: #dc3545; }
        .form-control.status-ok:focus   { box-shadow: 0 0 0 3px rgba(25,135,84,0.15); }
        .form-control.status-taken:focus { box-shadow: 0 0 0 3px rgba(220,53,69,0.15); }

        /* ── Toggle switch ───────────────────────────────────────────────── */
        .toggle-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
            padding-left: 110px; /* align with form-control start */
        }
        .toggle-label {
            font-size: 0.875rem;
            color: #212529;
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .toggle-hint {
            font-size: 0.78rem;
            color: #6c757d;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 22px;
            flex-shrink: 0;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
            position: absolute;
            inset: 0;
            background: #ced4da;
            border-radius: 22px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .toggle-slider::before {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            left: 3px;
            top: 3px;
            background: #fff;
            border-radius: 50%;
            transition: transform 0.2s;
        }
        .toggle-switch input:checked + .toggle-slider { background: #0d6efd; }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

        /* ── SSL sub-section ─────────────────────────────────────────────── */
        .ssl-sub {
            border-left: 3px solid #0d6efd;
            margin-left: 110px;
            padding-left: 14px;
            margin-bottom: 14px;
        }
        .ssl-sub .toggle-row { padding-left: 0; margin-bottom: 10px; }
        .ssl-pem {
            font-family: monospace;
            font-size: 0.78rem;
            height: 110px;
            resize: vertical;
            line-height: 1.4;
        }
    `;

    // ── State ─────────────────────────────────────────────────────────────────

    @state() private siteUuid: string | null = null;

    // Form fields
    @state() private siteName    = '';
    @state() private domain      = '';
    @state() private vanityUrl   = '';
    @state() private templateId: number | null = null;
    @state() private status      = 'active';

    // Track original server values so we skip the uniqueness check when unchanged
    private originalDomain     = '';
    private originalVanityUrl  = '';

    // Uniqueness validation
    @state() private domainStatus: FieldStatus = 'idle';
    @state() private vanityStatus: FieldStatus = 'idle';

    // Owner search
    @state() private ownerQuery    = '';
    @state() private ownerResults: Array<{ id: number; label: string }> = [];
    @state() private ownerSearching = false;
    @state() private selectedOwnerId: number | null = null;
    @state() private showOwnerDrop = false;

    // Submit state
    @state() private isSaving   = false;
    @state() private errorMsg   = '';
    @state() private successMsg = '';

    // SSL fields
    @state() private useSsl          = false;
    @state() private useLetsEncrypt  = true;
    @state() private sslCertPem      = '';
    @state() private sslKeyPem       = '';
    @state() private certError       = '';
    @state() private keyError        = '';

    private ownerDebounce:  ReturnType<typeof setTimeout> | null = null;
    private domainDebounce: ReturnType<typeof setTimeout> | null = null;
    private vanityDebounce: ReturnType<typeof setTimeout> | null = null;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override connectedCallback() {
        super.connectedCallback();
        this.siteUuid = this.getRouteParam('uuid');
        if (this.siteUuid) void this.loadSite();
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    private async loadSite(): Promise<void> {
        try {
            const res  = await this.runtime!.apiFetch(`/api/v1/sites/${this.siteUuid}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json() as Record<string, unknown>;
            const data = (body.data ?? body) as Record<string, unknown>;

            this.siteName  = String(data.site_name  ?? '');
            this.domain    = String(data.domain     ?? '');
            this.vanityUrl = String(data.vanity_url ?? '');
            this.status    = String(data.status     ?? 'active');
            this.templateId = typeof data.template_id === 'number' ? data.template_id : null;
            this.useSsl    = Boolean(data.has_domain_ssl ?? false);

            // ── Restore SSL sub-fields from the domain_ssl record ─────────
            const ssl = data.ssl as Record<string, unknown> | undefined;
            if (ssl) {
                this.useLetsEncrypt = Boolean(ssl.is_lets_encrypt ?? true);
                if (!this.useLetsEncrypt) {
                    this.sslCertPem = String(ssl.cert_pem ?? '');
                    this.sslKeyPem  = String(ssl.key_pem  ?? '');
                }
            } else {
                // No domain_ssl row yet — default to Let's Encrypt
                this.useLetsEncrypt = true;
            }
            // ─────────────────────────────────────────────────────────────

            // Snapshot the original values — these are already valid for this site
            this.originalDomain    = this.domain;
            this.originalVanityUrl = this.vanityUrl;
            this.domainStatus      = this.domain    ? 'ok' : 'idle';
            this.vanityStatus      = this.vanityUrl ? 'ok' : 'idle';

            if (data.owner_name) this.ownerQuery = String(data.owner_name);
            if (typeof data.owner_id === 'number') this.selectedOwnerId = data.owner_id;
        } catch {
            this.errorMsg = 'Failed to load site data.';
        }
    }

    // ── Uniqueness helpers ────────────────────────────────────────────────────

    private scheduleCheck(field: 'domain' | 'vanity_url', value: string): void {
        const isOriginal = field === 'domain'
            ? value === this.originalDomain
            : value === this.originalVanityUrl;

        if (field === 'domain') {
            this.domainStatus = isOriginal ? 'ok' : value ? 'checking' : 'idle';
        } else {
            this.vanityStatus = isOriginal ? 'ok' : value ? 'checking' : 'idle';
        }

        if (isOriginal || !value) return;

        if (field === 'domain') {
            if (this.domainDebounce) clearTimeout(this.domainDebounce);
            this.domainDebounce = setTimeout(() => void this.runCheck('domain', value), 450);
        } else {
            if (this.vanityDebounce) clearTimeout(this.vanityDebounce);
            this.vanityDebounce = setTimeout(() => void this.runCheck('vanity_url', value), 450);
        }
    }

    private async runCheck(field: 'domain' | 'vanity_url', value: string): Promise<void> {
        if (!this.siteUuid) return;
        try {
            const param = field === 'domain'
                ? `domain=${encodeURIComponent(value)}`
                : `vanity_url=${encodeURIComponent(value)}`;

            const res  = await this.runtime!.apiFetch(
                `/api/v1/sites/${this.siteUuid}/check-unique?${param}`
            );
            if (!res.ok) return;
            const body = await res.json() as Record<string, unknown>;
            const data = (body.data ?? {}) as Record<string, unknown>;

            if (field === 'domain') {
                const d = data['domain'] as Record<string, unknown> | undefined;
                this.domainStatus = d?.unique === true ? 'ok' : 'taken';
            } else {
                const v = data['vanity_url'] as Record<string, unknown> | undefined;
                this.vanityStatus = v?.unique === true ? 'ok' : 'taken';
            }
        } catch {
            // Network error — don't block the user, just reset to idle
            if (field === 'domain') this.domainStatus = 'idle';
            else                    this.vanityStatus = 'idle';
        }
    }

    // ── Owner search ──────────────────────────────────────────────────────────

    private onOwnerInput(e: Event): void {
        const q = (e.target as HTMLInputElement).value;
        this.ownerQuery      = q;
        this.selectedOwnerId = null;
        this.showOwnerDrop   = q.length >= 2;
        if (this.ownerDebounce) clearTimeout(this.ownerDebounce);
        if (q.length < 2) { this.ownerResults = []; return; }
        this.ownerDebounce = setTimeout(() => void this.searchOwners(q), 300);
    }

    private async searchOwners(q: string): Promise<void> {
        this.ownerSearching = true;
        try {
            const res  = await this.runtime!.apiFetch(`/api/v1/users?q=${encodeURIComponent(q)}`);
            if (!res.ok) return;
            const body = await res.json() as Record<string, unknown>;
            const rows = Array.isArray(body.data) ? body.data : [];
            this.ownerResults = rows.map((u: Record<string, unknown>) => ({
                id:    Number(u.user_id ?? u.id),
                label: String(u.display_name ?? u.username ?? u.email ?? u.user_id),
            }));
        } finally {
            this.ownerSearching = false;
        }
    }

    private selectOwner(id: number, label: string): void {
        this.selectedOwnerId = id;
        this.ownerQuery      = label;
        this.showOwnerDrop   = false;
        this.ownerResults    = [];
    }

    // ── SSL PEM validation ────────────────────────────────────────────────────

    private validatePem(value: string, type: 'cert' | 'key'): string {
        const trimmed = value.trim();
        const label         = type === 'cert' ? 'Certificate'  : 'Private key';
        const beginMarker   = type === 'cert' ? '-----BEGIN CERTIFICATE-----'  : '-----BEGIN PRIVATE KEY-----';
        const endMarker     = type === 'cert' ? '-----END CERTIFICATE-----'    : '-----END PRIVATE KEY-----';

        if (!trimmed) {
            return `${label} is required.`;
        }
        if (!trimmed.startsWith(beginMarker) || !trimmed.endsWith(endMarker)) {
            return `Must be valid PEM format starting with ${beginMarker} and ending with ${endMarker}`;
        }
        const inner = trimmed.slice(beginMarker.length, trimmed.lastIndexOf(endMarker)).trim();
        if (!inner) {
            return `${label} PEM block is empty between the header and footer markers.`;
        }
        return '';
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    private async onSubmit(): Promise<void> {
        if (!this.siteUuid || this.isSaving) return;
        if (this.domainStatus === 'taken' || this.vanityStatus === 'taken') return;

        // Validate PEM fields before touching the network
        if (this.useSsl && !this.useLetsEncrypt) {
            this.certError = this.validatePem(this.sslCertPem, 'cert');
            this.keyError  = this.validatePem(this.sslKeyPem,  'key');
            if (this.certError || this.keyError) return;
        }

        this.isSaving   = true;
        this.errorMsg   = '';
        this.successMsg = '';

        try {
            const payload: Record<string, unknown> = {
                site_name:        this.siteName,
                domain:           this.domain,
                vanity_url:       this.vanityUrl,
                status:           this.status,
                template_id:      this.templateId,
                use_ssl:          this.useSsl,
                use_lets_encrypt: this.useLetsEncrypt,
            };
            if (this.selectedOwnerId !== null) payload['owner_id'] = this.selectedOwnerId;
            // Only ship cert material when the user is providing it manually
            if (this.useSsl && !this.useLetsEncrypt) {
                payload['ssl_cert_pem'] = this.sslCertPem;
                payload['ssl_key_pem']  = this.sslKeyPem;
            }

            const res = await this.runtime!.apiFetch(`/api/v1/sites/${this.siteUuid}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({})) as Record<string, unknown>;
                // Surface field-specific conflicts returned by the server
                const field = err.field as string | undefined;
                if (field === 'domain')     this.domainStatus = 'taken';
                if (field === 'vanity_url') this.vanityStatus = 'taken';
                throw new Error(String(err.message ?? `HTTP ${res.status}`));
            }

            this.successMsg = 'Site profile updated successfully.';

            // Broadcast the updated fields to the window so any listening component
            // (dashboard, list, etc.) can merge them without a re-fetch.
            // Include everything the form can change so consumers don't have to guess.
            let updatedPayload: Record<string, unknown> = {
                uuid:       this.siteUuid,
                site_name:  this.siteName,
                domain:     this.domain,
                vanity_url: this.vanityUrl,
                status:     this.status,
            };
            if (this.selectedOwnerId !== null) {
                updatedPayload['owner_id']   = this.selectedOwnerId;
                updatedPayload['owner_name'] = this.ownerQuery;
            }
            // Attempt to include the server's canonical response (e.g. formatted values)
            try {
                const body = await res.clone().json() as Record<string, unknown>;
                const data = (body.data ?? body) as Record<string, unknown>;
                updatedPayload = { ...updatedPayload, ...data, uuid: this.siteUuid };
            } catch { /* use form values as-is */ }

            window.dispatchEvent(new CustomEvent('dynlit:site:updated', {
                detail: updatedPayload,
            }));

            setTimeout(() => this.runtime?.closeModal(), 1200);
        } catch (e: unknown) {
            this.errorMsg = e instanceof Error ? e.message : 'An unexpected error occurred.';
        } finally {
            this.isSaving = false;
        }
    }

    private onClose(): void { this.runtime?.closeModal(); }

    // ── Render ────────────────────────────────────────────────────────────────

    private get canSubmit(): boolean {
        if (this.isSaving)                          return false;
        if (this.domainStatus === 'taken')          return false;
        if (this.vanityStatus === 'taken')          return false;
        if (this.domainStatus === 'checking')       return false;
        if (this.vanityStatus === 'checking')       return false;
        // Manual cert: both fields must be filled and valid before saving
        if (this.useSsl && !this.useLetsEncrypt) {
            if (!this.sslCertPem.trim() || !this.sslKeyPem.trim()) return false;
            if (this.certError || this.keyError)                    return false;
        }
        return true;
    }

    override render() {
        return html`
            <div class="modal-header">
                <h4>Edit Site Profile</h4>
                <button class="close-btn" aria-label="Close" @click=${this.onClose}>✕</button>
            </div>

            <div class="modal-body">
                ${this.errorMsg   ? html`<div class="alert alert-danger">${this.errorMsg}</div>`   : ''}
                ${this.successMsg ? html`<div class="alert alert-success">${this.successMsg}</div>` : ''}

                ${this.renderField('Site Title', html`
                    <input class="form-control" type="text"
                           .value=${this.siteName}
                           placeholder="e.g. My Website"
                           @input=${(e: Event) => { this.siteName = (e.target as HTMLInputElement).value; }} />`)}

                ${this.renderOwnerField()}

                ${this.renderValidatedField(
                    'Domain', this.domain, 'e.g. my-domain.com', this.domainStatus,
                    (v) => { this.domain = v; this.scheduleCheck('domain', v); }
                )}

                ${this.domain ? this.renderSslSection() : ''}

                ${this.renderValidatedField(
                    'Vanity URL', this.vanityUrl, 'e.g. mysite', this.vanityStatus,
                    (v) => { this.vanityUrl = v; this.scheduleCheck('vanity_url', v); }
                )}

                ${this.renderField('Site Theme', html`
                    <select class="form-control"
                            .value=${this.templateId?.toString() ?? ''}
                            @change=${(e: Event) => {
                                const v = (e.target as HTMLSelectElement).value;
                                this.templateId = v ? parseInt(v, 10) : null;
                            }}>
                        <option value="">— Select theme —</option>
                    </select>`)}

                ${this.renderField('Status', html`
                    <select class="form-control"
                            .value=${this.status}
                            @change=${(e: Event) => { this.status = (e.target as HTMLSelectElement).value; }}>
                        <option value="active">Active</option>
                        <option value="build">Build</option>
                        <option value="inactive">Inactive</option>
                    </select>`)}
            </div>

            <div class="modal-footer">
                <button class="btn-submit"
                        ?disabled=${!this.canSubmit}
                        @click=${this.onSubmit}>
                    ${this.isSaving    ? 'Saving…'
                    : !this.canSubmit  ? 'Fix errors above…'
                    :                   'Update Site Info'}
                </button>
            </div>`;
    }

    private renderField(label: string, control: TemplateResult): TemplateResult {
        return html`
            <div class="form-row">
                <span class="form-label">${label}</span>
                ${control}
            </div>`;
    }

    /** Domain / Vanity URL rows with inline uniqueness feedback */
    private renderValidatedField(
        label:    string,
        value:    string,
        placeholder: string,
        status:   FieldStatus,
        onInput:  (v: string) => void
    ): TemplateResult {
        const borderClass = status === 'ok'    ? 'status-ok'
                          : status === 'taken' ? 'status-taken'
                          : '';

        const statusLine = status === 'checking' ? html`
                <span class="field-status checking">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#6c757d">
                        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                    </svg>
                    Checking availability…
                </span>`
            : status === 'ok' ? html`
                <span class="field-status ok">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#198754">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Available
                </span>`
            : status === 'taken' ? html`
                <span class="field-status taken">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#dc3545">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    Already in use on this platform
                </span>`
            : '';

        return html`
            <div class="form-row">
                <span class="form-label">${label}</span>
                <div class="field-wrap">
                    <input class="form-control ${borderClass}" type="text"
                           .value=${value}
                           placeholder=${placeholder}
                           @input=${(e: Event) => onInput((e.target as HTMLInputElement).value)} />
                    ${statusLine}
                </div>
            </div>`;
    }

    private renderOwnerField(): TemplateResult {
        return html`
            <div class="form-row owner-row">
                <span class="form-label">Owner</span>
                <div class="owner-wrap">
                    <input class="form-control" type="text"
                           .value=${this.ownerQuery}
                           placeholder="Start Typing…"
                           autocomplete="off"
                           @input=${this.onOwnerInput}
                           @blur=${() => { setTimeout(() => { this.showOwnerDrop = false; }, 180); }} />
                    ${this.showOwnerDrop ? html`
                        <div class="owner-dropdown">
                            ${this.ownerSearching
                                ? html`<div class="owner-option loading">Searching…</div>`
                                : this.ownerResults.length === 0
                                    ? html`<div class="owner-option loading">No results</div>`
                                    : this.ownerResults.map(u => html`
                                        <div class="owner-option"
                                             @mousedown=${() => this.selectOwner(u.id, u.label)}>
                                            ${u.label}
                                        </div>`)}
                        </div>` : ''}
                </div>
            </div>`;
    }

    private renderSslSection(): TemplateResult {
        return html`
            <!-- Enable SSL toggle -->
            <div class="toggle-row">
                <label class="toggle-label">
                    <span class="toggle-switch">
                        <input type="checkbox"
                               .checked=${this.useSsl}
                               @change=${(e: Event) => {
                                   this.useSsl = (e.target as HTMLInputElement).checked;
                                   // Reset sub-options when SSL is turned off
                                   if (!this.useSsl) {
                                       this.useLetsEncrypt = true;
                                       this.sslCertPem = '';
                                       this.sslKeyPem  = '';
                                       this.certError  = '';
                                       this.keyError   = '';
                                   }
                               }} />
                        <span class="toggle-slider"></span>
                    </span>
                    Enable SSL for this domain
                </label>
            </div>

            ${this.useSsl ? html`
                <div class="ssl-sub">

                    <!-- Use Let's Encrypt toggle (pre-checked) -->
                    <div class="toggle-row">
                        <label class="toggle-label">
                            <span class="toggle-switch">
                                <input type="checkbox"
                                       .checked=${this.useLetsEncrypt}
                                       @change=${(e: Event) => {
                                           this.useLetsEncrypt = (e.target as HTMLInputElement).checked;
                                           this.sslCertPem = '';
                                           this.sslKeyPem  = '';
                                           this.certError  = '';
                                           this.keyError   = '';
                                       }} />
                                <span class="toggle-slider"></span>
                            </span>
                            Use Let's Encrypt
                            <span class="toggle-hint">— auto-issues &amp; renews every 90 days</span>
                        </label>
                    </div>

                    <!-- Manual cert fields — shown only when Let's Encrypt is unchecked -->
                    ${!this.useLetsEncrypt ? html`
                        ${this.renderField('Certificate', html`
                            <div class="field-wrap">
                                <textarea class="form-control ssl-pem ${this.certError ? 'status-taken' : ''}"
                                          placeholder="-----BEGIN CERTIFICATE-----&#10;(paste your full certificate bundle here)&#10;-----END CERTIFICATE-----"
                                          .value=${this.sslCertPem}
                                          @input=${(e: Event) => {
                                              this.sslCertPem = (e.target as HTMLTextAreaElement).value;
                                              if (this.certError) this.certError = this.validatePem(this.sslCertPem, 'cert');
                                          }}
                                          @blur=${() => { this.certError = this.validatePem(this.sslCertPem, 'cert'); }}
                                ></textarea>
                                ${this.certError ? html`<span class="field-status taken">${this.certError}</span>` : ''}
                            </div>`)}

                        ${this.renderField('Private Key', html`
                            <div class="field-wrap">
                                <textarea class="form-control ssl-pem ${this.keyError ? 'status-taken' : ''}"
                                          placeholder="-----BEGIN PRIVATE KEY-----&#10;(paste your private key here)&#10;-----END PRIVATE KEY-----"
                                          .value=${this.sslKeyPem}
                                          @input=${(e: Event) => {
                                              this.sslKeyPem = (e.target as HTMLTextAreaElement).value;
                                              if (this.keyError) this.keyError = this.validatePem(this.sslKeyPem, 'key');
                                          }}
                                          @blur=${() => { this.keyError = this.validatePem(this.sslKeyPem, 'key'); }}
                                ></textarea>
                                ${this.keyError ? html`<span class="field-status taken">${this.keyError}</span>` : ''}
                            </div>`)}
                    ` : ''}

                </div>
            ` : ''}`;
    }
}
