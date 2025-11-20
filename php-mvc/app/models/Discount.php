<?php
declare(strict_types=1);

namespace App\Models;

class Discount
{
    public string $id;
    public string $title;
    public string $description;
    public string $eligibility;
    public bool $isActive;

    public static function fromArray(array $row): self
    {
        $d = new self();
        $d->id = (string) ($row['id'] ?? '');
        $d->title = (string) ($row['title'] ?? '');
        $d->description = (string) ($row['description'] ?? '');
        $d->eligibility = (string) ($row['eligibility'] ?? '');
        $d->isActive = ((int) ($row['is_active'] ?? 1)) === 1;
        return $d;
    }

    public function toOutput(): array
    {
        return ['_id' => $this->id, 'title' => $this->title, 'description' => $this->description, 'eligibility' => $this->eligibility, 'isActive' => $this->isActive];
    }
}