<?php

declare(strict_types=1);

namespace UnitTests\Code\Controllers\Auth;

use Application\ServiceManagement\Services;
use Code\Controllers\Auth\UserAuthController;
use Code\Services\Auth\JwtService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class UserAuthControllerTest extends TestCase
{
    private Services $servicesMock;

    protected function setUp(): void
    {
        // getJwtService() is called by registerAuth() indirectly via the
        // constructor; stub it with a real JwtService so bearer-token
        // extraction works without issues.
        $jwtService = new JwtService(secret: 'test-secret-key');

        $this->servicesMock = $this->createMock(Services::class);
        $this->servicesMock->method('getJwtService')->willReturn($jwtService);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a Request whose body is a JSON-encoded associative array.
     */
    private function buildJsonRequest(array $data): Request
    {
        return new Request(
            server:  ['CONTENT_TYPE' => 'application/json'],
            content: json_encode($data, JSON_THROW_ON_ERROR),
        );
    }

    // -------------------------------------------------------------------------
    // URI constants
    // -------------------------------------------------------------------------

    /**
     * Test that CONTROLLER_URI holds the expected endpoint path.
     */
    public function testControllerUriConstant(): void
    {
        $this->assertSame('/api/v1/auth/login', UserAuthController::CONTROLLER_URI);
    }

    /**
     * Test that URI_PARAMETERS is an empty array (no route placeholders).
     */
    public function testUriParametersIsEmptyArray(): void
    {
        $this->assertSame([], UserAuthController::URI_PARAMETERS);
    }

    // -------------------------------------------------------------------------
    // run() — missing / empty credentials → HTTP 400
    // -------------------------------------------------------------------------

    /**
     * Test that run() returns HTTP 400 when both email/username and password
     * are absent from the request body.
     */
    public function testRunReturnsBadRequestWhenNoCredentialsSupplied(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest([]),
            $this->servicesMock
        ))->run();

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    /**
     * Test that run() returns HTTP 400 when the email field is an empty string.
     */
    public function testRunReturnsBadRequestWhenEmailIsEmptyString(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['email' => '', 'password' => 'secret']),
            $this->servicesMock
        ))->run();

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    /**
     * Test that run() returns HTTP 400 when the username field is an empty string.
     */
    public function testRunReturnsBadRequestWhenUsernameIsEmptyString(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['username' => '', 'password' => 'secret']),
            $this->servicesMock
        ))->run();

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    /**
     * Test that run() returns HTTP 400 when the password field is absent.
     */
    public function testRunReturnsBadRequestWhenPasswordIsMissing(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['email' => 'user@example.com']),
            $this->servicesMock
        ))->run();

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    /**
     * Test that run() returns HTTP 400 when the password field is an empty string.
     */
    public function testRunReturnsBadRequestWhenPasswordIsEmptyString(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['email' => 'user@example.com', 'password' => '']),
            $this->servicesMock
        ))->run();

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    /**
     * Test that the 400 response is a JsonResponse with success=false.
     */
    public function testRunBadRequestBodyContainsSuccessFalse(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest([]),
            $this->servicesMock
        ))->run();

        $this->assertInstanceOf(JsonResponse::class, $response);
        $body = json_decode($response->getContent(), true);
        $this->assertFalse($body['success']);
    }

    /**
     * Test that the 400 response carries the expected human-readable message.
     */
    public function testRunBadRequestBodyContainsExpectedMessage(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest([]),
            $this->servicesMock
        ))->run();

        $body = json_decode($response->getContent(), true);
        $this->assertSame('username and password are required.', $body['message']);
    }

    /**
     * Test that a username field is accepted as an alternative to email when
     * both username and password are present (does not return 400).
     */
    public function testRunAcceptsUsernameAsAlternativeToEmail(): void
    {
        // This will proceed past the 400 guard and attempt authentication
        // (which will fail at the service layer), but the point is that
        // HTTP 400 is NOT returned here.
        $response = (new UserAuthController(
            $this->buildJsonRequest(['username' => 'testuser', 'password' => 'secret']),
            $this->servicesMock
        ))->run();

        $this->assertNotEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    // -------------------------------------------------------------------------
    // run() — authentication fails → HTTP 401
    //
    // When valid-looking credentials are supplied, run() calls
    // authServices()->authenticateUser().  JwtAuthService is final readonly
    // and depends on DB-backed repositories, so it cannot be mocked or
    // instantiated in unit tests.  Leaving getAuthService() unstubbed causes
    // PHP to throw a TypeError (the mock returns null for the non-nullable
    // JwtAuthService return type), which the controller's catch (\Throwable)
    // block converts into an HTTP 401 response.
    // -------------------------------------------------------------------------

    /**
     * Test that run() returns HTTP 401 when credentials are provided but the
     * auth service is unavailable.
     */
    public function testRunReturnsUnauthorizedWhenAuthServiceUnavailable(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['email' => 'user@example.com', 'password' => 'secret']),
            $this->servicesMock
        ))->run();

        $this->assertSame(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
    }

    /**
     * Test that the 401 response body contains success=false.
     */
    public function testRunUnauthorizedBodyContainsSuccessFalse(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['email' => 'user@example.com', 'password' => 'secret']),
            $this->servicesMock
        ))->run();

        $body = json_decode($response->getContent(), true);
        $this->assertFalse($body['success']);
    }

    /**
     * Test that the 401 response body includes a message key.
     */
    public function testRunUnauthorizedBodyIncludesMessageKey(): void
    {
        $response = (new UserAuthController(
            $this->buildJsonRequest(['email' => 'user@example.com', 'password' => 'secret']),
            $this->servicesMock
        ))->run();

        $body = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('message', $body);
    }
}

