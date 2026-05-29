<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Adds the rotation column to the screen table.
 * Internal rotation values: 0 = landscape (0°), 1 = portrait (90°), 2 = inverted landscape (180°), 3 = inverted portrait (270°).
 * Exported to firmware as the corresponding degree value for FastEPD setRotation().
 */
final class Version20260528000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Adds rotation column to screen table (0=0°, 1=90°, 2=180°, 3=270°)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            ALTER TABLE screen ADD rotation INT NOT NULL DEFAULT 0
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE screen DROP COLUMN rotation');
    }
}
