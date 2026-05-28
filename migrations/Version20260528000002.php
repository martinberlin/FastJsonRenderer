<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Adds the rotation column to the screen table.
 * 0 = landscape (default), 1 = portrait (90° rotation via FastEPD setRotation).
 */
final class Version20260528000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Adds rotation column to screen table (0=landscape, 1=portrait)';
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
