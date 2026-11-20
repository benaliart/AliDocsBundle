<?php

namespace Aliarteo\AliDocsBundle\Entity;

class DocFile
{
    private string $name;
    private string $relativePath;
    private int $depth;
    private string $url;

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

    public function isDirectory(): bool
    {
        return false;
    }

    public function isFile(): bool
    {
        return true;
    }
}
