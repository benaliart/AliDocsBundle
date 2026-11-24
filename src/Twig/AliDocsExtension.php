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
     * @param array{home_url: ?string, home_label: ?string, favicon: ?string, logo: ?string, extra_css: string[], extra_js: string[]} $layout
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
                'assets_version' => $this->getAssetsVersion(),
            ],
        ];
    }

    /**
     * Version of the bundle styles and scripts (?v=...) : changes with the files,
     * so the browsers load the new files after an update of the bundle
     */
    private function getAssetsVersion(): string
    {
        $times = '';
        foreach (['css/ali_docs.css', 'js/ali_docs.js', 'js/ali_docs_editor.js'] as $file) {
            $times .= @filemtime(__DIR__ . '/../../public/' . $file) . '-';
        }

        return substr(md5($times), 0, 8);
    }
}
