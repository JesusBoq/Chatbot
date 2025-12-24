export const detectLanguage = (text) => {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  const hindiPattern = /[\u0900-\u097F]/;
  const hasHindi = hindiPattern.test(text);
  
  if (hasHindi) {
    return 'hi';
  }
  
  const hindiKeywords = [
    'क्या', 'है', 'में', 'के', 'लिए', 'कर', 'हो', 'से', 'पर', 'या',
    'उड़ान', 'टिकट', 'बुकिंग', 'सामान', 'चेक-इन', 'रद्द', 'रिफंड',
    'महाराजा', 'क्लब', 'मील', 'सेवा', 'सहायता', 'नमस्ते', 'कृपया',
    'जानकारी', 'बताएं', 'मदद', 'सहायता', 'प्रश्न', 'उत्तर'
  ];
  
  const textLower = text.toLowerCase();
  const hasHindiKeywords = hindiKeywords.some(keyword => text.includes(keyword));
  
  if (hasHindiKeywords) {
    return 'hi';
  }
  
  return 'en';
};

export const getLanguageInstructions = (language) => {
  if (language === 'hi') {
    return {
      instruction: 'आपको हिंदी में जवाब देना चाहिए। उपयोगकर्ता ने हिंदी में प्रश्न पूछा है, इसलिए आपको हिंदी में ही जवाब देना होगा।',
      responseLanguage: 'Hindi',
    };
  }
  
  return {
    instruction: 'You must respond in English. The user asked in English, so you must respond in English.',
    responseLanguage: 'English',
  };
};

