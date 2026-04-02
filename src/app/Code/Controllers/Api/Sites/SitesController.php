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

        return new JsonResponse([
            'success' => true,
            'data'    => $site->toDetailApiArray(),
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
}

