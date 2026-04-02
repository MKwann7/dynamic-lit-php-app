<?php

declare(strict_types=1);

namespace Code\Services\Identity;

use Code\Domain\Whitelabel\WhitelabelRepository;
use Code\Domain\Whitelabel\WhitelabelRow;
use Symfony\Component\HttpFoundation\Request;

final readonly class WhitelabelIdentityResolver implements IdentityResolverInterface
{
    public function __construct(
        private WhitelabelRepository $whitelabelRepository,
    ) {
    }

    public function resolve(Request $request): ?IdentityStruct
    {
        $host = strtolower(trim($request->getHost()));

        if ($host === '') {
            return null;
        }

        $whitelabel = $this->whitelabelRepository->findByHost($host);

        if (!$whitelabel instanceof WhitelabelRow) {
            return null;
        }

        return new IdentityStruct(
            type: IdentityType::WHITELABEL,
            id: (int) $whitelabel->id,
            name: (string) $whitelabel->platform_name,
            domain: (string) $whitelabel->public_domain,
            domain_ssl: (bool) $whitelabel->public_domain_ssl,
            portal_name: $whitelabel->portal_domain_name,
            portal_domain: $whitelabel->portal_domain,
            portal_domain_ssl: $whitelabel->portal_domain_ssl,
            uuid: (string) $whitelabel->sys_row_id,
        );
    }
}