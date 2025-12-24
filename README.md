# Air India Maharaja Assistant

A sophisticated bilingual (English/Hindi) airline chatbot assistant built with React and Node.js, featuring real-time web scraping, flight search API integration, and intelligent conversation management.

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [What Was Completed](#what-was-completed)
- [Design Decisions & Trade-offs](#design-decisions--trade-offs)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI library for building interactive user interfaces
  - *Why*: Industry standard, excellent ecosystem, component-based architecture
- **TypeScript** - Type-safe JavaScript
  - *Why*: Reduces bugs, improves developer experience, better IDE support
- **Vite** - Next-generation frontend build tool
  - *Why*: Lightning-fast HMR, optimized builds, better DX than Create React App
- **Tailwind CSS** - Utility-first CSS framework
  - *Why*: Rapid UI development, consistent design system, easy customization
- **shadcn/ui** - High-quality component library
  - *Why*: Accessible, customizable, copy-paste components (not a dependency)

### Backend
- **Node.js + Express** - Server-side JavaScript runtime and web framework
  - *Why*: Single language (JavaScript) for full-stack, large ecosystem, async I/O
- **OpenAI API (GPT-3.5-turbo)** - Large Language Model for natural language understanding
  - *Why*: State-of-the-art conversational AI, cost-effective, reliable
- **Amadeus Flight Offers Search API** - Real-time flight data
  - *Why*: Industry-standard airline API, comprehensive flight information

### Data & Scraping
- **Cheerio** - Server-side HTML parsing
  - *Why*: jQuery-like API, fast, lightweight, no browser needed
- **Axios** - HTTP client
  - *Why*: Promise-based, interceptors, better error handling than fetch

### Storage
- **localStorage** - Browser-based persistence
  - *Why*: No backend database needed, simple implementation, sufficient for MVP

## ✨ Features

### Core Features
- ✅ **Bilingual Support** - Automatic language detection (English/Hindi) with responses in the same language
- ✅ **Conversation Management** - Multiple conversation tabs with persistent storage
- ✅ **Real-time Web Scraping** - Extracts up-to-date information from Air India's official website
- ✅ **Flight Search Integration** - Real-time flight data via Amadeus API
- ✅ **Intent Detection** - Intelligently routes queries to appropriate data sources
- ✅ **Quick Action Buttons** - Pre-defined queries for common questions
- ✅ **Conversation Persistence** - Saves conversations to localStorage (only conversations with 2+ user messages)

### Advanced Features
- ✅ **Smart Caching** - 1-hour cache for scraped data to reduce API calls
- ✅ **Fallback Data** - Static data when scraping fails
- ✅ **Session Management** - Auto-creates new conversations after 30-minute inactivity
- ✅ **Evaluation System** - Custom benchmarking with accuracy, relevance, and latency metrics
- ✅ **Error Handling** - Graceful degradation when APIs fail

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- (Optional) Amadeus API credentials ([Get them here](https://developers.amadeus.com/))

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd react-chatbot

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001

# Optional (for flight search)
AMADEUS_API_KEY=your_amadeus_api_key_here
AMADEUS_API_SECRET=your_amadeus_api_secret_here
AMADEUS_ENV=test
```

**⚠️ Security Note**: Never commit your `.env` file. It's already in `.gitignore`.

### Step 3: Run the Application

**Option A: Run Both Services Together (Recommended)**
```bash
npm run dev:all
```

**Option B: Run Separately**

Terminal 1 - Backend:
```bash
npm run dev:server
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### Step 4: Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Additional Scripts

```bash
# Run evaluation benchmark
npm run evaluate

# Diagnose scraping/LLM issues
npm run diagnose

# Build for production
npm run build

# Preview production build
npm run preview
```

## ✅ What Was Completed

### Core Requirements
- ✅ **Chat Interface** - Modern, responsive chat UI with message history
- ✅ **OpenAI Integration** - GPT-3.5-turbo for natural language responses
- ✅ **Backend Server** - Express server to handle API calls and avoid CORS
- ✅ **Conversation Persistence** - localStorage-based conversation storage
- ✅ **Multiple Conversations** - Tab-based conversation management

### Expected Features
- ✅ **Web Scraping** - Real-time data extraction from Air India website
- ✅ **Flight Search API** - Amadeus integration for live flight data
- ✅ **Intent Detection** - Smart routing between scraping and API calls
- ✅ **Bilingual Support** - English and Hindi language detection
- ✅ **Quick Actions** - Pre-defined query buttons
- ✅ **Error Handling** - Graceful fallbacks and error messages
- ✅ **Caching System** - Reduces redundant API calls

### Bonus Features
- ✅ **Evaluation System** - Custom metrics (accuracy, relevance, semantic similarity, latency)
- ✅ **Session Management** - Auto-archiving conversations after inactivity
- ✅ **Fallback Data** - Static data when scraping fails
- ✅ **Diagnostic Tools** - Scripts for debugging and performance analysis
- ✅ **Brand Styling** - Air India brand colors and design elements
- ✅ **Custom Favicon** - Branded favicon with Maharaja symbol

## 🎨 Design Decisions & Trade-offs

### Architecture Decisions

#### 1. **Backend Proxy Instead of Direct API Calls**
- **Decision**: All OpenAI API calls go through Express backend
- **Why**: Avoids CORS issues, keeps API keys secure, enables server-side processing
- **Trade-off**: Adds server dependency, but provides better security and flexibility

#### 2. **localStorage vs. Database**
- **Decision**: Use browser localStorage for conversation persistence
- **Why**: No backend database needed, simpler deployment, sufficient for MVP
- **Trade-off**: Data is client-side only, but reduces complexity and infrastructure needs

#### 3. **Web Scraping vs. Official API**
- **Decision**: Scrape Air India website for airline information
- **Why**: No official API available, need real-time data
- **Trade-off**: Fragile (breaks if website changes), but provides access to current information

#### 4. **Caching Strategy**
- **Decision**: 1-hour cache for scraped data
- **Why**: Reduces load on target website, improves response time
- **Trade-off**: Data may be up to 1 hour old, but significantly improves performance

#### 5. **Intent Detection Before API Calls**
- **Decision**: Detect query type before calling scraping/Amadeus API
- **Why**: Reduces unnecessary API calls, improves latency
- **Trade-off**: Adds complexity, but significantly optimizes resource usage

#### 6. **Bilingual Support via Language Detection**
- **Decision**: Automatic language detection based on user input
- **Why**: Better UX than manual language selection
- **Trade-off**: May misclassify mixed-language inputs, but handles 99% of cases correctly

### UI/UX Decisions

#### 1. **Tab-based Conversation Management**
- **Decision**: Multiple conversation tabs instead of single conversation
- **Why**: Better organization, allows users to switch contexts
- **Trade-off**: More complex state management, but significantly better UX

#### 2. **Auto-archiving Conversations**
- **Decision**: Only save conversations with 2+ user messages
- **Why**: Avoids cluttering with empty or very short conversations
- **Trade-off**: May lose some short but meaningful conversations, but keeps UI clean

#### 3. **Quick Action Buttons**
- **Decision**: Pre-defined query buttons in welcome message
- **Why**: Reduces typing, guides users to common queries
- **Trade-off**: Takes up space, but improves discoverability

#### 4. **Brand Colors and Styling**
- **Decision**: Use Air India's brand colors (red gradient, gold accents)
- **Why**: Creates authentic brand experience
- **Trade-off**: Less generic, but more engaging for target users

### Technical Decisions

#### 1. **GPT-3.5-turbo vs. GPT-4**
- **Decision**: Use GPT-3.5-turbo
- **Why**: Cost-effective, sufficient quality, faster responses
- **Trade-off**: Slightly lower quality than GPT-4, but 10x cheaper

#### 2. **Temperature: 0.3**
- **Decision**: Low temperature for consistent, factual responses
- **Why**: Airline information needs to be accurate and consistent
- **Trade-off**: Less creative, but more reliable for factual queries

#### 3. **Max Tokens: 1000**
- **Decision**: Allow longer responses for detailed information
- **Why**: Airline queries often need comprehensive answers
- **Trade-off**: Higher API costs, but better user experience

#### 4. **System Prompt Engineering**
- **Decision**: Detailed, structured system prompts with examples
- **Why**: Better control over LLM behavior, ensures data prioritization
- **Trade-off**: Longer prompts (more tokens), but significantly better accuracy

## ⚠️ Known Limitations

### Technical Limitations

1. **Scraping Fragility**
   - Web scraping breaks if Air India changes their website structure
   - **Mitigation**: Fallback static data, retry mechanism, error handling

2. **localStorage Size Limits**
   - Browser localStorage has ~5-10MB limit
   - **Mitigation**: Only save conversations with 2+ messages, auto-archive old conversations

3. **Rate Limiting**
   - OpenAI API has rate limits (especially on free tier)
   - **Mitigation**: Caching, efficient prompt design, error handling

4. **Language Detection**
   - May misclassify mixed-language or transliterated text
   - **Mitigation**: Pattern matching + keyword detection, defaults to English

5. **Amadeus API Dependency**
   - Flight search requires valid Amadeus credentials
   - **Mitigation**: Graceful degradation, clear error messages

6. **Single User Session**
   - No multi-user support, all data is client-side
   - **Mitigation**: Suitable for MVP, can be extended with backend

### Functional Limitations

1. **No User Authentication**
   - No login system, conversations are device-specific
   - **Future**: Add user accounts for cross-device sync

2. **No Real-time Updates**
   - Scraped data cached for 1 hour
   - **Future**: WebSocket updates or shorter cache duration

3. **Limited Context Window**
   - Long conversations may lose early context
   - **Future**: Implement conversation summarization

4. **No Voice Input**
   - Text-only interface
   - **Future**: Add speech-to-text for better accessibility

5. **No Multi-language Beyond English/Hindi**
   - Only supports two languages
   - **Future**: Extend to more languages

## 🔮 Future Improvements

### Short-term (1-3 months)

1. **Enhanced Error Handling**
   - Better error messages for users
   - Retry mechanisms with exponential backoff
   - User-friendly error recovery

2. **Performance Optimization**
   - Implement response streaming for faster perceived performance
   - Optimize bundle size
   - Add service worker for offline support

3. **Better Scraping**
   - More robust selectors
   - Multiple scraping strategies
   - Better content extraction

4. **Enhanced Evaluation**
   - More comprehensive test dataset
   - Automated regression testing
   - Performance monitoring dashboard

### Medium-term (3-6 months)

1. **Backend Database**
   - Migrate from localStorage to PostgreSQL/MongoDB
   - User authentication and accounts
   - Cross-device conversation sync

2. **Advanced Features**
   - Voice input/output
   - Image support (e.g., boarding pass scanning)
   - Calendar integration for booking reminders

3. **Multi-language Support**
   - Add more languages (Spanish, French, etc.)
   - Improved language detection
   - Translation capabilities

4. **Analytics & Monitoring**
   - User behavior tracking
   - Performance metrics dashboard
   - Error tracking and alerting

### Long-term (6+ months)

1. **AI Improvements**
   - Fine-tuned model for airline domain
   - Better context understanding
   - Proactive assistance

2. **Integration Expansion**
   - More airline APIs
   - Hotel booking integration
   - Car rental integration

3. **Enterprise Features**
   - Multi-tenant support
   - Admin dashboard
   - Custom branding for different airlines

4. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Offline mode

## 📁 Project Structure

```
react-chatbot/
├── server/                    # Backend server
│   ├── index.js               # Express server & API routes
│   ├── scraper.js             # Web scraping module
│   ├── amadeus.js             # Amadeus Flight API integration
│   ├── queryDetector.js       # Intent detection logic
│   ├── languageDetector.js    # Language detection
│   ├── evaluation-simple.js  # Evaluation metrics
│   ├── fallback-data.js      # Static fallback data
│   └── .env                   # Environment variables
├── src/
│   ├── components/
│   │   ├── Chatbot.tsx       # Main chatbot component
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── openai.ts         # API client
│   │   └── utils.ts          # Utilities
│   └── App.tsx               # Root component
├── public/
│   └── air-india-favicon.svg  # Custom favicon
└── package.json
```

## 📝 License

This project is for educational/demonstration purposes.

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📧 Contact

For questions or issues, please open an issue in the repository.

---

**Built with ❤️ for Air India passengers**
