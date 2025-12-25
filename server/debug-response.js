import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testQueries = [
  'Show me flights from New York to London',
  'What is the cancellation policy?',
  'What is the Maharaja Club frequent flyer program?',
];

const debug = async () => {
  console.log('🔍 DEBUGGING LLM RESPONSES\n');
  console.log('='.repeat(70));

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"\n`);
    
    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      });

      const answer = response.data.response;
      console.log(`Response (${answer.length} chars):`);
      console.log(answer);
      console.log('\n' + '-'.repeat(70));
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  }
};

debug().then(() => process.exit(0));



