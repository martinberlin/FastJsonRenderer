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

    #[ORM\Column(options: ['default' => 0])]
    private int $rotation = 0;

    /** @var array<int, array<string, mixed>> */
    #[ORM\Column(type: Types::JSON)]
    private array $items = [];

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'screens')]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $user = null;

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

    public function getRotation(): int
    {
        return $this->rotation;
    }

    public function setRotation(int $rotation): static
    {
        $this->rotation = $rotation;

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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    /**
     * Export screen as FastJsonDL-compatible JSON payload.
     * Editor-only fields (e.g. `preview` on loadG5Image items) are stripped.
     *
     * @return array<string, mixed>
     */
    public function toFastJsonDL(): array
    {
        $exportItems = array_map(static function (array $item): array {
            // 'preview' is a base64 PNG stored for the editor's live display only;
            // the firmware loadG5Image does not need it.
            if (($item['type'] ?? '') === 'loadG5Image') {
                unset($item['preview']);
            }
            return $item;
        }, $this->items);

        return [
            'display_bpp' => $this->displayBpp,
            'rotation'    => $this->rotation,
            'clear' => true,
            'items' => $exportItems,
        ];
    }
}
