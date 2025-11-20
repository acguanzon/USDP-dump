<?php
declare(strict_types=1);

namespace App\Models;

class Token
{
    public string $code;
    public ?int $expiresAt;

    public static function fromArray(array $row): self
    {
        $t = new self();
        $t->code = (string) ($row['code'] ?? '');
        $t->expiresAt = isset($row['expires_at']) ? (int) $row['expires_at'] : null;
        return $t;
    }

    public function toOutput(): array
    {
        return ['code' => $this->code, 'expiresAt' => $this->expiresAt];
    }
}