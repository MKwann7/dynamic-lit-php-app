<?php

declare(strict_types=1);

namespace Application\Routing;

use Application\Routing\Instance\RouteCollection;
use Application\Routing\Instance\RouteInstance;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\Routing\RouteCollection as SymfonyRouteCollection;
use Symfony\Component\Routing\Route;

class RouteControllerRegistrar
{
    protected SymfonyRouteCollection $routes;

    public function __construct(
        private readonly ContainerBuilder $container
    ) {
        $this->routes = new SymfonyRouteCollection();
    }

    public function registerRoutesAndControllers(RouteCollection $routeCollection): void
    {
        $routeCollection->Foreach(function (RouteInstance $instance) {
            [$routeDetails, $requirements] = $instance->generateRouteArray();

            // Extract the controller class and method
            $controller = $routeDetails['_controller'];
            $controllerClass = $controller[0];  // e.g., BlogController::class
            $controllerMethod = $controller[1]; // e.g., 'list'
            $httpVerb = $routeDetails['_verb'];  // HTTP Verb (e.g., GET, POST)

            // Combine controller class and method for Symfony to use
            $routeDetails['_controller'] = $controllerClass . '::' . $controllerMethod;
            $routeDetails['_middleware'] = $instance->getMiddleware();

            // Remove the _verb from the routeDetails
            unset($routeDetails['_verb']);

            // Create and add the route
            $route = new Route($instance->getUriPath(), $routeDetails, $requirements);
            $route->setMethods([$httpVerb]);  // Define the HTTP method this route accepts

            // This allows for controllers to have multiple GET, POST, PUT, and DELETE processes.
            $routeName = strtolower(
                str_replace(['\\', '/', '{', '}', ':'], '_', $controllerClass . '_' . $controllerMethod . '_' . $httpVerb . '_' . $instance->getUriPath())
            );
            $this->routes->add($routeName, $route);

            // Set the RouteCollection into the container
            $this->container->set(SymfonyRouteCollection::class, $this->routes);

            // Register the controller in the container
            $this->container->register($controllerClass, $controllerClass)
                ->setPublic(true);
        });

        // Compile the container after registration
        $this->container->compile();
    }

    public function getContainer(): ContainerBuilder
    {
        return $this->container;
    }
}