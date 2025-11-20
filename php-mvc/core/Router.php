<?php
declare(strict_types=1);

namespace Core;

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, array $handler): void
    {
        $this->routes[] = [$method, $path, $handler];
    }

    public function dispatch(Request $req, Response $res): void
    {
        if ($req->method() === 'OPTIONS') {
            $res->status(204);
            return;
        }
        foreach ($this->routes as [$method, $pattern, $handler]) {
            if ($req->method() !== strtoupper($method)) {
                continue;
            }
            $params = $this->match($pattern, $req->path());
            if ($params === null) {
                continue;
            }
            [$class, $action] = $handler;
            $obj = new $class();
            $obj->$action($req, $res, $params);
            return;
        }
        $res->json(['message' => 'Not found'], 404);
    }

    private function match(string $pattern, string $path): ?array
    {
        $a = array_values(array_filter(explode('/', $pattern), fn($s) => $s !== ''));
        $b = array_values(array_filter(explode('/', $path), fn($s) => $s !== ''));
        if (count($a) !== count($b)) {
            return null;
        }
        $params = [];
        foreach ($a as $i => $seg) {
            if (str_starts_with($seg, ':')) {
                $params[substr($seg, 1)] = $b[$i];
            } elseif ($seg !== $b[$i]) {
                return null;
            }
        }
        return $params;
    }
}