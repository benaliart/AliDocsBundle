<?php

namespace Aliarteo\AliDocsBundle\Twig;

use Twig\Extension\AbstractExtension;
use Twig\Extension\GlobalsInterface;

/**
 * Exposes the bundle configuration to the templates through the `ali_docs` global.
 *
 * Usage in Twig : {{ ali_docs.layout.home_url }}
 */
class AliDocsExtension extends AbstractExtension implements GlobalsInterface
{
    /**
     * @param array{home_url: ?string, home_label: ?string, favicon: ?string, extra_css: string[], extra_js: string[]} $layout
     */
    public function __construct(
        private array $layout,
    ) {
    }

    public function getGlobals(): array
    {
        return [
            'ali_docs' => [
                'layout' => $this->layout,
            ],
        ];
    }
}
