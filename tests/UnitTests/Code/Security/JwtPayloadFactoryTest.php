<?php

declare(strict_types=1);

namespace UnitTests\Code\Security;

use Code\Security\JwtPayloadFactory;
use PHPUnit\Framework\TestCase;

class JwtPayloadFactoryTest extends TestCase
{
    private const string ISSUER      = 'test-issuer';
    private const string AUDIENCE    = 'test-audience';
    private const int    TTL_SECONDS = 3600;

    private JwtPayloadFactory $factory;

    protected function setUp(): void
    {
        $this->factory = new JwtPayloadFactory(
            issuer:     self::ISSUER,
            audience:   self::AUDIENCE,
            ttlSeconds: self::TTL_SECONDS,
        );
    }

    // -------------------------------------------------------------------------
    // Required keys
    // -------------------------------------------------------------------------

    /**
     * Test that make() always returns a payload containing all six standard keys.
     */
    public function testMakeReturnsArrayWithAllRequiredKeys(): void
    {
        $payload = $this->factory->make('test_type');

        foreach (['iss', 'aud', 'iat', 'nbf', 'exp', 'token_type'] as $key) {
            $this->assertArrayHasKey($key, $payload, "Expected key '$key' to be present.");
        }
    }

    // -------------------------------------------------------------------------
    // Claim values
    // -------------------------------------------------------------------------

    /**
     * Test that make() sets iss to the issuer passed to the constructor.
     */
    public function testMakeSetsCorrectIssuer(): void
    {
        $this->assertSame(self::ISSUER, $this->factory->make('test')['iss']);
    }

    /**
     * Test that make() sets aud to the audience passed to the constructor.
     */
    public function testMakeSetsCorrectAudience(): void
    {
        $this->assertSame(self::AUDIENCE, $this->factory->make('test')['aud']);
    }

    /**
     * Test that make() sets token_type to the value passed as the first argument.
     */
    public function testMakeSetsCorrectTokenType(): void
    {
        $this->assertSame('session', $this->factory->make('session')['token_type']);
        $this->assertSame('user',    $this->factory->make('user')['token_type']);
    }

    // -------------------------------------------------------------------------
    // Timestamps
    // -------------------------------------------------------------------------

    /**
     * Test that iat and nbf are set to (approximately) the current Unix timestamp.
     */
    public function testMakeSetsIatAndNbfToCurrentTime(): void
    {
        $before  = time();
        $payload = $this->factory->make('test');
        $after   = time();

        $this->assertGreaterThanOrEqual($before, $payload['iat']);
        $this->assertLessThanOrEqual($after,   $payload['iat']);
        $this->assertGreaterThanOrEqual($before, $payload['nbf']);
        $this->assertLessThanOrEqual($after,   $payload['nbf']);
    }

    /**
     * Test that exp equals iat plus the TTL configured in the constructor.
     * Comparing the difference rather than absolute values avoids clock drift.
     */
    public function testMakeSetsExpiryToIatPlusTtl(): void
    {
        $payload = $this->factory->make('test');

        $this->assertSame(self::TTL_SECONDS, $payload['exp'] - $payload['iat']);
    }

    /**
     * Test that different TTL values are reflected correctly in exp.
     */
    public function testMakeReflectsCustomTtlInExpiry(): void
    {
        $factory = new JwtPayloadFactory(
            issuer:     self::ISSUER,
            audience:   self::AUDIENCE,
            ttlSeconds: 7200,
        );

        $payload = $factory->make('test');

        $this->assertSame(7200, $payload['exp'] - $payload['iat']);
    }

    // -------------------------------------------------------------------------
    // No user claims
    // -------------------------------------------------------------------------

    /**
     * Test that make() does not include sub or data when userClaims is null
     * (the default).
     */
    public function testMakeWithNoUserClaimsDoesNotAddSubOrData(): void
    {
        $payload = $this->factory->make('session');

        $this->assertArrayNotHasKey('sub',  $payload);
        $this->assertArrayNotHasKey('data', $payload);
    }

    /**
     * Test that make() does not include sub or data when null is passed
     * explicitly.
     */
    public function testMakeWithExplicitNullClaimsDoesNotAddSubOrData(): void
    {
        $payload = $this->factory->make('session', null);

        $this->assertArrayNotHasKey('sub',  $payload);
        $this->assertArrayNotHasKey('data', $payload);
    }

    // -------------------------------------------------------------------------
    // With user claims
    // -------------------------------------------------------------------------

    /**
     * Test that make() adds sub and data to the payload when userClaims
     * is provided.
     */
    public function testMakeWithUserClaimsAddsSubAndData(): void
    {
        $claims  = ['user_id' => 42, 'email' => 'user@example.com'];
        $payload = $this->factory->make('user', $claims);

        $this->assertArrayHasKey('sub',  $payload);
        $this->assertArrayHasKey('data', $payload);
    }

    /**
     * Test that sub is set to the string-cast value of userClaims['user_id'].
     */
    public function testMakeSubIsStringifiedUserId(): void
    {
        $payload = $this->factory->make('user', ['user_id' => 99]);

        $this->assertSame('99', $payload['sub']);
    }

    /**
     * Test that sub is an empty string when userClaims does not contain user_id.
     */
    public function testMakeSubIsEmptyStringWhenUserIdIsMissing(): void
    {
        $payload = $this->factory->make('user', ['email' => 'user@example.com']);

        $this->assertSame('', $payload['sub']);
    }

    /**
     * Test that data is set to the full userClaims array.
     */
    public function testMakeDataContainsFullUserClaimsArray(): void
    {
        $claims  = ['user_id' => 1, 'email' => 'user@example.com', 'role' => 'admin'];
        $payload = $this->factory->make('user', $claims);

        $this->assertSame($claims, $payload['data']);
    }

    /**
     * Test that user claims do not affect the six standard keys.
     */
    public function testMakeWithUserClaimsPreservesAllStandardKeys(): void
    {
        $payload = $this->factory->make('user', ['user_id' => 1]);

        foreach (['iss', 'aud', 'iat', 'nbf', 'exp', 'token_type'] as $key) {
            $this->assertArrayHasKey($key, $payload, "Expected key '$key' to still be present.");
        }
    }
}

