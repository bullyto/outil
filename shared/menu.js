/* ADN66 Shared Tools Menu */
(function(){
  try{
    // Avoid double-inject
    if (window.__ADN66_TOOLS_MENU__) return;
    window.__ADN66_TOOLS_MENU__ = true;

    const APPS = [
      { key:"stock",  name:"Stock",            tag:"Outil", href:"/apps/stock/index.html" },
      { key:"apero",  name:"Apéro de Nuit 66", tag:"Outil", href:"/apps/apero/index.html" },
      { key:"status", name:"Status",           tag:"Pilotage", href:"/apps/status/index.html" },
      { key:"gps",    name:"GPS Apéro 66",     tag:"Outil", href:"/apps/gps/index.html" }
    ];

    // Compute base prefix for GitHub Pages project site: /<repo>/...
    // We need absolute href with the repo prefix preserved.
    const path = location.pathname || "/";
    // If /apps/ is present, base is everything BEFORE it.
    let base = "";
    const idx = path.indexOf("/apps/");
    if (idx >= 0) base = path.slice(0, idx);
    else {
      // Otherwise: base is directory of current page (e.g. /<repo>/)
      // We assume pages are hosted under a project root. Keep first segment if any.
      // Example: /REPO/index.html -> base = /REPO
      const parts = path.split("/").filter(Boolean);
      if (parts.length > 0) base = "/" + parts[0];
      else base = "";
    }

    function withBase(href){
      // href must start with "/apps/..."
      if (!href.startsWith("/")) return base + "/" + href;
      return base + href;
    }

    function currentKey(){
      // map by pathname includes /apps/<key>/
      const m = path.match(/\/apps\/([^\/]+)\//);
      return m ? m[1] : null;
    }

    const root = document.createElement("div");
    root.id = "adn66-tools-menu-root";

    const btn = document.createElement("button");
    btn.id = "adn66-tools-menu-btn";
    btn.type = "button";
    btn.textContent = "☰ Outils";
    btn.setAttribute("aria-label","Ouvrir le menu outils");

    const panel = document.createElement("div");
    panel.id = "adn66-tools-menu-panel";

    const hd = document.createElement("div");
    hd.id = "adn66-tools-menu-hd";
    hd.innerHTML = `<div>ADN66 • Outils</div><small>${new Date().getFullYear()}</small>`;

    const list = document.createElement("div");
    list.id = "adn66-tools-menu-list";

    const active = currentKey();

    APPS.forEach(app=>{
      const item = document.createElement("div");
      item.className = "adn66-tools-menu-item";
      item.id = "adn66-tools-menu-item";
      item.setAttribute("role","button");
      item.tabIndex = 0;
      item.innerHTML = `
        <div class="name">${app.name}${active === app.key ? " •" : ""}</div>
        <div class="tag">${active === app.key ? "Actuel" : app.tag}</div>
      `;
      const go = ()=>{
        const url = withBase(app.href);
        if (location.href.includes(url)) {
          panel.classList.remove("show");
          return;
        }
        location.href = url;
      };
      item.addEventListener("click", go);
      item.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } });
      list.appendChild(item);
    });

    const ft = document.createElement("div");
    ft.id = "adn66-tools-menu-ft";
    ft.textContent = "Menu interne — bascule rapide entre outils.";

    panel.appendChild(hd);
    panel.appendChild(list);
    panel.appendChild(ft);

    root.appendChild(btn);
    root.appendChild(panel);

    function toggle(){
      panel.classList.toggle("show");
    }

    btn.addEventListener("click", (e)=>{ e.stopPropagation(); toggle(); });
    document.addEventListener("click", ()=> panel.classList.remove("show"), { passive:true });
    document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") panel.classList.remove("show"); });

    // Append after DOM ready
    const add = ()=> {
      document.body.appendChild(root);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
  }catch(e){
    // silent
  }
})();
