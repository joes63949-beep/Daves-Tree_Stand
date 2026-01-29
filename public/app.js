// Dave's Tree Stand front-end logic

const MAP_QUERY = encodeURIComponent("E 67th St between Park Ave and Lexington Ave Manhattan NY");
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`;
const APPLE_MAPS_URL = `https://maps.apple.com/?q=${MAP_QUERY}`;

const el = (id) => document.getElementById(id);

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function apiJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data && data.error ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Preorder form submit
async function setupPreorder() {
  const form = el("preorderForm");
  const msg = el("preorderMsg");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Submitting…";

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    // Convert checkbox fields to booleans
    payload.want_installation = fd.get("want_installation") !== null;
    payload.want_tree_decorating = fd.get("want_tree_decorating") !== null;
    payload.want_tree_removal = fd.get("want_tree_removal") !== null;

    // quantity should be numeric
    payload.quantity = Number(payload.quantity || 1);

    try {
      await apiJSON("/api/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      msg.textContent = "✅ Pre-order received! We’ll follow up soon.";
      form.reset();

      // default the installation checkbox back to checked after reset
      const install = form.querySelector('input[name="want_installation"]');
      if (install) install.checked = true;
    } catch (err) {
      msg.textContent = `❌ ${err.message}`;
    }
  });
}

// Posts board
let state = {
  page: 1,
  pageSize: 8,
  category: "All",
  q: ""
};

function renderPosts(container, rows) {
  if (!rows || rows.length === 0) {
    container.innerHTML = `<div class="post"><div class="post-title">No posts yet.</div><div class="post-body">Be the first to leave a review or share an update.</div></div>`;
    return;
  }

  container.innerHTML = rows.map((p) => {
    const catLabel = p.category === "WhatsNew" ? "What’s New" : p.category;
    return `
      <div class="post">
        <div class="post-top">
          <div>
            <div class="post-title">${escapeHtml(p.title)}</div>
            <div class="post-meta">
              <span class="cat ${escapeHtml(p.category)}">${escapeHtml(catLabel)}</span>
              &nbsp;•&nbsp; ${escapeHtml(p.display_name)} &nbsp;•&nbsp; ${escapeHtml(fmtDate(p.created_at))}
            </div>
          </div>
        </div>
        <div class="post-body">${escapeHtml(p.body)}</div>
      </div>
    `;
  }).join("");
}

async function loadPosts() {
  const postsEl = el("posts");
  const pagerInfo = el("pagerInfo");
  if (!postsEl) return;

  const params = new URLSearchParams({
    page: String(state.page),
    pageSize: String(state.pageSize),
    category: state.category,
    q: state.q
  });

  postsEl.innerHTML = `<div class="post"><div class="post-title">Loading…</div></div>`;

  try {
    const data = await apiJSON(`/api/posts?${params.toString()}`);
    renderPosts(postsEl, data.rows);

    const total = data.total || 0;
    const start = total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    const end = Math.min(total, state.page * state.pageSize);

    pagerInfo.textContent = total
      ? `Showing ${start}–${end} of ${total}`
      : `Showing 0 of 0`;

    // disable prev/next buttons if needed
    const prevBtn = el("prevBtn");
    const nextBtn = el("nextBtn");
    if (prevBtn) prevBtn.disabled = state.page <= 1;
    if (nextBtn) nextBtn.disabled = end >= total;
  } catch (err) {
    postsEl.innerHTML = `<div class="post"><div class="post-title">Error</div><div class="post-body">${escapeHtml(err.message)}</div></div>`;
    if (pagerInfo) pagerInfo.textContent = "";
  }
}

async function setupPosts() {
  const form = el("postForm");
  const msg = el("postMsg");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = "Posting…";

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());

      // default display name
      if (!payload.display_name || !payload.display_name.trim()) payload.display_name = "Anonymous";

      try {
        await apiJSON("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        msg.textContent = "✅ Posted!";
        form.reset();
        state.page = 1;
        state.q = "";
        const qEl = el("searchQ");
        if (qEl) qEl.value = "";
        await loadPosts();
      } catch (err) {
        msg.textContent = `❌ ${err.message}`;
      }
    });
  }

  const filter = el("filterCategory");
  if (filter) {
    filter.addEventListener("change", async () => {
      state.category = filter.value;
      state.page = 1;
      await loadPosts();
    });
  }

  const searchQ = el("searchQ");
  const searchBtn = el("searchBtn");
  if (searchBtn && searchQ) {
    const doSearch = async () => {
      state.q = (searchQ.value || "").trim();
      state.page = 1;
      await loadPosts();
    };

    searchBtn.addEventListener("click", doSearch);
    searchQ.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
    });
  }

  const prevBtn = el("prevBtn");
  const nextBtn = el("nextBtn");
  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      if (state.page > 1) {
        state.page -= 1;
        await loadPosts();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      state.page += 1;
      await loadPosts();
    });
  }

  await loadPosts();
}

// Setup maps links + year
function setupBasics() {
  const g = el("googleMapsLink");
  const a = el("appleMapsLink");
  if (g) g.href = GOOGLE_MAPS_URL;
  if (a) a.href = APPLE_MAPS_URL;

  const y = el("year");
  if (y) y.textContent = String(new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", async () => {
  setupBasics();
  await setupPreorder();
  await setupPosts();
});
