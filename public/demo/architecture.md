# Architecture

Motion is a Tauri + React + TipTap app:

- The editor is TipTap, extended with custom node types for Mermaid diagrams,
  DuckDB-backed datasets and SQL queries, and AI-assisted diagram/image
  generation blocks.
- File access goes through a `StorageProvider` interface with two
  implementations: `TauriStorage` (real filesystem access via Rust commands,
  scoped to the opened workspace) and `WebStorage` (used when running in a
  plain browser, e.g. `bun run dev` -- reads real files from this demo
  workspace instead of the Tauri filesystem).
