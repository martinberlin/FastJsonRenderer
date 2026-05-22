<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Initial migration: creates the screen table.
 */
final class Version20260522000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Creates the screen table for ePaper screen designs';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE screen (
                id INT AUTO_INCREMENT NOT NULL,
                title VARCHAR(255) NOT NULL,
                display_type VARCHAR(50) NOT NULL DEFAULT 'ED052TC4',
                display_width INT NOT NULL DEFAULT 1280,
                display_height INT NOT NULL DEFAULT 780,
                display_bpp INT NOT NULL DEFAULT 4,
                items JSON NOT NULL,
                created_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                updated_at DATETIME NOT NULL COMMENT '(DC2Type:datetime_immutable)',
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE screen');
    }
}
