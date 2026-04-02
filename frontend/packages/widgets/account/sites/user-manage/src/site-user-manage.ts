import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-site-user-manage')
export class DynLitSiteUserManage extends RuntimeWidgetElement {
    override render() {
        return html`<p style="padding:24px;color:#6c757d;text-align:center;">Site User Manage — coming soon</p>`;
    }
}
