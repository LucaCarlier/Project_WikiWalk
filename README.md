# WikiWalk Gent - Historische Route Planner

**WikiWalk** is een interactieve Web App die wandelaars door het historische hart van Gent gidst.

---

## Wat is WikiWalk?

WikiWalk is ontworpen voor mensen die Gent te voet willen ontdekken. De app navigeert je langs vijf iconische locaties:
1.  **Het Gravensteen**
2.  **Vrijdagmarkt**
3.  **Stadhuis van Gent**
4.  **Sint-Baafskathedraal**
5.  **Graslei**

De app koppelt elke stop aan relevante informatie, zodat je bij elke marker direct de historische context kunt induiken.

---

## Hoe de app werkt

De applicatie is gebouwd met volgende onderdelen en gericht op mobiel gebruik:

* **Kaartlaag:** Gebruikt **OpenLayers** voor het renderen van de kaart en het beheren van de markers en clustering.
* **Routing:** Maakt gebruik van de **OSRM (Open Source Routing Machine) API** om de wandelpaden tussen de bezienswaardigheden te berekenen.
* **Geolocatie:** Gebruikt de browser **Geolocation API** om je huidige positie live op de kaart weer te geven, inclusief snelheid en nauwkeurigheid.
* **PWA (Progressive Web App):** Dankzij een Web Manifest en Service Worker kan de app op het startscherm van een smartphone worden geïnstalleerd.
* **WebXR:** Bevat een stabiele **Augmented Reality** sessie die de camera-feed van de smartphone als achtergrond gebruikt.

---

## Hoe gebruiken

### Voor Gebruikers:
1.  **Open de App:** Navigeer naar de URL op je mobiele browser.
2.  **Locatie Toestaan:** Geef de app toestemming om je GPS-locatie te gebruiken voor de beste ervaring.
3.  **Volg de Route:** De rode lijn op de kaart geeft de wandelroute aan. Gebruik het hamburger-menu rechtsboven voor gedetailleerde stap-voor-stap instructies.
4.  **Info Bekijken:** Klik op een marker op de kaart. Er verschijnt een popup met informatie over de locatie.
5.  **Installeren:** Kies in je browser voor "Toevoegen aan startscherm" om WikiWalk als een native app te gebruiken met een eigen icoon.

### Voor Ontwikkelaars:
1.  Clone de repository.
2.  Installeer de dependencies:
    ```bash
    npm install
    ```
3.  Start de development server (bereikbaar op je lokale netwerk):
    ```bash
    npm run start
    ```
4.  Build voor productie:
    ```bash
    npm run build
    ```

---

## 📚 Gebruikte Bronnen & Technologieën

voor dit project maak ik gebruik van de volgende open-source bibliotheken en API's:

* **OpenLayers:** Voor de interactieve kaartinterface. [https://openlayers.org/](https://openlayers.org/)
* **OSRM API:** Voor het berekenen van de wandelroutes. [http://project-osrm.org/](http://project-osrm.org/)
* **Vite PWA Plugin:** Voor de implementatie van het Web Manifest en de Service Worker. [https://vite-pwa-org.netlify.app/](https://vite-pwa-org.netlify.app/)
* **Three.js:** Voor de stabiele WebXR/AR sessie-opbouw. [https://threejs.org/](https://threejs.org/)
* **CartoDB:** Voor de 'Light All' basemap tiles. [https://carto.com/](https://carto.com/)
* **MDN Web Docs:** Voor documentatie over de Geolocation API en WebXR. [https://developer.mozilla.org/](https://developer.mozilla.org/)

---