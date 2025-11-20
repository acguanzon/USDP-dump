<?php
declare(strict_types=1);

namespace App\Controllers;

use Core\Request;
use Core\Response;

class HealthController
{
    public function status(Request $req, Response $res, array $params = []): void
    {
        $res->json(['status' => 'ok']);
    }
}