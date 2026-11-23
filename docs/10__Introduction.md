# Introduction

AliDocsBundle publishes documentation websites in a Symfony application. It is inspired by [Docusaurus](https://docusaurus.io/).

## Purpose

Write and publish the documentations of a Symfony application (user guide, developer documentation, usage instructions...) quickly, from the application itself, without another language or environment to install and maintain (Sphinx, Docusaurus...).

The documentations are Markdown files, published by the Symfony application with its own users and roles.

## How it works

A documentation is a folder of Markdown files. Each documentation is declared in the bundle configuration, with its own folder, title and access rules. An application can publish several documentations (for example: one public, one for the administrators, one per version).

## Features

### Reading

- Sidebar with the folders and pages, in the order of the files.
- Home page of each documentation, and an index page for each folder: one card per folder (with its first pages) and per page (with a short intro of its content).
- Breadcrumb at the top of the pages, previous / next links at the bottom.
- Table of contents of the page ("On this page") on wide screens, with the current section highlighted.
- Search in the page names and contents, with an excerpt around the word found.
- Menu to switch to another documentation (for example another version).
- Responsive layout: on small screens, the sidebar and the search are in a side panel.

### Writing

- Markdown files, with optional HTML (cleaned before being displayed, see [Writing a documentation](40__Writing.md)).
- Boxes for tips, information, warnings (`:::tip ... :::`), with one or several paragraphs.
- Links to a section of a page (`page.md#my-section`).
- Images, videos and PDF files stored with the pages.
- Edit page in the browser: Markdown editor, page name and position. `Ctrl + S` saves the page.

### Access and security

- A role to read each documentation (`view_security`), or public access.
- A role to edit each documentation (`edit_security`), required.
- The paths are checked: a page can not read or write files outside its documentation folder.

### Integration

- Interface in English and French, other languages can be added with translation files.
- Standalone pages: own layout and assets (Bootstrap 5, Turbo), independent of the templates and front-end tools of the application.
- Link back to the application, logo, favicon, extra stylesheets and scripts set in the configuration.
- Error pages (404, 403, 500) displayed with the documentation layout.
- Styles customizable with CSS variables.
- No database.

## Roadmap

- Create pages and folders from the interface, in addition to the edition of the existing pages.
