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

const clusterSource = new Cluster({
  distance:40,
  source:stopSource,
});
const stopLayer = new VectorLayer({
  source: clusterSource,
  zIndex:11,
  style: function(feature) {
    const size = feature.get('features').length;
    if (size > 2 ) {
      return new Style({
        image: new CircleStyle({
          radius:10,
          fill: new Fill({
            color:'#3399CC'
          }),
          stroke:new Stroke({
            color: '#fff', width:2
          }),

        }),
        text:new Text({
          text:size.toString(),
          fill: new Fill({
            color:'#fff'
          }),
          font:'bold 12px sans-serif',
        }),
      });
    }
    const originalFeature = feature.get('features')[0];
    return originalFeature.getStyle();
  }
})
const locationSource = new VectorSource();

map.addLayer(new VectorLayer({ source: routeSource, zIndex: 10 }));
map.addLayer(new VectorLayer({ source: stopSource, zIndex: 11 }));
map.addLayer(new VectorLayer({ source: locationSource, zIndex: 12 }));
map.addLayer(stopLayer);

historicalStops.forEach((stop, index) => {
  const marker = new Feature({ geometry: new Point(stop.coordinates), data:stop, name:stop.name });
  marker.setStyle(new Style({
    image: new CircleStyle({
      radius: 12, fill: new Fill({ color: '#4ECDC4' }),
      stroke: new Stroke({ color: '#fff', width: 3 }),
    }),
    text: new Text({
      text: `${index + 1}`, font: 'bold 12px sans-serif', fill: new Fill({ color: '#fff' }),
    }),
  }));
  
  const label = new Feature({ geometry: new Point(stop.coordinates),data:stop });
  label.setStyle(new Style({
    text: new Text({
      text: stop.name, offsetX: 15, offsetY: -15, textAlign: 'left',
      font: 'bold 13px sans-serif', fill: new Fill({ color: '#eee' }),
      stroke: new Stroke({ color: '#1a1a2e', width: 3 }),
    }),
  }));
  
  stopSource.addFeatures([marker, label]);
});

async function buildFullRoute() {
  let totalDistance = 0;
  const instructionsList = document.getElementById('instructions');
  if (instructionsList) instructionsList.innerHTML = ''; 

  for (let i = 0; i < historicalStops.length - 1; i++) {
    const from = toLonLat(historicalStops[i].coordinates);
    const to = toLonLat(historicalStops[i + 1].coordinates);
    
    const url = `https://router.project-osrm.org/route/v1/foot/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        totalDistance += route.distance;

        const routeCoords = route.geometry.coordinates.map(coord => fromLonLat(coord));
        const lineFeature = new Feature({ geometry: new LineString(routeCoords) });
        lineFeature.setStyle(new Style({
          stroke: new Stroke({ color: '#FF6B6B', width: 5 })
        }));
        routeSource.addFeature(lineFeature);

        if (instructionsList) {
          const header = document.createElement('div');
          header.className = 'instruction-header';
          header.innerText = `Route Naar ${historicalStops[i+1].name}`;
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
  const distEl = document.getElementById('distance');
  if(distEl) distEl.innerText = (totalDistance / 1000).toFixed(1) + ' km';
}

buildFullRoute();

const geolocation = new Geolocation({
  trackingOptions: { enableHighAccuracy: true },
  projection: view.getProjection(),
});

const positionFeature = new Feature();
positionFeature.setStyle(new Style({
  image: new CircleStyle({
    radius: 10, fill: new Fill({ color: '#3399CC' }), stroke: new Stroke({ color: '#fff', width: 3 }),
  }),
}));
locationSource.addFeature(positionFeature);

document.getElementById('track').addEventListener('change', function() {
  geolocation.setTracking(this.checked);
});

geolocation.on('change:position', function() {
  const coords = geolocation.getPosition();
  positionFeature.setGeometry(coords ? new Point(coords) : null);
});

// Re-center knop
document.getElementById('center-btn').addEventListener('click', () => {
  const coords = geolocation.getPosition();
  if (coords) view.animate({ center: coords, zoom: 15 });
});

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

const overlay = new Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: { duration: 250 },
});
map.addOverlay(overlay);

closer.onclick = function (e) {
  e.preventDefault();
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

