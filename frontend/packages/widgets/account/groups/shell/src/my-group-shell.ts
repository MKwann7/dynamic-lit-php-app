import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-my-group-shell')
export class MaxrGroupShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Maxr Group Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>Maxr Group Shell</h2>
        <p>Maxr Group Shell widget loaded.</p>
      </section>`;
    }
}
