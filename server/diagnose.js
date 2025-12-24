import axios from 'axios';
import { scrapeAirlineInfo } from './scraper.js';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testCases = [
  {
    question: 'What is the baggage allowance for Air India?',
    ground_truth: 'Air India allows passengers to carry both checked and carry-on baggage. The specific weight limits depend on the class of travel and route.',
    expectedKeywords: ['baggage', 'allowance', 'weight', 'carry-on', 'checked'],
  },
];

const diagnose = async () => {
  console.log('🔍 DIAGNOSTIC ANALYSIS\n');
  console.log('='.repeat(70));

  console.log('\n1️⃣ CHECKING SCRAPED DATA...\n');
  try {
    const scrapedData = await scrapeAirlineInfo();
    
    if (!scrapedData) {
      console.log('❌ No scraped data available');
      return;
    }

    console.log('✅ Scraped data available');
    console.log('Keys:', Object.keys(scrapedData).filter(k => k !== 'timestamp'));
    
    if (scrapedData.baggage) {
      console.log(`\n📦 BAGGAGE DATA (${scrapedData.baggage.length} chars):`);
      console.log('First 500 chars:', scrapedData.baggage.substring(0, 500));
      console.log('\nKeywords found:');
      const keywords = ['baggage', 'allowance', 'weight', 'kg', 'carry-on', 'checked', 'luggage'];
      keywords.forEach(keyword => {
        if (scrapedData.baggage.toLowerCase().includes(keyword)) {
          console.log(`  ✅ "${keyword}" found`);
        } else {
          console.log(`  ❌ "${keyword}" NOT found`);
        }
      });
    } else {
      console.log('❌ No baggage data scraped');
    }

    if (scrapedData.checkIn) {
      console.log(`\n✈️ CHECK-IN DATA (${scrapedData.checkIn.length} chars):`);
      console.log('First 500 chars:', scrapedData.checkIn.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Error getting scraped data:', error.message);
  }

  console.log('\n\n2️⃣ TESTING LLM RESPONSE...\n');
  
  for (const testCase of testCases) {
    console.log(`Question: "${testCase.question}"`);
    console.log('Expected keywords:', testCase.expectedKeywords);
    
    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        messages: [
          {
            role: 'user',
            content: testCase.question,
          },
        ],
      });

      const answer = response.data.response;
      console.log(`\n📝 LLM Response (${answer.length} chars):`);
      console.log(answer);
      
      console.log('\n🔍 Keyword Analysis:');
      testCase.expectedKeywords.forEach(keyword => {
        if (answer.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`  ✅ "${keyword}" found in response`);
        } else {
          console.log(`  ❌ "${keyword}" NOT found in response`);
        }
      });

      console.log('\n📊 Ground Truth vs Response:');
      console.log('Ground Truth:', testCase.ground_truth);
      console.log('Response:', answer.substring(0, 200) + '...');
      
      const groundTruthWords = new Set(testCase.ground_truth.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const responseWords = new Set(answer.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const commonWords = new Set([...groundTruthWords].filter(x => responseWords.has(x)));
      
      console.log(`\nCommon words: ${commonWords.size} / ${groundTruthWords.size}`);
      console.log('Common words:', Array.from(commonWords).slice(0, 10));

    } catch (error) {
      console.error('❌ Error getting LLM response:', error.response?.data || error.message);
    }
  }

  console.log('\n\n3️⃣ TESTING SYSTEM PROMPT...\n');
  
  try {
    const response = await axios.post(`${API_URL}/api/benchmark`, {
      query: 'What is the baggage allowance?',
    });

    console.log('Query Type:', response.data.queryType);
    console.log('Used Scraping:', response.data.metrics.usedScraping);
    console.log('Has Scraped Data:', response.data.metrics.hasScrapedData);
    console.log('Response Time:', response.data.metrics.responseTime, 'ms');
    
  } catch (error) {
    console.error('❌ Error testing system prompt:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ DIAGNOSTIC COMPLETE');
};

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('diagnose.js')) {
  diagnose().then(() => process.exit(0));
}

export { diagnose };

