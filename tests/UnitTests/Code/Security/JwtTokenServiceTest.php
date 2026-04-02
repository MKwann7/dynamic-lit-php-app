<?php

declare(strict_types=1);

namespace UnitTests\Code\Security;

use Code\Security\JwtTokenService;
use Firebase\JWT\ExpiredException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class JwtTokenServiceTest extends TestCase
{
    /** HS256 requires a minimum of 256 bits (32 bytes). */
    private const string SECRET       = 'unit-test-secret-key-hs256-32bytes';
    private const string WRONG_SECRET = 'wrong-secret-key-hs256-32-bytess!';

    private JwtTokenService $service;

    protected function setUp(): void
    {
        $this->service = new JwtTokenService(secret: self::SECRET);
    }

    private function buildPayload(array $overrides = []): array
    {
        return array_merge([
            'iss'  => 'test-issuer',
            'sub'  => '42',
            'data' => ['email' => 'test@example.com'],
            'exp'  => time() + 3600,
        ], $overrides);
    }

    // -------------------------------------------------------------------------
    // encode()
    // -------------------------------------------------------------------------

    /** Test that encode() returns a non-empty string. */
    public function testEncodeReturnsString(): void
    {
        $token = $this->service->encode($this->buildPayload());
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    /** Test that encode() produces a three-segment dot-separated JWT. */
    public function testEncodeReturnsWellFormedJwtStructure(): void
    {
        $this->assertCount(3, explode('.', $this->service->encode($this->buildPayload())));
    }

    /** Test that encode() is deterministic for the same payload. */
    public function testEncodeIsDeterministicForSamePayload(): void
    {
        $payload = $this->buildPayload();
        $this->assertSame($this->service->encode($payload), $this->service->encode($payload));
    }

    // -------------------------------------------------------------------------
    // decode()
    // -------------------------------------------------------------------------

    /** Test that decode() returns an array. */
    public function testDecodeReturnsArray(): void
    {
        $this->assertIsArray(
            $this->service->decode($this->service->encode($this->buildPayload()))
        );
    }

    /** Test that encode -> decode is a lossless round-trip. */
    public function testEncodeAndDecodeRoundtrip(): void
    {
        $payload = $this->buildPayload();
        $decoded = $this->service->decode($this->service->encode($payload));

        $this->assertSame($payload['iss'],           $decoded['iss']);
        $this->assertSame($payload['sub'],           $decoded['sub']);
        $this->assertSame($payload['exp'],           $decoded['exp']);
        $this->assertSame($payload['data']['email'], $decoded['data']['email']);
    }

    /** Test that decode() throws RuntimeException for an expired token. */
    public function testDecodeThrowsRuntimeExceptionForExpiredToken(): void
    {
        $this->expectException(RuntimeException::class);
        $this->service->decode(
            $this->service->encode($this->buildPayload(['exp' => time() - 10]))
        );
    }

    /** Test that the expired-token exception message is correct. */
    public function testDecodeExceptionMessageForExpiredToken(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('JWT token has expired.');
        $this->service->decode(
            $this->service->encode($this->buildPayload(['exp' => time() - 10]))
        );
    }

    /** Test that the expired-token RuntimeException wraps the original ExpiredException. */
    public function testDecodeWrapsExpiredExceptionAsPrevious(): void
    {
        try {
            $this->service->decode(
                $this->service->encode($this->buildPayload(['exp' => time() - 10]))
            );
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $e) {
            $this->assertInstanceOf(ExpiredException::class, $e->getPrevious());
        }
    }

    /** Test that decode() throws RuntimeException for a garbage token string. */
    public function testDecodeThrowsRuntimeExceptionForInvalidToken(): void
    {
        $this->expectException(RuntimeException::class);
        $this->service->decode('this.is.not.valid');
    }

    /** Test that the invalid-token exception message is correct. */
    public function testDecodeExceptionMessageForInvalidToken(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('JWT token is invalid.');
        $this->service->decode('not-a-jwt-at-all');
    }

    /** Test that the invalid-token RuntimeException wraps the original Throwable. */
    public function testDecodeWrapsOriginalThrowableAsPreviousForInvalidToken(): void
    {
        try {
            $this->service->decode('not-a-jwt-at-all');
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $e) {
            $this->assertNotNull($e->getPrevious());
        }
    }

    /** Test that decode() throws when the token was signed with a different secret. */
    public function testDecodeThrowsForTokenSignedWithDifferentSecret(): void
    {
        $token = (new JwtTokenService(secret: self::WRONG_SECRET))->encode($this->buildPayload());
        $this->expectException(RuntimeException::class);
        $this->service->decode($token);
    }

    /** Test that the RuntimeException code is always 0. */
    public function testDecodeExceptionCodeIsZero(): void
    {
        try {
            $this->service->decode('not-a-jwt');
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $e) {
            $this->assertSame(0, $e->getCode());
        }
    }

    // -------------------------------------------------------------------------
    // isValid()
    // -------------------------------------------------------------------------

    /** Test that isValid() returns true for a well-formed, unexpired token. */
    public function testIsValidReturnsTrueForValidToken(): void
    {
        $this->assertTrue(
            $this->service->isValid($this->service->encode($this->buildPayload()))
        );
    }

    /** Test that isValid() returns false for a completely invalid string. */
    public function testIsValidReturnsFalseForInvalidToken(): void
    {
        $this->assertFalse($this->service->isValid('not-a-jwt'));
    }

    /** Test that isValid() returns false for an expired token. */
    public function testIsValidReturnsFalseForExpiredToken(): void
    {
        $token = $this->service->encode($this->buildPayload(['exp' => time() - 10]));
        $this->assertFalse($this->service->isValid($token));
    }

    /** Test that isValid() returns false for a token signed with the wrong secret. */
    public function testIsValidReturnsFalseForTokenWithWrongSecret(): void
    {
        $token = (new JwtTokenService(secret: self::WRONG_SECRET))->encode($this->buildPayload());
        $this->assertFalse($this->service->isValid($token));
    }

    /** Test that isValid() returns false for an empty string. */
    public function testIsValidReturnsFalseForEmptyString(): void
    {
        $this->assertFalse($this->service->isValid(''));
    }
}
