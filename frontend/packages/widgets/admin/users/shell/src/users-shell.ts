import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-users-shell')
export class MaxrUsersShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Maxr Users Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>Maxr Users Shell</h2>
        <p>Maxr Users Shell widget loaded.</p>
      </section>`;
    }
}
