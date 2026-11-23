# Installation

## Requirements

- PHP 8.2 or higher
- Symfony 6.4 or 7.x
- Composer

The documentation pages have their own layout and assets (Bootstrap 5, Turbo): they do not depend on the templates or the front-end tools of the application.

## Step 1: Install the bundle

In the project directory:

```console
composer require aliarteo/ali-docs-bundle
```

Composer installs the bundle and its dependencies (Parsedown, symfony/html-sanitizer...).

Check that the bundle is enabled in `config/bundles.php`:

```php
return [
    // ...
    Aliarteo\AliDocsBundle\AliDocsBundle::class => ['all' => true],
];
```

## Step 2: Create the configuration and routes files

```console
php bin/console ali-docs:install
```

This command creates:

- `config/packages/ali_docs.yaml`: configuration of the documentations, with an example.
- `config/routes/ali_docs.yaml`: routes of the documentations.

Existing files are kept. Use `--force` to replace them.

## Step 3: Install the assets

```console
php bin/console assets:install public
```

This copies the CSS and JavaScript files of the bundle to `public/bundles/alidocs`. Run it again after each update of the bundle.

## Step 4: Create a documentation

Create the folder declared in `config/packages/ali_docs.yaml` (for example `doc_public/`) and add a first Markdown file:

```text
doc_public/
└── 10__Introduction.md
```

The documentation is available at `/doc-public` (the `_` of the documentation key are replaced by `-` in the URL).

## Update

```console
composer update aliarteo/ali-docs-bundle
php bin/console cache:clear
php bin/console assets:install public
```

## Next

- [Configuration](30__Configuration.md)
- [Writing a documentation](40__Writing.md)
