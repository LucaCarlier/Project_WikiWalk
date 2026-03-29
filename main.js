import "./style.css";
import { Map, View, Feature, Overlay, Geolocation } from "ol";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { XYZ, Vector as VectorSource, Cluster } from "ol/source";
import { Point, LineString } from "ol/geom";
import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import gsap from "gsap";
import { registerSW } from "virtual:pwa-register";

// --- 1. Service Worker & PWA ---
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nieuwe versie beschikbaar. Vernieuwen?")) updateSW();
  },
  onOfflineReady() {
    console.log("App is klaar voor offline gebruik!");
  },
});

// --- 2. Configuratie & Data ---
const historicalStops = [
  { name: "Gravensteen", coordinates: fromLonLat([3.721429, 51.05693]) },
  { name: "Vrijdagmarkt", coordinates: fromLonLat([3.725682, 51.056887]) },
  { name: "Stadhuis Gent", coordinates: fromLonLat([3.725337, 51.054501]) },
  {
    name: "Sint-Baafskathedraal",
    coordinates: fromLonLat([3.726961, 51.053007]),
  },
  { name: "Graslei", coordinates: fromLonLat([3.720725, 51.054782]) },
];

const view = new View({ center: fromLonLat([3.725, 51.055]), zoom: 15 });
const routeSource = new VectorSource();
const stopSource = new VectorSource();
const locationSource = new VectorSource();

// --- 3. Kaart Initialisatie ---
const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new XYZ({
        url: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        attributions: "© CARTO",
      }),
    }),
    new VectorLayer({ source: routeSource, zIndex: 10 }),
    new VectorLayer({
      source: new Cluster({ distance: 40, source: stopSource }),
      zIndex: 11,
      style: (feature) => {
        const size = feature.get("features").length;
        if (size > 1) {
          return new Style({
            image: new CircleStyle({
              radius: 15,
              fill: new Fill({ color: "#3399CC" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({ color: "#fff" }),
              font: "bold 12px sans-serif",
            }),
          });
        }
        return feature.get("features")[0].getStyle();
      },
    }),
    new VectorLayer({ source: locationSource, zIndex: 20 }),
  ],
  view: view,
});

// --- 4. Markers & Routing ---
historicalStops.forEach((stop, index) => {
  const marker = new Feature({
    geometry: new Point(stop.coordinates),
    data: stop,
  });
  marker.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 12,
        fill: new Fill({ color: "#4ECDC4" }),
        stroke: new Stroke({ color: "#fff", width: 3 }),
      }),
      text: new Text({
        text: `${index + 1}. ${stop.name}`,
        font: "bold 13px sans-serif",
        fill: new Fill({ color: "#eee" }),
        stroke: new Stroke({ color: "#1a1a2e", width: 3 }),
        offsetX: 15,
        offsetY: -15,
        textAlign: "left",
      }),
    }),
  );
  stopSource.addFeature(marker);
});

async function buildFullRoute() {
  const instructionsList = document.getElementById("instructions");
  if (instructionsList) instructionsList.innerHTML = "";
  let totalDistance = 0;

  for (let i = 0; i < historicalStops.length - 1; i++) {
    const from = toLonLat(historicalStops[i].coordinates);
    const to = toLonLat(historicalStops[i + 1].coordinates);
    const url = `https://router.project-osrm.org/route/v1/foot/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        totalDistance += route.distance;

        const lineFeature = new Feature({
          geometry: new LineString(
            route.geometry.coordinates.map((c) => fromLonLat(c)),
          ),
        });
        lineFeature.setStyle(
          new Style({ stroke: new Stroke({ color: "#FF6B6B", width: 5 }) }),
        );
        routeSource.addFeature(lineFeature);

        if (instructionsList) {
          const header = document.createElement("div");
          header.className = "instruction-header";
          header.innerText = `Naar ${historicalStops[i + 1].name}`;
          instructionsList.appendChild(header);
          route.legs[0].steps.forEach((s) => {
            const item = document.createElement("div");
            item.className = "instruction-item";
            item.innerText = `${s.maneuver.instruction} (${Math.round(s.distance)}m)`;
            instructionsList.appendChild(item);
          });
        }
      }
      // Kleine delay om API-rate limits te voorkomen
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (e) {
      console.error("Routing error:", e);
    }
  }
  if (document.getElementById("afstand"))
    document.getElementById("afstand").innerText =
      (totalDistance / 1000).toFixed(1) + " km";
}
buildFullRoute();

// --- Geolocatie ---
const geolocation = new Geolocation({
  trackingOptions: { enableHighAccuracy: true },
  projection: view.getProjection(),
});
const positionFeature = new Feature();
positionFeature.setStyle(
  new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: "#3399CC" }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
    }),
  }),
);
locationSource.addFeature(positionFeature);

document.getElementById("volg").addEventListener("change", function () {
  geolocation.setTracking(this.checked);
});
document.getElementById("center-btn").addEventListener("click", () => {
  const coords = geolocation.getPosition();
  if (coords) view.animate({ center: coords, zoom: 17 });
});

geolocation.on("change", () => {
  const acc = geolocation.getAccuracy();
  const speed = geolocation.getSpeed();
  document.getElementById("nauwkeurigheid").innerText = acc
    ? Math.round(acc) + " m"
    : "-";
  document.getElementById("snelheid").innerText = speed
    ? (speed * 3.6).toFixed(1) + " km/h"
    : "-";
});

geolocation.on("change:position", () => {
  const coords = geolocation.getPosition();
  positionFeature.setGeometry(coords ? new Point(coords) : null);
});

// --- Wikidata & Popups ---
const container = document.getElementById("popup");
const content = document.getElementById("popup-content");
const overlay = new Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: { duration: 250 },
});
map.addOverlay(overlay);

document.getElementById("popup-closer").onclick = () => {
  overlay.setPosition(undefined);
  return false;
};

async function fetchWikidata(stopName) {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = "flex";
    gsap.fromTo(loader, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  const sparqlQuery = `SELECT ?description ?image ?article WHERE {
    ?item rdfs:label "${stopName}"@nl.
    OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = "nl") }
    OPTIONAL { ?item wdt:P18 ?image. }
    OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://nl.wikipedia.org/>. }
  } LIMIT 1`;

  try {
    const response = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}`,
      { headers: { Accept: "application/sparql-results+json" } },
    );
    const data = await response.json();
    const res = data.results.bindings[0];
    if (!res) return { error: "Geen data gevonden." };
    return {
      description: res.description?.value || "Geen beschrijving beschikbaar.",
      image: res.image?.value || null,
      wikiUrl:
        res.article?.value ||
        `https://nl.wikipedia.org/wiki/${stopName.replace(/ /g, "_")}`,
    };
  } catch (e) {
    return { error: "Fout bij ophalen." };
  } finally {
    if (loader)
      gsap.to(loader, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => (loader.style.display = "none"),
      });
  }
}

map.on("singleclick", async (evt) => {
  const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
  if (feature && feature.get("features")?.length === 1) {
    const data = feature.get("features")[0].get("data");
    content.innerHTML = `<p>Laden...</p>`;
    overlay.setPosition(
      feature.get("features")[0].getGeometry().getCoordinates(),
    );

    const info = await fetchWikidata(data.name);
    content.innerHTML = info.error
      ? `<h3>${data.name}</h3><p>${info.error}</p>`
      : `
      <div class="popup-scroll">
        ${info.image ? `<img src="${info.image}?width=300" style="width:100%; border-radius:8px;">` : ""}
        <h3>${data.name}</h3><p>${info.description}</p>
        <a href="${info.wikiUrl}" target="_blank">Lees meer op Wikipedia →</a>
      </div>`;
  } else {
    overlay.setPosition(undefined);
  }
});

// --- UI & Sidebar ---
const menuBtn = document.getElementById("menu-toggle");
const sidebar = document.querySelector(".sidebar");
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.toggle("open");
  menuBtn.innerText = sidebar.classList.contains("open") ? "✖" : "☰";
});

map.on("click", () => {
  if (sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
    menuBtn.innerText = "☰";
  }
});

// --- WebXR AR Mode ---
export function startAR(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20,
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    }),
  );

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x4ecdc4 }),
  );
  cube.position.set(0, 0, -0.5);
  scene.add(cube);

  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

document.getElementById("ar-start-btn").addEventListener("click", () => {
  startAR(document.querySelector(".map-container"));
  ["ar-start-btn", "center-btn", "menu-toggle"].forEach(
    (id) => (document.getElementById(id).style.display = "none"),
  );
});
