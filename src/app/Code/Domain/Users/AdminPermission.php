<?php

declare(strict_types=1);

namespace Code\Domain\Users;

/**
 * Canonical permission keys stored in user_admin_permission.permission.
 *
 * Any user with at least one active, non-expired row in that table receives
 * token_type = 'admin' in their JWT.  The full list of their grants is
 * embedded in the token as data.permissions = [...].
 *
 * Naming convention: <resource>.<action>
 */
final class AdminPermission
{
    // ── Sites ────────────────────────────────────────────────────────────────
    /** Read-only access to every site on the platform. */
    public const SITES_VIEW_ALL = 'sites.view_all';

    /** Full CRUD access to every site on the platform. */
    public const SITES_EDIT_ALL = 'sites.edit_all';

    // ── Customers / users ────────────────────────────────────────────────────
    /** Read-only access to every customer/user account. */
    public const CUSTOMERS_VIEW_ALL = 'customers.view_all';

    /** Full CRUD access to every customer/user account. */
    public const CUSTOMERS_EDIT_ALL = 'customers.edit_all';

    // ── Platform settings ────────────────────────────────────────────────────
    /** Read-only access to platform configuration and settings. */
    public const PLATFORM_SETTINGS_VIEW = 'platform.settings.view';

    /** Ability to modify platform configuration and settings. */
    public const PLATFORM_SETTINGS_EDIT = 'platform.settings.edit';

    // ── Canonical ordered list ───────────────────────────────────────────────
    public const ALL = [
        self::SITES_VIEW_ALL,
        self::SITES_EDIT_ALL,
        self::CUSTOMERS_VIEW_ALL,
        self::CUSTOMERS_EDIT_ALL,
        self::PLATFORM_SETTINGS_VIEW,
        self::PLATFORM_SETTINGS_EDIT,
    ];

    // Not instantiable.
    private function __construct() {}
}

