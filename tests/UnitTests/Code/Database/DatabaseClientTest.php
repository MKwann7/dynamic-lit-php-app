<?php

declare(strict_types=1);

namespace UnitTests\Code\Database;

use Code\Database\DatabaseClient;
use PDO;
use PDOStatement;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class DatabaseClientTest extends TestCase
{
    private PDO $pdoMock;
    private PDOStatement $stmtMock;
    private DatabaseClient $client;

    protected function setUp(): void
    {
        $this->stmtMock = $this->createMock(PDOStatement::class);
        $this->stmtMock->method('execute')->willReturn(true);
        $this->stmtMock->method('bindValue')->willReturn(true);

        $this->pdoMock = $this->createMock(PDO::class);
        $this->pdoMock->method('prepare')->willReturn($this->stmtMock);

        $this->client = new DatabaseClient($this->pdoMock);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a fresh DatabaseClient whose PDO mock uses custom inTransaction()
     * return values, allowing full control over the transaction-guard flow.
     *
     * @param bool[] $inTransactionReturns Sequence of values returned per call.
     */
    private function buildTransactionalClient(array $inTransactionReturns): DatabaseClient
    {
        $stmt = $this->createMock(PDOStatement::class);
        $stmt->method('execute')->willReturn(true);
        $stmt->method('bindValue')->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')->willReturn($stmt);
        $pdo->method('inTransaction')->willReturnOnConsecutiveCalls(...$inTransactionReturns);

        return new DatabaseClient($pdo);
    }

    // -------------------------------------------------------------------------
    // fetchOne()
    // -------------------------------------------------------------------------

    /**
     * Test that fetchOne() returns the row array when the statement finds a row.
     */
    public function testFetchOneReturnsRowWhenFound(): void
    {
        $row = ['id' => 1, 'name' => 'Alice'];
        $this->stmtMock->method('fetch')->willReturn($row);

        $this->assertSame($row, $this->client->fetchOne('SELECT 1'));
    }

    /**
     * Test that fetchOne() returns null when the statement returns false
     * (no row matched).
     */
    public function testFetchOneReturnsNullWhenNotFound(): void
    {
        $this->stmtMock->method('fetch')->willReturn(false);

        $this->assertNull($this->client->fetchOne('SELECT 1'));
    }

    // -------------------------------------------------------------------------
    // fetchAssociative()
    // -------------------------------------------------------------------------

    /**
     * Test that fetchAssociative() returns the row array when a row is found.
     */
    public function testFetchAssociativeReturnsRowWhenFound(): void
    {
        $row = ['id' => 1, 'name' => 'Alice'];
        $this->stmtMock->method('fetch')->willReturn($row);

        $this->assertSame($row, $this->client->fetchAssociative('SELECT 1'));
    }

    /**
     * Test that fetchAssociative() returns null when no row is found.
     */
    public function testFetchAssociativeReturnsNullWhenNotFound(): void
    {
        $this->stmtMock->method('fetch')->willReturn(false);

        $this->assertNull($this->client->fetchAssociative('SELECT 1'));
    }

    /**
     * Test that fetchAssociative() calls fetch() with PDO::FETCH_ASSOC.
     */
    public function testFetchAssociativeUsesFetchAssocMode(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('fetch')
            ->with(PDO::FETCH_ASSOC)
            ->willReturn([]);

        $this->client->fetchAssociative('SELECT 1');
    }

    // -------------------------------------------------------------------------
    // fetchAll()
    // -------------------------------------------------------------------------

    /**
     * Test that fetchAll() returns all rows as an array.
     */
    public function testFetchAllReturnsAllRows(): void
    {
        $rows = [['id' => 1], ['id' => 2]];
        $this->stmtMock->method('fetchAll')->willReturn($rows);

        $this->assertSame($rows, $this->client->fetchAll('SELECT 1'));
    }

    /**
     * Test that fetchAll() returns an empty array when the statement yields no rows.
     *
     * Note: PDOStatement::fetchAll() is declared to return array in PHP 8, so the
     * false-guard in the source is dead code at runtime. The meaningful case to
     * test is an empty result set, which exercises the same [] return path.
     */
    public function testFetchAllReturnsEmptyArrayForEmptyResultSet(): void
    {
        $this->stmtMock->method('fetchAll')->willReturn([]);

        $this->assertSame([], $this->client->fetchAll('SELECT 1'));
    }

    // -------------------------------------------------------------------------
    // fetchAllAssociative()
    // -------------------------------------------------------------------------

    /**
     * Test that fetchAllAssociative() returns all rows as an array.
     */
    public function testFetchAllAssociativeReturnsAllRows(): void
    {
        $rows = [['id' => 1], ['id' => 2]];
        $this->stmtMock->method('fetchAll')->willReturn($rows);

        $this->assertSame($rows, $this->client->fetchAllAssociative('SELECT 1'));
    }

    /**
     * Test that fetchAllAssociative() returns an empty array when the statement
     * yields no rows.
     *
     * Note: PDOStatement::fetchAll() is declared to return array in PHP 8, so the
     * false-guard in the source is dead code at runtime. The meaningful case to
     * test is an empty result set, which exercises the same [] return path.
     */
    public function testFetchAllAssociativeReturnsEmptyArrayForEmptyResultSet(): void
    {
        $this->stmtMock->method('fetchAll')->willReturn([]);

        $this->assertSame([], $this->client->fetchAllAssociative('SELECT 1'));
    }

    /**
     * Test that fetchAllAssociative() calls fetchAll() with PDO::FETCH_ASSOC.
     */
    public function testFetchAllAssociativeUsesFetchAssocMode(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('fetchAll')
            ->with(PDO::FETCH_ASSOC)
            ->willReturn([]);

        $this->client->fetchAllAssociative('SELECT 1');
    }

    // -------------------------------------------------------------------------
    // execute()
    // -------------------------------------------------------------------------

    /**
     * Test that execute() returns the affected row count from the statement.
     */
    public function testExecuteReturnsRowCount(): void
    {
        $this->stmtMock->method('rowCount')->willReturn(3);

        $this->assertSame(3, $this->client->execute('UPDATE foo SET bar = 1'));
    }

    // -------------------------------------------------------------------------
    // insert()
    // -------------------------------------------------------------------------

    /**
     * Test that insert() returns the last insert ID cast to int.
     */
    public function testInsertReturnsLastInsertId(): void
    {
        $this->pdoMock->method('lastInsertId')->willReturn('42');

        $this->assertSame(42, $this->client->insert('INSERT INTO foo VALUES (?)'));
    }

    // -------------------------------------------------------------------------
    // beginTransaction()
    // -------------------------------------------------------------------------

    /**
     * Test that beginTransaction() calls pdo->beginTransaction() when not
     * currently in a transaction.
     */
    public function testBeginTransactionCallsPdoWhenNotInTransaction(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(false);
        $this->pdoMock->expects($this->once())->method('beginTransaction');

        $this->client->beginTransaction();
    }

    /**
     * Test that beginTransaction() does nothing when already in a transaction.
     */
    public function testBeginTransactionDoesNothingWhenAlreadyInTransaction(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(true);
        $this->pdoMock->expects($this->never())->method('beginTransaction');

        $this->client->beginTransaction();
    }

    // -------------------------------------------------------------------------
    // commit()
    // -------------------------------------------------------------------------

    /**
     * Test that commit() calls pdo->commit() when in a transaction.
     */
    public function testCommitCallsPdoCommitWhenInTransaction(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(true);
        $this->pdoMock->expects($this->once())->method('commit');

        $this->client->commit();
    }

    /**
     * Test that commit() does nothing when not in a transaction.
     */
    public function testCommitDoesNothingWhenNotInTransaction(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(false);
        $this->pdoMock->expects($this->never())->method('commit');

        $this->client->commit();
    }

    // -------------------------------------------------------------------------
    // rollBack()
    // -------------------------------------------------------------------------

    /**
     * Test that rollBack() calls pdo->rollBack() when in a transaction.
     */
    public function testRollBackCallsPdoRollBackWhenInTransaction(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(true);
        $this->pdoMock->expects($this->once())->method('rollBack');

        $this->client->rollBack();
    }

    /**
     * Test that rollBack() does nothing when not in a transaction.
     */
    public function testRollBackDoesNothingWhenNotInTransaction(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(false);
        $this->pdoMock->expects($this->never())->method('rollBack');

        $this->client->rollBack();
    }

    // -------------------------------------------------------------------------
    // inTransaction()
    // -------------------------------------------------------------------------

    /**
     * Test that inTransaction() returns true when the PDO is in a transaction.
     */
    public function testInTransactionReturnsTrue(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(true);

        $this->assertTrue($this->client->inTransaction());
    }

    /**
     * Test that inTransaction() returns false when the PDO is not in a transaction.
     */
    public function testInTransactionReturnsFalse(): void
    {
        $this->pdoMock->method('inTransaction')->willReturn(false);

        $this->assertFalse($this->client->inTransaction());
    }

    // -------------------------------------------------------------------------
    // transactional()
    // -------------------------------------------------------------------------

    /**
     * Test that transactional() executes the callback and returns its result.
     */
    public function testTransactionalReturnsCallbackResult(): void
    {
        // not-in → beginTransaction fires; then in → commit fires
        $client = $this->buildTransactionalClient([false, true]);

        $result = $client->transactional(fn() => 'payload');

        $this->assertSame('payload', $result);
    }

    /**
     * Test that transactional() passes the DatabaseClient instance to the callback.
     */
    public function testTransactionalPassesDatabaseClientToCallback(): void
    {
        $client   = $this->buildTransactionalClient([false, true]);
        $received = null;

        $client->transactional(function (DatabaseClient $db) use (&$received) {
            $received = $db;
        });

        $this->assertSame($client, $received);
    }

    /**
     * Test that transactional() commits after a successful callback.
     */
    public function testTransactionalCommitsOnSuccess(): void
    {
        $stmt = $this->createMock(PDOStatement::class);
        $stmt->method('execute')->willReturn(true);
        $stmt->method('bindValue')->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')->willReturn($stmt);
        $pdo->method('inTransaction')->willReturnOnConsecutiveCalls(false, true);
        $pdo->expects($this->once())->method('commit');

        (new DatabaseClient($pdo))->transactional(fn() => null);
    }

    /**
     * Test that transactional() rolls back when the callback throws.
     */
    public function testTransactionalRollsBackOnException(): void
    {
        $stmt = $this->createMock(PDOStatement::class);
        $stmt->method('execute')->willReturn(true);

        $pdo = $this->createMock(PDO::class);
        $pdo->method('prepare')->willReturn($stmt);
        $pdo->method('inTransaction')->willReturnOnConsecutiveCalls(false, true);
        $pdo->expects($this->never())->method('commit');
        $pdo->expects($this->once())->method('rollBack');

        $client = new DatabaseClient($pdo);

        try {
            $client->transactional(fn() => throw new RuntimeException('fail'));
        } catch (RuntimeException) {
            // expected — tested below
        }
    }

    /**
     * Test that transactional() re-throws the exception after rolling back.
     */
    public function testTransactionalRethrowsExceptionAfterRollBack(): void
    {
        $client = $this->buildTransactionalClient([false, true]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('fail');

        $client->transactional(fn() => throw new RuntimeException('fail'));
    }

    // -------------------------------------------------------------------------
    // prepareAndExecute() — parameter binding (tested via execute())
    // -------------------------------------------------------------------------

    /**
     * Test that named (string-keyed) parameters are bound using the key as-is.
     */
    public function testNamedParametersBoundWithOriginalKey(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('bindValue')
            ->with('user_id', 7, PDO::PARAM_INT);

        $this->client->execute('UPDATE foo SET bar = :user_id', ['user_id' => 7]);
    }

    /**
     * Test that positional (int-keyed) parameters are bound as key + 1
     * (PDO positional binding is 1-indexed).
     */
    public function testPositionalParametersBoundWithOneBasedIndex(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('bindValue')
            ->with(1, 'Alice', PDO::PARAM_STR);

        $this->client->execute('INSERT INTO foo VALUES (?)', [0 => 'Alice']);
    }

    /**
     * Test that integer values are bound with PDO::PARAM_INT.
     */
    public function testIntValuesBindWithParamInt(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('bindValue')
            ->with($this->anything(), 42, PDO::PARAM_INT);

        $this->client->execute('SELECT ?', [42]);
    }

    /**
     * Test that boolean values are bound with PDO::PARAM_BOOL.
     */
    public function testBoolValuesBindWithParamBool(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('bindValue')
            ->with($this->anything(), true, PDO::PARAM_BOOL);

        $this->client->execute('SELECT ?', [true]);
    }

    /**
     * Test that null values are bound with PDO::PARAM_NULL.
     */
    public function testNullValuesBindWithParamNull(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('bindValue')
            ->with($this->anything(), null, PDO::PARAM_NULL);

        $this->client->execute('SELECT ?', [null]);
    }

    /**
     * Test that string values are bound with PDO::PARAM_STR.
     */
    public function testStringValuesBindWithParamStr(): void
    {
        $this->stmtMock
            ->expects($this->once())
            ->method('bindValue')
            ->with($this->anything(), 'hello', PDO::PARAM_STR);

        $this->client->execute('SELECT ?', ['hello']);
    }

    /**
     * Test that multiple parameters of mixed types are each bound with the
     * correct PDO type constant.
     */
    public function testMixedParameterTypesAreEachBoundCorrectly(): void
    {
        $this->stmtMock->method('rowCount')->willReturn(0);

        $expected = [
            [1, 'text',  PDO::PARAM_STR],
            [2, 99,      PDO::PARAM_INT],
            [3, null,    PDO::PARAM_NULL],
            [4, false,   PDO::PARAM_BOOL],
        ];

        $matcher = $this->exactly(count($expected));
        $this->stmtMock
            ->expects($matcher)
            ->method('bindValue')
            ->willReturnCallback(function (mixed $key, mixed $value, int $type) use (&$expected): bool {
                [$expKey, $expValue, $expType] = array_shift($expected);
                $this->assertSame($expKey,   $key);
                $this->assertSame($expValue, $value);
                $this->assertSame($expType,  $type);
                return true;
            });

        $this->client->execute('INSERT INTO t VALUES (?,?,?,?)', ['text', 99, null, false]);
    }
}

