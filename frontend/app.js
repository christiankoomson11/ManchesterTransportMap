
// Initializing the map centred onto Manchester
const map = L.map('map').setView([53.4808, -2.2426], 13);

// Adding the title layer (the actual map images)
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

console.log('Map initialized');

let busMarkers = []

// Function to fetch bus data from our backend
async function fetchBuses() {
    try {
        const response = await
            fetch('http://localhost:3000/buses/parsed');
                const data = await response.json();

                console.log('Fetched ${data.count} buses');
            return data.buses;
            } catch (error) {
            console.error('Error fetching buses:', error);
            return [];
            }
        }

        //Function to add bus markers to the map
    function addBusMarkers(buses) {
        buses.forEach(bus=> {
            //Only add a marker if the bus has valid coordinates
            if (bus.latitude && bus.longitude) {
                const marker = L.marker([bus.latitude,
                    bus.longitude]).addTo(map);


            //Add popup with bus info
            marker.bindPopup(` <b>Route 
                  ${bus.routeNumber}</b><br>
                  From: ${bus.origin}<br>
                  To: ${bus.destination}
            `);
            busMarkers.push(marker);
            }
        });
    }

    // This is the function to update bus positions
    async function updateBuses() {
        console.log('Updating bus positions...');
        clearBusMarkers();
        const buses = await fetchBuses();
        addBusMarkers(buses);
        console.log('Buses updated on map');
    }

    // The initial load
    updateBuses();

    //Auto refresh every 30 seconds (IF REFRESH FREEZES REMEMBER TO CHECK THESE LINES CK)
    //Ask Samir and Ben how to optimize bus updates my current solution and claude solution is slow
    setInterval(updateBuses, 3000);
    console.log('Auto refresh enabled: updating every 30 seconds');



    // A function to clear all existing bus markers from the map
function clearBusMarkers() {
    busMarkers.forEach(marker => {
        map.removeLayer(marker);
    })
    busMarkers = [];
}

