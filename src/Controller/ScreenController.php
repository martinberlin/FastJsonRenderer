<?php

namespace App\Controller;

use App\Entity\Screen;
use App\Repository\ScreenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/screens', name: 'api_screen_')]
class ScreenController extends AbstractController
{
    public function __construct(
        private readonly ScreenRepository $screenRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * List all screens (summary only).
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $screens = $this->screenRepository->findBy([], ['updatedAt' => 'DESC']);

        $data = array_map(fn(Screen $s) => [
            'id' => $s->getId(),
            'title' => $s->getTitle(),
            'displayType' => $s->getDisplayType(),
            'displayWidth' => $s->getDisplayWidth(),
            'displayHeight' => $s->getDisplayHeight(),
            'displayBpp' => $s->getDisplayBpp(),
            'itemCount' => count($s->getItems()),
            'createdAt' => $s->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updatedAt' => $s->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
        ], $screens);

        return $this->json($data);
    }

    /**
     * Create a new screen.
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        $screen = new Screen();
        $this->hydrateScreen($screen, $payload);

        $this->em->persist($screen);
        $this->em->flush();

        return $this->json($this->serializeScreen($screen), Response::HTTP_CREATED);
    }

    /**
     * Get a single screen with all items.
     */
    #[Route('/{id}', name: 'get', methods: ['GET'])]
    public function get(int $id): JsonResponse
    {
        $screen = $this->screenRepository->find($id);
        if (!$screen) {
            return $this->json(['error' => 'Screen not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeScreen($screen));
    }

    /**
     * Update an existing screen.
     */
    #[Route('/{id}', name: 'update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $screen = $this->screenRepository->find($id);
        if (!$screen) {
            return $this->json(['error' => 'Screen not found'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        $this->hydrateScreen($screen, $payload);
        $this->em->flush();

        return $this->json($this->serializeScreen($screen));
    }

    /**
     * Delete a screen.
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $screen = $this->screenRepository->find($id);
        if (!$screen) {
            return $this->json(['error' => 'Screen not found'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($screen);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Export screen as FastJsonDL-compatible JSON.
     */
    #[Route('/{id}/export', name: 'export', methods: ['GET'])]
    public function export(int $id): JsonResponse
    {
        $screen = $this->screenRepository->find($id);
        if (!$screen) {
            return $this->json(['error' => 'Screen not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($screen->toFastJsonDL(), headers: [
            'Content-Disposition' => sprintf('attachment; filename="%s.json"', preg_replace('/[^a-z0-9_-]/i', '_', $screen->getTitle())),
        ]);
    }

    // ------------------------------------------------------------------ helpers

    /** @param array<string, mixed> $payload */
    private function hydrateScreen(Screen $screen, array $payload): void
    {
        if (isset($payload['title']) && is_string($payload['title'])) {
            $screen->setTitle(trim($payload['title']) ?: 'Untitled Screen');
        }
        if (isset($payload['displayType']) && is_string($payload['displayType'])) {
            $screen->setDisplayType($payload['displayType']);
        }
        if (isset($payload['displayWidth']) && is_int($payload['displayWidth'])) {
            $screen->setDisplayWidth($payload['displayWidth']);
        }
        if (isset($payload['displayHeight']) && is_int($payload['displayHeight'])) {
            $screen->setDisplayHeight($payload['displayHeight']);
        }
        if (isset($payload['displayBpp']) && is_int($payload['displayBpp'])) {
            $screen->setDisplayBpp($payload['displayBpp']);
        }
        if (isset($payload['items']) && is_array($payload['items'])) {
            $screen->setItems($payload['items']);
        }
    }

    /** @return array<string, mixed> */
    private function serializeScreen(Screen $screen): array
    {
        return [
            'id' => $screen->getId(),
            'title' => $screen->getTitle(),
            'displayType' => $screen->getDisplayType(),
            'displayWidth' => $screen->getDisplayWidth(),
            'displayHeight' => $screen->getDisplayHeight(),
            'displayBpp' => $screen->getDisplayBpp(),
            'items' => $screen->getItems(),
            'createdAt' => $screen->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updatedAt' => $screen->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
