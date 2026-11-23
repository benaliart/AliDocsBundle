# AliDocsBundle

A Symfony bundle to publish documentation websites from Markdown files.

A documentation is a folder of Markdown files and sub-folders. The bundle builds the website from it: navigation, search, breadcrumb, previous / next links and an edit page. No database is needed.

## Requirements

- PHP 8.2 or higher
- Symfony 6.4 or 7.x

## Quick start

```console
composer require aliarteo/ali-docs-bundle
php bin/console ali-docs:install
php bin/console assets:install public
```

See the installation guide for the details.

## Configuration example

```yaml
# config/packages/ali_docs.yaml
ali_docs:
    layout:
        home_url: '/'                 # link back to the application
        logo: '/images/logo.svg'      # logo of the application in the header
        favicon: '/favicon.ico'
        extra_css: ['/css/docs.css']  # ex: colors
    documentations:
        user_guide:
            doc_dir: '%kernel.project_dir%/docs/user_guide'
            title: User guide
            view_security: ROLE_USER
            edit_security: ROLE_ADMIN
```

The colors are CSS variables declared on the `.ali-docs` container (not on `:root`). Override them with the same selector:

```css
/* public/css/docs.css */
.ali-docs {
    --ali-docs-accent: #7647f7;
    --ali-docs-accent-soft: #f1ecfe;
}
```

All the options: [Configuration](docs/30__Configuration.md).

## Documentation

- [Introduction](docs/10__Introduction.md): features and roadmap
- [Installation](docs/20__Install.md)
- [Configuration](docs/30__Configuration.md)
- [Writing a documentation](docs/40__Writing.md): files, order, Markdown, media

## License

MIT License. See the [LICENCE](LICENCE) file.
