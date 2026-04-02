<?php

declare(strict_types=1);

namespace Code\Services\Auth;

use Code\Domain\Users\UserAdminPermissionRepository;
use Code\Domain\Users\UserRepository;
use Code\Security\JwtPayloadFactory;
use Code\Security\JwtTokenService;
use Code\Services\Identity\IdentityRegistrationManager;
use RuntimeException;

final readonly class JwtAuthService
{
    public function __construct(
        private UserRepository                  $userRepository,
        private JwtPayloadFactory               $payloadFactory,
        private JwtTokenService                 $tokenService,
        private IdentityRegistrationManager     $identityRegistrationManager,
        private UserAdminPermissionRepository   $adminPermissionRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function makeSessionToken(): array
    {
        $publicIdentity = $this->getIdentity();

        $claims = [
            "app" => $publicIdentity
        ];

        $payload = $this->payloadFactory->make(JwtService::TOKEN_TYPE_SESSION, $claims);
        $token = $this->tokenService->encode($payload);

        return [
            'token_type' => JwtService::TOKEN_TYPE_SESSION,
            'access_token' => $token,
            'expires_in' => $payload['exp'] - time(),
            'domain' => $claims,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function authenticateUser(string $identity, string $password): array
    {
        $identity = trim($identity);

        if ($identity === '' || $password === '') {
            throw new RuntimeException('Identity and password are required.');
        }

        $user = $this->userRepository->getByEmailOrUsername($identity);

        if ($user === null) {
            throw new RuntimeException('Invalid credentials.');
        }

        if (!$this->isUserActive($user)) {
            throw new RuntimeException('This account is inactive.');
        }

        $passwordHash = $user->password ?? '';

        if ($passwordHash === '' || !password_verify($password, $passwordHash)) {
            throw new RuntimeException('Invalid credentials.');
        }

        $userId      = (int)$user->user_id;
        $permissions = $this->adminPermissionRepository->getActivePermissionsForUser($userId);
        $tokenType   = $permissions !== []
            ? JwtService::TOKEN_TYPE_ADMIN
            : JwtService::TOKEN_TYPE_USER;

        $publicIdentity = $this->getIdentity();

        $claims = [
            'user' => [
                'user_id' => $user->user_id,
                'email'   => $user->email   ?? null,
                'status'  => $user->status  ?? null,
            ],
            'permissions' => $permissions,   // [] for regular users, [...] for admins
            'app'         => $publicIdentity,
        ];

        $payload = $this->payloadFactory->make($tokenType, $claims);
        $token   = $this->tokenService->encode($payload);

        return [
            'token_type'   => $tokenType,
            'access_token' => $token,
            'expires_in'   => $payload['exp'] - time(),
            'domain'       => $claims,
        ];
    }

    private function isUserActive(object $user): bool
    {
        $status = strtolower((string)($user->status ?? 'active'));

        return in_array($status, ['active', 'enabled'], true);
    }

    /**
     * @return array
     */
    protected function getIdentity(): array
    {
        $identity = $this->identityRegistrationManager->getIdentity();

        $publicIdentity = [
            "name" => $identity->name ?? null,
            "domain" => $identity->domain ?? null,
            "domain_ssl" => $identity->domain_ssl ?? null,
        ];

        if ($identity->type ?? null === "whitelabel") {
            $publicIdentity["portal_name"] = $identity->portal_name ?? null;
            $publicIdentity["portal_domain"] = $identity->portal_domain ?? null;
            $publicIdentity["portal_domain_ssl"] = $identity->portal_domain_ssl ?? null;
        }

        $publicIdentity["type"] = $identity->type ?? null;
        $publicIdentity["uuid"] = $identity->uuid ?? null;
        return $publicIdentity;
    }
}