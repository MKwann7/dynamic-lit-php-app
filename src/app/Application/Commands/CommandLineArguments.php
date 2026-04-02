<?php

declare(strict_types=1);

namespace Application\Commands;

class CommandLineArguments
{
    public bool $blnForceCommands = false;

    public function getCommandLineArguments(): array|null
    {
        if (empty($_SERVER['argv'])) {
            return null;
        }

        $arCommandsFromCommandLine = $_SERVER['argv'];
        unset($arCommandsFromCommandLine[0]);

        if (empty($arCommandsFromCommandLine) || !is_array($arCommandsFromCommandLine) || count($arCommandsFromCommandLine) === 0) {
            return null;
        }

        $this->checkForForceCommandArgument($arCommandsFromCommandLine);

        return $arCommandsFromCommandLine;
    }

    protected function checkForForceCommandArgument(&$arCommandsFromCommandLine): void
    {
        if (in_array("force", $arCommandsFromCommandLine, true)) {
            $this->blnForceCommands = true;

            foreach ($arCommandsFromCommandLine as $currCommandLineIndex => $currCommandLinePhrase) {
                if (strtolower($currCommandLinePhrase) == "force") {
                    unset($arCommandsFromCommandLine[$currCommandLineIndex]);
                }
            }

            if (count($arCommandsFromCommandLine) === 0) {
                $arCommandsFromCommandLine = null;
            }
        }
    }
}