<?php

declare(strict_types=1);

namespace Application\Commands;

use http\Client\Request;
use Exception;

class Commands
{
    public function __construct(
        private CommandLineArguments $commandLineArguments,
    ) {
    }

    public function run(Request $request = null): void
    {
        ini_set('memory_limit', '-1');
        set_time_limit(3000);

        $this->loadCommands();

        try {
            $commandsFromCommandLine = $this->commandLineArguments->getCommandLineArguments();
        }
        catch(Exception $exception)
        {
            throw new Exception(date("Y-m-d"). "_Application.RunCommands.Error.log", $exception . PHP_EOL . trace());
        }

    }

    private function loadCommands(): void
    {

    }
}