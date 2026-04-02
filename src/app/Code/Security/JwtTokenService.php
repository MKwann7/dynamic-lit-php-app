<?php

declare(strict_types=1);

namespace Code\Security;

use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use Throwable;

final class JwtTokenService
{
    public function __construct(
        private readonly string $secret,
        private readonly string $algorithm = 'HS256'
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function encode(array $payload): string
    {
        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * @return array<string, mixed>
     */
    public function decode(string $token): array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));

            return json_decode(json_encode($decoded, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);
        } catch (ExpiredException $e) {
            throw new RuntimeException('JWT token has expired.', 0, $e);
        } catch (Throwable $e) {
            throw new RuntimeException('JWT token is invalid.', 0, $e);
        }
    }

    public function isValid(string $token): bool
    {
        try {
            $this->decode($token);
            return true;
        } catch (Throwable) {
            return false;
        }
    }
}