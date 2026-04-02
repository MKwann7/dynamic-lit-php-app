import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-my-persona-shell')
export class DynLitPersonaShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Persona Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Persona Shell</h2>
        <p>DynLit Persona Shell widget loaded.</p>
      </section>`;
    }
}
