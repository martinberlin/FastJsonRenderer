<?php

namespace App\Entity;

use App\Repository\ScreenRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ScreenRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Table(name: 'screen')]
class Screen
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $title = 'Untitled Screen';

    #[ORM\Column(length: 50)]
    private string $displayType = 'ED052TC4';

    #[ORM\Column]
    private int $displayWidth = 1280;

    #[ORM\Column]
    private int $displayHeight = 780;

    #[ORM\Column]
    private int $displayBpp = 4;

    /** @var array<int, array<string, mixed>> */
    #[ORM\Column(type: Types::JSON)]
    private array $items = [];

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDisplayType(): string
    {
        return $this->displayType;
    }

    public function setDisplayType(string $displayType): static
    {
        $this->displayType = $displayType;

        return $this;
    }

    public function getDisplayWidth(): int
    {
        return $this->displayWidth;
    }

    public function setDisplayWidth(int $displayWidth): static
    {
        $this->displayWidth = $displayWidth;

        return $this;
    }

    public function getDisplayHeight(): int
    {
        return $this->displayHeight;
    }

    public function setDisplayHeight(int $displayHeight): static
    {
        $this->displayHeight = $displayHeight;

        return $this;
    }

    public function getDisplayBpp(): int
    {
        return $this->displayBpp;
    }

    public function setDisplayBpp(int $displayBpp): static
    {
        $this->displayBpp = $displayBpp;

        return $this;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getItems(): array
    {
        return $this->items;
    }

    /**
     * @param array<int, array<string, mixed>> $items
     */
    public function setItems(array $items): static
    {
        $this->items = $items;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    /**
     * Export screen as FastJsonDL-compatible JSON payload.
     *
     * @return array<string, mixed>
     */
    public function toFastJsonDL(): array
    {
        return [
            'display_bpp' => $this->displayBpp,
            'clear' => true,
            'items' => $this->items,
        ];
    }
}
