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

  function setupRevealAnimations() {
    var revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
    observeRevealElements(revealElements);
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
          threshold: 0.14,
          rootMargin: "0px 0px -6% 0px"
        }
      );
    }

    elements.forEach(function (element, index) {
      if (element.classList.contains("is-visible")) {
        return;
      }
      element.style.setProperty("--reveal-delay", String((index % 6) * 0.06) + "s");
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

    var top = document.createElement("div");
    top.className = "review-top";

    var reviewer = document.createElement("p");
    reviewer.className = "reviewer";
    reviewer.textContent = review.reviewer || "Verified customer";

    var stars = document.createElement("p");
    stars.className = "stars";
    stars.setAttribute("aria-label", "5 stars");
    stars.textContent = "★★★★★";

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
