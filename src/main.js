const { invoke } = window.__TAURI__.core;

document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("repo-url");
  const checkButton = document.getElementById("check-update");
  const message = document.getElementById("message");
  const repoList = document.getElementById("repo-list");

  // Function to fetch and display stored repos
  async function loadRepos() {
    try {
      const repos = await invoke("get_stored_repos");
      repoList.innerHTML = ""; // Clear previous entries

      if (repos.length === 0) {
        repoList.innerHTML = "<p>No repositories tracked yet.</p>";
        return;
      }

      repos.forEach((repo) => {
        const repoItem = document.createElement("div");
        repoItem.classList.add("repo-item");
        repoItem.innerHTML = `<strong>${repo.url}</strong> - Latest Release: ${repo.latest_release}`;
        repoList.appendChild(repoItem);
      });
    } catch (error) {
      console.error("Error loading repos:", error);
      repoList.innerHTML = "<p>Failed to load repositories.</p>";
    }
  }

  // Fetch stored repositories on page load
  await loadRepos();

  checkButton.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      message.textContent = "Please enter a valid GitHub repo URL.";
      return;
    }

    try {
      const isNew = await invoke("check_for_update", { url });
      message.textContent = isNew
        ? "A new release is available!"
        : "You're up to date.";

      await loadRepos(); // Refresh stored repo list after checking
    } catch (error) {
      console.error("Error checking update:", error);
      message.textContent = "Error checking update.";
    }
  });
});
