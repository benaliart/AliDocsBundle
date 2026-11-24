<?php

namespace Aliarteo\AliDocsBundle\Markdown;

use Parsedown;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\String\Slugger\AsciiSlugger;
use Twig\Environment;

class MarkdownParser
{
    /**
     * Boxes : `:::type text :::`, on one line or on several lines (paragraphs, lists...)
     */
    private const BOX_PATTERN = '/:::(\w+)\s+([\s\S]+?)\s*:::/';

    /**
     * Fenced code blocks (``` or ~~~) : their content is never transformed
     */
    private const CODE_BLOCK_PATTERN = '/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/m';

    public function __construct(
        private UrlGeneratorInterface $urlGenerator,
        private Environment $twig,
        private ContentSanitizer $sanitizer,
    ) {
    }

    /**
     * Markdown content of a page => HTML ready to be displayed
     * - The HTML written in the markdown is allowed, then cleaned (allow list : no script, iframe, events...)
     * - Boxes (:::tip ... :::) are converted on the markdown, so they can contain several paragraphs and lists
     * - The h2 and h3 headings get an id (anchors : page#my-section)
     */
    public function toHtml(string $markdown): string
    {
        // 1. Fenced code blocks : protected (a ::: in a code example is not a box)
        $codeBlocks = [];
        $markdown = preg_replace_callback(self::CODE_BLOCK_PATTERN, function (array $matches) use (&$codeBlocks): string {
            $token = 'ALIDOCSCODE' . \count($codeBlocks) . 'X';
            $codeBlocks[$token] = $matches[0];

            return $token;
        }, $markdown);

        // 2. Boxes : their content is converted separately, then replaced by a token
        $boxes = [];
        $markdown = preg_replace_callback(self::BOX_PATTERN, function (array $matches) use (&$boxes, $codeBlocks): string {
            $token = 'ALIDOCSBOX' . \count($boxes) . 'X';
            $boxes[$token] = $this->twig->render('@AliDocs/markdown/block.html.twig', [
                'type' => $matches[1],
                'texte' => $this->markdownToCleanHtml(strtr($matches[2], $codeBlocks)),
            ]);

            // Own paragraph : the box is a block element
            return "\n\n" . $token . "\n\n";
        }, $markdown);

        // 3. Page content
        $html = $this->markdownToCleanHtml(strtr($markdown, $codeBlocks));

        // 4. Boxes back in the page (after the cleaning : their content is already cleaned)
        foreach ($boxes as $token => $box) {
            $html = str_replace(['<p>' . $token . '</p>', $token], $box, $html);
        }

        // 5. Task lists (- [ ] / - [x]) : checkboxes, added after the cleaning (no form element allowed in the pages)
        $html = $this->addTaskListCheckboxes($html);

        return $this->addHeadingIds($html);
    }

    /**
     * Task lists, as on GitHub : "- [ ] text" / "- [x] text" => list item with a checkbox
     * The checkboxes can be checked by the reader (check list), nothing is saved
     */
    private function addTaskListCheckboxes(string $html): string
    {
        return preg_replace_callback('#<li>(\s*<p>)?\s*\[([ xX])\][ \t]+#u', static function (array $matches): string {
            $checked = ' ' !== $matches[2] ? ' checked' : '';

            return '<li class="ali-docs-task">' . $matches[1] . '<input type="checkbox" class="ali-docs-task-checkbox"' . $checked . '> ';
        }, $html);
    }

    /**
     * Relative src (and poster) urls of the page => absolute urls
     *
     * With Turbo, the new page is inserted before the browser url changes : a relative url would be
     * resolved from the previous page (ex : "assets/a.png" of a page in another folder => 404).
     *
     * - Url = documentation root + folder of the page + path ("." and ".." resolved, never above the root)
     * - Each segment is url encoded (spaces, accents), query string and anchor kept (video.mp4#t=10)
     * - Unchanged : absolute paths (/...), urls with a scheme (https:, data:, mailto:...), //..., #...
     *
     * @param string $pagePath Path of the page in the documentation (ex : "20__Folder X/10__Page")
     */
    public function replaceSrcUrls(string $html, string $doc_key, string $pagePath = ''): string
    {
        $root = rtrim($this->urlGenerator->generate('ali_docs_index', ['doc_key' => $doc_key]), '/');

        // Folder of the page (path without the page name)
        $folder = array_values(array_filter(
            explode('/', trim(str_replace('\\', '/', $pagePath), '/')),
            static fn (string $segment): bool => '' !== $segment
        ));
        array_pop($folder);

        return preg_replace_callback('/(\s(?:src|poster)\s*=\s*)(["\'])(.*?)\2/i', function (array $matches) use ($root, $folder): string {
            $url = html_entity_decode($matches[3], \ENT_QUOTES | \ENT_HTML5, 'UTF-8');
            $resolved = $this->resolveRelativeUrl($url, $root, $folder);

            if (null === $resolved) {
                return $matches[0];
            }

            return $matches[1] . $matches[2] . htmlspecialchars($resolved, \ENT_QUOTES, 'UTF-8') . $matches[2];
        }, $html);
    }

    /**
     * Relative url => absolute url from the documentation root, null if the url is not relative
     *
     * @param string[] $folder Folder of the page (segments)
     */
    private function resolveRelativeUrl(string $url, string $root, array $folder): ?string
    {
        $url = trim($url);

        // Not relative : empty, absolute path, //host, #anchor, scheme (https:, data:, mailto:...)
        if ('' === $url || '/' === $url[0] || '#' === $url[0] || preg_match('#^[a-z][a-z0-9+.\-]*:#i', $url)) {
            return null;
        }

        // Query string and anchor : kept as is
        $pathLength = strcspn($url, '?#');
        $suffix = substr($url, $pathLength);

        $segments = $folder;
        foreach (explode('/', substr($url, 0, $pathLength)) as $segment) {
            $segment = rawurldecode($segment);

            if ('' === $segment || '.' === $segment) {
                continue;
            }
            if ('..' === $segment) {
                // Never above the documentation root
                array_pop($segments);
                continue;
            }
            $segments[] = $segment;
        }

        return $root . '/' . implode('/', array_map('rawurlencode', $segments)) . $suffix;
    }

    /**
     * Id on the h2 and h3 headings (slug of the title, unique in the page) : links to a section (page#my-section)
     */
    private function addHeadingIds(string $html): string
    {
        $slugger = new AsciiSlugger();
        $usedIds = [];

        return preg_replace_callback('#<h([23])>(.*?)</h\1>#s', function (array $matches) use ($slugger, &$usedIds): string {
            $title = html_entity_decode(strip_tags($matches[2]), \ENT_QUOTES | \ENT_HTML5, 'UTF-8');
            $slug = $slugger->slug($title)->lower()->toString();

            if ('' === $slug) {
                return $matches[0];
            }

            $id = $slug;
            for ($i = 2; isset($usedIds[$id]); ++$i) {
                $id = $slug . '-' . $i;
            }
            $usedIds[$id] = true;

            return sprintf('<h%1$s id="%2$s">%3$s</h%1$s>', $matches[1], $id, $matches[2]);
        }, $html);
    }

    /**
     * Headings of the page with an id (h2, h3) : table of contents ("On this page")
     *
     * @return array<array{level: int, id: string, title: string}>
     */
    public function getHeadings(string $html): array
    {
        preg_match_all('#<h([23]) id="([^"]+)">(.*?)</h\1>#s', $html, $matches, \PREG_SET_ORDER);

        return array_map(static fn (array $match): array => [
            'level' => (int) $match[1],
            'id' => $match[2],
            'title' => trim(html_entity_decode(strip_tags($match[3]), \ENT_QUOTES | \ENT_HTML5, 'UTF-8')),
        ], $matches);
    }

    /**
     * Markdown => HTML cleaned by the sanitizer
     */
    private function markdownToCleanHtml(string $markdown): string
    {
        $parsedown = new Parsedown();
        $parsedown->setSafeMode(false);

        return $this->sanitizer->sanitize($parsedown->text($markdown));
    }
}
