import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-group')
export class DynLitGroup extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Group';

    render() {
        return html`
      <section>
        <h2>${this.title}</h2>
        <p>Group widget loaded.</p>
      </section>
    `;
    }
}