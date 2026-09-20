/* kylemcconnell.com — renders site cards from sites.json. No dependencies. */
(function () {
  "use strict";

  var CATEGORY_ORDER = ["Farm", "Business", "Community", "Civic", "Software", "Personal"];
  var STATUS_LABEL = { "coming-soon": "Coming soon", seasonal: "Seasonal" };

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var directoryGrid = document.getElementById("directory-grid");
  var builtGrid = document.getElementById("built-grid");
  var filterBox = document.querySelector(".filters");
  var statusEl = document.querySelector(".results-status");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function sortSites(a, b) {
    var ai = CATEGORY_ORDER.indexOf(a.category);
    var bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai === -1) ai = CATEGORY_ORDER.length;
    if (bi === -1) bi = CATEGORY_ORDER.length;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  }

  function buildCard(site) {
    var li = el("li", "card");
    li.setAttribute("data-category", site.category);

    if (site.image) {
      var img = el("img", "card-media");
      img.src = site.image;
      img.alt = "Screenshot of the " + site.name + " website";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 1280;
      img.height = 800;
      li.appendChild(img);
    }

    var body = el("div", "card-body");

    var h3 = el("h3");
    if (site.linkable !== false && site.url) {
      var a = el("a", null, site.name);
      a.href = site.url;
      a.rel = "noopener";
      h3.appendChild(a);
    } else {
      h3.textContent = site.name;
    }
    body.appendChild(h3);

    if (STATUS_LABEL[site.status]) {
      body.appendChild(el("p", "badge", STATUS_LABEL[site.status]));
    }

    if (site.description) body.appendChild(el("p", "card-desc", site.description));

    if (site.linkable !== false && site.url) {
      body.appendChild(el("p", "card-url", site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")));
    } else {
      body.appendChild(el("p", "card-url", "Private tool — no public link"));
    }

    if (Array.isArray(site.stack) && site.stack.length) {
      var tags = el("ul", "tags");
      site.stack.forEach(function (item) {
        tags.appendChild(el("li", "tag", item));
      });
      body.appendChild(tags);
    }

    li.appendChild(body);
    return li;
  }

  function renderGrid(grid, sites) {
    grid.textContent = "";
    sites.forEach(function (site) {
      grid.appendChild(buildCard(site));
    });
  }

  function announce(count) {
    if (!statusEl) return;
    statusEl.textContent = count === 1 ? "Showing 1 site" : "Showing " + count + " sites";
  }

  function buildFilters(sites) {
    if (!filterBox) return;
    var present = CATEGORY_ORDER.filter(function (cat) {
      return sites.some(function (site) { return site.category === cat; });
    });
    if (present.length < 2) return;

    filterBox.hidden = false;
    ["All"].concat(present).forEach(function (cat, index) {
      var button = el("button", "filter", cat);
      button.type = "button";
      button.setAttribute("data-filter", cat);
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      button.addEventListener("click", function () {
        Array.prototype.forEach.call(filterBox.querySelectorAll(".filter"), function (other) {
          other.setAttribute("aria-pressed", String(other === button));
        });
        var visible = 0;
        Array.prototype.forEach.call(directoryGrid.children, function (card) {
          var show = cat === "All" || card.getAttribute("data-category") === cat;
          card.hidden = !show;
          if (show) visible++;
        });
        announce(visible);
      });
      filterBox.appendChild(button);
    });
  }

  function failed(message) {
    [directoryGrid, builtGrid].forEach(function (grid) {
      if (grid) {
        grid.textContent = "";
        var li = el("li");
        li.appendChild(el("p", "card-desc", message));
        grid.appendChild(li);
      }
    });
  }

  fetch("sites.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var sites = (data && Array.isArray(data.sites) ? data.sites : []).slice().sort(sortSites);
      if (!sites.length) return;

      renderGrid(directoryGrid, sites);
      buildFilters(sites);
      announce(sites.length);

      var built = sites.filter(function (site) { return site.built === true; });
      if (built.length) {
        renderGrid(builtGrid, built);
      } else {
        var section = document.getElementById("built");
        if (section) section.hidden = true;
      }
    })
    .catch(function () {
      failed("The site list could not be loaded. Please reload the page.");
    });
})();
