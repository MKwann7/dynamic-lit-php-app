import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-site')
export class MaxrSite extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Site';

    render() {
        return html`
      <section>
        <h2>${this.title}</h2>
        <p>Site widget loaded.</p>
      </section>
    `;
    }
}