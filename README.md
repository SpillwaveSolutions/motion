# Motion

> Manage your ocean of markdown.

Motion is a **local-first technical writing IDE** designed to help you organize, edit, and visualize your documentation with ease. Built with performance and privacy in mind, Motion keeps your data on your machine, giving you full control over your files.

## Features

- **Local-First Architecture:** Your files stay on your device. Motion works directly with your local file system.
- **Hybrid Editing Experience:** Switch seamlessly between **WYSIWYG**, **Markdown**, and **Split View** modes.
- **Rich Content Support:**
  - Integrated **Mermaid** support for diagrams and charts.
  - Code blocks with syntax highlighting.
  - Full Markdown compatibility.
- **Workspace Management:** Open folders and navigate your project's markdown files instantly.
- **Performance:** Powered by **Bun** and **Tauri** for a lightweight, blazing-fast experience.

## Getting Started

### Prerequisites

- [Bun](https://bun.com) (v1.3 or later)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri development)

### Installation

1. Clone the repository.
2. Install dependencies:

   ```bash
   bun install
   ```

### Development

To start the development server and launch the application:

```bash
bun tauri dev
```

This command will:
1. Start the frontend dev server.
2. Launch the Tauri application window.

## Tech Stack

- **Runtime:** Bun
- **Frontend:** React, TypeScript, Tiptap
- **Backend:** Tauri (Rust)
- **Styling:** Custom CSS with CSS Variables