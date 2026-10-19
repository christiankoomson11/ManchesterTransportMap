
// Initializing the map centred onto Manchester
const map = L.map('map').setView([53.4808, -2.2426], 15);

// Adding the tile layer (the actual map images)
// Using Stadia Maps dark theme (free, no API key required)
L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 20
}).addTo(map);

console.log('Map initialized');

let busMarkers = {};
let activeRoutes = new Set();
let selectedRoute = null;


function updateRouteSideBar(buses) {
    // Update total bus count
    const totalBusCount = document.getElementById('total-bus-count');
    if (totalBusCount) {
        totalBusCount.textContent = buses.length;
    }

    const routes = new Map();
    buses.forEach(bus => {
        if (bus.routeNumber) {
            routes.set(bus.routeNumber, {
                number: bus.routeNumber,
                color: getRouteColor(bus.routeNumber),
                count: (routes.get(bus.routeNumber)?.count || 0) + 1
            });
        }
    });

    const sortedRoutes = Array.from(routes.values()).sort((a, b) =>
        parseInt(a.number) - parseInt(b.number)
    );

    const routeList = document.getElementById('route-list');
    routeList.innerHTML = sortedRoutes.map(route => `
        <div class="route-item" data-route="${route.number}">
            <div class="route-color" style="color: ${route.color};">
                <span class="route-number">${route.number}</span>
            </div>
            <div class="route-info">
                <span class="route-label">Route ${route.number}</span>
                <span class="route-count">${route.count}</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.route-item').forEach(item => {
        item.addEventListener('click', () => {
            const route = item.getAttribute('data-route');
            toggleRouteFilter(route);
        });
    });
}

function toggleRouteFilter(routeNumber) {
    if(selectedRoute === routeNumber) {
        selectedRoute = null;
        showAllBuses();
    } else {
        selectedRoute = routeNumber;
        filterBusesByRoute(routeNumber);
    }
    updateRouteSideBarSelection();
}

function filterBusesByRoute(routeNumber) {
    Object.keys(busMarkers).forEach(vehicleRef => {
        const marker = busMarkers[vehicleRef].marker;
        const markerRoute = marker.getPopup().getContent().match(/Route (\w+)/)?.[1];

        if (markerRoute === routeNumber) {
            marker.setOpacity(1.0);
        } else {
            marker.setOpacity(0.2);
        }
    });
}

function showAllBuses() {
    Object.keys(busMarkers).forEach(vehicleRef => {
        busMarkers[vehicleRef].marker.setOpacity(1.0);
    });
}

function updateRouteSideBarSelection() {
    document.querySelectorAll('.route-item').forEach( item => {
        if (item.getAttribute('data-route') === selectedRoute) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Function to fetch bus data from our backend
async function fetchBuses() {
    try {
        const response = await fetch('http://localhost:3000/buses/parsed');

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return [];
        }

        const data = await response.json();
        console.log(`Fetched ${data.count} buses`);
        return data.buses || [];
    } catch (error) {
        console.error(`Error fetching buses:`, error);
        return [];
    }
}
            function calculateBearing(lat1, lng1, lat2, lng2) {
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const lat1Rad = lat1 * Math.PI / 180;
                const lat2Rad = lat2 * Math.PI / 180;

                const y = Math.sin(dLng) * Math.cos(lat2Rad);
                const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                    Math.sin(lat1Rad) * Math.sin(lat2Rad) * Math.cos(dLng);

                const bearing = Math.atan2(y, x) * 180 / Math.PI;
                return (bearing + 360) % 360;
            }


            function getRouteColor(routeNumber) {
                const colors = [
                    '#FF6B6B', // red
                    '#4ECDC4', // teal
                    '#45B7D1', // blue
                    '#FFA07A', // orange
                    '#98D8C8', // mint
                    '#F7DC6F', // yellow
                    '#BB8FCE', // purple
                    '#85C1E2', // light blue
                    '#F8B739', // gold
                    '#52B788'  // green
                ];
                const index = parseInt(routeNumber) % colors.length;
                return colors[index];
            }

            // Function to update bus markers on the map
            function updateBusMarkers(buses) {
            //Individually track which vehicle we see in each update
                const currentVehicles = new Set();

                buses.forEach(bus => {
                    if (bus.latitude && bus.longitude && bus.vehicleRef) {
                        currentVehicles.add(bus.vehicleRef);

                        // If marker already exists, just update its position
                        if (busMarkers[bus.vehicleRef]) {
                            const oldLat = busMarkers[bus.vehicleRef].lastLat;
                            const oldLng = busMarkers[bus.vehicleRef].lastLng;

                            let bearing = bus.bearing || 0;

                            if (oldLat !== undefined && oldLng !== undefined) {
                                bearing = calculateBearing(oldLat, oldLng, bus.latitude, bus.longitude);
                            }

                                busMarkers[bus.vehicleRef].marker.setLatLng([bus.latitude, bus.longitude]);

                                const icon = busMarkers[bus.vehicleRef].marker.getElement();
                                if (icon) {
                                    const innerDiv = icon.querySelector(`div`);
                                    if (innerDiv) {
                                        innerDiv.style.transform = `rotate(${bearing}deg)`;
                                    }
                                }
                                busMarkers[bus.vehicleRef].lastSeen = Date.now();
                                busMarkers[bus.vehicleRef].lastLat = bus.latitude;
                                busMarkers[bus.vehicleRef].lastLng = bus.longitude;
                        } else {
                            // New bus - creates a new marker
                            const color = getRouteColor(bus.routeNumber);
                            const rotation = bus.bearing || 0;

                            const busIcon = L.divIcon({
                                html: `<div style="background-color: ${color}; width: 100%; height:
                                100%; border-radius: 4px; border: 2px solid white; transform:
                                rotate(${rotation}deg); display: flex; align-items: center;
                                justify-content: center;"><span style="color: white; font-size: 9px;
                                font-weight: bold; transform: rotate(-${rotation}deg);">
                                ${bus.routeNumber}
                                    </span>
                                </div>`,
                                className: 'bus-icon',
                                iconSize: [18, 12]
                            });

                            const marker = L.marker([bus.latitude, bus.longitude], {icon: busIcon}).addTo(map);

                            // Add popup with bus information
                            marker.bindPopup(`
                               <b>Route ${bus.routeNumber}</b><br>
                               From: ${bus.origin}<br>
                               To: ${bus.destination}
                            `);
                            // Store marker by vehicleRef
                            busMarkers[bus.vehicleRef] = {
                                marker: marker,
                                lastSeen: Date.now(),
                                lastLat: bus.latitude,
                                lastLng: bus.longitude
                            };
                        }
                    }
                });

                /*
                const now = Date.now();
                const TIMEOUT = 5000; // 90 seconds
                //Remove markers for the buses that are no longer in the data
                Object.keys(busMarkers).forEach(vehicleRef => {
                    if (!currentVehicles.has(vehicleRef)) {
                        if (now - busMarkers[vehicleRef].lastSeen > TIMEOUT) {
                            map.removeLayer(busMarkers[vehicleRef].marker);
                            delete busMarkers[vehicleRef];
                        }
                    }
                });

                 */
            }

            // This is the function to update bus positions
            async function updateBuses() {
                console.log('Updating bus positions...');
                const buses = await fetchBuses();
                updateBusMarkers(buses);
                updateRouteSideBar(buses);
                console.log('Buses updated on map');
            }

            // The initial load
            updateBuses();

            // Auto refresh every 10 seconds (optimized for multiple datafeeds)
            setInterval(updateBuses, 10000);
            console.log('Auto refresh enabled: updating every 10 seconds');





