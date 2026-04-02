<?php

declare(strict_types=1);

namespace UnitTests\Code\Controllers\Auth;

use Application\ServiceManagement\Services;
use Code\Controllers\Auth\AuthController;
use Code\Services\Auth\JwtService;
use Code\Services\View\HtmlPageRenderer;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthControllerTest extends TestCase
{
    private string $tempDir;
    private Services $servicesMock;

    protected function setUp(): void
    {
        // Build a throw-away template directory so returnBasePage() can render
        // without needing the real application view path (ROOT constant).
        $this->tempDir = sys_get_temp_dir() . '/auth_ctrl_test_' . uniqid('', true);
        mkdir($this->tempDir . '/Shared/Views', 0777, true);
        file_put_contents(
            $this->tempDir . '/Shared/Views/core-shell.html.php',
            '<html><body>test</body></html>'
        );

        // JwtService is final readonly but can be instantiated with a test
        // secret.  A request without an Authorization header yields an empty
        // bearer token, so tryDecodeUserTokenFromBearer('') returns null —
        // no live JWT verification is required.
        $jwtService = new JwtService(secret: 'test-secret');
        $renderer   = new HtmlPageRenderer($this->tempDir);

        $this->servicesMock = $this->createMock(Services::class);
        $this->servicesMock->method('getJwtService')->willReturn($jwtService);
        $this->servicesMock->method('htmlPageRenderer')->willReturn($renderer);
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->tempDir);
    }

    private function removeDirectory(string $dir): void
    {
        foreach (glob($dir . '/*') ?: [] as $entry) {
            is_dir($entry) ? $this->removeDirectory($entry) : unlink($entry);
        }
        rmdir($dir);
    }

    // -------------------------------------------------------------------------
    // URI constants
    // -------------------------------------------------------------------------

    /**
     * Test that every CONTROLLER_URI_* constant holds the expected path pattern.
     */
    public function testUriConstantsHaveCorrectValues(): void
    {
        $this->assertSame('/login{trail}',          AuthController::CONTROLLER_URI_LOGIN);
        $this->assertSame('/account{trail}',         AuthController::CONTROLLER_URI_ACCOUNT);
        $this->assertSame('/create-account{trail}',  AuthController::CONTROLLER_URI_CREATE_ACCOUNT);
        $this->assertSame('/forgot-password{trail}', AuthController::CONTROLLER_URI_PASSWORD_RESET);
        $this->assertSame('/administrator{trail}',   AuthController::CONTROLLER_URI_ADMIN);
        $this->assertSame('/persona{trail}',         AuthController::CONTROLLER_URI_PERSONA);
        $this->assertSame('/group{trail}',           AuthController::CONTROLLER_URI_GROUP);
    }

    /**
     * Test that every URI constant ends with the {trail} wildcard.
     */
    public function testAllUriConstantsEndWithTrailParameter(): void
    {
        $constants = [
            AuthController::CONTROLLER_URI_LOGIN,
            AuthController::CONTROLLER_URI_ACCOUNT,
            AuthController::CONTROLLER_URI_CREATE_ACCOUNT,
            AuthController::CONTROLLER_URI_PASSWORD_RESET,
            AuthController::CONTROLLER_URI_ADMIN,
            AuthController::CONTROLLER_URI_PERSONA,
            AuthController::CONTROLLER_URI_GROUP,
        ];

        foreach ($constants as $uri) {
            $this->assertStringEndsWith('{trail}', $uri, "Expected URI '$uri' to end with '{trail}'");
        }
    }

    // -------------------------------------------------------------------------
    // run()
    // -------------------------------------------------------------------------

    /**
     * Test that run() returns an HTTP 200 response.
     */
    public function testRunReturnsHttpOkResponse(): void
    {
        $controller = new AuthController(new Request(), $this->servicesMock);

        $response = $controller->run();

        $this->assertInstanceOf(Response::class, $response);
        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
    }

    /**
     * Test that run() sets the Content-Type to text/html.
     */
    public function testRunSetsHtmlContentType(): void
    {
        $controller = new AuthController(new Request(), $this->servicesMock);

        $response = $controller->run();

        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type') ?? '');
    }

    /**
     * Test that run() returns a non-empty response body (the rendered template).
     */
    public function testRunReturnsNonEmptyBody(): void
    {
        $controller = new AuthController(new Request(), $this->servicesMock);

        $response = $controller->run();

        $this->assertNotEmpty($response->getContent());
    }
}

