# AliDocsBundle

A Symfony bundle to publish documentation websites from Markdown files.

A documentation is a folder of Markdown files and sub-folders. The bundle builds the website from it: navigation, search, breadcrumb, previous / next links and an edit page. No database is needed.

## Requirements

- PHP 8.2 or higher
- Symfony 6.4 or 7.x

## Quick start

```console
git clone https://github.com/benaliart/AliDocsBundle.git AliDocsBundle
composer require aliarteo/ali-docs-bundle
php bin/console ali-docs:install
php bin/console assets:install public
```

The bundle is not published on Packagist yet: it is installed from the cloned folder (Composer "path" repository). See the installation guide for the details.

## Documentation

- [Introduction](docs/10__Introduction.md): features and roadmap
- [Installation](docs/20__Install.md)
- [Configuration](docs/30__Configuration.md)
- [Writing a documentation](docs/40__Writing.md): files, order, Markdown, media

## License

MIT License. See the [LICENCE](LICENCE) file.
