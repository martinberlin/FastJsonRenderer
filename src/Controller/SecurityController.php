<?php

namespace App\Controller;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class SecurityController extends AbstractController
{
    #[Route('/login', name: 'app_login')]
    public function login(): Response
    {
        return $this->render('security/login.html.twig');
    }

    #[Route('/connect/github', name: 'connect_github_start')]
    public function connectGithub(ClientRegistry $clientRegistry): Response
    {
        return $clientRegistry->getClient('github')->redirect(['user:email'], []);
    }

    #[Route('/connect/github/check', name: 'connect_github_check')]
    public function connectGithubCheck(): Response
    {
        // This route is handled by GithubAuthenticator – the controller body is never reached.
        return new Response('', Response::HTTP_NO_CONTENT);
    }

    #[Route('/logout', name: 'app_logout')]
    public function logout(): never
    {
        // Handled by Symfony's logout listener.
        throw new \LogicException('This should never be reached.');
    }
}
