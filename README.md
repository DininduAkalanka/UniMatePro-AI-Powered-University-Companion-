# UniMate - AI-Powered University Companion

<div align="center">

<img width="2800" height="2100" alt="iphone-multiple-screens-mockup" src="https://github.com/user-attachments/assets/52713bb7-fc2c-4ecf-bafc-28b407c3fdcd" />

**Intelligent Academic Management System for University Students**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.5-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Overview](#overview) • [Problem Statement](#problem-statement) • [Solution](#solution) • [Features](#features) • [Tech Stack](#tech-stack) • [Installation](#installation)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [AI/ML Capabilities](#aiml-capabilities)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [API Integrations](#api-integrations)
- [Configuration](#configuration)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

UniMate is a cross-platform mobile application designed to address the academic workload challenges faced by university students. The application combines traditional task management with artificial intelligence and machine learning capabilities to provide predictive insights, personalized recommendations, and automated assistance for academic planning and execution.

Built using React Native and Expo framework, UniMate delivers native performance across iOS and Android platforms while maintaining a single codebase. The application integrates Firebase for backend services and leverages Hugging Face's machine learning models to provide intelligent features that adapt to individual student behavior patterns.

---

## Problem Statement

University students face several interconnected challenges that impact their academic performance and well-being:

### Academic Workload Management
- Multiple courses with overlapping deadlines create scheduling conflicts and time management difficulties
- Lack of visibility into upcoming workload distribution leads to last-minute cramming and poor time allocation
- Difficulty prioritizing tasks across different courses based on actual time requirements and complexity
- Inadequate tools for tracking progress across assignments, exams, projects, and study sessions

### Student Burnout and Mental Health
- Excessive study hours without proper break management contributes to academic burnout
- Declining study effectiveness goes unnoticed until academic performance suffers
- Students lack objective measures to assess their productivity patterns and workload capacity
- Absence of early warning systems to identify unsustainable work patterns before they cause problems

### Information Fragmentation
- Study materials, notes, and resources are scattered across multiple platforms and formats
- Difficulty retrieving relevant information when needed for assignments or exam preparation
- No centralized system to organize course materials, deadlines, and study resources
- Limited ability to search across personal academic content effectively

### Reactive Rather Than Proactive Approach
- Students typically respond to immediate deadlines rather than planning ahead strategically
- Lack of predictive insights about future workload and potential scheduling conflicts
- Manual tracking of courses, tasks, and study sessions is time-consuming and error-prone
- Absence of personalized recommendations based on individual performance patterns

---

## Solution

UniMate addresses these challenges through an integrated platform that combines traditional productivity tools with artificial intelligence capabilities:

### Intelligent Task and Course Management
The application provides a comprehensive system for organizing academic responsibilities. Students can track courses with detailed metadata including difficulty levels, credit hours, and instructor information. Tasks are automatically categorized by type (assignments, exams, projects, quizzes) with priority-based organization and status tracking. The integrated timetable system manages weekly schedules with location tracking and visual course identification.

### Predictive Analytics Engine
Machine learning algorithms analyze task data, historical performance, and current workload to generate predictive insights. The system calculates deadline risk scores based on remaining time, estimated effort, and completion status. It provides recommended daily study hours to meet deadlines without overloading. The workload analyzer identifies potential capacity issues before they become critical problems.

### Burnout Detection and Prevention
A multi-factor analysis system monitors study patterns to identify early signs of burnout. The algorithm tracks study session effectiveness trends, excessive study hours, completion rates, break patterns, and overdue task accumulation. When risk thresholds are exceeded, the system generates personalized recommendations and intervention alerts to help students adjust their approach before burnout occurs.

### Retrieval-Augmented Generation (RAG) System
The application implements a RAG architecture that indexes personal study materials, task descriptions, course content, and session notes. Using vector embeddings and semantic search, students can query their accumulated knowledge base in natural language. The system retrieves relevant context and combines it with large language models to provide personalized answers based on the student's own materials.

### Peak Productivity Analysis
By analyzing historical study session data, the system identifies each student's most productive hours. This analysis considers session count, average effectiveness ratings, duration patterns, and consistency. The insights inform optimal scheduling for notifications and task recommendations, ensuring alerts reach students when they are most likely to be productive.

### Context-Aware AI Assistant
An integrated conversational AI system provides on-demand assistance for concept explanations, study strategies, and question answering. The assistant operates in two modes: standard AI mode for general queries using large language models, and RAG mode for questions specific to the student's courses and materials. The system maintains conversation context and adapts responses based on the student's academic profile.

### Smart Notification Framework
Rather than generic deadline reminders, the notification system uses multiple data sources to determine optimal timing and content. Notifications are triggered based on deadline proximity, task priority, predicted risk levels, and the student's peak productivity hours. The aggregation system prevents notification spam while ensuring critical alerts are delivered. Background processing ensures notifications function reliably even when the app is not active.

---

## Key Features

### Core Academic Management

**Course Organization**
- Create and manage unlimited university courses with custom visual identifiers
- Track difficulty ratings on a five-point scale for workload planning
- Store instructor contact information and office hours
- Record credit hours for workload calculation
- Visual course cards with gradient designs for quick identification

**Comprehensive Task Tracking**
- Support for multiple task types: assignments, exams, projects, quizzes
- Four-level priority system: low, medium, high, urgent
- Automatic status progression: todo, in progress, completed, overdue
- Time estimation fields for realistic scheduling
- Progress tracking with completion percentages
- Due date management with timezone support
- Task notes and description fields for detailed requirements

**Timetable Management**
- Week-view schedule with day-wise organization
- Class type categorization: lecture, laboratory, tutorial, seminar
- Location tracking for on-campus navigation
- Time slot management with conflict detection
- Course integration with color-coded visualization
- Recurring event support for semester-long classes

**Study Session Tracking**
- Timer-based session recording with start/stop functionality
- Effectiveness self-assessment on a five-point scale
- Topic and subject tracking for performance analysis
- Session notes for recording key learnings
- Historical data storage for trend analysis
- Pomodoro timer support with customizable intervals

**Analytics Dashboard**
- Real-time statistics on tasks, courses, and study hours
- Completion rate calculations across all active tasks
- Study streak tracking for motivation
- Visual progress indicators with animated components
- Weekly and monthly aggregation views
- Performance trend visualizations

---

## AI/ML Capabilities

### Conversational AI Assistant

The application includes a dual-mode AI assistant that adapts to different user needs:

**Standard AI Mode**
- General academic assistance using large language models
- Concept explanations across multiple subjects
- Study strategy recommendations based on learning science principles
- Question answering with citations when applicable
- Text summarization for lengthy materials

**RAG-Enhanced Mode**
- Context-aware responses using the student's personal study materials
- Semantic search across indexed content including notes, tasks, and course materials
- Personalized answers that reference specific assignments and deadlines
- Integration with student's academic history for contextual recommendations

**Technical Implementation**
- Primary model: Meta Llama 3.2-1B-Instruct for conversational responses
- Fallback models: Zephyr-7B-Beta and DialoGPT-Medium for high availability
- Summarization: Facebook BART-Large-CNN for condensing lengthy content
- Context window: 6-message history for conversation continuity
- Temperature control: 0.7 for balanced creativity and accuracy
- Token limiting: 500 maximum for mobile optimization
- Real-time typing indicators with animated feedback
- Automatic offline mode with intelligent fallback responses

### Retrieval-Augmented Generation System

**Architecture Overview**

The RAG system implements a complete pipeline from content ingestion to context-aware response generation:

1. Content Collection: Study notes, task descriptions, course materials, session notes, and chat history
2. Tokenization: Text preprocessing and cleaning
3. Embedding Generation: Conversion to 384-dimensional vectors using sentence-transformers
4. Vector Storage: Local persistence using AsyncStorage with JSON serialization
5. Similarity Search: Cosine similarity calculation for relevant document retrieval
6. Context Injection: Retrieved documents combined with user query
7. LLM Processing: Large language model generates response using augmented context

**Embedding Strategy**
- Model: sentence-transformers/all-MiniLM-L6-v2
- Dimensionality: 384D vectors
- Normalization: L2 norm for unit vector representation
- Offline fallback: TF-IDF-style hashing for degraded mode operation

**Vector Storage Architecture**
- Backend: AsyncStorage for local persistence
- Format: JSON serialization for cross-platform compatibility
- Capacity: 1,000 items with FIFO eviction policy
- Indexing: On-demand with timestamp tracking for freshness
- Performance: Sub-second retrieval for most queries

**Similarity Calculation**

```
Cosine Similarity = dot(query_vector, document_vector) / (||query_vector|| × ||document_vector||)
```

Documents are ranked by similarity score, with top-k results selected for context injection.

### Deadline Risk Prediction Engine

**Risk Assessment Algorithm**

The prediction engine analyzes multiple factors to calculate deadline risk:

- Days remaining until deadline
- Estimated hours required for completion
- Current completion percentage
- Historical average study hours per day
- Task priority level
- Concurrent deadline proximity

**Risk Classification**

- High Risk: Required daily hours exceed 10 hours (maximum sustainable study time)
- Medium Risk: Required daily hours between 7-10 hours (70-100% of maximum)
- Low Risk: Required daily hours below 7 hours (sustainable workload)

**Predictive Metrics**

- Recommended study hours per day for on-time completion
- Completion probability percentage based on historical performance
- Days remaining calculation accounting for weekends and holidays
- Historical performance weighting for personalized recommendations

### Burnout Detection System

**Multi-Factor Analysis Model**

The burnout detection algorithm combines five weighted indicators:

```
Burnout Score = (effectiveness_decline × 0.30) + 
                (excessive_hours × 0.25) + 
                (completion_decline × 0.20) + 
                (insufficient_breaks × 0.15) + 
                (overdue_accumulation × 0.10)
```

**Monitored Indicators**

| Indicator | Threshold | Weight | Description |
|-----------|-----------|--------|-------------|
| Effectiveness Decline | < 2.5/5 or -40% drop | 30% | Declining self-reported session effectiveness |
| Excessive Hours | > 50 hours/week | 25% | Unsustainable study duration |
| Completion Decline | < 50% rate | 20% | Reduced task completion percentage |
| Insufficient Breaks | < 1 day off/week | 15% | Inadequate recovery time |
| Overdue Accumulation | > 3 tasks | 10% | Growing backlog of overdue items |

**Risk Level Classifications**

- Critical (80-100): Immediate intervention recommended with specific recovery strategies
- High (60-79): Weekly check-in suggested with workload adjustment recommendations
- Moderate (40-59): Close monitoring with proactive break scheduling
- Low (20-39): Early warning with preventive suggestions
- None (0-19): Healthy patterns with positive reinforcement

### Peak Productivity Time Analyzer

**Productivity Scoring Formula**

```
Hourly Productivity Score = (session_count × 0.40) + 
                           (avg_effectiveness × 0.30) + 
                           (avg_duration × 0.20) + 
                           (consistency × 0.10)
```

**Analysis Parameters**

- Historical window: 30-day rolling period
- Minimum session requirement: 5 sessions for statistical significance
- Hourly granularity: 24-hour coverage (0-23)
- Confidence levels:
  - High confidence: > 20 sessions recorded
  - Medium confidence: 10-20 sessions
  - Low confidence: < 10 sessions

**Applications**

- Optimal notification scheduling based on high-productivity hours
- Study session recommendations for difficult tasks
- Calendar blocking suggestions for focused work
- Trend analysis for circadian rhythm optimization

### Smart Notification Framework

**Decision Tree Architecture**

```
Task Data → Risk Analysis → Time Optimization → Priority Calculation → Trigger Decision → Delivery
```

**Notification Categories**

- Deadline Alerts: Risk-based scheduling with urgency escalation
- Workload Warnings: Capacity overflow detection with load balancing suggestions
- Peak Time Reminders: Productivity-optimized timing based on historical patterns
- Burnout Interventions: Health-focused alerts with recovery recommendations
- Achievement Celebrations: Motivational triggers for milestone completion

**Scheduling Logic**

- Background fetch interval: Every 4 hours for passive monitoring
- Morning briefing: Daily summary at user's identified peak time
- Real-time triggers: Immediate notifications on critical task creation or updates
- Aggregation window: 15-minute deduplication period to prevent notification spam

**Priority-Based Delivery**

- Critical priority: Urgent sound, vibration, and banner display
- High priority: Alert sound with persistent banner
- Medium priority: Subtle sound with collapsible notification
- Low priority: Silent delivery to notification center only

**Background Processing**

- Expo BackgroundFetch for periodic checks
- TaskManager for scheduled operations
- Persistent state management for offline reliability
- Battery-optimized polling strategies

---

## Technology Stack

### Frontend Architecture

**React Native 0.81.5**
- Cross-platform mobile framework enabling single codebase for iOS and Android
- Bridge-based architecture with new Fabric renderer for improved performance
- Hermes JavaScript engine for optimized bytecode execution and reduced app startup time
- Platform support: iOS 13+, Android 6.0+ (API Level 23+)

**Expo SDK 54.0.23**
- Development platform with managed workflow for simplified native module integration
- EAS Build system for cloud-based compilation and deployment
- Over-the-air updates capability for instant bug fixes and feature deployments
- Metro bundler with Fast Refresh for rapid development iteration

**TypeScript 5.9.2**
- Static type checking with strict mode enabled for error prevention
- Enhanced IDE support with full IntelliSense across all dependencies
- Path aliases for cleaner import statements
- ES2022 compilation target for modern JavaScript features

### Navigation and Routing

**Expo Router 6.0.14**
- File-system based routing architecture similar to Next.js
- Type-safe route definitions with typed navigation parameters
- Support for stack, tab, and drawer navigation patterns
- Automatic deep linking generation from directory structure
- Route-based code splitting for optimal bundle size and lazy loading

### State Management and UI

**React Hooks and Context API**
- useState and useReducer for local component state
- useEffect and useCallback for side effects and memoization
- Context API for global state management (StudySessionContext)
- Custom hooks for reusable stateful logic

**Animation Libraries**
- Moti: Declarative animations with simple API for common motion patterns
- React Native Reanimated: High-performance animations running on UI thread
- Expo Linear Gradient: Visual effects for cards and backgrounds
- Expo Blur: iOS-style blur effects for glass morphism design

### Backend Infrastructure

**Firebase 12.5.0**

Backend-as-a-Service providing multiple integrated services:

- **Firestore**: NoSQL cloud database with real-time synchronization
  - Document-based data model for flexible schema
  - Real-time listeners for live updates across devices
  - Offline persistence with automatic synchronization
  - Batch writes and transactions for data consistency
  
- **Firebase Authentication**: Secure user authentication system
  - Email/password authentication
  - Google OAuth 2.0 integration
  - Password reset functionality via email
  - Session management with persistent login state
  
- **Firebase Storage**: Cloud file storage for user-uploaded content
  - Secure file uploads with progress tracking
  - Automatic resizing and optimization for images
  - Access control with security rules

### AI and Machine Learning Services

**Hugging Face Inference API 4.13.3**

Integration with multiple state-of-the-art models:

- **Meta Llama 3.2-1B-Instruct**: Primary conversational AI model
  - 1 billion parameter instruction-tuned model
  - Optimized for mobile with acceptable latency
  - Context-aware conversation handling
  
- **Facebook BART-Large-CNN**: Text summarization
  - 400 million parameter encoder-decoder architecture
  - Trained specifically for abstractive summarization
  - Condensed summaries of study materials
  
- **sentence-transformers/all-MiniLM-L6-v2**: Semantic embeddings
  - 384-dimensional dense vector representations
  - Optimized for semantic similarity tasks
  - Efficient inference for mobile deployment

### Native Platform Integration

**Expo Modules**

- **expo-notifications (0.30.6)**: Local and push notification management
- **expo-background-fetch (14.0.1)**: Periodic background task execution
- **expo-task-manager (12.0.1)**: Scheduled background operations
- **expo-haptics (15.0.7)**: Tactile feedback for user interactions
- **expo-auth-session (7.0.9)**: OAuth flow management
- **expo-clipboard (8.0.7)**: Clipboard access for copy/paste functionality
- **expo-document-picker (14.0.7)**: File selection from device storage

**React Native Community Packages**

- **@react-native-async-storage/async-storage (2.2.0)**: Local persistent storage
- **@react-native-google-signin/google-signin (16.0.0)**: Google authentication
- **@react-native-picker/picker (2.11.1)**: Native picker components
- **@react-native-community/datetimepicker (8.4.4)**: Date and time selection

**Additional UI Libraries**

- **react-native-calendars (1.1313.0)**: Calendar and scheduling components
- **react-native-gifted-chat (2.8.1)**: Chat UI components
- **react-native-gesture-handler (2.28.0)**: Touch gesture management
- **react-native-keyboard-controller (1.18.5)**: Keyboard behavior customization

### Development Tools

**Code Quality**
- ESLint: JavaScript and TypeScript linting with Expo configuration
- TypeScript compiler: Static type checking during development
- Prettier: Code formatting for consistency

**Build and Deployment**
- EAS Build: Cloud-based native binary compilation
- Expo Updates: Over-the-air update distribution
- Metro bundler: JavaScript bundling and transformation

---

## Installation

### Prerequisites

Before installing UniMate, ensure the following software is installed on your development machine:

- Node.js version 18 or higher
- npm (included with Node.js) or yarn package manager
- Expo CLI: Install globally using `npm install -g expo-cli`
- iOS Simulator (macOS only) or Android Emulator
- Firebase account (free tier available)
- Hugging Face account (free tier provides API access)

### Step 1: Clone Repository

```bash
git clone https://github.com/DininduAkalanka/UniMate-AI-Powered-University-Companion-V1.git
cd unimatemobile
```

### Step 2: Install Dependencies

```bash
npm install
```

This command installs all required packages defined in package.json, including React Native, Expo modules, Firebase SDK, and AI/ML libraries.

### Step 3: Firebase Configuration

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable Firestore Database in production mode
3. Enable Authentication with Email/Password and Google sign-in methods
4. Generate web app credentials from Project Settings
5. Note the following configuration values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### Step 4: Hugging Face API Configuration

1. Create account at https://huggingface.co
2. Navigate to Settings > Access Tokens
3. Generate new token with read permissions
4. Copy token starting with "hf_"

### Step 5: Environment Configuration

Create `app.config.js` file in root directory:

```javascript
export default {
  expo: {
    name: "UniMate",
    slug: "unimatemobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    extra: {
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_HUGGING_FACE_API_KEY: process.env.EXPO_PUBLIC_HUGGING_FACE_API_KEY
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.unimatemobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.yourcompany.unimatemobile"
    },
    web: {
      favicon: "./assets/favicon.png"
    }
  }
};
```

Create `.env` file in root directory:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_HUGGING_FACE_API_KEY=hf_your_token
```

### Step 6: Start Development Server

```bash
npm start
```

This launches the Expo development server. Use the following commands:

- Press `i` to open iOS Simulator (macOS only)
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app on physical device

---

## Project Structure

```
unimatemobile/
├── app/                          # Application screens (Expo Router)
│   ├── _layout.tsx              # Root layout with authentication guard
│   ├── index.tsx                # Login/registration screen
│   ├── chat.tsx                 # AI assistant interface
│   ├── tasks.tsx                # Task management screen
│   ├── timetable.tsx            # Schedule viewer
│   ├── study-session.tsx        # Study session tracker
│   ├── notification-settings.tsx # Notification preferences
│   └── (tabs)/                  # Tab navigation group
│       ├── _layout.tsx          # Tab navigator configuration
│       ├── home.tsx             # Dashboard with analytics
│       ├── planner.tsx          # Calendar view
│       └── courses/             # Course management
│           ├── index.tsx        # Course list
│           └── add.tsx          # Add/edit course
│
├── components/                   # Reusable UI components
│   ├── chat/                    # Chat-specific components
│   │   ├── ChatBubble.tsx       # Message display
│   │   ├── ChatInput.tsx        # Message input field
│   │   ├── EmptyState.tsx       # Empty conversation UI
│   │   └── QuickActions.tsx     # Suggested prompts
│   └── ui/                      # Generic UI components
│       ├── AnimatedCard.tsx     # Card with animations
│       ├── CourseCard.tsx       # Course display card
│       ├── GlassCard.tsx        # Glassmorphism card
│       ├── TaskCard.tsx         # Task display card
│       └── StatCard.tsx         # Statistics card
│
├── services/                     # Business logic and API integration
│   ├── authService.ts           # Firebase authentication
│   ├── courseServiceFirestore.ts # Course CRUD operations
│   ├── taskServiceFirestore.ts  # Task CRUD operations
│   ├── studyServiceFirestore.ts # Study session management
│   ├── timetableServiceFirestore.ts # Schedule management
│   ├── aiServiceEnhanced.ts     # AI model integration
│   ├── predictionService.ts     # Risk prediction algorithms
│   ├── burnoutDetector.ts       # Burnout analysis
│   ├── peakTimeAnalyzer.ts      # Productivity analysis
│   ├── notificationManager.ts   # Notification scheduling
│   ├── smartNotificationService.ts # Intelligent notification logic
│   └── ai/                      # AI-specific services
│       ├── ragService.ts        # RAG implementation
│       ├── ragIndexer.ts        # Content indexing
│       └── optimalTimePredictor.ts # Time prediction
│
├── contexts/                     # React Context providers
│   └── StudySessionContext.tsx  # Global study session state
│
├── hooks/                        # Custom React hooks
│   ├── useNotificationInitialization.ts # Notification setup
│   └── useOptimizedData.ts      # Data fetching optimization
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                 # Core type definitions
│   └── notification.ts          # Notification-specific types
│
├── constants/                    # Configuration constants
│   ├── config.ts                # Application configuration
│   ├── designSystem.ts          # Design tokens
│   └── illustrations.ts         # SVG illustrations
│
├── utils/                        # Utility functions
│   ├── validation.ts            # Input validation
│   ├── errorTracking.ts         # Error logging
│   ├── rateLimiter.ts           # Rate limiting logic
│   └── safeAsyncStorage.ts      # Storage wrapper
│
├── firebase/                     # Firebase initialization
│   └── firebaseint.ts           # Firebase config
│
├── android/                      # Android native project
├── assets/                       # Images, fonts, icons
└── scripts/                      # Build and setup scripts
```

---

## Architecture

### Application Architecture

UniMate follows a modular architecture with clear separation of concerns:

**Presentation Layer**
- React Native components for UI rendering
- Expo Router for navigation and routing
- Context API for global state management
- Custom hooks for reusable stateful logic

**Business Logic Layer**
- Service modules for domain-specific operations
- Algorithms for prediction, analysis, and recommendation
- Data transformation and validation logic
- Background task coordination

**Data Layer**
- Firebase Firestore for persistent storage
- AsyncStorage for local caching
- Vector store for AI embeddings
- Real-time synchronization with offline support

**External Integration Layer**
- Hugging Face API for AI model inference
- Firebase Authentication for user management
- Expo notification services for alerts
- Google OAuth for social authentication

### Data Flow

```
User Action → Component → Service → Firebase/AI API → Response → State Update → UI Rerender
```

### Offline Support

The application implements an offline-first strategy:

- Firestore offline persistence for automatic local caching
- AsyncStorage for critical user data
- Queued operations that synchronize when connectivity returns
- Fallback responses for AI features when network unavailable
- Local vector store for RAG functionality without internet

---

## API Integrations

### Hugging Face Inference API

**Integrated Models**

| Model | Task | Usage |
|-------|------|-------|
| meta-llama/Llama-3.2-1B-Instruct | Conversational AI | Primary chat responses |
| facebook/bart-large-cnn | Text Summarization | Content condensation |
| sentence-transformers/all-MiniLM-L6-v2 | Embeddings | Semantic vector generation |

**Rate Limits and Tiers**

- Free Tier: Approximately 100 requests per hour
- Pro Tier: 10,000 requests per month
- Enterprise: Custom rate limits available

**Error Handling Strategy**

- Automatic fallback to alternative models on primary model failure
- Offline mode with pre-generated responses for common queries
- Exponential backoff algorithm for retry attempts
- User-friendly error messages without exposing technical details
- Request queuing for rate limit management

### Firebase Services

**Authentication**
- Email and password sign-in with secure password hashing
- Google OAuth 2.0 for social authentication
- Password reset via email with secure token generation
- Session persistence using AsyncStorage for seamless experience
- Automatic token refresh for extended sessions

**Firestore Database**
- Real-time listeners for live data synchronization across devices
- Batch write operations for improved performance and consistency
- Offline persistence with automatic synchronization on reconnection
- Automatic retry mechanism for network errors
- Security rules for data access control

**Future Cloud Functions**
- Scheduled triggers for notification generation
- Background data aggregation for analytics
- Email notification delivery for important events
- Server-side analytics processing for performance reports

### Expo Platform Services

**Notification Services**
- Local notifications with customizable content and timing
- Scheduled notifications for future delivery
- Action buttons for quick responses within notifications
- Rich notifications supporting images and progress indicators
- Background notification handling

**Background Task Management**
- Background fetch for periodic data synchronization
- Task manager for scheduled operations
- Minimum interval: 15 minutes on iOS, customizable on Android
- Battery-optimized execution strategies
- Reliable execution even when app is terminated

---

## Configuration

### Environment Variables

The application requires the following environment variables:

**Required Variables**

| Variable | Description | Source |
|----------|-------------|--------|
| EXPO_PUBLIC_FIREBASE_API_KEY | Firebase API key | Firebase Console > Project Settings |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase auth domain | Firebase Console > Project Settings |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | Firebase project ID | Firebase Console > Project Settings |
| EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET | Firebase storage bucket | Firebase Console > Project Settings |
| EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase messaging sender ID | Firebase Console > Project Settings |
| EXPO_PUBLIC_FIREBASE_APP_ID | Firebase app ID | Firebase Console > Project Settings |
| EXPO_PUBLIC_HUGGING_FACE_API_KEY | Hugging Face API token | Hugging Face > Settings > Access Tokens |

**Optional Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS | Google OAuth iOS client ID | None |
| EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID | Google OAuth Android client ID | None |
| EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB | Google OAuth web client ID | None |

### Security Considerations

- Never commit .env files to version control
- Use .gitignore to exclude environment configuration
- Rotate API keys periodically
- Use Firebase security rules to restrict data access
- Implement rate limiting for API endpoints
- Validate all user input before processing

---

## Available Scripts

### Development Commands

```bash
npm start              # Start Expo development server with interactive menu
npm run android        # Launch application on Android emulator or connected device
npm run ios            # Launch application on iOS simulator (macOS only)
npm run web            # Run application in web browser (experimental)
```

### Code Quality Commands

```bash
npm run lint           # Run ESLint to check code style and detect errors
npm run security:check # Scan codebase for exposed secrets and sensitive data
```

### Build Commands

```bash
eas build --platform ios       # Build iOS application binary using EAS Build
eas build --platform android   # Build Android application binary using EAS Build
eas build --platform all       # Build for both iOS and Android platforms
```

### Testing Commands

Application includes manual testing utilities:

```typescript
// Test AI model connectivity and response
import { testConnection } from './services/aiServiceEnhanced';
await testConnection();

// Test notification system
import { manualNotificationTest } from './services/notificationTestHelper';
await manualNotificationTest(userId);

// Test RAG indexing process
import { indexAllUserData } from './services/ai/ragIndexer';
await indexAllUserData(userId);

// Debug notification delivery
import { debugNotifications } from './services/notificationTestHelper';
await debugNotifications(userId);
```

---

## Contributing

Contributions to UniMate are welcome. Please follow the guidelines below:

### Development Workflow

1. Fork the repository to your GitHub account
2. Clone your fork to local development environment
3. Create feature branch: `git checkout -b feature/descriptive-name`
4. Implement changes with clear, descriptive commits
5. Test changes on both iOS and Android platforms
6. Push branch to your fork: `git push origin feature/descriptive-name`
7. Open pull request with detailed description of changes

### Code Standards

- Follow TypeScript best practices with strict type checking
- Use ESLint configuration provided in project
- Write descriptive commit messages following conventional commits format
- Add inline comments for complex algorithmic logic
- Update documentation when adding new features or changing behavior
- Maintain consistent code formatting using Prettier

### Pull Request Requirements

Before submitting a pull request, ensure:

- Code compiles without errors or warnings
- ESLint passes with no violations
- No console errors appear during runtime testing
- Features tested on both iOS and Android platforms
- Documentation updated to reflect changes
- Commit history is clean and logical

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for complete terms and conditions.

The MIT License permits use, modification, and distribution of this software for any purpose, including commercial applications, subject to the inclusion of copyright notice and permission notice in all copies or substantial portions of the software.

---

## Author

**Dinindu Akalanka**

- GitHub Profile: [@DininduAkalanka](https://github.com/DininduAkalanka)
- Project Repository: [UniMate-AI-Powered-University-Companion-V1](https://github.com/DininduAkalanka/UniMate-AI-Powered-University-Companion-V1)
- Active Branch: CourseFix

---

## Acknowledgments

This project builds upon the work of numerous open-source communities and service providers:

- Hugging Face for providing accessible AI model inference infrastructure
- Firebase team for comprehensive backend-as-a-service platform
- Expo team for excellent development tooling and framework
- React Native community for extensive open-source component ecosystem
- University students who provided feedback and feature inspiration during development

---

## Support and Contact

For technical issues, feature requests, or general questions:

- **Issue Tracker**: [GitHub Issues](https://github.com/DininduAkalanka/UniMate-AI-Powered-University-Companion-V1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DininduAkalanka/UniMate-AI-Powered-University-Companion-V1/discussions)

When reporting issues, please include:
- Device and operating system version
- Steps to reproduce the problem
- Expected versus actual behavior
- Relevant error messages or screenshots

---
