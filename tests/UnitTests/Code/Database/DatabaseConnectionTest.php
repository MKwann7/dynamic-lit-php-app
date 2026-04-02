<?php

declare(strict_types=1);

namespace UnitTests\Code\Database;

use Code\Database\DatabaseConnection;
use PDOException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class DatabaseConnectionTest extends TestCase
{
    /**
     * Env var keys touched by these tests — snapshotted in setUp and restored
     * in tearDown so no test pollutes the environment for any other.
     */
    private const array ENV_KEYS = [
        'DB_HOST',
        'DB_PORT',
        'DB_DEFAULT_DATABASE',
        'DB_CUSTOM_DATABASE',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DB_CHARSET',
    ];

    private array $originalEnv = [];

    /**
     * Port that is virtually guaranteed to have nothing listening, so that
     * PDO throws a PDOException (connection refused) immediately — no timeout,
     * no DNS lookup.
     */
    private const int REFUSED_PORT = 59999;

    protected function setUp(): void
    {
        foreach (self::ENV_KEYS as $key) {
            $this->originalEnv[$key] = getenv($key);
        }

        // Provide safe defaults for the required vars so each test starts from
        // a known, fully-configured baseline and only clears what it needs to.
        putenv('DB_HOST=127.0.0.1');
        putenv('DB_PORT=' . self::REFUSED_PORT);
        putenv('DB_DEFAULT_DATABASE=unit_test_db');
        putenv('DB_USERNAME=test_user');
        putenv('DB_PASSWORD=');
    }

    protected function tearDown(): void
    {
        foreach (self::ENV_KEYS as $key) {
            $original = $this->originalEnv[$key];
            putenv($original === false ? $key : "$key=$original");
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a DatabaseConnection whose getPdo() will immediately fail with a
     * connection-refused error, giving us full control over host / database
     * values without needing a live server.
     */
    private function buildRefusedConnection(
        string $host     = '127.0.0.1',
        string $database = 'unit_test_db',
        string $username = 'test_user',
        string $password = '',
    ): DatabaseConnection {
        return new DatabaseConnection(
            host:     $host,
            port:     self::REFUSED_PORT,
            database: $database,
            username: $username,
            password: $password,
        );
    }

    // -------------------------------------------------------------------------
    // fromEnvironment() — return type
    // -------------------------------------------------------------------------

    /**
     * Test that fromEnvironment() returns a DatabaseConnection instance.
     */
    public function testFromEnvironmentReturnsDatabaseConnectionInstance(): void
    {
        $this->assertInstanceOf(DatabaseConnection::class, DatabaseConnection::fromEnvironment());
    }

    // -------------------------------------------------------------------------
    // fromEnvironment() — connection-name prefix
    // -------------------------------------------------------------------------

    /**
     * Test that fromEnvironment() with the default connection name reads the
     * DB_DEFAULT_DATABASE env var (prefix = DB_DEFAULT_).
     */
    public function testFromEnvironmentUsesDefaultConnectionNamePrefix(): void
    {
        putenv('DB_DEFAULT_DATABASE=default_db_name');

        // We verify the env var was actually consumed by catching the getPdo()
        // RuntimeException whose message contains the database name.
        $message = $this->captureGetPdoExceptionMessage(DatabaseConnection::fromEnvironment());

        $this->assertStringContainsString('default_db_name', $message);
    }

    /**
     * Test that fromEnvironment() uppercases the connection name when
     * deriving the database env-var key
     * (e.g. 'custom' → DB_CUSTOM_DATABASE).
     */
    public function testFromEnvironmentUppercasesConnectionNameForPrefix(): void
    {
        putenv('DB_CUSTOM_DATABASE=custom_db_name');

        $message = $this->captureGetPdoExceptionMessage(
            DatabaseConnection::fromEnvironment('custom')
        );

        $this->assertStringContainsString('custom_db_name', $message);
    }

    /**
     * Test that fromEnvironment() passes DB_HOST through to the connection so
     * it appears in the getPdo() failure message.
     */
    public function testFromEnvironmentPassesHostThroughToConnection(): void
    {
        putenv('DB_HOST=from-env-host');

        $message = $this->captureGetPdoExceptionMessage(DatabaseConnection::fromEnvironment());

        $this->assertStringContainsString('from-env-host', $message);
    }

    // -------------------------------------------------------------------------
    // fromEnvironment() — optional env var defaults
    // -------------------------------------------------------------------------

    /**
     * Test that fromEnvironment() does not throw when DB_PORT is absent,
     * falling back to the default port (3306).
     */
    public function testFromEnvironmentDefaultsPortWhenDbPortAbsent(): void
    {
        putenv('DB_PORT'); // remove the var entirely

        $this->assertInstanceOf(DatabaseConnection::class, DatabaseConnection::fromEnvironment());
    }

    /**
     * Test that fromEnvironment() does not throw when DB_PASSWORD is absent,
     * falling back to an empty string.
     */
    public function testFromEnvironmentDefaultsPasswordWhenDbPasswordAbsent(): void
    {
        putenv('DB_PASSWORD'); // remove the var entirely

        $this->assertInstanceOf(DatabaseConnection::class, DatabaseConnection::fromEnvironment());
    }

    /**
     * Test that fromEnvironment() does not throw when DB_CHARSET is absent,
     * falling back to 'utf8mb4'.
     */
    public function testFromEnvironmentDefaultsCharsetWhenDbCharsetAbsent(): void
    {
        putenv('DB_CHARSET'); // remove the var entirely

        $this->assertInstanceOf(DatabaseConnection::class, DatabaseConnection::fromEnvironment());
    }

    // -------------------------------------------------------------------------
    // fromEnvironment() — required env var errors (getEnvOrFail)
    // -------------------------------------------------------------------------

    /**
     * Test that fromEnvironment() throws a RuntimeException when DB_HOST is absent.
     */
    public function testFromEnvironmentThrowsWhenDbHostIsAbsent(): void
    {
        putenv('DB_HOST');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Missing required environment variable: DB_HOST');

        DatabaseConnection::fromEnvironment();
    }

    /**
     * Test that fromEnvironment() treats an empty DB_HOST the same as absent.
     */
    public function testFromEnvironmentThrowsWhenDbHostIsEmptyString(): void
    {
        putenv('DB_HOST=');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Missing required environment variable: DB_HOST');

        DatabaseConnection::fromEnvironment();
    }

    /**
     * Test that fromEnvironment() throws a RuntimeException when the database
     * env var (DB_DEFAULT_DATABASE for the default connection) is absent.
     */
    public function testFromEnvironmentThrowsWhenDatabaseEnvVarIsAbsent(): void
    {
        putenv('DB_DEFAULT_DATABASE');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Missing required environment variable: DB_DEFAULT_DATABASE');

        DatabaseConnection::fromEnvironment();
    }

    /**
     * Test that fromEnvironment() throws a RuntimeException when DB_USERNAME
     * is absent.
     */
    public function testFromEnvironmentThrowsWhenDbUsernameIsAbsent(): void
    {
        putenv('DB_USERNAME');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Missing required environment variable: DB_USERNAME');

        DatabaseConnection::fromEnvironment();
    }

    /**
     * Test that fromEnvironment() treats an empty DB_USERNAME the same as absent.
     */
    public function testFromEnvironmentThrowsWhenDbUsernameIsEmptyString(): void
    {
        putenv('DB_USERNAME=');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Missing required environment variable: DB_USERNAME');

        DatabaseConnection::fromEnvironment();
    }

    // -------------------------------------------------------------------------
    // getPdo() — exception wrapping
    // -------------------------------------------------------------------------

    /**
     * Test that getPdo() throws a RuntimeException when the underlying PDO
     * connection fails.
     */
    public function testGetPdoThrowsRuntimeExceptionOnConnectionFailure(): void
    {
        $this->expectException(RuntimeException::class);

        $this->buildRefusedConnection()->getPdo();
    }

    /**
     * Test that the RuntimeException message follows the format
     * 'Database connection failed for host "…", database "…".'
     */
    public function testGetPdoExceptionMessageContainsHostAndDatabase(): void
    {
        $connection = $this->buildRefusedConnection(
            host:     'test-host-name',
            database: 'test_database_name',
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'Database connection failed for host "test-host-name", database "test_database_name".'
        );

        $connection->getPdo();
    }

    /**
     * Test that getPdo() wraps the original PDOException as the previous
     * exception, preserving the full exception chain.
     */
    public function testGetPdoWrapsOriginalPdoExceptionAsPrevious(): void
    {
        try {
            $this->buildRefusedConnection()->getPdo();
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $e) {
            $this->assertInstanceOf(PDOException::class, $e->getPrevious());
        }
    }

    /**
     * Test that the RuntimeException thrown by getPdo() uses error code 0,
     * as specified in the source.
     */
    public function testGetPdoExceptionCodeIsZero(): void
    {
        try {
            $this->buildRefusedConnection()->getPdo();
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $e) {
            $this->assertSame(0, $e->getCode());
        }
    }

    // -------------------------------------------------------------------------
    // getPdo() — caching (integration note)
    // -------------------------------------------------------------------------

    /**
     * Note: the lazy-init caching behaviour of getPdo() (returning the same PDO
     * instance on subsequent calls) requires a successful database connection and
     * is therefore covered by integration tests rather than unit tests.
     */

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Call getPdo() on the given connection, expect it to throw, and return the
     * RuntimeException message for assertion.
     */
    private function captureGetPdoExceptionMessage(DatabaseConnection $connection): string
    {
        try {
            $connection->getPdo();
            $this->fail('Expected RuntimeException was not thrown.');
        } catch (RuntimeException $e) {
            return $e->getMessage();
        }
    }
}

