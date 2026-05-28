<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findOrCreateByGithub(string $githubId, string $email, string $firstName): User
    {
        // Try to find by GitHub ID first
        $user = $this->findOneBy(['githubId' => $githubId]);
        if ($user) {
            return $user;
        }

        // Wrap find-or-create in a transaction to prevent race conditions
        $em = $this->getEntityManager();

        return $em->wrapInTransaction(function () use ($githubId, $email, $firstName, $em): User {
            // Re-check inside the transaction
            $user = $this->findOneBy(['githubId' => $githubId]);
            if ($user) {
                return $user;
            }

            // Try to find by email, but only if it's not a synthesised private-email address
            // (those encode the githubId and won't match any real email from another provider).
            if (!str_ends_with($email, '@github-private.users.noreply.github.com')) {
                $user = $this->findOneBy(['email' => $email]);
                if ($user) {
                    $user->setGithubId($githubId);
                    $em->flush();

                    return $user;
                }
            }

            // Create a new user
            $user = new User();
            $user->setGithubId($githubId);
            $user->setEmail($email);
            $user->setFirstName($firstName);

            $em->persist($user);
            $em->flush();

            return $user;
        });
    }
}
