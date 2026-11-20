<?php

namespace Aliarteo\AliDocsBundle\Entity;

use Aliarteo\AliDocsBundle\Entity\DocFile;

class DocDir
{
    private string $name;
    private string $relativePath;
    private string $url;
    private int $depth;
    private array $children = [];

    public function __construct(string $name, string $relativePath, int $depth)
    {
        $this->name = preg_replace('/^\d+__/', '', $name);
        $this->relativePath = $relativePath;
        $this->depth = $depth;
        $this->url = ltrim(str_replace(DIRECTORY_SEPARATOR, '/', $relativePath), '/'); // Convertit en URL
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getRelativePath(): string
    {
        return $this->relativePath;
    }

    public function getDepth(): int
    {
        return $this->depth;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function addElement(DocFile|DocDir $child): static
    {
        $this->children[] = $child;
        return $this;
    }

    public function getChildren(): array
    {
        return $this->children;
    }

    /**
     * All the files of this directory and its sub-directories, in display order.
     *
     * @return DocFile[]
     */
    public function getAllFiles(): array
    {
        $files = [];
        foreach ($this->children as $child) {
            if ($child instanceof DocFile) {
                $files[] = $child;
            } else {
                array_push($files, ...$child->getAllFiles());
            }
        }

        return $files;
    }

    public function isDirectory(): bool
    {
        return true;
    }

    public function isFile(): bool
    {
        return false;
    }
}
