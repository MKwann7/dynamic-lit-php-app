<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing\Request;

use Application\Routing\Request\HttpRequest;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

class HttpRequestTest extends TestCase
{
    /** Snapshot of $_SERVER taken before each test. */
    private array $originalServer;

    /** Snapshot of $_GET taken before each test. */
    private array $originalGet;

    protected function setUp(): void
    {
        $this->originalServer = $_SERVER;
        $this->originalGet    = $_GET;
    }

    protected function tearDown(): void
    {
        $_SERVER = $this->originalServer;
        $_GET    = $this->originalGet;
    }

    // -------------------------------------------------------------------------
    // Return type
    // -------------------------------------------------------------------------

    /**
     * Test that getHttpRequest() returns a Symfony Request instance.
     */
    public function testGetHttpRequestReturnsRequestInstance(): void
    {
        $httpRequest = new HttpRequest();

        $this->assertInstanceOf(Request::class, $httpRequest->getHttpRequest());
    }

    /**
     * Test that each call to getHttpRequest() returns a new Request instance
     * rather than a cached / shared one.
     */
    public function testGetHttpRequestReturnsNewInstanceOnEachCall(): void
    {
        $httpRequest = new HttpRequest();

        $first  = $httpRequest->getHttpRequest();
        $second = $httpRequest->getHttpRequest();

        $this->assertNotSame($first, $second);
    }

    // -------------------------------------------------------------------------
    // Superglobal reflection — query string ($_GET)
    // -------------------------------------------------------------------------

    /**
     * Test that the returned Request reflects $_GET query parameters.
     */
    public function testGetHttpRequestReflectsQueryParameters(): void
    {
        $_GET = ['page' => '2', 'search' => 'hello'];

        $request = (new HttpRequest())->getHttpRequest();

        $this->assertSame('2',     $request->query->get('page'));
        $this->assertSame('hello', $request->query->get('search'));
    }

    /**
     * Test that a query parameter absent from $_GET returns null.
     */
    public function testGetHttpRequestReturnsNullForMissingQueryParameter(): void
    {
        $_GET = [];

        $request = (new HttpRequest())->getHttpRequest();

        $this->assertNull($request->query->get('missing_key'));
    }

    // -------------------------------------------------------------------------
    // Superglobal reflection — request method ($_SERVER)
    // -------------------------------------------------------------------------

    /**
     * Test that the returned Request reflects the HTTP method from $_SERVER.
     */
    public function testGetHttpRequestReflectsRequestMethod(): void
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';

        $request = (new HttpRequest())->getHttpRequest();

        $this->assertSame('POST', $request->getMethod());
    }

    /**
     * Test that the returned Request defaults to GET when REQUEST_METHOD is
     * not present in $_SERVER.
     */
    public function testGetHttpRequestDefaultsToGetMethodWhenUnset(): void
    {
        unset($_SERVER['REQUEST_METHOD']);

        $request = (new HttpRequest())->getHttpRequest();

        $this->assertSame('GET', $request->getMethod());
    }

    // -------------------------------------------------------------------------
    // Superglobal reflection — request URI ($_SERVER)
    // -------------------------------------------------------------------------

    /**
     * Test that the returned Request reflects REQUEST_URI from $_SERVER.
     */
    public function testGetHttpRequestReflectsRequestUri(): void
    {
        $_SERVER['REQUEST_URI'] = '/api/v1/test?foo=bar';

        $request = (new HttpRequest())->getHttpRequest();

        $this->assertSame('/api/v1/test?foo=bar', $request->getRequestUri());
    }
}

