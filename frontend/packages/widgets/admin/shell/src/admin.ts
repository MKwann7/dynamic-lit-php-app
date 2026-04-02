import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DynLitAccountShell } from '@dynlit/account-shell';

@customElement('dynlit-admin-shell')
export class DynLitAdminShell extends DynLitAccountShell {
    @property({ type: String })
    title = 'Admin';
}