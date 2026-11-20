<?php

namespace Aliarteo\AliDocsBundle\Markdown;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * Cleans the HTML of the documentation pages (allow list).
 *
 * Kept : the HTML useful in a documentation (text formatting, lists, links, images,
 * videos, audios, tables, details / summary...).
 * Removed : everything else, and especially what can run code or load other pages :
 * <script>, <style>, <iframe>, <object>, <embed>, <form>, <svg>, event attributes (onclick...),
 * style attributes, javascript: / data: urls...
 */
class ContentSanitizer
{
    /**
     * Allowed elements => their allowed attributes (+ the global attributes below)
     */
    private const ELEMENTS = [
        // Text
        'p' => [], 'br' => [], 'hr' => [], 'span' => [], 'div' => [],
        'h1' => ['id'], 'h2' => ['id'], 'h3' => ['id'], 'h4' => ['id'], 'h5' => ['id'], 'h6' => ['id'],
        'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [], 's' => [], 'del' => [], 'ins' => [],
        'mark' => [], 'small' => [], 'sub' => [], 'sup' => [],
        'code' => [], 'pre' => [], 'kbd' => [], 'samp' => [], 'var' => [],
        'abbr' => [], 'cite' => [], 'q' => [], 'dfn' => [], 'time' => ['datetime'],
        'blockquote' => [],
        // Lists
        'ul' => [], 'ol' => ['start', 'reversed', 'type'], 'li' => ['value'],
        'dl' => [], 'dt' => [], 'dd' => [],
        // Links
        'a' => ['href', 'target'],
        // Images
        'img' => ['src', 'alt', 'width', 'height', 'loading'],
        'figure' => [], 'figcaption' => [],
        // Videos / audios (files of the documentation or external urls)
        'video' => ['src', 'controls', 'width', 'height', 'poster', 'preload', 'loop', 'muted', 'autoplay', 'playsinline'],
        'audio' => ['src', 'controls', 'preload', 'loop', 'muted'],
        'source' => ['src', 'type', 'media'],
        'track' => ['src', 'kind', 'srclang', 'label', 'default'],
        // Tables
        'table' => [], 'caption' => [], 'thead' => [], 'tbody' => [], 'tfoot' => [], 'tr' => [],
        'th' => ['colspan', 'rowspan', 'scope', 'align'], 'td' => ['colspan', 'rowspan', 'align'],
        'colgroup' => ['span'], 'col' => ['span'],
        // Structure
        'section' => [], 'article' => [], 'header' => [], 'footer' => [], 'aside' => [], 'main' => [],
        // Other
        'details' => ['open'], 'summary' => [],
    ];

    /**
     * Harmless wrappers : the element is removed but its content is kept
     * (ex : a video written inside <html>...</html>). The other unknown elements are removed with their content.
     */
    private const UNWRAPPED_ELEMENTS = ['html', 'body', 'center', 'font', 'nobr'];

    /**
     * Attributes allowed on every element
     */
    private const GLOBAL_ATTRIBUTES = ['class', 'title', 'lang', 'dir'];

    private HtmlSanitizer $sanitizer;

    public function __construct()
    {
        $config = (new HtmlSanitizerConfig())
            // Links : web, email and phone only (no javascript:, data:...), relative links allowed (internal pages)
            ->allowLinkSchemes(['http', 'https', 'mailto', 'tel'])
            ->allowRelativeLinks()
            // Images / videos : web urls and files of the documentation (relative urls), no data: urls
            ->allowMediaSchemes(['http', 'https'])
            ->allowRelativeMedias()
            // Links opened in a new tab can not access the documentation page
            ->forceAttribute('a', 'rel', 'noopener noreferrer')
            ->withMaxInputLength(500000);

        foreach (self::ELEMENTS as $element => $attributes) {
            $config = $config->allowElement($element, [...$attributes, ...self::GLOBAL_ATTRIBUTES]);
        }
        foreach (self::UNWRAPPED_ELEMENTS as $element) {
            $config = $config->blockElement($element);
        }

        $this->sanitizer = new HtmlSanitizer($config);
    }

    public function sanitize(string $html): string
    {
        return $this->sanitizer->sanitize($html);
    }
}
