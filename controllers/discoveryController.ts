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
    const { library } = useLibrary();
    const { modeVersion } = useMediaMode();
    const [buffer, setBuffer] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [empty, setEmpty] = useState(false);
    const isFetching = useRef(false);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            setLoading(true);
            setBuffer([]); // Clear UI immediately for smooth transition
            recommendationService.resetSessionCaches(); // Strictly enforce memory isolation
            const initialCards = await recommendationService.getEndlessRecommendations(mode, options, library, 12);
            if (mounted) {
                if (initialCards.length === 0) {
                    setEmpty(true);
                } else {
                    setBuffer(initialCards);
                }
                setLoading(false);
            }
        };
        init();
        return () => { mounted = false; };
    }, [mode, JSON.stringify(options), modeVersion]);

    const requestMore = async () => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            const moreCards = await recommendationService.getEndlessRecommendations(mode, options, library, 5);
            if (moreCards.length > 0) {
                // ✅ ONLY APPEND
                setBuffer(prev => [...prev, ...moreCards]);
            }
        } finally {
            isFetching.current = false;
        }
    };

    const slideIndex = (currentIndex: number) => {
        if (currentIndex >= buffer.length - 3) {
            requestMore();
        }

        // MEMORY SAFETY
        if (currentIndex > 0 && currentIndex % 20 === 0) {
            setBuffer(prev => {
                const newBuffer = [...prev];
                // remove first 10 items safely while preserving order
                for (let i = 0; i < 10; i++) {
                    newBuffer[currentIndex - 20 + i] = null;
                }
                return newBuffer;
            });
        }
    };

    return { buffer, loading, empty, slideIndex, requestMore };
};
