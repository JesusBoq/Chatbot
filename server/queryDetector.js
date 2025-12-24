import { extractFlightQuery } from './amadeus.js';

export const detectQueryType = (message) => {
  const lowerMessage = message.toLowerCase();
  
  const flightKeywords = [
    'flight', 'fly', 'ticket', 'booking', 'reservation',
    'from', 'to', 'departure', 'arrival', 'destination',
    'available flights', 'show flights', 'search flights',
    'price', 'cost', 'cheap', 'cheapest', 'route',
    'schedule', 'departure date', 'return date'
  ];

  const airlineInfoKeywords = [
    'baggage', 'luggage', 'carry-on', 'checked', 'weight', 'kg', 'allowance',
    'check-in', 'checkin', 'online check', 'airport check',
    'cancel', 'cancellation', 'refund', 'change', 'modify', 'policy', 'policies',
    'meal', 'food', 'entertainment',
    'frequent flyer', 'miles', 'lounge', 'vip', 'maharaja club', 'maharaja', 'loyalty program',
    'visa', 'documentation', 'requirements',
    'pet', 'sports equipment', 'wheelchair', 'disability', 'special assistance'
  ];

  const hasFlightIntent = flightKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasAirlineInfoIntent = airlineInfoKeywords.some(keyword => lowerMessage.includes(keyword));
  
  const flightQuery = extractFlightQuery(message);
  const hasSpecificFlightQuery = flightQuery !== null;

  if (hasSpecificFlightQuery || (hasFlightIntent && !hasAirlineInfoIntent)) {
    return {
      type: 'flight_search',
      needsScraping: false,
      needsFlightAPI: true,
      flightQuery: flightQuery,
    };
  }

  if (hasAirlineInfoIntent || (!hasFlightIntent && !hasAirlineInfoIntent)) {
    return {
      type: 'airline_info',
      needsScraping: true,
      needsFlightAPI: false,
      flightQuery: null,
    };
  }

  return {
    type: 'general',
    needsScraping: true,
    needsFlightAPI: false,
    flightQuery: null,
  };
};


