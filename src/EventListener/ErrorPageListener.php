<?php

namespace Aliarteo\AliDocsBundle\EventListener;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Twig\Environment;

/**
 * Error pages (404, 403, 500...) of the documentations, displayed with the documentation layout.
 *
 * - Only for the routes of the bundle (ali_docs_*), and not in debug mode (the Symfony debug page is kept).
 * - Priority -100 : after the security listener (login redirection, 403), before the Symfony error page (-128).
 * - The sidebar is displayed for the 404 only, and only if the user can read the documentation
 *   (it shows the content of the documentation).
 */
#[AsEventListener(event: KernelEvents::EXCEPTION, priority: -100)]
class ErrorPageListener
{
    /**
     * @param array<string, array<string, mixed>> $documentations
     */
    public function __construct(
        private Environment $twig,
        private AuthorizationCheckerInterface $authorizationChecker,
        #[Autowire('%ali_docs.documentations%')]
        private array $documentations,
        #[Autowire('%kernel.debug%')]
        private bool $debug,
    ) {
    }

    /**
     * @param array<string, mixed> $documentation
     */
    private function canView(array $documentation): bool
    {
        $security = (string) ($documentation['view_security'] ?? '');

        try {
            return '' === $security || $this->authorizationChecker->isGranted($security);
        } catch (\Throwable) {
            return false;
        }
    }

    public function __invoke(ExceptionEvent $event): void
    {
        if ($this->debug || !$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $route = (string) $request->attributes->get('_route');
        $docKey = $request->attributes->get('doc_key');

        if (!str_starts_with($route, 'ali_docs_') || !\is_string($docKey)) {
            return;
        }

        $documentation = $this->documentations[$docKey] ?? null;
        if (null === $documentation) {
            return;
        }

        $exception = $event->getThrowable();
        $statusCode = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : Response::HTTP_INTERNAL_SERVER_ERROR;

        try {
            $content = $this->twig->render('@AliDocs/documentation/error.html.twig', [
                'doc_key' => $docKey,
                'doc_title' => $documentation['title'],
                'status_code' => $statusCode,
                'show_sidebar' => Response::HTTP_NOT_FOUND === $statusCode && $this->canView($documentation),
            ]);
        } catch (\Throwable) {
            // The error page itself fails : the Symfony error page is displayed
            return;
        }

        $headers = $exception instanceof HttpExceptionInterface ? $exception->getHeaders() : [];
        $event->setResponse(new Response($content, $statusCode, $headers));
    }
}
