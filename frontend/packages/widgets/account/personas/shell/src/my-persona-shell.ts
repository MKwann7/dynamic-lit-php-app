import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-my-persona-shell')
export class MaxrPersonaShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Maxr Persona Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>Maxr Persona Shell</h2>
        <p>Maxr Persona Shell widget loaded.</p>
      </section>`;
    }
}
