# Configuration

The configuration is in `config/packages/ali_docs.yaml` (created by `php bin/console ali-docs:install`).

Full reference: `php bin/console config:dump-reference ali_docs`

## Example

Example with all the options. Only `documentations` and the `doc_dir` of each documentation are required.

```yaml
ali_docs:
    # URL prefix of the edit pages
    admin_path: '/admin_documentation'
    # Maximum size of a media file sent from the editor
    upload_max_size: '64M'

    # Connection with the application : link back, favicon, logo, styles and scripts
    layout:
        home_url: '/'
        home_label: 'My application'
        favicon: '/favicon.ico'
        logo: '/images/logo.svg'
        extra_css: ['/css/docs.css']
        extra_js: []

    documentations:
        doc-public:
            doc_dir: '%kernel.project_dir%/doc-public'
            title: Public documentation
            view_security: PUBLIC_ACCESS
            edit_security: ROLE_ADMIN
            switch_doc: ['*']
        doc-admin:
            doc_dir: '%kernel.project_dir%/doc-admin'
            title: Admin documentation
            view_security: ROLE_ADMIN
            edit_security: ROLE_ADMIN
            switch_doc: ['*']
```

## All the options

| Option | Default | Description |
|---|---|---|
| [`admin_path`](#admin_path) | `admin_documentation` | URL prefix of the edit pages. |
| [`upload_max_size`](#upload_max_size) | `64M` | Maximum size of a media file sent from the editor. |
| [`layout.home_url`](#layout) | `null` | Link back to the application, in the header. |
| [`layout.home_label`](#layout) | `null` | Text of the link back to the application. |
| [`layout.favicon`](#layout) | `null` | Favicon of the pages. |
| [`layout.logo`](#layout) | `null` | Logo of the application in the header. |
| [`layout.extra_css`](#layout) | `[]` | Stylesheets of the application added to the pages. |
| [`layout.extra_js`](#layout) | `[]` | Scripts of the application added to the pages. |
| [`documentations.<key>.doc_dir`](#documentations) | required | Folder of the documentation files. |
| [`documentations.<key>.title`](#documentations) | `My Documentation` | Title displayed in the header. |
| [`documentations.<key>.view_security`](#documentations) | empty (public) | Role required to read the documentation. |
| [`documentations.<key>.edit_security`](#documentations) | `ROLE_ADMIN` | Role required to edit the pages. |
| [`documentations.<key>.switch_doc`](#switch_doc) | `[]` | Documentations of the "Go to documentation" menu. |

## Options

### `admin_path`

URL prefix of the edit pages. Default: `admin_documentation`.

### `upload_max_size`

Maximum size of a media file sent from the editor (images, videos, PDF). Default: `64M`. A number of bytes, or a number followed by `K`, `M` or `G`.

The PHP limits also apply: `upload_max_filesize` and `post_max_size` (`php.ini`) must be at least as large to send big videos.

### `documentations`

The list of the documentations. The key of each entry is the URL of the documentation, as written: `doc-public` => `/doc-public`. It can contain letters, numbers, `-` and `_`, and starts with a letter or a number. Write the keys the same way in `switch_doc`.

| Option | Required | Default | Description |
|---|---|---|---|
| `doc_dir` | yes | | Folder of the documentation files. |
| `title` | no | `My Documentation` | Title displayed in the header. |
| `view_security` | no | empty | Role required to read the documentation. Empty or `PUBLIC_ACCESS`: public. |
| `edit_security` | no | `ROLE_ADMIN` | Role required to edit the pages. It can not be empty or public: editing writes files on the server. |
| `switch_doc` | no | `[]` | Documentations shown in the "Go to documentation" menu: a list of keys, or `['*']` for all the other documentations. |

The roles are checked by the Symfony security component: the application needs a firewall with a user provider for the documentations that are not public.

### `switch_doc`

- `[doc-admin, doc-v2]`: the listed documentations.
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
        logo: '/images/logo.svg'      # logo of the application in the header
        extra_css: ['/css/docs.css']  # stylesheets of the application
        extra_js: []                  # scripts of the application (ex: statistics)
```

| Option | Default | Description |
|---|---|---|
| `home_url` | `null` | URL of the link back to the application, displayed on the right of the header (ex: `/`, `https://example.com`). Empty: no link. The link opens the page outside the documentation (full page load). |
| `home_label` | `null` | Text of the link back to the application. Empty: "Home" (translated). On small screens, only the icon is displayed. |
| `favicon` | `null` | Favicon of the pages: path in the `public` folder (ex: `/favicon.ico`) or URL. Empty: no favicon. |
| `logo` | `null` | Logo of the application displayed in the header, before the documentation title, instead of the default icon: path in the `public` folder (ex: `/images/logo.svg`) or URL. Displayed 32px high. Empty: default icon. |
| `extra_css` | `[]` | Stylesheets added to the pages, after the bundle stylesheets: they can override its styles. The CSS variables must be overridden on `.ali-docs`, not on `:root` (see [Look](#look)). Paths in the `public` folder or URLs. |
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
| `ali_docs_admin_create`, `ali_docs_admin_delete`, `ali_docs_admin_preview` | `/{admin_path}/_actions/{doc_key}/...` (POST) |
| `ali_docs_admin_media_list`, `ali_docs_admin_media_upload` | `/{admin_path}/_actions/{doc_key}/media` |
| `ali_docs_admin_pages` | `/{admin_path}/_actions/{doc_key}/pages` (GET) |

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
        v3-0:
            doc_dir: '%kernel.project_dir%/docs/v3.0'
            title: Documentation v3.0
            switch_doc: ['*']
        v2-0:
            doc_dir: '%kernel.project_dir%/docs/v2.0'
            title: Documentation v2.0
            switch_doc: ['*']
        v1-0:
            doc_dir: '%kernel.project_dir%/docs/v1.0'
            title: Documentation v1.0
            switch_doc: ['*']
```

- URLs: `/v3-0`, `/v2-0`, `/v1-0`.
- The menu follows the order of the configuration: put the latest version first.
- To start a new version, copy the folder of the previous one and add an entry to the configuration.

## Look

The styles of the bundle are scoped to the `.ali-docs` container and use CSS variables.

The variables are declared on `.ali-docs`, not on `:root`: a variable overridden on `:root` has no effect. Override them with the `.ali-docs` selector, in a stylesheet of the application:

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
