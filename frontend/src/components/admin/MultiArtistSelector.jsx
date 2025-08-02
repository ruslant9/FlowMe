// frontend/components/admin/MultiArtistSelector.jsx

import React, { useState, useMemo, Fragment } from 'react';
import { Combobox, Transition, Portal } from '@headlessui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import Avatar from '../Avatar';

const MultiArtistSelector = ({ artists, value, onChange, required = true, excludeIds = [] }) => {
    const [query, setQuery] = useState('');

    const selectedArtists = useMemo(() =>
        value.map(id => artists.find(a => a._id === id)).filter(Boolean)
    , [artists, value]);

    const handleSelect = (artist) => {
        if (!value.includes(artist._id)) {
            onChange([...value, artist._id]);
        }
    };
    
    const handleRemove = (artistId) => {
        onChange(value.filter(id => id !== artistId));
    };
    
    const availableArtists = useMemo(() => 
        artists.filter(a => !excludeIds.includes(a._id))
    , [artists, excludeIds]);

    const filteredArtists =
        query === ''
            ? availableArtists.filter(a => !value.includes(a._id)) // Не показывать уже выбранных
            : availableArtists.filter((artist) =>
                !value.includes(artist._id) &&
                artist.name
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    return (
        <Combobox value={selectedArtists} onChange={handleSelect} multiple>
            <div className="relative">
                <Combobox.Button className="w-full border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                    <div className="flex flex-wrap gap-2 p-2 items-center min-h-[44px]">
                        {selectedArtists.map(artist => (
                            <div key={artist._id} className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/50 rounded-full pl-1 pr-2 py-0.5">
                                <Avatar size="sm" username={artist.name} avatarUrl={artist.avatarUrl} />
                                <span className="text-sm font-medium">{artist.name}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(artist._id); }} className="p-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {value.length === 0 && <span className="text-sm text-slate-400 pl-2">Добавьте исполнителей...</span>}
                        <ChevronDown className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    </div>
                </Combobox.Button>
                <Portal>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options className="absolute z-[60] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            <div className="p-2">
                               <Combobox.Input
                                    className="w-full border-gray-300 dark:border-slate-600 rounded-md py-2 pl-3 pr-2 text-sm leading-5 text-gray-900 dark:text-gray-200 bg-white dark:bg-slate-800 focus:ring-0"
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Поиск артиста..."
                                />
                            </div>
                            {filteredArtists.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-400">
                                    Артист не найден.
                                </div>
                            ) : (
                                filteredArtists.map((artist) => (
                                    <Combobox.Option
                                        key={artist._id}
                                        className={({ active }) =>
                                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-200'
                                            }`
                                        }
                                        value={artist}
                                    >
                                        {({ selected, active }) => (
                                            <>
                                                <span className="flex items-center">
                                                    <Avatar
                                                        size="sm"
                                                        username={artist.name}
                                                        avatarUrl={artist.avatarUrl}
                                                    />
                                                    <span className={`ml-3 truncate font-normal`}>
                                                        {artist.name}
                                                    </span>
                                                </span>
                                            </>
                                        )}
                                    </Combobox.Option>
                                ))
                            )}
                        </Combobox.Options>
                    </Transition>
                </Portal>
            </div>
        </Combobox>
    );
};

export default MultiArtistSelector;