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

A box can contain several paragraphs, lists, links...: write `:::type` and `:::` on their own lines.

```markdown
:::warning
Before deleting a user:

- export their data,
- check their documents.
:::
```

## Links between pages

Use relative links to the files, with or without the `.md` extension:

```markdown
See [First steps](20__Getting%20started/20__First%20steps.md).
```

In the Markdown links and images, the spaces must be written `%20`: Markdown stops the link at the first space. Accents can be written as is.

### Table of contents and link to a section

On wide screens, the `##` and `###` headings of a page are listed on the right ("On this page"), when the page has at least two of them.


The `##` and `###` headings get an id made from their text (lowercase, without accents, words separated by `-`). Add it after `#` to link to a section:

```markdown
See [the settings](30__Guides/20__Settings.md#user-settings).
```

Here the target is the heading `## User settings`. If two headings have the same text, the second one gets `-2` (`#user-settings-2`).

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

As for the links, write the spaces `%20` in the Markdown images: `![Users](assets/users%20list.png)`. In the HTML tags (`<video>`, `<source>`...), the spaces can be written as is.

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
