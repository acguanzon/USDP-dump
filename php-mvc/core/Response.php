<?php
declare(strict_types=1);

namespace Core;

class Response
{
    private int $status = 200;
    private array $headers = [];
    private string $body = '';

    public function status(int $code): self
    {
        $this->status = $code;
        return $this;
    }

    public function header(string $key, string $value): self
    {
        $this->headers[$key] = $value;
        return $this;
    }

    public function json(array $data, int $code = 200): self
    {
        $this->status = $code;
        $this->headers['Content-Type'] = 'application/json';
        $this->body = json_encode($data, JSON_UNESCAPED_SLASHES);
        return $this;
    }

    public function text(string $text, int $code = 200): self
    {
        $this->status = $code;
        $this->headers['Content-Type'] = 'text/plain; charset=utf-8';
        $this->body = $text;
        return $this;
    }

    public function send(): string
    {
        http_response_code($this->status);
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        foreach ($this->headers as $k => $v) {
            header($k . ': ' . $v);
        }
        return $this->body;
    }
}