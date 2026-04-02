<?php

namespace Application\Helper;

use Code\Database\DatabaseClient;
use Code\Database\DatabaseConnection;
use Code\Database\DatabaseConnectionRegistry;
use PDO;

abstract class BaseRepository
{
    private ?DatabaseConnection $databaseConnection = null;
    private ?PDO $pdo = null;
    private ?DatabaseClient $db = null;

    abstract protected function connectionName(): string;

    protected function db(): DatabaseClient
    {
        if ($this->db === null) {
            $this->db = new DatabaseClient($this->pdo());
        }

        return $this->db;
    }

    protected function databaseConnection(): DatabaseConnection
    {
        if ($this->databaseConnection === null) {
            $this->databaseConnection = DatabaseConnectionRegistry::get(
                $this->connectionName()
            );
        }

        return $this->databaseConnection;
    }

    protected function pdo(): PDO
    {
        if ($this->pdo === null) {
            $this->pdo = $this->databaseConnection()->getPdo();
        }

        return $this->pdo;
    }
}