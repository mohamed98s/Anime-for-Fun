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

            const initialSelected = {};
            uniqueGenres.forEach(g => { initialSelected[g.mal_id] = true });
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
            const initialCards = await recommendationService.getEndlessRecommendations(mode, options, library, 8);
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
        const moreCards = await recommendationService.getEndlessRecommendations(mode, options, library, 5);
        if (moreCards.length > 0) {
            setBuffer(prev => [...prev, ...moreCards]);
        }
        isFetching.current = false;
    };

    const slideIndex = (currentIndex: number) => {
        setBuffer(prev => {
            const newBuffer = [...prev];
            if (currentIndex > 10) {
                newBuffer[currentIndex - 10] = null;
            }
            return newBuffer;
        });

        if (currentIndex >= buffer.length - 3) {
            requestMore();
        }
    };

    return { buffer, loading, empty, slideIndex, requestMore };
};
