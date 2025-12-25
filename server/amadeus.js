import axios from 'axios';

const getAmadeusConfig = () => {
  return {
    apiKey: process.env.AMADEUS_API_KEY || '',
    apiSecret: process.env.AMADEUS_API_SECRET || '',
    baseUrl: process.env.AMADEUS_ENV === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com'
  };
};

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const config = getAmadeusConfig();
  try {
    const response = await axios.post(
      `${config.baseUrl}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.apiKey,
        client_secret: config.apiSecret,
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
  const config = getAmadeusConfig();
  
  if (!config.apiKey || !config.apiSecret) {
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
      `${config.baseUrl}/v2/shopping/flight-offers`,
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

const formatDuration = (isoDuration) => {
  if (!isoDuration || !isoDuration.startsWith('PT')) return isoDuration;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return isoDuration;
};

const formatDateTime = (isoDateTime) => {
  if (!isoDateTime) return 'N/A';
  try {
    const date = new Date(isoDateTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  } catch {
    return isoDateTime;
  }
};

const formatFlightData = (data) => {
  if (!data || !data.data || data.data.length === 0) {
    return null;
  }

  const seenFlights = new Set();
  const flights = data.data
    .filter((offer) => {
      const key = `${offer.itineraries[0]?.segments[0]?.departure?.iataCode}-${offer.itineraries[0]?.segments[offer.itineraries[0]?.segments.length - 1]?.arrival?.iataCode}-${offer.price.total}-${offer.itineraries[0]?.segments[0]?.departure?.at}`;
      if (seenFlights.has(key)) return false;
      seenFlights.add(key);
      return true;
    })
    .slice(0, 5)
    .map((offer, index) => {
    const itineraries = offer.itineraries || [];
    const outbound = itineraries[0];
    const returnFlight = itineraries[1];

    const formatSegment = (segment) => {
      const flightNumber = segment.number ? `${segment.carrierCode}${segment.number}` : null;
      return {
        departure: {
          airport: segment.departure.iataCode,
          time: formatDateTime(segment.departure.at),
          timeRaw: segment.departure.at,
        },
        arrival: {
          airport: segment.arrival.iataCode,
          time: formatDateTime(segment.arrival.at),
          timeRaw: segment.arrival.at,
        },
        carrier: segment.carrierCode,
        flightNumber: flightNumber,
        number: segment.number,
        duration: formatDuration(segment.duration),
        durationRaw: segment.duration,
      };
    };

    const outboundSegments = outbound.segments.map(formatSegment);
    const flightNumbers = outboundSegments
      .map(seg => seg.flightNumber)
      .filter(fn => fn !== null);
    const flightId = flightNumbers.length > 0 
      ? (flightNumbers.length === 1 ? flightNumbers[0] : flightNumbers.join(' + '))
      : `Offer-${offer.id || index + 1}`;

    const flightInfo = {
      id: offer.id || `flight-${index + 1}`,
      flightNumber: flightId,
      price: {
        total: offer.price.total,
        currency: offer.price.currency,
      },
      outbound: {
        segments: outboundSegments,
        duration: formatDuration(outbound.duration),
        durationRaw: outbound.duration,
      },
    };

    if (returnFlight) {
      const returnSegments = returnFlight.segments.map(formatSegment);
      const returnFlightNumbers = returnSegments
        .map(seg => seg.flightNumber)
        .filter(fn => fn !== null);
      const returnFlightId = returnFlightNumbers.length > 0
        ? (returnFlightNumbers.length === 1 ? returnFlightNumbers[0] : returnFlightNumbers.join(' + '))
        : null;

      flightInfo.return = {
        segments: returnSegments,
        flightNumber: returnFlightId,
        duration: formatDuration(returnFlight.duration),
        durationRaw: returnFlight.duration,
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

const CITY_TO_IATA = {
  'nueva york': 'JFK', 'new york': 'JFK', 'nyc': 'JFK', 'manhattan': 'JFK', 'ny': 'JFK',
  'londres': 'LHR', 'london': 'LHR', 'londom': 'LHR', 'londón': 'LHR', 'lon': 'LHR',
  'paris': 'CDG', 'parís': 'CDG',
  'madrid': 'MAD',
  'barcelona': 'BCN',
  'mumbai': 'BOM', 'bombay': 'BOM',
  'delhi': 'DEL', 'nueva delhi': 'DEL', 'new delhi': 'DEL',
  'bangalore': 'BLR', 'bengaluru': 'BLR',
  'chennai': 'MAA', 'madras': 'MAA',
  'kolkata': 'CCU', 'calcuta': 'CCU', 'calcutta': 'CCU',
  'hyderabad': 'HYD',
  'pune': 'PNQ',
  'goa': 'GOI',
  'kochi': 'COK', 'cochin': 'COK',
  'dubai': 'DXB',
  'doha': 'DOH',
  'singapore': 'SIN', 'singapur': 'SIN',
  'tokyo': 'NRT', 'tokio': 'NRT',
  'hong kong': 'HKG',
  'bangkok': 'BKK',
  'egipt': 'CAI', 'egypt': 'CAI', 'cairo': 'CAI', 'el cairo': 'CAI',
};

const cityToIata = (cityName) => {
  const normalized = cityName.toLowerCase().trim();
  return CITY_TO_IATA[normalized] || null;
};

export const extractFlightQuery = (message) => {
  const lowerMessage = message.toLowerCase();
  
  const flightKeywords = [
    'flight', 'flights', 'fly', 'flys', 'flying', 'ticket', 'tickets', 'booking', 'reservation',
    'from', 'to', 'departure', 'arrival', 'destination',
    'date', 'when', 'price', 'cost', 'available'
  ];

  const hasFlightIntent = flightKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (!hasFlightIntent) {
    return null;
  }

  // Primero intentar encontrar códigos IATA de 3 letras
  const iataCodePattern = /\b([A-Z]{3})\b/g;
  const iataCodes = message.match(iataCodePattern);
  
  let originMatch = message.match(/(?:from|departure|leaving)\s+([A-Z]{3})\b/i);
  let destMatch = message.match(/(?:to|destination|arriving|arrival)\s+([A-Z]{3})\b/i);
  
  // Si no encontramos códigos IATA, buscar nombres de ciudades
  if (!originMatch) {
    const patterns = [
      /(?:from|departure|leaving)\s+([A-Za-z\s]{2,}?)\s+(?:to|destination|arriving|arrival)/i,
      /(?:from|departure|leaving)\s+([A-Za-z\s]{2,}?)(?:\s+to|\s+destination|\s+arriving|\s+arrival|\s+right|\s+now|\s+available|$)/i,
      /(?:from|departure|leaving)\s+([A-Za-z]+)/i
    ];
    
    for (const pattern of patterns) {
      const cityMatch = message.match(pattern);
      if (cityMatch) {
        let cityName = cityMatch[1].trim();
        cityName = cityName.replace(/\b(available|right|now|today|tomorrow|what|are|is)\b/gi, '').trim();
        
        if (cityName && cityName.length >= 2) {
          let iataCode = cityToIata(cityName);
          
          if (!iataCode && cityName.includes(' ')) {
            const words = cityName.split(/\s+/);
            if (words.length >= 2) {
              const twoWords = `${words[0]} ${words[1]}`;
              iataCode = cityToIata(twoWords);
            }
            if (!iataCode && words[0].length >= 2) {
              iataCode = cityToIata(words[0]);
            }
          }
          
          if (iataCode) {
            originMatch = [null, iataCode];
            break;
          }
        }
      }
    }
  }
  
  if (!destMatch) {
    const patterns = [
      /(?:to|destination|arriving|arrival)\s+([A-Za-z\s]{2,}?)(?:\s+right|\s+now|\s+on|\s+date|\s+available|$)/i,
      /(?:to|destination|arriving|arrival)\s+([A-Za-z\s]{2,}?)(?:\s+right|\s+now|\s+on|\s+date|\s+available|$)/i,
      /(?:to|destination|arriving|arrival)\s+([A-Za-z]+)/i
    ];
    
    for (const pattern of patterns) {
      const cityMatch = message.match(pattern);
      if (cityMatch) {
        let cityName = cityMatch[1].trim();
        cityName = cityName.replace(/\b(available|right|now|today|tomorrow|what|are|is)\b/gi, '').trim();
        
        if (cityName && cityName.length >= 2) {
          let iataCode = cityToIata(cityName);
          
          if (!iataCode && cityName.includes(' ')) {
            const words = cityName.split(/\s+/);
            if (words.length >= 2) {
              const twoWords = `${words[0]} ${words[1]}`;
              iataCode = cityToIata(twoWords);
            }
            if (!iataCode && words[0].length >= 2) {
              iataCode = cityToIata(words[0]);
            }
          }
          
          if (iataCode) {
            destMatch = [null, iataCode];
            break;
          }
        }
      }
    }
  }

  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/) ||
                    message.match(/(?:on|date|departure date)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const returnDateMatch = message.match(/(?:return|coming back|back)\s+(?:on|date)?\s*(\d{4}-\d{2}-\d{2})/i) ||
                          message.match(/(?:return|coming back|back)\s+(?:on|date)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const adultsMatch = message.match(/(\d+)\s*(?:adult|adults|passenger|passengers)/i);
  const childrenMatch = message.match(/(\d+)\s*(?:child|children|kids)/i);

  const params = {};

  if (originMatch) {
    const originCode = originMatch[1].trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(originCode)) {
      params.originLocationCode = originCode;
    }
  }

  if (destMatch) {
    const destCode = destMatch[1].trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(destCode)) {
      params.destinationLocationCode = destCode;
    }
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


