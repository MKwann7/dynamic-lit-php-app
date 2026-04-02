<?php

declare(strict_types=1);

namespace Code\Services\Identity;

final class IdentityStruct
{
    public function __construct(
        public readonly IdentityType $type,
        public readonly int $id,
        public readonly string $name,
        public readonly string $domain,
        public readonly bool $domain_ssl,
        public readonly ?string $portal_name,
        public readonly ?string $portal_domain,
        public readonly ?bool $portal_domain_ssl,
        public readonly string $uuid,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            type: IdentityType::from((string) $data['type']),
            id: (int) $data['id'],
            name: (string) $data['name'],
            domain: strtolower(trim((string) $data['domain'])),
            domain_ssl: (bool) $data['domain_ssl'],
            portal_name: array_key_exists('portal_name', $data) && $data['portal_name'] !== null
                ? (string) $data['portal_name']
                : null,
            portal_domain: array_key_exists('portal_domain', $data) && $data['portal_domain'] !== null
                ? strtolower(trim((string) $data['portal_domain']))
                : null,
            portal_domain_ssl: array_key_exists('portal_domain_ssl', $data) && $data['portal_domain_ssl'] !== null
                ? (bool) $data['portal_domain_ssl']
                : null,
            uuid: (string) $data['uuid'],
        );
    }

    /**
     * @return array<string, scalar|null>
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type->value,
            'id' => $this->id,
            'name' => $this->name,
            'domain' => $this->domain,
            'domain_ssl' => $this->domain_ssl,
            'portal_name' => $this->portal_name,
            'portal_domain' => $this->portal_domain,
            'portal_domain_ssl' => $this->portal_domain_ssl,
            'uuid' => $this->uuid,
        ];
    }

    public function matchesHost(string $host): bool
    {
        $host = strtolower(trim($host));

        return $host === $this->domain
            || ($this->portal_domain !== null && $host === $this->portal_domain);
    }

    public function requiresSslForHost(string $host): ?bool
    {
        $host = strtolower(trim($host));

        if ($host === $this->domain) {
            return $this->domain_ssl;
        }

        if ($this->portal_domain !== null && $host === $this->portal_domain) {
            return $this->portal_domain_ssl;
        }

        return null;
    }
}