<?php
declare(strict_types=1);

namespace Core;

class Request
{
    private string $method;
    private string $path;
    private array $query;
    private array $headers;
    private array $body;
    private ?array $user;

    private function __construct(string $method, string $path, array $query, array $headers, array $body, ?array $user)
    {
        $this->method = $method;
        $this->path = $path;
        $this->query = $query;
        $this->headers = $headers;
        $this->body = $body;
        $this->user = $user;
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $query = $_GET ?? [];
        $headers = function_exists('getallheaders') ? (array) getallheaders() : [];
        $raw = file_get_contents('php://input') ?: '';
        $body = [];
        if ($raw !== '') {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                $body = $json;
            }
        }
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $token = null;
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            $token = substr($auth, 7);
        }
        $user = null;
        if ($token) {
            $user = Jwt::verify($token);
        }
        return new self(strtoupper($method), $path, $query, $headers, $body, $user);
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function query(string $key, mixed $default = null): mixed
    {
        return $this->query[$key] ?? $default;
    }

    public function body(): array
    {
        return $this->body;
    }

    public function header(string $key, ?string $default = null): ?string
    {
        foreach ($this->headers as $k => $v) {
            if (strtolower($k) === strtolower($key)) {
                return is_string($v) ? $v : $default;
            }
        }
        return $default;
    }

    public function user(): ?array
    {
        return $this->user;
    }
}