<?php

declare(strict_types=1);

namespace Code\Services\Identity;

use Symfony\Component\HttpFoundation\Request;

interface IdentityResolverInterface
{
    public function resolve(Request $request): ?IdentityStruct;
}