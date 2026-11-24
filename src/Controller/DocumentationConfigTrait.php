<?php

namespace Aliarteo\AliDocsBundle\Controller;

/**
 * Configuration of the documentations (ali_docs.documentations) and path checks,
 * shared by the reading and the edition controllers
 *
 * Requires : AbstractController + a $documentationService property
 */
trait DocumentationConfigTrait
{
    /**
     * denyUnsafePath
     * Paths come from the url : refuse the ones going outside the documentation directory (../)
     */
    private function denyUnsafePath(string $path): void
    {
        $segments = explode('/', str_replace('\\', '/', $path));
        if (in_array('..', $segments, true) || str_contains($path, chr(0))) {
            throw $this->createNotFoundException('Invalid path.');
        }
    }

    public function getDocTitle($doc_key): string
    {
        return $this->getParameter('ali_docs.documentations')[$doc_key]['title'];
    }

    public function getDocDir($doc_key): string
    {
        return $this->getParameter('ali_docs.documentations')[$doc_key]['doc_dir'];
    }

    public function getViewDocSecurity($doc_key): ?string
    {
        $view_security = $this->getParameter('ali_docs.documentations')[$doc_key]['view_security'];
        if ($view_security && $view_security != "") {
            return $view_security;
        }
        return false;
    }

    /**
     * getEditDocSecurity
     * Role required to edit the documentation (always set : validated by the bundle configuration)
     */
    public function getEditDocSecurity($doc_key): string
    {
        return (string) ($this->getParameter('ali_docs.documentations')[$doc_key]['edit_security'] ?? '');
    }
}
