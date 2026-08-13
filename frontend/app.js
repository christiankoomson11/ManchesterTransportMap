
// Initializing the map centred onto Manchester
const map = L.map('map').setView([53.4808, -2.2426], 13);

// Adding the title layer (the actual map images)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 19
}).addTo(map);

console.log('Map initialized');

let busMarkers = {};

// Function to fetch bus data from our backend
async function fetchBuses() {
    try {
        const response = await
            fetch('http://localhost:3000/buses/parsed');
        const data = await response.json();

        console.log(`Fetched ${data.count} buses`);
        return data.buses;
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
                                rotate(${rotation}deg);"></div>`,
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
            console.log('Buses updated on map');
            }

            // The initial load
            updateBuses();

            //Auto refresh every 3 seconds (IF REFRESH FREEZES REMEMBER TO CHECK THESE LINES CK)
            //Ask Samir and Ben how to optimize bus updates my current solution and Claude solution is slow
            setInterval(updateBuses, 1900);
            console.log('Auto refresh enabled: updating every 30 seconds');





