import {css, html} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-account-shell')
export class MaxrAccountShell extends RuntimeWidgetElement {
    @property({ type: String })
    title = 'Account';

    connectedCallback() {
        super.connectedCallback();
    }

    static styles = css`
        #app-root > div,
        #app-root > div > maxr-account {
            display: block;
            height: 100vh;
        }
         .theme_shade_light header.divTable {
             background-color: #fff;
         }
        header.portal-header {
            padding: 11px 19px;
            position: fixed;
            width: calc(100% - 200px);
            margin-left: 200px;
        }
        .theme_shade_light .portal-body,
        .theme_shade_light .portal-footer {
            background-color: #dadada;
        }
        section.portal-body {
            padding: 11px 19px;
            width: calc(100% - 200px);
            padding-top: 75px;
            margin-left: 200px;
            height: 100%;
        }
        .divTable {
            display: table;
            width: 100%;
        }
        nav.portal-nav {
            position: fixed;
            left: 0;
            top: 0;
            height: 100%;
            width: 200px;
            padding: 12px;
            z-index: 5;
            box-shadow: rgba(0, 0, 0, .3) 0 5px 10px;
            overflow-y: auto;
        }
        footer.portal-footer {
            margin-left: 200px;
        }
        .nav-dashboard {
            margin-bottom: 25px;
        }
        .nav-dashboard .btn-primary {
            width: 100%;
            font-size: 20px;
            text-align: left;
            padding: 4px 13px 8px 13px;
        }
        .nav-box-card > h5 {
            font-family: 'Montserrat', sans-serif;
            font-size: 12px;
            margin-top: 35px;
        }
        .theme_shade_light .nav-box-card > h5 {
            color: #006666;
        }
        .theme_shade_light .nav-dashboard .btn-primary:hover, 
        .theme_shade_light .nav-dashboard .btn-primary:active, 
        .theme_shade_light .nav-dashboard .btn-primary {
            background-color: #006666;
            border-color: #006666;
        }
    `;


    render() {
        return html`
        <header class="portal-header">
            <dyn-slot name="maxr-ezcard-header"></dyn-slot>
        </header>
    
        <nav class="portal-nav">
            <dyn-slot name="maxr-ezcard-nav"></dyn-slot>
        </nav>
    
        <section class="portal-body">
            <dyn-mount id="f559b17e-fed9-4484-adb6-8632ebf647c0"></dyn-mount>
        </section>
    
        <footer class="portal-footer">
            <dyn-slot name="maxr-ezcard-footer"></dyn-slot>
        </footer>
    `;
    }
}