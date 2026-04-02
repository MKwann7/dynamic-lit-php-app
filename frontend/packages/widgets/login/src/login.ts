import { css, html, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

interface LoginSuccessResponse {
    success: boolean;
    data?: {
        token_type: string;
        access_token: string;
        expires_in: number;
        user: {
            user_id: number;
            email: string;
            status: string;
        };
    };
    message?: string;
}

export class DynLitLoginAuth extends RuntimeWidgetElement {
    @state() private username = '';
    @state() private password = '';
    @state() private isSubmitting = false;
    @state() private errorMessage = '';
    @state() private isReady = false;

    connectedCallback() {
        super.connectedCallback();

        if (this.redirectForTokenType()) {
            return;
        }

        this.isReady = true;
    }

    static styles = css`
        :host {
            display: block;
            min-height: 100vh;
        }

        .login-screen {
            min-height: 100vh;
            background:
                    linear-gradient(135deg, rgba(8, 8, 20, 0.62), rgba(20, 8, 28, 0.58)),
                    url('/assets/images/login-bg.png') center center / cover no-repeat;
        }

        .login-shell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .login-card {
            width: 100%;
            max-width: 470px;
            margin-top: -7vh;
            padding: 2rem 2rem 1.5rem;
            border-radius: 1.25rem;
            background: rgba(17, 19, 31, 0.72);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow:
                    0 30px 80px rgba(0, 0, 0, 0.45),
                    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
            color: #fff;
        }

        .brand-kicker {
            font-size: 0.78rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.72);
            margin-bottom: 0.5rem;
        }

        .title {
            margin: 0 0 0.4rem;
            font-size: 2rem;
            font-weight: 700;
            line-height: 1.1;
            color: #fff;
        }

        .subtitle {
            margin-bottom: 1.5rem;
            color: rgba(255, 255, 255, 0.72);
            font-size: 0.98rem;
        }

        .form-label {
            color: rgba(255, 255, 255, 0.86);
            font-weight: 500;
        }

        .form-control {
            min-height: 3rem;
            border-radius: 0.85rem;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(255, 255, 255, 0.08);
            color: #fff;
            box-shadow: none;
        }

        .form-control::placeholder {
            color: rgba(255, 255, 255, 0.42);
        }

        .form-control:focus {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 196, 87, 0.95);
            box-shadow: 0 0 0 0.2rem rgba(255, 196, 87, 0.16);
        }

        .form-control:disabled {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.65);
        }

        .login-btn {
            min-height: 3rem;
            border: none;
            border-radius: 0.9rem;
            font-weight: 600;
            background: linear-gradient(135deg, #ffb347 0%, #ff7a18 100%);
            color: #111;
            box-shadow: 0 14px 35px rgba(255, 122, 24, 0.3);
        }

        .login-btn:hover,
        .login-btn:focus {
            color: #111;
            filter: brightness(1.03);
        }

        .login-btn:disabled {
            opacity: 0.75;
            cursor: wait;
        }

        .utility-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            margin-top: 1rem;
            font-size: 0.94rem;
        }

        .utility-row a {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
        }

        .utility-row a:hover {
            color: #fff;
            text-decoration: underline;
        }

        .divider {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            margin: 1.35rem 0 1rem;
            color: rgba(255, 255, 255, 0.48);
            font-size: 0.84rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }

        .divider::before,
        .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.12);
        }

        .create-link {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            color: #fff;
            text-decoration: none;
            font-weight: 500;
        }

        .create-link:hover {
            text-decoration: underline;
        }

        .alert {
            border-radius: 0.9rem;
        }

        @media (max-width: 576px) {
            .login-shell {
                padding: 1rem;
            }

            .login-card {
                margin-top: -2vh;
                padding: 1.35rem;
            }

            .title {
                font-size: 1.7rem;
            }

            .utility-row {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    `;

    createRenderRoot() {
        return this;
    }

    protected redirectForTokenType(): boolean {
        const tokenType = this.getTokenType();

        if (tokenType === 'user') {
            window.location.assign('/account');
            return true;
        }

        if (tokenType === 'admin') {
            window.location.assign('/administrator');
            return true;
        }

        return false;
    }

    private onUsernameInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.username = target.value;
    }

    private onPasswordInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.password = target.value;
    }

    private async onSubmit(event: Event): Promise<void> {
        event.preventDefault();

        if (this.isSubmitting) {
            return;
        }

        this.errorMessage = '';

        const username = this.username.trim();
        const password = this.password;

        if (!username || !password) {
            this.errorMessage = 'Username and password are required.';
            return;
        }

        const token = this.runtime?.getAccessToken?.();

        this.isSubmitting = true;

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const payload = (await response.json()) as LoginSuccessResponse;

            if (!response.ok || payload.success !== true || !payload.data?.access_token) {
                this.errorMessage = payload.message || 'Login failed.';
                return;
            }

            this.runtime?.setAccessToken?.(
                payload.data.access_token,
                payload.data.token_type
            );

            if ('PasswordCredential' in window && navigator.credentials) {
                try {
                    const cred = new (window as any).PasswordCredential({
                        id:       username,
                        password: password,
                        name:     username,
                    });
                    await navigator.credentials.store(cred);
                } catch (e) {
                    // non-fatal — credential storage is best-effort
                    console.warn('[dynlit-login] credential storage skipped:', e);
                }
            }

            this.dispatchEvent(
                new CustomEvent('dynlit:auth:login-success', {
                    detail: payload.data,
                    bubbles: true,
                    composed: true,
                })
            );

            window.location.assign(
                payload.data.token_type === 'admin' ? '/administrator' : '/account'
            );
        } catch (error) {
            console.error('[dynlit-login-auth] login error', error);
            this.errorMessage = 'Unable to log in right now.';
        } finally {
            this.isSubmitting = false;
        }
    }

    render() {
        if (!this.isReady) {
            return html``;
        }
        return html`
            <div class="login-screen">
                <div class="login-shell container-fluid">
                    <div class="login-card">
                        <div class="brand-kicker">dynlit Platform</div>
                        <h1 class="title">Welcome back</h1>
                        <div class="subtitle">
                            Sign in to continue into your account workspace.
                        </div>

                        <form @submit=${this.onSubmit} novalidate>
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input
                                        id="username"
                                        name="username"
                                        class="form-control"
                                        type="text"
                                        placeholder="Enter your username"
                                        .value=${this.username}
                                        @input=${this.onUsernameInput}
                                        autocomplete="username"
                                        ?disabled=${this.isSubmitting}
                                />
                            </div>

                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input
                                        id="password"
                                        name="password"
                                        class="form-control"
                                        type="password"
                                        placeholder="Enter your password"
                                        .value=${this.password}
                                        @input=${this.onPasswordInput}
                                        autocomplete="current-password"
                                        ?disabled=${this.isSubmitting}
                                />
                            </div>

                            ${this.errorMessage
                                    ? html`
                                        <div class="alert alert-danger mt-3" role="alert">
                                            ${this.errorMessage}
                                        </div>
                                    `
                                    : nothing}

                            <div class="d-grid mt-4">
                                <button
                                        type="submit"
                                        class="btn login-btn"
                                        ?disabled=${this.isSubmitting}
                                >
                                    ${this.isSubmitting ? 'Signing in...' : 'Log In'}
                                </button>
                            </div>

                            <div class="utility-row">
                                <a href="/create-account">Create Account</a>
                                <a href="/forgot-password">Forgot Password?</a>
                            </div>

                            <div class="divider">Secure Access</div>

                            <a href="/create-account" class="create-link">
                                New here? Create your account
                            </a>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }
}