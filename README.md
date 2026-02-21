# 🎐 Anime for Fun: Premium React Native Tracker
A highly polished, feature-rich React Native application built to discover, track, and interact with Anime and Manga. Powered by the open-source **Jikan API (MyAnimeList v4)**, this app offers a premium experience with Tinder-style swipe discovery, dynamic thematic styling, advanced scheduling for seasonal anime, and comprehensive local library management.

---

## 🚀 Features

*   **Dual Media Modes (Anime & Manga):** Seamlessly flip the entire app's ecosystem at the tap of a floating action button. Search algorithms, top-rankings, discovery hierarchies, and local libraries all adapt dynamically with a smooth 3D flip animation.
*   **Immersive Swipe Discovery:** A premium, edge-to-edge Tinder-style card swiper (`react-native-deck-swiper`) featuring dynamic real-time blurred backgrounds, glassmorphism overlays, and haptic feedback to quickly "Like" (Plan to watch) or "Skip" massive volumes of anime/manga.
*   **Smart Seasonal Airing Schedule:** Perfectly paginated schedules of all Currently Airing anime, meticulously sorted into interactive weekly tabs ("Mon", "Tue", ..., "TBA"). Captures oddball web-series and perfectly syncs with MyAnimeList data.
*   **Deep Local Library Tracking:** A robust local `AsyncStorage` system separated by Anime/Manga that tracks exactly what you are Planning, Watching/Reading, and Completed. Includes micro-interaction progress bars and automatic status migrations when you finish an entry.
*   **Visual Analytics Dashboard:** A personalized statistics page offering beautiful dynamically rendered Pie and Bar Charts (`react-native-chart-kit`) detailing the genre distribution and completion status of your library.
*   **Real-time Smart Search:** A heavily optimized, debounced search feature that prevents API rating limiting while instantly serving live recommendations based on your favorite tracked library genres.
*   **Premium Polished Design:** Custom dark/light/accent themes driven by context, comprehensive SafeArea implementations for modern devices, fast animations, and haptic `expo-haptics` responses across the board.

---

## � How to Use the App (User Manual)

### 1. Swapping Between Anime & Manga
*   Look for the **Floating Action Button (FAB)** in the bottom right corner of the Discover or Search screens.
*   Tap it to flip the entire app from tracking **Anime** to **Manga**. 
*   *Note*: This changes the data everywhere! The Discovery carousels will swap "Top Airing" for "Top Publishing", the swipe screens will serve Manga volumes, and your Library tab will instantly display your Manga collection instead of Anime.

### 2. The Swipe Discovery Screen
*   Head to the **Discover** tab and tap on any category (e.g., "Top Upcoming" or "Award Winning").
*   You will enter a full-screen, blurred-background swipe interface.
*   **Swipe Right or Tap "LIKE"**: This instantly adds the series to your localized **Plan to Watch / Plan to Read** library. You will feel a haptic vibration to confirm.
*   **Swipe Left or Tap "SKIP"**: This skips the series, and it will be remembered so you aren't shown the exact same series repeatedly.

### 3. Tracking Your Progress (The Library Tab)
*   Navigate to the **Library** tab at the bottom.
*   Switch between the top tabs: **Planned**, **Watching/Reading**, and **Completed**.
*   **Updating Progress**: On any card in the Watching/Reading tab, use the `+` and `-` buttons to increment the episodes or chapters you have finished.
*   **Auto-Migration**: If you click `+` and reach the maximum number of episodes for an Anime, the app will *automatically* celebrate and move the card gracefully to your "Completed" tab!
*   **Deleting**: Need to drop a series? Tap the red Trash Can icon on any card to permanently scrub it from your local storage.

### 4. Exploring the Weekly Airing Schedule
*   Tap the **Airing** tab. Here, you'll see a week-based schedule of every localized seasonal Anime broadcasting globally.
*   Swipe left and right across the top tabs (Mon, Tue, Wed...) to view the exact timetable for that day.
*   **The TBA Tab**: Any web-series, specials, or animes that have an "Unknown" or flexible broadcast day can be safely found residing inside the "TBA" tab.

### 5. Checking Your Stats (The Dashboard)
*   Tap the **Dashboard** Tab.
*   The top charts give you immediate hard numbers: Total Anime tracked, total episodes watched, and a dynamic calculation of how much of your life (in days) you have spent watching anime.
*   Scroll down to interact with the **Pie Chart** (showing your split between Plan, Watch, Complete statuses) and the **Bar Chart** (which calculates your most-read Manga or watched Anime genres, allowing the Search tab to generate smarter recommendations).

---

## �📂 Project Architecture

This application strictly separates concerns across state management Contexts, pure visual Components, nested Navigators, and a robust external API Service layer. 

### 1. The Core Infrastructure

*   **`App.js`**: The root entry point of the application. It acts as the ultimate wrapper, injecting the three core global states into the app hierarchy: `<ThemeProvider>`, `<MediaModeProvider>`, and `<LibraryProvider>`. It binds the `AppNavigator` to render the UI securely.
*   **`services/api.js`**: The brains of the external data fetching. It communicates with the `api.jikan.moe/v4` backend.
    *   *Features*: Contains an intricate `enqueueRequest` delay-queue system to actively prevent HTTP 429 (Rate Limit) errors. Features strict active lock mechanisms (`fetchWithLock`) to ensure duplicate requests (like fetching Top Producers twice rapidly) reuse the same background promise. Fully paginates seasonal queues and caches static data like genres entirely in memory.
*   **`theme/themes.js`**: A centralized configuration file holding all the hex codes and style tokens for Light, Dark, Midnight, and Accent themes.

### 2. Global State Contexts (`/context`)

*   **`ThemeContext.js`**: Provides the current global theme (`light`, `dark`, etc.) and a toggle function. All components subscribe to this context to instantly swap colors without reloading.
*   **`MediaModeContext.js`**: Tracks whether the user is browsing 'anime' or 'manga'. Triggering the `toggleMode` function handles a beautiful app-wide 3D visual `LayoutAnimation` and forces all data to remount in the new mode's context.
*   **`LibraryContext.js`**: Connects directly to local `@react-native-async-storage/async-storage`. It manages fetching, adding (e.g. `addToLibrary`), moving (e.g. `updateProgress` auto-migrating items to Completed), and validating (e.g. `library.some(...)`) all user-saved preferences.

### 3. Screen Hierarchy (`/screens`)

*   **`AppNavigator.js` (`/navigation`)**: A hybrid navigation system built with React Navigation. Uses a Bottom Tab Navigator for the main app sections (Discover, Airing, Search, Library, Dashboard, Settings) combined with a Stack Navigator to allow pushing detailed views cleanly on top of the tabs.

#### The Screens:
*   **`DiscoveryScreen.js`**: The advanced "Home" hierarchy. Renders dynamic carousels for specific searches like "Top Airing", "Highest Ranked", or specific studios/publishers. Clicking a section pushes the user securely into the `SwipeScreen`.
*   **`SwipeScreen.js`**: The crown jewel of the app's discovery features. Loads 25 cards at a time and presents them as an infinite stack. Swiping right actively locks an anime into your "Plan" library, triggering a haptic success vibration. Swiping left skips it. It uses an `isFetchingRef` lock and early-threshold pagination to guarantee infinite, smooth, uninterrupted swiping without rendering invisible "ghost" cards.
*   **`AiringScreen.js` & `airing/DayScreen.js`**: `AiringScreen` sets up a Material Top Tab Navigator for the days of the week. `DayScreen` acts as the engine, rendering a highly performant `FlatList` of a specific day's schedule. Captures all "Null" broadcast days dynamically and pushes them to a generic "TBA" safety tab.
*   **`SearchScreen.js`**: A dual-purpose screen. When empty, it uses `LibraryContext` to identify the user's top tracked genres and fetches deep recommendations. When typing, an intelligent `lodash.debounce` delays the API call by 500ms to guarantee you only request from Jikan when the user finishes typing a word.
*   **`LibraryScreen.js` & `/library` sub-screens**: Splits your library into `PlanScreen.js`, `WatchingScreen.js`, and `CompletedScreen.js` via top tabs. Parses the raw JSON from `AsyncStorage` and creates categorized FlatLists natively.
*   **`DashboardScreen.js`**: Uses `react-native-chart-kit` and `react-native-svg` to map your local library into massive, interactive visual distributions cleanly sorted by item count or completion arrays.
*   **`DetailsScreen.js`**: The deep-dive view. When clicking any typical card, this pushes a full-screen stacked view showing explicit MAL ratings, broadcast days, detailed synopsis, and a custom popup modal to add it to your localized library folders securely.
*   **`SettingsScreen.js`**: Allows flipping the app's `ThemeContext` via interactive mapped buttons cleanly rendered inside a `SafeAreaView`.

### 4. Reusable UI Components (`/components`)

To keep screens clean, repetitious UI is offloaded:
*   **`AnimeCard.js`**: The standard grid-block rectangle seen across Search and Day screens. Truncates text appropriately, handles caching its own image loading, and handles its own local `onPress` routing into the detail stack securely.
*   **`LibraryCard.js`**: A horizontal, list-specific card variant explicitly built for the `LibraryScreen`. Possesses unique interactive +, -, and Delete buttons allowing users to modify episodes/chapters watched directly from the list, feeding cleanly back up into the `LibraryContext`.
*   **`StatCard.js`**: Small, rounded, elevated metric boxes built explicitly for the top half of the `DashboardScreen.js` to showcase numeric tallies cleanly.

---

## 🛠️ Tech Stack & Dependencies
- **Core:** `react-native`, `expo`, `react`
- **Navigation:** `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/stack`, `@react-navigation/material-top-tabs`
- **UI & Effects:** `expo-blur`, `expo-linear-gradient`, `expo-haptics`, `react-native-safe-area-context`
- **Complex Capabilities:** `react-native-deck-swiper` (Swipe Mechanics), `react-native-chart-kit` & `react-native-svg` (Data Visualization)
- **Data & Storage:** `axios` (API Networking), `@react-native-async-storage/async-storage` (Persistence)
- **Utilities:** `lodash.debounce`

---
> *Development note: This architecture uses a `SafeAreaView` from `react-native-safe-area-context` on all root screens to ensure absolute compatibility with both Android notch layouts and dynamic iOS dynamic islands.*
