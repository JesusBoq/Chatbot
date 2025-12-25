import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || '';
const AMADEUS_ENV = process.env.AMADEUS_ENV || 'test';
const AMADEUS_BASE_URL = AMADEUS_ENV === 'production' 
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

let accessToken = null;

const getAccessToken = async () => {
  try {
    const response = await axios.post(
      `${AMADEUS_BASE_URL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
};

const searchFlights = async (origin, destination, date) => {
  try {
    if (!accessToken) {
      await getAccessToken();
    }

    const searchParams = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: date,
      adults: 1,
      travelClass: 'ECONOMY',
    };

    console.log('🔍 Searching flights with params:', searchParams);

    const response = await axios.get(
      `${AMADEUS_BASE_URL}/v2/shopping/flight-offers`,
      {
        params: searchParams,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error searching flights:', error.response?.data || error.message);
    throw error;
  }
};

const main = async () => {
  console.log('🚀 Testing Amadeus API\n');

  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    console.error('❌ Error: AMADEUS_API_KEY and AMADEUS_API_SECRET must be set in .env file');
    process.exit(1);
  }

  console.log('✅ Credentials found');
  console.log(`   API Key: ${AMADEUS_API_KEY.substring(0, 8)}...`);
  console.log(`   Environment: ${AMADEUS_ENV}\n`);

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const departureDate = tomorrow.toISOString().split('T')[0];

    console.log('📡 Making API request...');
    console.log(`   Origin: JFK (New York)`);
    console.log(`   Destination: LHR (London)`);
    console.log(`   Date: ${departureDate}\n`);

    const data = await searchFlights('JFK', 'LHR', departureDate);

    console.log('✅ API Response received\n');
    console.log('='.repeat(70));
    console.log('RAW API RESPONSE STRUCTURE:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(data, null, 2));

    if (data.data && data.data.length > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('FIRST FLIGHT OFFER DETAILS:');
      console.log('='.repeat(70));
      const firstOffer = data.data[0];
      console.log(JSON.stringify(firstOffer, null, 2));

      console.log('\n' + '='.repeat(70));
      console.log('SIMPLIFIED FLIGHT INFO:');
      console.log('='.repeat(70));
      const itinerary = firstOffer.itineraries[0];
      const firstSegment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];

      console.log(`Price: ${firstOffer.price.total} ${firstOffer.price.currency}`);
      console.log(`Route: ${firstSegment.departure.iataCode} → ${lastSegment.arrival.iataCode}`);
      console.log(`Departure: ${firstSegment.departure.at} (${firstSegment.departure.iataCode})`);
      console.log(`Arrival: ${lastSegment.arrival.at} (${lastSegment.arrival.iataCode})`);
      console.log(`Duration: ${itinerary.duration}`);
      console.log(`Segments: ${itinerary.segments.length}`);
      if (itinerary.segments.length > 1) {
        console.log(`   (This is a connecting flight)`);
      }
    } else {
      console.log('\n⚠️  No flights found for this route/date');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

main();

