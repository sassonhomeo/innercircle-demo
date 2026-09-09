const KEYS = { posts: "innercircle-demo-posts-v2", legacyPosts: "innercircle-demo-posts-v1", settings: "innercircle-demo-settings-v2", journal: "innercircle-demo-journal-v1" };
const $ = (selector, root = document) => root.querySelector(selector);
const defaults = { name: "Sarah", theme: "navy", setupComplete: false };
const starterPost = {
  id: "garden", text: "I finally finished the little garden I’ve been working on.", image: "assets/garden-post.jpg", mood: "Proud", timestamp: "Today at 9:14 AM", saved: false
};

function loadJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
let settings = loadJson(KEYS.settings, defaults);
settings = { name: settings.name || defaults.name, theme: settings.theme || defaults.theme, setupComplete: Boolean(settings.setupComplete) };
function loadPosts() {
  const current = loadJson(KEYS.posts, null);
  const legacy = loadJson(KEYS.legacyPosts, null);
  const source = Array.isArray(current) && current.length ? current : Array.isArray(legacy) && legacy.length ? legacy : [starterPost];
  return source.map(({ responses, ...post }) => post);
}
let posts = loadPosts();
let journalEntries = loadJson(KEYS.journal, []);
let selectedImage = "", selectedMood = "", activeView = "feed";

function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { showToast("That item is too large to save in this browser."); return false; } }
const savePosts = () => persist(KEYS.posts, posts);
const saveSettings = () => persist(KEYS.settings, settings);
const saveJournal = () => persist(KEYS.journal, journalEntries);
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function firstName() { return (settings.name || "Friend").trim().split(/\s+/)[0]; }
function applyTheme() { document.body.classList.toggle("theme-orange", settings.theme === "orange"); }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"; }
function updateIdentity() {
  const initial = firstName().charAt(0).toUpperCase() || "F";
  document.querySelectorAll(".avatar-sarah").forEach(el => el.textContent = initial);
  const chip = $(".profile-chip span:last-child"); if (chip) chip.textContent = firstName();
  if (activeView === "feed") { $("#pageTitle").textContent = `${greeting()}, ${firstName()}`; $("#pageSubtitle").textContent = "Rant. Gloat. Whatever. Consider it zipped."; }
}

function renderFeed(list = posts) {
  const feed = $("#feed");
  if (!list.length) { feed.innerHTML = `<div class="card empty-state"><div class="empty-icon">◇</div><h2>Nothing here yet</h2><p>Your private posts will appear here.</p></div>`; return; }
  feed.innerHTML = list.map(post => `<article class="post card" data-id="${escapeHtml(post.id)}">
    <header class="post-head"><span class="avatar avatar-sarah">${escapeHtml(firstName().charAt(0))}</span><div><strong>${escapeHtml(firstName())}</strong><time>${escapeHtml(post.timestamp)}</time></div>${post.mood ? `<span class="mood-label">Feeling ${escapeHtml(post.mood)}</span>` : ""}<button class="post-menu" aria-label="More options">···</button></header>
    <p class="post-text">${escapeHtml(post.text)}</p>${post.image ? `<img class="post-image" src="${post.image}" alt="Photo shared with this private post">` : ""}
    <div class="post-actions"><button class="post-action save-action ${post.saved ? "saved" : ""}">${post.saved ? "◆ Saved" : "◇ Save memory"}</button><button class="post-action edit-action">Edit</button>${post.id !== "garden" ? `<button class="post-action delete-action">Delete</button>` : ""}</div>
  </article>`).join("");
  updateIdentity();
}

function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300); }
function resetComposer() { $("#postText").value = ""; selectedImage = ""; selectedMood = ""; $("#photoInput").value = ""; $("#imagePreviewWrap").hidden = true; $("#selectedMood").hidden = true; }

function renderJournal() {
  const entries = journalEntries.map(entry => `<article class="journal-entry card" data-journal-id="${escapeHtml(entry.id)}"><div class="journal-entry-head"><div><strong>${escapeHtml(entry.title || "Untitled reflection")}</strong><time>${escapeHtml(entry.date)}</time></div><div><button class="text-button journal-edit">Edit</button><button class="text-button journal-delete">Delete</button></div></div><p>${escapeHtml(entry.body)}</p></article>`).join("");
  return `<section class="journal-composer card"><p class="prompt-line">Today’s prompt</p><h2>What do you need to get off your chest today?</h2><input id="journalTitle" maxlength="100" placeholder="Give this entry a title (optional)"><textarea id="journalBody" rows="8" maxlength="6000" placeholder="Write whatever you need to say…"></textarea><div class="journal-actions"><span>Saved only in this browser</span><button id="saveJournalEntry" class="primary-button">Save journal entry</button></div></section><div class="journal-list">${entries || `<article class="card empty-state"><div class="empty-icon">▤</div><h2>Your journal is ready</h2><p>Your longer entries will appear here by date.</p></article>`}</div>`;
}

function renderSettings() {
  return `<article class="card settings-card"><div class="setting-block"><label for="displayName">Your name</label><p>The greeting will use this name.</p><div class="name-row"><input id="displayName" maxlength="50" value="${escapeHtml(settings.name)}"><button id="saveName" class="primary-button">Save name</button></div></div>
  <div class="setting-block"><label>Color theme</label><p>Choose the look you prefer. It will stay selected in this browser.</p><div class="theme-options"><button class="theme-option ${settings.theme === "navy" ? "active" : ""}" data-theme="navy"><span class="theme-swatch navy"></span>Navy Blue</button><button class="theme-option ${settings.theme === "orange" ? "active" : ""}" data-theme="orange"><span class="theme-swatch orange"></span>Zipped Orange</button></div></div>
  <div class="setting-block"><label>Your data</label><p>Download a backup before clearing browser data or moving devices.</p><div class="data-actions"><button id="exportData" class="secondary-button">Download backup</button><button id="resetData" class="danger-button">Reset this browser</button></div></div></article>`;
}

const viewContent = {
  memories: { title: "Your memories", subtitle: "Moments you chose to keep, without likes or algorithms.", render: () => { const saved = posts.filter(post => post.saved); return saved.length ? `<div class="feed">${saved.map(post => `<article class="post card"><span class="mood-label">${escapeHtml(post.timestamp)}</span><p class="post-text">${escapeHtml(post.text)}</p>${post.image ? `<img class="post-image" src="${post.image}" alt="Saved memory">` : ""}</article>`).join("")}</div>` : `<article class="card empty-state"><div class="empty-icon">◇</div><h2>No saved memories yet</h2><p>Choose “Save memory” beneath any post and it will appear here.</p></article>`; } },
  journal: { title: "Journal", subtitle: "For whatever doesn’t fit in one quick post.", render: renderJournal },
  settings: { title: "Settings", subtitle: "You decide what this space remembers.", render: renderSettings }
};

function switchView(view) {
  activeView = view; document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  const isFeed = view === "feed"; $("#feedView").classList.toggle("active-view", isFeed); $("#genericView").classList.toggle("active-view", !isFeed);
  if (isFeed) updateIdentity(); else { const content = viewContent[view]; $("#pageTitle").textContent = content.title; $("#pageSubtitle").textContent = content.subtitle; $("#genericView").innerHTML = content.render(); }
  $(".sidebar").classList.remove("open");
}

$("#photoInput").addEventListener("change", event => { const file = event.target.files[0]; if (!file) return; if (file.size > 2_500_000) return showToast("For this demo, please choose a photo under 2.5 MB."); const reader = new FileReader(); reader.onload = () => { selectedImage = reader.result; $("#imagePreview").src = selectedImage; $("#imagePreviewWrap").hidden = false; }; reader.readAsDataURL(file); });
$("#removePhoto").addEventListener("click", () => { selectedImage = ""; $("#photoInput").value = ""; $("#imagePreviewWrap").hidden = true; });
$("#moodButton").addEventListener("click", () => { $("#moodModal").hidden = false; });
$("#closeMood").addEventListener("click", () => { $("#moodModal").hidden = true; });
$("#moodModal").addEventListener("click", event => { if (event.target.id === "moodModal") event.currentTarget.hidden = true; });
document.querySelectorAll("[data-mood]").forEach(button => button.addEventListener("click", () => { selectedMood = button.dataset.mood; $("#selectedMood").textContent = selectedMood; $("#selectedMood").hidden = false; $("#moodModal").hidden = true; }));
$("#postButton").addEventListener("click", () => { const text = $("#postText").value.trim(); if (!text && !selectedImage) return showToast("Write something or add a photo first."); const now = new Date(); posts.unshift({ id: `post-${Date.now()}`, text: text || "A moment I wanted to keep.", image: selectedImage, mood: selectedMood, timestamp: `Today at ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, saved: false }); savePosts(); renderFeed(); resetComposer(); showToast("Posted."); });

$("#feed").addEventListener("click", event => {
  const article = event.target.closest(".post"); if (!article) return; const post = posts.find(item => item.id === article.dataset.id); if (!post) return;
  if (event.target.closest(".save-action")) { post.saved = !post.saved; savePosts(); renderFeed(); showToast(post.saved ? "Saved to your memories." : "Removed from memories."); }
  if (event.target.closest(".edit-action")) { const revised = prompt("Edit your post:", post.text); if (revised !== null && revised.trim()) { post.text = revised.trim(); savePosts(); renderFeed(); showToast("Post updated."); } }
  if (event.target.closest(".delete-action")) { posts = posts.filter(item => item.id !== article.dataset.id); savePosts(); renderFeed(); showToast("Post deleted from this browser."); }
});
$("#genericView").addEventListener("click", event => {
  if (event.target.id === "saveName") { const value = $("#displayName").value.trim(); if (!value) return showToast("Please enter a name."); settings.name = value; settings.setupComplete = true; saveSettings(); updateIdentity(); showToast("Your name is saved in this browser."); }
  const themeOption = event.target.closest(".theme-option"); if (themeOption) { settings.theme = themeOption.dataset.theme; saveSettings(); applyTheme(); switchView("settings"); showToast(`${themeOption.dataset.theme === "orange" ? "Zipped Orange" : "Navy Blue"} theme selected.`); return; }
  if (event.target.id === "saveJournalEntry") saveNewJournalEntry();
  const entryEl = event.target.closest(".journal-entry");
  if (entryEl && event.target.closest(".journal-delete")) { journalEntries = journalEntries.filter(entry => entry.id !== entryEl.dataset.journalId); saveJournal(); switchView("journal"); showToast("Journal entry deleted."); }
  if (entryEl && event.target.closest(".journal-edit")) { const entry = journalEntries.find(item => item.id === entryEl.dataset.journalId); const revised = prompt("Edit your journal entry:", entry.body); if (revised !== null && revised.trim()) { entry.body = revised.trim(); saveJournal(); switchView("journal"); showToast("Journal entry updated."); } }
  if (event.target.id === "exportData") exportData();
  if (event.target.id === "resetData" && confirm("Remove your posts, journal entries, name, and settings from this browser?")) { Object.values(KEYS).forEach(key => localStorage.removeItem(key)); location.reload(); }
});

function saveNewJournalEntry() { const body = $("#journalBody").value.trim(); if (!body) return showToast("Write something before saving your journal entry."); const title = $("#journalTitle").value.trim(); const now = new Date(); journalEntries.unshift({ id: `journal-${Date.now()}`, title, body, date: now.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }),  }); saveJournal(); switchView("journal"); showToast("Journal entry saved privately."); }
function exportData() { const data = JSON.stringify({ exportedAt: new Date().toISOString(), settings, posts, journalEntries }, null, 2); const url = URL.createObjectURL(new Blob([data], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `zippedlips-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); showToast("Backup downloaded."); }
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
$("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

function showSetup() {
  const backdrop = document.createElement("div"); backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal setup-modal" role="dialog" aria-modal="true" aria-labelledby="setupTitle"><span class="brand-mark">✦</span><p class="eyebrow">Welcome to ZippedLips</p><h2 id="setupTitle">What should we call you?</h2><p>Your name stays only in this browser and can be changed anytime.</p><input id="setupName" maxlength="50" placeholder="Your name"><button id="finishSetup" class="primary-button">Start posting</button></div>`;
  document.body.appendChild(backdrop); $("#setupName").focus();
  $("#finishSetup", backdrop).addEventListener("click", () => { const value = $("#setupName", backdrop).value.trim(); if (!value) return; settings.name = value; settings.setupComplete = true; saveSettings(); backdrop.remove(); renderFeed(); updateIdentity(); });
}
applyTheme(); renderFeed(); updateIdentity(); if (!settings.setupComplete) showSetup();
