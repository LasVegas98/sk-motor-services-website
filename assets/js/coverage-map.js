(function () {
  "use strict";

  var BOROUGH_DATA_URL = "assets/data/london-boroughs.geojson";
  var POSTCODE_LAYER_CONFIG = [
    { prefix: "SW", zone: "core", url: "assets/data/postcode-sw.geojson" },
    { prefix: "CR", zone: "surrounding", url: "assets/data/postcode-cr.geojson" },
    { prefix: "KT", zone: "surrounding", url: "assets/data/postcode-kt.geojson" },
    { prefix: "SM", zone: "surrounding", url: "assets/data/postcode-sm.geojson" },
    { prefix: "SE", zone: "surrounding", url: "assets/data/postcode-se.geojson" },
    { prefix: "TW", zone: "surrounding", url: "assets/data/postcode-tw.geojson" },
    { prefix: "BR", zone: "surrounding", url: "assets/data/postcode-br.geojson" }
  ];
  var CORE_COLOR = "#d62828";
  var SURROUNDING_COLOR = "#f07f7f";
  var OUTSIDE_COLOR = "#263246";
  var SW11_COORDS = [51.463, -0.168];
  var BIGGIN_HILL_CORRECTION_BBOX = {
    minX: -0.01,
    minY: 51.2885,
    maxX: 0.1,
    maxY: 51.338
  };
  var CORE_POSTCODE_PREFIXES = new Set(["SW"]);
  var SURROUNDING_POSTCODE_PREFIXES = new Set(["CR", "SM", "KT", "SE", "TW", "BR"]);

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
    if (!mapData || !mapData.postcodeData) {
      return;
    }

    mapNodes.forEach(function (node) {
      renderMap(node, mapData);
    });
  }

  async function loadMapData() {
    var postcodeFetches = POSTCODE_LAYER_CONFIG.map(function (config) {
      return loadGeoData(config.url);
    });

    var data = await Promise.all([
      loadGeoData(BOROUGH_DATA_URL),
      Promise.all(postcodeFetches)
    ]);

    var boroughData = data[0];
    var postcodeCollections = data[1];
    var postcodeData = mergePostcodeCollections(postcodeCollections);

    if (!postcodeData) {
      return null;
    }

    applyBigginHillCorrection(postcodeData, boroughData);

    return {
      boroughData: boroughData,
      postcodeData: postcodeData
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

  function mergePostcodeCollections(collections) {
    var features = [];

    POSTCODE_LAYER_CONFIG.forEach(function (config, index) {
      var collection = collections[index];
      if (!collection || !Array.isArray(collection.features)) {
        return;
      }

      collection.features.forEach(function (feature) {
        if (!feature || !feature.geometry) {
          return;
        }

        features.push({
          type: "Feature",
          geometry: feature.geometry,
          properties: Object.assign({}, feature.properties || {}, {
            postcodeArea: config.prefix,
            zone: config.zone
          })
        });
      });
    });

    if (features.length === 0) {
      return null;
    }

    return {
      type: "FeatureCollection",
      features: features
    };
  }

  function applyBigginHillCorrection(postcodeData, boroughData) {
    if (
      !postcodeData ||
      !Array.isArray(postcodeData.features) ||
      !boroughData ||
      !Array.isArray(boroughData.features)
    ) {
      return;
    }

    var alreadyAdded = postcodeData.features.some(function (feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return props.correctionId === "biggin-hill";
    });

    if (alreadyAdded) {
      return;
    }

    var bromleyFeature = boroughData.features.find(function (feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return String(props.name || "").toLowerCase() === "bromley";
    });

    if (!bromleyFeature || !bromleyFeature.geometry) {
      return;
    }

    var correctionGeometry = clipGeometryToBBox(
      bromleyFeature.geometry,
      BIGGIN_HILL_CORRECTION_BBOX
    );

    if (!correctionGeometry) {
      return;
    }

    postcodeData.features.push({
      type: "Feature",
      geometry: correctionGeometry,
      properties: {
        name: "BR6",
        description: "Biggin Hill surrounding coverage correction",
        postcodeArea: "BR",
        zone: "surrounding",
        correctionId: "biggin-hill"
      }
    });
  }

  function clipGeometryToBBox(geometry, bbox) {
    if (!geometry || !geometry.type) {
      return null;
    }

    if (geometry.type === "Polygon") {
      var clippedPolygon = clipPolygonRingsToBBox(geometry.coordinates, bbox);
      if (!clippedPolygon) {
        return null;
      }
      return {
        type: "Polygon",
        coordinates: clippedPolygon
      };
    }

    if (geometry.type === "MultiPolygon") {
      var clippedPolygons = geometry.coordinates
        .map(function (polygonRings) {
          return clipPolygonRingsToBBox(polygonRings, bbox);
        })
        .filter(Boolean);

      if (clippedPolygons.length === 0) {
        return null;
      }

      if (clippedPolygons.length === 1) {
        return {
          type: "Polygon",
          coordinates: clippedPolygons[0]
        };
      }

      return {
        type: "MultiPolygon",
        coordinates: clippedPolygons
      };
    }

    return null;
  }

  function clipPolygonRingsToBBox(rings, bbox) {
    if (!Array.isArray(rings) || rings.length === 0) {
      return null;
    }

    var outerRing = clipRingToBBox(rings[0], bbox);
    if (!outerRing) {
      return null;
    }

    var holeRings = rings
      .slice(1)
      .map(function (ring) {
        return clipRingToBBox(ring, bbox);
      })
      .filter(Boolean);

    return [outerRing].concat(holeRings);
  }

  function clipRingToBBox(ring, bbox) {
    var points = normalizeRing(ring);
    if (points.length < 3) {
      return null;
    }

    points = clipAgainstVerticalEdge(points, bbox.minX, true);
    points = clipAgainstVerticalEdge(points, bbox.maxX, false);
    points = clipAgainstHorizontalEdge(points, bbox.minY, true);
    points = clipAgainstHorizontalEdge(points, bbox.maxY, false);

    points = dedupeSequentialPoints(points);
    if (points.length < 3) {
      return null;
    }

    var first = points[0];
    var last = points[points.length - 1];
    if (!pointsEqual(first, last)) {
      points.push([first[0], first[1]]);
    }

    if (points.length < 4) {
      return null;
    }

    return points;
  }

  function normalizeRing(ring) {
    if (!Array.isArray(ring) || ring.length === 0) {
      return [];
    }

    var normalized = ring.map(function (point) {
      return [point[0], point[1]];
    });

    if (normalized.length > 1 && pointsEqual(normalized[0], normalized[normalized.length - 1])) {
      normalized.pop();
    }

    return normalized;
  }

  function clipAgainstVerticalEdge(points, edgeX, isMinEdge) {
    if (!Array.isArray(points) || points.length === 0) {
      return [];
    }

    var output = [];
    var previous = points[points.length - 1];
    var previousInside = isMinEdge ? previous[0] >= edgeX : previous[0] <= edgeX;

    points.forEach(function (current) {
      var currentInside = isMinEdge ? current[0] >= edgeX : current[0] <= edgeX;

      if (currentInside) {
        if (!previousInside) {
          output.push(intersectWithVertical(previous, current, edgeX));
        }
        output.push(current);
      } else if (previousInside) {
        output.push(intersectWithVertical(previous, current, edgeX));
      }

      previous = current;
      previousInside = currentInside;
    });

    return output;
  }

  function clipAgainstHorizontalEdge(points, edgeY, isMinEdge) {
    if (!Array.isArray(points) || points.length === 0) {
      return [];
    }

    var output = [];
    var previous = points[points.length - 1];
    var previousInside = isMinEdge ? previous[1] >= edgeY : previous[1] <= edgeY;

    points.forEach(function (current) {
      var currentInside = isMinEdge ? current[1] >= edgeY : current[1] <= edgeY;

      if (currentInside) {
        if (!previousInside) {
          output.push(intersectWithHorizontal(previous, current, edgeY));
        }
        output.push(current);
      } else if (previousInside) {
        output.push(intersectWithHorizontal(previous, current, edgeY));
      }

      previous = current;
      previousInside = currentInside;
    });

    return output;
  }

  function intersectWithVertical(start, end, edgeX) {
    var deltaX = end[0] - start[0];
    if (deltaX === 0) {
      return [edgeX, start[1]];
    }

    var ratio = (edgeX - start[0]) / deltaX;
    var y = start[1] + ratio * (end[1] - start[1]);
    return [edgeX, y];
  }

  function intersectWithHorizontal(start, end, edgeY) {
    var deltaY = end[1] - start[1];
    if (deltaY === 0) {
      return [start[0], edgeY];
    }

    var ratio = (edgeY - start[1]) / deltaY;
    var x = start[0] + ratio * (end[0] - start[0]);
    return [x, edgeY];
  }

  function dedupeSequentialPoints(points) {
    if (!Array.isArray(points) || points.length === 0) {
      return [];
    }

    var deduped = [points[0]];
    for (var index = 1; index < points.length; index += 1) {
      if (!pointsEqual(points[index], points[index - 1])) {
        deduped.push(points[index]);
      }
    }
    return deduped;
  }

  function pointsEqual(a, b) {
    return !!a && !!b && a[0] === b[0] && a[1] === b[1];
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

    var boroughLayer = null;

    var postcodeLayer = L.geoJSON(mapData.postcodeData, {
      style: stylePostcodeFeature,
      onEachFeature: function (feature, layer) {
        var props = feature.properties || {};
        var name = props.name || "Postcode District";
        var zone = getZoneForFeature(feature);
        var zoneText = getZoneText(zone);

        if (zone === "core") {
          layer.bindPopup("<strong>" + escapeHtml(name) + "</strong><br>Primary Coverage");
          return;
        }

        if (zone === "surrounding") {
          layer.bindPopup("<strong>" + escapeHtml(name) + "</strong><br>Surrounding Coverage");
          return;
        }

        layer.bindPopup("<strong>" + escapeHtml(name) + "</strong><br>" + zoneText);
      }
    });

    if (mapData.boroughData) {
      boroughLayer = L.geoJSON(mapData.boroughData, {
        style: styleBoroughFeature,
        onEachFeature: function (feature, layer) {
          var props = feature.properties || {};
          var name = props.name || "Borough";
          layer.bindPopup("<strong>" + escapeHtml(name) + "</strong><br>Outside of priority area");
        }
      }).addTo(map);
    }

    postcodeLayer.addTo(map);

    var focusBounds = getFocusBounds(postcodeLayer);
    if (focusBounds && focusBounds.isValid()) {
      map.fitBounds(focusBounds.pad(0.08));
      map.setMaxBounds(focusBounds.pad(0.65));
    } else if (boroughLayer && boroughLayer.getBounds().isValid()) {
      map.fitBounds(boroughLayer.getBounds().pad(0.08));
    }

    if (variant === "home") {
      map.setZoom(Math.max(9.8, map.getZoom() - 0.2));
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

  function stylePostcodeFeature(feature) {
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
      color: "#a5afbf",
      weight: 0.9,
      fillColor: OUTSIDE_COLOR,
      fillOpacity: 0.06
    };
  }

  function styleBoroughFeature() {
    return {
      color: "#5f6f86",
      weight: 0.95,
      fillColor: OUTSIDE_COLOR,
      fillOpacity: 0.045
    };
  }

  function getZoneText(zone) {
    if (zone === "core") {
      return "Primary Coverage";
    }
    if (zone === "surrounding") {
      return "Surrounding Coverage";
    }
    return "Outside of priority area";
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

  function getZoneForFeature(feature) {
    var props = feature && feature.properties ? feature.properties : {};
    var zone = props.zone;
    var postcodeArea = String(props.postcodeArea || "").toUpperCase();

    if (zone === "core" || CORE_POSTCODE_PREFIXES.has(postcodeArea)) {
      return "core";
    }

    if (zone === "surrounding" || SURROUNDING_POSTCODE_PREFIXES.has(postcodeArea)) {
      return "surrounding";
    }

    return "outside";
  }
})();
