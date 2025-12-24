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
