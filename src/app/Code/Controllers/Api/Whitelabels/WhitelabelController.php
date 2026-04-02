<?php

namespace Code\Controllers\Api\Whitelabels;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class WhitelabelController
{
    public const array URI_PARAMETERS_BY_ID = [
        "whitelabel_id" => [null, "number"]
    ];

    public const string CONTROLLER_URI_BY_ID = "/api/v1/whitelabels/{whitelabel_id}";
    public function getById(): Response
    {

        return new JsonResponse(["Test" => "Found!"], Response::HTTP_OK);
    }
    public function updateById(): Response
    {

        return new JsonResponse(["Test" => "Updated!"], Response::HTTP_OK);
    }
    public function deleteById(): Response
    {

        return new JsonResponse(["Test" => "Deleted!"], Response::HTTP_OK);
    }

    public const string CONTROLLER_URI_SITE = "/api/v1/whitelabels";
    public function createWhitelabel(): Response
    {

        return new JsonResponse(["Test" => "Created!"], Response::HTTP_OK);
    }
}