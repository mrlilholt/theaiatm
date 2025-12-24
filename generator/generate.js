/**
 * TheAIATM Static Blog Generator (no dependencies)
 *
 * Reads: generator/posts.json
 * Writes:
 *  - blog/<slug>.html for each post
 *  - blog/index.html (listing)
 *  - index.html (updates the "Latest drops" cards)
 *
 * Usage:
 *   node generator/generate.js
 *
 * Edit your posts here:
 *   generator/posts.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const GEN_DIR = path.join(ROOT, "generator");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}
function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}
function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderTemplate(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v ?? "");
  }
  return out;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Simple helper to build an optional YouTube embed block
function youtubeEmbed(youtubeId) {
  if (!youtubeId) return "";
  const safeId = youtubeId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `
  <div class="card card-pad" style="margin:18px 0; background:rgba(0,0,0,0.22)">
    <div class="tag">watch</div>
    <div style="position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;border:1px solid var(--line);margin-top:10px">
      <iframe
        src="https://www.youtube.com/embed/${safeId}"
        title="YouTube video"
        style="position:absolute;inset:0;width:100%;height:100%;border:0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  </div>
  `;
}

function buildPostContent(post) {
  // If the JSON provides raw HTML, we use it.
  // Otherwise we assemble a clean default article body from fields.
  if (post.contentHtml && post.contentHtml.trim()) return post.contentHtml;

  const bullets = (post.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("\n");
  const tools = (post.tools || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");

  return `
    <p class="lede" style="max-width:76ch">${escapeHtml(post.lede || "")}</p>

    ${tools ? `<div style="margin:10px 0 4px">${tools}</div>` : ""}

    <h2 style="margin-top:18px">What’s happening</h2>
    <p style="max-width:76ch">${escapeHtml(post.whatsHappening || "")}</p>

    ${youtubeEmbed(post.youtubeId)}

    <h2>How people actually do it</h2>
    ${bullets ? `<ul style="max-width:76ch;color:var(--muted)">${bullets}</ul>` : ""}

    <h2>The sanity check</h2>
    <div class="card card-pad" style="max-width:76ch;background:rgba(0,0,0,0.22)">
      <ul style="margin:0;color:var(--muted)">
        <li><strong>Time:</strong> ${escapeHtml(post.time || "Varies — start small, ship fast.")}</li>
        <li><strong>Skill:</strong> ${escapeHtml(post.skill || "Beginner-friendly if you can follow steps.")}</li>
        <li><strong>Truth:</strong> ${escapeHtml(post.truth || "AI speeds up the boring parts. You still need taste.")}</li>
      </ul>
    </div>

    <h2>Try it this weekend</h2>
    <div class="card card-pad" style="max-width:76ch;background:rgba(0,0,0,0.22)">
      <ol style="margin:0;color:var(--muted)">
        <li>Pick one niche and one repeatable output.</li>
        <li>Use AI to draft 10 options, then keep the best 3.</li>
        <li>Publish one place (don’t scatter).</li>
        <li>Attach one simple offer: affiliate link, template, or waitlist.</li>
      </ol>
    </div>
  `;
}

function buildBlogIndex(posts) {
  const cards = posts.map(p => {
    const href = `./${p.slug}`;
    const tags = (p.tags || []).slice(0, 2).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
    return `
      <a class="card post-card" href="${href}">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">${escapeHtml(p.category)} • ${escapeHtml(p.readTime || "")}</div>
        ${tags}
      </a>
    `;
  }).join("\n");

  // Load existing blog index and replace the post-list contents
  const blogIndexPath = path.join(BLOG_DIR, "index.html");
  let html = read(blogIndexPath);

  html = html.replace(/<div class="post-list">[\s\S]*?<\/div>/m, `<div class="post-list">\n${cards}\n</div>`);
  return html;
}

function updateHomeLatest(posts) {
  // Update the "Latest drops" cards on the home page to the first 3 posts.
  const top = posts.slice(0, 3);
  const cards = top.map(p => {
    const href = `./blog/${p.slug}`;
    const tags = (p.tags || []).slice(0, 2).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
    return `
      <a class="card post-card" href="${href}">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">Category: ${escapeHtml(p.category)} • Read: ${escapeHtml(p.readTime || "")}</div>
        ${tags}
      </a>
    `;
  }).join("\n");

  const homePath = path.join(ROOT, "index.html");
  let home = read(homePath);

  home = home.replace(/<div class="post-list">[\s\S]*?<\/div>/m, `<div class="post-list">\n${cards}\n</div>`);
  write(homePath, home);
}

function main() {
  const postsPath = path.join(GEN_DIR, "posts.json");
  const templatePath = path.join(GEN_DIR, "template_post.html");

  const template = read(templatePath);
  const raw = read(postsPath);
  const data = JSON.parse(raw);

  const posts = (data.posts || []).map(p => {
    const slug = (p.slug && p.slug.endsWith(".html")) ? p.slug : `${slugify(p.slug || p.title)}.html`;
    return { ...p, slug };
  });

  // Write post pages
  for (const post of posts) {
    const content = buildPostContent(post);
    const html = renderTemplate(template, {
      TITLE: escapeHtml(post.title),
      CATEGORY: escapeHtml(post.category || "TheAIATM"),
      READ_TIME: escapeHtml(post.readTime || ""),
      SLUG: escapeHtml(post.slug),
      CONTENT: content
    });
    write(path.join(BLOG_DIR, post.slug), html);
  }

  // Rewrite blog index + home latest
  const blogIndex = buildBlogIndex(posts);
  write(path.join(BLOG_DIR, "index.html"), blogIndex);
  updateHomeLatest(posts);

  console.log(`✅ Generated ${posts.length} post(s).`);
  console.log(`- Blog index updated: blog/index.html`);
  console.log(`- Home latest updated: index.html`);
}

main();
