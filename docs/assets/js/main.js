(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var mobile = document.querySelector(".nav-mobile");
  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      mobile.classList.toggle("is-open", !open);
      mobile.setAttribute("aria-hidden", String(open));
    });

    mobile.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        mobile.classList.remove("is-open");
        mobile.setAttribute("aria-hidden", "true");
      });
    });
  }

  /* Feature carousel */
  var carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    var slides = Array.prototype.slice.call(
      carousel.querySelectorAll(".carousel-slide")
    );
    var dots = Array.prototype.slice.call(
      carousel.querySelectorAll(".carousel-dot")
    );
    var prev = carousel.querySelector("[data-carousel-prev]");
    var next = carousel.querySelector("[data-carousel-next]");
    var index = 0;
    var timer = null;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (slide, n) {
        var active = n === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
      });
      dots.forEach(function (dot, n) {
        dot.setAttribute("aria-selected", String(n === index));
      });
    }

    function start() {
      if (prefersReducedMotion || slides.length < 2) return;
      stop();
      timer = window.setInterval(function () {
        show(index + 1);
      }, 5000);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    if (prev) {
      prev.addEventListener("click", function () {
        show(index - 1);
        start();
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        show(index + 1);
        start();
      });
    }
    dots.forEach(function (dot, n) {
      dot.addEventListener("click", function () {
        show(n);
        start();
      });
    });

    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);

    show(0);
    start();
  }

  /* Live demo tabs */
  var demo = document.querySelector("[data-demo]");
  if (demo) {
    var tabs = Array.prototype.slice.call(demo.querySelectorAll(".demo-tab"));
    var panels = {
      dashboard: {
        title: "Dashboard Overview",
        kpis: [
          { label: "Revenue", value: "Rp 128.4Jt", delta: "+12.4%" },
          { label: "Orders", value: "1,248", delta: "+8.1%" },
          { label: "Inventory", value: "4,562", delta: "SKU" },
          { label: "Cash", value: "Rp 42.1Jt", delta: "Available" },
        ],
        bars: [42, 58, 47, 72, 65, 80, 74, 88, 70, 92, 85, 96],
        nav: "Dashboard",
      },
      accounting: {
        title: "Accounting Snapshot",
        kpis: [
          { label: "AR", value: "Rp 31.2Jt", delta: "Receivable" },
          { label: "AP", value: "Rp 18.7Jt", delta: "Payable" },
          { label: "Journals", value: "326", delta: "This month" },
          { label: "Net Profit", value: "Rp 22.5Jt", delta: "+5.2%" },
        ],
        bars: [35, 40, 48, 52, 60, 55, 68, 72, 70, 78, 82, 90],
        nav: "Accounting",
      },
      pos: {
        title: "POS Session",
        kpis: [
          { label: "Sales Today", value: "Rp 8.9Jt", delta: "42 tickets" },
          { label: "Avg Ticket", value: "Rp 212Rb", delta: "+3.4%" },
          { label: "Held Orders", value: "3", delta: "Open" },
          { label: "Cash Drawer", value: "Rp 4.1Jt", delta: "Balanced" },
        ],
        bars: [20, 35, 50, 45, 70, 85, 90, 75, 60, 55, 40, 30],
        nav: "Point of Sale",
      },
      inventory: {
        title: "Inventory Health",
        kpis: [
          { label: "On Hand", value: "4,562", delta: "Units" },
          { label: "Low Stock", value: "27", delta: "Alerts" },
          { label: "Warehouses", value: "3", delta: "Active" },
          { label: "Movements", value: "186", delta: "7 days" },
        ],
        bars: [70, 68, 72, 65, 60, 58, 55, 62, 66, 70, 74, 78],
        nav: "Inventory",
      },
    };

    var titleEl = demo.querySelector("[data-demo-title]");
    var kpiEl = demo.querySelector("[data-demo-kpis]");
    var chartEl = demo.querySelector("[data-demo-chart]");
    var navItems = demo.querySelectorAll("[data-demo-nav]");

    function render(key) {
      var data = panels[key] || panels.dashboard;
      if (titleEl) titleEl.textContent = data.title;
      if (kpiEl) {
        kpiEl.innerHTML = data.kpis
          .map(function (k) {
            return (
              '<div class="kpi"><div class="label">' +
              k.label +
              '</div><div class="value">' +
              k.value +
              '</div><div class="delta">' +
              k.delta +
              "</div></div>"
            );
          })
          .join("");
      }
      if (chartEl) {
        chartEl.innerHTML = data.bars
          .map(function (h) {
            return '<div class="bar" style="height:' + h + '%"></div>';
          })
          .join("");
      }
      navItems.forEach(function (item) {
        item.classList.toggle("active", item.getAttribute("data-demo-nav") === key);
      });
      tabs.forEach(function (tab) {
        tab.setAttribute(
          "aria-selected",
          String(tab.getAttribute("data-demo-tab") === key)
        );
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        render(tab.getAttribute("data-demo-tab"));
      });
    });

    render("dashboard");
  }

  /* Active TOC highlighting */
  var headings = document.querySelectorAll(".docs-content h2[id]");
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (headings.length && tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (link) {
      map[link.getAttribute("href").slice(1)] = link;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            tocLinks.forEach(function (l) {
              l.classList.remove("is-active");
            });
            var link = map[entry.target.id];
            if (link) link.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach(function (h) {
      observer.observe(h);
    });
  }

  /* Current year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
