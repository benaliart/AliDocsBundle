# Writing a documentation

## Files and folders

A documentation is a folder (`doc_dir`). Each Markdown file (`.md`) is a page, each sub-folder is a section.

```text
doc_public/
├── 10__Introduction.md
├── 20__Getting started/
│   ├── 10__Installation.md
│   └── 20__First steps.md
├── 30__Guides/
│   ├── 10__Users.md
│   ├── 20__Settings.md
│   └── assets/
│       └── settings.png
└── 40__FAQ.md
```

- **Order**: files and folders are sorted by name. A number followed by `__` sets the order: `10__Introduction.md`. The prefix is not displayed.
- **Names**: the file name, without the prefix and the extension, is the name displayed in the menu. Letters (accents included), numbers, spaces, `_` and `-` can be used.
- **Folders**: each folder has an index page listing its content. Folders named `assets` are not displayed in the menu: they are used to store the media files.

## Markdown

The pages use standard Markdown (Parsedown): headings, lists, links, images, code blocks, tables...

```markdown
# Settings

Open the **Settings** page, then:

1. Choose a language
2. Save
```

## Boxes

Text between `:::type` and `:::` is displayed in a box:

```markdown
:::tip Save regularly with Ctrl + S. :::

:::info The settings are shared by all the users. :::

:::warning This action can not be undone. :::

:::danger Do not share your password. :::
```

Result:

![Rendering of the tip, info, warning and danger boxes](assets/boxes.png)

Types: `tip`, `info`, `warning`, `danger`. Any other type is displayed as a neutral box.

## Links between pages

Use relative links to the files, with or without the `.md` extension:

```markdown
See [Installation](../20__Getting started/10__Installation.md).
```

## Images, videos and files

Media files are stored in the documentation folder, next to the pages or in an `assets` folder, and linked with relative paths:

```markdown
![Settings page](assets/settings.png)
```

```html
<video width="100%" controls>
  <source src="assets/presentation.mp4" type="video/mp4">
</video>
```

Allowed file types: `pdf`, `jpg`, `jpeg`, `png`, `mp4`, `webm`.

## HTML

Pages can contain HTML. It is cleaned before being displayed (allow list), so a page can not run code:

- **Kept**: text formatting, headings, lists, links, images, videos and audios (`video`, `audio`, `source`, `track`), tables, `details` / `summary`, `figure`, `kbd`, `mark`...
- **Removed**: `script`, `style`, `iframe`, `object`, `embed`, `form`, `svg`, event attributes (`onclick`...), `style` attributes, `javascript:` and `data:` URLs.
- Links opened in a new tab get `rel="noopener noreferrer"`.

## Editing in the browser

Users with the `edit_security` role see an "Edit" link in the menu of each page. The edit page has:

- a Markdown editor,
- the page name and position (used to rename the file),
- `Ctrl + S` to save.

A page can not be renamed with the name of an existing page.
