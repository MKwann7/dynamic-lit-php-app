<?php

declare(strict_types=1);

namespace Code\Services\Middleware;

use Application\ServiceManagement\Services;
use Code\Services\Auth\JwtService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final readonly class MiddlewareRunner
{
    public function __construct(
        private Services $services
    ) {
    }

    /**
     * @param array<string, mixed> $routeParameters
     */
    public function handle(Request $request, array $routeParameters): ?Response
    {
        $middlewareList = $routeParameters['_middleware'] ?? [];

        if (!is_array($middlewareList) || $middlewareList === []) {
            return null;
        }

        foreach ($middlewareList as $middleware) {
            $response = $this->runMiddleware($middleware, $request, $routeParameters);

            if ($response instanceof Response) {
                return $response;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $routeParameters
     */
    private function runMiddleware(string $middleware, Request $request, array $routeParameters): ?Response
    {
        // Handle permission-scoped format: auth:user_or_admin[permission.name]
        if (str_starts_with($middleware, 'auth:user_or_admin[') && str_ends_with($middleware, ']')) {
            $permission = substr($middleware, strlen('auth:user_or_admin['), -1);
            return $this->requireUserOrAdminWithPermission($request, $permission);
        }

        return match ($middleware) {
            'auth:global'           => $this->allowGlobal($request),
            'auth:user'             => $this->requireUserToken($request),
            'auth:admin'            => $this->requireAdminToken($request),
            'auth:user_or_admin'    => $this->requireUserOrAdminToken($request),
            'auth:session_or_user'  => $this->requireSessionOrUserToken($request),
            default                 => null,
        };
    }

    /**
     * Allows a regular user token unconditionally (data-layer scoping handles
     * what they can see/touch). Allows an admin token only when the JWT
     * permissions array contains the required permission string.
     */
    private function requireUserOrAdminWithPermission(Request $request, string $permission): ?Response
    {
        $token   = $this->extractBearerToken($request);
        $jwt     = $this->services->getJwtService();
        $payload = $jwt->tryDecodeUserOrAdminTokenFromBearer($token);

        if ($payload === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // User tokens always pass — ownership is enforced at the data layer
        if ($jwt->isUserToken($payload)) {
            $request->attributes->set('auth_payload', $payload);
            $request->attributes->set('auth_token_type', JwtService::TOKEN_TYPE_USER);
            return null;
        }

        // Admin tokens must carry the required permission
        if (!$jwt->hasPermission($payload, $permission)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Forbidden.',
            ], Response::HTTP_FORBIDDEN);
        }

        $request->attributes->set('auth_payload', $payload);
        $request->attributes->set('auth_token_type', JwtService::TOKEN_TYPE_ADMIN);
        return null;
    }

    private function allowGlobal(Request $request): ?Response
    {
        $token = $this->extractBearerToken($request);

        if ($token === '') {
            // No token. Just proceed
            return null;
        }

        $payload = $this->services
            ->getJwtService()
            ->tryDecodeTokenFromBearer($token);

        if ($payload !== null) {
            // Attach context if valid
            $request->attributes->set('auth_payload', $payload);
            $request->attributes->set(
                'auth_token_type',
                $this->services->getJwtService()->getTokenType($payload)
            );
        }

        // Never block
        return null;
    }

    private function requireUserToken(Request $request): ?Response
    {
        $token   = $this->extractBearerToken($request);
        $payload = $this->services->getJwtService()->tryDecodeUserTokenFromBearer($token);

        if ($payload === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return null;
    }

    /**
     * Requires an admin token specifically — for platform-admin-only endpoints.
     */
    private function requireAdminToken(Request $request): ?Response
    {
        $token   = $this->extractBearerToken($request);
        $payload = $this->services->getJwtService()->tryDecodeAdminTokenFromBearer($token);

        if ($payload === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return null;
    }

    /**
     * Requires any authenticated user — regular user or admin.
     * Use this for endpoints that don't need a session fallback.
     */
    private function requireUserOrAdminToken(Request $request): ?Response
    {
        $token   = $this->extractBearerToken($request);
        $payload = $this->services->getJwtService()->tryDecodeUserOrAdminTokenFromBearer($token);

        if ($payload === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return null;
    }

    /**
     * Accepts session, user, or admin tokens.
     * Used for routes that must be reachable by all token types
     * (e.g. manifest/component endpoints).
     */
    private function requireSessionOrUserToken(Request $request): ?Response
    {
        $token   = $this->extractBearerToken($request);
        $payload = $this->services->getJwtService()->tryDecodeSessionOrUserTokenFromBearer($token);

        if ($payload === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Unauthorized.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return null;
    }

    private function extractBearerToken(Request $request): string
    {
        $authorizationHeader = $request->headers->get('Authorization');

        if (!is_string($authorizationHeader) || trim($authorizationHeader) === '') {
            return '';
        }

        if (!preg_match('/^Bearer\s+(.+)$/i', trim($authorizationHeader), $matches)) {
            return '';
        }

        return trim($matches[1]);
    }
}