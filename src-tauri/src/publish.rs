//! Gist / Notion HTTP, the desktop counterpart of src/lib/publish/*.
//!
//! The webview cannot call these APIs (CSP connect-src is `'self' ipc:`, and
//! Notion does not allow browser CORS). These commands are the Tauri-side
//! transport, same shape as run_llm_cli.

use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;

/// reqwest applies no timeout of its own, so a GitHub or Notion request that
/// never answers leaves Share stuck on "Publishing…" with nothing to cancel.
const PUBLISH_TIMEOUT_SECS: u64 = 30;

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(PUBLISH_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Could not start the HTTP client: {e}"))
}

#[derive(Serialize)]
pub struct PublishResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn ok_url(url: String) -> PublishResult {
    PublishResult { ok: true, url: Some(url), error: None }
}

fn err(message: impl Into<String>) -> PublishResult {
    PublishResult { ok: false, url: None, error: Some(message.into()) }
}

fn gist_filename(name: &str) -> String {
    let trimmed = name.trim();
    let base = if trimmed.is_empty() { "note.md" } else { trimmed };
    base.replace(['/', '\\'], "-")
}

#[tauri::command]
pub async fn publish_gist(
    token: String,
    filename: String,
    content: String,
    public: Option<bool>,
    description: Option<String>,
) -> Result<PublishResult, String> {
    if token.trim().is_empty() {
        return Ok(err("missing-token"));
    }
    let client = http_client()?;
    let body = json!({
        "description": description.unwrap_or_default(),
        "public": public.unwrap_or(false),
        "files": { gist_filename(&filename): { "content": content } }
    });
    let res = client
        .post("https://api.github.com/gists")
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "Motion")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status();
    let val: Value = res.json().await.unwrap_or(Value::Null);
    if !status.is_success() {
        let msg = val
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Gist publish failed");
        return Ok(err(msg));
    }
    match val.get("html_url").and_then(|u| u.as_str()) {
        Some(url) => Ok(ok_url(url.to_string())),
        None => Ok(err("Gist response missing html_url")),
    }
}

#[tauri::command]
pub async fn publish_notion(
    token: String,
    parent_page_id: String,
    title: String,
    chunks: Vec<Value>,
) -> Result<PublishResult, String> {
    if token.trim().is_empty() {
        return Ok(err("missing-token"));
    }
    let client = http_client()?;
    let first = chunks.first().cloned().unwrap_or_else(|| json!([]));
    let create = client
        .post("https://api.notion.com/v1/pages")
        .header("Authorization", format!("Bearer {token}"))
        .header("Notion-Version", "2022-06-28")
        .header("Content-Type", "application/json")
        .json(&json!({
            "parent": { "page_id": parent_page_id },
            "properties": {
                "title": { "title": [{ "text": { "content": title.chars().take(2000).collect::<String>() } }] }
            },
            "children": first
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = create.status();
    let created: Value = create.json().await.unwrap_or(Value::Null);
    if !status.is_success() {
        let msg = created
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Notion create failed");
        return Ok(err(msg));
    }
    let url = created
        .get("url")
        .and_then(|u| u.as_str())
        .map(|s| s.to_string());
    let id = created.get("id").and_then(|i| i.as_str()).map(|s| s.to_string());
    if let Some(id) = id {
        for chunk in chunks.iter().skip(1) {
            let append = client
                .patch(format!("https://api.notion.com/v1/blocks/{id}/children"))
                .header("Authorization", format!("Bearer {token}"))
                .header("Notion-Version", "2022-06-28")
                .header("Content-Type", "application/json")
                .json(&json!({ "children": chunk }))
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !append.status().is_success() {
                let body: Value = append.json().await.unwrap_or(Value::Null);
                let msg = body
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("Notion append failed");
                return Ok(PublishResult {
                    ok: false,
                    url,
                    error: Some(msg.to_string()),
                });
            }
        }
    }
    match url {
        Some(u) => Ok(ok_url(u)),
        None => Ok(err("Notion response missing url")),
    }
}
