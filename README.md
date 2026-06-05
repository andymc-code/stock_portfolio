# StockPulse — AI-Powered Portfolio Tracker

A premium stock portfolio manager with real-time prices, interactive treemap visualization, and AI-powered insights — built with React, Firebase, and the Gemini API.

## Features

- 🔐 **Firebase Auth** — Email/password and Google OAuth sign-in
- 📊 **Portfolio Tracking** — Track holdings with P&L and cost basis
- 🗺️ **Interactive Treemap** — Visual allocation heatmap with performance coloring
- 🤖 **AI Insights** — Gemini 2.5 Pro analysis of diversification and risk
- 📋 **Custom Watchlists** — Create, rename, and manage multiple watchlists
- 💾 **Cloud Persistence** — All data synced to Firestore per user

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Auth & DB**: Firebase Auth + Firestore
- **AI**: Google Gemini API (2.5 Flash for prices, 2.5 Pro for analysis)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/andymc-code/stock_portfolio.git
cd stock_portfolio
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your `.env` file with:
- **Gemini API key** from [AI Studio](https://aistudio.google.com/apikey)
- **Firebase config** from [Firebase Console](https://console.firebase.google.com) → Project Settings → Web App

### 3. Deploy Firestore Rules

```bash
npx firebase-tools deploy --only firestore:rules
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy

```bash
npm run build
npx firebase-tools deploy --only hosting
```

## Project Structure

```
├── App.tsx                    # Main app with routing logic
├── firebase.ts                # Firebase initialization
├── index.css                  # Design system & global styles
├── types.ts                   # TypeScript interfaces
├── components/
│   ├── AddStockForm.tsx       # Stock/watchlist add form
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── Header.tsx             # App header with actions
│   ├── Insights.tsx           # AI portfolio analysis
│   ├── LandingPage.tsx        # Marketing landing page
│   ├── LoginPage.tsx          # Auth (login/signup/Google)
│   ├── Modal.tsx              # Native <dialog> modal
│   ├── Portfolio.tsx          # Portfolio with treemap + cards
│   ├── PortfolioTreemap.tsx   # Recharts treemap visualization
│   ├── StockCard.tsx          # Individual stock display
│   ├── Watchlist.tsx          # Watchlist with modal CRUD
│   └── icons.tsx              # SVG icon components
├── contexts/
│   └── AuthContext.tsx        # Firebase Auth provider
├── hooks/
│   ├── usePortfolio.ts        # Portfolio state management
│   ├── useStockData.ts        # Stock data fetching
│   └── useWatchlists.ts       # Watchlist state management
├── services/
│   ├── firestoreService.ts    # Firestore CRUD operations
│   └── geminiService.ts       # Gemini API integration
└── firestore.rules            # Firestore security rules
```

## Security

- Firebase config uses `import.meta.env.VITE_*` — never hardcoded
- Firestore rules enforce per-user document access
- No API keys in git history (remediated)
- `.env` files are in `.gitignore`
