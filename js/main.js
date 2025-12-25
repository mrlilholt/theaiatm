/**
 * TheAIATM: tiny helper script
 * - sets active nav based on current path
 * - optional: smooth scroll for in-page anchors
 */
(function(){
  const path = (location.pathname || "/").toLowerCase();
  document.querySelectorAll('[data-nav]').forEach(a=>{
    const href = (a.getAttribute('href') || '').toLowerCase();
    if(!href) return;

    const isHome = (href === "/" || href.endsWith("/index.html")) && (path === "/" || path.endsWith("/index.html"));
    const isExact = path.endsWith(href.replace("./","").replace("../",""));
    const isBlog = href.includes("blog") && path.includes("blog");

    if(isHome || isExact || (href.includes("blog") && isBlog)) a.classList.add("active");
  });

  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });
})();
