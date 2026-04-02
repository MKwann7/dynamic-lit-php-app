<?php

declare(strict_types=1);

namespace Code\Controllers\Auth;

use Application\Helper\BaseController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class SessionAuthController extends BaseController
{
    public const string CONTROLLER_URI = '/api/v1/auth/session';
    public const array URI_PARAMETERS = [];

    public function run(): Response
    {
        if ($this->getUserJwtPayload() !== null) {
            return new JsonResponse([
                'success' => false,
                'data' => "User is already logged in",
            ], Response::HTTP_OK);
        }

        try {
            $result = $this->authServices()
                ->makeSessionToken();

            return new JsonResponse([
                'success' => true,
                'data' => $result,
            ], Response::HTTP_OK);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNAUTHORIZED);
        }
    }
}