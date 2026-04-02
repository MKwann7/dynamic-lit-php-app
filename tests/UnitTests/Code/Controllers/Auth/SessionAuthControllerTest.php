<?php

declare(strict_types=1);

namespace UnitTests\Code\Controllers\Auth;

use Application\ServiceManagement\Services;
use Code\Controllers\Auth\SessionAuthController;
use Code\Security\JwtTokenService;
use Code\Services\Auth\JwtService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SessionAuthControllerTest extends TestCase
{
    private const string JWT_SECRET = 'test-secret-key-long-enough-4-hs256';

    private Services $servicesMock;
    private JwtService $jwtService;

    protected function setUp(): void
    {
        $this->jwtService   = new JwtService(secret: self::JWT_SECRET);
        $this->servicesMock = $this->createMock(Services::class);
        $this->servicesMock->method('getJwtService')->willReturn($this->jwtService);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a signed user-type JWT that the real JwtService can validate.
     * JwtService::tryDecodeUserTokenFromBearer() returns non-null only when
     * the payload carries token_type = 'user'.
     */
    private function buildValidUserToken(): string
    {
        $tokenService = new JwtTokenService(secret: self::JWT_SECRET);

        return $tokenService->encode([
            'iss'        => 'dynlit-app',
            'aud'        => 'dynlit-app-clients',
            'iat'        => time(),
            'nbf'        => time(),
            'exp'        => time() + 3600,
            'sub'        => '1',
            'token_type' => JwtService::TOKEN_TYPE_USER,
        ]);
    }

    // -------------------------------------------------------------------------
    // URI constants
    // -------------------------------------------------------------------------

    /**
     * Test that CONTROLLER_URI holds the expected endpoint path.
     */
    public function testControllerUriConstant(): void
    {
        $this->assertSame('/api/v1/auth/session', SessionAuthController::CONTROLLER_URI);
    }

    /**
     * Test that URI_PARAMETERS is an empty array (no route placeholders).
     */
    public function testUriParametersIsEmptyArray(): void
    {
        $this->assertSame([], SessionAuthController::URI_PARAMETERS);
    }

    // -------------------------------------------------------------------------
    // run() — user already logged in
    // -------------------------------------------------------------------------

    /**
     * Test that run() returns HTTP 200 when a valid user JWT is present.
     */
    public function testRunReturnsHttpOkWhenUserAlreadyLoggedIn(): void
    {
        $request = new Request();
        $request->headers->set('Authorization', 'Bearer ' . $this->buildValidUserToken());

        $response = (new SessionAuthController($request, $this->servicesMock))->run();

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    /**
     * Test that run() returns a JsonResponse when a valid user JWT is present.
     */
    public function testRunReturnsJsonResponseWhenUserAlreadyLoggedIn(): void
    {
        $request = new Request();
        $request->headers->set('Authorization', 'Bearer ' . $this->buildValidUserToken());

        $response = (new SessionAuthController($request, $this->servicesMock))->run();

        $this->assertInstanceOf(JsonResponse::class, $response);
    }

    /**
     * Test that run() returns success=false when the user is already logged in.
     */
    public function testRunReturnsSuccessFalseWhenUserAlreadyLoggedIn(): void
    {
        $request = new Request();
        $request->headers->set('Authorization', 'Bearer ' . $this->buildValidUserToken());

        $response = (new SessionAuthController($request, $this->servicesMock))->run();
        $body     = json_decode($response->getContent(), true);

        $this->assertFalse($body['success']);
    }

    /**
     * Test that run() returns the expected "already logged in" message in the
     * data field when the user is already logged in.
     */
    public function testRunReturnsAlreadyLoggedInMessageWhenUserAlreadyLoggedIn(): void
    {
        $request = new Request();
        $request->headers->set('Authorization', 'Bearer ' . $this->buildValidUserToken());

        $response = (new SessionAuthController($request, $this->servicesMock))->run();
        $body     = json_decode($response->getContent(), true);

        $this->assertSame('User is already logged in', $body['data']);
    }

    // -------------------------------------------------------------------------
    // run() — session token creation fails
    //
    // When no user token is present, run() calls authServices()->makeSessionToken().
    // JwtAuthService is final readonly and depends on DB-backed repositories, so it
    // cannot be mocked or instantiated in unit tests.  Leaving getAuthService()
    // unstubbed on the Services mock causes PHP to throw a TypeError (the mock
    // returns null for the non-nullable JwtAuthService return type), which the
    // controller's catch (\Throwable) block catches and converts to HTTP 401.
    // -------------------------------------------------------------------------

    /**
     * Test that run() returns HTTP 401 when no user token is present and the
     * session service cannot be invoked.
     */
    public function testRunReturnsUnauthorizedWhenNotLoggedInAndServiceUnavailable(): void
    {
        $response = (new SessionAuthController(new Request(), $this->servicesMock))->run();

        $this->assertSame(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
    }

    /**
     * Test that run() returns a JsonResponse with success=false when the
     * session service cannot be invoked.
     */
    public function testRunReturnsSuccessFalseWhenServiceUnavailable(): void
    {
        $response = (new SessionAuthController(new Request(), $this->servicesMock))->run();
        $body     = json_decode($response->getContent(), true);

        $this->assertFalse($body['success']);
    }

    /**
     * Test that the failure response body includes a message key.
     */
    public function testRunResponseBodyIncludesMessageKeyOnFailure(): void
    {
        $response = (new SessionAuthController(new Request(), $this->servicesMock))->run();
        $body     = json_decode($response->getContent(), true);

        $this->assertArrayHasKey('message', $body);
    }
}

