// frontend/components/admin/AlbumSelector.jsx

import React, { useState, useMemo, Fragment } from 'react';
import { Combobox, Transition, Portal } from '@headlessui/react';
import { useFloating, useInteractions, useClick, useDismiss, FloatingPortal } from '@floating-ui/react';
import { Check, ChevronDown, Music } from 'lucide-react';

const AlbumSelector = ({ albums, value, onChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'bottom-start',
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);

    const { getReferenceProps, getFloatingProps } = useInteractions([
        click,
        dismiss,
    ]);
    
    const selectedAlbum = useMemo(() =>
        albums.find(a => a._id === value) || null
    , [albums, value]);

    const filteredAlbums =
        query === ''
            ? albums
            : albums.filter((album) =>
                album.title
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    return (
        <Combobox value={selectedAlbum} onChange={(album) => onChange(album ? album._id : '')} disabled={disabled}>
            <div className="relative">
                 <Combobox.Button 
                    as="div"
                    ref={refs.setReference} 
                    {...getReferenceProps()} 
                    className="relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-slate-700 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm"
                >
                    <Combobox.Input
                        className="w-full border-none py-3 pl-4 pr-10 text-sm leading-5 text-gray-900 dark:text-gray-200 bg-white dark:bg-slate-700 focus:ring-0 disabled:opacity-50"
                        displayValue={(album) => album?.title || ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="-- Сольный трек (сингл) --"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                </Combobox.Button>
                {isOpen && (
                    <FloatingPortal>
                        <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                            afterLeave={() => setQuery('')}
                        >
                            <Combobox.Options
                                ref={refs.setFloating}
                                style={{ ...floatingStyles, width: refs.reference.current?.getBoundingClientRect().width }}
                                {...getFloatingProps()}
                                className="absolute z-[60] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
                            >
                                <Combobox.Option
                                    value={null}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-200'
                                        }`
                                    }
                                >
                                   -- Сольный трек (сингл) --
                                </Combobox.Option>
                                 <div className="p-2">
                                    <Combobox.Input
                                        as="input"
                                        className="w-full border-gray-300 dark:border-slate-600 rounded-md py-2 pl-3 pr-2 text-sm leading-5 text-gray-900 dark:text-gray-200 bg-white dark:bg-slate-800 focus:ring-0"
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Поиск альбома..."
                                        autoFocus
                                    />
                                </div>
                                {filteredAlbums.length === 0 && query !== '' ? (
                                    <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-400">
                                        Альбом не найден.
                                    </div>
                                ) : (
                                    filteredAlbums.map((album) => (
                                        <Combobox.Option
                                            key={album._id}
                                            className={({ active }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                    active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-200'
                                                }`
                                            }
                                            value={album}
                                        >
                                            {({ selected, active }) => (
                                                <>
                                                    <span className="flex items-center">
                                                        <div className="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-600 mr-3 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                            {album.coverArtUrl ? (
                                                                <img src={album.coverArtUrl} alt={album.title} className="w-full h-full object-cover"/>
                                                            ) : (
                                                                <Music size={16} />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                {album.title}
                                                            </span>
                                                            <span className={`text-xs ${active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {album.artist.name}
                                                            </span>
                                                        </div>
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
                    </FloatingPortal>
                )}
            </div>
        </Combobox>
    );
};

export default AlbumSelector;