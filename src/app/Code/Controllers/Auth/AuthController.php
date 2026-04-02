<?php

declare(strict_types=1);

namespace Code\Controllers\Auth;

use Application\Helper\BaseController;
use Symfony\Component\HttpFoundation\Response;

final class AuthController extends BaseController
{
    public const string CONTROLLER_URI_LOGIN          = "/login{trail}";
    public const string CONTROLLER_URI_ACCOUNT        = "/account{trail}";
    public const string CONTROLLER_URI_CREATE_ACCOUNT = "/create-account{trail}";
    public const string CONTROLLER_URI_PASSWORD_RESET = "/forgot-password{trail}";
    public const string CONTROLLER_URI_ADMIN          = "/administrator{trail}";
    public const string CONTROLLER_URI_PERSONA        = "/persona{trail}";
    public const string CONTROLLER_URI_GROUP          = "/group{trail}";

    public function run(): Response
    {
        return $this->returnBasePage();
    }
}