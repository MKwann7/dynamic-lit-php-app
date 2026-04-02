import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-site-theme-settings')
export class MaxrSiteThemeSettings extends RuntimeWidgetElement {
    override render() {
        return html`<p style="padding:24px;color:#6c757d;text-align:center;">Site Theme Settings — coming soon</p>`;
    }
}
