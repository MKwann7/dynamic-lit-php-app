import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-create-account')
export class MaxrCreateAccount extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Create Account';

    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`
            <section>
                <h2>${this.title}</h2>
                <p>Create Account widget loaded.</p>
            </section>
        `;
    }
}