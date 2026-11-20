# Configuration

The configuration is in `config/packages/ali_docs.yaml` (created by `php bin/console ali-docs:install`).

Full reference: `php bin/console config:dump-reference ali_docs`

## Example

```yaml
ali_docs:
    admin_path: '/admin_documentation'

    documentations:
        doc_public:
            doc_dir: '%kernel.project_dir%/doc_public'
            title: Public documentation
            view_security: PUBLIC_ACCESS
            edit_security: ROLE_ADMIN
            switch_doc: [doc_admin]
        doc_admin:
            doc_dir: '%kernel.project_dir%/doc_admin'
            title: Admin documentation
            view_security: ROLE_ADMIN
            edit_security: ROLE_ADMIN
            switch_doc: [doc_public]
```

## Options

### `admin_path`

URL prefix of the edit pages. Default: `admin_documentation`.

### `documentations`

The list of the documentations. The key of each entry (for example `doc_public`) is used in the URLs, with `-` instead of `_`: `/doc-public`.

| Option | Required | Default | Description |
|---|---|---|---|
| `doc_dir` | yes | | Folder of the documentation files. |
| `title` | no | `My Documentation` | Title displayed in the header. |
| `view_security` | no | empty | Role required to read the documentation. Empty or `PUBLIC_ACCESS`: public. |
| `edit_security` | no | `ROLE_ADMIN` | Role required to edit the pages. It can not be empty or public: editing writes files on the server. |
| `switch_doc` | no | `[]` | Documentations shown in the "Go to documentation" menu: a list of keys, or `['*']` for all the other documentations. |

The roles are checked by the Symfony security component: the application needs a firewall with a user provider for the documentations that are not public.

### `switch_doc`

- `[doc_admin, doc_v2]`: the listed documentations.
- `['*']`: all the other documentations, in the order of the configuration.
- The current documentation is never listed.
- A documentation is listed only if the user can read it (`view_security`). If no documentation is left, the menu is not displayed.
- An unknown key is a configuration error.

### `layout`

The documentation pages have their own layout, independent of the application (templates, CSS, JavaScript). These options connect them to the application:

```yaml
ali_docs:
    layout:
        home_url: '/'                 # link back to the application, in the header
        home_label: 'My application'  # default: "Home" (translated)
        favicon: '/favicon.ico'
        extra_css: ['/css/docs.css']  # stylesheets of the application
        extra_js: []                  # scripts of the application (ex: statistics)
```

| Option | Default | Description |
|---|---|---|
| `home_url` | `null` | URL of the link back to the application, displayed on the right of the header (ex: `/`, `https://example.com`). Empty: no link. The link opens the page outside the documentation (full page load). |
| `home_label` | `null` | Text of the link back to the application. Empty: "Home" (translated). On small screens, only the icon is displayed. |
| `favicon` | `null` | Favicon of the pages: path in the `public` folder (ex: `/favicon.ico`) or URL. Empty: no favicon. |
| `extra_css` | `[]` | Stylesheets added to the pages, after the bundle stylesheets: they can override its styles (see [Look](#look)). Paths in the `public` folder or URLs. |
| `extra_js` | `[]` | Scripts added to the pages, loaded with `defer` (ex: statistics). Paths in the `public` folder or URLs. |

All the options are optional. The paths are passed to the Symfony `asset()` function.

## Routes

`config/routes/ali_docs.yaml` imports the routes of all the documentations. A prefix can be added:

```yaml
ali_docs:
    resource: .
    type: ali_docs
    prefix: documentation
```

Routes of a documentation:

| Route | Path |
|---|---|
| `ali_docs_index` | `/{doc_key}` |
| `ali_docs_show` | `/{doc_key}/{path}` (page or folder) |
| `ali_docs_search` | `/{doc_key}/search?s=...` |
| `ali_docs_asset` | `/{doc_key}/assets/{path}` |
| `ali_docs_admin_edit` | `/{admin_path}/{doc_key}/{path}` |

## One documentation per version

To document several versions of an application (v1.0, v2.0...), create one folder and one documentation per version, and link them with `switch_doc: ['*']`. The readers switch from one version to another with the "Go to documentation" menu.

```text
docs/
├── v1.0/
├── v2.0/
└── v3.0/
```

```yaml
ali_docs:
    documentations:
        v3_0:
            doc_dir: '%kernel.project_dir%/docs/v3.0'
            title: Documentation v3.0
            switch_doc: ['*']
        v2_0:
            doc_dir: '%kernel.project_dir%/docs/v2.0'
            title: Documentation v2.0
            switch_doc: ['*']
        v1_0:
            doc_dir: '%kernel.project_dir%/docs/v1.0'
            title: Documentation v1.0
            switch_doc: ['*']
```

- URLs: `/v3-0`, `/v2-0`, `/v1-0`.
- The menu follows the order of the configuration: put the latest version first.
- To start a new version, copy the folder of the previous one and add an entry to the configuration.

## Look

The styles of the bundle are scoped to the `.ali-docs` container and use CSS variables. To change them, override the variables in a stylesheet of the application:

```css
.ali-docs {
    --ali-docs-accent: #7647f7;       /* links, active page, breadcrumb, highlights */
    --ali-docs-accent-soft: #f1ecfe;  /* light background of the accent color */
    --ali-docs-sidebar-width: 300px;
    --ali-docs-radius: 8px;
}
```

Add this stylesheet with `layout.extra_css`.

The templates can also be overridden with the Symfony bundle template override, for example the layout of the pages: `templates/bundles/AliDocsBundle/base.html.twig`.

## Error pages

The errors of the documentation pages (page not found, access denied, server error) are displayed with the documentation layout, with a link to the documentation home. The sidebar is displayed for the "page not found" errors only.

In debug mode (`APP_DEBUG=1`), the Symfony debug page is displayed instead.

To change these pages, override `templates/bundles/AliDocsBundle/documentation/error.html.twig`.

## Translations

The interface is available in English and French. The texts use the `ali_docs` translation domain (`validators` for the form errors). The translation keys are the English texts.

To change a text or add a language, create `translations/ali_docs.<locale>.yaml` in the application:

```yaml
# translations/ali_docs.fr.yaml
'Edit': 'Éditer la page'
```
