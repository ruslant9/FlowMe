// frontend/components/admin/MultiArtistSelector.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useMemo, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import Avatar from '../Avatar';

const MultiArtistSelector = ({ artists, value, onChange, required = true }) => {
    const [query, setQuery] = useState('');

    const selectedArtists = useMemo(() =>
        value.map(id => artists.find(a => a._id === id)).filter(Boolean)
    , [artists, value]);

    const handleSelect = (artist) => {
        if (!value.includes(artist._id)) {
            onChange([...value, artist._id]);
        }
        setQuery('');
    };
    
    const handleRemove = (artistId) => {
        onChange(value.filter(id => id !== artistId));
    };

    const filteredArtists =
        query === ''
            ? artists.filter(a => !value.includes(a._id)) // Не показывать уже выбранных
            : artists.filter((artist) =>
                !value.includes(artist._id) &&
                artist.name
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    return (
        <Combobox value={value} onChange={handleSelect} multiple>
            <div className="relative">
                <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                    {selectedArtists.map(artist => (
                        <div key={artist._id} className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/50 rounded-full px-2 py-1">
                            <Avatar size="sm" username={artist.name} avatarUrl={artist.avatarUrl} />
                            <span className="text-sm font-medium">{artist.name}</span>
                            <button type="button" onClick={() => handleRemove(artist._id)} className="p-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <Combobox.Input
                        className="flex-grow border-none py-1.5 text-sm leading-5 text-gray-900 dark:text-gray-200 bg-transparent focus:ring-0"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Добавьте исполнителей..."
                        required={required && value.length === 0}
                    />
                </div>
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 top-1/2 -translate-y-1/2">
                    <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </Combobox.Button>
                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery('')}
                >
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
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
            </div>
        </Combobox>
    );
};

export default MultiArtistSelector;