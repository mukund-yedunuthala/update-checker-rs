const { invoke } = window.__TAURI__.core;

let updateInputEl;
let updateCheckEl;

async function checkForUpdate() {
  updateCheckEl.textContent = await invoke("check_for_update", {
    url: updateInputEl.value,
  });
}

window.addEventListener("DOMContentLoaded", () => {
  updateCheckEl = document.querySelector("#update-check-msg");
  updateInputEl = document.querySelector("#update-check-input");
  document
    .querySelector("#update-check-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      checkForUpdate();
    });
});
