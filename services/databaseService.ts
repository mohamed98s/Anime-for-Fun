import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

// Initialize the database asynchronously
export const initDatabase = async () => {
    try {
        if (!db) {
            // Note: Expo SDK 54 uses openDatabaseAsync
            db = await SQLite.openDatabaseAsync('medialibrary.db');

            // Set up the robust flat schema requested by the user
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS library_media (
                    mal_id INTEGER PRIMARY KEY,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0,
                    title TEXT,
                    image_url TEXT,
                    total_episodes INTEGER,
                    compressed_data_json TEXT
                );
            `);
            console.log('[SQLite] Database initialized with active schema.');
        }
        return db;
    } catch (e) {
        console.error('[SQLite] Initialization error:', e);
        throw e;
    }
};

// Returns a guarantee that DB is ready, or throws
export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
    if (!db) {
        return await initDatabase();
    }
    return db;
};
