<?php

declare(strict_types=1);

namespace Application\Routing\Instance;

use Symfony\Component\Config\Loader\LoaderInterface;
use Symfony\Component\Config\Loader\LoaderResolverInterface;
use Symfony\Component\Routing\RouteCollection;

class CustomRouteLoader implements LoaderInterface
{
    private ?LoaderResolverInterface $resolver = null;

    public function load($resource, string $type = null): mixed
    {
        return $resource;
    }

    public function supports($resource, string $type = null): bool
    {
        return $resource instanceof RouteCollection;
    }

    public function getResolver(): ?LoaderResolverInterface
    {
        return $this->resolver;
    }

    public function setResolver(LoaderResolverInterface $resolver)
    {
        $this->resolver = $resolver;
    }
}