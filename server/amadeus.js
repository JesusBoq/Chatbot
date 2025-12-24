import axios from 'axios';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || '';
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || '';
const AMADEUS_BASE_URL = process.env.AMADEUS_ENV === 'production' 
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

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
    const expiresIn = response.data.expires_in || 1800;
    tokenExpiry = Date.now() + (expiresIn - 60) * 1000;

    return accessToken;
  } catch (error) {
    console.error('Error getting Amadeus access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Amadeus API');
  }
};

export const searchFlights = async (params) => {
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    return null;
  }

  try {
    const token = await getAccessToken();

    const {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults = 1,
      children = 0,
      infants = 0,
      travelClass = 'ECONOMY',
    } = params;

    const searchParams = {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults,
      travelClass,
    };

    if (returnDate) {
      searchParams.returnDate = returnDate;
    }

    if (children > 0) {
      searchParams.children = children;
    }

    if (infants > 0) {
      searchParams.infants = infants;
    }

    const response = await axios.get(
      `${AMADEUS_BASE_URL}/v2/shopping/flight-offers`,
      {
        params: searchParams,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return formatFlightData(response.data);
  } catch (error) {
    console.error('Error searching flights:', error.response?.data || error.message);
    return null;
  }
};

const formatFlightData = (data) => {
  if (!data || !data.data || data.data.length === 0) {
    return null;
  }

  const flights = data.data.slice(0, 5).map((offer, index) => {
    const itineraries = offer.itineraries || [];
    const outbound = itineraries[0];
    const returnFlight = itineraries[1];

    const formatSegment = (segment) => {
      return {
        departure: {
          airport: segment.departure.iataCode,
          time: segment.departure.at,
        },
        arrival: {
          airport: segment.arrival.iataCode,
          time: segment.arrival.at,
        },
        carrier: segment.carrierCode,
        duration: segment.duration,
      };
    };

    const flightInfo = {
      price: {
        total: offer.price.total,
        currency: offer.price.currency,
      },
      outbound: {
        segments: outbound.segments.map(formatSegment),
        duration: outbound.duration,
      },
    };

    if (returnFlight) {
      flightInfo.return = {
        segments: returnFlight.segments.map(formatSegment),
        duration: returnFlight.duration,
      };
    }

    return flightInfo;
  });

  return {
    flights,
    meta: {
      count: data.meta?.count || flights.length,
      currency: data.meta?.currency || 'USD',
    },
  };
};

export const extractFlightQuery = (message) => {
  const lowerMessage = message.toLowerCase();
  
  const flightKeywords = [
    'flight', 'fly', 'ticket', 'booking', 'reservation',
    'from', 'to', 'departure', 'arrival', 'destination',
    'date', 'when', 'price', 'cost'
  ];

  const hasFlightIntent = flightKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (!hasFlightIntent) {
    return null;
  }

  const originMatch = message.match(/(?:from|departure|leaving)\s+([A-Z]{3})/i) ||
                     message.match(/(?:from|departure|leaving)\s+([A-Za-z\s]+?)(?:\s+to|\s+on|$)/i);
  
  const destMatch = message.match(/(?:to|destination|arriving|arrival)\s+([A-Z]{3})/i) ||
                   message.match(/(?:to|destination|arriving|arrival)\s+([A-Za-z\s]+?)(?:\s+on|\s+date|$)/i);
  
  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/) ||
                    message.match(/(?:on|date|departure date)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const returnDateMatch = message.match(/(?:return|coming back|back)\s+(?:on|date)?\s*(\d{4}-\d{2}-\d{2})/i) ||
                          message.match(/(?:return|coming back|back)\s+(?:on|date)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const adultsMatch = message.match(/(\d+)\s*(?:adult|adults|passenger|passengers)/i);
  const childrenMatch = message.match(/(\d+)\s*(?:child|children|kids)/i);

  const params = {};

  if (originMatch) {
    params.originLocationCode = originMatch[1].trim().toUpperCase().substring(0, 3);
  }

  if (destMatch) {
    params.destinationLocationCode = destMatch[1].trim().toUpperCase().substring(0, 3);
  }

  if (dateMatch) {
    let dateStr = dateMatch[1];
    if (dateStr.includes('/') || dateStr.includes('-')) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        params.departureDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      params.departureDate = dateStr;
    }
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    params.departureDate = tomorrow.toISOString().split('T')[0];
  }

  if (returnDateMatch) {
    let dateStr = returnDateMatch[1];
    if (dateStr.includes('/') || dateStr.includes('-')) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        params.returnDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      params.returnDate = dateStr;
    }
  }

  if (adultsMatch) {
    params.adults = parseInt(adultsMatch[1]);
  } else {
    params.adults = 1;
  }

  if (childrenMatch) {
    params.children = parseInt(childrenMatch[1]);
  }

  if (params.originLocationCode && params.destinationLocationCode) {
    return params;
  }

  return null;
};


