import { mediaService } from './mediaService';

export const recommendationService = {
    getRandomRecommendation: async (mode, genresToUse, selectedMap, logicToUse, library) => {
        try {
            const activeGenres = genresToUse.filter(g => selectedMap[g.mal_id]);

            if (activeGenres.length === 0) {
                return null;
            }

            let responseList = [];
            const isAllSelected = activeGenres.length === genresToUse.length;
            const randomPage = Math.floor(Math.random() * 5) + 1;

            if (logicToUse === 'OR') {
                let options = { limit: 25 };
                if (!isAllSelected) {
                    const randomGenre = activeGenres[Math.floor(Math.random() * activeGenres.length)];
                    options.genres = randomGenre.mal_id.toString();
                }
                const res = await mediaService.getMediaBatch(mode, randomPage, options);
                responseList = res.data;
            } else {
                const combinedIds = activeGenres.map(g => g.mal_id).join(',');
                const res = await mediaService.getMediaBatch(mode, 1, { limit: 25, genres: combinedIds });
                responseList = res.data;
            }

            // Centralized Library exclusion logic
            const filteredList = responseList.filter(item => !library.some(libItem => libItem.mal_id === item.mal_id));

            if (filteredList.length > 0) {
                return filteredList[Math.floor(Math.random() * filteredList.length)];
            }
            return null;
        } catch (error) {
            console.error('Rec Error:', error);
            return null;
        }
    }
};
