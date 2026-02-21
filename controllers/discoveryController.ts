import { useState, useEffect, useCallback } from 'react';
import { useMediaMode } from '../context/MediaModeContext';
import { useLibrary } from '../context/LibraryContext';
import { mediaService } from '../services/mediaService';
import { recommendationService } from '../services/recommendationService';

export const useDiscoveryController = () => {
    const { mode } = useMediaMode();
    const { library } = useLibrary();

    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);

    const [recommendation, setRecommendation] = useState(null);
    const [recsLoading, setRecsLoading] = useState(false);

    const [selectedGenres, setSelectedGenres] = useState({});
    const [genreLogic, setGenreLogic] = useState('OR');

    useEffect(() => {
        loadData();
    }, [mode]);

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
