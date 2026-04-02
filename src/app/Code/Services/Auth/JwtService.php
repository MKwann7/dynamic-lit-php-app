<?php

declare(strict_types=1);

namespace Code\Services\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;

final readonly class JwtService
{
    public const TOKEN_TYPE_USER    = 'user';
    public const TOKEN_TYPE_ADMIN   = 'admin';
    public const TOKEN_TYPE_SESSION = 'session';

    public function __construct(
        private string $secret,
        private string $algorithm = 'HS256',
        private string $issuer = 'dynlit-app',
        private string $audience = 'dynlit-app-clients',
        private int    $ttlSeconds = 3600,
    ) {
    }

    /**
     * @param array<string, mixed> $userData
     * @return array<string, mixed>
     */
    public function issueToken(int $userId, array $userData = []): array
    {
        $now = time();
        $expiresAt = $now + $this->ttlSeconds;

        $payload = [
            'iss' => $this->issuer,
            'aud' => $this->audience,
            'iat' => $now,
            'nbf' => $now,
            'exp' => $expiresAt,
            'sub' => (string)$userId,
            'data' => $userData,
        ];

        $token = JWT::encode($payload, $this->secret, $this->algorithm);

        return [
            'token_type' => 'Bearer',
            'access_token' => $token,
            'expires_in' => $this->ttlSeconds,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function decode(string $token): array
    {
        $decoded = (array) JWT::decode(
            $token,
            new Key($this->secret, $this->algorithm)
        );

        if (($decoded['iss'] ?? null) !== $this->issuer) {
            throw new RuntimeException('Invalid token issuer.');
        }

        $audience = $decoded['aud'] ?? null;
        if ($audience !== $this->audience) {
            throw new RuntimeException('Invalid token audience.');
        }

        $data = [];
        if (isset($decoded['data']) && is_object($decoded['data'])) {
            $data = (array) $decoded['data'];
        } elseif (isset($decoded['data']) && is_array($decoded['data'])) {
            $data = $decoded['data'];
        }

        $decoded['data'] = $data;

        return $decoded;
    }

    public function extractBearerTokenFromServerArray(array $server): ?string
    {
        $header = $server['HTTP_AUTHORIZATION']
            ?? $server['REDIRECT_HTTP_AUTHORIZATION']
            ?? null;

        if (!is_string($header) || trim($header) === '') {
            return null;
        }

        if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
            return null;
        }

        return trim($matches[1]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function tryDecodeTokenFromBearer(string $bearerToken): ?array
    {
        $bearerToken = trim($bearerToken);

        if ($bearerToken === '') {
            return null;
        }

        try {
            return $this->decode($bearerToken);
        } catch (\Throwable) {
            return null;
        }
    }

    public function getTokenType(array $payload): ?string
    {
        $tokenType = $payload['token_type'] ?? null;

        if (!is_string($tokenType) || trim($tokenType) === '') {
            return null;
        }

        return strtolower(trim($tokenType));
    }

    public function isUserToken(array $payload): bool
    {
        return $this->getTokenType($payload) === self::TOKEN_TYPE_USER;
    }

    public function isAdminToken(array $payload): bool
    {
        return $this->getTokenType($payload) === self::TOKEN_TYPE_ADMIN;
    }

    public function isSessionToken(array $payload): bool
    {
        return $this->getTokenType($payload) === self::TOKEN_TYPE_SESSION;
    }

    /**
     * Returns true when the decoded payload's data.permissions array contains
     * the requested permission string (e.g. "sites.edit_all").
     */
    public function hasPermission(array $payload, string $permission): bool
    {
        $data = $payload['data'] ?? [];

        if (!is_array($data)) {
            return false;
        }

        $permissions = $data['permissions'] ?? [];

        if (!is_array($permissions)) {
            return false;
        }

        return in_array($permission, $permissions, true);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function tryDecodeUserTokenFromBearer(string $bearerToken): ?array
    {
        $payload = $this->tryDecodeTokenFromBearer($bearerToken);

        if ($payload === null) {
            return null;
        }

        return $this->isUserToken($payload) ? $payload : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function tryDecodeAdminTokenFromBearer(string $bearerToken): ?array
    {
        $payload = $this->tryDecodeTokenFromBearer($bearerToken);

        if ($payload === null) {
            return null;
        }

        return $this->isAdminToken($payload) ? $payload : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function tryDecodeSessionTokenFromBearer(string $bearerToken): ?array
    {
        $payload = $this->tryDecodeTokenFromBearer($bearerToken);

        if ($payload === null) {
            return null;
        }

        return $this->isSessionToken($payload) ? $payload : null;
    }

    /**
     * Accepts user OR admin tokens (any authenticated user, regardless of
     * permission level).
     *
     * @return array<string, mixed>|null
     */
    public function tryDecodeUserOrAdminTokenFromBearer(string $bearerToken): ?array
    {
        $payload = $this->tryDecodeTokenFromBearer($bearerToken);

        if ($payload === null) {
            return null;
        }

        return ($this->isUserToken($payload) || $this->isAdminToken($payload))
            ? $payload
            : null;
    }

    /**
     * Accepts session, user, or admin tokens — the broadest authenticated gate.
     *
     * @return array<string, mixed>|null
     */
    public function tryDecodeSessionOrUserTokenFromBearer(string $bearerToken): ?array
    {
        $payload = $this->tryDecodeTokenFromBearer($bearerToken);

        if ($payload === null) {
            return null;
        }

        return ($this->isSessionToken($payload)
                || $this->isUserToken($payload)
                || $this->isAdminToken($payload))
            ? $payload
            : null;
    }

    public static function fromEnvironment(): self
    {
        return new self(
            secret: self::getEnvOrFail('JWT_SECRET'),
            algorithm: self::getEnvOrDefault('JWT_ALGORITHM', 'HS256'),
            issuer: self::getEnvOrDefault('JWT_ISSUER', 'dynlit-app'),
            audience: self::getEnvOrDefault('JWT_AUDIENCE', 'dynlit-app-clients'),
            ttlSeconds: (int) self::getEnvOrDefault('JWT_TTL_SECONDS', '3600'),
        );
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