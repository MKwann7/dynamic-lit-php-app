<?php

declare(strict_types=1);

namespace Code\Services\View;

final class HtmlPageRenderer
{
    public function __construct(
        private readonly string $viewsPath
    ) {
    }

    public function render(string $template, array $data = []): string
    {
        $templatePath = rtrim($this->viewsPath, '/\\') . '/' . $template . '.html.php';

        if (!is_file($templatePath)) {
            throw new \RuntimeException("View template not found: {$templatePath}");
        }

        extract($data, EXTR_SKIP);

        ob_start();

        try {
            require $templatePath;
            return (string) ob_get_clean();
        } catch (\Throwable $e) {
            ob_end_clean();
            throw $e;
        }
    }
}