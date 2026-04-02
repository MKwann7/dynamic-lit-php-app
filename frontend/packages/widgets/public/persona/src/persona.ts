import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-persona')
export class MaxrPersona extends RuntimeWidgetElement {
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