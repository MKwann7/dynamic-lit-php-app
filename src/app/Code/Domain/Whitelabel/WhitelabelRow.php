<?php

declare(strict_types=1);

namespace Code\Domain\Whitelabel;

final class WhitelabelRow
{
    public ?int $id = null;
    public ?string $name = null;
    public ?int $owner_id = null;
    public ?string $platform_name = null;
    public ?string $public_domain_name = null;
    public ?string $public_domain = null;
    public ?bool $public_domain_ssl = null;
    public ?string $portal_domain_name = null;
    public ?string $portal_domain = null;
    public ?bool $portal_domain_ssl = null;
    public ?string $root_redirect = null;
    public ?string $created_on = null;
    public ?string $last_updated_on = null;
    public ?string $sys_row_id = null;

    /**
     * @param array<string, mixed> $row
     */
    public static function fromArray(array $row): self
    {
        $item = new self();

        $item->id = isset($row['id']) ? (int)$row['id'] : null;
        $item->name = array_key_exists('name', $row) ? (string)$row['name'] : null;
        $item->owner_id = isset($row['owner_id']) ? (int)$row['owner_id'] : null;
        $item->platform_name = array_key_exists('platform_name', $row) ? (string)$row['platform_name'] : null;
        $item->public_domain_name = array_key_exists('public_domain_name', $row) ? (string)$row['public_domain_name'] : null;
        $item->public_domain = array_key_exists('public_domain', $row) ? strtolower(trim((string)$row['public_domain'])) : null;
        $item->public_domain_ssl = array_key_exists('public_domain_ssl', $row) ? (bool)$row['public_domain_ssl'] : null;
        $item->portal_domain_name = array_key_exists('portal_domain_name', $row) ? (string)$row['portal_domain_name'] : null;
        $item->portal_domain = array_key_exists('portal_domain', $row) ? strtolower(trim((string)$row['portal_domain'])) : null;
        $item->portal_domain_ssl = array_key_exists('portal_domain_ssl', $row) ? (bool)$row['portal_domain_ssl'] : null;
        $item->root_redirect = array_key_exists('root_redirect', $row) ? (string)$row['root_redirect'] : null;
        $item->created_on = array_key_exists('created_on', $row) ? (string)$row['created_on'] : null;
        $item->last_updated_on = array_key_exists('last_updated_on', $row) ? (string)$row['last_updated_on'] : null;
        $item->sys_row_id = array_key_exists('sys_row_id', $row) ? (string)$row['sys_row_id'] : null;

        return $item;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'owner_id' => $this->owner_id,
            'platform_name' => $this->platform_name,
            'public_domain_name' => $this->public_domain_name,
            'public_domain' => $this->public_domain,
            'public_domain_ssl' => $this->public_domain_ssl,
            'portal_domain_name' => $this->portal_domain_name,
            'portal_domain' => $this->portal_domain,
            'portal_domain_ssl' => $this->portal_domain_ssl,
            'root_redirect' => $this->root_redirect,
            'created_on' => $this->created_on,
            'last_updated_on' => $this->last_updated_on,
            'sys_row_id' => $this->sys_row_id,
        ];
    }
}