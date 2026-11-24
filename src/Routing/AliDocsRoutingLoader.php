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

        // The key of each documentation is its url (checked by the bundle configuration : letters, numbers, "-", "_")
        foreach (array_keys($this->documentations) as $key) {
            $req_doc_key[] = preg_quote((string) $key, '#');
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

        // Edition actions : "_actions" is not a documentation key, no conflict with the edit pages
        $adminController = 'Aliarteo\\AliDocsBundle\\Controller\\DocumentationAdminController';
        $actions = [
            'ali_docs_admin_create' => ['create', 'create', 'POST'],
            'ali_docs_admin_delete' => ['delete', 'delete', 'POST'],
            'ali_docs_admin_preview' => ['preview', 'preview', 'POST'],
            'ali_docs_admin_media_list' => ['media', 'mediaList', 'GET'],
            'ali_docs_admin_media_upload' => ['media', 'mediaUpload', 'POST'],
            'ali_docs_admin_pages' => ['pages', 'pages', 'GET'],
            'ali_docs_admin_media_delete' => ['media/delete', 'mediaDelete', 'POST'],
        ];
        foreach ($actions as $routeName => [$action, $method, $httpMethod]) {
            $route = new Route(
                $this->admin_path . '/_actions/{doc_key}/' . $action,
                ['_controller' => $adminController . '::' . $method],
                ['doc_key' => implode("|", $req_doc_key)],
            );
            $route->setMethods([$httpMethod]);
            $routes->add($routeName, $route);
        }

        // Edit page
        $path = $this->admin_path . "/{doc_key}/{path}";
        $defaults = [
            '_controller' => $adminController . '::edit',
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
