<?php

declare(strict_types=1);

namespace App\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Adds the user table and a nullable user_id foreign key on screen.
 */
final class Version20260524000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Adds user table and user_id FK on screen for OAuth login support';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE `user` (
                id INT AUTO_INCREMENT NOT NULL,
                email VARCHAR(255) NOT NULL,
                first_name VARCHAR(255) NOT NULL,
                github_id VARCHAR(255) DEFAULT NULL,
                roles JSON NOT NULL,
                UNIQUE INDEX UNIQ_8D93D649E7927C74 (email),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<'SQL'
            ALTER TABLE screen
                ADD user_id INT DEFAULT NULL,
                ADD CONSTRAINT FK_DF4C6130A76ED395
                    FOREIGN KEY (user_id) REFERENCES `user` (id)
        SQL);

        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_DF4C6130A76ED395 ON screen (user_id)
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE screen DROP FOREIGN KEY FK_DF4C6130A76ED395');
        $this->addSql('ALTER TABLE screen DROP INDEX IDX_DF4C6130A76ED395');
        $this->addSql('ALTER TABLE screen DROP COLUMN user_id');
        $this->addSql('DROP TABLE `user`');
    }
}
