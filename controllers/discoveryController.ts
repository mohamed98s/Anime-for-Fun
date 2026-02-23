import { useState, useEffect, useCallback, useRef } from 'react';
import { useMediaMode } from '../context/MediaModeContext';
import { useLibrary } from '../context/LibraryContext';
import { mediaService } from '../services/mediaService';
import { recommendationService } from '../services/recommendationService';

export const useDiscoveryController = () => {
    const { mode, modeVersion } = useMediaMode();
    const { library } = useLibrary();

    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);

    const [recommendation, setRecommendation] = useState(null);
    const [recsLoading, setRecsLoading] = useState(false);

    const [selectedGenres, setSelectedGenres] = useState({});
    const [genreLogic, setGenreLogic] = useState('OR');

    useEffect(() => {
        loadData();
    }, [modeVersion]); // Hook directly to the safe integer signal

    const loadData = async () => {
        setLoading(true);
        try {
            const allGenres = await mediaService.getGenres(mode);
            const uniqueGenres = Array.from(new Map(allGenres.map(item => [item.mal_id, item])).values());
            setGenres(uniqueGenres);

            const initialSelected: Record<string, boolean> = {};
            uniqueGenres.forEach((g: any) => { initialSelected[g.mal_id] = true });
            setSelectedGenres(initialSelected);

            await generateRecommendation(uniqueGenres, initialSelected, 'OR');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGenre = useCallback((id) => {
        setSelectedGenres(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const setLogic = useCallback((logic) => {
        setGenreLogic(logic);
    }, []);

    const generateRecommendation = async (genresToUse = genres, selectedMap = selectedGenres, logicToUse = genreLogic) => {
        setRecsLoading(true);
        try {
            const rec = await recommendationService.getRandomRecommendation(mode, genresToUse, selectedMap, logicToUse, library);
            setRecommendation(rec);
        } finally {
            setRecsLoading(false);
        }
    };

    return {
        mode,
        loading,
        genres,
        recommendation,
        recsLoading,
        selectedGenres,
        genreLogic,
        toggleGenre,
        setLogic,
        generateRecommendation
    };
};

export const useEndlessSwiper = (mode: string, options: any) => {
    const { library, addToLibrary } = useLibrary();
    const { modeVersion } = useMediaMode();
    const [buffer, setBuffer] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [empty, setEmpty] = useState(false);

    const isFetching = useRef(false);
    const currentIndex = useRef(0);
    const mounted = useRef(true);

    const initializeDiscovery = useCallback(async () => {
        setLoading(true);
        setBuffer([]); // Clear UI immediately
        setEmpty(false);
        currentIndex.current = 0;

        recommendationService.resetSessionCaches(); // Strictly enforce memory isolation
        await recommendationService.initializeSession(mode, options, library);

        const initialCards = await recommendationService.getNextBatch(mode, options, library, 10);
        if (mounted.current) {
            if (!initialCards || initialCards.length === 0) {
                setEmpty(true);
            } else {
                setBuffer(initialCards);
            }
            setLoading(false);
        }
    }, [mode, JSON.stringify(options), library]);

    useEffect(() => {
        mounted.current = true;
        initializeDiscovery();
        return () => { mounted.current = false; };
    }, [initializeDiscovery, modeVersion]);

    const getNextBatch = async () => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            const moreCards = await recommendationService.getNextBatch(mode, options, library, 5);
            if (!moreCards || moreCards.length === 0) return;
            // ✅ ONLY APPEND
            setBuffer(prev => [...prev, ...moreCards]);
        } finally {
            isFetching.current = false;
        }
    };

    const recordSwipe = (cardIndex: number, action: 'skip' | 'like') => {
        const currentItem = buffer[cardIndex];

        if (currentItem) {
            recommendationService.recordSwipe(currentItem.mal_id);
            if (action === 'like') {
                const status = mode === 'anime' ? 'Plan to Watch' : 'Plan to Read';
                addToLibrary(currentItem, status);
            }

            // Trigger background refill if queue runs below expanding threshold
            recommendationService.triggerBackgroundRefill(mode, options);
        }

        currentIndex.current = cardIndex + 1;

        if (currentIndex.current >= buffer.length - 3) {
            getNextBatch();
        }

        // MEMORY SAFETY
        if (currentIndex.current > 0 && currentIndex.current % 20 === 0) {
            setBuffer(prev => {
                const newBuffer = [...prev];
                // remove first 10 items safely while preserving order (to sustain Swiper indices)
                for (let i = 0; i < 10; i++) {
                    newBuffer[currentIndex.current - 20 + i] = null;
                }
                return newBuffer;
            });
        }
    };

    return { buffer, loading, empty, recordSwipe, getNextBatch };
};
