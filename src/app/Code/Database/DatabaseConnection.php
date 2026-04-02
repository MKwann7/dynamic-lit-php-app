<?php

declare(strict_types=1);

namespace Code\Database;

use PDO;
use PDOException;
use RuntimeException;

final class DatabaseConnection
{
    private ?PDO $pdo = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $database,
        private readonly string $username,
        private readonly string $password,
        private readonly string $charset = 'utf8mb4'
    ) {
    }

    public static function fromEnvironment(string $connectionName = 'default'): self
    {
        $prefix = 'DB_' . strtoupper($connectionName) . '_';

        $host = self::getEnvOrFail('DB_HOST');
        $port = (int)self::getEnvOrDefault('DB_PORT', '3306');
        $database = self::getEnvOrFail($prefix . 'DATABASE');
        $username = self::getEnvOrFail('DB_USERNAME');
        $password = self::getEnvOrDefault('DB_PASSWORD', '');
        $charset = self::getEnvOrDefault('DB_CHARSET', 'utf8mb4');

        return new self(
            host: $host,
            port: $port,
            database: $database,
            username: $username,
            password: $password,
            charset: $charset
        );
    }

    public function getPdo(): PDO
    {
        if ($this->pdo instanceof PDO) {
            return $this->pdo;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $this->host,
            $this->port,
            $this->database,
            $this->charset
        );

        try {
            $this->pdo = new PDO(
                $dsn,
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            throw new RuntimeException(
                sprintf(
                    'Database connection failed for host "%s", database "%s".',
                    $this->host,
                    $this->database
                ),
                0,
                $e
            );
        }

        return $this->pdo;
    }

    private static function getEnvOrFail(string $key): string
    {
        $value = getenv($key);

        if ($value === false || $value === '') {
            throw new RuntimeException(sprintf('Missing required environment variable: %s', $key));
        }

        return $value;
    }

    private static function getEnvOrDefault(string $key, string $default): string
    {
        $value = getenv($key);

        return ($value === false || $value === '') ? $default : $value;
    }
}