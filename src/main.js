const { invoke } = window.__TAURI__.core;

// Function to load and display stored repositories
async function loadRepos() {
  try {
    const repos = await invoke("get_stored_repos");
    const repoList = document.getElementById("repo-list");
    repoList.innerHTML = ""; // Clear the existing list

    repos.forEach((repo) => {
      const repoDiv = document.createElement("div");
      repoDiv.classList.add("repo-item");

      // Repo URL
      const repoText = document.createElement("span");
      repoText.textContent = `${repo.url} (Latest: ${repo.latest_release})`;

      // Check button
      const checkButton = document.createElement("button");
      checkButton.textContent = "Check";
      checkButton.onclick = async () => {
        await checkForUpdate(repo.url, checkButton);
      };

      repoDiv.appendChild(repoText);
      repoDiv.appendChild(checkButton);
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
      alert(`Repository ${repoUrl} added successfully!`);
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
  button.disabled = true; // Disable button during the check
  button.textContent = "Checking...";

  try {
    const isNew = await invoke("check_for_update", { url: repoUrl });
    if (isNew) {
      alert(`New update found for ${repoUrl}!`);
    } else {
      alert(`No new updates for ${repoUrl}.`);
    }
    loadRepos(); // Refresh UI
  } catch (error) {
    console.error("Error checking update:", error);
    alert("Failed to check update.");
  } finally {
    button.disabled = false;
    button.textContent = "Check";
  }
}

// Attach event listener to the "Add Repository" button
document.getElementById("add-repo").addEventListener("click", addRepository);

// Load repos on startup
window.addEventListener("DOMContentLoaded", loadRepos);
