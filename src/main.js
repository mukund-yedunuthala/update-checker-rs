const { invoke } = window.__TAURI__.core;
const { load } = window.__TAURI__.store;
// Function to load and display stored repositories
async function loadRepos() {
  try {
    const repos = await invoke("get_stored_repos");
    const repoList = document.getElementById("repo-list");
    repoList.innerHTML = ""; // Clear the existing list

    repos.forEach((repo) => {
      const repoDiv = document.createElement("div");
      repoDiv.classList.add("repo-item");

      // Repo URL and versions
      const repoText = document.createElement("span");
      repoText.textContent = `${repo.url} System: ${repo.system_version} | Web: ${repo.web_version}`;

      // Determine button type
      const button = document.createElement("button");
      if (repo.system_version !== repo.web_version) {
        button.textContent = "Update";
        button.classList.add("update-btn");
        button.onclick = async () => {
          await markAsUpdated(repo.url, button);
        };
      } else {
        button.textContent = "Check";
        button.classList.add("check-btn");
        button.onclick = async () => {
          await checkForUpdate(repo.url, button);
        };
      }

      repoDiv.appendChild(repoText);
      repoDiv.appendChild(button);
      repoList.appendChild(repoDiv);
    });
  } catch (error) {
    console.error("Failed to load repositories:", error);
  }
}

async function loadReposFromStore() {
  try {
    const store = await load("repos.json", { autoSave: false });
  } catch (error) {
    console.error("Failed to load repositories from store.", error);
  }
}

// Function to add a new repository
async function addRepository() {
  const urlInput = document.getElementById("repo-url");
  const repoUrl = urlInput.value.trim();
  if (!repoUrl) return alert("Please enter a valid GitHub URL.");

  try {
    const isNew = await invoke("check_for_update", { url: repoUrl });
    if (isNew) {
      alert(`Repository ${repoUrl} has a newer release.`);
    } else {
      alert(`Repository ${repoUrl} is already up to date.`);
    }
    urlInput.value = ""; // Clear input
    loadRepos(); // Refresh list
  } catch (error) {
    console.error("Error adding repository:", error);
    alert("Failed to add repository.");
  }
}

// Function to check for updates on a single repo
async function checkForUpdate(repoUrl, button) {
  button.disabled = true;
  button.textContent = "Checking...";

  try {
    const isNew2 = await invoke("check_for_update_rewrite", { url: repoUrl });
    const isNew = await invoke("check_for_update", { url: repoUrl });
    if (isNew) {
      alert(`New update found for ${repoUrl}!`);
    } else {
      alert(`No new updates for ${repoUrl}.`);
    }
    loadRepos();
  } catch (error) {
    console.error("Error checking update:", error);
    alert("Failed to check update.");
  } finally {
    button.disabled = false;
    button.textContent = "Check";
  }
}

// Function to mark a repo as updated (sync system version with web version)
async function markAsUpdated(repoUrl, button) {
  button.disabled = true;
  button.textContent = "Updating...";

  try {
    await invoke("mark_as_updated", { url: repoUrl });
    alert(`${repoUrl} marked as updated.`);
    loadRepos();
  } catch (error) {
    console.error("Error marking update:", error);
    alert("Failed to mark as updated.");
  } finally {
    button.disabled = false;
    button.textContent = "Update";
  }
}

// Attach event listener to the "Add Repository" button
document.getElementById("add-repo").addEventListener("click", addRepository);

// Load repos on startup
window.addEventListener("DOMContentLoaded", loadRepos);
