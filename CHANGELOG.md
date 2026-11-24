# Changelog

## 1.3.0

### Upgrade notes

- **The key of a documentation is now its URL, as written.** Before, the `_` of the keys were displayed `-` in the URLs: a key `doc_public` gave `/doc-public`. Now `doc_public` gives `/doc_public` and `doc-public` gives `/doc-public`. To keep the same URLs, write the keys with `-` (`doc-public`), in `documentations` and in `switch_doc`.
- The keys can contain letters, numbers, `-` and `_`, and start with a letter or a number. Another key is a configuration error.
- `DocumentationService::normalizeDocKey()` and `denormalizeDocKey()` are removed.
- The edit page uses a new Markdown editor: the Wysimark editor is removed.
- New dependencies: `symfony/mime` (type of the uploaded files) and `symfony/security-csrf` (edition actions).
- Run `php bin/console assets:install public` after the update.

### New

- **Markdown editor** in place of the Wysimark editor, which crashed on relative images and rewrote the Markdown. The file is edited as is, it is never converted.
  - Three displays: Write / Preview side by side (live preview, scroll followed, click in the preview to place the cursor), Write, Preview.
  - Toolbar: bold, italic, headings (paragraph, levels 1 to 5), lists, task list, quote, code, code block, table (size chosen on a grid), `tip` / `info` / `warning` / `danger` boxes. Shortcuts `Ctrl + B`, `Ctrl + I`, `Ctrl + K`, lists continued on `Enter`, `Tab` / `Shift + Tab` to indent.
  - The toolbar updates the element of the cursor: link, media, box type, table size, bold / italic / code removed.
  - Link window: address, or page / folder of the documentation (link relative to the page).
  - Warning before leaving the page with unsaved changes.
- **Media files**: upload (button, drag and drop, paste) to the `assets` folder, navigation between the folders, insertion with a path relative to the page, replacement, deletion (the pages using the file are listed). File types checked (extension and content). New option `upload_max_size` (default `64M`).
- **New page, new folder, deletion** of a page or an empty folder, from the options menu of the pages, folders and documentation home.
- **Task lists** (`- [ ]` / `- [x]`) displayed with checkboxes.
- Confirmation windows instead of the browser `confirm()` / `alert()`.
- `gif` and `webp` images.

### Fixes

- **Videos**: changing page while a video was playing could block the navigation. The videos are sent by parts of 4 MB (the whole file kept a PHP process busy), and stopped before a navigation.
- Boxes: same space above and below the text (the last paragraph kept its margin).
- The styles and scripts of the bundle are loaded with a version number: the browsers no longer keep the old files after an update.

### Docs

- Configuration: example and table with all the options, keys of the documentations.
- Writing: editor, media files, task lists, images used in several folders, warning about the changes made in the browser on a versioned documentation (commit and push them).

## 1.2.0

### New

- "On this page" table of contents on the right (wide screens, pages with at least two h2 / h3 headings), with the current section highlighted while scrolling.

### Fixes

- Clicking a link goes back to the top of the new page. Links to a section still scroll to the section.

## 1.1.0

### New

- `layout.logo` option: logo of the application in the header, instead of the default icon.
- The h2 and h3 headings get an id: links to a section of another page (`page.md#my-section`).
- Boxes (`:::tip ... :::`) on several lines, with paragraphs and lists.

### Fixes

- Relative images and videos of a page in another folder were in 404 with Turbo: the relative URLs are converted to absolute URLs.

## 1.0.0

First version: documentation websites from folders of Markdown files, with their own layout, access roles, search, previous / next links, breadcrumb, edit page, error pages and English / French interface.
