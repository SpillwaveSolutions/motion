//! Workspace filesystem core -- the desktop counterpart to src/lib/fsCore.ts.
//!
//! Split out of lib.rs so it is testable: the `#[tauri::command]` functions take
//! `tauri::State`, which needs a running app, while everything that can actually
//! be wrong about a filesystem jail lives here as plain functions.
//!
//! Held to the same behaviour as the TypeScript implementation by
//! tests/contract/storage-cases.json, which both sides run.

use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum FsErrorCode {
    Denied,
    NotFound,
    NotADirectory,
    Exists,
}

impl FsErrorCode {
    /// Wire name shared with the contract fixture and the TypeScript side.
    pub fn as_str(self) -> &'static str {
        match self {
            FsErrorCode::Denied => "denied",
            FsErrorCode::NotFound => "not-found",
            FsErrorCode::NotADirectory => "not-a-directory",
            FsErrorCode::Exists => "exists",
        }
    }
}

#[derive(Debug)]
pub struct FsError {
    pub code: FsErrorCode,
    pub message: String,
}

impl FsError {
    fn new(code: FsErrorCode, message: impl Into<String>) -> Self {
        FsError { code, message: message.into() }
    }
}

impl std::fmt::Display for FsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

/// Commands return `Result<_, String>` to the frontend; the code is what tests
/// assert on.
impl From<FsError> for String {
    fn from(e: FsError) -> String {
        e.message
    }
}

pub type FsResult<T> = Result<T, FsError>;

pub const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd", "mdx"];
pub const DATA_EXTENSIONS: &[&str] = &["csv", "json", "jsonl"];

fn real_or_not_found(path: &Path) -> FsResult<PathBuf> {
    fs::canonicalize(path).map_err(|_| {
        FsError::new(
            FsErrorCode::NotFound,
            format!("No such file or directory: {}", path.display()),
        )
    })
}

/// Component-aware containment. `Path::starts_with` compares components, so
/// `/x/ws-evil` is correctly NOT inside `/x/ws` -- unlike a string prefix test.
/// The root itself counts as inside, because a top-level note's parent is the
/// root and `write_workspace_file` checks the parent too.
pub fn is_inside_workspace(root: &Path, candidate: &Path) -> bool {
    candidate.starts_with(root)
}

/// Turn a caller-supplied path into a canonical absolute path inside `root`.
///
/// A relative path resolves against the WORKSPACE ROOT, not the process working
/// directory. This previously returned an error ("Path has no parent
/// directory"), which is why the welcome document's `source: sample-data.csv`
/// worked in the browser and failed on the desktop. The browser side resolved it
/// against the cwd instead. Both now mean the same file.
///
/// A path that does not exist yet has its PARENT canonicalized with the file
/// name joined on, so a symlinked parent cannot be used to escape.
pub fn resolve_in_workspace(root: &Path, requested: &str) -> FsResult<PathBuf> {
    let root_real = real_or_not_found(root)?;

    let requested_path = Path::new(requested);
    let absolute: PathBuf = if requested_path.is_absolute() {
        requested_path.to_path_buf()
    } else {
        root_real.join(requested_path)
    };

    let resolved = if absolute.exists() {
        real_or_not_found(&absolute)?
    } else {
        let parent = absolute.parent().ok_or_else(|| {
            FsError::new(FsErrorCode::NotFound, "Path has no parent directory")
        })?;
        let file_name = absolute.file_name().ok_or_else(|| {
            FsError::new(FsErrorCode::NotFound, "Path has no file name")
        })?;
        // Canonicalizing the parent is what resolves any `..` or symlink in the
        // path of a file that does not exist yet -- without it those components
        // would reach the containment check unresolved.
        real_or_not_found(parent)?.join(file_name)
    };

    if !is_inside_workspace(&root_real, &resolved) {
        return Err(FsError::new(
            FsErrorCode::Denied,
            "Access denied: path is outside the opened workspace",
        ));
    }
    Ok(resolved)
}

fn assert_directory(path: &Path) -> FsResult<PathBuf> {
    let real = real_or_not_found(path)?;
    if !real.is_dir() {
        return Err(FsError::new(
            FsErrorCode::NotADirectory,
            format!("Not a directory: {}", path.display()),
        ));
    }
    Ok(real)
}

/// Recursive extension-filtered walk: dotdirs skipped, sorted, absolute paths.
pub fn collect_files(root: &Path, extensions: &[&str]) -> FsResult<Vec<String>> {
    let root_real = assert_directory(root)?;
    let mut out = Vec::new();
    walk(&root_real, extensions, &mut out)?;
    out.sort();
    Ok(out)
}

fn walk(dir: &Path, extensions: &[&str], out: &mut Vec<String>) -> FsResult<()> {
    let entries = fs::read_dir(dir).map_err(|e| {
        FsError::new(FsErrorCode::NotFound, format!("Failed to read {}: {e}", dir.display()))
    })?;

    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else { continue };

        if file_type.is_dir() {
            let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if name.starts_with('.') {
                continue;
            }
            walk(&path, extensions, out)?;
        } else if file_type.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                if extensions.contains(&ext.to_lowercase().as_str()) {
                    out.push(path.to_string_lossy().into_owned());
                }
            }
        }
    }
    Ok(())
}

pub fn read_workspace_file(root: &Path, requested: &str) -> FsResult<String> {
    let path = resolve_in_workspace(root, requested)?;
    if !path.exists() {
        return Err(FsError::new(
            FsErrorCode::NotFound,
            format!("No such file: {requested}"),
        ));
    }
    fs::read_to_string(&path)
        .map_err(|e| FsError::new(FsErrorCode::NotFound, e.to_string()))
}

pub fn write_workspace_file(root: &Path, requested: &str, content: &str) -> FsResult<()> {
    let path = resolve_in_workspace(root, requested)?;
    let root_real = real_or_not_found(root)?;

    if let Some(parent) = path.parent() {
        // The parent must also lie inside the workspace, so a symlinked
        // directory cannot carry the write out.
        if !is_inside_workspace(&root_real, parent) {
            return Err(FsError::new(
                FsErrorCode::Denied,
                "Access denied: path is outside the opened workspace",
            ));
        }
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| {
                FsError::new(FsErrorCode::NotFound, e.to_string())
            })?;
        }
    }

    fs::write(&path, content).map_err(|e| FsError::new(FsErrorCode::NotFound, e.to_string()))
}

/// Rename a file inside the workspace. Destination must also stay inside.
/// Existing destinations are refused (no overwrite).
pub fn rename_workspace_file(
    root: &Path,
    from_requested: &str,
    to_requested: &str,
) -> FsResult<PathBuf> {
    let from = resolve_in_workspace(root, from_requested)?;
    if !from.is_file() {
        return Err(FsError::new(
            FsErrorCode::NotFound,
            format!("No such file: {from_requested}"),
        ));
    }
    let to = resolve_in_workspace(root, to_requested)?;
    let root_real = real_or_not_found(root)?;
    if !is_inside_workspace(&root_real, &to) {
        return Err(FsError::new(
            FsErrorCode::Denied,
            "Access denied: path is outside the opened workspace",
        ));
    }
    if let Some(parent) = to.parent() {
        if !is_inside_workspace(&root_real, parent) {
            return Err(FsError::new(
                FsErrorCode::Denied,
                "Access denied: path is outside the opened workspace",
            ));
        }
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| {
                FsError::new(FsErrorCode::NotFound, e.to_string())
            })?;
        }
    }
    if to.exists() {
        if let (Ok(a), Ok(b)) = (fs::canonicalize(&to), fs::canonicalize(&from)) {
            if a == b {
                return Ok(to);
            }
        }
        return Err(FsError::new(
            FsErrorCode::Exists,
            "A file already exists at that name",
        ));
    }
    fs::rename(&from, &to)
        .map_err(|e| FsError::new(FsErrorCode::NotFound, e.to_string()))?;
    Ok(to)
}

/// A Finder / `open` launch target: the workspace is the file's parent
/// directory so the existing jail stays intact and the sidebar still lists
/// siblings. A directory opens as the workspace with no file selected.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct OpenedTarget {
    pub workspace: PathBuf,
    pub file: Option<PathBuf>,
}

/// Accept a `file://` URL or a plain filesystem path.
///
/// Called from the macOS `RunEvent::Opened` handler. Kept public and tested
/// on every OS so Linux CI still covers the mapping.
#[cfg_attr(
    not(any(target_os = "macos", target_os = "ios", target_os = "android")),
    allow(dead_code)
)]
pub fn path_from_opened_url(raw: &str) -> Result<PathBuf, String> {
    if !raw.contains("://") {
        return Ok(PathBuf::from(raw));
    }
    let parsed = url::Url::parse(raw).map_err(|e| e.to_string())?;
    if parsed.scheme() != "file" {
        return Err(format!("Unsupported URL scheme: {}", parsed.scheme()));
    }
    parsed
        .to_file_path()
        .map_err(|_| format!("Not a file URL: {raw}"))
}

pub fn opened_target_from_path(path: &Path) -> FsResult<OpenedTarget> {
    let real = real_or_not_found(path)?;
    if real.is_dir() {
        return Ok(OpenedTarget {
            workspace: real,
            file: None,
        });
    }
    let parent = real.parent().ok_or_else(|| {
        FsError::new(FsErrorCode::NotFound, "File has no parent directory")
    })?;
    Ok(OpenedTarget {
        workspace: parent.to_path_buf(),
        file: Some(real),
    })
}

#[cfg(test)]
mod contract {
    //! Runs tests/contract/storage-cases.json against the Rust implementation.
    //!
    //! src/lib/fsCore.contract.test.ts runs the SAME file against the TypeScript
    //! implementation. Neither language owns the fixture. If the two disagree
    //! about the jail, path resolution, listing order or error classes, one of
    //! the two suites goes red -- which is the only thing that keeps two
    //! hand-written implementations of one contract honest.
    use super::*;
    use serde_json::Value;
    use std::fs;
    use tempfile::TempDir;

    struct Fixture {
        _base: TempDir,
        root: PathBuf,
        outside: PathBuf,
    }

    fn contract_json() -> Value {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../tests/contract/storage-cases.json");
        serde_json::from_str(&fs::read_to_string(&path).expect("read contract")).expect("parse")
    }

    fn build(setup: &Value) -> Fixture {
        let base = TempDir::new().expect("tempdir");
        // macOS temp dirs sit behind a symlink (/var -> /private/var); the
        // implementation canonicalizes, so the fixture must too.
        let base_real = fs::canonicalize(base.path()).expect("canonicalize base");
        let root = base_real.join("ws");
        let outside = base_real.join("outside");
        fs::create_dir(&root).unwrap();
        fs::create_dir(&outside).unwrap();

        for (rel, body) in setup["files"].as_object().unwrap() {
            let target = root.join(rel);
            fs::create_dir_all(target.parent().unwrap()).unwrap();
            fs::write(target, body.as_str().unwrap()).unwrap();
        }
        for (rel, body) in setup["outside_files"].as_object().unwrap() {
            fs::write(outside.join(rel), body.as_str().unwrap()).unwrap();
        }
        for (name, target) in setup["symlinks"].as_object().unwrap() {
            #[cfg(unix)]
            std::os::unix::fs::symlink(root.join(target.as_str().unwrap()), root.join(name))
                .unwrap();
        }
        for suffix in setup["sibling_dirs"].as_array().unwrap() {
            let sibling = PathBuf::from(format!("{}{}", root.display(), suffix.as_str().unwrap()));
            fs::create_dir_all(&sibling).unwrap();
            fs::write(sibling.join("planted.md"), "# Planted\n").unwrap();
        }

        Fixture { _base: base, root, outside }
    }

    fn expand(path: &str, f: &Fixture) -> String {
        path.replace("$OUTSIDE", &f.outside.to_string_lossy())
            .replace("$ROOT", &f.root.to_string_lossy())
    }

    fn relative_paths(f: &Fixture, list: &[String]) -> Vec<String> {
        list.iter()
            .map(|p| {
                Path::new(p)
                    .strip_prefix(&f.root)
                    .unwrap_or(Path::new(p))
                    .to_string_lossy()
                    .replace('\\', "/")
            })
            .collect()
    }

    #[test]
    fn storage_contract_rust_implementation() {
        let contract = contract_json();
        let setup = &contract["setup"];
        let mut failures: Vec<String> = Vec::new();

        for case in contract["cases"].as_array().unwrap() {
            let name = case["name"].as_str().unwrap();
            let op = case["op"].as_str().unwrap();
            let want = case["expect"]["result"].as_str().unwrap();
            let f = build(setup);
            let path = case.get("path").and_then(|p| p.as_str()).map(|p| expand(p, &f));
            let dest = case.get("dest").and_then(|p| p.as_str()).map(|p| expand(p, &f));
            let content = case.get("content").and_then(|c| c.as_str()).unwrap_or("");

            // Every op collapses to (error code, string payload, list payload).
            let mut err_code: Option<&'static str> = None;
            let mut got_text: Option<String> = None;
            let mut got_list: Option<Vec<String>> = None;

            match op {
                "read" => match read_workspace_file(&f.root, path.as_deref().unwrap()) {
                    Ok(text) => got_text = Some(text),
                    Err(e) => err_code = Some(e.code.as_str()),
                },
                "write" => {
                    if let Err(e) = write_workspace_file(&f.root, path.as_deref().unwrap(), content)
                    {
                        err_code = Some(e.code.as_str());
                    }
                }
                "write_then_read" => {
                    match write_workspace_file(&f.root, path.as_deref().unwrap(), content) {
                        Err(e) => err_code = Some(e.code.as_str()),
                        Ok(()) => match read_workspace_file(&f.root, path.as_deref().unwrap()) {
                            Ok(text) => got_text = Some(text),
                            Err(e) => err_code = Some(e.code.as_str()),
                        },
                    }
                }
                "list_markdown" | "list_markdown_shape" => {
                    match collect_files(&f.root, MARKDOWN_EXTENSIONS) {
                        Ok(list) => got_list = Some(list),
                        Err(e) => err_code = Some(e.code.as_str()),
                    }
                }
                "list_data" => match collect_files(&f.root, DATA_EXTENSIONS) {
                    Ok(list) => got_list = Some(list),
                    Err(e) => err_code = Some(e.code.as_str()),
                },
                "rename" => {
                    match rename_workspace_file(
                        &f.root,
                        path.as_deref().unwrap(),
                        dest.as_deref().unwrap(),
                    ) {
                        Ok(_) => {}
                        Err(e) => err_code = Some(e.code.as_str()),
                    }
                }
                "rename_then_read" => {
                    match rename_workspace_file(
                        &f.root,
                        path.as_deref().unwrap(),
                        dest.as_deref().unwrap(),
                    ) {
                        Err(e) => err_code = Some(e.code.as_str()),
                        Ok(_) => match read_workspace_file(&f.root, dest.as_deref().unwrap()) {
                            Ok(text) => got_text = Some(text),
                            Err(e) => err_code = Some(e.code.as_str()),
                        },
                    }
                },
                other => panic!("unknown op in contract: {other}"),
            }

            if want != "ok" {
                match err_code {
                    Some(code) if code == want => {}
                    Some(code) => failures.push(format!("{name}: expected {want}, got {code}")),
                    None => failures.push(format!("{name}: expected {want}, but the call succeeded")),
                }
                continue;
            }

            if let Some(code) = err_code {
                failures.push(format!("{name}: expected ok, got error {code}"));
                continue;
            }

            if let Some(expected) = case["expect"].get("content").and_then(|c| c.as_str()) {
                let actual = got_text.clone().unwrap_or_default();
                if actual != expected {
                    failures.push(format!("{name}: content {actual:?} != {expected:?}"));
                }
            }

            if let Some(expected) = case["expect"].get("relative_paths").and_then(|p| p.as_array()) {
                let want_rel: Vec<String> =
                    expected.iter().map(|v| v.as_str().unwrap().to_string()).collect();
                let got_rel = relative_paths(&f, got_list.as_deref().unwrap_or(&[]));
                if got_rel != want_rel {
                    failures.push(format!("{name}: listing {got_rel:?} != {want_rel:?}"));
                }
            }

            if case["expect"].get("absolute").and_then(|a| a.as_bool()) == Some(true) {
                let list = got_list.clone().unwrap_or_default();
                if list.is_empty() || !list.iter().all(|p| Path::new(p).is_absolute()) {
                    failures.push(format!("{name}: listing is not all-absolute: {list:?}"));
                }
            }
        }

        assert!(
            failures.is_empty(),
            "storage contract violations ({}):\n  {}",
            failures.len(),
            failures.join("\n  ")
        );
    }
}

#[cfg(test)]
mod opened_file {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn a_file_opens_its_parent_as_the_workspace() {
        let dir = TempDir::new().unwrap();
        let notes = dir.path().join("notes");
        fs::create_dir(&notes).unwrap();
        let file = notes.join("plan.md");
        fs::write(&file, "# plan\n").unwrap();

        let target = opened_target_from_path(&file).unwrap();
        assert_eq!(target.workspace, fs::canonicalize(&notes).unwrap());
        assert_eq!(target.file.as_ref().unwrap(), &fs::canonicalize(&file).unwrap());
    }

    #[test]
    fn a_directory_opens_as_the_workspace_with_no_file() {
        let dir = TempDir::new().unwrap();
        let target = opened_target_from_path(dir.path()).unwrap();
        assert_eq!(target.workspace, fs::canonicalize(dir.path()).unwrap());
        assert!(target.file.is_none());
    }

    #[test]
    fn a_file_url_round_trips_to_the_same_path() {
        let dir = TempDir::new().unwrap();
        let file = dir.path().join("a.md");
        fs::write(&file, "").unwrap();
        let real = fs::canonicalize(&file).unwrap();
        let url = url::Url::from_file_path(&real).expect("file url");
        let parsed = path_from_opened_url(url.as_str()).unwrap();
        assert_eq!(fs::canonicalize(&parsed).unwrap(), real);
    }

    #[test]
    fn a_plain_path_is_accepted() {
        let path = path_from_opened_url("/tmp/note.md").unwrap();
        assert_eq!(path, PathBuf::from("/tmp/note.md"));
    }

    #[test]
    fn http_urls_are_refused() {
        let err = path_from_opened_url("https://example.com/a.md").unwrap_err();
        assert!(err.contains("Unsupported URL scheme"), "got {err}");
    }
}
