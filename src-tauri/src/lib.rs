use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;
use tokio::process::Command as TokioCommand;
use tokio::time::timeout;

const LLM_TIMEOUT_SECS: u64 = 120;

/// Shells out to an LLM CLI (opencode/claude/qwen), mirroring
/// cliWrappers.ts's callLLM arg-building for each provider. This is the
/// Tauri-side counterpart to the dev server's POST /api/llm -- both exist
/// because Bun.spawn (what cliWrappers.ts itself uses) only works in a real
/// Bun process, never in the webview/browser-executed React code that calls
/// this command.
#[tauri::command]
async fn run_llm_cli(
    provider: String,
    prompt: String,
    system_prompt: Option<String>,
) -> Result<String, String> {
    let args: Vec<String> = match provider.as_str() {
        "claude" => {
            let mut a = vec!["-p".to_string(), prompt];
            if let Some(sp) = system_prompt {
                a.push("--system-prompt".to_string());
                a.push(sp);
            }
            a
        }
        "opencode" => vec!["--model".to_string(), "gpt-4o".to_string(), "--prompt".to_string(), prompt],
        "qwen" => vec!["--model".to_string(), "qwen-max".to_string(), "--prompt".to_string(), prompt],
        _ => return Err(format!("Unsupported provider: {provider}")),
    };

    let run = TokioCommand::new(&provider).args(&args).output();
    let output = timeout(Duration::from_secs(LLM_TIMEOUT_SECS), run)
        .await
        .map_err(|_| format!("CLI {provider} timed out after {LLM_TIMEOUT_SECS}s"))?
        .map_err(|e| format!("Failed to run {provider}: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("CLI {provider} failed: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Allowed workspace root for custom filesystem commands.
/// Paths for read/write/list must stay within this directory (after canonicalize).
struct WorkspaceState {
    root: Mutex<Option<PathBuf>>,
}

fn canonicalize_existing(path: &Path) -> Result<PathBuf, String> {
    fs::canonicalize(path).map_err(|e| format!("Invalid path {}: {e}", path.display()))
}

/// Resolve a path that may not exist yet (e.g. writing a new file).
/// Canonicalizes the parent and joins the file name so symlink escapes are caught.
fn resolve_path(path: &Path) -> Result<PathBuf, String> {
    if path.exists() {
        return canonicalize_existing(path);
    }
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .ok_or_else(|| "Path has no parent directory".to_string())?;
    let file_name = path
        .file_name()
        .ok_or_else(|| "Path has no file name".to_string())?;
    let parent_canon = canonicalize_existing(parent)?;
    Ok(parent_canon.join(file_name))
}

fn ensure_within_workspace(state: &WorkspaceState, path: &Path) -> Result<PathBuf, String> {
    let root_guard = state
        .root
        .lock()
        .map_err(|_| "Workspace lock poisoned".to_string())?;
    let root = root_guard
        .as_ref()
        .ok_or_else(|| "No workspace opened. Open a folder first.".to_string())?;
    let root_canon = canonicalize_existing(root)?;
    let resolved = resolve_path(path)?;

    if !resolved.starts_with(&root_canon) {
        return Err("Access denied: path is outside the opened workspace".to_string());
    }
    Ok(resolved)
}

#[tauri::command]
fn set_workspace(path: String, state: State<'_, WorkspaceState>) -> Result<String, String> {
    let root = canonicalize_existing(Path::new(&path))?;
    if !root.is_dir() {
        return Err("Workspace path is not a directory".to_string());
    }
    let display = root.to_string_lossy().into_owned();
    let mut guard = state
        .root
        .lock()
        .map_err(|_| "Workspace lock poisoned".to_string())?;
    *guard = Some(root);
    Ok(display)
}

#[tauri::command]
fn read_file(path: String, state: State<'_, WorkspaceState>) -> Result<String, String> {
    let resolved = ensure_within_workspace(&state, Path::new(&path))?;
    fs::read_to_string(&resolved).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String, state: State<'_, WorkspaceState>) -> Result<(), String> {
    let resolved = ensure_within_workspace(&state, Path::new(&path))?;
    if let Some(parent) = resolved.parent() {
        // Parent must also lie within the workspace.
        ensure_within_workspace(&state, parent)?;
    }
    fs::write(&resolved, content).map_err(|e| e.to_string())
}

fn collect_files_with_extensions(
    dir: &Path,
    extensions: &[&str],
    out: &mut Vec<String>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read {}: {e}", dir.display()))?;
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                log::warn!("Skipping unreadable directory entry under {}: {e}", dir.display());
                continue;
            }
        };
        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(e) => {
                log::warn!("Skipping {}: could not read file type: {e}", path.display());
                continue;
            }
        };

        if file_type.is_dir() {
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            // Skip hidden directories (e.g. .git, .DS_Store folders)
            if name.starts_with('.') {
                continue;
            }
            collect_files_with_extensions(&path, extensions, out)?;
        } else if file_type.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if extensions.contains(&ext) {
                    out.push(path.to_string_lossy().into_owned());
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn list_markdown_files(path: String, state: State<'_, WorkspaceState>) -> Result<Vec<String>, String> {
    let root = canonicalize_existing(Path::new(&path))?;
    if !root.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    {
        let mut guard = state
            .root
            .lock()
            .map_err(|_| "Workspace lock poisoned".to_string())?;
        *guard = Some(root.clone());
    }

    let mut files = Vec::new();
    collect_files_with_extensions(&root, &["md"], &mut files)?;
    files.sort();
    Ok(files)
}

/// Lists CSV/JSON/JSONL files under the already-opened workspace, for the
/// Dataset block's source picker. Unlike list_markdown_files, this doesn't
/// take a path -- it relies on a workspace already having been opened.
#[tauri::command]
fn list_data_files(state: State<'_, WorkspaceState>) -> Result<Vec<String>, String> {
    let root = {
        let guard = state
            .root
            .lock()
            .map_err(|_| "Workspace lock poisoned".to_string())?;
        guard
            .clone()
            .ok_or_else(|| "No workspace opened. Open a folder first.".to_string())?
    };

    let mut files = Vec::new();
    collect_files_with_extensions(&root, &["csv", "json", "jsonl"], &mut files)?;
    files.sort();
    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(WorkspaceState {
            root: Mutex::new(None),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_workspace,
            read_file,
            write_file,
            list_markdown_files,
            list_data_files,
            run_llm_cli
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
