<?php

declare(strict_types=1);

namespace Code\Services\Identity;

use Code\Domain\Sites\SiteRepository;
use Code\Domain\Sites\SiteRow;
use Symfony\Component\HttpFoundation\Request;

final readonly class SiteIdentityResolver implements IdentityResolverInterface
{
    public function __construct(
        private SiteRepository $siteRepository,
    ) {
    }

    public function resolve(Request $request): ?IdentityStruct
    {
        $host = strtolower(trim($request->getHost()));

        if ($host === '') {
            return null;
        }

        $site = $this->siteRepository->findByDomain($host);

        if (!$site instanceof SiteRow) {
            return null;
        }

        return new IdentityStruct(
            type: IdentityType::SITE,
            id: (int) $site->site_id,
            name: (string) $site->site_name,
            domain: (string) $site->domain,
            domain_ssl: (bool) $site->has_domain_ssl,
            portal_name: null,
            portal_domain: null,
            portal_domain_ssl: null,
            uuid: (string) $site->sys_row_id,
        );
    }
}