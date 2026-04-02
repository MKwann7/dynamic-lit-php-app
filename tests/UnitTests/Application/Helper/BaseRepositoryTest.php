<?php

declare(strict_types=1);

namespace UnitTests\Application\Helper;

use Application\Helper\BaseRepository;
use Code\Database\DatabaseClient;
use PDO;
use PHPUnit\Framework\TestCase;

class BaseRepositoryTest extends TestCase
{
    private PDO $pdoMock;
    private TestBaseRepository $repository;

    protected function setUp(): void
    {
        $this->pdoMock  = $this->createMock(PDO::class);
        $this->repository = new TestBaseRepository($this->pdoMock);
    }

    /**
     * Test that connectionName() returns the value defined by the concrete subclass.
     */
    public function testConnectionNameReturnsExpectedValue(): void
    {
        $this->assertSame(TestBaseRepository::CONNECTION_NAME, $this->repository->exposeConnectionName());
    }

    /**
     * Test that pdo() returns the injected PDO instance.
     */
    public function testPdoReturnsInjectedInstance(): void
    {
        $this->assertSame($this->pdoMock, $this->repository->exposePdo());
    }

    /**
     * Test that pdo() returns the same instance on repeated calls (lazy-init cache).
     */
    public function testPdoIsCachedAfterFirstCall(): void
    {
        $first  = $this->repository->exposePdo();
        $second = $this->repository->exposePdo();

        $this->assertSame($first, $second);
    }

    /**
     * Test that db() returns a DatabaseClient instance.
     */
    public function testDbReturnsDatabaseClientInstance(): void
    {
        $this->assertInstanceOf(DatabaseClient::class, $this->repository->exposeDb());
    }

    /**
     * Test that db() returns the same DatabaseClient instance on repeated calls (lazy-init cache).
     */
    public function testDbIsCachedAfterFirstCall(): void
    {
        $first  = $this->repository->exposeDb();
        $second = $this->repository->exposeDb();

        $this->assertSame($first, $second);
    }

    /**
     * Test that each new repository instance gets its own independent DatabaseClient.
     */
    public function testSeparateRepositoryInstancesHaveIndependentDbClients(): void
    {
        $otherRepository = new TestBaseRepository($this->createMock(PDO::class));

        $this->assertNotSame(
            $this->repository->exposeDb(),
            $otherRepository->exposeDb()
        );
    }
}

/**
 * Concrete test double for BaseRepository.
 *
 * databaseConnection() and its DatabaseConnectionRegistry dependency are
 * infrastructure-layer concerns that require a live connection; they are
 * covered by integration tests. Here we override pdo() to inject a mock
 * PDO, isolating the unit-testable lazy-init / caching logic in db().
 */
class TestBaseRepository extends BaseRepository
{
    public const string CONNECTION_NAME = 'test_connection';

    public function __construct(private readonly PDO $mockPdo) {}

    protected function connectionName(): string
    {
        return self::CONNECTION_NAME;
    }

    protected function pdo(): PDO
    {
        return $this->mockPdo;
    }

    public function exposeConnectionName(): string
    {
        return $this->connectionName();
    }

    public function exposePdo(): PDO
    {
        return $this->pdo();
    }

    public function exposeDb(): DatabaseClient
    {
        return $this->db();
    }
}

