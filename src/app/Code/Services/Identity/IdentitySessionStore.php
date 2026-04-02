<?php

declare(strict_types=1);

namespace Code\Services\Identity;

final class IdentitySessionStore
{
    private const SESSION_KEY = 'identity.current';

    public function startIfNeeded(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }

    public function read(): ?IdentityStruct
    {
        $this->startIfNeeded();

        $value = $_SESSION[self::SESSION_KEY] ?? null;

        if (!is_array($value)) {
            return null;
        }

        return IdentityStruct::fromArray($value);
    }

    public function write(IdentityStruct $identity): void
    {
        $this->startIfNeeded();

        $_SESSION[self::SESSION_KEY] = $identity->toArray();
    }

    public function clear(): void
    {
        $this->startIfNeeded();

        unset($_SESSION[self::SESSION_KEY]);
    }
}