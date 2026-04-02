<?php

declare(strict_types=1);

namespace Application\Routing\Instance;

use Application\Routing\Parameters\RouteParameterCollection;

class RouteInstance
{
    public function __construct(
        private readonly string $uriPath,
        private readonly string $routeClass,
        private readonly string $routeClassMethod,
        private readonly string $routeHttpVerb = 'GET',
        private readonly array $middleware = [],
        private ?RouteParameterCollection $uriParameters = null,
    ) {
        $this->uriParameters = $uriParameters ?? new RouteParameterCollection();

        // If the URI path ends with {trail} and no trail parameter has been
        // registered yet, automatically add the wildcard requirement so callers
        // never need to declare it manually.
        if (
            str_ends_with($this->uriPath, '{trail}') &&
            $this->uriParameters->get('trail') === null
        ) {
            $this->uriParameters->registerParameters(['trail' => ['', 'wildcard']]);
        }
    }

    // Set the URI parameters collection
    public function setUriParameters(RouteParameterCollection $collection): self
    {
        $this->uriParameters = $collection;
        return $this;
    }

    // Get the URI parameters collection
    public function getUriParameters(): RouteParameterCollection
    {
        return $this->uriParameters;
    }

    // Generate the full route array
    public function generateRouteArray(): array
    {
        $defaultParams = [
            '_controller' => [$this->routeClass, $this->routeClassMethod],
            '_verb' => $this->routeHttpVerb
        ];

        // Merge URI parameters and requirements into the default parameters and requirements
        $defaults = array_merge($defaultParams, $this->uriParameters->getUriParameterArrays());
        $requirements = $this->uriParameters->getUriRequirementArrays();

        return [$defaults, $requirements];
    }

    /**
     * @return string
     */
    public function getUriPath(): string
    {
        return $this->uriPath;
    }

    public function getMiddleware(): array
    {
        return $this->middleware;
    }

    public function toArray(): array
    {
        return array_merge(["_uri" => $this->getUriPath()], $this->generateRouteArray());
    }
}