<?php

declare(strict_types=1);

namespace Code\Services\Identity;

use Symfony\Component\HttpFoundation\Request;

final class IdentityRegistrationManager
{
    private bool $initialized = false;
    private ?IdentityStruct $identity = null;

    /**
     * @param IdentityResolverInterface[] $resolvers
     */
    public function __construct(
        private readonly IdentitySessionStore $sessionStore,
        private readonly array $resolvers,
    ) {
    }

    public function initialize(Request $request): void
    {
        if ($this->initialized) {
            return;
        }

        $this->sessionStore->startIfNeeded();

        $fromSession = $this->sessionStore->read();
        if ($fromSession instanceof IdentityStruct) {
            $this->identity = $fromSession;
            $this->initialized = true;
            return;
        }

        foreach ($this->resolvers as $resolver) {
            $resolved = $resolver->resolve($request);

            if ($resolved instanceof IdentityStruct) {
                $this->sessionStore->write($resolved);
                $this->identity = $resolved;
                $this->initialized = true;
                return;
            }
        }

        $this->initialized = true;
    }

    public function hasIdentity(): bool
    {
        return $this->identity instanceof IdentityStruct;
    }

    public function getIdentity(): ?IdentityStruct
    {
        return $this->identity;
    }

    public function requireIdentity(): IdentityStruct
    {
        if (!$this->identity instanceof IdentityStruct) {
            throw new \RuntimeException('No request identity has been resolved.');
        }

        return $this->identity;
    }

    public function clear(): void
    {
        $this->sessionStore->clear();
        $this->identity = null;
        $this->initialized = false;
    }
}