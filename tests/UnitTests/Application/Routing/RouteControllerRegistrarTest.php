<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing;

use Application\Routing\Instance\RouteCollection;
use Application\Routing\Instance\RouteInstance;
use Application\Routing\RouteControllerRegistrar;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\Routing\RouteCollection as SymfonyRouteCollection;

class RouteControllerRegistrarTest extends TestCase
{
    private const string TEST_URI_PATH = '/api/v1/test';
    private const string TEST_METHOD   = 'run';
    private const string TEST_VERB     = 'GET';

    private ContainerBuilder $containerMock;
    private Definition $definitionMock;
    private RouteControllerRegistrar $registrar;

    /** Holds the SymfonyRouteCollection captured from container->set() calls. */
    private ?SymfonyRouteCollection $capturedCollection = null;

    protected function setUp(): void
    {
        $this->containerMock  = $this->buildContainerMock();
        $this->registrar      = new RouteControllerRegistrar($this->containerMock);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a fully configured ContainerBuilder mock.
     * register() returns a Definition mock whose setPublic() returns itself.
     * set() captures the SymfonyRouteCollection for later assertions.
     */
    private function buildContainerMock(): ContainerBuilder
    {
        $this->definitionMock = $this->createMock(Definition::class);
        $this->definitionMock->method('setPublic')->willReturn($this->definitionMock);

        $mock = $this->createMock(ContainerBuilder::class);
        $mock->method('register')->willReturn($this->definitionMock);
        $mock->method('set')->willReturnCallback(
            function (string $id, mixed $value): void {
                if ($id === SymfonyRouteCollection::class) {
                    $this->capturedCollection = $value;
                }
            }
        );

        return $mock;
    }

    /**
     * Build a RouteCollection pre-loaded with one RouteInstance.
     */
    private function buildRouteCollection(
        string $controller = TestRegistrarController::class,
        string $method     = self::TEST_METHOD,
        string $verb       = self::TEST_VERB,
        array  $middleware = [],
        string $path       = self::TEST_URI_PATH,
    ): RouteCollection {
        $collection = new RouteCollection();
        $collection->add('route', new RouteInstance($path, $controller, $method, $verb, $middleware));
        return $collection;
    }

    /**
     * Compute the route name that registerRoutesAndControllers() will generate,
     * using the same formula as the production code.
     */
    private function expectedRouteName(
        string $controller = TestRegistrarController::class,
        string $method     = self::TEST_METHOD,
        string $verb       = self::TEST_VERB,
        string $path       = self::TEST_URI_PATH,
    ): string {
        return strtolower(
            str_replace(['\\', '/', '{', '}', ':'], '_', $controller . '_' . $method . '_' . $verb . '_' . $path)
        );
    }

    // -------------------------------------------------------------------------
    // getContainer()
    // -------------------------------------------------------------------------

    /**
     * Test that getContainer() returns the ContainerBuilder passed to the constructor.
     */
    public function testGetContainerReturnsConstructorArgument(): void
    {
        $this->assertSame($this->containerMock, $this->registrar->getContainer());
    }

    // -------------------------------------------------------------------------
    // Route registration — single route
    // -------------------------------------------------------------------------

    /**
     * Test that a single RouteInstance produces exactly one route in the
     * captured SymfonyRouteCollection.
     */
    public function testRegisterRoutesAndControllersAddsRouteToSymfonyCollection(): void
    {
        $this->registrar->registerRoutesAndControllers($this->buildRouteCollection());

        $this->assertCount(1, $this->capturedCollection->all());
    }

    /**
     * Test that the generated route name follows the
     * {class}_{method}_{verb}_{path} pattern (lowercased, separators replaced).
     */
    public function testRegisterRoutesAndControllersGeneratesCorrectRouteName(): void
    {
        $this->registrar->registerRoutesAndControllers($this->buildRouteCollection());

        $routeName = $this->expectedRouteName();
        $this->assertNotNull($this->capturedCollection->get($routeName));
    }

    /**
     * Test that the _controller default is rewritten from [Class, method] to
     * the "Class::method" string format that Symfony expects.
     */
    public function testRegisterRoutesAndControllersFormatsControllerAsStringHandle(): void
    {
        $this->registrar->registerRoutesAndControllers($this->buildRouteCollection());

        $route = $this->capturedCollection->get($this->expectedRouteName());
        $expected = TestRegistrarController::class . '::' . self::TEST_METHOD;
        $this->assertSame($expected, $route->getDefault('_controller'));
    }

    /**
     * Test that _middleware is added to the route defaults as an empty array
     * when no middleware is specified.
     */
    public function testRegisterRoutesAndControllersAddsEmptyMiddlewareByDefault(): void
    {
        $this->registrar->registerRoutesAndControllers($this->buildRouteCollection());

        $route = $this->capturedCollection->get($this->expectedRouteName());
        $this->assertSame([], $route->getDefault('_middleware'));
    }

    /**
     * Test that _middleware is correctly passed through to the route defaults
     * when middleware is provided on the RouteInstance.
     */
    public function testRegisterRoutesAndControllersAddsPassedMiddleware(): void
    {
        $middleware = ['AuthMiddleware', 'LogMiddleware'];

        $this->registrar->registerRoutesAndControllers(
            $this->buildRouteCollection(middleware: $middleware)
        );

        $route = $this->capturedCollection->get($this->expectedRouteName());
        $this->assertSame($middleware, $route->getDefault('_middleware'));
    }

    /**
     * Test that _verb is removed from the route defaults (it is promoted to the
     * route's HTTP method constraint instead).
     */
    public function testRegisterRoutesAndControllersRemovesVerbFromRouteDefaults(): void
    {
        $this->registrar->registerRoutesAndControllers($this->buildRouteCollection());

        $route = $this->capturedCollection->get($this->expectedRouteName());
        $this->assertNull($route->getDefault('_verb'));
    }

    /**
     * Test that the HTTP method constraint on the Symfony Route reflects the
     * verb declared on the RouteInstance.
     */
    public function testRegisterRoutesAndControllersSetsHttpMethod(): void
    {
        $this->registrar->registerRoutesAndControllers(
            $this->buildRouteCollection(verb: 'POST')
        );

        $routeName = $this->expectedRouteName(verb: 'POST');
        $this->assertSame(['POST'], $this->capturedCollection->get($routeName)->getMethods());
    }

    /**
     * Test that the Symfony Route's path matches the URI path of the RouteInstance.
     */
    public function testRegisterRoutesAndControllersPreservesRoutePath(): void
    {
        $this->registrar->registerRoutesAndControllers($this->buildRouteCollection());

        $route = $this->capturedCollection->get($this->expectedRouteName());
        $this->assertSame(self::TEST_URI_PATH, $route->getPath());
    }

    // -------------------------------------------------------------------------
    // Container interactions
    // -------------------------------------------------------------------------

    /**
     * Test that container->set() is called with SymfonyRouteCollection once
     * per registered route.
     */
    public function testRegisterRoutesAndControllersCallsSetOnContainerPerRoute(): void
    {
        $container = $this->buildContainerMock();
        $container->expects($this->once())
            ->method('set')
            ->with($this->identicalTo(SymfonyRouteCollection::class), $this->isInstanceOf(SymfonyRouteCollection::class));

        (new RouteControllerRegistrar($container))->registerRoutesAndControllers(
            $this->buildRouteCollection()
        );
    }

    /**
     * Test that the controller class is registered in the container with setPublic(true).
     *
     * Uses a clean mock (not buildContainerMock()) so there is no pre-wired
     * method('register') stub that would conflict with the expects() below and
     * cause the Definition mock to be bypassed.
     */
    public function testRegisterRoutesAndControllersRegistersControllerInContainer(): void
    {
        $definition = $this->createMock(Definition::class);
        $definition->expects($this->once())->method('setPublic')->with(true)->willReturn($definition);

        $container = $this->createMock(ContainerBuilder::class);
        $container->expects($this->once())
            ->method('register')
            ->with(TestRegistrarController::class, TestRegistrarController::class)
            ->willReturn($definition);

        (new RouteControllerRegistrar($container))->registerRoutesAndControllers(
            $this->buildRouteCollection()
        );
    }

    /**
     * Test that compile() is called exactly once after all routes are registered.
     */
    public function testRegisterRoutesAndControllersCompilesContainerExactlyOnce(): void
    {
        $container = $this->buildContainerMock();
        $container->expects($this->once())->method('compile');

        (new RouteControllerRegistrar($container))->registerRoutesAndControllers(
            $this->buildRouteCollection()
        );
    }

    // -------------------------------------------------------------------------
    // Empty collection
    // -------------------------------------------------------------------------

    /**
     * Test that compile() is still called when the RouteCollection is empty.
     */
    public function testRegisterRoutesAndControllersWithEmptyCollectionStillCompiles(): void
    {
        $container = $this->buildContainerMock();
        $container->expects($this->once())->method('compile');

        (new RouteControllerRegistrar($container))->registerRoutesAndControllers(
            new RouteCollection()
        );
    }

    /**
     * Test that container->set() is never called when the RouteCollection is empty.
     */
    public function testRegisterRoutesAndControllersWithEmptyCollectionNeverCallsSet(): void
    {
        $container = $this->buildContainerMock();
        $container->expects($this->never())->method('set');

        (new RouteControllerRegistrar($container))->registerRoutesAndControllers(
            new RouteCollection()
        );
    }

    // -------------------------------------------------------------------------
    // Multiple routes
    // -------------------------------------------------------------------------

    /**
     * Test that multiple RouteInstances each produce their own distinct entry
     * in the SymfonyRouteCollection.
     */
    public function testRegisterRoutesAndControllersAddsMultipleRoutes(): void
    {
        $collection = new RouteCollection();
        $collection->add('r1', new RouteInstance('/api/v1/first',  TestRegistrarController::class, 'first',  'GET'));
        $collection->add('r2', new RouteInstance('/api/v1/second', TestRegistrarController::class, 'second', 'POST'));

        $this->registrar->registerRoutesAndControllers($collection);

        $this->assertCount(2, $this->capturedCollection->all());

        $nameFirst  = $this->expectedRouteName(method: 'first',  verb: 'GET',  path: '/api/v1/first');
        $nameSecond = $this->expectedRouteName(method: 'second', verb: 'POST', path: '/api/v1/second');

        $this->assertNotNull($this->capturedCollection->get($nameFirst));
        $this->assertNotNull($this->capturedCollection->get($nameSecond));
    }
}

/**
 * Minimal controller stub used as the registered class in tests.
 * A real class name is required because ContainerBuilder::register() stores it.
 */
class TestRegistrarController
{
    public function run(): void {}
    public function first(): void {}
    public function second(): void {}
}

