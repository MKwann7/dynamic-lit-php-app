<?php

declare(strict_types=1);

namespace Application\Routing;

use Application\Routing\Instance\RouteCollection;
use Application\Routing\Instance\RouteInstance;
use Application\Routing\Parameters\RouteParameterCollection;
use Application\ServiceManagement\Services;
use Code\Controllers\Api\Components\ComponentsController;
use Code\Controllers\Api\Sites\SitesController;
use Code\Controllers\Api\Users\UsersController;
use Code\Controllers\Api\Whitelabels\WhitelabelController;
use Code\Controllers\Auth\SessionAuthController;
use Code\Controllers\Auth\UserAuthController;
use Code\Controllers\Auth\AuthController;
use Code\Services\Middleware\MiddlewareRunner;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Matcher\UrlMatcher;
use Symfony\Component\Routing\RequestContext;

class Router
{
    private RouteCollection $routeCollection;

    public function __construct(
        private readonly Services $services
    ) {
        $this->routeCollection = new RouteCollection();
        $this->services->registerRouting($this->registerRoutes());
    }

    public function registerRoutes(): RouteCollection
    {
        // Authentication Routing
        $this->routeCollection->load([
            "api/v1/auth/session::post" => new RouteInstance(
                SessionAuthController::CONTROLLER_URI,
                SessionAuthController::class,
                'run',
                'POST',
                ['auth:global']
            ),
            "login:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_LOGIN,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "account:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_ACCOUNT,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "administrator:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_ADMIN,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "create-account:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_CREATE_ACCOUNT,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "forgot-password:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_PASSWORD_RESET,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "persona:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_PERSONA,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "group:get" => new RouteInstance(
                AuthController::CONTROLLER_URI_GROUP,
                AuthController::class,
                'run',
                'GET',
                ['auth:global']
            ),
            "api/v1/auth/login::post" => new RouteInstance(
                UserAuthController::CONTROLLER_URI,
                UserAuthController::class,
                'run',
                'POST',
                ['auth:session_or_user']
            ),
        ]);

        // API Specific Routing for Sites
        $this->routeCollection->load([
            "api/v1/sites/{site_uuid}/check-unique::get" => new RouteInstance(
                SitesController::CONTROLLER_URI_CHECK_UNIQUE,
                SitesController::class,
                'checkUnique',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        SitesController::URI_PARAMETERS_BY_UUID
                    )
            ),
            "api/v1/sites::get" => new RouteInstance(
                SitesController::CONTROLLER_URI_SITE,
                SitesController::class,
                'getList',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters([])
            ),
            "api/v1/sites/{site_uuid}::get" => new RouteInstance(
                SitesController::CONTROLLER_URI_BY_UUID,
                SitesController::class,
                'getById',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        SitesController::URI_PARAMETERS_BY_UUID
                    )
            ),
            "api/v1/sites/{site_uuid}::put" => new RouteInstance(
                SitesController::CONTROLLER_URI_BY_UUID,
                SitesController::class,
                'updateById',
                'PUT',
                ['auth:user_or_admin[sites.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        SitesController::URI_PARAMETERS_BY_UUID
                    )
            ),
            "api/v1/sites::post" => new RouteInstance(
                SitesController::CONTROLLER_URI_SITE,
                SitesController::class,
                'createSite',
                'POST',
                ['auth:user_or_admin[sites.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        []
                    )
            ),
            "api/v1/sites/{site_uuid}::delete" => new RouteInstance(
                SitesController::CONTROLLER_URI_BY_UUID,
                SitesController::class,
                'deleteById',
                'DELETE',
                ['auth:user_or_admin[sites.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        SitesController::URI_PARAMETERS_BY_UUID
                    )
            ),
        ]);

        // API Specific Routing for Users
        $this->routeCollection->load([
            // ── UUID-based routes (must be registered before numeric routes) ──
            "api/v1/users/{user_uuid}::get" => new RouteInstance(
                UsersController::CONTROLLER_URI_BY_UUID,
                UsersController::class,
                'getByUuid',
                'GET',
                ['auth:user_or_admin[customers.view_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        UsersController::URI_PARAMETERS_BY_UUID
                    )
            ),
            "api/v1/users/{user_uuid}::put" => new RouteInstance(
                UsersController::CONTROLLER_URI_BY_UUID,
                UsersController::class,
                'updateByUuid',
                'PUT',
                ['auth:user_or_admin[customers.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        UsersController::URI_PARAMETERS_BY_UUID
                    )
            ),
            "api/v1/users/{user_uuid}/avatar::patch" => new RouteInstance(
                UsersController::CONTROLLER_URI_AVATAR_BY_UUID,
                UsersController::class,
                'updateAvatarByUuid',
                'PATCH',
                ['auth:user_or_admin'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        UsersController::URI_PARAMETERS_BY_UUID
                    )
            ),
            // ── Collection + numeric-ID routes ────────────────────────────────
            "api/v1/users::get" => new RouteInstance(
                UsersController::CONTROLLER_URI_SITE,
                UsersController::class,
                'getList',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters([])
            ),
            "api/v1/users/{user_id}::get" => new RouteInstance(
                UsersController::CONTROLLER_URI_BY_ID,
                UsersController::class,
                'getById',
                'GET',
                ['auth:user_or_admin[customers.view_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        UsersController::URI_PARAMETERS_BY_ID
                    )
            ),
            "api/v1/users/{user_id}::put" => new RouteInstance(
                UsersController::CONTROLLER_URI_BY_ID,
                UsersController::class,
                'updateById',
                'PUT',
                ['auth:user_or_admin[customers.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        UsersController::URI_PARAMETERS_BY_ID
                    )
            ),
            "api/v1/users::post" => new RouteInstance(
                UsersController::CONTROLLER_URI_SITE,
                UsersController::class,
                'createSite',
                'POST',
                ['auth:user_or_admin[customers.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        []
                    )
            ),
            "api/v1/users/{user_id}::delete" => new RouteInstance(
                UsersController::CONTROLLER_URI_BY_ID,
                UsersController::class,
                'deleteById',
                'DELETE',
                ['auth:user_or_admin[customers.edit_all]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        UsersController::URI_PARAMETERS_BY_ID
                    )
            ),
        ]);


        // API Specific Routing for Components
        $this->routeCollection->load([
            "api/v1/components/manifest-by-uri::get" => new RouteInstance(
                ComponentsController::CONTROLLER_MANIFEST_BY_URI_DIRECT,
                ComponentsController::class,
                'getManifestByUri',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        ComponentsController::URI_PARAMETERS_BY_URI
                    )
            ),
            "api/v1/components/resolve-by-uri::get" => new RouteInstance(
                ComponentsController::CONTROLLER_MANIFEST_BY_URI,
                ComponentsController::class,
                'resolveByUri',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        ComponentsController::URI_PARAMETERS_BY_URI
                    )
            ),
            "api/v1/components/{uuid}/manifest::get" => new RouteInstance(
                ComponentsController::CONTROLLER_MANIFEST_BY_UUID,
                ComponentsController::class,
                'getManifestByUuid',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        ComponentsController::URI_PARAMETERS_BY_UUID
                    )
            ),
        ]);

        // API Specific Routing for Whitelabels
        $this->routeCollection->load([
            "api/v1/whitelabels/{whitelabel_id}::get" => new RouteInstance(
                WhitelabelController::CONTROLLER_URI_BY_ID,
                WhitelabelController::class,
                'getById',
                'GET',
                ['auth:session_or_user'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        WhitelabelController::URI_PARAMETERS_BY_ID
                    )
            ),
            "api/v1/whitelabels/{whitelabel_id}::put" => new RouteInstance(
                WhitelabelController::CONTROLLER_URI_BY_ID,
                WhitelabelController::class,
                'updateById',
                'PUT',
                ['auth:user_or_admin[platform.settings.edit]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        WhitelabelController::URI_PARAMETERS_BY_ID
                    )
            ),
            "api/v1/whitelabels::post" => new RouteInstance(
                WhitelabelController::CONTROLLER_URI_SITE,
                WhitelabelController::class,
                'createWhitelabel',
                'POST',
                ['auth:user_or_admin[platform.settings.edit]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        []
                    )
            ),
            "api/v1/whitelabels/{whitelabel_id}::delete" => new RouteInstance(
                WhitelabelController::CONTROLLER_URI_BY_ID,
                WhitelabelController::class,
                'deleteById',
                'DELETE',
                ['auth:user_or_admin[platform.settings.edit]'],
                (new RouteParameterCollection())
                    ->registerParameters(
                        WhitelabelController::URI_PARAMETERS_BY_ID
                    )
            ),
        ]);

        return $this->routeCollection;
    }

    public function processRoutingMatch(Request $request): void
    {
        $context = new RequestContext();
        $context->fromRequest($request);

        $matcher = new UrlMatcher(
            $this->services->getRouter()->getRouteCollection(),
            $context
        );

        $parameters = $matcher->match($request->getPathInfo());
        $request->attributes->add($parameters);

        $middlewareRunner = new MiddlewareRunner($this->services);
        $middlewareResponse = $middlewareRunner->handle($request, $parameters);

        if ($middlewareResponse !== null) {
            $middlewareResponse->send();
            return;
        }

        [$controller, $method] = explode('::', $parameters['_controller']);

        $controllerInstance = new $controller($request, $this->services);

        $response = call_user_func([$controllerInstance, $method]);

        $response->send();
    }
}

