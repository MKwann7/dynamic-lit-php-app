<?php

declare(strict_types=1);

namespace Code\Domain\Ssl;

use Application\Helper\BaseRepository;

/**
 * DomainSslRepository manages rows in `dynlit_identity.domain_ssl`.
 *
 * The ACME worker (Go operator service) reads from this table every 6 hours
 * and issues/renews Let's Encrypt certificates for every domain it finds.
 * This repository's only job is to ensure a row exists — at status 'pending'
 * — whenever a domain is assigned to a site. The worker does the rest.
 */
final class DomainSslRepository extends BaseRepository
{
    protected function connectionName(): string
    {
        // Resolves to DB_IDENTITY_DATABASE (dynlit_identity) via
        // DatabaseConnection::fromEnvironment('identity') → DB_IDENTITY_DATABASE env var.
        return 'identity';
    }

    /**
     * Ensure a domain_ssl row exists for this domain and is queued for issuance.
     *
     * Behaviour on conflict (domain already has a row):
     *   status = 'active'   → leave it alone — cert is valid, do not re-trigger
     *   status = 'pending'  → leave it alone — issuance already in flight
     *   status = 'failed'
     *   status = 'expired'  → reset to 'pending' so the worker retries
     *
     * Always updates site_id / whitelabel_id in case the domain moved between sites.
     *
     * @param string $domain       Fully-qualified custom domain (e.g. "shop.example.com")
     * @param int    $siteId       FK to dynlit_main.site.site_id
     * @param int    $whitelabelId FK to dynlit_identity.whitelabel.id
     */
    public function upsertPending(string $domain, int $siteId, int $whitelabelId): void
    {
        $domain = strtolower(trim($domain));

        if ($domain === '') {
            return;
        }

        $this->db()->execute(
            "INSERT INTO domain_ssl
                (domain, site_id, whitelabel_id, status, is_lets_encrypt, challenge_type)
             VALUES
                (:domain, :site_id, :wl_id, 'pending', 1, 'http-01')
             ON DUPLICATE KEY UPDATE
                site_id       = VALUES(site_id),
                whitelabel_id = VALUES(whitelabel_id),
                status        = IF(status IN ('active', 'pending'), status, 'pending'),
                updated_on    = NOW()",
            [
                ':domain'  => $domain,
                ':site_id' => $siteId,
                ':wl_id'   => $whitelabelId,
            ]
        );
    }

    /**
     * Store a manually-provided certificate and private key for a domain.
     *
     * Marks is_lets_encrypt = 0 and status = 'active' immediately — the cert is
     * ready for NGINX to serve without waiting for the ACME worker.
     *
     * cert_pem is written into both cert_pem and fullchain_pem because the user
     * pastes their full bundle (cert + chain), which is exactly what NGINX's Lua
     * ssl_certificate_by_lua_block reads from {domain}.crt.
     *
     * @param string $domain       Fully-qualified domain (e.g. "shop.example.com")
     * @param int    $siteId       FK to dynlit_main.site.site_id
     * @param int    $whitelabelId FK to dynlit_identity.whitelabel.id
     * @param string $certPem      Full certificate bundle PEM (cert + intermediates)
     * @param string $keyPem       Private key PEM
     */
    public function upsertManualCert(
        string $domain,
        int    $siteId,
        int    $whitelabelId,
        string $certPem,
        string $keyPem
    ): void {
        $domain = strtolower(trim($domain));

        if ($domain === '' || $certPem === '' || $keyPem === '') {
            return;
        }

        $this->db()->execute(
            "INSERT INTO domain_ssl
                (domain, site_id, whitelabel_id, status, is_lets_encrypt, challenge_type,
                 cert_pem, fullchain_pem, key_pem, last_renewed_at)
             VALUES
                (:domain, :site_id, :wl_id, 'active', 0, 'http-01',
                 :cert_pem, :cert_pem, :key_pem, NOW())
             ON DUPLICATE KEY UPDATE
                site_id         = VALUES(site_id),
                whitelabel_id   = VALUES(whitelabel_id),
                is_lets_encrypt = 0,
                cert_pem        = VALUES(cert_pem),
                fullchain_pem   = VALUES(fullchain_pem),
                key_pem         = VALUES(key_pem),
                status          = 'active',
                last_error      = NULL,
                last_renewed_at = NOW(),
                updated_on      = NOW()",
            [
                ':domain'   => $domain,
                ':site_id'  => $siteId,
                ':wl_id'    => $whitelabelId,
                ':cert_pem' => $certPem,
                ':key_pem'  => $keyPem,
            ]
        );
    }

    /**
     * Look up the full domain_ssl record for a domain.
     *
     * Returns SSL metadata and — when is_lets_encrypt = 0 — the stored PEM
     * material so the API can surface it to the frontend for display/editing.
     *
     * @return array{
     *     domain_ssl_id: int,
     *     domain: string,
     *     is_lets_encrypt: int,
     *     status: string,
     *     cert_pem: string|null,
     *     key_pem: string|null,
     *     expires: string|null,
     *     last_error: string|null,
     *     last_renewed_at: string|null
     * }|null
     */
    public function findByDomain(string $domain): ?array
    {
        $domain = strtolower(trim($domain));

        if ($domain === '') {
            return null;
        }

        /** @var array<string,mixed>|false $row */
        $row = $this->db()->fetchOne(
            "SELECT
                domain_ssl_id,
                domain,
                is_lets_encrypt,
                status,
                cert_pem,
                key_pem,
                expires,
                last_error,
                last_renewed_at
             FROM domain_ssl
             WHERE domain = :domain
             LIMIT 1",
            [':domain' => $domain]
        );

        return $row !== false ? $row : null;
    }
}

