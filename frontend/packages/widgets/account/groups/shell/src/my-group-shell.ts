import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-my-group-shell')
export class DynLitGroupShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Group Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Group Shell</h2>
        <p>DynLit Group Shell widget loaded.</p>
      </section>`;
    }
}
