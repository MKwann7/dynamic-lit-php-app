<?php

namespace Code\Database;

final class DatabaseConnectionRegistry
{
    private static array $connections = [];

    public static function get(string $name): DatabaseConnection
    {
        if (!isset(self::$connections[$name])) {
            self::$connections[$name] = DatabaseConnection::fromEnvironment($name);
        }

        return self::$connections[$name];
    }
}