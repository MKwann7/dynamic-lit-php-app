<?php

declare(strict_types=1);

namespace Application\ServiceManagement;

use Application\Routing\Instance\CustomRouteLoader;
use Application\Routing\Instance\RouteCollection;
use Application\Routing\RouteControllerRegistrar;
use Code\Database\DatabaseClient;
use Code\Database\DatabaseConnection;
use Code\Domain\Sites\SiteRepository;
use Code\Domain\Users\UserAdminPermissionRepository;
use Code\Domain\Users\UserRepository;
use Code\Security\JwtPayloadFactory;
use Code\Security\JwtTokenService;
use Code\Services\Auth\JwtAuthService;
use Code\Services\Auth\JwtService;
use Code\Services\Components\AggregateComponentService;
use Code\Services\View\HtmlPageRenderer;
use Code\Domain\Whitelabel\WhitelabelRepository;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Symfony\Component\Routing\RequestContext;
use Symfony\Component\Routing\RouteCollection as SymfonyRouteCollection;
use Symfony\Component\Routing\Router;
use Code\Services\Identity\IdentityRegistrationManager;
use Code\Services\Identity\IdentitySchemeService;
use Code\Services\Identity\IdentitySessionStore;
use Code\Services\Identity\SiteIdentityResolver;
use Code\Services\Identity\WhitelabelIdentityResolver;

class Services
{
    private RouteControllerRegistrar $routeRegistrar;
    private bool $frameworkServicesRegistered = false;
    private bool $routingRegistered = false;
    private ?JwtTokenService $jwtTokenService = null;
    private ?JwtAuthService $authService = null;
    private ?JwtPayloadFactory $jwtPayloadFactory = null;
    private ?UserRepository $userRepository = null;
    private ?UserAdminPermissionRepository $userAdminPermissionRepository = null;
    private ?JwtService $jwtService = null;
    private ?HtmlPageRenderer $htmlPageRenderer = null;
    private ?AggregateComponentService $componentService = null;
    private ?SiteRepository $siteRepository = null;
    private ?WhitelabelRepository $whitelabelRepository = null;
    private ?IdentityRegistrationManager $identityRegistrationManager = null;
    private ?IdentitySchemeService $identitySchemeService = null;
    private ?IdentitySessionStore $identitySessionStore = null;
    private ?SiteIdentityResolver $siteIdentityResolver = null;
    private ?WhitelabelIdentityResolver $whitelabelIdentityResolver = null;


    public function __construct(
        private readonly ContainerBuilder $container
    ) {
    }

    /**
     * Register framework-level services needed for routing/container use.
     */
    private function registerFrameworkServices(): void
    {
        if ($this->frameworkServicesRegistered === true) {
            return;
        }

        if (!$this->container->has(SymfonyRouteCollection::class)) {
            $this->container
                ->register(SymfonyRouteCollection::class, SymfonyRouteCollection::class)
                ->setPublic(true);
        }

        if (!$this->container->has(RequestContext::class)) {
            $this->container
                ->register(RequestContext::class, RequestContext::class)
                ->setPublic(true);
        }

        if (!$this->container->has('router')) {
            $this->container
                ->register('router', Router::class)
                ->addArgument(new CustomRouteLoader())
                ->addArgument(new Reference(SymfonyRouteCollection::class))
                ->addArgument([])
                ->addArgument(new Reference(RequestContext::class))
                ->setPublic(true);
        }

        $this->frameworkServicesRegistered = true;
    }

    /**
     * Registers routes/controllers into the Symfony routing collection.
     */
    public function registerRouting(RouteCollection $customRouteCollection): void
    {
        if ($this->routingRegistered === true) {
            return;
        }

        $this->registerFrameworkServices();

        $this->routeRegistrar = new RouteControllerRegistrar($this->container);
        $this->routeRegistrar->registerRoutesAndControllers($customRouteCollection);

        $this->routingRegistered = true;
    }

    public function getRouter(): Router
    {
        $this->registerFrameworkServices();

        /** @var Router $router */
        $router = $this->container->get('router');

        return $router;
    }

    public function htmlPageRenderer(): HtmlPageRenderer
    {
        if ($this->htmlPageRenderer === null) {
            $this->htmlPageRenderer = new HtmlPageRenderer(
                ROOT . '/src/app/Code'
            );
        }

        return $this->htmlPageRenderer;
    }

    public function getComponentService(): AggregateComponentService
    {
        if ($this->componentService === null) {
            $this->componentService = new AggregateComponentService(
                $this->getUserRepository(),
                $this->jwtPayloadFactory(),
                $this->jwtTokenService()
            );
        }

        return $this->componentService;
    }

    public function getAuthService(): JwtAuthService
    {
        if ($this->authService === null) {
            $this->authService = new JwtAuthService(
                $this->getUserRepository(),
                $this->jwtPayloadFactory(),
                $this->jwtTokenService(),
                $this->getIdentityRegistrationManager(),
                $this->getUserAdminPermissionRepository(),
            );
        }

        return $this->authService;
    }

    public function getUserAdminPermissionRepository(): UserAdminPermissionRepository
    {
        if ($this->userAdminPermissionRepository === null) {
            $this->userAdminPermissionRepository = new UserAdminPermissionRepository();
        }

        return $this->userAdminPermissionRepository;
    }

    public function getJwtService(): JwtService
    {
        if ($this->jwtService === null) {
            $this->jwtService = JwtService::fromEnvironment();
        }

        return $this->jwtService;
    }

    public function getUserRepository(): UserRepository
    {
        if ($this->userRepository === null) {
            $this->userRepository = new UserRepository();
        }

        return $this->userRepository;
    }

    public function jwtPayloadFactory(): JwtPayloadFactory
    {
        if ($this->jwtPayloadFactory === null) {
            $this->jwtPayloadFactory = new JwtPayloadFactory(
                issuer: (string)(getenv('JWT_ISSUER') ?: 'dynlit-app'),
                audience: (string)(getenv('JWT_AUDIENCE') ?: 'dynlit-app-clients'),
                ttlSeconds: (int)(getenv('JWT_TTL_SECONDS') ?: 3600)
            );
        }

        return $this->jwtPayloadFactory;
    }

    public function jwtTokenService(): JwtTokenService
    {
        if ($this->jwtTokenService === null) {
            $secret = (string)(getenv('JWT_SECRET') ?: '');

            if ($secret === '') {
                throw new \RuntimeException('JWT_SECRET is not configured.');
            }

            $this->jwtTokenService = new JwtTokenService(
                secret: $secret,
                algorithm: (string)(getenv('JWT_ALGORITHM') ?: 'HS256')
            );
        }

        return $this->jwtTokenService;
    }

    public function getSiteRepository(): SiteRepository
    {
        if ($this->siteRepository === null) {
            $this->siteRepository = new SiteRepository();
        }

        return $this->siteRepository;
    }

    public function getWhitelabelRepository(): WhitelabelRepository
    {
        if ($this->whitelabelRepository === null) {
            $this->whitelabelRepository = new WhitelabelRepository();
        }

        return $this->whitelabelRepository;
    }

    public function initializeRequestContext(Request $request): void
    {
        $this->getIdentityRegistrationManager()->initialize($request);
    }

    public function getIdentitySessionStore(): IdentitySessionStore
    {
        if ($this->identitySessionStore === null) {
            $this->identitySessionStore = new IdentitySessionStore();
        }

        return $this->identitySessionStore;
    }

    public function getSiteIdentityResolver(): SiteIdentityResolver
    {
        if ($this->siteIdentityResolver === null) {
            $this->siteIdentityResolver = new SiteIdentityResolver(
                $this->getSiteRepository()
            );
        }

        return $this->siteIdentityResolver;
    }

    public function getWhitelabelIdentityResolver(): WhitelabelIdentityResolver
    {
        if ($this->whitelabelIdentityResolver === null) {
            $this->whitelabelIdentityResolver = new WhitelabelIdentityResolver(
                $this->getWhitelabelRepository()
            );
        }

        return $this->whitelabelIdentityResolver;
    }

    public function getIdentityRegistrationManager(): IdentityRegistrationManager
    {
        if ($this->identityRegistrationManager === null) {
            $this->identityRegistrationManager = new IdentityRegistrationManager(
                $this->getIdentitySessionStore(),
                [
                    $this->getSiteIdentityResolver(),
                    $this->getWhitelabelIdentityResolver(),
                ]
            );
        }

        return $this->identityRegistrationManager;
    }

    public function getIdentitySchemeService(): IdentitySchemeService
    {
        if ($this->identitySchemeService === null) {
            $this->identitySchemeService = new IdentitySchemeService();
        }

        return $this->identitySchemeService;
    }
}