<?php
declare(strict_types=1);

namespace App\Models;

class Application
{
    public string $title;
    public string $status;
    public int $appliedAt;

    public static function fromArray(array $row): self
    {
        $a = new self();
        $a->title = (string) ($row['title'] ?? '');
        $a->status = (string) ($row['status'] ?? 'pending');
        $a->appliedAt = (int) ($row['applied_at'] ?? time());
        return $a;
    }

    public function toOutput(): array
    {
        return ['title' => $this->title, 'status' => $this->status, 'appliedAt' => $this->appliedAt];
    }
}