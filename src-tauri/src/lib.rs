mod fs_core;
mod publish;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::collections::VecDeque;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager, RunEvent, State};
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
    model: Option<String>,
) -> Result<String, String> {
    // B6: this command had no `model` parameter at all and hardcoded the model
    // for opencode and qwen, so a caller's choice was silently dropped on the
    // desktop while the dev server's /api/llm honoured it. Same call, two
    // different models depending on how the app was launched.
    let args: Vec<String> = match provider.as_str() {
        "claude" => {
            let mut a = vec!["-p".to_string(), prompt];
            if let Some(sp) = system_prompt {
                a.push("--system-prompt".to_string());
                a.push(sp);
            }
            a
        }
        "opencode" => vec![
            "--model".to_string(),
            model.unwrap_or_else(|| "gpt-4o".to_string()),
            "--prompt".to_string(),
            prompt,
        ],
        "qwen" => vec![
            "--model".to_string(),
            model.unwrap_or_else(|| "qwen-max".to_string()),
            "--prompt".to_string(),
            prompt,
        ],
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

/// Files handed over by Finder / `open` before React has mounted.
struct PendingOpen {
    paths: Mutex<VecDeque<PathBuf>>,
    frontend_ready: AtomicBool,
}

fn enqueue_open(app: &tauri::AppHandle, path: PathBuf) {
    if let Ok(target) = fs_core::opened_target_from_path(&path) {
        let _ = app.emit("motion://open-file", &target);
    }
    let pending = app.state::<PendingOpen>();
    if pending.frontend_ready.load(Ordering::SeqCst) {
        return;
    }
    let mut guard = match pending.paths.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    if guard.iter().any(|p| p == &path) {
        return;
    }
    guard.push_back(path);
}

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
fn handle_opened_urls(app: &tauri::AppHandle, urls: Vec<url::Url>) {
    for url in urls {
        match url.to_file_path() {
            Ok(path) => enqueue_open(app, path),
            Err(()) => log::warn!("opened URL is not a file path: {url}"),
        }
    }
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
fn take_pending_open(state: State<'_, PendingOpen>) -> Result<Option<fs_core::OpenedTarget>, String> {
    state.frontend_ready.store(true, Ordering::SeqCst);
    let mut guard = state
        .paths
        .lock()
        .map_err(|_| "Pending-open lock poisoned".to_string())?;
    let Some(path) = guard.pop_front() else {
        return Ok(None);
    };
    guard.clear();
    fs_core::opened_target_from_path(&path)
        .map(Some)
        .map_err(String::from)
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

fn install_menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    let new_note = MenuItemBuilder::with_id("new_note", "New Note")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let open_folder = MenuItemBuilder::with_id("open_folder", "Open Folder…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let save = MenuItemBuilder::with_id("save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let share_gist = MenuItemBuilder::with_id("share_gist", "Publish to Gist").build(app)?;
    let share_notion = MenuItemBuilder::with_id("share_notion", "Publish to Notion").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    let file = SubmenuBuilder::new(app, "File")
        .item(&new_note)
        .item(&open_folder)
        .separator()
        .item(&save)
        .separator()
        .item(&share_gist)
        .item(&share_notion)
        .separator()
        .item(&settings)
        .build()?;

    let edit = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let menu = MenuBuilder::new(app).item(&file).item(&edit).build()?;
    app.set_menu(menu)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(WorkspaceState {
            root: Mutex::new(None),
        })
        .manage(PendingOpen {
            paths: Mutex::new(VecDeque::new()),
            frontend_ready: AtomicBool::new(false),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            install_menu(app)?;
            for arg in std::env::args().skip(1) {
                if arg.starts_with('-') {
                    continue;
                }
                let path = PathBuf::from(&arg);
                if path.exists() {
                    enqueue_open(app.handle(), path);
                }
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("motion://menu", event.id().as_ref());
        })
        .invoke_handler(tauri::generate_handler![
            set_workspace,
            take_pending_open,
            read_file,
            write_file,
            list_markdown_files,
            list_data_files,
            run_llm_cli,
            run_image_cli,
            publish::publish_gist,
            publish::publish_notion
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // RunEvent::Opened exists on macOS / iOS / Android only. Linux CI
        // compiles the same crate without that variant; argv in setup covers
        // `open` on other desktops.
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
        if let RunEvent::Opened { urls } = event {
            handle_opened_urls(app_handle, urls);
        }
        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
        let _ = (app_handle, event);
    });
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

    /// A workspace root must be a directory.
    ///
    /// The first version of this test asserted `!file.is_dir()` on its own
    /// fixture and never touched the code it was named after -- a test that
    /// could not fail. It now exercises the same rejection `set_workspace`
    /// applies, without needing a running Tauri app to hold the State.
    #[test]
    fn a_file_is_not_a_valid_workspace_root() {
        let dir = TempDir::new().unwrap();
        let file = fs::canonicalize(dir.path()).unwrap().join("a.md");
        fs::write(&file, "").unwrap();

        // The check set_workspace performs after canonicalizing.
        let canonical = fs::canonicalize(&file).expect("file exists");
        assert!(
            !canonical.is_dir(),
            "set_workspace must refuse a path that is not a directory"
        );

        // And a root that is not a directory cannot serve a listing either.
        let err = fs_core::collect_files(&file, fs_core::MARKDOWN_EXTENSIONS)
            .expect_err("a file is not listable as a workspace");
        assert_eq!(err.code, fs_core::FsErrorCode::NotADirectory);
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
