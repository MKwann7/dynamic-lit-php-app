<?php

namespace Code\Controllers\Api\Users;

use Application\Helper\BaseController;
use Code\Domain\Users\UserRow;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class UsersController extends BaseController
{
    private const int BATCH_LIMIT = 100;

    // ── UUID-based single-user routes ─────────────────────────────────────────

    public const array URI_PARAMETERS_BY_UUID = [
        'user_uuid' => [null, 'string'],
    ];

    public const string CONTROLLER_URI_BY_UUID = '/api/v1/users/{user_uuid}';
    public const string CONTROLLER_URI_AVATAR_BY_UUID = '/api/v1/users/{user_uuid}/avatar';

    /**
     * GET /api/v1/users/{user_uuid}
     */
    public function getByUuid(): Response
    {
        $uuid = trim((string)$this->getRequest()->attributes->get('user_uuid', ''));

        if ($uuid === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'User UUID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->services()->getUserRepository()->getBySysRowId($uuid);

        if ($user === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'User not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse([
            'success' => true,
            'data'    => $user->toDetailApiArray(),
        ], Response::HTTP_OK);
    }

    /**
     * PUT /api/v1/users/{user_uuid}
     */
    public function updateByUuid(): Response
    {
        $uuid = trim((string)$this->getRequest()->attributes->get('user_uuid', ''));

        if ($uuid === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'User UUID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->services()->getUserRepository()->getBySysRowId($uuid);

        if ($user === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'User not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $body = json_decode((string)$this->getRequest()->getContent(), true) ?? [];

        $updated = $this->services()->getUserRepository()->updateBySysRowId($uuid, $body);

        if (!$updated) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Failed to update user.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $fresh = $this->services()->getUserRepository()->getBySysRowId($uuid);

        return new JsonResponse([
            'success' => true,
            'data'    => $fresh?->toDetailApiArray(),
        ], Response::HTTP_OK);
    }

    /**
     * PATCH /api/v1/users/{user_uuid}/avatar
     *
     * Auth gate (Router): auth:user_or_admin
     * Extra enforcement: a plain user token may only update their OWN avatar.
     *                    Admin tokens may update any user's avatar.
     *
     * Body (JSON): { "avatar_url": "https://…" }
     */
    public function updateAvatarByUuid(): Response
    {
        $uuid = trim((string)$this->getRequest()->attributes->get('user_uuid', ''));

        if ($uuid === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'User UUID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->services()->getUserRepository()->getBySysRowId($uuid);

        if ($user === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'User not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Users may only update their own avatar; admins are unrestricted.
        $payload   = $this->getJwtPayload();
        $tokenType = (string)($payload['token_type'] ?? '');

        if ($tokenType === 'user') {
            // JWT sub = string-cast user_id (set by JwtPayloadFactory).
            $jwtUserId = (int)($payload['sub'] ?? 0);
            if ($jwtUserId <= 0 || $jwtUserId !== (int)($user->user_id ?? 0)) {
                return new JsonResponse([
                    'success' => false,
                    'message' => 'You are not authorised to update this user\'s avatar.',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        $body      = json_decode((string)$this->getRequest()->getContent(), true) ?? [];
        $avatarUrl = trim((string)($body['avatar_url'] ?? ''));

        if ($avatarUrl === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'avatar_url is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $updated = $this->services()->getUserRepository()->updateBySysRowId($uuid, [
            'avatar_url' => $avatarUrl,
        ]);

        if (!$updated) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Failed to update avatar.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse([
            'success' => true,
            'data'    => [
                'uuid'       => $uuid,
                'avatar_url' => $avatarUrl,
            ],
        ], Response::HTTP_OK);
    }

    // ── Single-user routes (numeric ID) ──────────────────────────────────────

    public const array URI_PARAMETERS_BY_ID = [
        'user_id' => [null, 'number'],
    ];

    public const string CONTROLLER_URI_BY_ID = '/api/v1/users/{user_id}';

    /**
     * GET /api/v1/users/{user_id}
     */
    public function getById(): Response
    {
        $userId = (int)$this->getRequest()->attributes->get('user_id', 0);

        if ($userId <= 0) {
            return new JsonResponse([
                'success' => false,
                'message' => 'User ID is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->services()->getUserRepository()->getById($userId);

        if ($user === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'User not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse([
            'success' => true,
            'data'    => $user->toDetailApiArray(),
        ], Response::HTTP_OK);
    }

    /**
     * PUT /api/v1/users/{user_id}
     */
    public function updateById(): Response
    {
        return new JsonResponse(['success' => true], Response::HTTP_OK);
    }

    /**
     * DELETE /api/v1/users/{user_id}
     */
    public function deleteById(): Response
    {
        return new JsonResponse(['success' => true], Response::HTTP_OK);
    }

    // ── Collection routes ─────────────────────────────────────────────────────

    public const string CONTROLLER_URI_SITE = '/api/v1/users';

    /**
     * POST /api/v1/users
     */
    public function createSite(): Response
    {
        return new JsonResponse(['Test' => 'Created!'], Response::HTTP_OK);
    }

    /**
     * GET /api/v1/users
     *
     * Two modes, determined by which query params are present:
     *
     * ── Batch hydration ──────────────────────────────────────────
     *   ?ids=1,2,3
     *   Returns a map keyed by user_id:
     *   { "success": true, "data": { "1": {...}, "2": {...} } }
     *
     * ── Paginated list ───────────────────────────────────────────
     *   ?page=1&q=searchTerm&filter=Everything
     *   Returns paginated results with metadata:
     *   { "success": true, "data": [...], "meta": { "page":1, "pages":5, ... } }
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

        $result = $this->services()->getUserRepository()->search($q, $filter, $page);

        return new JsonResponse([
            'success' => true,
            'data'    => array_map(
                fn(UserRow $user): array => $user->toListApiArray(),
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
                'message' => 'No valid user IDs provided.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (count($ids) > self::BATCH_LIMIT) {
            return new JsonResponse([
                'success' => false,
                'message' => sprintf('Batch size exceeds the limit of %d IDs.', self::BATCH_LIMIT),
            ], Response::HTTP_BAD_REQUEST);
        }

        $users = $this->services()->getUserRepository()->getByIds($ids);

        return new JsonResponse([
            'success' => true,
            'data'    => array_map(
                fn(UserRow $user): array => $user->toListApiArray(),
                $users
            ),
        ], Response::HTTP_OK);
    }
}

