<?php

declare(strict_types=1);

namespace Application\Routing\Request;

use Symfony\Component\HttpFoundation\Request;

class HttpRequest
{
    public function getHttpRequest(): Request
    {
        return Request::createFromGlobals();
    }
}