<?php

declare(strict_types=1);

namespace Code\Services\Components\Dtos;

final class ComponentManifestDto
{
    /**
     * @param array<int, array<string, mixed>> $dependencies
     * @param array<string, mixed> $exports
     */
    public function __construct(
        public readonly string  $id,
        public readonly string  $name,
        public readonly string  $tag,
        public readonly string  $el_name,
        public readonly string  $uri,
        public readonly string  $version,
        public readonly string  $framework,
        public readonly string  $entry,
        public readonly ?string $cssPath,
        public readonly ?string $integrity,
        public readonly string  $renderMode,
        public readonly bool    $themeAware,
        public readonly array   $exposeParts,
        public readonly array   $exports,
        public readonly array   $dependencies,
        public readonly ?string $breadcrumbLabel = null,
    ) {
    }

    public function toArray(): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'tag'              => $this->tag,
            'el_name'          => $this->el_name,
            'uri'              => $this->uri,
            'version'          => $this->version,
            'framework'        => $this->framework,
            'entry'            => $this->entry,
            'cssPath'          => $this->cssPath,
            'integrity'        => $this->integrity,
            'render_mode'      => $this->renderMode,
            'theme_aware'      => $this->themeAware,
            'expose_parts'     => $this->exposeParts,
            'dependencies'     => $this->dependencies,
            'exports'          => $this->exports,
            'breadcrumb_label' => $this->breadcrumbLabel,
        ];
    }
}