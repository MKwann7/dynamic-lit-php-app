import { css, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-user-profile-manage')
export class DynLitUserProfileManage extends RuntimeWidgetElement {

    static styles = css`
        :host { display: block; width: 100%; background: #fff; }

        /* ── Modal chrome ───────────────────────────────────────────────── */
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

        /* ── Avatar preview ─────────────────────────────────────────────── */
        .avatar-preview-row {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 18px;
            padding-bottom: 18px;
            border-bottom: 1px solid #f0f2f5;
        }
        .avatar-preview {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #dee2e6;
            background: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
        }
        .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-preview svg { width: 36px; height: 36px; fill: #adb5bd; }
        .avatar-hint { font-size: 0.8rem; color: #6c757d; }

        /* ── Form rows ──────────────────────────────────────────────────── */
        .form-row {
            display: flex;
            align-items: flex-start;
            margin-bottom: 14px;
            gap: 0;
        }
        .form-label {
            width: 110px;
            flex-shrink: 0;
            font-size: 0.875rem;
            color: #212529;
            padding-top: 9px;
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
        select.form-control { appearance: auto; cursor: pointer; }
        .form-hint {
            font-size: 0.75rem;
            color: #6c757d;
            margin-top: 3px;
            padding-left: 2px;
        }
        .field-wrap { flex: 1; display: flex; flex-direction: column; }

        /* ── Two-column name row ────────────────────────────────────────── */
        .name-row {
            display: flex;
            gap: 10px;
            flex: 1;
        }
        .name-row .form-control { flex: 1; }

        /* ── Footer ─────────────────────────────────────────────────────── */
        .modal-footer { padding: 0 24px 20px; }
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
        .btn-submit:hover    { background: #0b5ed7; }
        .btn-submit:disabled { background: #6ea8fe; cursor: not-allowed; }

        /* ── Alerts ─────────────────────────────────────────────────────── */
        .alert {
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 0.85rem;
            margin-bottom: 14px;
        }
        .alert-danger  { background: #f8d7da; color: #58151c; }
        .alert-success { background: #d1e7dd; color: #0a3622; }
    `;

    // ── State ─────────────────────────────────────────────────────────────────

    @state() private userUuid: string | null = null;

    // Form fields
    @state() private firstName  = '';
    @state() private lastName   = '';
    @state() private username   = '';
    @state() private email      = '';
    @state() private phone      = '';
    @state() private password   = '';
    @state() private avatarUrl  = '';
    @state() private status     = 'active';

    // Submit state
    @state() private isSaving   = false;
    @state() private errorMsg   = '';
    @state() private successMsg = '';

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override connectedCallback() {
        super.connectedCallback();
        this.userUuid = this.getRouteParam('uuid');
        if (this.userUuid && this.runtime) void this.loadUser();
    }

    override updated(changed: Map<PropertyKey, unknown>): void {
        super.updated(changed);
        if (changed.has('runtime') && this.runtime && this.userUuid && !this.firstName && !this.email) {
            void this.loadUser();
        }
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    private async loadUser(): Promise<void> {
        try {
            const res  = await this.runtime!.apiFetch(`/api/v1/users/${this.userUuid}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json() as Record<string, unknown>;
            const d    = (body.data ?? body) as Record<string, unknown>;

            this.firstName = String(d.first_name ?? '');
            this.lastName  = String(d.last_name  ?? '');
            this.username  = String(d.username   ?? '');
            this.email     = String(d.email      ?? '');
            this.phone     = String(d.phone      ?? '');
            this.avatarUrl = String(d.avatar_url ?? '');
            this.status    = String(d.status     ?? 'active');
        } catch {
            this.errorMsg = 'Failed to load user data.';
        }
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    private async onSubmit(): Promise<void> {
        if (!this.userUuid || this.isSaving) return;
        this.isSaving   = true;
        this.errorMsg   = '';
        this.successMsg = '';

        try {
            const payload: Record<string, unknown> = {
                first_name: this.firstName,
                last_name:  this.lastName,
                username:   this.username,
                email:      this.email,
                phone:      this.phone,
                status:     this.status,
                avatar_url: this.avatarUrl || null,
            };
            // Only include password when the admin has entered one
            if (this.password.trim()) payload['password'] = this.password;

            const res = await this.runtime!.apiFetch(`/api/v1/users/${this.userUuid}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({})) as Record<string, unknown>;
                throw new Error(String(err.message ?? `HTTP ${res.status}`));
            }

            this.successMsg = 'User profile updated successfully.';
            this.password   = '';   // clear password field after save

            // Broadcast to window so the dashboard merges the update live
            let updated: Record<string, unknown> = {
                uuid:       this.userUuid,
                first_name: this.firstName,
                last_name:  this.lastName,
                username:   this.username,
                email:      this.email,
                phone:      this.phone,
                status:     this.status,
                avatar_url: this.avatarUrl || null,
            };
            try {
                const body = await res.clone().json() as Record<string, unknown>;
                const data = (body.data ?? body) as Record<string, unknown>;
                updated = { ...updated, ...data, uuid: this.userUuid };
            } catch { /* use form values */ }

            window.dispatchEvent(new CustomEvent('dynlit:user:updated', { detail: updated }));
            setTimeout(() => this.runtime?.closeModal(), 1200);
        } catch (e: unknown) {
            this.errorMsg = e instanceof Error ? e.message : 'An unexpected error occurred.';
        } finally {
            this.isSaving = false;
        }
    }

    private onClose(): void { this.runtime?.closeModal(); }

    // ── Render ────────────────────────────────────────────────────────────────

    override render() {
        return html`
            <div class="modal-header">
                <h4>Edit User Profile</h4>
                <button class="close-btn" aria-label="Close" @click=${this.onClose}>✕</button>
            </div>

            <div class="modal-body">
                ${this.errorMsg   ? html`<div class="alert alert-danger">${this.errorMsg}</div>`   : ''}
                ${this.successMsg ? html`<div class="alert alert-success">${this.successMsg}</div>` : ''}

                ${this.renderAvatarPreview()}

                ${this.renderField('Name', html`
                    <div class="name-row">
                        <input class="form-control" type="text"
                               .value=${this.firstName}
                               placeholder="First name"
                               @input=${(e: Event) => { this.firstName = (e.target as HTMLInputElement).value; }} />
                        <input class="form-control" type="text"
                               .value=${this.lastName}
                               placeholder="Last name"
                               @input=${(e: Event) => { this.lastName = (e.target as HTMLInputElement).value; }} />
                    </div>`)}

                ${this.renderField('Username', html`
                    <input class="form-control" type="text"
                           .value=${this.username}
                           placeholder="e.g. jsmith"
                           @input=${(e: Event) => { this.username = (e.target as HTMLInputElement).value; }} />`)}

                ${this.renderField('Email', html`
                    <input class="form-control" type="email"
                           .value=${this.email}
                           placeholder="e.g. user@example.com"
                           @input=${(e: Event) => { this.email = (e.target as HTMLInputElement).value; }} />`)}

                ${this.renderField('Phone', html`
                    <input class="form-control" type="tel"
                           .value=${this.phone}
                           placeholder="e.g. 5551234567"
                           @input=${(e: Event) => { this.phone = (e.target as HTMLInputElement).value; }} />`)}

                ${this.renderFieldWithHint('Password', html`
                    <div class="field-wrap">
                        <input class="form-control" type="password"
                               .value=${this.password}
                               placeholder="Leave blank to keep current"
                               @input=${(e: Event) => { this.password = (e.target as HTMLInputElement).value; }} />
                        <span class="form-hint">Only fill this in to change the password.</span>
                    </div>`)}

                ${this.renderField('Avatar URL', html`
                    <input class="form-control" type="url"
                           .value=${this.avatarUrl}
                           placeholder="https://…"
                           @input=${(e: Event) => {
                               this.avatarUrl = (e.target as HTMLInputElement).value;
                           }} />`)}

                ${this.renderField('Status', html`
                    <select class="form-control"
                            .value=${this.status}
                            @change=${(e: Event) => { this.status = (e.target as HTMLSelectElement).value; }}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>`)}
            </div>

            <div class="modal-footer">
                <button class="btn-submit"
                        ?disabled=${this.isSaving}
                        @click=${this.onSubmit}>
                    ${this.isSaving ? 'Saving…' : 'Update User Profile'}
                </button>
            </div>`;
    }

    private renderAvatarPreview(): TemplateResult {
        return html`
            <div class="avatar-preview-row">
                <div class="avatar-preview">
                    ${this.avatarUrl
                        ? html`<img src=${this.avatarUrl} alt="Avatar preview" />`
                        : html`<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`}
                </div>
                <span class="avatar-hint">Update the Avatar URL field below to change the profile picture.</span>
            </div>`;
    }

    private renderField(label: string, control: TemplateResult): TemplateResult {
        return html`
            <div class="form-row">
                <span class="form-label">${label}</span>
                ${control}
            </div>`;
    }

    private renderFieldWithHint(label: string, control: TemplateResult): TemplateResult {
        return html`
            <div class="form-row">
                <span class="form-label">${label}</span>
                ${control}
            </div>`;
    }
}

