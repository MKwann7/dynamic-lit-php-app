import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-my-site-shell')
export class MaxrSiteShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Maxr Site Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>Maxr Site Shell</h2>
        <p>Maxr Site Shell widget loaded.</p>
      </section>`;
    }
}
