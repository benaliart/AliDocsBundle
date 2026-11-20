<?php

namespace Aliarteo\AliDocsBundle\Routing;

use Symfony\Component\Routing\Route;
use Symfony\Component\Config\Loader\Loader;
use Symfony\Component\Routing\RouteCollection;
use Aliarteo\AliDocsBundle\Service\DocumentationService;

class AliDocsRoutingLoader extends Loader
{
    private bool $isLoaded = false;

    public function __construct(private DocumentationService $documentationService, private string $admin_path, private array $documentations)
    {
    }

    public function load(mixed $resource, ?string $type = null): RouteCollection
    {
        if ($this->isLoaded) {
            throw new \RuntimeException('AliDocs routes are already loaded!');
        }

        $routes = new RouteCollection();

        $req_doc_key = array();

        foreach ($this->documentations as $key => $doc) {
            // $urlPrefix = $doc['url_prefix'] ?? '/default';
            // $title = $doc['title'] ?? 'Documentation';
            $req_doc_key[] = $this->documentationService->denormalizeDocKey($key);
            // $req_doc_key[] = $doc['doc_url'];
        }

        // Index
        $path = "/{doc_key}";
        $defaults = [
            '_controller' => 'Aliarteo\\AliDocsBundle\\Controller\\DocumentationController::index',
        ];
        $requirements = ['doc_key' => implode("|", $req_doc_key)];
        $route = new Route($path, $defaults, $requirements);
        $routeName = 'ali_docs_index';
        $routes->add($routeName, $route);

        // Search
        $path = "/{doc_key}/search";
        $defaults = [
            '_controller' => 'Aliarteo\\AliDocsBundle\\Controller\\DocumentationController::search',
        ];
        $requirements = ['doc_key' => implode("|", $req_doc_key)];
        $route = new Route($path, $defaults, $requirements);
        $routeName = 'ali_docs_search';
        $routes->add($routeName, $route);

        // asset
        $path = "/{doc_key}/assets/{path}";
        $defaults = [
            '_controller' => 'Aliarteo\\AliDocsBundle\\Controller\\DocumentationController::assetsFolder',
        ];
        $requirements = [
            'doc_key' => implode("|", $req_doc_key),
            'path' => '.+'
        ];
        $route = new Route($path, $defaults, $requirements);
        $routeName = 'ali_docs_asset';
        $routes->add($routeName, $route);

        // Show
        $path = "/{doc_key}/{path}{extension}";
        $defaults = [
            '_controller' => 'Aliarteo\\AliDocsBundle\\Controller\\DocumentationController::show',
            'extension' => null
        ];
        $requirements = [
            'doc_key' => implode("|", $req_doc_key),
            'path' => '.+',
        ];
        $route = new Route($path, $defaults, $requirements);
        $routeName = 'ali_docs_show';
        $routes->add($routeName, $route);

        // Admin Show
        $path = $this->admin_path . "/{doc_key}/{path}";
        $defaults = [
            '_controller' => 'Aliarteo\\AliDocsBundle\\Controller\\DocumentationController::edit',
        ];
        $requirements = [
            'doc_key' => implode("|", $req_doc_key),
            'path' => '.+'
        ];
        $route = new Route($path, $defaults, $requirements);
        $routeName = 'ali_docs_admin_edit';
        $routes->add($routeName, $route);

        $this->isLoaded = true;
        return $routes;
    }

    public function supports(mixed $resource, ?string $type = null): bool
    {
        return 'ali_docs' === $type;
    }
}
