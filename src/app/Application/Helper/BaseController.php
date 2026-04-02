<?php

declare(strict_types=1);

namespace Application\Helper;

use Application\ServiceManagement\Services;
use Code\Services\Auth\JwtAuthService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Code\Services\Identity\IdentityStruct;

abstract class BaseController
{
    public const string CONTROLLER_URI = "";
    public const array URI_PARAMETERS = [];

    protected string $bearerToken = "";

    public function __construct(
        protected Request $request,
        protected readonly Services $services
    ) {
        $this->registerAuth($request);
    }

    public function getRequestJson(): \stdClass|null
    {
        $json = json_decode($this->request->getContent());
        if (!$json) {
            return null;
        }
        return $json;
    }

    public function getRequestRaw(): string
    {
        return $this->request->getContent();
    }

    public function getRequest(): Request
    {
        return $this->request;
    }

    protected function services(): Services
    {
        return $this->services;
    }

    protected function authServices(): JwtAuthService
    {
        return $this->services->getAuthService();
    }

    protected function registerAuth(Request $request): void
    {
        $authorizationHeader = $request->headers->get('Authorization');

        if (!is_string($authorizationHeader) || trim($authorizationHeader) === '') {
            $this->bearerToken = '';
            return;
        }

        if (preg_match('/^Bearer\s+(.+)$/i', trim($authorizationHeader), $matches)) {
            $this->bearerToken = trim($matches[1]);
            return;
        }

        $this->bearerToken = '';
    }

    protected function getBearerToken(): string
    {
        return $this->bearerToken ?? "";
    }

    protected function getJwtPayload(): ?array
    {
        return $this->services()
            ->getJwtService()
            ->tryDecodeTokenFromBearer($this->getBearerToken());
    }

    protected function getUserJwtPayload(): ?array
    {
        return $this->services()
            ->getJwtService()
            ->tryDecodeUserTokenFromBearer($this->getBearerToken());
    }

    protected function getJwtTokenType(): ?array
    {
        return $this->services()
            ->getJwtService()
            ->tryDecodeUserTokenFromBearer($this->getBearerToken());
    }

    protected function getSessionOrUserJwtPayload(): ?array
    {
        return $this->services()
            ->getJwtService()
            ->tryDecodeSessionOrUserTokenFromBearer($this->getBearerToken());
    }

    protected function identity(): ?IdentityStruct
    {
        return $this->services()->getIdentityRegistrationManager()->getIdentity();
    }

    protected function requireIdentity(): IdentityStruct
    {
        return $this->services()->getIdentityRegistrationManager()->requireIdentity();
    }

    protected function isSiteIdentity(): bool
    {
        $identity = $this->identity();

        return $identity !== null && $identity->type->value === 'site';
    }

    protected function isWhitelabelIdentity(): bool
    {
        $identity = $this->identity();

        return $identity !== null && $identity->type->value === 'whitelabel';
    }

    protected function returnBasePage(): Response
    {
        $html = $this->services()
            ->htmlPageRenderer()
            ->render('Shared/Views/core-shell', [
                'pageTitle' => 'Maxr',
                'appJsUrl' => '/assets/runtime/dyn-component-manager.js',
                'bootstrapCssUrl' => 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
                'bootstrap' => [
                    'app' => [
                        'name' => 'Maxr',
                        'environment' => getenv('APP_ENV') ?: 'local',
                        'baseUrl' => rtrim((string)(getenv('APP_URL') ?: ''), '/'),
                    ],
                    'shell' => [
                        'shellId' => 'core-shell',
                        'theme' => 'default',
                    ],
                    'auth' => [
                        'tokenType' => $this->getJwtTokenType(),
                        'hasToken' => $this->getUserJwtPayload() !== null,
                    ],
                    'site' => [
                        'siteId' => null,
                        'dist' => true,
                    ],
                    'routing' => [
                        'path' => $this->getRequest()->getPathInfo(),
                    ],
                    'component' => [
                        'rootWidgetId' => '122160fe-9981-4d3d-8218-fabdd279713a',
                        'resolveUriEndpoint' => '/api/v1/components/resolve-by-uri',
                        'manifestEndpointTemplate' => '/api/v1/components/{id}/manifest',
                        'sessionEndpoint' => '/api/v1/auth/session',
                        'loginEndpoint' => '/api/v1/auth/login',
                    ],
                    'media' => [
                        'serverUrl' => rtrim((string)(getenv('MEDIA_SERVER_URL') ?: 'http://localhost:3002'), '/'),
                    ],
                ],
            ]);

        return new Response(
            $html,
            Response::HTTP_OK,
            ['Content-Type' => 'text/html; charset=UTF-8']
        );
    }
}