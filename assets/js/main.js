(function () {
  "use strict";

  var revealObserver = null;

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.siteConfig) {
      return;
    }

    applyConfigText(window.siteConfig);
    applyContactLinks(window.siteConfig);
    setCurrentYear();
    setActiveNav();
    setupNavToggle();
    setupHeaderScroll();
    setupQuoteFormAnchorScroll();
    setupRevealAnimations();
    renderReviews();
    injectLocalBusinessSchema(window.siteConfig);
  });

  function applyConfigText(config) {
    document.querySelectorAll("[data-config]").forEach(function (node) {
      var key = node.getAttribute("data-config");
      if (!key || typeof config[key] !== "string") {
        return;
      }
      node.textContent = config[key];
    });
  }

  function applyContactLinks(config) {
    var links = {
      call: "tel:+" + config.phoneE164,
      whatsapp: "https://wa.me/" + config.phoneE164,
      mailto: "mailto:" + config.email,
      instagram: config.instagramUrl,
      googleReviews: config.googleReviewsUrl
    };

    document.querySelectorAll("[data-link]").forEach(function (node) {
      var linkType = node.getAttribute("data-link");
      var href = links[linkType];
      if (!href) {
        return;
      }
      node.setAttribute("href", href);

      if (linkType === "instagram" || linkType === "googleReviews" || linkType === "whatsapp") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener");
      }
    });
  }

  function setCurrentYear() {
    var yearNode = document.getElementById("year");
    if (yearNode) {
      yearNode.textContent = String(new Date().getFullYear());
    }
  }

  function setActiveNav() {
    var page = document.body.getAttribute("data-page");
    if (!page) {
      return;
    }

    document.querySelectorAll("[data-nav]").forEach(function (node) {
      var isActive = node.getAttribute("data-nav") === page;
      node.classList.toggle("is-active", isActive);
      if (isActive) {
        node.setAttribute("aria-current", "page");
      }
    });
  }

  function setupNavToggle() {
    var toggleButton = document.querySelector("[data-nav-toggle]");
    var nav = document.getElementById("site-nav");
    if (!toggleButton || !nav) {
      return;
    }

    toggleButton.addEventListener("click", function () {
      var expanded = toggleButton.getAttribute("aria-expanded") === "true";
      toggleButton.setAttribute("aria-expanded", String(!expanded));
      document.body.classList.toggle("nav-open", !expanded);
    });

    nav.querySelectorAll("a").forEach(function (navLink) {
      navLink.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        toggleButton.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        document.body.classList.remove("nav-open");
        toggleButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  function setupHeaderScroll() {
    function syncScrollClass() {
      document.body.classList.toggle("is-scrolled", window.scrollY > 12);
    }

    syncScrollClass();
    window.addEventListener("scroll", syncScrollClass, { passive: true });
  }

  function setupRevealAnimations() {
    var revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
    observeRevealElements(revealElements);
  }

  function setupQuoteFormAnchorScroll() {
    if (document.body.getAttribute("data-page") !== "contact") {
      return;
    }

    function isQuoteHash(hash) {
      return hash === "#quote-form" || hash === "#quote-form-heading";
    }

    function centerQuoteSection(smooth) {
      var quoteWrap = document.querySelector(".quote-form-wrap");
      if (!quoteWrap) {
        return;
      }
      centerElementInView(quoteWrap, smooth);
    }

    function maybeCenterFromHash(smooth) {
      var hash = decodeURIComponent(window.location.hash || "");
      if (!isQuoteHash(hash)) {
        return;
      }
      centerQuoteSection(smooth);
    }

    function recenterAfterLayout(smooth) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          maybeCenterFromHash(smooth);
        });
      });
    }

    document.querySelectorAll('a[href="#quote-form"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        event.preventDefault();
        if (window.location.hash !== "#quote-form") {
          history.pushState(null, "", "#quote-form");
        }
        centerQuoteSection(true);
      });
    });

    window.addEventListener("hashchange", function () {
      recenterAfterLayout(true);
    });

    setTimeout(function () {
      recenterAfterLayout(false);
    }, 0);

    window.addEventListener("load", function () {
      recenterAfterLayout(false);
      setTimeout(function () {
        recenterAfterLayout(false);
      }, 120);
      setTimeout(function () {
        recenterAfterLayout(false);
      }, 320);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        recenterAfterLayout(false);
      });
    }
  }

  function centerElementInView(element, smooth) {
    var rect = element.getBoundingClientRect();
    var elementTop = rect.top + window.scrollY;
    var elementHeight = rect.height;

    var header = document.querySelector(".site-header");
    var topOffset = header ? header.getBoundingClientRect().height : 0;

    var stickyCta = document.querySelector(".sticky-cta");
    var bottomOffset = 0;
    if (stickyCta && window.getComputedStyle(stickyCta).display !== "none") {
      bottomOffset = stickyCta.getBoundingClientRect().height;
    }

    var availableHeight = Math.max(240, window.innerHeight - topOffset - bottomOffset);
    var targetTop = elementTop - topOffset;

    if (elementHeight < availableHeight) {
      targetTop -= (availableHeight - elementHeight) / 2;
    } else {
      targetTop -= 12;
    }

    var maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var clampedTop = Math.min(maxScrollTop, Math.max(0, targetTop));

    window.scrollTo({
      top: clampedTop,
      behavior: smooth ? "smooth" : "auto"
    });
  }

  function observeRevealElements(elements) {
    if (!elements || elements.length === 0) {
      return;
    }

    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      elements.forEach(function (element) {
        element.classList.add("is-visible");
      });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px"
        }
      );
    }

    elements.forEach(function (element, index) {
      if (element.classList.contains("is-visible")) {
        return;
      }
      element.style.setProperty("--reveal-delay", String((index % 8) * 0.05) + "s");
      revealObserver.observe(element);
    });
  }

  async function renderReviews() {
    var homeGrid = document.getElementById("home-review-grid");
    var reviewsGrid = document.getElementById("reviews-grid");

    if (!homeGrid && !reviewsGrid) {
      return;
    }

    var reviews = [];

    try {
      var response = await fetch("assets/data/reviews.json", { cache: "no-store" });
      if (response.ok) {
        reviews = await response.json();
      }
    } catch (error) {
      reviews = [];
    }

    if (!Array.isArray(reviews) || reviews.length === 0) {
      reviews = Array.isArray(window.reviewSnippets) ? window.reviewSnippets : [];
    }

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return;
    }

    var countText = String(reviews.length);
    document.querySelectorAll("[data-review-count]").forEach(function (countNode) {
      countNode.textContent = countText;
    });

    if (homeGrid) {
      homeGrid.innerHTML = "";
      reviews.slice(0, 3).forEach(function (review) {
        homeGrid.appendChild(createReviewCard(review));
      });
      observeRevealElements(Array.from(homeGrid.querySelectorAll("[data-reveal]")));
    }

    if (reviewsGrid) {
      reviewsGrid.innerHTML = "";
      reviews.forEach(function (review) {
        reviewsGrid.appendChild(createReviewCard(review));
      });
      observeRevealElements(Array.from(reviewsGrid.querySelectorAll("[data-reveal]")));
    }
  }

  function createReviewCard(review) {
    var card = document.createElement("article");
    card.className = "review-card";
    card.setAttribute("data-reveal", "");
    card.setAttribute("data-reveal-style", "lift");

    var top = document.createElement("div");
    top.className = "review-top";

    var reviewer = document.createElement("p");
    reviewer.className = "reviewer";
    reviewer.textContent = review.reviewer || "Verified customer";

    var stars = document.createElement("p");
    stars.className = "stars";
    stars.setAttribute("aria-label", "5 stars");
    stars.textContent = "\u2605\u2605\u2605\u2605\u2605";

    top.appendChild(reviewer);
    top.appendChild(stars);

    var source = document.createElement("p");
    source.className = "review-source";
    source.textContent = review.source ? review.source + " review" : "Google review";

    var quote = document.createElement("p");
    quote.className = "review-quote";
    quote.textContent = review.quote || "";

    card.appendChild(top);
    card.appendChild(source);
    card.appendChild(quote);
    return card;
  }

  function injectLocalBusinessSchema(config) {
    var schema = {
      "@context": "https://schema.org",
      "@type": "AutoRepair",
      name: config.businessName,
      telephone: "+" + config.phoneE164,
      email: config.email,
      areaServed: [
        {
          "@type": "AdministrativeArea",
          name: "South West London"
        },
        {
          "@type": "AdministrativeArea",
          name: "Greater London"
        }
      ],
      address: {
        "@type": "PostalAddress",
        postalCode: config.postcode,
        addressCountry: "GB",
        addressLocality: "South West London"
      },
      sameAs: [config.instagramUrl, config.googleReviewsUrl],
      description:
        "Mobile vehicle maintenance services with customer-address repairs and no-obligation quote support."
    };

    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
})();
