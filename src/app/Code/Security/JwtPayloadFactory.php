<?php

declare(strict_types=1);

namespace Code\Security;

final readonly class JwtPayloadFactory
{
    public function __construct(
        private string $issuer,
        private string $audience,
        private int    $ttlSeconds
    ) {
    }

    /**
     * @param array<string, mixed> $userClaims
     * @return array<string, mixed>
     */
    public function make(string $tokenType, ?array $userClaims = null): array
    {
        $now = time();

        $payload = [
            'iss' => $this->issuer,
            'aud' => $this->audience,
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $this->ttlSeconds,
            'token_type' => $tokenType,
        ];

        if ($userClaims !== null) {
            $payload['sub'] = (string)($userClaims['user_id'] ?? '');
            $payload['data'] = $userClaims;
        }

        return $payload;
    }
}