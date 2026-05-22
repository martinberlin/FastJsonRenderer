<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Serves the React single-page application for all non-API routes.
 */
class AppController extends AbstractController
{
    #[Route('/{reactRouting}', name: 'app_index', requirements: ['reactRouting' => '^(?!api).*'], defaults: ['reactRouting' => null], priority: -1)]
    public function index(): Response
    {
        return $this->render('app/index.html.twig');
    }
}
