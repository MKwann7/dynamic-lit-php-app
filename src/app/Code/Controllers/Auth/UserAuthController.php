<?php

declare(strict_types=1);

namespace Code\Controllers\Auth;

use Application\Helper\BaseController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class UserAuthController extends BaseController
{
    public const string CONTROLLER_URI = '/api/v1/auth/login';
    public const array URI_PARAMETERS = [];

    public function run(): Response
    {
        $json = $this->getRequestJson();

        $identity = trim((string)($json->email ?? $json->username ?? ''));
        $password = (string)($json->password ?? '');

        if ($identity === '' || $password === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'username and password are required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->authServices()
                ->authenticateUser($identity, $password);

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