<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing\Instance;

use PHPUnit\Framework\TestCase;
use Application\Routing\Instance\RouteInstance;
use Application\Routing\Parameters\RouteParameterCollection;

class RouteInstanceTest extends TestCase
{
    // Constants to hold test data for reuse
    private const TEST_URI_PATH = '/test/path';
    private const TEST_ROUTE_CLASS = 'TestController';
    private const TEST_ROUTE_METHOD = 'testMethod';
    private const TEST_HTTP_VERB = 'POST';

    private RouteInstance $routeInstance;

    protected function setUp(): void
    {
        // Initialize a RouteInstance object for each test
        $this->routeInstance = new RouteInstance(
            self::TEST_URI_PATH,
            self::TEST_ROUTE_CLASS,
            self::TEST_ROUTE_METHOD,
            self::TEST_HTTP_VERB
        );
    }

    /**
     * Test the constructor and ensure that all values are correctly set.
     */
    public function testConstructorSetsCorrectValues(): void
    {
        // Check that values are correctly set via the constructor
        $this->assertEquals(self::TEST_URI_PATH, $this->routeInstance->getUriPath());
        $this->assertInstanceOf(RouteParameterCollection::class, $this->routeInstance->getUriParameters());
    }

    /**
     * Test that the HTTP verb is correctly set in the constructor.
     */
    public function testHttpVerbIsCorrectlySetInConstructor(): void
    {
        // Generate the route array and check that the verb is correctly set
        $routeArray = $this->routeInstance->generateRouteArray();
        $this->assertEquals(self::TEST_HTTP_VERB, $routeArray[0]['_verb']);
    }

    /**
     * Test that setUriParameters() correctly sets the URI parameter collection.
     */
    public function testSetUriParameters(): void
    {
        $paramCollection = $this->createMock(RouteParameterCollection::class);

        // Set the URI parameters
        $this->routeInstance->setUriParameters($paramCollection);

        // Check that the URI parameters were correctly set
        $this->assertSame($paramCollection, $this->routeInstance->getUriParameters());
    }

    /**
     * Test the generateRouteArray() method to ensure it returns correct structure.
     */
    public function testGenerateRouteArray(): void
    {
        // Mock the RouteParameterCollection to return test data
        $paramCollection = $this->createMock(RouteParameterCollection::class);
        $paramCollection->method('getUriParameterArrays')
            ->willReturn(['param1' => 'value1']);
        $paramCollection->method('getUriRequirementArrays')
            ->willReturn(['param1' => '\d+']);

        // Set the mock URI parameters
        $this->routeInstance->setUriParameters($paramCollection);

        // Generate the route array
        [$defaults, $requirements] = $this->routeInstance->generateRouteArray();

        // Assert that defaults contain the correct controller and verb
        $this->assertEquals([self::TEST_ROUTE_CLASS, self::TEST_ROUTE_METHOD], $defaults['_controller']);
        $this->assertEquals(self::TEST_HTTP_VERB, $defaults['_verb']);

        // Assert that URI parameters are correctly merged
        $this->assertEquals('value1', $defaults['param1']);
        $this->assertEquals('\d+', $requirements['param1']);
    }

    /**
     * Test the toArray() method to ensure it returns a correctly structured array.
     */
    public function testToArrayReturnsCorrectStructure(): void
    {
        // Mock the RouteParameterCollection to return test data
        $paramCollection = $this->createMock(RouteParameterCollection::class);
        $paramCollection->method('getUriParameterArrays')
            ->willReturn(['param1' => 'value1']);
        $paramCollection->method('getUriRequirementArrays')
            ->willReturn(['param1' => '\d+']);

        // Set the mock URI parameters
        $this->routeInstance->setUriParameters($paramCollection);

        // Get the full array
        $result = $this->routeInstance->toArray();

        // Expected array structure
        $expected = [
            '_uri' => self::TEST_URI_PATH,
            '0' => [
                '_controller' => [self::TEST_ROUTE_CLASS, self::TEST_ROUTE_METHOD],
                '_verb' => self::TEST_HTTP_VERB,
                'param1' => 'value1'
            ],
            '1' => [
                'param1' => '\d+'
            ]
        ];

        // Assert that the result matches the expected structure
        $this->assertEquals($expected, $result);
    }

    /**
     * Test that the default HTTP verb is GET when not explicitly provided.
     */
    public function testDefaultHttpVerbIsGet(): void
    {
        $instance = new RouteInstance(
            self::TEST_URI_PATH,
            self::TEST_ROUTE_CLASS,
            self::TEST_ROUTE_METHOD
        );

        $routeArray = $instance->generateRouteArray();
        $this->assertEquals('GET', $routeArray[0]['_verb']);
    }

    /**
     * Test that uriParameters is auto-initialised to a RouteParameterCollection
     * when not provided to the constructor.
     */
    public function testUriParametersAutoInitialisedWhenNotProvided(): void
    {
        $instance = new RouteInstance(
            self::TEST_URI_PATH,
            self::TEST_ROUTE_CLASS,
            self::TEST_ROUTE_METHOD
        );

        $this->assertInstanceOf(RouteParameterCollection::class, $instance->getUriParameters());
    }

    /**
     * Test that a URI path ending with {trail} automatically registers the
     * wildcard trail parameter without the caller having to declare it.
     */
    public function testConstructorAutoRegistersTrailParameter(): void
    {
        $instance = new RouteInstance(
            '/some/path/{trail}',
            self::TEST_ROUTE_CLASS,
            self::TEST_ROUTE_METHOD
        );

        $this->assertNotNull($instance->getUriParameters()->get('trail'));
    }

    /**
     * Test that getMiddleware() returns an empty array by default.
     */
    public function testGetMiddlewareReturnsEmptyArrayByDefault(): void
    {
        $this->assertSame([], $this->routeInstance->getMiddleware());
    }

    /**
     * Test that getMiddleware() returns the middleware passed in the constructor.
     */
    public function testGetMiddlewareReturnsPassedMiddleware(): void
    {
        $middleware = ['AuthMiddleware', 'LogMiddleware'];

        $instance = new RouteInstance(
            self::TEST_URI_PATH,
            self::TEST_ROUTE_CLASS,
            self::TEST_ROUTE_METHOD,
            self::TEST_HTTP_VERB,
            $middleware
        );

        $this->assertSame($middleware, $instance->getMiddleware());
    }

    /**
     * Test that setUriParameters() returns self for fluent chaining.
     */
    public function testSetUriParametersReturnsSelf(): void
    {
        $paramCollection = $this->createMock(RouteParameterCollection::class);

        $result = $this->routeInstance->setUriParameters($paramCollection);

        $this->assertSame($this->routeInstance, $result);
    }
}

