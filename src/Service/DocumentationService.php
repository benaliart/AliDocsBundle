<?php

namespace Aliarteo\AliDocsBundle\Service;

use Aliarteo\AliDocsBundle\Entity\DocDir;
use Aliarteo\AliDocsBundle\Entity\DocFile;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Filesystem\Filesystem;

/**
 * DocumentationService
 * 
 * Documentation Service is the class to retrieve Directories and files with the path specified
 */
class DocumentationService
{
    private Filesystem $filesystem;

    public function __construct()
    {
        $this->filesystem = new Filesystem();
    }
    
    /**
     * normalizeDocKey
     * Transforme les _ en - dans la clé
     *
     * @param  mixed $key
     * @return string
     */
    public static function normalizeDocKey(string $key): string
    {
        return str_replace('-', '_', $key);
    }
    
    /**
     * denormalizeDocKey
     * Transforme les - en _ dans la clé
     *
     * @param  mixed $key
     * @return string
     */
    public static function denormalizeDocKey(string $key): string
    {
        return str_replace('_', '-', $key);
    }
    
    public function getDirectoryTree(string $directory, ?string $basePath = null, $depth = 0): DocDir
    {
        // Définir la racine pour générer le chemin relatif
        if ($basePath === null) {
            $basePath = realpath($directory);
        }

        // Calcul du chemin relatif avec DIRECTORY_SEPARATOR au début
        $relativePath = str_replace($basePath, '', realpath($directory));
        $relativePath = DIRECTORY_SEPARATOR . trim($relativePath, DIRECTORY_SEPARATOR);

        $rootDir = new DocDir(basename($directory), $relativePath, $depth);

        $finder = new Finder();
        $finder
            ->in($directory)
            ->depth('== 0')
            ->sortByName(true);

        // dd( $finder->sortByName() );

        foreach ($finder as $item) {
            // dump( $item);
            if ($item->isDir() && $item->getFilename() != "assets") {
                $folderPath = $item->getRealPath();
                $subDir = $this->getDirectoryTree($folderPath, $basePath, $depth + 1); // Récursion
                $rootDir->addElement($subDir);
            }
            if ($item->isFile() && $item->getExtension() === 'md') {
                $fileName = pathinfo($item->getFilename(), PATHINFO_FILENAME);
                $fileRelativePath = str_replace($basePath, '', $item->getRealPath());
                $fileRelativePath = DIRECTORY_SEPARATOR . trim(pathinfo($fileRelativePath, PATHINFO_DIRNAME) . '/' . pathinfo($fileRelativePath, PATHINFO_FILENAME), DIRECTORY_SEPARATOR);

                $rootDir->addElement(new DocFile($fileName, $fileRelativePath, $depth));
            }
        }


        // // Ajout des dossiers
        // foreach ($finder->directories() as $dir) {
        //     $folderPath = $dir->getRealPath();
        //     $subDir = $this->getDirectoryTree($folderPath, $basePath); // Récursion
        //     $rootDir->addElement($subDir);
        // }

        // // Ajout des fichiers
        // foreach ($finder->files() as $file) {
        //     $fileName = pathinfo($file->getFilename(), PATHINFO_FILENAME);
        //     $fileRelativePath = str_replace($basePath, '', $file->getRealPath());
        //     $fileRelativePath = DIRECTORY_SEPARATOR . trim(pathinfo($fileRelativePath, PATHINFO_DIRNAME) . '/' . pathinfo($fileRelativePath, PATHINFO_FILENAME), DIRECTORY_SEPARATOR);

        //     $rootDir->addElement(new DocFile($fileName, $fileRelativePath));
        // }

        return $rootDir;
    }

    /**
     * groupChildrenByType
     * Groups the consecutive children of a directory having the same type (folders / pages),
     * keeping the display order. Ex : [page] [folder, folder, folder] [page, page]
     *
     * @return array<array{type: string, items: array<DocDir|DocFile>}>
     */
    public function groupChildrenByType(DocDir $dir): array
    {
        $groups = [];
        foreach ($dir->getChildren() as $child) {
            $type = $child->isDirectory() ? 'folder' : 'page';
            $last = array_key_last($groups);

            if (null === $last || $groups[$last]['type'] !== $type) {
                $groups[] = ['type' => $type, 'items' => []];
                $last = array_key_last($groups);
            }
            $groups[$last]['items'][] = $child;
        }

        return $groups;
    }

    /**
     * getPrevNextFiles
     * Previous and next pages of the given page, following the documentation display order
     *
     * @param  DocDir $tree Root directory of the documentation
     * @param  string $url  Url of the current page (ex : 20__Contenus/1__Articles)
     * @return array{prev: ?DocFile, next: ?DocFile}
     */
    public function getPrevNextFiles(DocDir $tree, string $url): array
    {
        $url = trim($url, '/');
        $files = $tree->getAllFiles();

        foreach ($files as $i => $file) {
            if ($file->getUrl() === $url) {
                return [
                    'prev' => $files[$i - 1] ?? null,
                    'next' => $files[$i + 1] ?? null,
                ];
            }
        }

        return ['prev' => null, 'next' => null];
    }

    /**
     * getBreadcrumbFolders
     * Folders containing the given page or folder : display name (without the position prefix XX__) and url
     *
     * @param  string $path Url of the page (ex : 20__Contenus/1__Articles)
     * @return array<array{name: string, path: string}> (ex : [['name' => 'Contenus', 'path' => '20__Contenus']])
     */
    public function getBreadcrumbFolders(string $path): array
    {
        $segments = explode('/', trim($path, '/'));
        array_pop($segments);

        $folders = [];
        $folderPath = '';
        foreach ($segments as $segment) {
            $folderPath = ltrim($folderPath . '/' . $segment, '/');
            $folders[] = [
                'name' => preg_replace('/^\d+__/', '', $segment),
                'path' => $folderPath,
            ];
        }

        return $folders;
    }

    /**
     * findDirectory
     * Directory of the tree having the given url (ex : 20__Contenus), null if not found
     */
    public function findDirectory(DocDir $dir, string $url): ?DocDir
    {
        if ($dir->getUrl() === trim($url, '/')) {
            return $dir;
        }

        foreach ($dir->getChildren() as $child) {
            if ($child instanceof DocDir && ($found = $this->findDirectory($child, $url))) {
                return $found;
            }
        }

        return null;
    }

    /**
     * getPageName
     * Display name of a page, without the position prefix (XX__)
     *
     * @param  string $path Url of the page (ex : 20__Contenus/1__Articles)
     * @return string       (ex : Articles)
     */
    public function getPageName(string $path): string
    {
        $segments = explode('/', trim($path, '/'));

        return preg_replace('/^\d+__/', '', end($segments));
    }

    /**
     * getPlainText
     * Readable text of a markdown content : HTML tags and markdown syntax are removed
     */
    public function getPlainText(string $markdown, bool $withHeadings = true): string
    {
        if (!$withHeadings) {
            $markdown = preg_replace('/^\s{0,3}#{1,6}\s.*$/mu', '', $markdown);
        }

        // Media / script blocks : their inner text is not readable content (ex : video fallback message)
        $text = preg_replace('#<(video|audio|iframe|script|style|object)\b[^>]*>.*?</\1>#isu', ' ', $markdown);
        $text = strip_tags($text);
        // Escaped characters (ex : "Solidari'thé\." written by the editor) : "\." => "."
        $text = preg_replace('/\\\\([!-\/:-@\[-`{-~])/u', '$1', $text);
        $text = preg_replace('/:::\w*/u', ' ', $text);                       // Custom blocks (:::tip ... :::)
        $text = preg_replace('/!\[[^\]]*\]\([^)]*\)/u', ' ', $text);         // Images
        $text = preg_replace('/\[([^\]]*)\]\([^)]*\)/u', '$1', $text);       // Links : keep the label
        $text = preg_replace('/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/mu', '', $text); // Headings, quotes, lists
        $text = preg_replace('/(\*\*|__|\*|`+|~~)/u', '', $text);            // Emphasis, code
        $text = preg_replace('/^\s*\|?[-:| ]{3,}\|?\s*$/mu', ' ', $text);    // Table separators
        $text = str_replace('|', ' ', $text);

        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * getPagesIntro
     * Short intro text of the pages of a list (beginning of their readable content, headings excluded)
     *
     * @param  array<DocDir|DocFile> $items   Children of a directory (only the pages are used)
     * @param  string                $docPath Root directory of the documentation
     * @return array<string, string>          Intro by page url
     */
    public function getPagesIntro(array $items, string $docPath, int $length = 160): array
    {
        $intros = [];
        foreach ($items as $item) {
            if (!$item instanceof DocFile) {
                continue;
            }

            $filePath = $docPath . '/' . $item->getUrl() . '.md';
            if (!is_file($filePath)) {
                continue;
            }

            // Headings removed : the first one usually repeats the page name
            $text = $this->getPlainText(file_get_contents($filePath), false);
            $excerpt = $this->getExcerpt($text, '', (int) ($length / 2));

            if ($excerpt) {
                $intros[$item->getUrl()] = $excerpt['before'] . ($excerpt['cut_end'] ? ' …' : '');
            }
        }

        return $intros;
    }

    /**
     * getExcerpt
     * Part of the text around the first occurrence of the term (or the beginning of the text)
     *
     * @return array{before: string, match: string, after: string, cut_start: bool, cut_end: bool}|null
     */
    public function getExcerpt(string $text, string $term, int $radius = 90): ?array
    {
        if ('' === $text) {
            return null;
        }

        $length = mb_strlen($text);
        $position = '' !== $term ? mb_stripos($text, $term) : false;

        // Term not found in the text : beginning of the text
        if (false === $position) {
            $end = min($length, 2 * $radius);
            if ($end < $length && false !== ($space = mb_strrpos(mb_substr($text, 0, $end), ' '))) {
                $end = $space;
            }

            return [
                'before' => mb_substr($text, 0, $end),
                'match' => '',
                'after' => '',
                'cut_start' => false,
                'cut_end' => $end < $length,
            ];
        }

        $termLength = mb_strlen($term);

        // Start / end of the excerpt, cut on a space to avoid truncated words
        $start = max(0, $position - $radius);
        if ($start > 0 && false !== ($space = mb_strpos($text, ' ', $start)) && $space < $position) {
            $start = $space + 1;
        }
        $end = min($length, $position + $termLength + $radius);
        if ($end < $length && false !== ($space = mb_strrpos(mb_substr($text, 0, $end), ' ')) && $space > $position + $termLength) {
            $end = $space;
        }

        return [
            'before' => mb_substr($text, $start, $position - $start),
            'match' => mb_substr($text, $position, $termLength),
            'after' => mb_substr($text, $position + $termLength, $end - $position - $termLength),
            'cut_start' => $start > 0,
            'cut_end' => $end < $length,
        ];
    }

    public function getDocFileContent(string $path): string
    {
        $real = realpath($path);

        if ($this->filesystem->exists($real)) {
            return file_get_contents($real);
        }

        throw new \Exception("The file $path does not exist.");
    }








}
