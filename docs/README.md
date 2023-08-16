# Downstream Docs

Downstream documentation for how to play and how to create extensions, including API docs.

## Content and Website

The content is all in markdown files inside the ./content/ folder.

This module is a [Docusaurus 2](https://docusaurus.io/) project, which is a react based framework for generating a static website.

The website generated combines react components on the ./src directory, with docusaurus plugins to display some headers, footers and the markdown content in a nicely browseable way.

## Markdown Frontmatter

When built into the website, docusaurus looks at meta data at the top of the markdown files known as Frontmatter.

```
---
sidebar_position: 4
title: Code Docs
---

# MD content here...
```


Currently these are being used to set the ordering and title of the docs.
* Each file can specify an order with `sidebar_position` and a title with `title`.
* Each folder can generate an 'index' file by creating a .md file with the same name as the folder. This can then have frontmatter that sest ordering at the folder level.

## Building the website

```
$ npm install
```

```
$ npm start
```
This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

```
$ npm run build
```
This command generates static content into the `build` directory and can be served using any static contents hosting service.

