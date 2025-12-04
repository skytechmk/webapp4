import * as React from 'react';
import { Search, X, Filter, Grid, List } from 'lucide-react';
import { MediaItem, TranslateFn } from '../../../types';

/**
 * SearchBar Component
 *
 * A search input component with additional controls for:
 * - Clearing search
 * - Toggling view modes (grid/list)
 *
 * @component
 */
interface SearchBarProps {
    /** Current search query text */
    searchQuery: string;
    /** Function to update search query */
    setSearchQuery: (query: string) => void;
    /** Filtered media results, null if no filtering applied */
    filteredMedia: MediaItem[] | null;
    /** Function to set filtered media results */
    setFilteredMedia: (media: MediaItem[] | null) => void;
    /** Function to set the find me image */
    setFindMeImage: (image: MediaItem | null) => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    searchQuery,
    setSearchQuery,
    filteredMedia,
    setFilteredMedia,
    setFindMeImage,
    t
}) => {
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setFilteredMedia(null);
    };

    const toggleViewMode = () => {
        setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    };

    return (
        <div className="flex-1 min-w-[250px]">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={t('searchMedia')}
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {searchQuery && (
                    <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                        <X size={18} className="text-slate-400 hover:text-slate-600" />
                    </button>
                )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 mt-2">
                <button
                    onClick={toggleViewMode}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                    title={t('gridView')}
                >
                    <Grid size={18} />
                </button>
                <button
                    onClick={toggleViewMode}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                    title={t('listView')}
                >
                    <List size={18} />
                </button>
            </div>
        </div>
    );
};