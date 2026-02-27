(function () {
  "use strict";

  var BOROUGH_DATA_URL = "assets/data/london-boroughs.geojson";
  var PRIMARY_COVERAGE_DATA_URL = "assets/data/primary-coverage.geojson";
  var CORE_COLOR = "#d62828";
  var OUTSIDE_COLOR = "#263246";
  var OUTSIDE_RING_PADDING_RATIO = 0.16;
  var PRIMARY_COVERAGE_AREAS = "Brixton, Wandsworth, Mitcham, Sutton, Morden, Cheam, New Malden, Epsom";
  var SERVICE_BASE_COORDS = [51.444, -0.154];
  var COVERAGE_TOWNS = [
    { name: "Brixton", coords: [51.4613, -0.1162] },
    { name: "Wandsworth", coords: [51.4565, -0.1919] },
    { name: "Mitcham", coords: [51.4032, -0.1685] },
    { name: "Sutton", coords: [51.3618, -0.1945] },
    { name: "Morden", coords: [51.4022, -0.1948] },
    { name: "Cheam", coords: [51.3599, -0.2142] },
    { name: "New Malden", coords: [51.4007, -0.2613] },
    { name: "Epsom", coords: [51.333, -0.2698] }
  ];

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

    var mapData = await loadMapData();
    if (!mapData || !mapData.priorityData) {
      return;
    }

    mapNodes.forEach(function (node) {
      renderMap(node, mapData);
    });
  }

  async function loadMapData() {
    var data = await Promise.all([
      loadGeoData(BOROUGH_DATA_URL),
      loadGeoData(PRIMARY_COVERAGE_DATA_URL)
    ]);

    var boroughData = data[0];
    var priorityData = data[1];
    if (!priorityData) {
      return null;
    }

    return {
      boroughData: boroughData,
      priorityData: priorityData,
      outsideData: createOutsideAreaData(priorityData)
    };
  }

  async function loadGeoData(url) {
    try {
      var response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function createOutsideAreaData(priorityData) {
    if (!priorityData || !Array.isArray(priorityData.features) || priorityData.features.length === 0) {
      return null;
    }

    var rings = [];
    priorityData.features.forEach(function (feature) {
      if (!feature || !feature.geometry) {
        return;
      }
      rings = rings.concat(getPrimaryOuterRings(feature.geometry));
    });

    if (rings.length === 0) {
      return null;
    }

    var bounds = getRingBounds(rings);
    if (!bounds) {
      return null;
    }
    var paddedBounds = expandBounds(bounds, OUTSIDE_RING_PADDING_RATIO);
    var outerRing = [
      [paddedBounds.minX, paddedBounds.minY],
      [paddedBounds.maxX, paddedBounds.minY],
      [paddedBounds.maxX, paddedBounds.maxY],
      [paddedBounds.minX, paddedBounds.maxY],
      [paddedBounds.minX, paddedBounds.minY]
    ];

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "Outside of Priority Area",
            zone: "outside"
          },
          geometry: {
            type: "Polygon",
            coordinates: [outerRing].concat(
              rings.map(function (ring) {
                return closeRing(ring);
              })
            )
          }
        }
      ]
    };
  }

  function getPrimaryOuterRings(geometry) {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return [];
    }

    if (geometry.type === "Polygon") {
      return geometry.coordinates.length ? [geometry.coordinates[0]] : [];
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .map(function (polygon) {
          return Array.isArray(polygon) && polygon.length ? polygon[0] : null;
        })
        .filter(Boolean);
    }

    return [];
  }

  function getRingBounds(rings) {
    var bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    rings.forEach(function (ring) {
      if (!Array.isArray(ring)) {
        return;
      }
      ring.forEach(function (point) {
        if (!Array.isArray(point) || point.length < 2) {
          return;
        }
        var lng = point[0];
        var lat = point[1];
        if (lng < bounds.minX) bounds.minX = lng;
        if (lng > bounds.maxX) bounds.maxX = lng;
        if (lat < bounds.minY) bounds.minY = lat;
        if (lat > bounds.maxY) bounds.maxY = lat;
      });
    });

    if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY)) {
      return null;
    }

    return bounds;
  }

  function expandBounds(bounds, paddingRatio) {
    var width = bounds.maxX - bounds.minX;
    var height = bounds.maxY - bounds.minY;
    var maxSpan = Math.max(width, height);
    var padX = maxSpan * paddingRatio;
    var padY = maxSpan * paddingRatio;

    return {
      minX: bounds.minX - padX,
      minY: bounds.minY - padY,
      maxX: bounds.maxX + padX,
      maxY: bounds.maxY + padY
    };
  }

  function closeRing(ring) {
    if (!Array.isArray(ring) || ring.length === 0) {
      return ring;
    }

    var first = ring[0];
    var last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      return ring;
    }

    return ring.concat([[first[0], first[1]]]);
  }

  function renderMap(node, mapData) {
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

    map.createPane("outsidePane");
    map.getPane("outsidePane").style.zIndex = 390;
    map.createPane("boroughPane");
    map.getPane("boroughPane").style.zIndex = 395;
    map.createPane("primaryPane");
    map.getPane("primaryPane").style.zIndex = 410;

    var boroughLayer = null;
    var outsideLayer = null;

    if (mapData.outsideData) {
      outsideLayer = L.geoJSON(mapData.outsideData, {
        pane: "outsidePane",
        smoothFactor: 0,
        style: styleOutsideFeature,
        onEachFeature: function (_feature, layer) {
          layer.bindPopup("<strong>Outside of Priority Area</strong>");
        }
      }).addTo(map);
    }

    var priorityLayer = L.geoJSON(mapData.priorityData, {
      pane: "primaryPane",
      smoothFactor: 0,
      style: stylePrimaryFeature,
      onEachFeature: function (_feature, layer) {
        layer.bindPopup("<strong>Primary Coverage</strong><br>" + PRIMARY_COVERAGE_AREAS);
      }
    });

    if (mapData.boroughData) {
      boroughLayer = L.geoJSON(mapData.boroughData, {
        pane: "boroughPane",
        smoothFactor: 0.1,
        interactive: false,
        style: styleBoroughFeature
      }).addTo(map);
    }

    priorityLayer.addTo(map);

    var focusBounds = getFocusBounds(outsideLayer || priorityLayer);
    if (focusBounds && focusBounds.isValid()) {
      map.fitBounds(focusBounds);
      map.setMaxBounds(focusBounds.pad(0.25));
    } else if (boroughLayer && boroughLayer.getBounds().isValid()) {
      map.fitBounds(boroughLayer.getBounds().pad(0.08));
    }

    if (variant === "home") {
      map.setZoom(Math.max(10.1, map.getZoom() - 0.08));
    } else {
      map.setZoom(Math.max(10.6, map.getZoom()));
    }

    L.circleMarker(SERVICE_BASE_COORDS, {
      radius: 6,
      weight: 2,
      color: "#ffffff",
      fillColor: "#7d0f0f",
      fillOpacity: 1
    })
      .bindPopup("<strong>South West London</strong><br>Service base")
      .addTo(map);

    addTownMarkers(map, variant);

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

  function addTownMarkers(map, variant) {
    if (variant !== "detail") {
      return;
    }

    COVERAGE_TOWNS.forEach(function (town) {
      L.circleMarker(town.coords, {
        radius: 4,
        weight: 1,
        color: "#ffffff",
        fillColor: CORE_COLOR,
        fillOpacity: 0.92
      })
        .bindPopup("<strong>" + escapeHtml(town.name) + "</strong><br>Primary Coverage")
        .addTo(map);
    });
  }

  function styleOutsideFeature() {
    return {
      color: "#5f6f86",
      weight: 0.95,
      fillColor: OUTSIDE_COLOR,
      fillOpacity: 0.055,
      fillRule: "evenodd"
    };
  }

  function stylePrimaryFeature() {
    return {
      color: "#b01f1f",
      weight: 1.1,
      opacity: 0.85,
      fillColor: CORE_COLOR,
      fillOpacity: 0.54,
      lineJoin: "round",
      fillRule: "nonzero"
    };
  }

  function styleBoroughFeature() {
    return {
      color: "#5f6f86",
      weight: 0.75,
      opacity: 0.45,
      fill: false
    };
  }

  function getFocusBounds(layer) {
    return layer && layer.getBounds ? layer.getBounds() : null;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

})();
