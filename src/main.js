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
      const actionButton = document.createElement("button"); // Renamed for clarity
      if (repo.system_version !== repo.web_version) {
        actionButton.textContent = "Update";
        actionButton.classList.add("update-btn");
        actionButton.onclick = async () => {
          await markAsUpdated(repo.url, actionButton);
        };
      } else {
        actionButton.textContent = "Check";
        actionButton.classList.add("check-btn");
        actionButton.onclick = async () => {
          await checkForUpdate(repo.url, actionButton);
        };
      }

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("delete-btn"); // Add the delete-btn class
      deleteButton.onclick = async () => {
        await deleteEntry(repo.url, deleteButton);
      };

      repoDiv.appendChild(repoText);
      repoDiv.appendChild(deleteButton);
      repoDiv.appendChild(actionButton);
      repoList.appendChild(repoDiv);
    });
  } catch (error) {
    console.error("Failed to load repositories:", error);
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
      alert(`Repository ${repoUrl} added.`);
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
    const isNew = await invoke("check_for_update", { url: repoUrl });
    // const isNew = await invoke("check_for_update", { url: repoUrl });
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

async function deleteEntry(repoUrl, deleteButton) {
  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";

  try {
    await invoke("delete_entry", { url: repoUrl });
    alert(`${repoUrl} deleted.`);
    loadRepos();
  } catch (error) {
    console.error("Error deleting repo:", error);
    alert("Failed to delete.");
  } finally {
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
}

// Attach event listener to the "Add Repository" button
document.getElementById("add-repo").addEventListener("click", addRepository);

// Load repos on startup
window.addEventListener("DOMContentLoaded", loadRepos);
