// frontend/components/admin/ArtistSelector.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { Check, ChevronDown, User } from 'lucide-react';
import Avatar from '../Avatar';

const ArtistSelector = ({ artists, value, onChange, required = true }) => {
    const [query, setQuery] = useState('');

    const selectedArtist = useMemo(() => 
        artists.find(a => a._id === value) || null
    , [artists, value]);

    const filteredArtists =
        query === ''
            ? artists
            : artists.filter((artist) =>
                artist.name
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    return (
        <Combobox value={selectedArtist} onChange={(artist) => onChange(artist ? artist._id : '')}>
            <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-slate-700 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                    <Combobox.Input
                        className="w-full border-none py-3 pl-4 pr-10 text-sm leading-5 text-gray-900 dark:text-gray-200 bg-white dark:bg-slate-700 focus:ring-0"
                        displayValue={(artist) => artist?.name || ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Начните вводить имя артиста..."
                        required={required && !value}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </Combobox.Button>
                </div>
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
                                                <span className={`ml-3 truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                    {artist.name}
                                                </span>
                                            </span>
                                            {selected ? (
                                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'}`}>
                                                    <Check className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            ) : null}
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

export default ArtistSelector;