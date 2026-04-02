<?php

declare(strict_types=1);

namespace Code\Services\Components;

use Application\Helper\BaseRepository;
use Code\Services\Components\Dtos\ComponentManifestDto;
use Code\Services\Components\Dtos\ResolvedComponentRouteDto;

class AggregateComponentService extends BaseRepository
{
    public function resolveByUri(string $uri): ?ResolvedComponentRouteDto
    {
        $normalizedUri = $this->normalizeUri($uri);

        $sql = 'SELECT cr.uri, cr.is_public, BIN_TO_UUID(c.public_id) AS public_id, c.id AS component_id, c.name AS component_name, c.tag AS component_tag, c.framework, c.el_name as component_element, c.uri as component_uri, cv.id AS component_version_id, cv.version, cv.status, cv.render_mode, cv.theme_aware, cv.expose_parts
            FROM component_route cr
            INNER JOIN component c
            ON c.id = cr.component_id
            INNER JOIN component_version cv
            ON cv.id = c.active_version_id 
            WHERE cr.uri = :uri LIMIT 1';

        $row = $this->db()->fetchAssociative($sql, [
            'uri' => $normalizedUri,
        ]);

        if (empty($row)) {
            return null;
        }

        $exposeParts = json_decode((string)$row['expose_parts'], true);
        if (!is_array($exposeParts)) {
            $exposeParts = [];
        }

        $componentUuid = $row['public_id'];

        return new ResolvedComponentRouteDto(
            uri: (string)$row['uri'],
            uuid: $row['public_id'],
            isPublic: (bool)$row['is_public'],
            componentId: $row['component_id'],
            componentName: (string)$row['component_name'],
            componentTag: (string)$row['component_tag'],
            componentElement: (string)$row['component_element'],
            componentUri: (string)$row['component_uri'],
            framework: (string)$row['framework'],
            componentVersionId: (int)$row['component_version_id'],
            version: (string)$row['version'],
            renderMode: (string)$row['render_mode'],
            themeAware: (bool)$row['theme_aware'],
            exposeParts: $exposeParts,
            status: (string)$row['status'],
            rootWidgetId: (string)$componentUuid,
            manifestEndpoint: '/api/v1/components/' . $componentUuid . '/manifest',
        );
    }

    public function getManifestByUri(string $uri): ?ComponentManifestDto
    {
        $normalizedUri = $this->normalizeUri($uri);

        $sql = "SELECT
            BIN_TO_UUID(c.public_id) AS component_public_id,
            c.name AS component_name, c.tag AS component_tag, c.el_name AS component_element,
            c.uri AS component_uri, c.framework,
            cv.id AS component_version_id, cv.version, cv.entry_path, cv.css_path,
            cv.integrity, cv.exports_json, cv.render_mode, cv.theme_aware, cv.expose_parts,
            cv.breadcrumb_label, cv.status
            FROM component_route cr
            INNER JOIN component c ON c.id = cr.component_id
            INNER JOIN component_version cv
                ON cv.id = c.active_version_id
                AND cv.status = 'active'
            WHERE cr.uri = :uri
            LIMIT 1";

        $row = $this->db()->fetchAssociative($sql, [
            'uri' => $normalizedUri,
        ]);

        if (empty($row)) {
            return null;
        }

        $componentVersionId = (int)$row['component_version_id'];
        $dependencies = $this->getDependenciesByComponentVersionId($componentVersionId);

        $exports = json_decode((string)$row['exports_json'], true);
        if (!is_array($exports)) {
            $exports = [];
        }
        $exposeParts = json_decode((string)$row['expose_parts'], true);
        if (!is_array($exposeParts)) {
            $exposeParts = [];
        }

        return new ComponentManifestDto(
            id: (string)$row['component_public_id'],
            name: (string)$row['component_name'],
            tag: (string)$row['component_tag'],
            el_name: (string)$row['component_element'],
            uri: (string)$row['component_uri'],
            version: (string)$row['version'],
            framework: (string)$row['framework'],
            entry: (string)$row['entry_path'],
            cssPath: $row['css_path'] !== null ? (string)$row['css_path'] : null,
            integrity: $row['integrity'] !== null ? (string)$row['integrity'] : null,
            renderMode: (string)$row['render_mode'],
            themeAware: (bool)$row['theme_aware'],
            exposeParts: $exposeParts,
            exports: $exports,
            dependencies: $dependencies,
            breadcrumbLabel: $row['breadcrumb_label'] !== null ? (string)$row['breadcrumb_label'] : null,
        );
    }

    public function getManifestByComponentId(string $uuid): ?ComponentManifestDto
    {
        $sql = "SELECT 
            c.id AS component_id, BIN_TO_UUID(c.public_id) AS component_public_id, c.name AS component_name,  c.tag as component_tag, c.el_name AS component_element, c.uri AS component_uri, c.framework, cv.render_mode, cv.theme_aware, cv.expose_parts,
            cv.breadcrumb_label,
            cv.id AS component_version_id, cv.version, cv.entry_path, cv.css_path, cv.integrity, cv.exports_json, cv.status
            FROM component c
            INNER JOIN component_version cv
               ON cv.id = c.active_version_id
               AND cv.status = 'active'
            WHERE c.public_id = UUID_TO_BIN(:public_id)
            LIMIT 1";

        $row = $this->db()->fetchAssociative($sql, [
            'public_id' => $uuid,
        ]);

        if (empty($row)) {
            return null;
        }

        $componentVersionId = (int)$row['component_version_id'];

        $dependencies = $this->getDependenciesByComponentVersionId($componentVersionId);

        $exports = json_decode((string)$row['exports_json'], true);
        if (!is_array($exports)) {
            $exports = [];
        }
        $exposeParts = json_decode((string)$row['expose_parts'], true);
        if (!is_array($exposeParts)) {
            $exposeParts = [];
        }

        return new ComponentManifestDto(
            id: (string)$row['component_public_id'],
            name: (string)$row['component_name'],
            tag: (string)$row['component_tag'],
            el_name: (string)$row['component_element'],
            uri: (string)$row['component_uri'],
            version: (string)$row['version'],
            framework: (string)$row['framework'],
            entry: (string)$row['entry_path'],
            cssPath: $row['css_path'] !== null ? (string)$row['css_path'] : null,
            integrity: $row['integrity'] !== null ? (string)$row['integrity'] : null,
            renderMode: (string)$row['render_mode'],
            themeAware: (bool)$row['theme_aware'],
            exposeParts: $exposeParts,
            exports: $exports,
            dependencies: $dependencies,
            breadcrumbLabel: $row['breadcrumb_label'] !== null ? (string)$row['breadcrumb_label'] : null,
        );
    }

    public function getComponentWithActiveVersion()
    {

    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getDependenciesByComponentVersionId(int $componentVersionId): array
    {
        $sql = "SELECT
                BIN_TO_UUID(dc.public_id) AS id,
                dc.tag,
                dc.el_name,
                dc.uri,
                d.required,
                d.type,
                d.sort_order,
                d.mount_id,
                d.path
            FROM component_dependency d
            INNER JOIN component dc
                ON dc.id = d.dependency_component_id
            WHERE d.component_version_id = :component_version_id
            ORDER BY d.sort_order ASC, d.id ASC";

        $rows = $this->db()->fetchAllAssociative($sql, [
            'component_version_id' => $componentVersionId,
        ]);

        $dependencies = [];

        foreach ($rows as $row) {
            $dependencies[] = [
                'id'        => (string)$row['id'],
                'tag'       => (string)$row['tag'],
                'el_name'   => (string)$row['el_name'],
                'required'  => (bool)$row['required'],
                'type'      => $row['type'] ?? 'inline',
                'sortOrder' => (int)$row['sort_order'],
                'mount_id'  => $row['mount_id'] !== null ? (string)$row['mount_id'] : null,
                'path'      => $row['path'] !== null ? (string)$row['path'] : null,
            ];
        }

        return $dependencies;
    }

    private function normalizeUri(string $uri): string
    {
        $normalizedUri = trim($uri);

        if ($normalizedUri === '') {
            return '/';
        }

        if ($normalizedUri[0] !== '/') {
            $normalizedUri = '/' . $normalizedUri;
        }

        return $normalizedUri;
    }

    protected function connectionName(): string
    {
        return 'components';
    }
}