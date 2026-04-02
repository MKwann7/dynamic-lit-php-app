<?php

declare(strict_types=1);

namespace UnitTests\Application\ServiceManagement;

use Application\Routing\Instance\RouteCollection;
use Application\ServiceManagement\Services;
use Code\Security\JwtPayloadFactory;
use Code\Security\JwtTokenService;
use Code\Services\Auth\JwtService;
use Code\Services\Identity\IdentitySchemeService;
use Code\Services\Identity\IdentitySessionStore;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\Routing\RouteCollection as SymfonyRouteCollection;
use Symfony\Component\Routing\Router;

class ServicesTest extends TestCase
{
    /** Env var keys that tests read or write — saved and restored around every test. */
    private const array ENV_KEYS = [
        'JWT_SECRET',
        'JWT_ISSUER',
        'JWT_AUDIENCE',
        'JWT_TTL_SECONDS',
        'JWT_ALGORITHM',
    ];

    private array $originalEnv = [];
    private ContainerBuilder $containerMock;
    private Services $services;

    protected function setUp(): void
    {
        // Snapshot env vars so tearDown can restore them precisely.
        foreach (self::ENV_KEYS as $key) {
            $this->originalEnv[$key] = getenv($key);
        }

        putenv('JWT_SECRET=test-secret-key');
        putenv('JWT_ISSUER=test-issuer');
        putenv('JWT_AUDIENCE=test-audience');
        putenv('JWT_TTL_SECONDS=7200');
        putenv('JWT_ALGORITHM=HS256');

        $this->containerMock = $this->buildContainerMock();
        $this->services      = new Services($this->containerMock);
    }

    protected function tearDown(): void
    {
        foreach (self::ENV_KEYS as $key) {
            $original = $this->originalEnv[$key];
            putenv($original === false ? $key : "$key=$original");
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a ContainerBuilder mock whose Definition chains (setPublic / addArgument)
     * all return self, and whose has() defaults to false (nothing pre-registered).
     */
    private function buildContainerMock(): ContainerBuilder
    {
        $definition = $this->createMock(Definition::class);
        $definition->method('setPublic')->willReturn($definition);
        $definition->method('addArgument')->willReturn($definition);

        $mock = $this->createMock(ContainerBuilder::class);
        $mock->method('has')->willReturn(false);
        $mock->method('register')->willReturn($definition);

        return $mock;
    }

    // -------------------------------------------------------------------------
    // registerRouting()
    // -------------------------------------------------------------------------

    /**
     * Test that registerRouting() runs without error when given an empty
     * RouteCollection (smoke test for the full bootstrap path).
     */
    public function testRegisterRoutingRunsWithoutError(): void
    {
        // Should not throw.
        $this->services->registerRouting(new RouteCollection());
        $this->assertTrue(true);
    }

    /**
     * Test that registerRouting() is idempotent: the second call is a no-op,
     * so compile() is only triggered once across both calls.
     */
    public function testRegisterRoutingIsIdempotent(): void
    {
        $container = $this->buildContainerMock();
        $container->expects($this->once())->method('compile');

        $services = new Services($container);
        $services->registerRouting(new RouteCollection());
        $services->registerRouting(new RouteCollection()); // guarded — must be a no-op
    }

    /**
     * Test that registerFrameworkServices() does not re-register a service that
     * the container already has (the has() guard is respected).
     *
     * Uses a clean mock (not buildContainerMock()) so there is no pre-wired
     * method('has')->willReturn(false) stub that would override the true return
     * value configured here and cause register() to be called unexpectedly.
     */
    public function testRegisterRoutingSkipsServicesAlreadyInContainer(): void
    {
        $definition = $this->createMock(Definition::class);
        $definition->method('setPublic')->willReturn($definition);
        $definition->method('addArgument')->willReturn($definition);

        $container = $this->createMock(ContainerBuilder::class);
        $container->method('has')->willReturn(true);
        $container->expects($this->never())->method('register');

        (new Services($container))->registerRouting(new RouteCollection());
    }

    /**
     * Test that registerFrameworkServices() registers all three framework
     * services when none are present in the container yet.
     */
    public function testRegisterRoutingRegistersAllFrameworkServicesWhenContainerIsEmpty(): void
    {
        $container = $this->buildContainerMock();
        $container->method('has')->willReturn(false);
        // Three calls from registerFrameworkServices() (SymfonyRouteCollection,
        // RequestContext, router).  RouteControllerRegistrar adds none for an
        // empty RouteCollection.
        $container->expects($this->exactly(3))->method('register');

        (new Services($container))->registerRouting(new RouteCollection());
    }

    // -------------------------------------------------------------------------
    // getRouter()
    // -------------------------------------------------------------------------

    /**
     * Test that getRouter() returns whatever the container's get('router') yields.
     */
    public function testGetRouterReturnsRouterFromContainer(): void
    {
        $routerMock = $this->createMock(Router::class);

        $container = $this->buildContainerMock();
        // Framework services already registered so registerFrameworkServices() is a no-op.
        $container->method('has')->willReturn(true);
        $container->method('get')->with('router')->willReturn($routerMock);

        $result = (new Services($container))->getRouter();

        $this->assertSame($routerMock, $result);
    }

    /**
     * Test that getRouter() does not re-register framework services when they
     * were already registered by a prior registerRouting() call on the same instance.
     */
    public function testGetRouterDoesNotRepeatFrameworkRegistrationAfterRegisterRouting(): void
    {
        $routerMock = $this->createMock(Router::class);

        $container = $this->buildContainerMock();
        $container->method('has')->willReturn(false);
        $container->method('get')->with('router')->willReturn($routerMock);
        // register() is called exactly 3 times (by registerFrameworkServices() during
        // registerRouting()).  The subsequent getRouter() call must not add more.
        $container->expects($this->exactly(3))->method('register');

        $services = new Services($container);
        $services->registerRouting(new RouteCollection());
        $services->getRouter();
    }

    // -------------------------------------------------------------------------
    // jwtPayloadFactory()
    // -------------------------------------------------------------------------

    /**
     * Test that jwtPayloadFactory() returns a JwtPayloadFactory instance.
     */
    public function testJwtPayloadFactoryReturnsInstance(): void
    {
        $this->assertInstanceOf(JwtPayloadFactory::class, $this->services->jwtPayloadFactory());
    }

    /**
     * Test that jwtPayloadFactory() returns the same instance on repeated calls.
     */
    public function testJwtPayloadFactoryIsCached(): void
    {
        $this->assertSame($this->services->jwtPayloadFactory(), $this->services->jwtPayloadFactory());
    }

    /**
     * Test that jwtPayloadFactory() reads JWT_ISSUER and JWT_AUDIENCE from the
     * environment and injects them into the token payload it produces.
     */
    public function testJwtPayloadFactoryReadsIssuerAndAudienceFromEnv(): void
    {
        $payload = $this->services->jwtPayloadFactory()->make('test');

        $this->assertSame('test-issuer',   $payload['iss']);
        $this->assertSame('test-audience', $payload['aud']);
    }

    /**
     * Test that jwtPayloadFactory() falls back to 'dynlit-app' issuer and
     * 'dynlit-app-clients' audience when the env vars are absent.
     */
    public function testJwtPayloadFactoryUsesDefaultsWhenEnvVarsAbsent(): void
    {
        putenv('JWT_ISSUER');
        putenv('JWT_AUDIENCE');
        putenv('JWT_TTL_SECONDS');

        $payload = (new Services($this->buildContainerMock()))->jwtPayloadFactory()->make('test');

        $this->assertSame('dynlit-app',         $payload['iss']);
        $this->assertSame('dynlit-app-clients', $payload['aud']);
    }

    // -------------------------------------------------------------------------
    // jwtTokenService()
    // -------------------------------------------------------------------------

    /**
     * Test that jwtTokenService() returns a JwtTokenService instance.
     */
    public function testJwtTokenServiceReturnsInstance(): void
    {
        $this->assertInstanceOf(JwtTokenService::class, $this->services->jwtTokenService());
    }

    /**
     * Test that jwtTokenService() returns the same instance on repeated calls.
     */
    public function testJwtTokenServiceIsCached(): void
    {
        $this->assertSame($this->services->jwtTokenService(), $this->services->jwtTokenService());
    }

    /**
     * Test that jwtTokenService() throws a RuntimeException when JWT_SECRET
     * is empty, preventing accidental use of an unsigned secret.
     */
    public function testJwtTokenServiceThrowsWhenSecretIsEmpty(): void
    {
        putenv('JWT_SECRET=');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('JWT_SECRET is not configured.');

        (new Services($this->buildContainerMock()))->jwtTokenService();
    }

    // -------------------------------------------------------------------------
    // getJwtService()
    // -------------------------------------------------------------------------

    /**
     * Test that getJwtService() returns a JwtService instance.
     */
    public function testGetJwtServiceReturnsInstance(): void
    {
        $this->assertInstanceOf(JwtService::class, $this->services->getJwtService());
    }

    /**
     * Test that getJwtService() returns the same instance on repeated calls.
     */
    public function testGetJwtServiceIsCached(): void
    {
        $this->assertSame($this->services->getJwtService(), $this->services->getJwtService());
    }

    // -------------------------------------------------------------------------
    // getIdentitySchemeService()
    // -------------------------------------------------------------------------

    /**
     * Test that getIdentitySchemeService() returns an IdentitySchemeService instance.
     */
    public function testGetIdentitySchemeServiceReturnsInstance(): void
    {
        $this->assertInstanceOf(IdentitySchemeService::class, $this->services->getIdentitySchemeService());
    }

    /**
     * Test that getIdentitySchemeService() returns the same instance on repeated calls.
     */
    public function testGetIdentitySchemeServiceIsCached(): void
    {
        $this->assertSame(
            $this->services->getIdentitySchemeService(),
            $this->services->getIdentitySchemeService()
        );
    }

    // -------------------------------------------------------------------------
    // getIdentitySessionStore()
    // -------------------------------------------------------------------------

    /**
     * Test that getIdentitySessionStore() returns an IdentitySessionStore instance.
     */
    public function testGetIdentitySessionStoreReturnsInstance(): void
    {
        $this->assertInstanceOf(IdentitySessionStore::class, $this->services->getIdentitySessionStore());
    }

    /**
     * Test that getIdentitySessionStore() returns the same instance on repeated calls.
     */
    public function testGetIdentitySessionStoreIsCached(): void
    {
        $this->assertSame(
            $this->services->getIdentitySessionStore(),
            $this->services->getIdentitySessionStore()
        );
    }
}

