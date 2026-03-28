import './style.css';
import Feature from 'ol/Feature.js';
import Geolocation from 'ol/Geolocation.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import XYZ from 'ol/source/XYZ.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import Text from 'ol/style/Text.js';
import { fromLonLat, toLonLat } from 'ol/proj';
import Cluster from 'ol/source/Cluster.js';
import Overlay from 'ol/Overlay.js';

const historicalStops = [
  { name: 'Gravensteen', coordinates: fromLonLat([3.721429, 51.05693])},
  { name: 'Vrijdagmarkt', coordinates: fromLonLat([3.725682, 51.056887])},
  { name: 'Stadhuis van Gent', coordinates: fromLonLat([3.725337, 51.054501])},
  { name: 'Sint-Baafskathedraal', coordinates: fromLonLat([3.726961, 51.053007])},
  { name: 'Graslei', coordinates: fromLonLat([3.720725, 51.054782])},
];

const view = new View({
  center: fromLonLat([3.7250, 51.0550]),
  zoom: 15,
});

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new XYZ({
        url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attributions: '© CARTO'
      }),
    }),
  ],
  view: view,
});

const routeSource = new VectorSource();
const stopSource = new VectorSource();
const locationSource = new VectorSource();

const clusterSource = new Cluster({
  distance: 40,
  source: stopSource,
});

const stopLayer = new VectorLayer({
  source: clusterSource,
  zIndex: 11,
  style: function(feature) {
    const features = feature.get('features');
    const size = features.length;
    if (size > 1) {
      return new Style({
        image: new CircleStyle({
          radius: 15, fill: new Fill({ color: '#3399CC' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
        text: new Text({
          text: size.toString(), fill: new Fill({ color: '#fff' }), font: 'bold 12px sans-serif',
        }),
      });
    }
    return features[0].getStyle();
  }
});

map.addLayer(new VectorLayer({ source: routeSource, zIndex: 10 }));
map.addLayer(stopLayer);
map.addLayer(new VectorLayer({ source: locationSource, zIndex: 20 }));

historicalStops.forEach((stop, index) => {
  const marker = new Feature({ 
    geometry: new Point(stop.coordinates), 
    data: stop 
  });
  marker.setStyle(new Style({
    image: new CircleStyle({
      radius: 12, fill: new Fill({ color: '#4ECDC4' }), stroke: new Stroke({ color: '#fff', width: 3 }),
    }),
    text: new Text({
      text: `${index + 1}. ${stop.name}`, font: 'bold 13px sans-serif', fill: new Fill({ color: '#eee' }),
      stroke: new Stroke({ color: '#1a1a2e', width: 3 }), offsetX: 15, offsetY: -15, textAlign: 'left'
    }),
  }));
  stopSource.addFeature(marker);
});

const geolocation = new Geolocation({
  trackingOptions: { enableHighAccuracy: true },
  projection: view.getProjection(),
});

const positionFeature = new Feature();
positionFeature.setStyle(new Style({
  image: new CircleStyle({
    radius: 8, fill: new Fill({ color: '#3399CC' }), stroke: new Stroke({ color: '#fff', width: 2 }),
  }),
}));
locationSource.addFeature(positionFeature);

function el(id) { return document.getElementById(id); }

el('volg').addEventListener('change', function () {
  geolocation.setTracking(this.checked);
});

geolocation.on('change', function () {
  const acc = geolocation.getAccuracy();
  const speed = geolocation.getSpeed();
  const alt = geolocation.getAltitude();

  if(el('nauwkeurigheid')) el('nauwkeurigheid').innerText = acc ? Math.round(acc) + ' m' : '-';
  if(el('snelheid')) el('snelheid').innerText = speed ? (speed * 3.6).toFixed(1) + ' km/h' : '-';
});

geolocation.on('change:position', function () {
  const coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
});

el('center-btn').addEventListener('click', () => {
  const coords = geolocation.getPosition();
  if (coords) view.animate({ center: coords, zoom: 17 });
});

async function buildFullRoute() {
  let totalDistance = 0;
  const instructionsList = el('instructions');
  if (instructionsList) instructionsList.innerHTML = ''; 

  for (let i = 0; i < historicalStops.length - 1; i++) {
    const from = toLonLat(historicalStops[i].coordinates);
    const to = toLonLat(historicalStops[i + 1].coordinates);
    const url = `https://router.project-osrm.org/route/v1/foot/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes?.length > 0) {
        const route = data.routes[0];
        totalDistance += route.distance;
        const routeCoords = route.geometry.coordinates.map(coord => fromLonLat(coord));
        const lineFeature = new Feature({ geometry: new LineString(routeCoords) });
        lineFeature.setStyle(new Style({ stroke: new Stroke({ color: '#FF6B6B', width: 5 }) }));
        routeSource.addFeature(lineFeature);

        if (instructionsList) {
          const header = document.createElement('div');
          header.className = 'instruction-header';
          header.innerText = `Naar ${historicalStops[i+1].name}`;
          instructionsList.appendChild(header);
          route.legs[0].steps.forEach(step => {
            const item = document.createElement('div');
            item.className = 'instruction-item';
            item.innerText = `${step.maneuver.instruction} (${Math.round(step.distance)}m)`;
            instructionsList.appendChild(item);
          });
        }
      }
    } catch (e) { console.error(e); }
  }
  if(el('afstand')) el('afstand').innerText = (totalDistance / 1000).toFixed(1) + ' km';
}
buildFullRoute();

document.getElementById('center-btn').addEventListener('click', () => {
  const coords = geolocation.getPosition();
  if (coords) view.animate({ center: coords, zoom: 15 });
});

const container = el('popup');
const content = el('popup-content');
const closer = el('popup-closer');

const overlay = new Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: { duration: 250 },
});
map.addOverlay(overlay);

closer.onclick = function (e) {
  e.preventDefault();
  overlay.setPosition(undefined);
  return false;
};

map.on('singleclick', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
  if (feature && feature.get('features')) {
    const clusterFeatures = feature.get('features');
    if (clusterFeatures.length === 1) {
      const stopData = clusterFeatures[0].get('data'); 
      const coordinates = clusterFeatures[0].getGeometry().getCoordinates();
      content.innerHTML = `
        <h3 style="margin: 0; color: #1a1a2e;">${stopData.name}</h3>
        <p style="font-size: 12px; color: #666;">Historisch Gent</p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
        <a href="https://nl.wikipedia.org/wiki/${stopData.name.replace(/ /g, '_')}" 
           target="_blank" style="color: #4ECDC4; font-weight: bold; text-decoration: none;">
           Bekijk op Wikipedia →
        </a>`;
      overlay.setPosition(coordinates);
    } else {
      view.animate({ center: evt.coordinate, zoom: view.getZoom() + 1 });
      overlay.setPosition(undefined);
    }
  } else {
    overlay.setPosition(undefined);
  }
});

const menuBtn = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');

if (menuBtn && sidebar) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Voorkom dat de klik doorgaat naar de kaart
    sidebar.classList.toggle('open');
    menuBtn.innerText = sidebar.classList.contains('open') ? '✖' : '☰';
  });
}

// Sluit het menu als je op de kaart klikt
map.on('click', () => {
  if (sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    menuBtn.innerText = '☰';
  }
});