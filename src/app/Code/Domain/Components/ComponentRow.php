<?php

declare(strict_types=1);

namespace Code\Domain\Components;

/**
 * Lightweight database row struct for the `component` table.
 *
 * @property int|null $id
 * @property int|null $active_version_id
 * @property string|null $name
 * @property string|null $slug
 * @property string|null $framework
 * @property string|null $tag_name
 * @property string|null $created_at
 * @property string|null $updated_at
 */
final class ComponentRow
{
    public ?int $id = null;
    public ?int $active_version_id = null;
    public ?string $name = null;
    public ?string $slug = null;
    public ?string $framework = null;
    public ?string $tag_name = null;
    public ?string $created_at = null;
    public ?string $updated_at = null;

    /**
     * @param array<string, mixed> $row
     */
    public static function fromArray(array $row): self
    {
        $component = new self();

        $component->id = isset($row['id']) ? (int) $row['id'] : null;
        $component->active_version_id = isset($row['active_version_id']) ? (int) $row['active_version_id'] : null;
        $component->name = array_key_exists('name', $row) && $row['name'] !== null ? (string) $row['name'] : null;
        $component->slug = array_key_exists('slug', $row) && $row['slug'] !== null ? (string) $row['slug'] : null;
        $component->framework = array_key_exists('framework', $row) && $row['framework'] !== null ? (string) $row['framework'] : null;
        $component->tag_name = array_key_exists('tag_name', $row) && $row['tag_name'] !== null ? (string) $row['tag_name'] : null;
        $component->created_at = array_key_exists('created_at', $row) && $row['created_at'] !== null ? (string) $row['created_at'] : null;
        $component->updated_at = array_key_exists('updated_at', $row) && $row['updated_at'] !== null ? (string) $row['updated_at'] : null;

        return $component;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'active_version_id' => $this->active_version_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'framework' => $this->framework,
            'tag_name' => $this->tag_name,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}