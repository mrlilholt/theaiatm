/**
 * TheAIATM Static Blog Generator (no dependencies)
 *
 * NEW:
 * - Multiple embeds per post (YouTube + Tweets + Links)
 * - Auto "Related posts" blocks (by tag overlap, fallback category)
 * - /topics queue -> generates new draft posts per day (still static)
 *
 * Usage:
 *   node generator/generate.js
 *
 * Files:
 * - generator/posts.json    (published posts)
 * - generator/topics.json   (queue of future topics/drafts)
 * - generator/template_post.html (page shell)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const GEN_DIR = path.join(ROOT, "generator");

function read(filePath) { return fs.readFileSync(filePath, "utf8"); }
function write(filePath, content) { fs.writeFileSync(filePath, content, "utf8"); }

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderTemplate(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v ?? "");
  return out;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeId(s) { return String(s || "").replace(/[^a-zA-Z0-9_-]/g, ""); }

function embedYouTube(id) {
  const vid = safeId(id);
  if (!vid) return "";
  return `
  <div class="card card-pad" style="margin:18px 0; background:rgba(0,0,0,0.22)">
    <div class="tag">watch</div>
    <div style="position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;border:1px solid var(--line);margin-top:10px">
      <iframe
        src="https://www.youtube.com/embed/${vid}"
        title="YouTube video"
        style="position:absolute;inset:0;width:100%;height:100%;border:0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
  </div>`;
}

function embedTweet(url) {
  const safe = escapeHtml(url);
  if (!safe) return "";
  return `
  <div class="card card-pad" style="margin:18px 0; background:rgba(0,0,0,0.22)">
    <div class="tag">tweet</div>
    <blockquote class="twitter-tweet" style="margin:10px 0 0"><a href="${safe}"></a></blockquote>
  </div>`;
}

function embedLinks(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  const items = list.map(l => {
    const label = escapeHtml(l.label || l.url || "Link");
    const url = escapeHtml(l.url || "");
    const note = l.note ? `<div class="small" style="margin-top:4px">${escapeHtml(l.note)}</div>` : "";
    return `<li><a href="${url}" target="_blank" rel="noopener noreferrer"><strong>${label}</strong></a>${note}</li>`;
  }).join("\n");

  return `
  <div class="card card-pad" style="margin:18px 0; background:rgba(0,0,0,0.22);max-width:76ch">
    <div class="tag">links</div>
    <ul style="margin:10px 0 0;color:var(--muted)">${items}</ul>
  </div>`;
}

function buildEmbeds(post) {
  const embeds = post.embeds || [];
  let hasTweet = false;

  const blocks = embeds.map(e => {
    if (!e || !e.type) return "";
    if (e.type === "youtube") return embedYouTube(e.id || e.youtubeId);
    if (e.type === "tweet") { hasTweet = true; return embedTweet(e.url); }
    if (e.type === "links") return embedLinks(e.items || []);
    return "";
  }).filter(Boolean).join("\n");

  const tweetScript = hasTweet
    ? `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`
    : "";

  return { blocks, tweetScript };
}

function buildPostContent(post) {
  if (post.contentHtml && String(post.contentHtml).trim()) {
    return { html: post.contentHtml, tweetScript: "" };
  }

  const tools = (post.tools || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
  const steps = (post.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("\n");

  const embeds = buildEmbeds(post);

  return {
    html: `
    <p class="lede" style="max-width:76ch">${escapeHtml(post.lede || "")}</p>

    ${tools ? `<div style="margin:10px 0 4px">${tools}</div>` : ""}

    <h2 style="margin-top:18px">What’s happening</h2>
    <p style="max-width:76ch">${escapeHtml(post.whatsHappening || "")}</p>

    ${embeds.blocks}

    ${steps ? `<h2>How people actually do it</h2>
    <ul style="max-width:76ch;color:var(--muted)">${steps}</ul>` : ""}

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
    `,
    tweetScript: embeds.tweetScript
  };
}

function relatedPostsBlock(current, all) {
  const curTags = new Set((current.tags || []).map(t => String(t).toLowerCase()));
  const curCat = String(current.category || "").toLowerCase();

  const scored = all
    .filter(p => p.slug !== current.slug)
    .map(p => {
      const tags = (p.tags || []).map(t => String(t).toLowerCase());
      let overlap = 0;
      for (const t of tags) if (curTags.has(t)) overlap++;
      const catBoost = (String(p.category || "").toLowerCase() === curCat) ? 0.5 : 0;
      return { p, score: overlap + catBoost };
    })
    .sort((a,b) => b.score - a.score);

  const picks = scored.filter(x => x.score > 0).slice(0, 3).map(x => x.p);
  if (picks.length === 0) picks.push(...all.filter(p => p.slug !== current.slug).slice(0, 3));

  const cards = picks.map(p => {
    const tags = (p.tags || []).slice(0, 2).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
    return `
      <a class="card post-card" href="./${escapeHtml(p.slug)}">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">${escapeHtml(p.category)} • ${escapeHtml(p.readTime || "")}</div>
        ${tags}
      </a>`;
  }).join("\n");

  return `
    <section class="section" style="padding-top:18px">
      <h2 style="margin:0 0 10px;font-size:16px">Related posts</h2>
      <div class="post-list" style="grid-template-columns:repeat(3,1fr)">${cards}</div>
    </section>`;
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
      </a>`;
  }).join("\n");

  const blogIndexPath = path.join(BLOG_DIR, "index.html");
  let html = read(blogIndexPath);
  html = html.replace(/<div class="post-list">[\s\S]*?<\/div>/m, `<div class="post-list">\n${cards}\n</div>`);
  return html;
}

function updateHomeLatest(posts) {
  const top = posts.slice(0, 3);
  const cards = top.map(p => {
    const href = `./blog/${p.slug}`;
    const tags = (p.tags || []).slice(0, 2).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");
    return `
      <a class="card post-card" href="${href}">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="meta">Category: ${escapeHtml(p.category)} • Read: ${escapeHtml(p.readTime || "")}</div>
        ${tags}
      </a>`;
  }).join("\n");

  const homePath = path.join(ROOT, "index.html");
  let home = read(homePath);
  home = home.replace(/<div class="post-list">[\s\S]*?<\/div>/m, `<div class="post-list">\n${cards}\n</div>`);
  write(homePath, home);
}

function loadJson(filePath, fallbackObj) {
  try { return JSON.parse(read(filePath)); } catch { return fallbackObj; }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function applyTopicsQueue(postsData, topicsData) {
  const today = todayISO();
  const existingSlugs = new Set((postsData.posts || []).map(p => p.slug));
  const existingTitles = new Set((postsData.posts || []).map(p => (p.title || "").toLowerCase()));

  for (const t of (topicsData.topics || [])) {
    if (!t || t.status === "published") continue;
    const publishOn = t.publishOn || today;
    if (publishOn > today) continue;

    const title = t.title || "Untitled";
    if (existingTitles.has(String(title).toLowerCase())) {
      t.status = "published";
      t.note = "Skipped (title already exists in posts.json)";
      continue;
    }

    let slug = t.slug || `${slugify(title)}.html`;
    if (existingSlugs.has(slug)) {
      let i = 2;
      while (existingSlugs.has(`${slugify(title)}-${i}.html`)) i++;
      slug = `${slugify(title)}-${i}.html`;
    }
    existingSlugs.add(slug);

    const newPost = {
      title,
      category: t.category || "TheAIATM",
      readTime: t.readTime || "~6–8 min",
      slug,
      tags: t.tags || [],
      lede: t.lede || "Draft: add a lede.",
      whatsHappening: t.whatsHappening || "Draft: explain what’s happening.",
      tools: t.tools || [],
      steps: t.steps || [],
      embeds: t.embeds || [],
      time: t.time || "",
      skill: t.skill || "",
      truth: t.truth || ""
    };

    postsData.posts = postsData.posts || [];
    postsData.posts.unshift(newPost);

    t.status = "published";
    t.generatedSlug = slug;
    t.publishedAt = today;
  }
  return { postsData, topicsData };
}

function main() {
  const postsPath = path.join(GEN_DIR, "posts.json");
  const topicsPath = path.join(GEN_DIR, "topics.json");
  const templatePath = path.join(GEN_DIR, "template_post.html");

  const template = read(templatePath);
  let postsData = loadJson(postsPath, { posts: [] });
  let topicsData = loadJson(topicsPath, { topics: [] });

  const applied = applyTopicsQueue(postsData, topicsData);
  postsData = applied.postsData;
  topicsData = applied.topicsData;

  write(postsPath, JSON.stringify(postsData, null, 2));
  write(topicsPath, JSON.stringify(topicsData, null, 2));

  const posts = (postsData.posts || []).map(p => {
    const slug = (p.slug && String(p.slug).endsWith(".html")) ? p.slug : `${slugify(p.slug || p.title)}.html`;
    return { ...p, slug };
  });

  for (const post of posts) {
    const built = buildPostContent(post);
    const related = relatedPostsBlock(post, posts);

    let html = renderTemplate(template, {
      TITLE: escapeHtml(post.title),
      CATEGORY: escapeHtml(post.category || "TheAIATM"),
      READ_TIME: escapeHtml(post.readTime || ""),
      SLUG: escapeHtml(post.slug),
      CONTENT: built.html,
      RELATED: related
    });

    if (built.tweetScript) html = html.replace("</body>", `${built.tweetScript}\n</body>`);
    write(path.join(BLOG_DIR, post.slug), html);
  }

  const blogIndex = buildBlogIndex(posts);
  write(path.join(BLOG_DIR, "index.html"), blogIndex);
  updateHomeLatest(posts);

  console.log(`✅ Generated ${posts.length} post(s).`);
  console.log(`✅ Topics queue applied (if any were due).`);
}

main();
