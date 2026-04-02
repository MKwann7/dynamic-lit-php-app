<?php

declare(strict_types=1);

namespace UnitTests\Code\Database;

use Code\Database\DatabaseConnection;
use Code\Database\DatabaseConnectionRegistry;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;
use RuntimeException;

class DatabaseConnectionRegistryTest extends TestCase
{
    /**
     * Env var keys touched by these tests — snapshotted and restored around
     * every test so no test contaminates the environment for any other.
     */
    private const array ENV_KEYS = [
        'DB_HOST',
        'DB_PORT',
        'DB_DEFAULT_DATABASE',
        'DB_OTHER_DATABASE',
        'DB_CUSTOM_DATABASE',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_CHARSET',
    ];

    private array $originalEnv = [];

    protected function setUp(): void
    {
        foreach (self::ENV_KEYS as $key) {
            $this->originalEnv[$key] = getenv($key);
        }

        // Baseline of required env vars for the default connection name.
        putenv('DB_HOST=127.0.0.1');
        putenv('DB_USERNAME=test_user');
        putenv('DB_DEFAULT_DATABASE=default_test_db');
        putenv('DB_OTHER_DATABASE=other_test_db');
        putenv('DB_PASSWORD=');

        $this->resetRegistry();
    }

    protected function tearDown(): void
    {
        // Always wipe the static cache so this class leaves no side-effects
        // for subsequent test classes.
        $this->resetRegistry();

        foreach (self::ENV_KEYS as $key) {
            $original = $this->originalEnv[$key];
            putenv($original === false ? $key : "$key=$original");
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Clear the private static $connections array via Reflection.
     *
     * Because $connections is static, it persists for the lifetime of the
     * process. Without this reset, a connection cached by one test would be
     * silently returned by the next, hiding bugs and making tests order-dependent.
     *
     * PHP 8.1+ makes all properties accessible through Reflection without
     * calling setAccessible(); this project requires PHP >=8.3 so no
     * setAccessible() call is needed.
     */
    private function resetRegistry(): void
    {
        $prop = new ReflectionProperty(DatabaseConnectionRegistry::class, 'connections');
        $prop->setValue(null, []);
    }

    // -------------------------------------------------------------------------
    // get() — return type
    // -------------------------------------------------------------------------

    /**
     * Test that get() returns a DatabaseConnection instance.
     */
    public function testGetReturnsDatabaseConnectionInstance(): void
    {
        $this->assertInstanceOf(
            DatabaseConnection::class,
            DatabaseConnectionRegistry::get('default')
        );
    }

    // -------------------------------------------------------------------------
    // get() — caching
    // -------------------------------------------------------------------------

    /**
     * Test that get() returns the exact same instance on a second call for the
     * same connection name (lazy-init cache hit).
     */
    public function testGetReturnsSameInstanceOnCacheHit(): void
    {
        $first  = DatabaseConnectionRegistry::get('default');
        $second = DatabaseConnectionRegistry::get('default');

        $this->assertSame($first, $second);
    }

    /**
     * Test that a cached connection is served without calling fromEnvironment()
     * again — proven by removing a required env var after the first call and
     * verifying the second call does not throw.
     */
    public function testGetServesCachedInstanceWithoutCallingFromEnvironmentAgain(): void
    {
        // Warm the cache with a valid connection.
        DatabaseConnectionRegistry::get('default');

        // Remove a required env var that fromEnvironment() would need.
        putenv('DB_HOST');

        // A second call must be served from cache — no fromEnvironment() call,
        // therefore no RuntimeException for the missing env var.
        $this->assertInstanceOf(
            DatabaseConnection::class,
            DatabaseConnectionRegistry::get('default')
        );
    }

    // -------------------------------------------------------------------------
    // get() — different names
    // -------------------------------------------------------------------------

    /**
     * Test that get() returns distinct instances for different connection names.
     */
    public function testGetReturnsDifferentInstancesForDifferentNames(): void
    {
        $default = DatabaseConnectionRegistry::get('default');
        $other   = DatabaseConnectionRegistry::get('other');

        $this->assertNotSame($default, $other);
    }

    // -------------------------------------------------------------------------
    // get() — connection name forwarded to fromEnvironment()
    // -------------------------------------------------------------------------

    /**
     * Test that get() forwards the connection name to DatabaseConnection::fromEnvironment()
     * so the correct env-var prefix is used.
     *
     * Only DB_CUSTOM_DATABASE is set (not DB_DEFAULT_DATABASE). If get() used
     * 'default' instead of 'custom', fromEnvironment() would throw because
     * DB_DEFAULT_DATABASE is absent.
     */
    public function testGetForwardsConnectionNameToFromEnvironment(): void
    {
        putenv('DB_CUSTOM_DATABASE=custom_test_db');
        putenv('DB_DEFAULT_DATABASE'); // remove to ensure 'default' would fail

        $connection = DatabaseConnectionRegistry::get('custom');

        $this->assertInstanceOf(DatabaseConnection::class, $connection);
    }

    // -------------------------------------------------------------------------
    // get() — error propagation
    // -------------------------------------------------------------------------

    /**
     * Test that get() propagates the RuntimeException thrown by
     * fromEnvironment() when a required env var is missing.
     */
    public function testGetThrowsWhenRequiredEnvVarIsMissing(): void
    {
        putenv('DB_HOST'); // remove required var

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Missing required environment variable: DB_HOST');

        DatabaseConnectionRegistry::get('default');
    }

    /**
     * Test that a failed get() call does not populate the cache — a subsequent
     * call after the env var is restored must succeed and produce a fresh instance.
     */
    public function testFailedGetDoesNotPopulateCache(): void
    {
        putenv('DB_HOST'); // cause the first call to fail

        try {
            DatabaseConnectionRegistry::get('default');
        } catch (RuntimeException) {
            // expected
        }

        // Restore the env var and try again — must succeed with a fresh instance.
        putenv('DB_HOST=127.0.0.1');

        $this->assertInstanceOf(
            DatabaseConnection::class,
            DatabaseConnectionRegistry::get('default')
        );
    }
}

