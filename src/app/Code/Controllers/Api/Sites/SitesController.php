<?php

namespace Code\Controllers\Api\Sites;

use Application\Helper\BaseController;
use Code\Domain\Sites\SiteRow;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class SitesController extends BaseController
{
    private const int BATCH_LIMIT = 100;

    // ── UUID-based single-site routes ─────────────────────────────────────────

    public const array URI_PARAMETERS_BY_UUID = [
        'site_uuid' => [null, 'string'],
    ];

    public const string CONTROLLER_URI_BY_UUID = '/api/v1/sites/{site_uuid}';

    /** Reuses the same {site_uuid} parameter definition. */
    public const string CONTROLLER_URI_CHECK_UNIQUE = '/api/v1/sites/{site_uuid}/check-unique';

    /**
     * GET /api/v1/sites/{site_uuid}
     */
    public function getById(): Response
    {
        $uuid = trim((string)$this->getRequest()->attributes->get('site_uuid', ''));

        if ($uuid === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'Site UUID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $site = $this->services()->getSiteRepository()->getBySysRowId($uuid);

        if ($site === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Site not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $data = $site->toDetailApiArray();

        // ── Attach domain_ssl record ──────────────────────────────────────────
        // Always look up the ssl record for the site's domain so the frontend
        // can restore useLetsEncrypt and (for manual certs) the PEM fields.
        $domain = trim((string)($site->domain ?? ''));
        if ($domain !== '') {
            $sslRecord = $this->services()->getDomainSslRepository()->findByDomain($domain);

            if ($sslRecord !== null) {
                $isLetsEncrypt = (bool)($sslRecord['is_lets_encrypt'] ?? true);

                $data['ssl'] = [
                    'domain_ssl_id'   => $sslRecord['domain_ssl_id'],
                    'is_lets_encrypt' => $isLetsEncrypt,
                    'status'          => $sslRecord['status'],
                    'expires'         => $sslRecord['expires'],
                    'last_error'      => $sslRecord['last_error'],
                    'last_renewed_at' => $sslRecord['last_renewed_at'],
                ];

                // Only expose PEM material for manually-managed certs.
                // Let's Encrypt certs are re-issued automatically — no need to
                // round-trip key material through the browser.
                if (!$isLetsEncrypt) {
                    $data['ssl']['cert_pem'] = $sslRecord['cert_pem'];
                    $data['ssl']['key_pem']  = $sslRecord['key_pem'];
                }
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        return new JsonResponse([
            'success' => true,
            'data'    => $data,
        ], Response::HTTP_OK);
    }

    /**
     * GET /api/v1/sites/{site_uuid}/check-unique
     *
     * Query params (supply one or both):
     *   ?domain=<value>
     *   ?vanity_url=<value>
     *
     * Response:
     * {
     *   "success": true,
     *   "data": {
     *     "domain":     { "unique": true  },
     *     "vanity_url": { "unique": false, "message": "..." }
     *   }
     * }
     */
    public function checkUnique(): Response
    {
        $uuid = trim((string)$this->getRequest()->attributes->get('site_uuid', ''));

        if ($uuid === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'Site UUID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $site = $this->services()->getSiteRepository()->getBySysRowId($uuid);

        if ($site === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Site not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $query      = $this->getRequest()->query;
        $repo       = $this->services()->getSiteRepository();
        $whitelabel = (int)$site->whitelabel_id;
        $siteId     = (int)$site->site_id;
        $result     = [];

        $domain = trim((string)$query->get('domain', ''));
        if ($domain !== '') {
            $unique            = $repo->isDomainUnique($domain, $whitelabel, $siteId);
            $result['domain']  = [
                'unique'  => $unique,
                'message' => $unique ? null : 'This domain is already in use on this platform.',
            ];
        }

        $vanityUrl = trim((string)$query->get('vanity_url', ''));
        if ($vanityUrl !== '') {
            $unique               = $repo->isVanityUrlUnique($vanityUrl, $whitelabel, $siteId);
            $result['vanity_url'] = [
                'unique'  => $unique,
                'message' => $unique ? null : 'This vanity URL is already in use on this platform.',
            ];
        }

        return new JsonResponse([
            'success' => true,
            'data'    => $result,
        ], Response::HTTP_OK);
    }

    /**
     * PUT /api/v1/sites/{site_uuid}
     *
     * Accepted JSON body fields:
     *   site_name      string   – site / card title
     *   domain         string   – custom domain
     *   vanity_url     string   – short vanity slug
     *   status         string   – "active" | "build" | "inactive"
     *   template_id    int|null – theme template FK
     *   owner_id       int|null – owner user FK
     */
    public function updateById(): Response
    {
        $uuid = trim((string)$this->getRequest()->attributes->get('site_uuid', ''));

        if ($uuid === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'Site UUID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $site = $this->services()->getSiteRepository()->getBySysRowId($uuid);

        if ($site === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Site not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $body = $this->getRequestJson();

        if ($body === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Invalid or missing JSON body.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $fields = [];

        if (isset($body->site_name) && is_string($body->site_name)) {
            $trimmed = trim($body->site_name);
            if ($trimmed !== '') {
                $fields['site_name'] = $trimmed;
            }
        }

        if (isset($body->domain) && is_string($body->domain)) {
            $fields['domain'] = strtolower(trim($body->domain));
        }

        if (isset($body->vanity_url) && is_string($body->vanity_url)) {
            $fields['vanity_url'] = strtolower(trim($body->vanity_url));
        }

        if (isset($body->status) && is_string($body->status)) {
            $status = strtolower(trim($body->status));
            if (in_array($status, ['active', 'build', 'inactive'], true)) {
                $fields['status'] = $status;
            }
        }

        if (property_exists($body, 'template_id')) {
            $fields['template_id'] = is_int($body->template_id) ? $body->template_id : null;
        }

        if (property_exists($body, 'owner_id')) {
            $fields['owner_id'] = is_int($body->owner_id) ? $body->owner_id : null;
        }

        // ── SSL intent ────────────────────────────────────────────────────
        // Read the three SSL fields sent by the frontend.
        // use_ssl drives has_domain_ssl on the site row.
        // use_lets_encrypt / ssl_cert_pem / ssl_key_pem drive domain_ssl.
        $useSsl         = property_exists($body, 'use_ssl')         ? (bool)$body->use_ssl         : null;
        $useLetsEncrypt = property_exists($body, 'use_lets_encrypt') ? (bool)$body->use_lets_encrypt : true;
        $sslCertPem     = property_exists($body, 'ssl_cert_pem')    ? trim((string)$body->ssl_cert_pem) : '';
        $sslKeyPem      = property_exists($body, 'ssl_key_pem')     ? trim((string)$body->ssl_key_pem)  : '';

        // ── Server-side PEM validation (mirrors the frontend validatePem) ──
        if ($useSsl === true && !$useLetsEncrypt) {
            $certError = $this->validatePemBlock($sslCertPem, 'cert');
            if ($certError !== null) {
                return new JsonResponse([
                    'success' => false,
                    'message' => $certError,
                    'field'   => 'ssl_cert_pem',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $keyError = $this->validatePemBlock($sslKeyPem, 'key');
            if ($keyError !== null) {
                return new JsonResponse([
                    'success' => false,
                    'message' => $keyError,
                    'field'   => 'ssl_key_pem',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }
        // ──────────────────────────────────────────────────────────────────

        if ($useSsl !== null) {
            $fields['has_domain_ssl'] = $useSsl ? 1 : 0;
        }
        // ──────────────────────────────────────────────────────────────────

        // ── Uniqueness validation (scoped to whitelabel) ──────────────────
        $repo       = $this->services()->getSiteRepository();
        $whitelabel = (int)$site->whitelabel_id;
        $siteId     = (int)$site->site_id;

        if (
            isset($fields['domain']) &&
            $fields['domain'] !== '' &&
            $fields['domain'] !== $site->domain
        ) {
            if (!$repo->isDomainUnique($fields['domain'], $whitelabel, $siteId)) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'This domain is already in use on this platform.',
                    'field'   => 'domain',
                ], Response::HTTP_CONFLICT);
            }
        }

        if (
            isset($fields['vanity_url']) &&
            $fields['vanity_url'] !== '' &&
            $fields['vanity_url'] !== $site->vanity_url
        ) {
            if (!$repo->isVanityUrlUnique($fields['vanity_url'], $whitelabel, $siteId)) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'This vanity URL is already in use on this platform.',
                    'field'   => 'vanity_url',
                ], Response::HTTP_CONFLICT);
            }
        }
        // ──────────────────────────────────────────────────────────────────

        $updated = $this->services()->getSiteRepository()->updateBySysRowId($uuid, $fields);

        if ($updated === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Failed to update site.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // ── SSL pipeline ──────────────────────────────────────────────────
        // Only act when the frontend explicitly sent use_ssl.
        if ($useSsl !== null) {
            $domainForSsl   = $fields['domain'] ?? $site->domain ?? '';
            $siteIdForSsl   = (int)$updated->site_id;
            $whitelabelId   = (int)$updated->whitelabel_id;
            $sslRepo        = $this->services()->getDomainSslRepository();

            if (!$useSsl) {
                // SSL disabled — nothing to upsert; has_domain_ssl=0 already written above.
                // The domain_ssl row is intentionally left in place (may still hold a valid
                // cert from a previous session) — the ACME worker will naturally let it expire.

            } elseif ($useLetsEncrypt) {
                // Let's Encrypt — queue domain for automatic issuance by the ACME worker.
                if ($domainForSsl !== '') {
                    $sslRepo->upsertPending($domainForSsl, $siteIdForSsl, $whitelabelId);
                }

            } else {
                // Manual cert — store the provided PEM material immediately as active.
                if ($domainForSsl !== '' && $sslCertPem !== '' && $sslKeyPem !== '') {
                    $sslRepo->upsertManualCert(
                        $domainForSsl,
                        $siteIdForSsl,
                        $whitelabelId,
                        $sslCertPem,
                        $sslKeyPem
                    );
                }
            }
        }
        // ──────────────────────────────────────────────────────────────────

        return new JsonResponse([
            'success' => true,
            'data'    => $updated->toDetailApiArray(),
        ], Response::HTTP_OK);
    }

    public function deleteById(): Response
    {
        return new JsonResponse(['success' => true], Response::HTTP_OK);
    }

    // ── Collection routes ─────────────────────────────────────────────────────

    public const string CONTROLLER_URI_SITE = '/api/v1/sites';

    public function createSite(): Response
    {
        return new JsonResponse(['Test' => 'Created!'], Response::HTTP_OK);
    }

    /**
     * GET /api/v1/sites
     *
     * Two modes, determined by which query params are present:
     *
     * ── Batch hydration ──────────────────────────────────────────
     *   ?ids=1,2,3
     *   Returns a map keyed by site_id for O(1) client-side hydration:
     *   { "success": true, "data": { "1": {...}, "2": {...} } }
     *
     * ── Paginated list ───────────────────────────────────────────
     *   ?page=1&q=searchTerm&filter=Everything
     *   Optional owner scoping:
     *     &user_uuid=<uuid>   – show only sites owned by this user (admin view)
     *     &scope=owned        – show only sites owned by the currently logged-in user
     *   Optional multi-column search:
     *     &search_fields=site_name,domain,vanity_url
     *   Returns paginated results with metadata:
     *   { "success": true, "data": [...], "meta": { "page":1, "pages":12, ... } }
     */
    public function getList(): Response
    {
        $query = $this->getRequest()->query;

        if ($query->has('ids')) {
            return $this->handleBatch((string)$query->get('ids', ''));
        }

        $q      = trim((string)$query->get('q', ''));
        $filter = trim((string)$query->get('filter', 'Everything'));
        $page   = max(1, (int)$query->get('page', 1));

        // ── Resolve owner filter ──────────────────────────────────────────
        $ownerUserId = 0;

        $userUuid = trim((string)$query->get('user_uuid', ''));
        if ($userUuid !== '') {
            // Admin is requesting sites for a specific user — look up their PK.
            $ownerUser = $this->services()->getUserRepository()->getBySysRowId($userUuid);
            if ($ownerUser !== null) {
                $ownerUserId = (int)$ownerUser->user_id;
            }
        } elseif (trim((string)$query->get('scope', '')) === 'owned') {
            // Regular user is requesting their own sites — derive ID from the JWT.
            $jwtPayload  = $this->getUserJwtPayload();
            $ownerUserId = (int)($jwtPayload['data']['user']['user_id'] ?? 0);
        }
        // scope=whitelabel (admin global view) → ownerUserId stays 0, no extra filter.

        // ── Resolve search fields ─────────────────────────────────────────
        $searchFieldsRaw = trim((string)$query->get('search_fields', ''));
        $searchFields    = $searchFieldsRaw !== ''
            ? array_map('trim', explode(',', $searchFieldsRaw))
            : [];

        $result = $this->services()->getSiteRepository()->search(
            $q,
            $filter,
            $page,
            20,
            $ownerUserId,
            $searchFields
        );

        return new JsonResponse([
            'success' => true,
            'data'    => array_map(
                fn(SiteRow $site): array => $site->toListApiArray(),
                $result['rows']
            ),
            'meta'    => [
                'page'    => $result['page'],
                'pages'   => $result['pages'],
                'total'   => $result['total'],
                'perPage' => $result['perPage'],
            ],
        ], Response::HTTP_OK);
    }

    private function handleBatch(string $idsParam): Response
    {
        $idsParam = trim($idsParam);

        if ($idsParam === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'The "ids" query parameter must not be empty.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $ids = array_values(
            array_filter(
                array_map('intval', explode(',', $idsParam)),
                fn(int $id): bool => $id > 0
            )
        );

        if (empty($ids)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'No valid site IDs provided.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (count($ids) > self::BATCH_LIMIT) {
            return new JsonResponse([
                'success' => false,
                'message' => sprintf('Batch size exceeds the limit of %d IDs.', self::BATCH_LIMIT),
            ], Response::HTTP_BAD_REQUEST);
        }

        $sites = $this->services()->getSiteRepository()->getByIds($ids);

        return new JsonResponse([
            'success' => true,
            'data'    => array_map(
                fn(SiteRow $site): array => $site->toArray(),
                $sites
            ),
        ], Response::HTTP_OK);
    }

    /**
     * Validate a PEM block (certificate or private key).
     *
     * @param string $pem The PEM block to validate
     * @param string $type Either 'cert' or 'key'
     * @return string|null Error message if invalid, null if valid
     */
    private function validatePemBlock(string $pem, string $type): ?string
    {
        if ($pem === '') {
            return ucfirst($type === 'cert' ? 'Certificate' : 'Private key') . ' PEM is required.';
        }

        if ($type === 'cert') {
            // Validate certificate format: -----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
            $pattern = '/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/';
            if (!preg_match($pattern, $pem)) {
                return 'Invalid certificate PEM format. Must start with -----BEGIN CERTIFICATE----- and end with -----END CERTIFICATE-----.';
            }
        } elseif ($type === 'key') {
            // Validate private key format: -----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
            $pattern = '/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/';
            if (!preg_match($pattern, $pem)) {
                return 'Invalid private key PEM format. Must start with -----BEGIN PRIVATE KEY----- and end with -----END PRIVATE KEY-----.';
            }
        }

        return null;
    }
}

