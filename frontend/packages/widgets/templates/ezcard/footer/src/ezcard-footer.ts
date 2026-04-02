import { html } from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@dynlit/shared';

@customElement('dynlit-ezcard-footer')
export class EzcardFooter extends RuntimeWidgetElement {
    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`<div>Ezcard Footer</div>`;
    }
}