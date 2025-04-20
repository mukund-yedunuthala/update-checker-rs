// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RepoInfo {
    url: String,
    system_version: String,
    web_version: String,
}

#[tauri::command]
async fn check_for_update(url: String, app: AppHandle) -> Result<bool, String> {
    // Git stuff
    let client = Client::new();
    let repo = url
        .trim_end_matches('/')
        .split('/')
        .rev()
        .take(2)
        .collect::<Vec<_>>();

    if repo.len() < 2 {
        return Err("Invalid GitHub URL".into());
    }

    let api_url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        repo[1], repo[0]
    );

    let response = client
        .get(&api_url)
        .header("User-Agent", "Tauri-GitHub-Tracker")
        .send()
        .await
        .map_err(|_| "Failed to fetch release data".to_string())?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|_| "Invalid response".to_string())?;

    let latest_release = json["tag_name"].as_str().unwrap_or("").to_string();
    // logic
    // store
    let store_obj = app.get_store("repos.json");
    match store_obj {
        Some(store) => {
            let value = store.get(url.clone());
            let is_new = match value {
                Some(_) => {
                    let existing_repo = store
                        .get(url.clone())
                        .expect("Failed to get value from store");
                    let mut existing_repo_info = RepoInfo {
                        url: existing_repo["value"]["url"].as_str().unwrap().to_string(),
                        system_version: existing_repo["value"]["system_version"]
                            .as_str()
                            .unwrap()
                            .to_string(),
                        web_version: existing_repo["value"]["web_version"]
                            .as_str()
                            .unwrap()
                            .to_string(),
                    };
                    let updated = existing_repo_info.web_version != latest_release;
                    if updated {
                        existing_repo_info.web_version = latest_release.clone();
                        store.set(
                            url.clone(),
                            json!({"value":
                                RepoInfo {
                                    url: url.clone(),
                                    system_version: existing_repo_info.system_version,
                                    web_version: existing_repo_info.web_version,
                                }
                            }),
                        );
                    }
                    updated
                }
                None => {
                    store.set(
                        url.clone(),
                        json!({"value":
                            RepoInfo {
                                url: url.clone(),
                                system_version: latest_release.clone(),
                                web_version: latest_release.clone(),
                            }
                        }),
                    );
                    false
                }
            };
            return Ok(is_new);
        }
        _ => Err("Store not found".to_string()),
    }
}

#[tauri::command]
fn get_stored_repos(app: AppHandle) -> Result<Vec<RepoInfo>, String> {
    let store_obj = app.get_store("repos.json");
    match store_obj {
        Some(store) => {
            let values = store.values();
            let mut repos_list: Vec<RepoInfo> = Vec::new();
            for value in values {
                if let (Some(url), Some(system_version), Some(web_version)) = (
                    value["value"].get("url").and_then(|v| v.as_str()),
                    value["value"]
                        .get("system_version")
                        .and_then(|v| v.as_str()),
                    value["value"].get("web_version").and_then(|v| v.as_str()),
                ) {
                    repos_list.push(RepoInfo {
                        url: url.to_string(),
                        system_version: system_version.to_string(),
                        web_version: web_version.to_string(),
                    });
                } else {
                    eprintln!("Skipping entry: {:?}", value); // Inspect the value
                }
            }
            Ok(repos_list)
        }
        _ => Err("Failed getting list of repos".to_string()),
    }
}

#[tauri::command]
fn mark_as_updated(url: String, app: AppHandle) -> Result<(), String> {
    let store_obj = app.get_store("repos.json");
    match store_obj {
        Some(store) => {
            if let Some(json_obj) = store.get(&url) {
                if let (Some(link), Some(web_version)) = (
                    json_obj["value"].get("url").and_then(|v| v.as_str()),
                    json_obj["value"]
                        .get("web_version")
                        .and_then(|v| v.as_str()),
                ) {
                    store.set(
                        url.clone(),
                        json!({"value":
                            RepoInfo {
                                url: link.to_string(),
                                system_version: web_version.to_string(),
                                web_version: web_version.to_string(),
                            }
                        }),
                    );
                } else {
                    eprintln!("Skipping entry: {:?}", json_obj); // Inspect the value
                }
            }
            Ok(())
        }
        _ => Err("Failed getting list of repos".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let _store = app.store("repos.json")?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_for_update,
            get_stored_repos,
            mark_as_updated
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
