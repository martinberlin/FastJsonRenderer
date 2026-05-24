<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Serves the React single-page application for all non-API routes,
 * plus the /api/me endpoint that exposes session user info to the SPA.
 */
class AppController extends AbstractController
{
    #[Route('/{reactRouting}', name: 'app_index', requirements: ['reactRouting' => '^(?!api).*'], defaults: ['reactRouting' => null], priority: -1)]
    public function index(): Response
    {
        return $this->render('app/index.html.twig');
    }

    /**
     * Returns the currently authenticated user's info, or null if not logged in.
     */
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(null);
        }

        return $this->json([
            'id' => $user->getId(),
            'firstName' => $user->getFirstName(),
            'email' => $user->getEmail(),
        ]);
    }
}
