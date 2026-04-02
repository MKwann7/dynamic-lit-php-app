import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-users-shell')
export class DynLitUsersShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'DynLit Users Shell';
    
    connectedCallback() {
        super.connectedCallback();
    }
    
    render() {
        return html`
    <section>
        <h2>DynLit Users Shell</h2>
        <p>DynLit Users Shell widget loaded.</p>
      </section>`;
    }
}
