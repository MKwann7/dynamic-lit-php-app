<?php

declare(strict_types=1);

namespace UnitTests\Application\Helper;

use Application\Helper\BaseController;
use Application\ServiceManagement\Services;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class BaseControllerTest extends TestCase
{
    private Services $servicesMock;

    protected function setUp(): void
    {
        $this->servicesMock = $this->createMock(Services::class);
    }

    /**
     * Test if the constructor assigns the request properly.
     */
    public function testConstructorAssignsRequest(): void
    {
        $request = new Request();

        $controller = new TestBaseController($request, $this->servicesMock);

        $this->assertSame($request, $controller->getRequest());
    }

    /**
     * Test getRequestJson() returns valid JSON.
     */
    public function testGetRequestJsonReturnsValidJson(): void
    {
        $content = json_encode(['key' => 'value']);
        $request = new Request([], [], [], [], [], [], $content);

        $controller = new TestBaseController($request, $this->servicesMock);

        $result = $controller->getRequestJson();

        $this->assertInstanceOf(\stdClass::class, $result);
        $this->assertEquals('value', $result->key);
    }

    /**
     * Test getRequestJson() returns null for invalid JSON.
     */
    public function testGetRequestJsonReturnsNullForInvalidJson(): void
    {
        $request = new Request([], [], [], [], [], [], 'invalid-json');

        $controller = new TestBaseController($request, $this->servicesMock);

        $result = $controller->getRequestJson();

        $this->assertNull($result);
    }

    /**
     * Test getRequestRaw() returns the raw request body string.
     */
    public function testGetRequestRawReturnsRawContent(): void
    {
        $content = 'raw-content-string';
        $request = new Request([], [], [], [], [], [], $content);

        $controller = new TestBaseController($request, $this->servicesMock);

        $this->assertSame($content, $controller->getRequestRaw());
    }

    /**
     * Test that the run method returns a proper Response object.
     */
    public function testRunReturnsResponse(): void
    {
        $request = new Request();

        $controller = new TestBaseController($request, $this->servicesMock);

        $response = $controller->run();

        $this->assertInstanceOf(Response::class, $response);
        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    /**
     * Test registerAuth() extracts a valid Bearer token from the Authorization header.
     */
    public function testRegisterAuthExtractsBearerToken(): void
    {
        $token = 'my.jwt.token';
        $request = new Request();
        $request->headers->set('Authorization', 'Bearer ' . $token);

        $controller = new TestBaseController($request, $this->servicesMock);

        $this->assertSame($token, $controller->exposeBearerToken());
    }

    /**
     * Test registerAuth() sets an empty bearer token when no Authorization header is present.
     */
    public function testRegisterAuthSetsEmptyTokenWhenNoHeader(): void
    {
        $request = new Request();

        $controller = new TestBaseController($request, $this->servicesMock);

        $this->assertSame('', $controller->exposeBearerToken());
    }

    /**
     * Test registerAuth() sets an empty bearer token for a malformed Authorization header.
     */
    public function testRegisterAuthSetsEmptyTokenForMalformedHeader(): void
    {
        $request = new Request();
        $request->headers->set('Authorization', 'NotBearer some-value');

        $controller = new TestBaseController($request, $this->servicesMock);

        $this->assertSame('', $controller->exposeBearerToken());
    }
}

class TestBaseController extends BaseController
{
    public function run(): Response
    {
        return new Response('OK', Response::HTTP_OK);
    }

    public function exposeBearerToken(): string
    {
        return $this->getBearerToken();
    }
}