<?php

namespace Code\Controllers\Api\Components;

use Application\Helper\BaseController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ComponentsController extends BaseController
{
    public const array URI_PARAMETERS_BY_URI = [
        "uri" => [null, "string"]
    ];

    public const string CONTROLLER_MANIFEST_BY_URI = "api/v1/components/resolve-by-uri";

    public function resolveByUri(): Response
    {
        $uri = trim((string) $this->getRequest()->query->get('uri', ''));

        if ($uri === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'The "uri" query parameter is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $manifest = $this->services()
            ->getComponentService()
            ->resolveByUri($uri);

        if ($manifest === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'No manifest found for uri: ' . $uri,
            ], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse([
            'success' => true,
            'data'    => $manifest->toArray(),
        ], Response::HTTP_OK);
    }

    public const string CONTROLLER_MANIFEST_BY_URI_DIRECT = "api/v1/components/manifest-by-uri";

    public function getManifestByUri(): Response
    {
        $uri = trim((string) $this->getRequest()->query->get('uri', ''));

        if ($uri === '') {
            return new JsonResponse([
                'success' => false,
                'message' => 'The "uri" query parameter is required.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $manifest = $this->services()
            ->getComponentService()
            ->getManifestByUri($uri);

        if ($manifest === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'No manifest found for uri: ' . $uri,
            ], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse([
            'success' => true,
            'data'    => $manifest->toArray(),
        ], Response::HTTP_OK);
    }

    public const array URI_PARAMETERS_BY_UUID = [
        "uuid" => [null, "string"]
    ];

    public const string CONTROLLER_MANIFEST_BY_UUID = "api/v1/components/{uuid}/manifest";

    public function getManifestByUuid(): Response
    {
        $uuid = $this->getRequest()->attributes->get('uuid');

        $manifest = $this->services()
            ->getComponentService()
            ->getManifestByComponentId($uuid);

        if ($manifest === null) {
            return new JsonResponse([
                'success' => false,
                'message' => 'No manifest found for uuid: ' . $uuid,
            ], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse([
            'success' => true,
            'data'    => $manifest->toArray(),
        ], Response::HTTP_OK);
    }
}