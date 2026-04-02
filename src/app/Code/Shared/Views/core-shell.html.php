<?php

declare(strict_types=1);

/**
 * Expected variables:
 *
 * @var string|null $pageTitle
 * @var array<string, mixed>|null $bootstrap
 * @var string|null $bootstrapCssUrl
 * @var string|null $appJsUrl
 * @var string|null $faviconUrl
 */

$pageTitle = $pageTitle ?? 'Maxr';
$bootstrap = $bootstrap ?? [];
$bootstrapCssUrl = $bootstrapCssUrl ?? 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
$appJsUrl = $appJsUrl ?? '/assets/runtime/dyn-component-manager.js';
$faviconUrl = $faviconUrl ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>

    <?php if (!empty($faviconUrl)): ?>
        <link rel="icon" href="<?= htmlspecialchars($faviconUrl, ENT_QUOTES, 'UTF-8') ?>">
    <?php endif; ?>

    <link
        href="<?= htmlspecialchars($bootstrapCssUrl, ENT_QUOTES, 'UTF-8') ?>"
        rel="stylesheet"
        integrity=""
        crossorigin="anonymous">
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css"
        integrity="sha512-+4zCK9k+qNFUR5X+cKL9EIR+ZOhtIloNl9GIKS57V1MyNsYpYcUrUeQc9vNfzsWfV28IaLL3i96P9sdNyeRssA=="
        crossorigin="anonymous"
        defer="">

    <style>
        html, body {
            min-height: 100%;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: #fff;
        }

        #app-shell,
        #app-root {
            min-height: 100vh;
        }
    </style>

    <script>
        window.__MAXR_BOOTSTRAP__ = <?= json_encode(
            $bootstrap,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        ) ?>;
    </script>
</head>
<body class="theme_shade_light">
<div id="app-shell">
    <div id="app-root"></div>
</div>

<script type="importmap">
    {
      "imports": {
        "lit": "/assets/runtime/vendor/lit.js",
        "lit/decorators.js": "/assets/runtime/vendor/lit.js",
        "@maxr/shared": "/assets/runtime/index.js",
        "@maxr/shared/runtime-widget": "/assets/runtime/runtime-widget.js",
        "@maxr/shared/types": "/assets/runtime/types.js"
      }
    }
</script>
<script type="module">
    import { DynComponentManager } from "<?= htmlspecialchars($appJsUrl, ENT_QUOTES, 'UTF-8') ?>";

    document.addEventListener("DOMContentLoaded", async () => {
        const root = document.getElementById("app-root");
        const boot = window.__MAXR_BOOTSTRAP__ || {};

        if (!root) {
            console.error("Dyn bootstrap failed: #app-root not found.");
            return;
        }

        const manager = new DynComponentManager({
            rootElement: root,
            bootstrap: boot,
            currentPath: window.location.pathname,
            queryString: window.location.search,
            hash: window.location.hash
        });

        await manager.run();
    });
</script>
</body>
</html>