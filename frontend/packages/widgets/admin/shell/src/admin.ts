import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { MaxrAccountShell } from '@maxr/account-shell';

@customElement('maxr-admin-shell')
export class MaxrAdminShell extends MaxrAccountShell {
    @property({ type: String })
    title = 'Admin';
}