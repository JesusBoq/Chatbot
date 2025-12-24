import axios from 'axios';
import { evaluate } from 'ragas';
import { fromDocuments } from 'langchain/document_loaders/fs/directory';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testDataset = [
  {
    question: 'What is the baggage allowance for Air India?',
    ground_truth: 'Air India allows passengers to carry both checked and carry-on baggage. The specific weight limits depend on the class of travel and route.',
    context: 'baggage',
    category: 'airline_info',
  },
  {
    question: 'How do I check in online?',
    ground_truth: 'You can check in online through the Air India website or mobile app. Online check-in is typically available 48 hours before departure.',
    context: 'check-in',
    category: 'airline_info',
  },
  {
    question: 'Show me flights from New York to London',
    ground_truth: 'Flight information should include available flights with prices, departure times, and flight numbers.',
    context: 'flight_search',
    category: 'flight_search',
  },
  {
    question: 'What is the cancellation policy?',
    ground_truth: 'Air India has specific cancellation policies that vary based on fare type and timing of cancellation.',
    context: 'policies',
    category: 'airline_info',
  },
  {
    question: 'What is the Maharaja Club frequent flyer program?',
    ground_truth: 'Air India Maharaja Club is the frequent flyer program that offers miles, tier benefits, and rewards. Members earn miles on flights and can redeem them for various benefits.',
    context: 'maharajaClub',
    category: 'airline_info',
  },
];

const calculateAccuracy = (predicted, groundTruth) => {
  const predictedLower = predicted.toLowerCase();
  const groundTruthLower = groundTruth.toLowerCase();
  
  const predictedWords = new Set(predictedLower.split(/\s+/));
  const groundTruthWords = new Set(groundTruthLower.split(/\s+/));
  
  const intersection = new Set([...predictedWords].filter(x => groundTruthWords.has(x)));
  const union = new Set([...predictedWords, ...groundTruthWords]);
  
  const jaccardSimilarity = intersection.size / union.size;
  
  const keywordMatches = ['baggage', 'check-in', 'cancellation', 'policy', 'service', 'flight', 'air india'];
  const keywordScore = keywordMatches.reduce((score, keyword) => {
    if (predictedLower.includes(keyword) && groundTruthLower.includes(keyword)) {
      return score + 1;
    }
    return score;
  }, 0) / keywordMatches.length;
  
  return (jaccardSimilarity * 0.6 + keywordScore * 0.4) * 100;
};

const calculateRelevance = async (question, answer) => {
  try {
    const relevancePrompt = `Rate the relevance of this answer to the question on a scale of 0-1.
Question: ${question}
Answer: ${answer}

Provide only a number between 0 and 1 representing relevance score.`;

    const response = await axios.post(`${API_URL}/api/chat`, {
      messages: [
        {
          role: 'system',
          content: 'You are an evaluation assistant. Rate the relevance of answers to questions. Respond only with a number between 0 and 1.',
        },
        {
          role: 'user',
          content: relevancePrompt,
        },
      ],
    });

    const score = parseFloat(response.data.response.trim());
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score)) * 100;
  } catch (error) {
    console.error('Error calculating relevance:', error);
    return 0;
  }
};

const runRAGASEvaluation = async (question, answer, context, groundTruth) => {
  try {
    const dataset = [
      {
        question,
        answer,
        contexts: [context],
        ground_truth: groundTruth,
      },
    ];

    const result = await evaluate(dataset, {
      metrics: [
        'faithfulness',
        'answer_relevancy',
        'context_precision',
        'context_recall',
      ],
    });

    return {
      faithfulness: result.faithfulness * 100,
      answer_relevancy: result.answer_relevancy * 100,
      context_precision: result.context_precision * 100,
      context_recall: result.context_recall * 100,
    };
  } catch (error) {
    console.error('RAGAS evaluation error:', error);
    return null;
  }
};

export const runAdvancedEvaluation = async () => {
  console.log('🔬 Starting Advanced Evaluation with RAGAS...\n');
  
  const results = {
    total: 0,
    metrics: {
      accuracy: [],
      relevance: [],
      latency: [],
      faithfulness: [],
      answer_relevancy: [],
      context_precision: [],
      context_recall: [],
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

      const accuracy = calculateAccuracy(answer, testCase.ground_truth);
      const relevance = await calculateRelevance(testCase.question, answer);

      let ragasMetrics = null;
      try {
        ragasMetrics = await runRAGASEvaluation(
          testCase.question,
          answer,
          testCase.context,
          testCase.ground_truth
        );
      } catch (error) {
        console.warn('RAGAS evaluation failed, using fallback metrics');
      }

      results.metrics.accuracy.push(accuracy);
      results.metrics.relevance.push(relevance);
      results.metrics.latency.push(latency);

      if (ragasMetrics) {
        results.metrics.faithfulness.push(ragasMetrics.faithfulness);
        results.metrics.answer_relevancy.push(ragasMetrics.answer_relevancy);
        results.metrics.context_precision.push(ragasMetrics.context_precision);
        results.metrics.context_recall.push(ragasMetrics.context_recall);
      }

      if (!results.categoryBreakdown[testCase.category]) {
        results.categoryBreakdown[testCase.category] = {
          accuracy: [],
          relevance: [],
          latency: [],
        };
      }

      results.categoryBreakdown[testCase.category].accuracy.push(accuracy);
      results.categoryBreakdown[testCase.category].relevance.push(relevance);
      results.categoryBreakdown[testCase.category].latency.push(latency);

      console.log(`✅ "${testCase.question.substring(0, 50)}..."`);
      console.log(`   Accuracy: ${accuracy.toFixed(2)}% | Relevance: ${relevance.toFixed(2)}% | Latency: ${latency}ms`);
      if (ragasMetrics) {
        console.log(`   Faithfulness: ${ragasMetrics.faithfulness.toFixed(2)}% | Answer Relevancy: ${ragasMetrics.answer_relevancy.toFixed(2)}%`);
      }
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      results.errors.push({
        question: testCase.question,
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

  console.log('\n' + '='.repeat(70));
  console.log('📊 ADVANCED EVALUATION RESULTS');
  console.log('='.repeat(70));

  console.log(`\n🎯 Core Metrics:`);
  console.log(`   Accuracy:`);
  console.log(`     Average: ${calculateAverage(results.metrics.accuracy).toFixed(2)}%`);
  console.log(`     Min: ${calculateMin(results.metrics.accuracy).toFixed(2)}%`);
  console.log(`     Max: ${calculateMax(results.metrics.accuracy).toFixed(2)}%`);

  console.log(`\n   Relevance:`);
  console.log(`     Average: ${calculateAverage(results.metrics.relevance).toFixed(2)}%`);
  console.log(`     Min: ${calculateMin(results.metrics.relevance).toFixed(2)}%`);
  console.log(`     Max: ${calculateMax(results.metrics.relevance).toFixed(2)}%`);

  console.log(`\n   Latency:`);
  console.log(`     Average: ${calculateAverage(results.metrics.latency).toFixed(2)}ms`);
  console.log(`     Min: ${calculateMin(results.metrics.latency)}ms`);
  console.log(`     Max: ${calculateMax(results.metrics.latency)}ms`);

  if (results.metrics.faithfulness.length > 0) {
    console.log(`\n🔬 RAGAS Metrics:`);
    console.log(`   Faithfulness (Accuracy): ${calculateAverage(results.metrics.faithfulness).toFixed(2)}%`);
    console.log(`   Answer Relevancy: ${calculateAverage(results.metrics.answer_relevancy).toFixed(2)}%`);
    console.log(`   Context Precision: ${calculateAverage(results.metrics.context_precision).toFixed(2)}%`);
    console.log(`   Context Recall: ${calculateAverage(results.metrics.context_recall).toFixed(2)}%`);
  }

  console.log(`\n📁 Category Breakdown:`);
  for (const [category, metrics] of Object.entries(results.categoryBreakdown)) {
    console.log(`\n   ${category}:`);
    console.log(`     Accuracy: ${calculateAverage(metrics.accuracy).toFixed(2)}%`);
    console.log(`     Relevance: ${calculateAverage(metrics.relevance).toFixed(2)}%`);
    console.log(`     Latency: ${calculateAverage(metrics.latency).toFixed(2)}ms`);
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`);
    results.errors.forEach((err, index) => {
      console.log(`   ${index + 1}. "${err.question}"`);
      console.log(`      Error: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(70));

  return results;
};

