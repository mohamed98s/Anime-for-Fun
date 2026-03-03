# Anime for Fun 🎐 (React Native Tracker)

Hey! If you're reading this, you're probably about to work on this codebase. Welcome. 
This is a highly polished, feature-rich React Native application (built on Expo) designed to discover, track, and manage Anime and Manga. 

We built this to feel like a premium, native iOS/Android experience—glassmorphism, swipe-to-like discovery limits, edge-to-edge grid layouts, and fast, snappy responses. It runs purely on the **Jikan API (MyAnimeList v4)** for all its data fetching.

Here is everything you need to know about how the app works, where things live, and how you can add to it without breaking anything.

---

## 🛠️ The Tech Stack

We kept the dependencies tight and targeted.
- **Framework:** React Native + Expo (SDK ~54)
- **Routing:** React Navigation (Bottom Tabs, Native Stack, and Material Top Tabs)
- **Remote Data / Caching:** `@tanstack/react-query` + `axios`
- **Local Persistence:** `@react-native-async-storage/async-storage`
- **UI / Visuals:** `expo-image`, `expo-linear-gradient`, `expo-blur`, `react-native-deck-swiper`
- **Charts:** `react-native-chart-kit`

---

## 📂 Project Architecture

The app is broken down into a standard React Native modular structure:

```text
/my-app
├── App.js                 # The Root file. Sets up Context providers and QueryClient.
├── /components            # Reusable UI elements (GridItemCard, AnimeCard, LibraryCard, etc.)
├── /context               # Global states (ThemeContext, LibraryContext, MediaModeContext)
├── /controllers           # Logic hooks abstracting complex actions (e.g., discoveryController.ts)
├── /navigation            # AppNavigator.js (managing tabs and stack routing)
├── /screens               # Main views (Discover, Airing, Search, Library, Dashboard, Details)
├── /services              # External API & Local Data handling (api.js, mediaService.ts)
└── /theme                 # Global styling tokens (Light, Dark, Midnight themes)
```

---

## 🚀 Core Features & Walkthrough

If you're testing the app or adding features, here is exactly what the app does and how the features interlock.

### 1. Dual Media Mode (The FAB)
The entire app shifts between **Anime** and **Manga** modes. 
- **How it works:** We have a floating action button (FAB) in the Discover and Search screens. Tapping it triggers `toggleMode` inside the `MediaModeContext`. 
- **What it does:** It flips a global state. Every single screen listens to this state. If it flips, the API requests immediately remount fetching Manga instead of Anime, and the local library immediately swaps to showing your Manga arrays instead of Anime arrays.

### 2. Swipe Discovery (`react-native-deck-swiper`)
A Tinder-style discovery engine for anime.
- **Where to find it:** Tap a category in the **Discover** tab.
- **How it works:** It loads 25 cards into an infinite swipe deck. Swiping Right triggers `addToLibrary` globally (saving it to your "Planned" list) and plays a haptic vibration. Swiping Left skips it. We use threshold pagination to load the next 25 cards seamlessly in the background before the user runs out of cards.

### 3. Deep Local Tracking (The Library)
- **Where to find it:** The **Library** tab.
- **How it works:** The user's list (Planned, Watching/Reading, Completed) is strictly localized to the device using `AsyncStorage`. 
- **The Engine:** Look at `LibraryContext.js`. It handles CRUD operations safely. If a user increments episodes (`updateProgress`) and hits the `total_episodes` ceiling, the Context automatically detects it and migrates the object directly into the "Completed" array seamlessly.

### 4. Advanced Search & Premium Grid UI
- **Where to find it:** The **Search** tab.
- **How it works:** It uses a debounced text input. It also features an **Advanced Filter** system supporting AND/OR logic constraints and dynamic Multi-Select genres.
- **UI:** The results are rendered using pure edge-to-edge Netflix-style grids via the `GridItemCard` component (which uses `expo-linear-gradient` to float titles over the posters in high contrast).

### 5. Smart Airing Schedule
- **Where to find it:** The **Airing** tab.
- **How it works:** It fetches the *entire* seasonal airing roster, groups everything by broadcast day natively (accounting for timezone fuzziness), and drops "Unknown" broadcast dates into a safety `TBA` tab. It uses `@react-navigation/material-top-tabs` for the swipable day headers.

---

## 🧠 State Management & Data Flow (How to extend the app)

If you are going to write new code, please follow these patterns so you don't fight the architecture:

### Remote Data (Jikan API)
Do **not** use raw `useEffect` + `fetch()` anymore. We use **TanStack React Query**.
1. **The Core Layer:** `services/api.js` talks directly to Axios. It includes a custom delay-queue (`enqueueRequest`) to prevent MyAnimeList from hitting us with HTTP 429 rate limit errors.
2. **The Abstraction:** `services/mediaService.ts` binds `api.js` to React Query keys. 
3. **The Implementation:** Components just call `useQuery({ queryKey: [...], queryFn: ... })` which gives you free loading states, error handling, and robust caching.

### Local Data (User Settings / Library)
For everything *local* (Theme preferences, saved Anime), we use **React Context + AsyncStorage**.
If you need to add a new user setting (like "Autoplay Videos: on/off"), build it into a Context Provider so all screens can subscribe to the toggle instantly without prop-drilling.

---

## 🏃 Getting Started Locally

Getting the dev environment up is standard Expo.

1. Clone the repo and run:
   ```bash
   npm install
   ```
2. Start the Metro bundler:
   ```bash
   npx expo start
   ```
3. Press `a` (Android), `i` (iOS), or scan the QR code using the Expo Go app on your physical device.

That's it. Have fun hacking the code!
