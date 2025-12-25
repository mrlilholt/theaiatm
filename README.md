# TheAIATM (starter site)

A simple, editable static site you can open in VS Code and run with any local server (or deploy to Netlify/GitHub Pages).

## Structure
- index.html
- /blog/index.html
- /blog/*.html (posts)
- /assets (logo + hero)
- /css/styles.css
- /js/main.js

## Run locally (easy)
Option A (VS Code):
- Install the "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

Option B (Python):
- From the project folder:
  - python3 -m http.server 8080
  - open http://localhost:8080

## Next upgrade we can add
- A tiny generator script that takes a JSON file of topics + links and outputs new blog post HTML files automatically.


## Generate posts (Node)
- Edit: `generator/posts.json`
- Run:
  - `node generator/generate.js`

This will regenerate:
- `blog/index.html`
- `index.html` (Latest drops)
- `blog/<slug>.html` for each post


## Generator upgrades (v3)

### Multiple embeds per post
In `generator/posts.json`, add:

- YouTube: `{"type":"youtube","id":"VIDEO_ID"}`
- Tweet: `{"type":"tweet","url":"https://twitter.com/.../status/..."}`
- Links list: `{"type":"links","items":[{"label":"...", "url":"...", "note":"..."}]}`

Example:
```json
"embeds": [
  {"type":"youtube","id":"XXXXXXXXXXX"},
  {"type":"tweet","url":"https://twitter.com/user/status/123"},
  {"type":"links","items":[{"label":"Tool","url":"https://example.com","note":"why it matters"}]}
]
```

### Related posts blocks
Generated automatically at the bottom of every post (tag overlap, fallback category).

### /topics queue (daily drafts)
Edit `generator/topics.json`.
If a topic has `publishOn <= today`, it will be moved into `posts.json` and generated automatically.

Tip: keep drafts queued and only set `publishOn` when you’re ready.
