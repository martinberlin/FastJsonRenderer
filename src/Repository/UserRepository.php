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

        // Try to find by email (user may have registered through another provider)
        $user = $this->findOneBy(['email' => $email]);
        if ($user) {
            $user->setGithubId($githubId);
            $this->getEntityManager()->flush();

            return $user;
        }

        // Create a new user
        $user = new User();
        $user->setGithubId($githubId);
        $user->setEmail($email);
        $user->setFirstName($firstName);

        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();

        return $user;
    }
}
