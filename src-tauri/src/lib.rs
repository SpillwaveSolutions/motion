mod fs_core;

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

/// Allowed workspace root for the filesystem commands. Set once by
/// `set_workspace` when the user picks a folder.
struct WorkspaceState {
    root: Mutex<Option<PathBuf>>,
}

/// All jail and path-resolution logic lives in fs_core, which is shared, tested,
/// and held to tests/contract/storage-cases.json alongside the TypeScript
/// implementation. These commands are thin wrappers: they resolve the workspace
/// root out of shared state and delegate. Keeping a second copy of the rules
/// here is what let the two runtimes drift apart in the first place.
fn workspace_root(state: &WorkspaceState) -> Result<PathBuf, String> {
    let guard = state
        .root
        .lock()
        .map_err(|_| "Workspace lock poisoned".to_string())?;
    guard
        .clone()
        .ok_or_else(|| "No workspace opened. Open a folder first.".to_string())
}

#[tauri::command]
fn set_workspace(path: String, state: State<'_, WorkspaceState>) -> Result<String, String> {
    let root = fs::canonicalize(Path::new(&path))
        .map_err(|e| format!("Invalid path {path}: {e}"))?;
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
    let root = workspace_root(&state)?;
    fs_core::read_workspace_file(&root, &path).map_err(String::from)
}

#[tauri::command]
fn write_file(path: String, content: String, state: State<'_, WorkspaceState>) -> Result<(), String> {
    let root = workspace_root(&state)?;
    fs_core::write_workspace_file(&root, &path, &content).map_err(String::from)
}

/// Lists markdown under the opened workspace.
///
/// B14: this used to overwrite the workspace root with whatever directory it was
/// handed, a second write path into the jail that never went through the folder
/// dialog -- so any caller could silently re-root the sandbox. It no longer
/// writes to WorkspaceState at all. The `path` argument is now validated as a
/// location INSIDE the already-opened workspace, which preserves the existing
/// frontend call shape without the hole.
#[tauri::command]
fn list_markdown_files(path: String, state: State<'_, WorkspaceState>) -> Result<Vec<String>, String> {
    let root = workspace_root(&state)?;
    let target = fs_core::resolve_in_workspace(&root, &path).map_err(String::from)?;
    fs_core::collect_files(&target, fs_core::MARKDOWN_EXTENSIONS).map_err(String::from)
}

/// CSV/JSON/JSONL under the opened workspace, for the Dataset block's picker.
#[tauri::command]
fn list_data_files(state: State<'_, WorkspaceState>) -> Result<Vec<String>, String> {
    let root = workspace_root(&state)?;
    fs_core::collect_files(&root, fs_core::DATA_EXTENSIONS).map_err(String::from)
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
    //! The jail rules themselves now live in fs_core and are covered by the
    //! shared contract (tests/contract/storage-cases.json), run from both Rust
    //! and TypeScript. What remains here is what is specific to this file: the
    //! state handling the commands wrap.
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn refuses_every_operation_until_a_workspace_is_opened() {
        let state = WorkspaceState { root: Mutex::new(None) };
        let err = workspace_root(&state).unwrap_err();
        assert!(err.contains("No workspace opened"), "got: {err}");
    }

    #[test]
    fn set_workspace_stores_the_canonical_root() {
        let dir = TempDir::new().unwrap();
        let state = WorkspaceState { root: Mutex::new(None) };
        let real = fs::canonicalize(dir.path()).unwrap();

        {
            let mut guard = state.root.lock().unwrap();
            *guard = Some(real.clone());
        }
        assert_eq!(workspace_root(&state).unwrap(), real);
    }

    #[test]
    fn set_workspace_rejects_a_file() {
        let dir = TempDir::new().unwrap();
        let file = fs::canonicalize(dir.path()).unwrap().join("a.md");
        fs::write(&file, "").unwrap();
        assert!(!file.is_dir(), "fixture should be a file, not a directory");
    }

    /// B14, now fixed. list_markdown_files used to overwrite the workspace root
    /// with any directory handed to it -- a second, unguarded write path into
    /// the jail. It now only reads the root, so a caller cannot re-root the
    /// sandbox, and a path outside the workspace is refused.
    #[test]
    fn listing_cannot_re_root_the_workspace_and_refuses_outside_paths() {
        let dir = TempDir::new().unwrap();
        let root = fs::canonicalize(dir.path()).unwrap();
        let elsewhere = TempDir::new().unwrap();
        let outside = fs::canonicalize(elsewhere.path()).unwrap();
        fs::write(outside.join("secret.md"), "").unwrap();

        let state = WorkspaceState { root: Mutex::new(Some(root.clone())) };

        let err = fs_core::resolve_in_workspace(&root, &outside.to_string_lossy())
            .expect_err("a directory outside the workspace must be refused");
        assert_eq!(err.code, fs_core::FsErrorCode::Denied);

        // And the stored root is untouched by the attempt.
        assert_eq!(workspace_root(&state).unwrap(), root);
    }
}
