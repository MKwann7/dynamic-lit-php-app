<?php

declare(strict_types=1);

namespace Code\Services\Auth;

final readonly class JwtAuthMiddleware
{
    public function __construct(
        private JwtService $jwtService
    ) {
    }

    public function handle(callable $next): void
    {
        $payload = $this->jwtService->tryDecodeFromServerArray($_SERVER);

        if ($payload === null) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized',
            ]);
            exit;
        }

        $_REQUEST['_auth'] = $payload;
        $_REQUEST['_auth_user_id'] = isset($payload['sub']) ? (int)$payload['sub'] : null;

        $next();
    }
}