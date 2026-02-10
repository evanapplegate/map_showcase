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
  window.onerror = function (m, s, l) { err(m + " " + s + ":" + l); };

  var M = JSON.parse(document.getElementById("map-config").textContent);
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
    a.appendChild(document.createTextNode(" Download full resolution"));
    return a;
  }

  function buildViewer(el, v, bgColor) {
    var wrap = document.createElement("div");
    wrap.className = "viewer-wrap";
    var pat = document.createElement("div");
    pat.className = "viewer-pattern";
    wrap.appendChild(pat);
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
    (function (viewer, btnIn, btnOut) {
      btnIn.addEventListener("click", function () { viewer.viewport.zoomBy(1.4); viewer.viewport.applyConstraints(); });
      btnOut.addEventListener("click", function () { viewer.viewport.zoomBy(1 / 1.4); viewer.viewport.applyConstraints(); });
    })(vw, zin, zout);
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

      getMapTabs().forEach(function (tab) {
        var mc = getConfig(tab.dataset.s, tab.textContent.trim());
        var card = document.createElement("div");
        card.className = "grid-card";

        var h = document.createElement("h3");
        h.className = "grid-card-title";
        h.textContent = mc.label;
        card.appendChild(h);

        var pd = document.createElement("p");
        pd.className = "grid-card-desc";
        pd.textContent = mc.label + " \u2014 placeholder description.";
        card.appendChild(pd);

        var dlrow = document.createElement("div");
        dlrow.className = "grid-card-dlrow";
        dlrow.appendChild(makeDlLink(mc.dl, mc.dl.split("/").pop()));
        card.appendChild(dlrow);

        viewers.push(buildViewer(card, mc, mc.bg));
        vwrap.appendChild(card);
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
    document.getElementById("desc").textContent = c.label + " \u2014 placeholder description.";

    dwrap.appendChild(makeDlLink(c.dl, c.dl.split("/").pop()));

    viewers.push(buildViewer(vwrap, c, c.bg));
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
  if (!location.hash) location.hash = "#" + (getMapTabs()[0] ? getMapTabs()[0].dataset.s : "bay_area");
  route();
})();
