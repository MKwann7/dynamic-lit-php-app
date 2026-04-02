<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing\Instance;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Routing\RouteCollection;
use Symfony\Component\Config\Loader\LoaderResolverInterface;
use Application\Routing\Instance\CustomRouteLoader;

class CustomRouteLoaderTest extends TestCase
{
    private CustomRouteLoader $loader;

    protected function setUp(): void
    {
        // Create an instance of the CustomRouteLoader for each test
        $this->loader = new CustomRouteLoader();
    }

    /**
     * Test the load() method to ensure it returns the resource passed to it.
     */
    public function testLoadReturnsResource(): void
    {
        $resource = new RouteCollection();

        // Call load() and assert it returns the same resource
        $result = $this->loader->load($resource);
        $this->assertSame($resource, $result);
    }

    /**
     * Test the supports() method to ensure it returns true for RouteCollection instances.
     */
    public function testSupportsReturnsTrueForRouteCollection(): void
    {
        $resource = new RouteCollection();

        // Assert that supports() returns true for RouteCollection instances
        $this->assertTrue($this->loader->supports($resource));
    }

    /**
     * Test the supports() method to ensure it returns false for non-RouteCollection instances.
     */
    public function testSupportsReturnsFalseForNonRouteCollection(): void
    {
        $resource = new \stdClass();

        // Assert that supports() returns false for non-RouteCollection instances
        $this->assertFalse($this->loader->supports($resource));
    }

    /**
     * Test the getResolver() method to ensure it returns null by default.
     */
    public function testGetResolverReturnsNullByDefault(): void
    {
        // Assert that getResolver() returns null by default
        $this->assertNull($this->loader->getResolver());
    }

    /**
     * Test the setResolver() and getResolver() methods to ensure they work correctly.
     */
    public function testSetAndGetResolver(): void
    {
        // Create a mock LoaderResolverInterface
        $mockResolver = $this->createMock(LoaderResolverInterface::class);

        // Set the resolver using setResolver()
        $this->loader->setResolver($mockResolver);

        // Assert that getResolver() returns the same mock resolver
        $this->assertSame($mockResolver, $this->loader->getResolver());
    }
}