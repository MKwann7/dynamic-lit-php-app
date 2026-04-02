<?php

declare(strict_types=1);

namespace Code\Domain\Whitelabel;

use Application\Helper\BaseRepository;

final class WhitelabelRepository extends BaseRepository
{
    private const COLUMNS = [
        'id',
        'name',
        'owner_id',
        'platform_name',
        'public_domain_name',
        'public_domain',
        'public_domain_ssl',
        'portal_domain_name',
        'portal_domain',
        'portal_domain_ssl',
        'root_redirect',
        'created_on',
        'last_updated_on',
        'BIN_TO_UUID(sys_row_id) as sys_row_id',
    ];

    protected function connectionName(): string
    {
        return 'whitelabel';
    }

    private function buildSelectClause(): string
    {
        return implode(",\n    ", self::COLUMNS);
    }

    public function getById(int $id): ?WhitelabelRow
    {
        if ($id <= 0) {
            return null;
        }

        $sql = sprintf(
            "SELECT\n    %s\nFROM whitelabel\nWHERE id = :id\nLIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [':id' => $id]);

        return $row ? WhitelabelRow::fromArray($row) : null;
    }

    public function findByHost(string $host): ?WhitelabelRow
    {
        $host = strtolower(trim($host));

        if ($host === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT
            %s
        FROM whitelabel
        WHERE
            public_domain = :public_host
            OR portal_domain = :portal_host
        LIMIT 1",
            $this->buildSelectClause()
        );

        $row = $this->db()->fetchOne($sql, [
            ':public_host' => $host,
            ':portal_host' => $host,
        ]);

        return $row ? WhitelabelRow::fromArray($row) : null;
    }
}