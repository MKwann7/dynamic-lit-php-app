<?php

declare(strict_types=1);

namespace Code\Services\Identity;

use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;

final class IdentitySchemeService
{
    public function getRedirectResponse(
        Request $request,
        IdentityStruct $identity
    ): ?RedirectResponse {
        $host = strtolower(trim($request->getHost()));
        $isSecure = $request->isSecure();

        $requiredSsl = $identity->requiresSslForHost($host);

        if ($requiredSsl === null) {
            return null;
        }

        if ($requiredSsl === $isSecure) {
            return null;
        }

        $scheme = $requiredSsl ? 'https' : 'http';
        $target = $scheme . '://' . $host . $request->getRequestUri();

        return new RedirectResponse($target, 302);
    }
}