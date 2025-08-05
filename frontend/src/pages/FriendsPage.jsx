import React, { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import Avatar from '../components/Avatar';
import { Search, UserPlus, UserCheck, UserX, Clock, Loader2, ShieldOff, History, Trash2 as TrashIcon, MessageSquare, Filter, ChevronDown, Check, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '../hooks/useModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Listbox, Transition, Combobox } from '@headlessui/react';
import { useUser } from '../hooks/useUser';
import MorePanel from '../components/MorePanel';

const API_URL = import.meta.env.VITE_API_URL;
const MAX_HISTORY_ITEMS = 5;

// ... (Остальные хелперы и компоненты внутри FriendsPage остаются без изменений) ...

const customRuLocaleForDistance = {
    ...ru,
    formatDistance: (token, count, options) => {
        if (token === 'lessThanXMinutes' || (token === 'xMinutes' && count === 1)) {
            return 'только что';
        }
        return ru.formatDistance(token, count, options);
    },
};

const formatLastSeen = (dateString) => {
    if (!dateString) return 'недавно';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: customRuLocaleForDistance });
    } else {
        if (date.getFullYear() === now.getFullYear()) {
            return format(date, 'd MMMM в HH:mm', { locale: ru });
        }
        return format(date, 'd MMMM yyyy г. в HH:mm', { locale: ru });
    }
};

const Spinner = ({ size = 20 }) => <Loader2 size={size} className="animate-spin" />;
const UserCardSkeleton = () => (
    <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            </div>
        </div>
        <div className="h-8 w-20 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
    </div>
);
const TabButton = ({ children, active, onClick, count }) => (
    <button onClick={onClick} className={`flex-shrink-0 flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${ active ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10' }`}>
        {children}
        {typeof count === 'number' && count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}>{count > 9 ? '9+' : count}</span>}
    </button>
);

const UserCard = ({ user, status, onAction, isProcessing, userStatuses, onWriteMessage, currentUser }) => {
    const handleClick = (e, actionName, userData) => {
        e.stopPropagation();
        e.preventDefault();
        onAction(actionName, userData);
    };

    const handleMessageClick = (e, userData) => {
        e.stopPropagation();
        e.preventDefault();
        onWriteMessage(userData);
    };

    const renderButton = (actionName, label, Icon, customClasses = '') => (
        <button
            onClick={(e) => handleClick(e, actionName, user)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${customClasses}`}
            disabled={isProcessing}
        >
            {isProcessing ? <Spinner size={16} /> : Icon && <Icon size={16} />}
            <span>{label}</span>
        </button>
    );

    const renderSecondaryButton = (actionName, label, Icon, customClasses = '') => (
        <button
            onClick={(e) => handleClick(e, actionName, user)}
            className={`p-2 rounded-lg transition-colors ${customClasses}`}
            title={label}
            disabled={isProcessing}
        >
            {isProcessing ? <Spinner size={16} /> : Icon && <Icon size={16} />}
        </button>
    );

    const renderButtons = () => {
        const blockButton = status === 'blocked'
            ? renderButton('unblock', 'Разблокировать', UserCheck, 'bg-green-500 text-white hover:bg-green-600')
            : renderSecondaryButton('blacklist', 'Заблокировать', ShieldOff, 'bg-slate-200 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-600 dark:text-white/70 hover:text-red-600 dark:hover:text-red-500');

        if (status === 'blocked') {
            return blockButton;
        }

        let mainButtons;

        switch (status) {
            case 'friend':
                mainButtons = (
                    <>
                        <button onClick={(e) => handleMessageClick(e, user)} className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors" title="Написать сообщение">
                            <MessageSquare size={18} />
                        </button>
                        {renderSecondaryButton('remove', 'В друзьях', UserCheck, 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-white/70')}
                    </>
                );
                break;
            case 'incoming':
                mainButtons = (
                    <>
                        {renderButton('accept', 'Принять', UserCheck, 'bg-green-500 text-white hover:bg-green-600')}
                        {renderButton('decline', 'Отклонить', UserX, 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20')}
                    </>
                );
                break;
            case 'outgoing':
                mainButtons = (
                    <>
                        <button onClick={(e) => handleMessageClick(e, user)} className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors" title="Написать сообщение">
                            <MessageSquare size={18} />
                        </button>
                        {renderButton('cancel', 'Отменить', Clock, 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20')}
                    </>
                );
                break;
            case 'search_result':
                mainButtons = (
                     <>
                        {renderButton('add', 'Добавить', UserPlus, 'bg-blue-500 text-white hover:bg-blue-600')}
                        <button onClick={(e) => handleMessageClick(e, user)} className="p-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Написать сообщение">
                            <MessageSquare size={18} />
                        </button>
                    </>
                );
                break;
            default:
                mainButtons = null;
        }

        return (
            <div className="flex items-center space-x-2">
                {mainButtons}
                {blockButton}
            </div>
        );
    };

    const getStatusText = useCallback(() => {
        if (currentUser?.privacySettings?.viewOnlineStatus === 'private') {
            return 'Недавно';
        }

        if (status === 'blocked_by_them') {
            return 'Был(а) очень давно';
        }

        const interlocutorStatus = userStatuses?.[user._id];
        const privacySource = interlocutorStatus?.privacySettings || user?.privacySettings;
        const privacySetting = privacySource?.viewOnlineStatus || 'everyone';

        const canSeeDetailedStatus = (privacySetting === 'everyone') ||
                                     (privacySetting === 'friends' && status === 'friend');

        if (interlocutorStatus?.isOnline && canSeeDetailedStatus) {
            return <span className="text-green-500">Онлайн</span>;
        }

        if (canSeeDetailedStatus) {
            const lastSeenTime = interlocutorStatus?.lastSeen || user.lastSeen;
            if (lastSeenTime) {
                return `Был(а) ${formatLastSeen(lastSeenTime)}`;
            }
        }
        return 'Недавно';
    }, [user, status, userStatuses, currentUser]);

    const canShowOnlineIndicator = useMemo(() => {
        if (currentUser?.privacySettings?.viewOnlineStatus === 'private') {
            return false;
        }

        if (status === 'blocked_by_them') {
            return false;
        }
        
        const interlocutorStatus = userStatuses?.[user._id];
        if (!interlocutorStatus || !interlocutorStatus.isOnline) {
            return false;
        }

        const privacySource = interlocutorStatus?.privacySettings || user?.privacySettings;
        const privacySetting = privacySource?.viewOnlineStatus || 'everyone';

        return privacySetting === 'everyone' || (privacySetting === 'friends' && status === 'friend');
    }, [user.privacySettings, status, userStatuses, currentUser]);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Полностью переработанная структура карточки для адаптивности ---
    return (
        <Link to={`/profile/${user._id}`} className="block p-3 rounded-lg transition-colors hover:bg-slate-100/50 dark:hover:bg-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-4 min-w-0">
                    {(() => {
                        const border = user.premiumCustomization?.avatarBorder;
                        const borderClass = border?.type?.startsWith('animated') ? `premium-border-${border.type}` : '';
                        const staticBorderStyle = border?.type === 'static' ? { padding: '4px', backgroundColor: border.value } : {};
                        return (
                            <div className={`relative rounded-full ${borderClass}`} style={staticBorderStyle}>
                                 <Avatar
                                    username={user.username}
                                    fullName={user.fullName}
                                    avatarUrl={user.avatar}
                                    size="md"
                                    isPremium={user.premium?.isActive}
                                    customBorder={border}
                                />
                                {canShowOnlineIndicator && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" title="Онлайн"></div>
                                )}
                            </div>
                        );
                    })()}
                    <div className="min-w-0">
                        <p className="font-semibold truncate">{user.fullName || user.username}</p>
                        <div className="text-sm text-slate-500 dark:text-white/60 h-4 flex items-center space-x-1.5">
                            <span className="truncate">{getStatusText()}</span>
                            {user.city && (
                                <>
                                    <span className="opacity-50">•</span>
                                    <span className="truncate">{user.city}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                    {renderButtons()}
                </div>
            </div>
        </Link>
    );
};
// --- КОНЕЦ ИСПРАВЛЕНИЯ 2 ---

const FriendsPage = () => {
    useTitle('Друзья');
    const location = useLocation();
    const [friendsSubTab, setFriendsSubTab] = useState('important');
    const [importantFriends, setImportantFriends] = useState([]);
    const [allFriends, setAllFriends] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'descending' });
    const [activeTab, setActiveTab] = useState(location.state?.defaultTab || 'friends');
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [blacklist, setBlacklist] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [processingActions, setProcessingActions] = useState([]);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchWrapperRef = useRef(null);
    const searchInputRef = useRef(null);
    const { showConfirmation } = useModal();
    const { userStatuses } = useWebSocket();
    const navigate = useNavigate();
    const { currentUser } = useUser();
    
    const [isMorePanelOpen, setIsMorePanelOpen] = useState(false);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ city: '', interests: [] });
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [cities, setCities] = useState([]);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [loadingCities, setLoadingCities] = useState(false);

    const [searchHistory, setSearchHistory] = useState([]);

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/user/locations/countries`, { headers: { Authorization: `Bearer ${token}` } });
                setCountries(res.data);
                const defaultCountry = res.data.find(c => c.code === 'RU') || res.data[0];
                setSelectedCountry(defaultCountry);
            } catch (error) { toast.error("Не удалось загрузить страны"); }
        };
        fetchCountries();
    }, []);

    const fetchCities = useCallback(async (search) => {
        if (!selectedCountry) return;
        setLoadingCities(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/locations/cities?countryCode=${selectedCountry.code}&search=${search}&page=1`, { headers: { Authorization: `Bearer ${token}` } });
            setCities(res.data.cities);
        } catch (error) { toast.error("Не удалось загрузить города"); } 
        finally { setLoadingCities(false); }
    }, [selectedCountry]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchCities(citySearchQuery);
        }, 300);
        return () => clearTimeout(debounce);
    }, [citySearchQuery, fetchCities]);

    const runSearch = useCallback(async (currentSearchTerm, currentFilters) => {
        const { city, interests } = currentFilters;
        if (!currentSearchTerm.trim() && !city && interests.length === 0) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setIsDropdownVisible(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (currentSearchTerm.trim()) params.append('q', currentSearchTerm.trim());
            if (city) params.append('city', city);
            if (interests.length > 0) params.append('interests', interests.join(','));

            const res = await axios.get(`${API_URL}/api/user/search?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data);
            if (currentSearchTerm.trim()) addToSearchHistory(currentSearchTerm);
        } catch (error) {
            toast.error('Ошибка при поиске.');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            runSearch(searchTerm, filters);
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, filters, runSearch]);

    const handleInterestToggle = (interest) => {
        setFilters(prev => ({
            ...prev,
            interests: prev.interests.includes(interest) 
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const resetFilters = () => {
        setFilters({ city: '', interests: [] });
        setCitySearchQuery('');
    };

    const renderFilters = () => (
        <AnimatePresence>
            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                >
                    <div className="pt-4 space-y-4 border-t border-slate-200 dark:border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-600 dark:text-white/70 mb-1 block">Страна</label>
                                <Listbox value={selectedCountry} onChange={(country) => { setSelectedCountry(country); setFilters(prev => ({ ...prev, city: '' })); }}>
                                    <div className="relative">
                                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-slate-100 dark:bg-slate-800 py-2.5 pl-3 pr-10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 h-[44px]">
                                            <span className="block truncate">{selectedCountry?.name || 'Выберите страну'}</span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" /></span>
                                        </Listbox.Button>
                                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-30">
                                                {countries.map((country) => (<Listbox.Option key={country.code} className={({ active }) => `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={country}>{({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{country.name}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5" /></span>)}</>)}</Listbox.Option>))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-600 dark:text-white/70 mb-1 block">Город</label>
                                <Combobox value={filters.city} onChange={(city) => setFilters(prev => ({ ...prev, city }))} disabled={!selectedCountry}>
                                     <div className="relative">
                                        <Combobox.Input onChange={(e) => setCitySearchQuery(e.target.value)} displayValue={(c) => c || ''} className="w-full h-[44px] px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder={!selectedCountry ? "Сначала выберите страну" : "Поиск города..."}/>
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></Combobox.Button>
                                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-30">
                                            {loadingCities ? <div className="py-2 text-center"><Spinner/></div> :
                                             cities.length > 0 ? cities.map((city, i) => <Combobox.Option key={`${city}-${i}`} value={city} className={({ active }) => `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`}>{city}</Combobox.Option>) :
                                             citySearchQuery.trim() !== '' && (<div className="relative cursor-default select-none py-2 px-4 text-slate-500 dark:text-slate-400">Город не найден.</div>)
                                            }
                                        </Combobox.Options>
                                    </div>
                                </Combobox>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-600 dark:text-white/70 mb-2 block">Интересы</label>
                            <div className="flex flex-wrap gap-2">
                                {availableInterests.map(interest => {
                                    const isSelected = filters.interests.includes(interest);
                                    return <button key={interest} onClick={() => handleInterestToggle(interest)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20'}`}>{interest}</button>
                                })}
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button onClick={resetFilters} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg">Сбросить</button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
    const addToSearchHistory = useCallback((term) => {
        const trimmedTerm = term.trim();
        if (!trimmedTerm) return;
        setSearchHistory(prevHistory => {
            const newHistory = prevHistory.filter(item => item.toLowerCase() !== trimmedTerm.toLowerCase());
            return [trimmedTerm, ...newHistory].slice(0, MAX_HISTORY_ITEMS);
        });
    }, []);
    useEffect(() => {
        try { const storedHistory = localStorage.getItem('searchHistory'); if (storedHistory) { setSearchHistory(JSON.parse(storedHistory)); } } catch (error) { console.error("Failed to load search history:", error); setSearchHistory([]); }
    }, []);
    useEffect(() => { localStorage.setItem('searchHistory', JSON.stringify(searchHistory)); }, [searchHistory]);
    const clearSearchHistory = () => { showConfirmation({ title: "Очистить историю поиска?", message: "Вы уверены, что хотите удалить все сохраненные поисковые запросы?", onConfirm: () => { setSearchHistory([]); toast.success('История поиска очищена!'); } }); };
    useEffect(() => { function handleClickOutside(event) { if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) { setIsDropdownVisible(false); } } document.addEventListener("mousedown", handleClickOutside); return () => { document.removeEventListener("mousedown", handleClickOutside); }; }, [searchWrapperRef]);
    useEffect(() => { if (location.state?.defaultTab) { navigate(location.pathname, { replace: true }); } }, [location.state, navigate, location.pathname]);
    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/friends`, { headers: { Authorization: `Bearer ${token}` } });
            setImportantFriends(res.data.importantFriends || []);
            setAllFriends(res.data.allFriends || []);
            setIncoming(res.data.incoming || []);
            setOutgoing(res.data.outgoing || []);
            setBlacklist(res.data.blacklist || []);
        } catch (error) { toast.error('Не удалось обновить данные.'); } 
        finally { if (showLoader) setLoading(false); }
    }, []);
    useEffect(() => {
        fetchData(true);
        const handleFriendsDataUpdated = () => fetchData(false);
        window.addEventListener('friendsDataUpdated', handleFriendsDataUpdated);
        return () => window.removeEventListener('friendsDataUpdated', handleFriendsDataUpdated);
    }, [fetchData]);
    const handleWriteMessage = async (user) => {
        setProcessingActions(prev => [...prev, user._id]);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/with/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
            navigate('/messages', { state: { conversation: res.data, isNewEmptyChat: !res.data.lastMessage?._id }, replace: true });
        } catch (error) { toast.error(error.response?.data?.message || "Не удалось начать чат."); } 
        finally { setProcessingActions(prev => prev.filter(id => id !== user._id)); }
    };
    const handleAction = async (action, user) => {
        const { _id: userId, fullName, username } = user; const name = fullName || username;
        const actionsMap = {
            add: { method: 'post', url: `/api/user/send-request/${userId}`, success: 'Запрос отправлен' },
            accept: { method: 'post', url: `/api/user/accept-request/${userId}`, success: 'Запрос принят', confirm: { title: 'Принять заявку?', message: `Добавить ${name} в друзья?` } },
            decline: { method: 'post', url: `/api/user/decline-request/${userId}`, success: 'Запрос отклонен', confirm: { title: 'Отклонить заявку?', message: `Отклонить заявку в друзья от ${name}?` } },
            cancel: { method: 'post', url: `/api/user/cancel-request/${userId}`, success: 'Запрос отменен', confirm: { title: 'Отменить запрос?', message: `Отменить ваш запрос в друзья к ${name}?` } },
            remove: { method: 'post', url: `/api/user/remove-friend/${userId}`, success: 'Пользователь удален из друзей', confirm: { title: 'Удалить из друзей?', message: `Вы уверены, что хотите удалить ${name} из друзей?` } },
            blacklist: { method: 'post', url: `/api/user/blacklist/${userId}`, success: 'Пользователь заблокирован', confirm: { title: 'Заблокировать пользователя?', message: `Вы уверены, что хотите заблокировать ${name}? Это действие нельзя отменить.` } },
            unblock: { method: 'post', url: `/api/user/unblacklist/${userId}`, success: 'Пользователь разблокирован', confirm: { title: 'Разблокировать пользователя?', message: `Вы уверены, что хотите разблокировать ${name}?` } },
        };
        const currentAction = actionsMap[action]; if (!currentAction) return;
        const performApiCall = async () => {
            setProcessingActions(prev => [...prev, userId]);
            try {
                const token = localStorage.getItem('token');
                await axios[currentAction.method](`${API_URL}${currentAction.url}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                toast.success(currentAction.success);
                fetchData(false); runSearch(searchTerm, filters);
            } catch (error) { toast.error(error.response?.data?.message || `Ошибка: ${action}`); } 
            finally { setProcessingActions(prev => prev.filter(id => id !== userId)); }
        };
        if (currentAction.confirm) { showConfirmation({ title: currentAction.confirm.title, message: currentAction.confirm.message, onConfirm: performApiCall, }); } else { performApiCall(); }
    };
    const handleTabClick = (tab) => { setActiveTab(tab); setSearchTerm(''); setSearchResults([]); setIsDropdownVisible(false); };
    const handleSearchInputFocus = () => { setIsDropdownVisible(true); };
    const handleSearchHistoryClick = (historyTerm) => { setSearchTerm(historyTerm); searchInputRef.current?.focus(); };
    const sortedAllFriends = useMemo(() => {
        if (!allFriends) return [];
        const sorted = [...allFriends];
        sorted.sort((a, b) => {
            if (sortConfig.key === 'fullName') {
                const nameA = a.fullName || a.username || '';
                const nameB = b.fullName || b.username || '';
                return sortConfig.direction === 'ascending'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            }
            if (sortConfig.key === 'friendshipDate') {
                const dateA = a.friendshipDate ? new Date(a.friendshipDate).getTime() : 0;
                const dateB = b.friendshipDate ? new Date(b.friendshipDate).getTime() : 0;
                return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
            }
            return (b.score || 0) - (a.score || 0);
        });
        return sorted;
    }, [allFriends, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        if (key === 'friendshipDate') {
            direction = 'descending'; 
            if (sortConfig.key === key && sortConfig.direction === 'descending') {
                direction = 'ascending';
            }
        }
        setSortConfig({ key, direction });
    };
    const renderDropdownContent = () => {
        const hasActiveSearch = searchTerm.trim() || filters.city || filters.interests.length > 0;
        if (hasActiveSearch) {
            if (isSearching && searchResults.length === 0) return <div className="text-center p-4 text-slate-500 dark:text-white/60">Поиск...</div>;
            else if (!isSearching && searchResults.length === 0) return <div className="text-center p-4 text-slate-500 dark:text-white/60">Ничего не найдено.</div>;
            else return (<div className="space-y-1">{searchResults.map(user => (<UserCard key={user._id} user={user} status={user.status === 'none' ? 'search_result' : user.status} onAction={handleAction} isProcessing={processingActions.includes(user._id)} userStatuses={userStatuses} onWriteMessage={() => handleWriteMessage(user)} currentUser={currentUser} />))}</div>);
        } else {
            if (searchHistory.length === 0) return <div className="text-center p-4 text-slate-500 dark:text-white/60">Нет недавних запросов.</div>;
            return (<div className="space-y-1"><p className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-white/50">Недавние запросы</p>{searchHistory.map((term, index) => (<div key={index} className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-slate-100/50 dark:hover:bg-white/5 cursor-pointer" onClick={() => handleSearchHistoryClick(term)}><div className="flex items-center space-x-2"><History size={16} className="text-slate-400 dark:text-white/40 flex-shrink-0" /><span className="truncate">{term}</span></div></div>))}<div className="border-t border-slate-200 dark:border-white/10 pt-2 mt-2"><button onClick={clearSearchHistory} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"><TrashIcon size={16} /><span>Очистить историю поиска</span></button></div></div>);
        }
    };

    const navItems = [
        { key: 'friends', label: 'Мои друзья', icon: UserCheck, count: allFriends.length, onClick: () => handleTabClick('friends') },
        { key: 'incoming', label: 'Входящие', icon: UserPlus, count: incoming.length, onClick: () => handleTabClick('incoming') },
        { key: 'outgoing', label: 'Исходящие', icon: Clock, count: outgoing.length, onClick: () => handleTabClick('outgoing') },
        { key: 'blacklist', label: 'Черный список', icon: ShieldOff, count: blacklist.length, onClick: () => handleTabClick('blacklist') }
    ];
    const visibleCount = 2;
    const visibleItems = navItems.slice(0, visibleCount);
    const hiddenItems = navItems.slice(visibleCount);
    const isMoreButtonActive = hiddenItems.some(item => item.key === activeTab);
    
    const renderTabContent = () => {
        if (loading) return (<div className="space-y-2">{[...Array(3)].map((_, i) => <UserCardSkeleton key={i} />)}</div>);
        let list, status, emptyMessage;

        if (activeTab === 'friends') {
            const listToRender = friendsSubTab === 'important' ? importantFriends : sortedAllFriends;
            const emptyMessageText = friendsSubTab === 'important'
                ? 'Здесь будут ваши самые важные друзья. Чаще общайтесь, лайкайте и комментируйте!'
                : 'У вас пока нет друзей. Найдите новых знакомых в поиске!';

            return (
                <div>
                    <div className="flex items-center space-x-2 mb-4 p-1 bg-slate-200/70 dark:bg-black/30 rounded-lg">
                        <button onClick={() => setFriendsSubTab('important')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${friendsSubTab === 'important' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}>
                            Важные
                        </button>
                        <button onClick={() => setFriendsSubTab('all')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${friendsSubTab === 'all' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}>
                            Все друзья ({allFriends.length})
                        </button>
                    </div>

                    {friendsSubTab === 'all' && allFriends.length > 0 && (
                        <div className="flex justify-end items-center space-x-4 mb-2 text-sm">
                            <button onClick={() => requestSort('fullName')} className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                                <span>Сортировать по имени</span>
                                {sortConfig.key === 'fullName' && (sortConfig.direction === 'ascending' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>)}
                            </button>
                            <button onClick={() => requestSort('friendshipDate')} className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                                <span>Сортировать по дате</span>
                                {sortConfig.key === 'friendshipDate' && (sortConfig.direction === 'descending' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>)}
                            </button>
                        </div>
                    )}

                    {listToRender.length === 0 ? (
                        <div className="text-center p-10 text-slate-500 dark:text-white/60">{emptyMessageText}</div>
                    ) : (
                        <div className="space-y-2">{listToRender.map(user => (<UserCard key={user._id} user={user} status="friend" onAction={handleAction} isProcessing={processingActions.includes(user._id)} userStatuses={userStatuses} onWriteMessage={() => handleWriteMessage(user)} currentUser={currentUser} />))}</div>
                    )}
                </div>
            );
        }

        switch (activeTab) {
            case 'incoming': list = incoming; status = 'incoming'; emptyMessage = 'Нет входящих заявок в друзья.'; break;
            case 'outgoing': list = outgoing; status = 'outgoing'; emptyMessage = 'Нет исходящих заявок в друзья.'; break;
            case 'blacklist': list = blacklist; status = 'blocked'; emptyMessage = 'Ваш черный список пуст.'; break;
            default: return null;
        }
        if (list.length === 0) return <div className="text-center p-10 text-slate-500 dark:text-white/60">{emptyMessage}</div>;
        return (<div className="space-y-2">{list.map(user => { if (!user) return null; return (<UserCard key={user._id} user={user} status={user.status || status} onAction={handleAction} isProcessing={processingActions.includes(user._id)} userStatuses={userStatuses} onWriteMessage={() => handleWriteMessage(user)} currentUser={currentUser} />); })}</div>);
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Друзья</h1>
                <div className="relative mb-6" ref={searchWrapperRef}>
                    <div className="flex items-center space-x-2">
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                            <input ref={searchInputRef} type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={handleSearchInputFocus} placeholder="Поиск по имени или @username" className="w-full pl-12 pr-10 py-3 rounded-lg bg-slate-200/70 dark:bg-black/30 text-slate-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:focus:ring-blue-500" />
                            {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/60"><Spinner size={18} /></div>}
                        </div>
                        <button onClick={() => setShowFilters(f => !f)} className={`p-3 rounded-lg transition-colors flex-shrink-0 ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-200/70 dark:bg-black/30 hover:bg-slate-300 dark:hover:bg-black/40'}`} title="Фильтры">
                            <Filter size={20} />
                        </button>
                    </div>
                    {renderFilters()}
                    <AnimatePresence>
                        {isDropdownVisible && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute top-full mt-2 w-full bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto p-2">{renderDropdownContent()}</motion.div>}
                    </AnimatePresence>                </div>
                
                <div className="hidden md:flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-4 mb-4 overflow-x-auto">
                    {navItems.map(item => (
                        <TabButton key={item.key} active={activeTab === item.key} onClick={item.onClick} count={item.count}>
                            <item.icon size={16} /><span>{item.label}</span>
                        </TabButton>
                    ))}
                </div>

                <div className="md:hidden flex items-center space-x-1 border-b border-slate-200 dark:border-white/10 pb-4 mb-4">
                    {visibleItems.map(item => (
                        <TabButton key={item.key} active={activeTab === item.key} onClick={item.onClick} count={item.count}>
                            <item.icon size={16} /><span>{item.label}</span>
                        </TabButton>
                    ))}
                    {hiddenItems.length > 0 && (
                        <TabButton active={isMoreButtonActive} onClick={() => setIsMorePanelOpen(true)}>
                            <MoreHorizontal size={16} /><span>Еще</span>
                        </TabButton>
                    )}
                </div>
                <MorePanel isOpen={isMorePanelOpen} onClose={() => setIsMorePanelOpen(false)}>
                    {hiddenItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => { item.onClick(); setIsMorePanelOpen(false); }}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
                              ${activeTab === item.key ? 'bg-blue-100 dark:bg-blue-500/20 font-semibold' : ''}
                            `}
                        >
                            <div className="flex items-center space-x-4">
                                <item.icon size={22} className={activeTab === item.key ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
                                <span>{item.label}</span>
                            </div>
                            {item.count > 0 && 
                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-white/10">{item.count > 9 ? '9+' : item.count}</span>
                            }
                        </button>
                    ))}
                </MorePanel>
                
                <div>{renderTabContent()}</div>
            </div>
        </main>
    );
};

export default FriendsPage;