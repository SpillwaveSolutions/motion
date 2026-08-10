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
/// `set_workspace` when the user picks a folder (or by the `motion` CLI via
/// MOTION_WORKSPACE + MOTION_AUTO_OPEN).
struct WorkspaceState {
    root: Mutex<Option<PathBuf>>,
    /// True when launched as `motion <dir>` so the UI opens the folder on boot.
    auto_open: Mutex<bool>,
    /// Absolute note `motion <file.md>` asked for, opened once the folder loads.
    open_file: Mutex<Option<PathBuf>>,
}

#[derive(serde::Serialize)]
struct BootstrapInfo {
    root: Option<String>,
    #[serde(rename = "autoOpen")]
    auto_open: bool,
    #[serde(rename = "openFile")]
    open_file: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct MotionSettings {
    #[serde(rename = "launchMode", default = "default_launch_mode")]
    launch_mode: String,
    #[serde(default = "default_port")]
    port: u16,
    #[serde(rename = "openBrowser", default = "default_open_browser")]
    open_browser: bool,
}

fn default_launch_mode() -> String {
    "web".into()
}
fn default_port() -> u16 {
    3000
}
fn default_open_browser() -> bool {
    true
}

impl Default for MotionSettings {
    fn default() -> Self {
        Self {
            launch_mode: default_launch_mode(),
            port: default_port(),
            open_browser: default_open_browser(),
        }
    }
}

fn home_dir() -> PathBuf {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn settings_path() -> PathBuf {
    home_dir()
        .join(".config")
        .join("motion")
        .join("settings.json")
}

fn load_settings_file() -> MotionSettings {
    let path = settings_path();
    let Ok(text) = fs::read_to_string(&path) else {
        return MotionSettings::default();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

fn save_settings_file(settings: &MotionSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, text + "\n").map_err(|e| e.to_string())
}

/// Resolve MOTION_OPEN_FILE against the workspace root.
///
/// Kept inside the jail on purpose: the CLI may name any path it likes, but
/// bootstrap must never hand the UI something the filesystem commands would
/// then refuse to read — nor widen what they will serve. A rejected file is
/// silently dropped so a bad argument costs the note, never the session.
fn resolve_open_file(root: Option<&Path>, raw: Option<&str>) -> Option<PathBuf> {
    let root = root?;
    let raw = raw?.trim();
    if raw.is_empty() {
        return None;
    }
    let path = fs::canonicalize(Path::new(raw)).ok()?;
    (path.is_file() && path.starts_with(root)).then_some(path)
}

#[tauri::command]
fn get_bootstrap(state: State<'_, WorkspaceState>) -> Result<BootstrapInfo, String> {
    let root = state
        .root
        .lock()
        .map_err(|_| "Workspace lock poisoned".to_string())?
        .as_ref()
        .map(|p| p.to_string_lossy().into_owned());
    let auto_open = *state
        .auto_open
        .lock()
        .map_err(|_| "Workspace lock poisoned".to_string())?;
    let open_file = state
        .open_file
        .lock()
        .map_err(|_| "Workspace lock poisoned".to_string())?
        .as_ref()
        .map(|p| p.to_string_lossy().into_owned());
    Ok(BootstrapInfo {
        root,
        auto_open,
        open_file,
    })
}

#[derive(serde::Serialize)]
struct SettingsResponse {
    settings: MotionSettings,
    path: String,
    #[serde(rename = "cliInstallHint")]
    cli_install_hint: String,
}

#[tauri::command]
fn get_settings() -> Result<SettingsResponse, String> {
    Ok(SettingsResponse {
        settings: load_settings_file(),
        path: settings_path().to_string_lossy().into_owned(),
        cli_install_hint: "bun link  # from the Motion repo, or symlink bin/motion onto your PATH"
            .into(),
    })
}

#[tauri::command]
fn set_settings(partial: serde_json::Value) -> Result<SettingsResponse, String> {
    let mut current = load_settings_file();
    if let Some(m) = partial.get("launchMode").and_then(|v| v.as_str()) {
        if m == "web" || m == "desktop" {
            current.launch_mode = m.to_string();
        }
    }
    if let Some(p) = partial.get("port").and_then(|v| v.as_u64()) {
        if (1..=65535).contains(&p) {
            current.port = p as u16;
        }
    }
    if let Some(b) = partial.get("openBrowser").and_then(|v| v.as_bool()) {
        current.open_browser = b;
    }
    save_settings_file(&current)?;
    Ok(SettingsResponse {
        settings: current,
        path: settings_path().to_string_lossy().into_owned(),
        cli_install_hint: "bun link  # from the Motion repo, or symlink bin/motion onto your PATH"
            .into(),
    })
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
    // `motion <dir>` exports MOTION_WORKSPACE (+ MOTION_AUTO_OPEN) before start.
    let (initial_root, auto_open) = match std::env::var("MOTION_WORKSPACE") {
        Ok(raw) if !raw.trim().is_empty() => {
            match fs::canonicalize(Path::new(&raw)) {
                Ok(p) if p.is_dir() => {
                    let auto = matches!(
                        std::env::var("MOTION_AUTO_OPEN").as_deref(),
                        Ok("1") | Ok("true")
                    );
                    (Some(p), auto)
                }
                _ => (None, false),
            }
        }
        _ => (None, false),
    };

    // `motion <file.md>` additionally exports MOTION_OPEN_FILE.
    let initial_open_file = resolve_open_file(
        initial_root.as_deref(),
        std::env::var("MOTION_OPEN_FILE").ok().as_deref(),
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(WorkspaceState {
            root: Mutex::new(initial_root),
            auto_open: Mutex::new(auto_open),
            open_file: Mutex::new(initial_open_file),
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
            run_image_cli,
            get_bootstrap,
            get_settings,
            set_settings,
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

    /// `motion <file.md>` hands the UI a note to open on boot. It must be a
    /// real file inside the workspace, or bootstrap drops it.
    #[test]
    fn open_file_is_accepted_only_inside_the_workspace() {
        let dir = TempDir::new().unwrap();
        let root = fs::canonicalize(dir.path()).unwrap();
        let note = root.join("idea.md");
        fs::write(&note, "# Idea\n").unwrap();

        assert_eq!(
            resolve_open_file(Some(&root), Some(note.to_str().unwrap())),
            Some(note.clone()),
            "a note inside the workspace opens"
        );

        let elsewhere = TempDir::new().unwrap();
        let outside = fs::canonicalize(elsewhere.path()).unwrap().join("secret.md");
        fs::write(&outside, "").unwrap();
        assert_eq!(
            resolve_open_file(Some(&root), Some(outside.to_str().unwrap())),
            None,
            "a note outside the workspace must not widen the jail"
        );

        assert_eq!(
            resolve_open_file(Some(&root), Some(root.to_str().unwrap())),
            None,
            "a directory is not a note"
        );
        assert_eq!(
            resolve_open_file(Some(&root), Some(root.join("missing.md").to_str().unwrap())),
            None,
            "a path that does not exist is dropped, not reported"
        );
        assert_eq!(resolve_open_file(Some(&root), Some("   ")), None);
        assert_eq!(resolve_open_file(Some(&root), None), None);
        assert_eq!(
            resolve_open_file(None, Some(note.to_str().unwrap())),
            None,
            "no workspace means nothing to open into"
        );
    }

    #[test]
    fn refuses_every_operation_until_a_workspace_is_opened() {
        let state = WorkspaceState {
            root: Mutex::new(None),
            auto_open: Mutex::new(false),
            open_file: Mutex::new(None),
        };
        let err = workspace_root(&state).unwrap_err();
        assert!(err.contains("No workspace opened"), "got: {err}");
    }

    #[test]
    fn set_workspace_stores_the_canonical_root() {
        let dir = TempDir::new().unwrap();
        let state = WorkspaceState {
            root: Mutex::new(None),
            auto_open: Mutex::new(false),
            open_file: Mutex::new(None),
        };
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

        let state = WorkspaceState {
            root: Mutex::new(Some(root.clone())),
            auto_open: Mutex::new(false),
            open_file: Mutex::new(None),
        };

        let err = fs_core::resolve_in_workspace(&root, &outside.to_string_lossy())
            .expect_err("a directory outside the workspace must be refused");
        assert_eq!(err.code, fs_core::FsErrorCode::Denied);

        // And the stored root is untouched by the attempt.
        assert_eq!(workspace_root(&state).unwrap(), root);
    }
}
