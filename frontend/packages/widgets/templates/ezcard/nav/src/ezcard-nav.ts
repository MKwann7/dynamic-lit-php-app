import {css, html} from 'lit';
import { customElement } from 'lit/decorators.js';
import { RuntimeWidgetElement } from '@maxr/shared';

@customElement('maxr-ezcard-nav')
export class EzcardNav extends RuntimeWidgetElement {
    connectedCallback() {
        super.connectedCallback();
    }

    static styles = css`
         .theme_shade_light navigation {
             background-color: #fff;
         }
        .site-logo {
            text-align: center;
        }
        .nav-box-card > ul {
            padding-left: 10px;
        }
        ul {
            margin: 0;
            padding: 0;
        }
        .nav-box-card > ul > li {
            display: table;
            width: 100%;
            height: 38px;
        }

        ul li {
            list-style-type: none;
        }
        .nav-box-card > ul > li > a {
            display: table-row;
            width: 100%;
            clear: both;
            vertical-align: middle;
            text-decoration: none !important;
        }
        .theme_shade_light .nav-box-card > ul > li > a > span {
            color: #000;
        }
        .nav-box-card > ul > li > a > span:first-child {
            width: 40px;
            font-size: 24px;
        }
        .nav-box-card > ul > li > a > span {
            display: table-cell;
            vertical-align: middle;
        }
    `;

    render() {
        return html`
            <nav>
                <div class="bottomMenuBar showOnMobile" style="display: none;">
                    <ul>
                        <li>
                            <a href="/account">
                                <span class="fas fa-home"></span>
                            </a>
                        </li>
                        <li>
                            <a href="/account/cards">
                                <span class="fas fa-id-card"></span>
                            </a>
                        </li>
                        <li>
                            <a href="/account/communication">
                                <span class="fas fa-comments"></span>
                            </a>
                        </li>
                        <li>
                            <a href="/account/modules">
                                <span class="fas fa-th-large"></span>
                            </a>
                        </li>
                        <li>
                            <img src="https://media.ezcard.com/images/users/1000/thumb/f558d88e0349a39f8db531325bb7d658793d5155.jpg"
                                 class="main-user-avatar">
                        </li>
                    </ul>
                </div>

                <div class="site-logo hideOnMobile">
                    <a href="/account" class="leftHeaderLogoLink">
                        <span class="portalLogo"></span>
                    </a>
                </div>

                <div class="nav-dashboard hideOnMobile">
                    <div class="dropdown show">
                        <button type="button"
                                id="dropdownMenuButton"
                                data-toggle="dropdown"
                                aria-haspopup="true"
                                aria-expanded="false"
                                class="btn btn-primary dropdown-toggle">
                            <span class="fas fa-tachometer-alt fas-large desktop-35px"
                                  style="font-size: 24px; position: relative; top: 2px;"></span>
                            <span>Dashboard</span>
                        </button>
                        <div aria-labelledby="dropdownMenuButton" class="dropdown-menu">
                            <a href="#" class="dropdown-item">Action</a>
                            <a href="#" class="dropdown-item">Another action</a>
                            <a href="#" class="dropdown-item">Something else here</a>
                        </div>
                    </div>
                </div>

                <div class="nav-wrapper hideOnMobile">
                    <div class="nav-box">

                        <div class="nav-box-card">
                            <h5>MAIN</h5>
                            <ul>
                                <li>
                                    <a href="/account/personas">
                                        <span class="fas fa-users desktop-20px"></span>
                                        <span>My Personas</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/account/sites">
                                        <span class="fas fa-id-card desktop-20px"></span>
                                        <span>My Sites</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/account/groups">
                                        <span class="fas fa-list-alt desktop-20px"></span>
                                        <span>My Groups</span>
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div class="nav-box-card">
                            <h5>ADMIN</h5>
                            <ul>
                                <li>
                                    <a href="/administrator/customers">
                                        <span class="fas fa-users desktop-20px"></span>
                                        <span>Customers</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/administrator/sites">
                                        <span class="fas fa-id-card desktop-20px"></span>
                                        <span>Sites</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/administrator/groups">
                                        <span class="fas fa-list-alt desktop-20px"></span>
                                        <span>Groups</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/administrator/users">
                                        <span class="fas fa-user-shield desktop-20px"></span>
                                        <span>Users</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="/administrator/reports">
                                        <span class="fas fa-chart-pie desktop-20px"></span>
                                        <span>Reports</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
}