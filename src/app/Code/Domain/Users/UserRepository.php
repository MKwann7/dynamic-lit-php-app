<?php

declare(strict_types=1);

namespace Code\Domain\Users;

use Application\Helper\BaseRepository;

final class UserRepository extends BaseRepository
{
    private const COLUMNS = [
        'user_id',
        'whitelabel_id',
        'first_name',
        'last_name',
        'email',
        'username',
        'password',
        'status',
        'avatar_url',
        'created_on',
        'created_by',
        'last_updated',
        'updated_by',
        'BIN_TO_UUID(sys_row_id) as sys_row_id',
    ];

    protected function connectionName(): string
    {
        return 'user';
    }

    private function buildSelectClause(): string
    {
        return implode(",\n    ", self::COLUMNS);
    }

    public function getById(int $userId): ?UserRow
    {
        if ($userId <= 0) {
            return null;
        }

        $sql = sprintf(
            "SELECT\n    %s\nFROM user\nWHERE user_id = :user_id\nLIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':user_id' => $userId,
        ]);

        return $row ? UserRow::fromArray($row) : null;
    }

    public function getByEmailOrUsername(string $value): ?UserRow
    {
        $value = trim($value);

        if ($value === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT\n    %s\nFROM user\nWHERE email = :email OR username = :username\nLIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':email' => $value,
            ':username' => $value,
        ]);

        return $row ? UserRow::fromArray($row) : null;
    }

    public function getBySysRowId(string $sysRowId): ?UserRow
    {
        $sysRowId = trim($sysRowId);

        if ($sysRowId === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT\n    %s\nFROM user\nWHERE sys_row_id = UUID_TO_BIN(:sys_row_id)\nLIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':sys_row_id' => $sysRowId,
        ]);

        return $row ? UserRow::fromArray($row) : null;
    }

    /**
     * Update a user record identified by UUID.
     * Only updates whitelisted fields; ignores unknown keys.
     *
     * @param  array<string, mixed> $fields
     */
    public function updateBySysRowId(string $sysRowId, array $fields): bool
    {
        $sysRowId = trim($sysRowId);
        if ($sysRowId === '') {
            return false;
        }

        $allowed = [
            'first_name', 'last_name', 'email', 'username',
            'phone', 'status', 'avatar_url',
        ];

        $sets   = [];
        $params = [':sys_row_id' => $sysRowId];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $sets[]           = "{$col} = :{$col}";
                $params[":{$col}"] = $fields[$col];
            }
        }

        // Handle password separately — only hash when a non-empty value is supplied
        if (!empty($fields['password'])) {
            $sets[]              = 'password = :password';
            $params[':password'] = password_hash((string)$fields['password'], PASSWORD_BCRYPT);
        }

        if (empty($sets)) {
            return true; // nothing to update is still a success
        }

        $sets[] = 'last_updated = NOW()';

        $sql = sprintf(
            "UPDATE user SET %s WHERE sys_row_id = UUID_TO_BIN(:sys_row_id)",
            implode(', ', $sets)
        );

        $affected = $this->db()->execute($sql, $params);

        return $affected >= 0;
    }

    /**
     * Preserves input order; missing IDs are silently omitted.
     *
     * @param  int[] $userIds
     * @return UserRow[]  keyed by user_id
     */
    public function getByIds(array $userIds): array
    {
        $userIds = array_values(
            array_filter(
                array_map('intval', $userIds),
                fn(int $id): bool => $id > 0
            )
        );

        if (empty($userIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($userIds), '?'));

        $sql = sprintf(
            "SELECT\n    %s\nFROM user\nWHERE user_id IN (%s)",
            $this->buildSelectClause(),
            $placeholders
        );

        $rows = $this->db()->fetchAllAssociative($sql, $userIds);

        $result = [];
        foreach ($rows as $row) {
            $userRow = UserRow::fromArray($row);
            $result[$userRow->user_id] = $userRow;
        }

        return $result;
    }

    /**
     * Paginated search across users.
     *
     * Supported $filter values:
     *   "Everything"  – no extra constraint (default)
     *   "Active"      – status = 'active'
     *   "Inactive"    – status = 'inactive'
     *
     * @return array{ rows: UserRow[], total: int, page: int, perPage: int, pages: int }
     */
    public function search(
        string $q       = '',
        string $filter  = 'Everything',
        int    $page    = 1,
        int    $perPage = 20
    ): array {
        $page    = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $offset  = ($page - 1) * $perPage;

        $conditions = [];
        $params     = [];

        if ($q !== '') {
            $conditions[] = '(first_name LIKE :q OR last_name LIKE :q OR email LIKE :q OR username LIKE :q)';
            $params[':q'] = '%' . $q . '%';
        }

        switch (strtolower($filter)) {
            case 'active':
                $conditions[] = "status = 'active'";
                break;
            case 'inactive':
                $conditions[] = "status = 'inactive'";
                break;
            // 'everything' or unknown → no extra condition
        }

        $where = empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);

        $total = (int)(
            $this->db()->fetchAssociative(
                "SELECT COUNT(*) AS total FROM user {$where}",
                $params
            )['total'] ?? 0
        );

        // LIMIT/OFFSET are cast ints — safe to interpolate
        $sql = sprintf(
            "SELECT\n    %s\nFROM user\n%s\nORDER BY user_id DESC\nLIMIT %d OFFSET %d",
            $this->buildSelectClause(),
            $where,
            $perPage,
            $offset
        );

        $rows = array_map(
            fn(array $row): UserRow => UserRow::fromArray($row),
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
}