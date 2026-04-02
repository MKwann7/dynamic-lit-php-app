<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing\Instance;

use PHPUnit\Framework\TestCase;
use Application\Routing\Instance\RouteCollection;
use Application\Routing\Instance\RouteInstance;

class RouteCollectionTest extends TestCase
{
    // Abstracted test data into constants for maintainability
    private const TEST_ROUTE_NAME_1 = 'route_1';
    private const TEST_ROUTE_NAME_2 = 'route_2';
    private const TEST_ROUTE_1 = ['path' => '/route1', 'controller' => 'TestController1'];
    private const TEST_ROUTE_2 = ['path' => '/route2', 'controller' => 'TestController2'];

    private RouteCollection $routeCollection;

    protected function setUp(): void
    {
        // Initialize the RouteCollection instance
        $this->routeCollection = new RouteCollection();
    }

    /**
     * Test that the add() method adds RouteInstance to the collection.
     */
    public function testAddRouteInstance(): void
    {
        // Create a RouteInstance
        $routeInstance = $this->createMock(RouteInstance::class);

        // Add RouteInstance to the collection
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance);

        // Assert that the route was added correctly
        $this->assertSame($routeInstance, $this->routeCollection->__get(self::TEST_ROUTE_NAME_1));
    }

    /**
     * Test that adding a non-RouteInstance throws an exception.
     */
    public function testAddInvalidTypeThrowsException(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage("This collection only accepts: Application\Routing\Instance\RouteInstancetype.");

        // Try to add a non-RouteInstance (invalid class)
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, new \stdClass());
    }

    /**
     * Test the load() method loads an array of RouteInstance objects.
     */
    public function testLoadAddsMultipleRouteInstances(): void
    {
        // Create RouteInstance mocks
        $routeInstance1 = $this->createMock(RouteInstance::class);
        $routeInstance2 = $this->createMock(RouteInstance::class);

        // Prepare data to load into the collection
        $routeInstances = [
            self::TEST_ROUTE_NAME_1 => $routeInstance1,
            self::TEST_ROUTE_NAME_2 => $routeInstance2,
        ];

        // Load the RouteInstance array
        $this->routeCollection->load($routeInstances);

        // Assert both routes are loaded correctly
        $this->assertSame($routeInstance1, $this->routeCollection->__get(self::TEST_ROUTE_NAME_1));
        $this->assertSame($routeInstance2, $this->routeCollection->__get(self::TEST_ROUTE_NAME_2));
    }

    /**
     * Test the removeByName() method removes the correct RouteInstance.
     */
    public function testRemoveByNameRemovesRouteInstance(): void
    {
        // Create a RouteInstance
        $routeInstance = $this->createMock(RouteInstance::class);

        // Add RouteInstance to the collection
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance);

        // Remove the route by name
        $this->routeCollection->removeByName(self::TEST_ROUTE_NAME_1);

        // Assert that the route no longer exists
        $this->assertNull($this->routeCollection->__get(self::TEST_ROUTE_NAME_1));
    }

    /**
     * Test the foreach() method applies a callback to all items.
     */
    public function testForeachAppliesCallback(): void
    {
        // Create RouteInstance mocks
        $routeInstance1 = $this->createMock(RouteInstance::class);
        $routeInstance2 = $this->createMock(RouteInstance::class);

        // Load RouteInstances into the collection
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance1);
        $this->routeCollection->add(self::TEST_ROUTE_NAME_2, $routeInstance2);

        // Use foreach() to apply a callback that returns the original instance
        $this->routeCollection->foreach(function ($route, $name) {
            $this->assertInstanceOf(RouteInstance::class, $route);
            return $route;  // Return the route to leave it unchanged
        });
    }

    /**
     * Test the toArray() method returns the correct array format.
     */
    public function testToArrayReturnsCorrectArray(): void
    {
        // Create RouteInstance mocks
        $routeInstance1 = $this->createConfiguredMock(RouteInstance::class, [
            'toArray' => self::TEST_ROUTE_1,
        ]);
        $routeInstance2 = $this->createConfiguredMock(RouteInstance::class, [
            'toArray' => self::TEST_ROUTE_2,
        ]);

        // Load RouteInstances into the collection
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance1);
        $this->routeCollection->add(self::TEST_ROUTE_NAME_2, $routeInstance2);

        // Convert to array and check the result
        $result = $this->routeCollection->toArray();
        $expected = [
            self::TEST_ROUTE_NAME_1 => self::TEST_ROUTE_1,
            self::TEST_ROUTE_NAME_2 => self::TEST_ROUTE_2,
        ];

        $this->assertEquals($expected, $result);
    }

    /**
     * Test the getChildClass() method returns the correct child class name.
     */
    public function testGetChildClassReturnsRouteInstance(): void
    {
        // Assert that getChildClass() returns the expected class name
        $this->assertEquals(RouteInstance::class, $this->routeCollection->getChildClass());
    }

    /**
     * Test that __set() delegates to add() and stores the RouteInstance.
     */
    public function testMagicSetAddsRouteInstance(): void
    {
        $routeInstance = $this->createMock(RouteInstance::class);

        $this->routeCollection->{self::TEST_ROUTE_NAME_1} = $routeInstance;

        $this->assertSame($routeInstance, $this->routeCollection->__get(self::TEST_ROUTE_NAME_1));
    }

    /**
     * Test that __isset() returns true for an existing route and false for a missing one.
     */
    public function testMagicIssetReturnsTrueForExistingRoute(): void
    {
        $routeInstance = $this->createMock(RouteInstance::class);
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance);

        $this->assertTrue(isset($this->routeCollection->{self::TEST_ROUTE_NAME_1}));
        $this->assertFalse(isset($this->routeCollection->{self::TEST_ROUTE_NAME_2}));
    }

    /**
     * Test that get() returns the correct RouteInstance and null for a missing key.
     */
    public function testGetReturnsRouteInstanceOrNull(): void
    {
        $routeInstance = $this->createMock(RouteInstance::class);
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance);

        $this->assertSame($routeInstance, $this->routeCollection->get(self::TEST_ROUTE_NAME_1));
        $this->assertNull($this->routeCollection->get(self::TEST_ROUTE_NAME_2));
    }

    /**
     * Test that load() with an empty array is a no-op and returns self.
     */
    public function testLoadWithEmptyArrayReturnsEarly(): void
    {
        $result = $this->routeCollection->load([]);

        $this->assertSame($this->routeCollection, $result);
        $this->assertNull($this->routeCollection->get(self::TEST_ROUTE_NAME_1));
    }

    /**
     * Test that foreach() on an empty collection is a no-op and returns self.
     */
    public function testForeachOnEmptyCollectionReturnsEarly(): void
    {
        $called = false;
        $result = $this->routeCollection->foreach(function () use (&$called) {
            $called = true;
        });

        $this->assertSame($this->routeCollection, $result);
        $this->assertFalse($called);
    }

    /**
     * Test that toJson() returns a valid JSON-encoded string of the collection.
     */
    public function testToJsonReturnsJsonString(): void
    {
        $routeInstance = $this->createConfiguredMock(RouteInstance::class, [
            'toArray' => self::TEST_ROUTE_1,
        ]);
        $this->routeCollection->add(self::TEST_ROUTE_NAME_1, $routeInstance);

        $json = $this->routeCollection->toJson();

        $this->assertIsString($json);
        $decoded = json_decode($json, true);
        $this->assertEquals([self::TEST_ROUTE_NAME_1 => self::TEST_ROUTE_1], $decoded);
    }
}

