// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct RepoInfo {
    url: String,
    latest_release: String,
}
type RepoDatabase = HashMap<String, RepoInfo>;

#[tauri::command]
async fn check_for_update(url: String, state: State<'_, AppState>) -> Result<bool, String> {
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

    let mut data = state.repos.lock().unwrap();

    // 🔹 Check if repo already exists
    let existing_entry = data.get(&url).cloned(); // Clone to avoid borrowing issues

    let is_new = match existing_entry {
        Some(repo_info) => repo_info.latest_release != latest_release,
        None => true, // If it doesn't exist, treat it as new
    };

    // 🔹 Update or insert into the database
    if is_new {
        data.insert(
            url.clone(),
            RepoInfo {
                url: url.clone(),
                latest_release: latest_release.clone(),
            },
        );
        save_data(&data);
    }

    Ok(is_new)
}

#[tauri::command]
fn get_stored_repos(state: State<'_, AppState>) -> Result<Vec<RepoInfo>, String> {
    let data = state.repos.lock().unwrap();
    let repos_list: Vec<RepoInfo> = data.values().cloned().collect();
    Ok(repos_list)
}

fn save_data(data: &RepoDatabase) {
    let json = serde_json::to_string_pretty(data).unwrap();
    fs::write("repos.json", json).expect("Failed to save data");
}

fn load_data() -> RepoDatabase {
    match fs::read_to_string("repos.json") {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| HashMap::new()),
        Err(_) => HashMap::new(),
    }
}

struct AppState {
    repos: Mutex<RepoDatabase>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        repos: Mutex::new(load_data()),
    };
    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![check_for_update, get_stored_repos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
