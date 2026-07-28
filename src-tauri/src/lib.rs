use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;
use tokio::process::Command as TokioCommand;
use tokio::time::timeout;

const LLM_TIMEOUT_SECS: u64 = 120;
const IMAGE_TIMEOUT_SECS: u64 = 120;

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

/// Shells out to the `imagen` CLI (wraps Google's Gemini Imagen API) and
/// returns the generated PNG as a base64 data URI. Tauri-side counterpart to
/// the dev server's POST /api/image; see imageGen.ts for why this can't run
/// directly in the webview.
#[tauri::command]
async fn run_image_cli(prompt: String) -> Result<String, String> {
    let tmp_path = std::env::temp_dir().join(format!(
        "motion-imagegen-{}-{}.png",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0),
        std::process::id()
    ));

    let run = TokioCommand::new("imagen")
        .args(["generate", &prompt, "-o", &tmp_path.to_string_lossy()])
        .output();
    let output = timeout(Duration::from_secs(IMAGE_TIMEOUT_SECS), run)
        .await
        .map_err(|_| format!("imagen CLI timed out after {IMAGE_TIMEOUT_SECS}s"))?
        .map_err(|e| format!("Failed to run imagen: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("imagen CLI failed: {stderr}"));
    }

    let bytes = fs::read(&tmp_path).map_err(|e| format!("imagen produced no readable output: {e}"))?;
    let _ = fs::remove_file(&tmp_path);
    Ok(format!("data:image/png;base64,{}", BASE64.encode(bytes)))
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
            run_llm_cli,
            run_image_cli
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// macOS temp dirs live under a symlink (/var -> /private/var), so every
    /// expectation has to be built from the canonicalized root, never the raw
    /// TempDir path.
    fn workspace() -> (TempDir, WorkspaceState) {
        let dir = TempDir::new().expect("temp dir");
        let root = fs::canonicalize(dir.path()).expect("canonicalize root");
        let state = WorkspaceState {
            root: Mutex::new(Some(root)),
        };
        (dir, state)
    }

    fn root_of(dir: &TempDir) -> PathBuf {
        fs::canonicalize(dir.path()).expect("canonicalize")
    }

    #[test]
    fn rejects_everything_until_a_workspace_is_opened() {
        let state = WorkspaceState {
            root: Mutex::new(None),
        };
        let err = ensure_within_workspace(&state, Path::new("/etc/passwd")).unwrap_err();
        assert!(err.contains("No workspace opened"), "got: {err}");
    }

    #[test]
    fn allows_a_file_inside_the_workspace() {
        let (dir, state) = workspace();
        let file = root_of(&dir).join("note.md");
        fs::write(&file, "hi").unwrap();

        let resolved = ensure_within_workspace(&state, &file).expect("should be allowed");
        assert_eq!(resolved, file);
    }

    #[test]
    fn allows_a_file_that_does_not_exist_yet() {
        // write_file depends on this: a new note has no inode until it is saved.
        let (dir, state) = workspace();
        let file = root_of(&dir).join("brand-new.md");

        let resolved = ensure_within_workspace(&state, &file).expect("should be allowed");
        assert_eq!(resolved, file);
        assert!(!file.exists(), "resolution must not create the file");
    }

    #[test]
    fn rejects_parent_traversal() {
        let (dir, state) = workspace();
        let escape = root_of(&dir).join("..").join("outside.md");

        let err = ensure_within_workspace(&state, &escape).unwrap_err();
        assert!(err.contains("outside the opened workspace"), "got: {err}");
    }

    /// The sibling-prefix escape. A workspace at `/x/ws` must not admit
    /// `/x/ws-evil/...`, even though the second string starts with the first.
    /// Rust's Path::starts_with is component-aware so this passes here -- the
    /// test exists to pin that guarantee, because the HTTP jail added in Phase 1
    /// must match it and a naive JS `startsWith` would not.
    #[test]
    fn rejects_a_sibling_directory_sharing_the_workspace_prefix() {
        let parent = TempDir::new().unwrap();
        let base = fs::canonicalize(parent.path()).unwrap();

        let ws = base.join("ws");
        let evil = base.join("ws-evil");
        fs::create_dir(&ws).unwrap();
        fs::create_dir(&evil).unwrap();
        let target = evil.join("secrets.md");
        fs::write(&target, "secret").unwrap();

        let state = WorkspaceState {
            root: Mutex::new(Some(ws)),
        };

        let err = ensure_within_workspace(&state, &target).unwrap_err();
        assert!(err.contains("outside the opened workspace"), "got: {err}");
    }

    #[test]
    fn rejects_a_symlink_that_points_outside_the_workspace() {
        let (dir, state) = workspace();
        let outside = TempDir::new().unwrap();
        let secret = fs::canonicalize(outside.path()).unwrap().join("secret.md");
        fs::write(&secret, "secret").unwrap();

        let link = root_of(&dir).join("looks-local.md");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&secret, &link).unwrap();

        let err = ensure_within_workspace(&state, &link).unwrap_err();
        assert!(err.contains("outside the opened workspace"), "got: {err}");
    }

    #[test]
    fn resolve_path_rejects_a_bare_relative_path() {
        // Why the welcome document's `source: sample-data.csv` fails on desktop
        // while working in the browser (B5): a bare filename has no parent to
        // canonicalize.
        let err = resolve_path(Path::new("sample-data.csv")).unwrap_err();
        assert!(err.contains("no parent directory"), "got: {err}");
    }

    #[test]
    fn collects_only_the_requested_extensions_and_skips_dotdirs() {
        let dir = TempDir::new().unwrap();
        let root = fs::canonicalize(dir.path()).unwrap();
        fs::write(root.join("a.md"), "").unwrap();
        fs::write(root.join("b.csv"), "").unwrap();
        fs::create_dir(root.join("nested")).unwrap();
        fs::write(root.join("nested").join("c.md"), "").unwrap();
        fs::create_dir(root.join(".hidden")).unwrap();
        fs::write(root.join(".hidden").join("d.md"), "").unwrap();

        let mut found = Vec::new();
        collect_files_with_extensions(&root, &["md"], &mut found).unwrap();
        found.sort();

        assert_eq!(found.len(), 2, "got: {found:?}");
        assert!(found.iter().any(|p| p.ends_with("a.md")));
        assert!(found.iter().any(|p| p.ends_with("c.md")));
        assert!(
            !found.iter().any(|p| p.contains(".hidden")),
            "dotdirs must be skipped: {found:?}"
        );
    }

    /// B14, pinned as-is rather than fixed: list_markdown_files re-roots the
    /// jail to whatever directory it is handed, a second write path to
    /// WorkspaceState that never goes through the folder dialog. This test
    /// documents today's behaviour so Phase 1's decision to keep or remove it is
    /// a deliberate change with a failing test attached, not a silent drift.
    #[test]
    fn b14_workspace_root_is_reassignable_without_set_workspace() {
        let (dir, state) = workspace();
        let elsewhere = TempDir::new().unwrap();
        let new_root = fs::canonicalize(elsewhere.path()).unwrap();

        // Mirrors what list_markdown_files does to the shared state.
        {
            let mut guard = state.root.lock().unwrap();
            *guard = Some(new_root.clone());
        }

        let target = new_root.join("now-reachable.md");
        fs::write(&target, "").unwrap();
        assert!(
            ensure_within_workspace(&state, &target).is_ok(),
            "documents current behaviour: the jail followed the new root"
        );
        let _ = dir;
    }
}
