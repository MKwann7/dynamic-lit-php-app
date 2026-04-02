<?php

declare(strict_types=1);

namespace Code\Services\Identity;

enum IdentityType: string
{
    case SITE = 'site';
    case WHITELABEL = 'whitelabel';
}