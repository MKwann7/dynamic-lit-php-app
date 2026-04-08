<?php

declare(strict_types=1);

namespace Code\Domain\Sites;

use Application\Helper\BaseRepository;

final class SiteRepository extends BaseRepository
{
    private const COLUMNS = [
        'site_id',
        'owner_id',
        'site_user_id',
        'whitelabel_id',
        'site_version_id',
        'site_type_id',
        'site_name',
        'domain',
        'has_domain_ssl',
        'vanity_url',
        'status',
        'is_template',
        'template_id',
        'json_data',
        'site_num',
        'redirect_to',
        'created_on',
        'created_by',
        'last_updated',
        'updated_by',
        'BIN_TO_UUID(sys_row_id) as sys_row_id',
    ];

    protected function connectionName(): string
    {
        return 'main';
    }

    private function buildSelectClause(): string
    {
        return implode(",\n    ", self::COLUMNS);
    }

    public function getById(int $siteId): ?SiteRow
    {
        if ($siteId <= 0) {
            return null;
        }

        $sql = sprintf(
            "SELECT\n    %s\nFROM site\nWHERE site_id = :site_id\nLIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':site_id' => $siteId,
        ]);

        return $row ? SiteRow::fromArray($row) : null;
    }

    public function getBySysRowId(string $sysRowId): ?SiteRow
    {
        $sysRowId = trim($sysRowId);

        if ($sysRowId === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT\n    %s\nFROM site\nWHERE sys_row_id = UUID_TO_BIN(:sys_row_id)\nLIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':sys_row_id' => $sysRowId,
        ]);

        return $row ? SiteRow::fromArray($row) : null;
    }

    /**
     * Fetch multiple sites by primary key in a single query.
     * Preserves input order; missing IDs are silently omitted.
     *
     * @param  int[] $siteIds
     * @return SiteRow[]  keyed by site_id
     */
    public function getByIds(array $siteIds): array
    {
        $siteIds = array_values(
            array_filter(
                array_map('intval', $siteIds),
                fn(int $id): bool => $id > 0
            )
        );

        if (empty($siteIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($siteIds), '?'));

        $sql = sprintf(
            "SELECT\n    %s\nFROM site\nWHERE site_id IN (%s)",
            $this->buildSelectClause(),
            $placeholders
        );

        $rows = $this->db()->fetchAllAssociative($sql, $siteIds);

        $result = [];
        foreach ($rows as $row) {
            $siteRow = SiteRow::fromArray($row);
            $result[$siteRow->site_id] = $siteRow;
        }

        return $result;
    }

    /**
     * Columns that callers are permitted to search via the $searchFields parameter.
     * Any column name not in this list is silently ignored.
     */
    private const SEARCHABLE_COLUMNS = ['site_name', 'domain', 'vanity_url'];

    /**
     * Paginated search across sites.
     *
     * Supported $filter values:
     *   "Everything"  – no extra constraint (default)
     *   "Templates"   – is_template = 1
     *   "Active"      – status = 'active'
     *
     * @param string   $q            Free-text search term
     * @param string   $filter       Filter preset (see above)
     * @param int      $page         1-based page number
     * @param int      $perPage      Rows per page (capped at 100)
     * @param int      $ownerUserId  When > 0, restrict to sites where owner_id = $ownerUserId
     * @param string[] $searchFields Columns to apply the LIKE search to (whitelisted against SEARCHABLE_COLUMNS).
     *                               Falls back to ['site_name'] when empty or all entries are invalid.
     *
     * @return array{ rows: SiteRow[], total: int, page: int, perPage: int, pages: int }
     */
    public function search(
        string $q            = '',
        string $filter       = 'Everything',
        int    $page         = 1,
        int    $perPage      = 20,
        int    $ownerUserId  = 0,
        array  $searchFields = []
    ): array {
        $page    = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $offset  = ($page - 1) * $perPage;

        $conditions = [];
        $params     = [];

        // ── Full-text / keyword search ─────────────────────────────────────
        if ($q !== '') {
            // Whitelist requested columns; fall back to site_name when none survive.
            $cols = array_values(
                array_intersect(
                    array_map('trim', $searchFields),
                    self::SEARCHABLE_COLUMNS
                )
            );

            if (empty($cols)) {
                $cols = ['site_name'];
            }

            $likeClauses = array_map(
                fn(string $col): string => "{$col} LIKE :q",
                $cols
            );

            $conditions[] = '(' . implode(' OR ', $likeClauses) . ')';
            $params[':q'] = '%' . $q . '%';
        }

        // ── Owner filter (user_uuid / scope=owned) ─────────────────────────
        if ($ownerUserId > 0) {
            $conditions[]        = 'owner_id = :owner_id';
            $params[':owner_id'] = $ownerUserId;
        }

        switch (strtolower($filter)) {
            case 'templates':
                $conditions[] = 'is_template = 1';
                break;
            case 'active':
                $conditions[] = "status = 'active'";
                break;
            // 'everything' or unknown → no extra condition
        }

        $where = empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);

        $total = (int)(
            $this->db()->fetchAssociative(
                "SELECT COUNT(*) AS total FROM site {$where}",
                $params
            )['total'] ?? 0
        );

        // LIMIT/OFFSET are cast ints — safe to interpolate
        $sql = sprintf(
            "SELECT\n    %s\nFROM site\n%s\nORDER BY site_id DESC\nLIMIT %d OFFSET %d",
            $this->buildSelectClause(),
            $where,
            $perPage,
            $offset
        );

        $rows = array_map(
            fn(array $row): SiteRow => SiteRow::fromArray($row),
            $this->db()->fetchAllAssociative($sql, $params)
        );

        return [
            'rows'    => $rows,
            'total'   => $total,
            'page'    => $page,
            'perPage' => $perPage,
            'pages'   => (int)ceil($total / $perPage),
        ];
    }

    public function findByDomain(string $domain): ?SiteRow
    {
        $domain = strtolower(trim($domain));

        if ($domain === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT %s FROM site WHERE domain = :domain LIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':domain' => $domain,
        ]);

        return $row ? SiteRow::fromArray($row) : null;
    }

    /**
     * Return true if no other site on the same whitelabel uses this domain.
     *
     * @param string $domain        Domain to check (will be lowercased)
     * @param int    $whitelabelId  Scope check to this whitelabel
     * @param int    $excludeSiteId The current site's PK (so it doesn't conflict with itself)
     */
    public function isDomainUnique(string $domain, int $whitelabelId, int $excludeSiteId): bool
    {
        $domain = strtolower(trim($domain));
        if ($domain === '') {
            return true;
        }

        $count = (int)(
            $this->db()->fetchAssociative(
                'SELECT COUNT(*) AS cnt FROM site
                  WHERE domain        = :domain
                    AND whitelabel_id = :wl_id
                    AND site_id      != :exclude_id',
                [':domain' => $domain, ':wl_id' => $whitelabelId, ':exclude_id' => $excludeSiteId]
            )['cnt'] ?? 0
        );

        return $count === 0;
    }

    /**
     * Return true if no other site on the same whitelabel uses this vanity URL slug.
     *
     * @param string $vanityUrl     Slug to check (will be lowercased)
     * @param int    $whitelabelId  Scope check to this whitelabel
     * @param int    $excludeSiteId The current site's PK
     */
    public function isVanityUrlUnique(string $vanityUrl, int $whitelabelId, int $excludeSiteId): bool
    {
        $vanityUrl = strtolower(trim($vanityUrl));
        if ($vanityUrl === '') {
            return true;
        }

        $count = (int)(
            $this->db()->fetchAssociative(
                'SELECT COUNT(*) AS cnt FROM site
                  WHERE vanity_url = :vanity_url
                    AND whitelabel_id   = :wl_id
                    AND site_id        != :exclude_id',
                [':vanity_url' => $vanityUrl, ':wl_id' => $whitelabelId, ':exclude_id' => $excludeSiteId]
            )['cnt'] ?? 0
        );

        return $count === 0;
    }

    /**
     * Update a site by its UUID (sys_row_id) and return the refreshed row.
     *
     * Only the keys listed in $allowedColumns will ever be written; any extra
     * keys in $fields are silently ignored.
     *
     * @param  string               $uuid   The site's sys_row_id (UUID)
     * @param  array<string, mixed> $fields Associative map of column → new value
     * @return SiteRow|null                 The updated row, or null if not found
     */
    public function updateBySysRowId(string $uuid, array $fields): ?SiteRow
    {
        static $allowedColumns = [
            'site_name',
            'domain',
            'vanity_url',
            'status',
            'template_id',
            'owner_id',
            'has_domain_ssl',
        ];

        $uuid = trim($uuid);
        if ($uuid === '') {
            return null;
        }

        $setClauses = [];
        $params     = [':uuid' => $uuid, ':updated' => date('Y-m-d H:i:s')];

        foreach ($allowedColumns as $col) {
            if (array_key_exists($col, $fields)) {
                $setClauses[]     = "{$col} = :{$col}";
                $params[":{$col}"] = $fields[$col];
            }
        }

        if (empty($setClauses)) {
            // Nothing to write — just return the current row
            return $this->getBySysRowId($uuid);
        }

        $setClauses[] = 'last_updated = :updated';

        $sql = sprintf(
            'UPDATE site SET %s WHERE sys_row_id = UUID_TO_BIN(:uuid)',
            implode(', ', $setClauses)
        );

        $this->db()->execute($sql, $params);

        return $this->getBySysRowId($uuid);
    }
}