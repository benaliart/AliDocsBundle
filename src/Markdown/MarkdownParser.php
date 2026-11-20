<?php

namespace Aliarteo\AliDocsBundle\Markdown;

use Parsedown;
use Twig\Environment;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class MarkdownParser
{

    public function __construct(
        private UrlGeneratorInterface $urlGenerator,
        private Environment $twig,
        private ContentSanitizer $sanitizer,
    ) {
    }

    /**
     * Markdown content of a page => HTML ready to be displayed
     * The HTML written in the markdown is allowed, then cleaned (allow list : no script, iframe, events...)
     */
    public function toHtml(string $markdown): string
    {
        $parsedown = new Parsedown();
        $parsedown->setSafeMode(false);

        $html = $this->sanitizer->sanitize($parsedown->text($markdown));

        // Custom blocks (:::tip ... :::) : rendered by a template, after the cleaning
        return $this->extraParseMarkdown($html);
    }

    /**
     * Transforme un contenu Markdown avec des blocs `:::type texte :::`
     */
    public function extraParseMarkdown(string $markdownContent): string
    {
        // Utiliser une expression régulière pour trouver les blocs :::type texte :::.
        $pattern = '/:::(\w+)\[(.*?)\]:::/';
        $pattern = '/:::(\w+)/';
        // $pattern = '/:::(\w+)\[(.*?)\]:::/s';
        // $pattern = '/:::(\w+)\[([^\]]+)\]:::/s';
        $pattern = '/:::(\w+)\s+(.+?)\s*:::/';
        $pattern = '/:::(\w+)\s+([\s\S]+?)\s*:::/';

        // Remplacer les blocs par du HTML généré via Twig
        $parsedContent = preg_replace_callback($pattern, function ($matches) {
            
            // On a deux éléments : $matches[1] (type) et $matches[2] (texte)
            $type = $matches[1];
            $texte = $matches[2];


            // Utiliser Twig pour rendre le template avec ces deux paramètres
            return $this->twig->render('@AliDocs/markdown/block.html.twig', [
                'type' => $type,
                'texte' => $texte
            ]);
        }, $markdownContent);

        return $parsedContent;
    }


    public function replaceSrcUrls(string $text, string $doc_key): string
    {
        return $text;

        // Utilisation d'une expression régulière pour trouver les occurrences de src="..." ou src='...'
        $pattern = '/src=["\'](.*?)["\']/';

        $prefix = $this->urlGenerator->generate("ali_docs_index", ['doc_key' => $doc_key]) . "/assets/";
        // Fonction de rappel pour remplacer le texte entre les guillemets
        $replacement = function ($matches)  use ($prefix) {
            // $matches[1] contient l'URL trouvée
            return 'src="' . $prefix . $matches[1] . '"';
        };

        // Remplacement des occurrences dans le texte
        $modifiedText = preg_replace_callback($pattern, $replacement, $text);

        return $modifiedText;
    }
}