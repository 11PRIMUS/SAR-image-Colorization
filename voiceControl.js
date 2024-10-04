document.addEventListener("DOMContentLoaded", async function() {
    const map = L.map('map').setView([20.5937, 78.9629], 5);

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const terrainLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const roadsLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const hybridLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    const baseMaps = {
        "Default": osmLayer,
        "Satellite": satelliteLayer,
        "Terrain": terrainLayer,
        "Roads": roadsLayer,
        "Hybrid": hybridLayer
    };

    L.control.layers(baseMaps).addTo(map);

    let markers = [];

    const addMarker = (lat, lon, popupText) => {
        const marker = L.marker([lat, lon]).addTo(map).bindPopup(popupText).openPopup();
        markers.push(marker);
        if (markers.length > 2) {
            map.removeLayer(markers.shift());
        }
    };

    const navigateToLocation = (location) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;

        axios.get(url)
            .then(response => {
                if (response.data && response.data.length > 0) {
                    const place = response.data[0];
                    const lat = parseFloat(place.lat);
                    const lon = parseFloat(place.lon);

                    map.flyTo([lat, lon], 10);
                    addMarker(lat, lon, `<b>${place.display_name}</b>`);
                    speak(`Navigating to ${place.display_name}`);
                } else {
                    alert('Location not found!');
                    speak('Location not found!');
                }
            })
            .catch(error => {
                console.error('Error fetching location:', error);
                alert('Error fetching location. Please try again.');
                speak('Error fetching location. Please try again.');
            });
    };

    const findRoute = (from, to) => {
        const urlFrom = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(from)}`;
        const urlTo = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(to)}`;

        Promise.all([axios.get(urlFrom), axios.get(urlTo)])
            .then(responses => {
                const [responseFrom, responseTo] = responses;

                if (responseFrom.data.length > 0 && responseTo.data.length > 0) {
                    const fromPlace = responseFrom.data[0];
                    const toPlace = responseTo.data[0];

                    const fromLatLng = [parseFloat(fromPlace.lat), parseFloat(fromPlace.lon)];
                    const toLatLng = [parseFloat(toPlace.lat), parseFloat(toPlace.lon)];

                    L.Routing.control({
                        waypoints: [
                            L.latLng(fromLatLng),
                            L.latLng(toLatLng)
                        ],
                        routeWhileDragging: true
                    }).addTo(map);

                    speak(`Finding route from ${fromPlace.display_name} to ${toPlace.display_name}`);
                } else {
                    alert('One or both locations not found!');
                    speak('One or both locations not found!');
                }
            })
            .catch(error => {
                console.error('Error fetching locations:', error);
                alert('Error fetching locations. Please try again.');
                speak('Error fetching locations. Please try again.');
            });
    };

    const speak = (message) => {
        const speech = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(speech);
    };

    const startButton = document.getElementById('startButton');
    const locateButton = document.getElementById('locateButton');
    const searchBar = document.getElementById('searchBar');

    const provider = new GeoSearch.OpenStreetMapProvider();
    const searchControl = new GeoSearch.GeoSearchControl({
        provider: provider,
        style: 'bar',
        autoComplete: true,
        autoCompleteDelay: 250
    });

    map.addControl(searchControl);

    searchBar.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            navigateToLocation(searchBar.value);
        }
    });

    if (annyang) {
        const commands = {
            'go to *location': (location) => {
                navigateToLocation(location);
            },
            'navigate to *location': (location) => {
                navigateToLocation(location);
            },
            'zoom in': () => {
                map.zoomIn();
                speak('Zooming in');
            },
            'zoom out': () => {
                map.zoomOut();
                speak('Zooming out');
            },
            'extra zoom in': () => {
                map.setZoom(map.getZoom() + 2);
                speak('Extra zooming in');
            },
            'extra zoom out': () => {
                map.setZoom(map.getZoom() - 2);
                speak('Extra zooming out');
            },
            'pan left': () => {
                map.panBy([-100, 0]);
                speak('Panning left');
            },
            'pan right': () => {
                map.panBy([100, 0]);
                speak('Panning right');
            },
            'satellite view': () => {
                map.addLayer(satelliteLayer);
                speak('Switching to satellite view');
            },
            'terrain view': () => {
                map.addLayer(terrainLayer);
                speak('Switching to terrain view');
            },
            'default view': () => {
                map.addLayer(osmLayer);
                speak('Switching to default view');
            },
            'roads view': () => {
                map.addLayer(roadsLayer);
                speak('Switching to roads view');
            },
            'hybrid view': () => {
                map.addLayer(hybridLayer);
                speak('Switching to hybrid view');
            },
            'find route from *from to *to': (from, to) => {
                findRoute(from, to);
            }
        };

        annyang.addCommands(commands);
        annyang.start();
    }

    locateButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                map.flyTo([lat, lon], 12);
                addMarker(lat, lon, 'You are here');
                speak('Showing your current location');
            }, function() {
                alert('Unable to retrieve your location');
                speak('Unable to retrieve your location');
            });
        } else {
            alert('Geolocation is not supported by your browser');
            speak('Geolocation is not supported by your browser');
        }
    });
});
