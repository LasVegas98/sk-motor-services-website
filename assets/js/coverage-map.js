(function () {
  "use strict";

  var DATA_URL = "assets/data/london-boroughs.geojson";
  var CORE_COLOR = "#d62828";
  var SURROUNDING_COLOR = "#f07f7f";
  var OUTSIDE_COLOR = "#263246";
  var SW11_COORDS = [51.463, -0.168];
  var CORE_POSTCODE_PREFIXES = new Set(["SW"]);
  var SURROUNDING_POSTCODE_PREFIXES = new Set(["CR", "SM", "KT", "SE"]);
  var BOROUGH_POSTCODE_PREFIXES = {
    "wandsworth": ["SW"],
    "lambeth": ["SW", "SE"],
    "merton": ["SW", "CR", "SM", "KT"],
    "richmond-upon-thames": ["SW", "KT"],
    "kensington-and-chelsea": ["SW"],
    "hammersmith-and-fulham": ["SW"],
    "city-of-westminster": ["SW"],
    "southwark": ["SE"],
    "lewisham": ["SE"],
    "greenwich": ["SE"],
    "bromley": ["SE", "CR"],
    "bexley": ["SE"],
    "croydon": ["CR"],
    "sutton": ["SM", "CR", "KT"],
    "kingston-upon-thames": ["KT"]
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.L) {
      return;
    }
    initCoverageMaps();
  });

  async function initCoverageMaps() {
    var mapNodes = Array.from(document.querySelectorAll(".coverage-map"));
    if (mapNodes.length === 0) {
      return;
    }

    var geoData = await loadGeoData();
    if (!geoData) {
      return;
    }

    mapNodes.forEach(function (node) {
      renderMap(node, geoData);
    });
  }

  async function loadGeoData() {
    try {
      var response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function renderMap(node, geoData) {
    var variant = node.getAttribute("data-map-variant") || "detail";
    var map = L.map(node, {
      zoomControl: true,
      scrollWheelZoom: false,
      zoomSnap: 0.25,
      zoomDelta: 0.25
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    var geoLayer = L.geoJSON(geoData, {
      style: styleFeature,
      onEachFeature: function (feature, layer) {
        var props = feature.properties || {};
        var name = props.name || "Area";
        var zone = getZoneForFeature(feature);
        var postcodePrefixes = getPostcodePrefixesForFeature(feature);
        var zoneText = getZoneText(zone);

        layer.bindPopup(
          "<strong>" +
            escapeHtml(name) +
            "</strong><br>" +
            zoneText +
            "<br>Postcode Areas: " +
            (postcodePrefixes.length > 0 ? postcodePrefixes.join(", ") : "Outside priority prefixes")
        );

        if (shouldShowLabel(variant, zone)) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: "center",
            className: "borough-label " + zone
          });
        }
      }
    }).addTo(map);

    var focusBounds = getFocusBounds(geoData);
    if (focusBounds) {
      map.fitBounds(focusBounds.pad(0.08));
      map.setMaxBounds(focusBounds.pad(0.65));
    } else {
      map.fitBounds(geoLayer.getBounds().pad(0.08));
    }

    if (variant === "home") {
      map.setZoom(Math.max(10, map.getZoom() - 0.25));
    } else {
      map.setZoom(Math.max(10.25, map.getZoom()));
    }

    L.circleMarker(SW11_COORDS, {
      radius: 6,
      weight: 2,
      color: "#ffffff",
      fillColor: "#7d0f0f",
      fillOpacity: 1
    })
      .bindTooltip("SW11 Core", {
        permanent: variant === "detail",
        direction: "right",
        offset: [10, 0],
        className: "borough-label core"
      })
      .bindPopup("<strong>SW11 3GU</strong><br>Core service base")
      .addTo(map);

    L.control
      .scale({
        imperial: true,
        metric: true
      })
      .addTo(map);

    map.on("focus", function () {
      map.scrollWheelZoom.enable();
    });
  }

  function styleFeature(feature) {
    var zone = getZoneForFeature(feature);

    if (zone === "core") {
      return {
        color: "#ffcdcd",
        weight: 1.6,
        fillColor: CORE_COLOR,
        fillOpacity: 0.46
      };
    }

    if (zone === "surrounding") {
      return {
        color: "#f4d6d6",
        weight: 1.1,
        fillColor: SURROUNDING_COLOR,
        fillOpacity: 0.21
      };
    }

    return {
      color: "#6e7a91",
      weight: 0.9,
      fillColor: OUTSIDE_COLOR,
      fillOpacity: 0.08
    };
  }

  function getZoneText(zone) {
    if (zone === "core") {
      return "Primary Coverage (SW Postcodes)";
    }
    if (zone === "surrounding") {
      return "Surrounding Area (CR / SM / KT / SE Postcodes)";
    }
    return "Outside Priority Zone";
  }

  function shouldShowLabel(variant, zone) {
    if (zone === "outside") {
      return false;
    }
    if (variant === "home") {
      return zone === "core";
    }
    return true;
  }

  function getFocusBounds(geoData) {
    var focusFeatures = geoData.features.filter(function (feature) {
      var zone = getZoneForFeature(feature);
      return zone === "core" || zone === "surrounding";
    });

    if (focusFeatures.length === 0) {
      return null;
    }

    return L.geoJSON({
      type: "FeatureCollection",
      features: focusFeatures
    }).getBounds();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPostcodePrefixesForFeature(feature) {
    var slug = feature && feature.properties && feature.properties.slug;
    var prefixes = BOROUGH_POSTCODE_PREFIXES[slug];
    return Array.isArray(prefixes) ? prefixes : [];
  }

  function getZoneForFeature(feature) {
    var prefixes = getPostcodePrefixesForFeature(feature);

    if (prefixes.some(function (prefix) { return CORE_POSTCODE_PREFIXES.has(prefix); })) {
      return "core";
    }

    if (prefixes.some(function (prefix) { return SURROUNDING_POSTCODE_PREFIXES.has(prefix); })) {
      return "surrounding";
    }

    return "outside";
  }
})();
