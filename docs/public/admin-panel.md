---
title: Admin Panel
description: Built-in visual editor for managing your Clearify site configuration
order: 5
summary: Guide to the built-in admin panel for managing projects, sections, and site settings through a visual interface during development.
category: documentation
tags: [clearify, admin, configuration, ui]
projects: [clearify]
status: active
---

# Admin Panel

Clearify ships with a built-in admin panel — a visual interface for managing your site's configuration without editing files by hand. It's designed for developers and technical writers who prefer a UI over JSON.

> The admin panel is **development-mode only**. It is not included in production builds.

## Accessing the Admin Panel

1. Start the dev server:

```bash
pnpm exec clearify dev
```

2. Click the **gear icon** in the site header, or navigate directly to `/admin`.

The admin panel has three pages accessible from the sidebar: **Projects**, **Sections**, and **Settings**.

## Projects

**Route:** `/admin/projects`

Manage hub projects — the entries that appear on your Hub Mode dashboard.

### Manual projects

These are projects you define explicitly. You can:

- **Add** a new project with the "+ Add Project" button
- **Edit** any project by clicking its row in the table
- **Delete** a project via the trash icon

The project form includes:

| Field | Description |
|-------|-------------|
| Name | Project identifier (required) |
| Description | Short project summary (required) |
| Icon | Emoji or icon character |
| Mode | `link`, `embed`, or `inject` — determines which additional fields appear |
| Status | `active`, `beta`, `planned`, or `deprecated` |
| Group | Logical grouping for the hub grid |
| Tags | Comma-separated category tags |

**Mode-conditional fields:**

- **Link** mode shows a URL (`href`) field
- **Embed** mode shows Git repo/ref fields and an embed-sections selector (`all` or `public`)
- **Inject** mode shows Git repo/ref fields, an "inject into" section ID, and a docs path

### Auto-discovered projects

Projects found via `hub.scan` appear in a separate read-only table below the manual list. These are managed by their respective child config files — edit the child `clearify.config.ts` to change them.

### Diff preview

Before any save or delete, the admin panel shows a diff preview of the changes that will be written to `clearify.data.json`. You can confirm or cancel.

## Sections

**Route:** `/admin/sections`

Manage documentation sections — the top-level content areas of your site.

### Section list

Sections are displayed as an ordered list. Each entry shows its label, docs directory path, base path, and status badges.

**Key features:**

- **Reorder** sections using the up/down arrow buttons. Order determines navigation priority
- **Add** a section with the "+ Add Section" button
- **Edit** or **Delete** sections with the action buttons on each row
- The **first section** automatically serves as the home page (marked with a "Home" badge)
- Sections marked as **Draft** appear dimmed and are excluded from production builds

### Section form

| Field | Description |
|-------|-------------|
| Label | Display name in the section switcher (required) |
| Docs Directory | Path to the section's markdown files (required) — includes a directory browser |
| Base Path | URL prefix (auto-generated from the label if left empty) |
| Draft | Toggle to hide the section from public navigation |

The **directory browser** lets you visually navigate your project's folder structure to select a docs directory, rather than typing the path manually.

## Site Settings

**Route:** `/admin/settings`

Configure global site properties.

### General

- **Site name** — displayed in the header and footer
- **Site URL** — production URL for canonical links and SEO

### Theme

- **Primary color** — pick from a color wheel or enter a hex value
- **Color mode** — choose between Light, Dark, or Auto using toggle pills

### Logo

- **Light logo path** — logo image for light mode
- **Dark logo path** — logo image for dark mode

### Links

A key-value editor for header/footer links (e.g. GitHub, Discord). Add, edit, or remove link entries as needed.

All changes show a diff preview before saving.

## How It Works

The admin panel is a React UI that communicates with a REST API served by the Vite dev server.

- **Data file:** All admin changes read from and write to `clearify.data.json` in your project root. This file is merged with `clearify.config.ts` at runtime — manual config entries take precedence, and the data file provides a layer that the admin UI can safely edit.
- **Auto-reload:** When `clearify.data.json` is updated, Vite's file watcher detects the change and triggers a hot reload automatically.
- **Dev-only:** The API endpoints are only available on the Vite dev server. They are not included in production builds.

## API Reference

The admin panel uses these REST endpoints on the Vite dev server:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/__clearify/api/config` | Full resolved config (config file + data file + scanned projects merged) |
| `GET` | `/__clearify/api/config/data` | Raw contents of `clearify.data.json` |
| `PUT` | `/__clearify/api/config/data` | Replace `clearify.data.json` entirely |
| `PATCH` | `/__clearify/api/config/data` | Deep-merge a partial update into `clearify.data.json` |
| `GET` | `/__clearify/api/config/schema` | JSON Schema for the data config |
| `GET` | `/__clearify/api/fs/dirs` | List subdirectories (used by the directory picker). Accepts `?root=` query param |

## Future: Git Gateway

A Git-based gateway for editing configuration from deployed sites is planned for a future release. This will allow admin panel access in production by committing changes through the Git API, removing the dev-server requirement.
