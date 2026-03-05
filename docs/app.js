(function () {
  "use strict";

  var E = document.getElementById("errlog");
  function err(m) {
    console.error(m);
    E.classList.add("on");
    var d = document.createElement("div");
    d.textContent = m;
    E.appendChild(d);
    E.scrollTop = 1e6;
  }
  window.onerror = function (m, s, l) {
    if (m === "Script error." && !s) return;
    err(m + " " + s + ":" + l);
  };

  var M = JSON.parse(document.getElementById("map-config").textContent);
  var DESC = {
    ca_calligraphy: "Hand-lettered by Amanpreet Singh, dedicated to Jeanne and Dave. Best coast in Blender relief, NLCD land cover, a sunsetty aspect, Sierras looking like Himalayas but it\u2019s my map and I\u2019ll -z 3 if I want to.",
    bay_area: "My first relief map for my first (and last) cartography class. Dedicated to Josh and Alyssa.",
    la_veg: 'Illustrations by <a href="https://www.instagram.com/ezra.butt/" target="_blank" rel="noopener">Ezra Butt</a>, you\u2019ll get it once you\u2019ve stuck your face in the fence jasmine. The backlit version is a double-exposure photo; I printed the map onto a 12x16\u201d 3,600 DPI piece of film, backlit with battery-powered LEDs, and stuck it in the Silver Lake library\u2019s planter.',
    ojai: 'My first trail map, commissioned by the <a href="https://ovlc.org/" target="_blank" rel="noopener">Ojai Valley Land Conservancy</a> (believe it or not, I got this gig off LinkedIn).',
    tongass: 'Hand-lettered by <a href="https://www.instagram.com/ezra.butt/" target="_blank" rel="noopener">Ezra Butt</a>, illustrations by <a href="https://newleafdesign.com/" target="_blank" rel="noopener">Matt Strieby</a> and <a href="https://aiyanaudesen.com/" target="_blank" rel="noopener">Aiyana Udesen</a>. FYI the largest intact temperate rainforest on Earth is public land, so you can roam in there forever. The backlit version is a double-exposure photo; I printed the map onto a 12x16\u201d 3,600 DPI piece of film, backlit with battery-powered LEDs, and stuck it behind some ivy off the sidewalk on Silver Lake Boulevard.',
    world: 'All points-of-interest and labels generously donated by <a href="https://shadedrelief.com/map-gallery.html" target="_blank" rel="noopener">Tom Patterson</a>, this was printed onto 3,600 DPI film and turned into a <a href="https://www.etsy.com/listing/1225993082/illuminated-world-map-2022-physical" target="_blank" rel="noopener">5x3 ft. LED-backlit piece</a>.'
  };
  var BUY = {
    ca_calligraphy: { href: "https://www.etsy.com/listing/1638954123" },
    bay_area: { href: "https://www.etsy.com/listing/1594878672/" },
    la_veg: { href: "https://www.etsy.com/listing/1603715380" },
    tongass: { href: "https://www.etsy.com/listing/1603628988/" },
    ojai: { href: "https://ovlc.square.site/product/ojai-trail-map/273?cs=true&cst=custom", label: "Buy it from OVLC" }
  };
  var BUY_BACKLIT = {
    la_veg: "https://www.etsy.com/listing/1219522375",
    tongass: "https://www.etsy.com/listing/1219519359/",
    world: "https://www.etsy.com/listing/1225993082/"
  };
  var ALT = {
    la_veg: { slug: "la_veg_alt", w: 2160, h: 2700, label: "Backlit mode" },
    tongass: { slug: "tongass_alt", w: 3462, h: 4266, label: "Backlit mode" },
    world: { slug: "world_alt", w: 5268, h: 3194, label: "Backlit mode" }
  };
  var viewers = [], cur = null;
  var sel = document.getElementById("mapsel");

  function getMapTabs() {
    return Array.prototype.slice.call(document.querySelectorAll(".tab[data-s]")).filter(function (t) { return t.dataset.s !== "onepage" && M[t.dataset.s]; });
  }

  function getConfig(key, label) {
    var c = M[key];
    if (!c) return null;
    c.label = label || key;
    c.slug = c.slug || key;
    return c;
  }

  function osdOpts(el, v) {
    return {
      element: el,
      tileSources: {
        Image: {
          xmlns: "http://schemas.microsoft.com/deepzoom/2008",
          Url: "tiles/" + v.slug + "_files/",
          Format: "jpg",
          Overlap: "1",
          TileSize: "254",
          Size: { Width: String(v.w), Height: String(v.h) }
        }
      },
      showNavigationControl: false,
      animationTime: 0.4,
      springStiffness: 10,
      visibilityRatio: 0.9,
      constrainDuringPan: true,
      minZoomImageRatio: 0.8,
      maxZoomPixelRatio: 1,
      gestureSettingsMouse: { scrollToZoom: true, clickToZoom: true, dblClickToZoom: true },
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true }
    };
  }

  function setPageColors(c, gifSlug) {
    var s = document.body.style;
    s.backgroundColor = c.bg;
    s.backgroundImage = "url('bg/" + gifSlug + ".gif')";
    s.backgroundSize = "cover";
    s.backgroundPosition = "center";
    s.backgroundRepeat = "no-repeat";
    s.color = c.fg;
    var r = document.documentElement.style;
    r.setProperty("--oc", c.oc);
    r.setProperty("--tab-active-border", c.tabBorder || "currentColor");
    r.setProperty("--page-bg", c.bg);
    r.setProperty("--nav-color", c.navColor);
    r.setProperty("--sep-color", c.sepColor);
    if (c.sidebarFg) r.setProperty("--sidebar-fg", c.sidebarFg);
    if (c.noiseColor) r.setProperty("--noise-color", c.noiseColor);
    var wrap = document.getElementById("sidebar-cap-wrap");
    if (wrap) wrap.setAttribute("data-cap", (c.fg === "#fff" || c.fg === "white") ? "white" : "black");
  }

  function makeDlLink(href, filename) {
    var a = document.createElement("a");
    a.className = "dl";
    a.href = href;
    a.download = filename;
    var icon = document.createElement("span");
    icon.className = "dl-icon";
    a.appendChild(icon);
    a.appendChild(document.createTextNode("Download full resolution"));
    return a;
  }

  function makeBuyLink(href, label) {
    var a = document.createElement("a");
    a.className = "dl";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    var icon = document.createElement("span");
    icon.className = "buy-icon";
    a.appendChild(icon);
    a.appendChild(document.createTextNode(label || "Buy a print"));
    return a;
  }

  function makeBacklitBuyLink(href) {
    var a = document.createElement("a");
    a.className = "dl";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    var icon = document.createElement("span");
    icon.className = "buy-backlit-icon";
    a.appendChild(icon);
    a.appendChild(document.createTextNode("Buy a backlit masterpiece"));
    return a;
  }

  function buildViewer(el, v, bgColor, altCfg) {
    var wrap = document.createElement("div");
    wrap.className = "viewer-wrap";
    var pat = document.createElement("div");
    pat.className = "viewer-pattern";
    wrap.appendChild(pat);
    ["ornament-top-left","ornament-top-right","ornament-bottom-left","ornament-bottom-right"].forEach(function(c) {
      var o = document.createElement("div");
      o.className = "viewer-ornament " + c;
      wrap.appendChild(o);
    });
    var bdr = document.createElement("div");
    bdr.className = "viewer-border";
    ["border-corner border-corner-top-left",
     "border-edge-horizontal border-edge-top",
     "border-corner border-corner-top-right",
     "border-edge-vertical border-edge-left",
     "border-edge-vertical border-edge-right",
     "border-corner border-corner-bottom-left",
     "border-edge-horizontal border-edge-bottom",
     "border-corner border-corner-bottom-right"
    ].forEach(function(c) {
      var d = document.createElement("div");
      d.className = c;
      bdr.appendChild(d);
    });
    wrap.appendChild(bdr);
    var ctrl = document.createElement("div");
    ctrl.className = "zoom-ctrl";
    var zin = document.createElement("button");
    zin.className = "zoom-btn";
    zin.textContent = "+";
    zin.title = "Zoom in";
    var zout = document.createElement("button");
    zout.className = "zoom-btn";
    zout.textContent = "\u2212";
    zout.title = "Zoom out";
    ctrl.appendChild(zin);
    ctrl.appendChild(zout);
    wrap.appendChild(ctrl);
    var vd = document.createElement("div");
    vd.className = "osd-viewer";
    vd.style.backgroundColor = bgColor;
    wrap.appendChild(vd);
    el.appendChild(wrap);
    var vw = OpenSeadragon(osdOpts(vd, v));
    vw.addHandler("open-failed", function (e) { err("Tile source error: " + e.message); });
    vw.addOnceHandler("open", function () {
      var isMobileGrid = window.innerWidth <= 600 && document.body.classList.contains("grid-mode");
      if (!isMobileGrid) {
        vw.viewport.zoomBy(1 / 1.4);
        vw.viewport.applyConstraints();
      }
    });
    (function (viewer, btnIn, btnOut) {
      btnIn.addEventListener("click", function () { viewer.viewport.zoomBy(1.4); viewer.viewport.applyConstraints(); });
      btnOut.addEventListener("click", function () { viewer.viewport.zoomBy(1 / 1.4); viewer.viewport.applyConstraints(); });
    })(vw, zin, zout);
    if (altCfg) {
      var litOn = false;
      var btn = document.createElement("button");
      btn.className = "backlit-btn";
      var ico = document.createElement("span");
      ico.className = "backlit-icon";
      btn.appendChild(ico);
      btn.appendChild(document.createTextNode(" " + altCfg.label));
      btn.addEventListener("click", function () {
        litOn = !litOn;
        btn.classList.toggle("active", litOn);
        var src = litOn ? altCfg : v;
        vw.open({
          Image: {
            xmlns: "http://schemas.microsoft.com/deepzoom/2008",
            Url: "tiles/" + (litOn ? altCfg.slug : v.slug) + "_files/",
            Format: "jpg",
            Overlap: "1",
            TileSize: "254",
            Size: { Width: String(src.w), Height: String(src.h) }
          }
        });
        vw.addOnceHandler("open", function () {
          vw.viewport.zoomBy(litOn ? 1 / 1.15 : 1 / 1.4);
          vw.viewport.applyConstraints();
        });
      });
      wrap.appendChild(btn);
    }
    return vw;
  }

  function go(s) {
    if (s === cur) return;
    viewers.forEach(function (vw) { vw.destroy(); });
    viewers = [];
    var vwrap = document.getElementById("viewers");
    vwrap.innerHTML = "";
    var dwrap = document.getElementById("dlwrap");
    dwrap.innerHTML = "";
    cur = s;

    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.s === s);
    });
    sel.value = s;

    if (s === "onepage") {
      document.body.classList.add("grid-mode");
      setPageColors({bg:"#f7f6f5",fg:"#1a1a1a",oc:"rgb(231,230,229)",tabBorder:"#333",navColor:"rgb(233,232,231)",sepColor:"rgb(205,204,203)",sidebarFg:"rgb(191,177,163)",noiseColor:"rgb(240,239,238)"}, "onepage");
      document.getElementById("sidebar-img").src = "sidebar_onepage.png";
      document.getElementById("desc").textContent = "";

      // On mobile one-page, clone sidebar intro above the grid
      if (window.innerWidth <= 600) {
        var intro = document.createElement("div");
        intro.className = "grid-intro";
        var introImg = document.createElement("img");
        introImg.src = "sidebar_onepage.png";
        introImg.alt = "";
        introImg.className = "grid-intro-img";
        intro.appendChild(introImg);
        var introPara = document.querySelector(".sidebar-para");
        if (introPara) intro.appendChild(introPara.cloneNode(true));
        vwrap.appendChild(intro);
      }

      getMapTabs().forEach(function (tab) {
        var mc = getConfig(tab.dataset.s, tab.textContent.trim());
        var card = document.createElement("div");
        card.className = "grid-card";
        vwrap.appendChild(card);

        viewers.push(buildViewer(card, mc, mc.bg, ALT[mc.slug] || null));

        var h = document.createElement("h3");
        h.className = "grid-card-title";
        h.textContent = mc.label;
        card.appendChild(h);

        var pd = document.createElement("p");
        pd.className = "grid-card-desc";
        pd.innerHTML = DESC[mc.slug] || mc.label + " \u2014 placeholder description.";
        card.appendChild(pd);

        var dlrow = document.createElement("div");
        dlrow.className = "grid-card-dlrow";
        dlrow.appendChild(makeDlLink(mc.dl, mc.dl.split("/").pop()));
        if (BUY[mc.slug]) dlrow.appendChild(makeBuyLink(BUY[mc.slug].href, BUY[mc.slug].label));
        if (BUY_BACKLIT[mc.slug]) dlrow.appendChild(makeBacklitBuyLink(BUY_BACKLIT[mc.slug]));
      });
      return;
    }

    var c = getConfig(s);
    if (!c) { err("Unknown map: " + s); return; }
    var tab = document.querySelector('.tab[data-s="' + s + '"]');
    c.label = tab ? tab.textContent.trim() : s;
    document.body.classList.remove("grid-mode");
    setPageColors(c, s);
    document.getElementById("sidebar-img").src = c.sidebar || "sidebar_bay_area.png";
    var descEl = document.getElementById("desc");
    descEl.innerHTML = DESC[s] || c.label + " \u2014 placeholder description.";

    dwrap.appendChild(makeDlLink(c.dl, c.dl.split("/").pop()));
    if (BUY[s]) dwrap.appendChild(makeBuyLink(BUY[s].href, BUY[s].label));
    if (BUY_BACKLIT[s]) dwrap.appendChild(makeBacklitBuyLink(BUY_BACKLIT[s]));

    viewers.push(buildViewer(vwrap, c, c.bg, ALT[s] || null));
  }

  function route() {
    var h = location.hash.replace("#", "");
    var tabs = getMapTabs();
    var first = tabs[0] ? tabs[0].dataset.s : "bay_area";
    go(h === "onepage" ? "onepage" : (document.querySelector('.tab[data-s="' + h + '"]') ? h : first));
  }

  window.addEventListener("hashchange", route);
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function (e) {
      e.preventDefault();
      location.hash = "#" + this.dataset.s;
    });
  });
  sel.addEventListener("change", function () { location.hash = "#" + this.value; });
  getMapTabs().forEach(function (tab) {
    var opt = document.createElement("option");
    opt.value = tab.dataset.s;
    opt.textContent = tab.textContent.trim();
    sel.appendChild(opt);
  });
  var onepageOpt = document.createElement("option");
  onepageOpt.value = "onepage";
  onepageOpt.textContent = "One Page Mode";
  sel.appendChild(onepageOpt);
  document.querySelectorAll(".tab-sep").forEach(function (s) {
    var svg = s.dataset.svg;
    var img = new Image();
    img.onload = function () {
      s.style.webkitMaskImage = "url('" + svg + "')";
      s.style.maskImage = "url('" + svg + "')";
    };
    img.src = svg;
  });
  if (!location.hash) {
    var isMobile = window.innerWidth <= 600;
    location.hash = isMobile ? "#onepage" : "#ca_calligraphy";
  }
  route();
})();
