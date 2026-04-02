<?php

declare(strict_types=1);

namespace Code\Domain\Users;

use Application\Helper\BaseRepository;

final class UserAdminPermissionRepository extends BaseRepository
{
    protected function connectionName(): string
    {
        return 'user';
    }

    /**
     * Return every active, non-expired permission key for the given user.
     *
     * @return string[]  e.g. ['sites.view_all', 'platform.settings.view']
     */
    public function getActivePermissionsForUser(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        $sql = <<<SQL
            SELECT permission
            FROM   user_admin_permission
            WHERE  user_id  = :user_id
              AND  is_active = 1
              AND  (expires_on IS NULL OR expires_on > NOW())
            ORDER BY permission
        SQL;

        $rows = $this->db()->fetchAllAssociative($sql, [':user_id' => $userId]);

        return array_column($rows, 'permission');
    }

    /**
     * Check whether a user holds a specific active, non-expired permission.
     */
    public function userHasPermission(int $userId, string $permission): bool
    {
        if ($userId <= 0 || $permission === '') {
            return false;
        }

        $sql = <<<SQL
            SELECT 1
            FROM   user_admin_permission
            WHERE  user_id   = :user_id
              AND  permission = :permission
              AND  is_active  = 1
              AND  (expires_on IS NULL OR expires_on > NOW())
            LIMIT  1
        SQL;

        return $this->db()->fetchOne($sql, [
            ':user_id'    => $userId,
            ':permission' => $permission,
        ]) !== null;
    }
}

