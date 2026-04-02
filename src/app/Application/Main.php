<?php

declare(strict_types=1);

namespace Application;

use Application\Commands\CommandLineArguments;
use Application\Commands\Commands;
use Application\Routing\Request\HttpRequest;
use Application\Routing\Router;
use Application\ServiceManagement\Services;
use Code\Services\Auth\JwtAuthService;
use Exception;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\Routing\Exception\MethodNotAllowedException;
use Symfony\Component\Routing\Exception\ResourceNotFoundException;
use Symfony\Component\Routing\Exception\RouteNotFoundException;

readonly class Main
{
    private Commands $commands;
    private Services $services;
    private HttpRequest $request;

    /**
     * All initial dependencies are hydrated in this construct, so unit testing this is not expected.
     */
    public function __construct(
        private string $basePath,
        private string $appType,
    ) {
        $this->services = new Services(new ContainerBuilder());
        $this->commands = new Commands(new CommandLineArguments());
        $this->request = new HttpRequest();
    }

    /**
     * The main entrance for running this as a server. /packages/dist/index.php executes this.
     */
    public function runServer(): void
    {
        $router = new Router($this->services);
        $request = $this->request->getHttpRequest();

        $this->services->initializeRequestContext($request);
        $identity = $this->services
            ->getIdentityRegistrationManager()
            ->getIdentity();

        if ($identity === null) {
            http_response_code(404);
            echo 'Unknown application domain.';
            return;
        } else {
            $redirect = $this->services
                ->getIdentitySchemeService()
                ->getRedirectResponse($request, $identity);

            if ($redirect !== null) {
                $redirect->send();
                return;
            }
        }

        try {
            $router->processRoutingMatch($request);
        } catch (ResourceNotFoundException $e) {
            echo "Route not found: " . $e->getMessage();
        } catch (RouteNotFoundException $e) {
            echo "An error occurred: " . $e->getMessage();
            debug_print_backtrace();
        } catch (MethodNotAllowedException $e) {
            echo "Http method not allowed.";
        } catch (Exception $e) {
            echo "An error occurred: " . $e->getMessage();
            debug_print_backtrace();
        }
    }

    /**
     * The main entrance for running this as a cli command. /packages/app/command executes this.
     *
     * @throws Exception
     */
    public function runCommands(): void
    {
        $this->commands->run();
    }
}