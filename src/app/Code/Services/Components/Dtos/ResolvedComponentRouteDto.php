<?php

declare(strict_types=1);

namespace Code\Services\Components\Dtos;

final class ResolvedComponentRouteDto
{
    public function __construct(
        public readonly string $uri,
        public readonly string $uuid,
        public readonly bool $isPublic,
        public readonly int $componentId,
        public readonly string $componentName,
        public readonly string $componentTag,
        public readonly string $componentElement,
        public readonly string $componentUri,
        public readonly string $framework,
        public readonly int $componentVersionId,
        public readonly string $version,
        public readonly string $renderMode,
        public readonly bool $themeAware,
        public readonly array $exposeParts,
        public readonly string $status,
        public readonly string $rootWidgetId,
        public readonly string $manifestEndpoint,
    ) {
    }

    public function toArray(): array
    {
        return [
            'route' => [
                'uri' => $this->uri,
                'isPublic' => $this->isPublic,
            ],
            'component' => [
                'id' => $this->componentId,
                'name' => $this->componentName,
                'tag' => $this->componentTag,
                'el_name' => $this->componentElement,
                'uri' => $this->componentUri,
                'framework' => $this->framework,
                'render_mode' => $this->renderMode,
                'theme_aware' => $this->themeAware,
                'expose_parts' => $this->exposeParts,
            ],
            'version' => [
                'id' => $this->componentVersionId,
                'version' => $this->version,
                'status' => $this->status,
            ],
            'resolved' => [
                'rootWidgetId' => $this->rootWidgetId,
                'manifestEndpoint' => $this->manifestEndpoint,
            ],
        ];
    }
}