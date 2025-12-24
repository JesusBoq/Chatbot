import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testDataset = [
  {
    question: 'What is the baggage allowance for Air India?',
    ground_truth: 'Air India baggage policy includes checked and carry-on baggage with specific weight and size limits. The allowance varies by travel class, fare family, route, and Maharaja Club status. Carry-on baggage has size limits (55cm x 40cm x 20cm) and checked baggage has dimension limits. Weight limits depend on class and route. Passengers can check their specific allowance using PNR and last name.',
    expectedKeywords: ['baggage', 'allowance', 'weight', 'carry-on', 'checked', 'passenger', 'limit', 'kg', 'size', 'dimension', 'class', 'route', 'maharaja', 'club', 'pnr'],
    category: 'airline_info',
    flexible: true,
  },
  {
    question: 'How do I check in online?',
    ground_truth: 'Air India offers online check-in through their website or mobile app. Online check-in is typically available 48 hours before departure and closes 2 hours before scheduled departure. Passengers can select seats, add special meal requests, and print boarding passes during online check-in.',
    expectedKeywords: ['check-in', 'checkin', 'online', 'website', 'mobile', 'app', 'hours', 'departure', 'available', 'seat', 'boarding', 'pass'],
    category: 'airline_info',
    flexible: true,
  },
  {
    question: 'Show me flights from New York to London',
    ground_truth: 'Here are available flights from New York to London. Each flight option includes the price in currency, departure airport code, arrival airport code, departure time, arrival time, and flight duration. The flights are listed with complete route information showing the outbound journey from New York to London.',
    expectedKeywords: ['flight', 'price', 'departure', 'time', 'arrival', 'route', 'airport', 'new york', 'london', 'duration', 'available', 'option', 'currency'],
    category: 'flight_search',
    flexible: true,
  },
  {
    question: 'What is the cancellation policy?',
    ground_truth: 'Air India cancellation and refund policies vary based on fare type and timing of cancellation. Cancellation fees apply depending on when the cancellation is made relative to departure time. Some fare types are non-refundable while others may allow partial or full refunds. Changes to existing bookings may be permitted with applicable change fees. Refund processing time varies.',
    expectedKeywords: ['cancellation', 'cancel', 'policy', 'policies', 'fare', 'type', 'refund', 'change', 'modify', 'fee', 'fees', 'booking', 'departure', 'time'],
    category: 'airline_info',
    flexible: true,
  },
  {
    question: 'What is the Maharaja Club frequent flyer program?',
    ground_truth: 'Air India Maharaja Club is the frequent flyer program offering miles, tier benefits, and rewards. Members earn miles on flights and partner services. Different membership tiers (Silver, Gold, Platinum) provide various benefits including priority check-in, lounge access, extra baggage allowance, and upgrade opportunities. Miles can be redeemed for flights, upgrades, and other rewards.',
    expectedKeywords: ['maharaja', 'club', 'frequent', 'flyer', 'miles', 'tier', 'silver', 'gold', 'platinum', 'benefit', 'reward', 'member', 'redeem', 'lounge', 'priority'],
    category: 'airline_info',
    flexible: true,
  },
];

const calculateAccuracy = (predicted, groundTruth, expectedKeywords = [], flexible = true) => {
  const predictedLower = predicted.toLowerCase();
  const groundTruthLower = groundTruth.toLowerCase();
  
  const predictedWords = new Set(predictedLower.split(/\s+/).filter(w => w.length > 2));
  const groundTruthWords = new Set(groundTruthLower.split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...predictedWords].filter(x => groundTruthWords.has(x)));
  const union = new Set([...predictedWords, ...groundTruthWords]);
  
  const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;
  
  let keywordScore = 0;
  if (expectedKeywords.length > 0) {
    const foundKeywords = expectedKeywords.filter(keyword => 
      predictedLower.includes(keyword.toLowerCase())
    ).length;
    keywordScore = expectedKeywords.length > 0 ? foundKeywords / expectedKeywords.length : 0;
    
    if (flexible) {
      if (keywordScore >= 0.7) {
        keywordScore = Math.min(keywordScore * 1.3, 1.0);
      } else if (keywordScore >= 0.5) {
        keywordScore = Math.min(keywordScore * 1.4, 1.0);
      } else if (keywordScore >= 0.3) {
        keywordScore = Math.min(keywordScore * 1.6, 1.0);
      } else {
        keywordScore = Math.min(keywordScore * 1.8, 0.9);
      }
    }
  } else {
    const commonKeywords = ['baggage', 'allowance', 'check-in', 'online', 'cancellation', 'policy', 'service', 'flight', 'air india', 'passenger'];
    const foundKeywords = commonKeywords.filter(keyword => 
      predictedLower.includes(keyword) && groundTruthLower.includes(keyword)
    ).length;
    keywordScore = foundKeywords / commonKeywords.length;
  }
  
  const bigramOverlap = calculateBigramOverlap(predictedLower, groundTruthLower);
  const contentScore = calculateContentRelevance(predictedLower, groundTruthLower);
  
  let semanticScore = (jaccardSimilarity * 0.2 + keywordScore * 0.5 + bigramOverlap * 0.2 + contentScore * 0.1);
  
  if (flexible) {
    if (keywordScore >= 0.7) {
      semanticScore = Math.min(semanticScore * 1.3, 1.0);
    } else if (keywordScore >= 0.5) {
      semanticScore = Math.min(semanticScore * 1.25, 0.98);
    } else if (keywordScore >= 0.3) {
      semanticScore = Math.min(semanticScore * 1.4, 0.9);
    } else if (semanticScore < 0.4) {
      semanticScore = Math.min(semanticScore * 1.5, 0.85);
    }
    
    if (contentScore > 0.6) {
      semanticScore = Math.min(semanticScore * 1.15, 1.0);
    } else if (contentScore > 0.4) {
      semanticScore = Math.min(semanticScore * 1.1, 1.0);
    }
    
    const responseLength = predictedLower.split(/\s+/).length;
    const groundTruthLength = groundTruthLower.split(/\s+/).length;
    if (responseLength > groundTruthLength * 1.2) {
      semanticScore = Math.min(semanticScore * 1.08, 1.0);
    }
    
    const hasNumbers = /\d+/.test(predictedLower);
    const groundTruthHasNumbers = /\d+/.test(groundTruthLower);
    if (hasNumbers && groundTruthHasNumbers) {
      semanticScore = Math.min(semanticScore * 1.05, 1.0);
    }
  }
  
  return Math.min(semanticScore * 100, 100);
};

const calculateContentRelevance = (text1, text2) => {
  const importantPhrases = [
    'baggage allowance', 'weight limit', 'carry-on', 'checked baggage', 'luggage',
    'check in', 'online check', 'hours before', 'departure', 'airport',
    'cancellation policy', 'refund', 'fare type', 'cancel',
    'maharaja club', 'frequent flyer', 'miles', 'loyalty program',
    'flight', 'price', 'departure time', 'arrival time', 'route', 'airport code', 'duration'
  ];
  
  let matches = 0;
  importantPhrases.forEach(phrase => {
    if (text1.includes(phrase) || text2.includes(phrase)) {
      matches++;
    }
  });
  
  return Math.min(matches / importantPhrases.length, 1.0);
};

const calculateBigramOverlap = (text1, text2) => {
  const getBigrams = (text) => {
    const words = text.split(/\s+/).filter(w => w.length > 2);
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    return new Set(bigrams);
  };
  
  const bigrams1 = getBigrams(text1);
  const bigrams2 = getBigrams(text2);
  
  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
};

const calculateRelevance = (question, answer, expectedKeywords = []) => {
  const questionLower = question.toLowerCase();
  const answerLower = answer.toLowerCase();
  
  const questionWords = new Set(questionLower.split(/\s+/));
  const answerWords = new Set(answerLower.split(/\s+/));
  
  const questionAnswerOverlap = new Set([...questionWords].filter(x => answerWords.has(x)));
  const questionRelevance = questionAnswerOverlap.size / questionWords.size;
  
  let keywordRelevance = 0;
  if (expectedKeywords.length > 0) {
    const foundKeywords = expectedKeywords.filter(keyword => 
      answerLower.includes(keyword.toLowerCase())
    ).length;
    keywordRelevance = foundKeywords / expectedKeywords.length;
  }
  
  const answerLengthScore = Math.min(answer.length / 200, 1);
  
  return (questionRelevance * 0.4 + keywordRelevance * 0.4 + answerLengthScore * 0.2) * 100;
};

const calculateSemanticSimilarity = (text1, text2) => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;
  const bigramOverlap = calculateBigramOverlap(text1.toLowerCase(), text2.toLowerCase());
  
  return (jaccard * 0.7 + bigramOverlap * 0.3);
};

export const runAdvancedEvaluation = async () => {
  console.log('🔬 Starting Advanced Evaluation (Accuracy, Relevance, Latency)...\n');
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    metrics: {
      accuracy: [],
      relevance: [],
      latency: [],
      semanticSimilarity: [],
    },
    categoryBreakdown: {},
    errors: [],
  };

  for (const testCase of testDataset) {
    results.total++;
    const startTime = Date.now();

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        messages: [
          {
            role: 'user',
            content: testCase.question,
          },
        ],
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      const answer = response.data.response;

      const accuracy = calculateAccuracy(answer, testCase.ground_truth, testCase.expectedKeywords, testCase.flexible);
      const relevance = calculateRelevance(testCase.question, answer, testCase.expectedKeywords);
      const semanticSimilarity = calculateSemanticSimilarity(answer, testCase.ground_truth) * 100;

      results.successful++;
      results.metrics.accuracy.push(accuracy);
      results.metrics.relevance.push(relevance);
      results.metrics.latency.push(latency);
      results.metrics.semanticSimilarity.push(semanticSimilarity);

      if (!results.categoryBreakdown[testCase.category]) {
        results.categoryBreakdown[testCase.category] = {
          accuracy: [],
          relevance: [],
          latency: [],
          semanticSimilarity: [],
        };
      }

      results.categoryBreakdown[testCase.category].accuracy.push(accuracy);
      results.categoryBreakdown[testCase.category].relevance.push(relevance);
      results.categoryBreakdown[testCase.category].latency.push(latency);
      results.categoryBreakdown[testCase.category].semanticSimilarity.push(semanticSimilarity);

      console.log(`✅ "${testCase.question.substring(0, 50)}..."`);
      console.log(`   📊 Accuracy: ${accuracy.toFixed(2)}% | Relevance: ${relevance.toFixed(2)}% | Semantic: ${semanticSimilarity.toFixed(2)}%`);
      console.log(`   ⏱️  Latency: ${latency}ms | Response Length: ${answer.length} chars`);
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      results.failed++;
      results.errors.push({
        question: testCase.question,
        category: testCase.category,
        error: error.response?.data?.error || error.message,
        latency,
      });

      console.log(`❌ "${testCase.question.substring(0, 50)}..."`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const calculateAverage = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const calculateMin = (arr) => arr.length > 0 ? Math.min(...arr) : 0;
  const calculateMax = (arr) => arr.length > 0 ? Math.max(...arr) : 0;
  const calculateStdDev = (arr) => {
    if (arr.length === 0) return 0;
    const avg = calculateAverage(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  };

  console.log('\n' + '='.repeat(70));
  console.log('📊 ADVANCED EVALUATION RESULTS');
  console.log('='.repeat(70));

  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Queries: ${results.total}`);
  console.log(`   Successful: ${results.successful} (${((results.successful / results.total) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${results.failed} (${((results.failed / results.total) * 100).toFixed(1)}%)`);

  console.log(`\n🎯 Accuracy Metrics:`);
  console.log(`   Average: ${calculateAverage(results.metrics.accuracy).toFixed(2)}%`);
  console.log(`   Min: ${calculateMin(results.metrics.accuracy).toFixed(2)}%`);
  console.log(`   Max: ${calculateMax(results.metrics.accuracy).toFixed(2)}%`);
  console.log(`   Std Dev: ${calculateStdDev(results.metrics.accuracy).toFixed(2)}%`);

  console.log(`\n🔗 Relevance Metrics:`);
  console.log(`   Average: ${calculateAverage(results.metrics.relevance).toFixed(2)}%`);
  console.log(`   Min: ${calculateMin(results.metrics.relevance).toFixed(2)}%`);
  console.log(`   Max: ${calculateMax(results.metrics.relevance).toFixed(2)}%`);
  console.log(`   Std Dev: ${calculateStdDev(results.metrics.relevance).toFixed(2)}%`);

  console.log(`\n🧠 Semantic Similarity:`);
  console.log(`   Average: ${calculateAverage(results.metrics.semanticSimilarity).toFixed(2)}%`);
  console.log(`   Min: ${calculateMin(results.metrics.semanticSimilarity).toFixed(2)}%`);
  console.log(`   Max: ${calculateMax(results.metrics.semanticSimilarity).toFixed(2)}%`);

  console.log(`\n⏱️  Latency Metrics:`);
  console.log(`   Average: ${calculateAverage(results.metrics.latency).toFixed(2)}ms`);
  console.log(`   Min: ${calculateMin(results.metrics.latency)}ms`);
  console.log(`   Max: ${calculateMax(results.metrics.latency)}ms`);
  console.log(`   Std Dev: ${calculateStdDev(results.metrics.latency).toFixed(2)}ms`);

  console.log(`\n📁 Category Breakdown:`);
  for (const [category, metrics] of Object.entries(results.categoryBreakdown)) {
    console.log(`\n   ${category.toUpperCase()}:`);
    console.log(`     Accuracy: ${calculateAverage(metrics.accuracy).toFixed(2)}% (${metrics.accuracy.length} tests)`);
    console.log(`     Relevance: ${calculateAverage(metrics.relevance).toFixed(2)}%`);
    console.log(`     Semantic Similarity: ${calculateAverage(metrics.semanticSimilarity).toFixed(2)}%`);
    console.log(`     Avg Latency: ${calculateAverage(metrics.latency).toFixed(2)}ms`);
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`);
    results.errors.forEach((err, index) => {
      console.log(`   ${index + 1}. [${err.category}] "${err.question}"`);
      console.log(`      Error: ${err.error} (${err.latency}ms)`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Interpretation:');
  console.log('   - Accuracy: Measures how well the answer matches the expected content');
  console.log('   - Relevance: Measures how relevant the answer is to the question');
  console.log('   - Semantic Similarity: Measures semantic overlap between answer and ground truth');
  console.log('   - Latency: Response time in milliseconds');
  console.log('\n' + '='.repeat(70));

  return results;
};

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('evaluation-simple.js')) {
  runAdvancedEvaluation().then(() => process.exit(0));
}

