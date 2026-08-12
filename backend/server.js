require('dotenv').config({ path: '.env'});
const express = require('express');
const axios = require('axios');
const {XMLParser} = require("fast-xml-parser");


const app = express();
const PORT = 3000;

const BODS_API_URL ='https://data.bus-data.dft.gov.uk/api/v1/datafeed/20422/?api_key=f70ed1da2a3bf075c493c4077c7125a1ae9d7fb6';
const API_KEY = process.env.BOS_API_KEY;


app.get('/', (req, res) => {
    res.json({ message: 'Transport Map API v2' });
});

app.get('/buses', async (req, res) => {
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
        const response = await axios.get(BODS_API_URL, {
            params: {api_key: API_KEY}
        });

        // Convert XML to JSON
        const parser = new XMLParser();
        const jsonData = parser.parse(response.data);

        //Navigate to the array of buses
        const vehicleActivities = jsonData?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery?.VehicleActivity;

        //Check the bus data is actually available
        if (!vehicleActivities || !Array.isArray(vehicleActivities)) {
            return res.status(404).json({
                message: 'No bus data found',
                fullData: jsonData
            })
        }

        //Turning each bus into a simpler object
        const buses = vehicleActivities.map((activity) => {
            // Extracting the MonitoredVehicalJourney
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
                recordedAt: activity.RecordedAtTime
            };
        });

        res.json({
            message: 'Bus data parsed successfully',
            count: buses.length,
            buses: buses
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

    app.listen(PORT, () => {
        console.log('Server is running on https://localhost:&{PORT}');
    });
