require('dotenv').config({ path: '.env'});
const express = require('express');
const axios = require('axios');
const {XMLParser} = require("fast-xml-parser")
const cors = require('cors')


const app = express();
app.use(cors());
const PORT = 3000;


// Array of datafeed IDs to fetch from (Manchester area datafeeds)
const DATAFEED_IDS = [
    25670,
    25671,
    25669,
    25668
];

const API_KEY = process.env.BODS_API_KEY;


app.get('/', (req, res) => {
    res.json({ message: 'Transport Map API v2' });
});

app.get('/buses', async (req
                         , res) => {
    try {
        const response = await axios.get(BODS_API_URL, {
            params: {api_key: API_KEY}
        })

        const parser = new XMLParser();
        const jsonData = parser.parse(response.data);

        res.json({
            message: 'Bus data fetched successfully',
            fullData: jsonData
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});


app.get('/test-direct', async (req, res) => {
    const testUrl =
        `https://data.bus-data.dft.gov.uk/api/v1/datafeed/20422/?api_key=${API_KEY}`;
    console.log('Testing URL:', testUrl);

    try {
        const response = await axios.get(testUrl);
        res.json({
            success: true,
            statusCode: response.status,
            dataType: typeof response.data,
            preview: response.data.substring(0, 200)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            statusCode: error.response?.status,
            statusText: error.response?.statusText
        });
    }
});

app.get('/buses/parsed', async (req, res) => {
    try {
        const parser = new XMLParser();
        let allBuses = [];

        // Fetch data from all datafeeds in parallel
        const fetchPromises = DATAFEED_IDS.map(async (datafeedId) => {
            try {
                const url = `https://data.bus-data.dft.gov.uk/api/v1/datafeed/${datafeedId}/`;
                const response = await axios.get(url, {
                    params: { api_key: API_KEY }
                });

                const jsonData = parser.parse(response.data);
                const vehicleActivities = jsonData?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery?.VehicleActivity;

                if (vehicleActivities && Array.isArray(vehicleActivities)) {
                    return vehicleActivities.map((activity) => {
                        const journey = activity.MonitoredVehicleJourney;
                        return {
                            id: activity.ItemIdentifier,
                            routeNumber: journey?.PublishedLineName,
                            origin: journey?.OriginName,
                            destination: journey?.DestinationName,
                            longitude: journey?.VehicleLocation?.Longitude,
                            latitude: journey?.VehicleLocation?.Latitude,
                            bearing: journey?.Bearing,
                            vehicleRef: journey?.VehicleRef,
                            recordedAt: activity.RecordedAtTime,
                            datafeedId: datafeedId  // Track which datafeed this came from
                        };
                    });
                }
                return [];
            } catch (error) {
                console.error(`Error fetching datafeed ${datafeedId}:`, error.message);
                return [];  // Continue with other datafeeds even if one fails
            }
        });


        // Wait for all datafeed requests to complete
        const results = await Promise.all(fetchPromises);

        // Flatten the array of arrays into a single array of buses
        allBuses = results.flat();

        // Remove duplicates based on vehicleRef (in case same bus appears in multiple feeds)
        const uniqueBuses = Array.from(
            new Map(allBuses.map(bus => [bus.vehicleRef, bus])).values()
        );

        res.json({
            message: 'Bus data parsed successfully',
            count: uniqueBuses.length,
            datafeeds: DATAFEED_IDS.length,
            buses: uniqueBuses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
