<?php
declare(strict_types=1);

namespace App\Models;

class User
{
    public string $id;
    public string $name;
    public string $email;
    public string $role;

    public static function fromArray(array $row): self
    {
        $u = new self();
        $u->id = (string) ($row['id'] ?? '');
        $u->name = (string) ($row['name'] ?? '');
        $u->email = (string) ($row['email'] ?? '');
        $u->role = (string) ($row['role'] ?? 'user');
        return $u;
    }

    public function toOutput(): array
    {
        return ['_id' => $this->id, 'name' => $this->name, 'email' => $this->email, 'role' => $this->role];
    }
}