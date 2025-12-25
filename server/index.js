import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { scrapeAirlineInfo } from './scraper.js';
import { searchFlights } from './amadeus.js';
import { detectQueryType } from './queryDetector.js';
import { detectLanguage, getLanguageInstructions } from './languageDetector.js';

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY is not set!');
  console.error('Please create a .env file in the server/ directory with:');
  console.error('OPENAI_API_KEY=your_api_key_here');
  process.exit(1);
}

if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
  console.warn('⚠️  Amadeus API credentials not configured. Flight search will not work.');
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let preloadedScrapedData = null;

const preloadScrapedData = async () => {
  try {
    preloadedScrapedData = await scrapeAirlineInfo();
  } catch (error) {
    console.error('Error preloading scraped data:', error);
  }
};

preloadScrapedData();

setInterval(() => {
  if (!preloadedScrapedData) {
    preloadScrapedData();
  }
}, 60000);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const queryType = detectQueryType(lastUserMessage);
    const detectedLanguage = detectLanguage(lastUserMessage);
    const languageInfo = getLanguageInstructions(detectedLanguage);
    
    let scrapedData = null;
    if (queryType.needsScraping) {
      if (preloadedScrapedData) {
        scrapedData = preloadedScrapedData;
      } else {
        try {
          scrapedData = await scrapeAirlineInfo();
          if (scrapedData) {
            preloadedScrapedData = scrapedData;
          }
        } catch (error) {
          console.error('Error during scraping:', error);
        }
      }
    }

    let flightData = null;
    if (queryType.needsFlightAPI && queryType.flightQuery) {
      try {
        flightData = await searchFlights(queryType.flightQuery);
      } catch (error) {
        console.error('Error searching flights:', error);
      }
    }

    const systemPrompt = buildSystemPrompt(scrapedData, flightData, queryType, languageInfo);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ response });
  } catch (error) {
    console.error('Error getting response from OpenAI:', error);
    
    let errorMessage = 'Error communicating with OpenAI API. Please try again later.';
    
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      errorMessage = 'Rate limit exceeded. You have exceeded your OpenAI API quota. Please check your billing and plan details at https://platform.openai.com/account/billing';
    } else if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Invalid')) {
      errorMessage = 'Invalid API key. Please check your API key in the .env file.';
    } else if (error?.status === 500 || error?.message?.includes('500')) {
      errorMessage = 'OpenAI service is temporarily unavailable. Please try again later.';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    res.status(error?.status || 500).json({ error: errorMessage });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/scrape', async (req, res) => {
  try {
    const data = await scrapeAirlineInfo();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const { question, ground_truth, expectedKeywords } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const startTime = Date.now();
    const queryType = detectQueryType(question);
    const detectedLanguage = detectLanguage(question);
    const languageInfo = getLanguageInstructions(detectedLanguage);
    
    let scrapedData = null;
    if (queryType.needsScraping) {
      if (preloadedScrapedData) {
        scrapedData = preloadedScrapedData;
      } else {
        try {
          scrapedData = await scrapeAirlineInfo();
          if (scrapedData) {
            preloadedScrapedData = scrapedData;
          }
        } catch (error) {
          console.error('Error during scraping:', error);
        }
      }
    }

    let flightData = null;
    if (queryType.needsFlightAPI && queryType.flightQuery) {
      try {
        flightData = await searchFlights(queryType.flightQuery);
      } catch (error) {
        console.error('Error searching flights:', error);
      }
    }

    const systemPrompt = buildSystemPrompt(scrapedData, flightData, queryType, languageInfo);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    const calculateAccuracy = (predicted, groundTruth, keywords = []) => {
      const predictedLower = predicted.toLowerCase();
      const groundTruthLower = groundTruth?.toLowerCase() || '';
      
      const predictedWords = new Set(predictedLower.split(/\s+/));
      const groundTruthWords = new Set(groundTruthLower.split(/\s+/));
      
      const intersection = new Set([...predictedWords].filter(x => groundTruthWords.has(x)));
      const union = new Set([...predictedWords, ...groundTruthWords]);
      
      const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;
      
      let keywordScore = 0;
      if (keywords.length > 0) {
        const foundKeywords = keywords.filter(keyword => 
          predictedLower.includes(keyword.toLowerCase())
        ).length;
        keywordScore = foundKeywords / keywords.length;
      }
      
      return (jaccardSimilarity * 0.5 + keywordScore * 0.5) * 100;
    };

    const calculateRelevance = (question, answer, keywords = []) => {
      const questionLower = question.toLowerCase();
      const answerLower = answer.toLowerCase();
      
      const questionWords = new Set(questionLower.split(/\s+/));
      const answerWords = new Set(answerLower.split(/\s+/));
      
      const questionAnswerOverlap = new Set([...questionWords].filter(x => answerWords.has(x)));
      const questionRelevance = questionWords.size > 0 ? questionAnswerOverlap.size / questionWords.size : 0;
      
      let keywordRelevance = 0;
      if (keywords.length > 0) {
        const foundKeywords = keywords.filter(keyword => 
          answerLower.includes(keyword.toLowerCase())
        ).length;
        keywordRelevance = foundKeywords / keywords.length;
      }
      
      const answerLengthScore = Math.min(answer.length / 200, 1);
      
      return (questionRelevance * 0.4 + keywordRelevance * 0.4 + answerLengthScore * 0.2) * 100;
    };

    const metrics = {
      latency: responseTime,
      responseLength: response.length,
      usedScraping: queryType.needsScraping,
      usedFlightAPI: queryType.needsFlightAPI,
      hasFlightData: flightData !== null,
      hasScrapedData: scrapedData !== null,
    };

    if (ground_truth) {
      metrics.accuracy = calculateAccuracy(response, ground_truth, expectedKeywords || []);
      metrics.relevance = calculateRelevance(question, response, expectedKeywords || []);
    }

    res.json({
      success: true,
      question,
      queryType: queryType.type,
      response,
      metrics,
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/benchmark', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    const queryType = detectQueryType(query);
    
    let scrapedData = null;
    if (queryType.needsScraping) {
      if (preloadedScrapedData) {
        scrapedData = preloadedScrapedData;
      } else {
        try {
          scrapedData = await scrapeAirlineInfo();
          if (scrapedData) {
            preloadedScrapedData = scrapedData;
          }
        } catch (error) {
          console.error('Error during scraping:', error);
        }
      }
    }

    let flightData = null;
    if (queryType.needsFlightAPI && queryType.flightQuery) {
      try {
        flightData = await searchFlights(queryType.flightQuery);
      } catch (error) {
        console.error('Error searching flights:', error);
      }
    }

    const systemPrompt = buildSystemPrompt(scrapedData, flightData, queryType, languageInfo);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({
      success: true,
      query,
      queryType: queryType.type,
      response,
      metrics: {
        responseTime,
        responseLength: response.length,
        usedScraping: queryType.needsScraping,
        usedFlightAPI: queryType.needsFlightAPI,
        hasFlightData: flightData !== null,
        hasScrapedData: scrapedData !== null,
      },
    });
  } catch (error) {
    console.error('Benchmark error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test-key', async (req, res) => {
  try {
    const testCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say "API key is working" if you can read this.',
        },
      ],
      max_tokens: 20,
    });

    const response = testCompletion.choices[0]?.message?.content || '';
    res.json({ 
      success: true, 
      message: 'API key is valid and working!',
      testResponse: response 
    });
  } catch (error) {
    console.error('API key test failed:', error);
    
    let errorMessage = 'API key test failed';
    let statusCode = 500;
    
    if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Invalid')) {
      errorMessage = 'Invalid API key. Please check your API key.';
      statusCode = 401;
    } else if (error?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

const buildSystemPrompt = (scrapedData, flightData, queryType, languageInfo) => {
  let prompt = '';
  
  if (flightData && flightData.flights && flightData.flights.length > 0) {
    prompt = `You are Air India's virtual assistant. The user is asking about FLIGHTS.\n\n`;
    prompt += `CRITICAL LANGUAGE RULE: ${languageInfo.instruction}\n`;
    prompt += `You MUST respond in ${languageInfo.responseLanguage}.\n\n`;
    prompt += `ABSOLUTE REQUIREMENT: You have REAL flight data below from the Amadeus API. YOU MUST LIST THESE FLIGHTS.\n\n`;
    prompt += `FORBIDDEN - NEVER SAY:\n`;
    prompt += `- "visit the website" or "check the official website"\n`;
    prompt += `- "contact customer service"\n`;
    prompt += `- "I can help you find flights" (without listing them)\n`;
    prompt += `- Any generic response without showing the actual flights\n\n`;
    prompt += `REQUIRED FORMAT - Start your response EXACTLY like this:\n`;
    prompt += `"Here are the available flights from [ORIGIN] to [DESTINATION]:"\n\n`;
    prompt += `Then list EVERY flight from the data below in this format:\n`;
    prompt += `[FLIGHT_NUMBER/ID]:\n`;
    prompt += `- Route: [DEPARTURE_CODE] to [ARRIVAL_CODE]\n`;
    prompt += `- Price: [AMOUNT] [CURRENCY]\n`;
    prompt += `- Departure: [DEPARTURE_TIME]\n`;
    prompt += `- Arrival: [ARRIVAL_TIME]\n`;
    prompt += `- Duration: [DURATION]\n\n`;
  } else {
    prompt = `You are Air India's virtual assistant (Maharaja Assistant). Your ONLY job is to extract and present information from the official Air India website data provided below.\n\n`;
    prompt += `CRITICAL LANGUAGE RULE:\n${languageInfo.instruction}\n`;
    prompt += `You MUST respond in ${languageInfo.responseLanguage}. Do NOT mix languages.\n\n`;
    prompt += `CRITICAL RULES - YOU MUST FOLLOW THESE:\n`;
    prompt += `1. The data below is the ONLY source of truth - use it EXCLUSIVELY\n`;
    prompt += `2. When answering, copy the structure and key phrases from the data below\n`;
    prompt += `3. Include ALL specific details from the data: numbers, weights, times, procedures, limits\n`;
    prompt += `4. Use the SAME terminology found in the data below\n`;
    prompt += `5. If the question asks about baggage, use ONLY the baggage section below\n`;
    prompt += `6. If the question asks about check-in, use ONLY the check-in section below\n`;
    prompt += `7. If the question asks about policies, use ONLY the policies section below\n`;
    prompt += `8. If the question asks about Maharaja Club, frequent flyer, miles, or loyalty program, use ONLY the Maharaja Club section below\n\n`;
    prompt += `QUERY TYPE: ${queryType.type}\n`;
    prompt += `RESPONSE LANGUAGE: ${languageInfo.responseLanguage}\n\n`;
  }

  if (flightData && flightData.flights && flightData.flights.length > 0) {
    prompt = `You are Air India's virtual assistant. The user is asking about FLIGHTS.\n\n`;
    prompt += `CRITICAL: You have REAL flight data from the Amadeus API below. YOU MUST USE IT.\n\n`;
    prompt += `FORBIDDEN - NEVER SAY:\n`;
    prompt += `- "visit the website" or "check the official website"\n`;
    prompt += `- "contact customer service"\n`;
    prompt += `- "I can help you find flights" (without listing them)\n`;
    prompt += `- Any response that doesn't show the actual flights from the data below\n\n`;
    prompt += `REQUIRED RESPONSE FORMAT:\n`;
    prompt += `Start with: "Here are the available flights from [ORIGIN] to [DESTINATION]:"\n`;
    prompt += `Then list EVERY flight from the data below in this exact format:\n\n`;
    prompt += `[FLIGHT_NUMBER/ID]:\n`;
    prompt += `- Route: [DEPARTURE_CODE] to [ARRIVAL_CODE]\n`;
    prompt += `- Price: [AMOUNT] [CURRENCY]\n`;
    prompt += `- Departure: [DEPARTURE_TIME]\n`;
    prompt += `- Arrival: [ARRIVAL_TIME]\n`;
    prompt += `- Duration: [DURATION]\n\n`;
    prompt += `Repeat for ALL flights in the data below.\n\n`;
    prompt += `=== REAL-TIME FLIGHT DATA (from Amadeus API) ===\n`;
    
    flightData.flights.forEach((flight, index) => {
      const flightIdentifier = flight.flightNumber || flight.id || `Flight ${index + 1}`;
      prompt += `FLIGHT: ${flightIdentifier}\n`;
      prompt += `Price: ${flight.price.total} ${flight.price.currency}\n`;
      
      if (flight.outbound) {
        const firstSegment = flight.outbound.segments[0];
        const lastSegment = flight.outbound.segments[flight.outbound.segments.length - 1];
        prompt += `Route: ${firstSegment.departure.airport} to ${lastSegment.arrival.airport}\n`;
        if (flight.outbound.segments.length > 1) {
          const allFlights = flight.outbound.segments
            .map(seg => seg.flightNumber || `${seg.carrier}${seg.number || ''}`)
            .filter(fn => fn)
            .join(' + ');
          if (allFlights) {
            prompt += `Flight Numbers: ${allFlights}\n`;
          }
        } else if (firstSegment.flightNumber) {
          prompt += `Flight Number: ${firstSegment.flightNumber}\n`;
        }
        prompt += `Departure: ${firstSegment.departure.time}\n`;
        prompt += `Arrival: ${lastSegment.arrival.time}\n`;
        prompt += `Duration: ${flight.outbound.duration}\n`;
      }
      
      if (flight.return) {
        const firstSegment = flight.return.segments[0];
        const lastSegment = flight.return.segments[flight.return.segments.length - 1];
        prompt += `Return Route: ${firstSegment.departure.airport} to ${lastSegment.arrival.airport}\n`;
        if (flight.return.flightNumber) {
          prompt += `Return Flight Number: ${flight.return.flightNumber}\n`;
        }
        prompt += `Return Departure: ${firstSegment.departure.time}\n`;
        prompt += `Return Arrival: ${lastSegment.arrival.time}\n`;
        prompt += `Return Duration: ${flight.return.duration}\n`;
      }
      
      prompt += `\n`;
    });
    
    prompt += `=== END OF FLIGHT DATA ===\n\n`;
    prompt += `FINAL INSTRUCTION: Your response MUST start with "Here are the available flights from [ORIGIN] to [DESTINATION]:" and then list ALL flights above.\n`;
    prompt += `Use the flight number/ID from the data as the header for each flight.\n`;
    prompt += `If you say anything about "visiting the website" or give a generic response, you are WRONG.\n\n`;
  } else if (queryType.needsFlightAPI && queryType.flightQuery) {
    prompt += `\n\n=== FLIGHT SEARCH ATTEMPTED BUT NO DATA AVAILABLE ===\n`;
    prompt += `The user asked about flights from ${queryType.flightQuery.originLocationCode || 'origin'} to ${queryType.flightQuery.destinationLocationCode || 'destination'}, but no flight data was returned from the API.\n\n`;
    prompt += `You should:\n`;
    prompt += `1. Apologize that you couldn't find flights for that specific route/date\n`;
    prompt += `2. Explain that this could be due to:\n`;
    prompt += `   - No flights available for the requested route/date\n`;
    prompt += `   - The route might need specific airport codes (e.g., "Spain" needs a specific city like "Madrid" or "Barcelona")\n`;
    prompt += `3. Suggest trying:\n`;
    prompt += `   - A different date\n`;
    prompt += `   - A specific city instead of a country (e.g., "Madrid" instead of "Spain")\n`;
    prompt += `   - Verifying the departure and arrival cities\n\n`;
  }

  if (scrapedData) {
    prompt += `\n\n=== OFFICIAL AIR INDIA WEBSITE DATA ===\n`;
    prompt += `THIS DATA IS YOUR ONLY SOURCE. Extract information directly from it.\n\n`;
    
    if (scrapedData.baggage) {
      prompt += `BAGGAGE INFORMATION (use this for baggage-related questions):\n${scrapedData.baggage}\n\n`;
    }
    
    if (scrapedData.checkIn) {
      prompt += `CHECK-IN INFORMATION (use this for check-in questions):\n${scrapedData.checkIn}\n\n`;
    }
    
    if (scrapedData.booking) {
      prompt += `BOOKING INFORMATION (use this for booking, reservation questions):\n${scrapedData.booking}\n\n`;
    }
    
    if (scrapedData.policies) {
      prompt += `POLICIES INFORMATION (use this for cancellation, refund, change questions):\n${scrapedData.policies}\n\n`;
    }
    
    if (scrapedData.maharajaClub) {
      prompt += `MAHARAJA CLUB INFORMATION (use this for frequent flyer program, miles, loyalty questions):\n${scrapedData.maharajaClub}\n\n`;
    }
    
    prompt += `=== END OF DATA ===\n\n`;
    
    prompt += `INSTRUCTIONS:
1. Read the user's question and identify which section above is relevant
2. Copy the relevant information from that section
3. Present it in a clear, organized way
4. Keep ALL numbers, weights, times, procedures, and specific details
5. Use the same words and phrases from the data above

DO NOT:
- Add information not in the data above
- Use generic knowledge
- Skip specific details from the data
- Change the terminology used in the data`;
  } else {
    prompt += `\n\nNOTE: Official Air India website data is not available. Provide general information but recommend users verify details on the official website.\n\n`;
  }
  
  return prompt;
};

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Production mode: Serving static files from dist/`);
  }
});

