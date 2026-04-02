<?php

declare(strict_types=1);

namespace Code\Domain\Components;

use Application\Helper\BaseRepository;

final class ComponentRepository extends BaseRepository
{
    private const TABLE = 'component';

    private const COLUMNS = [
        'id',
        'active_version_id',
        'name',
        'slug',
        'framework',
        'tag_name',
        'created_at',
        'updated_at',
        'BIN_TO_UUID(public_id) as public_id',
    ];

    protected function connectionName(): string
    {
        return 'main';
    }

    private function buildSelectClause(): string
    {
        return implode(",\n    ", self::COLUMNS);
    }

    public function getById(int $id): ?ComponentRow
    {
        if ($id <= 0) {
            return null;
        }

        $sql = sprintf(
            "SELECT
    %s
FROM %s
WHERE id = :id
LIMIT 1",
            $this->buildSelectClause(),
            self::TABLE
        );

        $row = $this->db()->fetchOne($sql, [
            ':id' => $id,
        ]);

        return $row ? ComponentRow::fromArray($row) : null;
    }

    public function getBySlug(string $slug): ?ComponentRow
    {
        $slug = trim($slug);

        if ($slug === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT
    %s
FROM %s
WHERE slug = :slug
LIMIT 1",
            $this->buildSelectClause(),
            self::TABLE
        );

        $row = $this->db()->fetchOne($sql, [
            ':slug' => $slug,
        ]);

        return $row ? ComponentRow::fromArray($row) : null;
    }

    public function getByTagName(string $tagName): ?ComponentRow
    {
        $tagName = trim($tagName);

        if ($tagName === '') {
            return null;
        }

        $sql = sprintf(
            "SELECT
    %s
FROM %s
WHERE tag_name = :tag_name
LIMIT 1",
            $this->buildSelectClause(),
            self::TABLE
        );

        $row = $this->db()->fetchOne($sql, [
            ':tag_name' => $tagName,
        ]);

        return $row ? ComponentRow::fromArray($row) : null;
    }

    /**
     * @return list<ComponentRow>
     */
    public function getAll(): array
    {
        $sql = sprintf(
            "SELECT
    %s
FROM %s
ORDER BY name ASC",
            $this->buildSelectClause(),
            self::TABLE
        );

        $rows = $this->db()->fetchAll($sql);

        return array_map(
            static fn(array $row): ComponentRow => ComponentRow::fromArray($row),
            $rows
        );
    }
}