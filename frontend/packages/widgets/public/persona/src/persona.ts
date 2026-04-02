import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-persona')
export class DynLitPersona extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Persona';

    render() {
        return html`
      <section>
        <h2>${this.title}</h2>
        <p>Persona widget loaded.</p>
      </section>
    `;
    }
}