const STORAGE_KEY = "innercircle-demo-posts-v1";
const $ = (selector, root = document) => root.querySelector(selector);

const friends = {
  maya: { name: "Maya", role: "Supportive friend", avatar: "M", avatarClass: "avatar-maya" },
  leo: { name: "Leo", role: "Curious friend", avatar: "L", avatarClass: "avatar-leo" },
  sam: { name: "Sam", role: "Practical friend", avatar: "S", avatarClass: "avatar-sam" }
};

const starterPost = {
  id: "garden",
  text: "I finally finished the little garden I’ve been working on.",
  image: "assets/garden-post.jpg",
  mood: "Proud",
  timestamp: "Today at 9:14 AM",
  saved: false,
  responses: [
    { friend: "maya", text: "This looks wonderful, Sarah. You’ve created such a peaceful little corner." },
    { friend: "leo", text: "What part of building it made you happiest?" },
    { friend: "sam", text: "The herbs near the front should get excellent morning light." }
  ]
};

let posts = loadPosts();
let selectedImage = "";
let selectedMood = "";

function loadPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : [starterPost];
  } catch { return [starterPost]; }
}

function savePosts() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); }
  catch { showToast("That photo is too large for this browser demonstration."); }
}

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function makeResponses(text, mood) {
  const lower = text.toLowerCase();
  const isHard = /hard|tired|upset|sad|worried|frustrat|difficult|bad/.test(lower);
  const isWin = /finally|finished|proud|did it|success|great|happy|completed/.test(lower);
  const maya = isHard
    ? "That sounds like a lot to carry. I’m glad you gave yourself a place to say it out loud."
    : isWin
      ? "You deserve to feel good about this, Sarah. I can hear how much it means to you."
      : `Thank you for sharing this${mood ? ` while feeling ${mood.toLowerCase()}` : ""}. I’m here with you.`;
  const leo = isHard
    ? "What would feel like the gentlest next step—not the perfect one, just the gentlest?"
    : isWin
      ? "What part of this moment do you most want your future self to remember?"
      : "What feels most important about this moment to you?";
  const sam = isHard
    ? "Would it help to separate what needs attention today from what can safely wait?"
    : isWin
      ? "This may be worth saving as a memory so you can come back to it later."
      : "If you want, we can turn this thought into one small, practical next step.";
  return [
    { friend: "maya", text: maya },
    { friend: "leo", text: leo },
    { friend: "sam", text: sam }
  ];
}

function renderFeed(list = posts) {
  const feed = $("#feed");
  if (!list.length) {
    feed.innerHTML = `<div class="card empty-state"><div class="empty-icon">◇</div><h2>Nothing here yet</h2><p>Your saved moments will appear here whenever you choose “Save memory.”</p></div>`;
    return;
  }
  feed.innerHTML = list.map(post => `
    <article class="post card" data-id="${escapeHtml(post.id)}">
      <header class="post-head">
        <span class="avatar avatar-sarah">S</span>
        <div><strong>Sarah</strong><time>${escapeHtml(post.timestamp)}</time></div>
        ${post.mood ? `<span class="mood-label">Feeling ${escapeHtml(post.mood)}</span>` : ""}
        <button class="post-menu" aria-label="More options">···</button>
      </header>
      <p class="post-text">${escapeHtml(post.text)}</p>
      ${post.image ? `<img class="post-image" src="${post.image}" alt="Photo shared with this private post">` : ""}
      <div class="responses">
        ${post.responses.map(response => {
          const friend = friends[response.friend];
          return `<div class="response"><span class="avatar ${friend.avatarClass}">${friend.avatar}</span><div><strong>${friend.name}</strong><small>${friend.role}</small><p>${escapeHtml(response.text)}</p></div></div>`;
        }).join("")}
      </div>
      <div class="post-actions">
        <button class="post-action reflect-action">♡ Reflect</button>
        <button class="post-action save-action ${post.saved ? "saved" : ""}">${post.saved ? "◆ Saved" : "◇ Save memory"}</button>
        <button class="post-action reply-action">◯ Reply</button>
        ${post.id !== "garden" ? `<button class="post-action delete-action">Delete</button>` : ""}
      </div>
      <form class="reply-box" hidden><input maxlength="300" aria-label="Reply to your AI circle" placeholder="Reply to your AI circle…"><button class="primary-button">Send</button></form>
    </article>`).join("");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function resetComposer() {
  $("#postText").value = "";
  selectedImage = "";
  selectedMood = "";
  $("#photoInput").value = "";
  $("#imagePreviewWrap").hidden = true;
  $("#selectedMood").hidden = true;
}

$("#photoInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2_500_000) { showToast("For this demo, please choose a photo under 2.5 MB."); return; }
  const reader = new FileReader();
  reader.onload = () => {
    selectedImage = reader.result;
    $("#imagePreview").src = selectedImage;
    $("#imagePreviewWrap").hidden = false;
  };
  reader.readAsDataURL(file);
});

$("#removePhoto").addEventListener("click", () => {
  selectedImage = "";
  $("#photoInput").value = "";
  $("#imagePreviewWrap").hidden = true;
});

$("#moodButton").addEventListener("click", () => { $("#moodModal").hidden = false; });
$("#closeMood").addEventListener("click", () => { $("#moodModal").hidden = true; });
$("#moodModal").addEventListener("click", event => { if (event.target.id === "moodModal") event.currentTarget.hidden = true; });
document.querySelectorAll("[data-mood]").forEach(button => button.addEventListener("click", () => {
  selectedMood = button.dataset.mood;
  $("#selectedMood").textContent = selectedMood;
  $("#selectedMood").hidden = false;
  $("#moodModal").hidden = true;
}));

$("#postButton").addEventListener("click", () => {
  const text = $("#postText").value.trim();
  if (!text && !selectedImage) { showToast("Write something or add a photo first."); return; }
  const now = new Date();
  posts.unshift({
    id: `post-${Date.now()}`,
    text: text || "A moment I wanted to keep.",
    image: selectedImage,
    mood: selectedMood,
    timestamp: `Today at ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
    saved: false,
    responses: makeResponses(text, selectedMood)
  });
  savePosts();
  renderFeed();
  resetComposer();
  showToast("Posted privately. Your AI circle responded.");
});

$("#feed").addEventListener("click", event => {
  const article = event.target.closest(".post");
  if (!article) return;
  const post = posts.find(item => item.id === article.dataset.id);
  if (event.target.closest(".save-action")) {
    post.saved = !post.saved; savePosts(); renderFeed();
    showToast(post.saved ? "Saved to your memories." : "Removed from memories.");
  }
  if (event.target.closest(".reply-action")) article.querySelector(".reply-box").hidden = false;
  if (event.target.closest(".reflect-action")) showToast("Take a breath. What part of this moment stays with you?");
  if (event.target.closest(".delete-action")) {
    posts = posts.filter(item => item.id !== article.dataset.id); savePosts(); renderFeed(); showToast("Post deleted from this browser.");
  }
});

$("#feed").addEventListener("submit", event => {
  if (!event.target.matches(".reply-box")) return;
  event.preventDefault();
  const input = event.target.querySelector("input");
  if (!input.value.trim()) return;
  const article = event.target.closest(".post");
  const post = posts.find(item => item.id === article.dataset.id);
  post.responses.push({ friend: "maya", text: "I’m listening. Thank you for telling us a little more." });
  savePosts(); renderFeed(); showToast("Your private conversation continues.");
});

const viewContent = {
  memories: {
    title: "Your memories", subtitle: "Moments you chose to keep, without likes or algorithms.", render: () => renderGenericMemories()
  },
  friends: {
    title: "Your AI friends", subtitle: "Three perspectives, each with a different way of being there for you.", render: () => `
      ${Object.values(friends).map(friend => `<article class="friend-detail card"><span class="avatar ${friend.avatarClass}">${friend.avatar}</span><div><h3>${friend.name} · ${friend.role}</h3><p>${friend.name === "Maya" ? "Warm and affirming. Maya notices the emotional meaning behind what you share." : friend.name === "Leo" ? "Thoughtful and curious. Leo asks questions that help you understand yourself." : "Grounded and useful. Sam helps you find the next practical step when you want one."}</p></div></article>`).join("")}`
  },
  journal: {
    title: "Journal", subtitle: "A calm place for thoughts that need more room.", render: () => `<article class="card empty-state"><div class="empty-icon">▤</div><h2>Your longer reflections will live here</h2><p>This demonstration focuses on the private social feed. A future version could let your AI circle recognize themes across journal entries.</p></article>`
  },
  settings: {
    title: "Settings", subtitle: "You decide what this space remembers.", render: () => `<article class="card" style="padding:22px"><div class="setting-row"><div><strong>Remember conversations</strong><small>Let your AI circle refer to earlier posts.</small></div><button class="toggle on" aria-label="Toggle memory"></button></div><div class="setting-row"><div><strong>AI responses</strong><small>Invite your circle to respond to new posts.</small></div><button class="toggle on" aria-label="Toggle responses"></button></div><div class="setting-row"><div><strong>Private by design</strong><small>Sharing and public profiles do not exist in InnerCircle.</small></div><span class="online-pill">Always on</span></div></article>`
  }
};

function renderGenericMemories() {
  const saved = posts.filter(post => post.saved);
  if (!saved.length) return `<article class="card empty-state"><div class="empty-icon">◇</div><h2>No saved memories yet</h2><p>Choose “Save memory” beneath any post and it will appear here.</p></article>`;
  return `<div class="feed">${saved.map(post => `<article class="post card"><span class="mood-label">${escapeHtml(post.timestamp)}</span><p class="post-text">${escapeHtml(post.text)}</p>${post.image ? `<img class="post-image" src="${post.image}" alt="Saved memory">` : ""}</article>`).join("")}</div>`;
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  const view = button.dataset.view;
  const isFeed = view === "feed";
  $("#feedView").classList.toggle("active-view", isFeed);
  $("#genericView").classList.toggle("active-view", !isFeed);
  if (isFeed) {
    $("#pageTitle").textContent = "Good morning, Sarah";
    $("#pageSubtitle").textContent = "What would you like to remember about today?";
  } else {
    const content = viewContent[view];
    $("#pageTitle").textContent = content.title;
    $("#pageSubtitle").textContent = content.subtitle;
    $("#genericView").innerHTML = content.render();
  }
  $(".sidebar").classList.remove("open");
}));

document.addEventListener("click", event => {
  if (event.target.matches(".toggle")) event.target.classList.toggle("on");
});
$("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));

renderFeed();
