// frontend/src/pages/WorkshopPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Brush, Library, Search, Loader2, PlusCircle, Edit, Trash2, CheckCircle, Plus, X, Crown, Sticker, Smile } from 'lucide-react';
import CreateEditPackModal from '../components/workshop/CreateEditPackModal';
import PackCard from '../components/workshop/PackCard';
import { useUser } from '../context/UserContext';
import { useModal } from '../hooks/useModal';
import PackPreviewModal from '../components/workshop/PackPreviewModal';
import PremiumRequiredModal from '../components/modals/PremiumRequiredModal';

const API_URL = import.meta.env.VITE_API_URL;

const TabButton = ({ active, onClick, children, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            active 
            ? 'border-blue-500 text-blue-500' 
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
        }`}
    >
        <Icon size={18} />
        <span>{children}</span>
    </button>
);

// --- НАЧАЛО ИЗМЕНЕНИЯ: Компонент для под-вкладок ---
const SubTabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            active 
            ? 'bg-slate-200 dark:bg-white/20 text-slate-800 dark:text-white' 
            : 'text-slate-500 dark:text-white/60 hover:bg-slate-200/50 dark:hover:bg-white/10'
        }`}
    >
        {children}
    </button>
);
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

const WorkshopPage = () => {
    useTitle('Мастерская');
    const [activeTab, setActiveTab] = useState('my');
    const { currentUser, refetchPacks } = useUser();
    const { showConfirmation } = useModal();
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Состояние для фильтра по типу ---
    const [activeTypeFilter, setActiveTypeFilter] = useState('all'); // 'all', 'sticker', 'emoji'
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const [myPacks, setMyPacks] = useState([]);
    const [addedPacks, setAddedPacks] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchPage, setSearchPage] = useState(1);
    const [searchTotalPages, setSearchTotalPages] = useState(1);
    
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPack, setEditingPack] = useState(null);
    const [previewingPack, setPreviewingPack] = useState(null);
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

    const addedPackIds = useMemo(() => new Set(addedPacks.map(p => p._id)), [addedPacks]);

    // --- НАЧАЛО ИЗМЕНЕНИЯ: Модифицируем fetchData для поддержки фильтра ---
    const fetchData = useCallback(async (tab, query = '', page = 1, type = 'all') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { headers: { Authorization: `Bearer ${token}` } };
            const typeParam = type === 'all' ? '' : `?type=${type}`;
            
            if (tab === 'my') {
                const res = await axios.get(`${API_URL}/api/workshop/packs/my${typeParam}`, headers);
                setMyPacks(res.data);
            } else if (tab === 'added') {
                const res = await axios.get(`${API_URL}/api/workshop/packs/added${typeParam}`, headers);
                setAddedPacks(res.data);
            } else if (tab === 'search') {
                const searchParams = new URLSearchParams({ q: query, page });
                if (type !== 'all') {
                    searchParams.append('type', type);
                }
                const res = await axios.get(`${API_URL}/api/workshop/packs/search?${searchParams.toString()}`, headers);
                setSearchResults(res.data.packs);
                setSearchTotalPages(res.data.totalPages);
                setSearchPage(res.data.currentPage);
            }
        } catch (error) {
            toast.error(`Не удалось загрузить данные для вкладки "${tab}"`);
        } finally {
            setLoading(false);
        }
    }, []);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    
    useEffect(() => {
        fetchData(activeTab, searchQuery, 1, activeTypeFilter);
    }, [activeTab, activeTypeFilter, fetchData]);

    useEffect(() => {
        if (activeTab === 'search') {
            const debounce = setTimeout(() => {
                fetchData('search', searchQuery, 1, activeTypeFilter);
            }, 300);
            return () => clearTimeout(debounce);
        }
    }, [searchQuery, activeTab, activeTypeFilter, fetchData]);

    const handleCreatePack = () => {
        if (!currentUser?.premium?.isActive) {
            setIsPremiumModalOpen(true);
            return;
        }
        setEditingPack(null);
        setIsModalOpen(true);
    };

    const handleEditPack = (pack) => {
        setEditingPack(pack);
        setIsModalOpen(true);
    };

    const handleDeletePack = (pack) => {
        showConfirmation({
            title: `Удалить пак "${pack.name}"?`,
            message: "Это действие необратимо. Пак будет удален у всех пользователей, которые его добавили.",
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/workshop/packs/${pack._id}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Пак удален', { id: toastId });
                    fetchData(activeTab, searchQuery, 1, activeTypeFilter);
                    refetchPacks();
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Ошибка удаления', { id: toastId });
                }
            }
        });
    };

    const handleAddOrRemovePack = async (pack) => {
        const isAdded = addedPackIds.has(pack._id);
        const endpoint = `${API_URL}/api/workshop/packs/${pack._id}/add`;
        const method = isAdded ? 'delete' : 'post';
        
        try {
            const token = localStorage.getItem('token');
            await axios[method](endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(isAdded ? 'Пак удален из вашей библиотеки' : 'Пак добавлен в вашу библиотеку');
            // Обновляем список добавленных паков, чтобы кнопка сразу изменилась
            const addedRes = await axios.get(`${API_URL}/api/workshop/packs/added`, { headers: { Authorization: `Bearer ${token}` } });
            setAddedPacks(addedRes.data);
            refetchPacks();
        } catch (error) {
            toast.error('Произошла ошибка');
        }
    };
    
    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8" /></div>;
        }

        let packs, emptyMessage, cardActions;
        
        switch (activeTab) {
            case 'my':
                packs = myPacks;
                emptyMessage = 'Вы еще не создали ни одного пака.';
                cardActions = (pack) => (
                    <>
                        <button onClick={() => handleEditPack(pack)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"><Edit size={16} /></button>
                        <button onClick={() => handleDeletePack(pack)} className="p-2 bg-red-100 dark:bg-red-900/50 text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"><Trash2 size={16} /></button>
                    </>
                );
                break;
            case 'added':
                packs = addedPacks;
                emptyMessage = 'Вы еще не добавили ни одного пака. Найдите их в поиске!';
                cardActions = (pack) => {
                    const isCreator = pack.creator._id === currentUser._id;
                    if (isCreator) return null;
                    return (
                        <button onClick={() => handleAddOrRemovePack(pack)} className="px-3 py-2 text-sm font-semibold bg-red-100 dark:bg-red-900/50 text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 flex items-center space-x-2">
                            <X size={16} /><span>Удалить</span>
                        </button>
                    );
                };
                break;
            case 'search':
                packs = searchResults;
                emptyMessage = searchQuery ? 'По вашему запросу ничего не найдено.' : 'Найдите стикеры и эмодзи, созданные другими пользователями.';
                cardActions = (pack) => {
                    const isCreator = pack.creator._id === currentUser._id;
                    if (isCreator) return <span className="text-xs font-semibold text-slate-500">Ваш пак</span>;
                    
                    const isPremade = pack.creator.username === 'Flow me';
                    if (isPremade) {
                        return (
                            <button onClick={() => !currentUser?.premium?.isActive && setIsPremiumModalOpen(true)} className="flex items-center space-x-2 text-xs font-semibold text-yellow-500">
                                <Crown size={14} />
                                <span>Premium</span>
                            </button>
                        );
                    }

                    const isAdded = addedPackIds.has(pack._id);
                    return (
                        <button onClick={() => handleAddOrRemovePack(pack)} className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center space-x-2 ${isAdded ? 'bg-green-100 dark:bg-green-900/50 text-green-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                            {isAdded ? <CheckCircle size={16} /> : <Plus size={16} />}
                            <span>{isAdded ? 'Добавлено' : 'Добавить'}</span>
                        </button>
                    );
                };
                break;
            default:
                return null;
        }

        return (
            <div>
                {packs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packs.map(pack => 
                            <PackCard key={pack._id} pack={pack} onLongPress={setPreviewingPack}>
                                {cardActions(pack)}
                            </PackCard>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-500">{emptyMessage}</div>
                )}
                {activeTab === 'search' && searchTotalPages > 1 && (
                     <div className="flex justify-center items-center space-x-2 mt-6">
                        <button onClick={() => fetchData('search', searchQuery, searchPage - 1, activeTypeFilter)} disabled={searchPage === 1} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-50">Назад</button>
                        <span>Стр. {searchPage} из {searchTotalPages}</span>
                        <button onClick={() => fetchData('search', searchQuery, searchPage + 1, activeTypeFilter)} disabled={searchPage === searchTotalPages} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-50">Вперед</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
            <CreateEditPackModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isEditMode={!!editingPack}
                initialData={editingPack}
                onSave={() => {
                    fetchData('my', '', 1, activeTypeFilter);
                    refetchPacks();
                }}
            />
            <PackPreviewModal
                isOpen={!!previewingPack}
                onClose={() => setPreviewingPack(null)}
                pack={previewingPack}
            />
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Мастерская</h1>
                    {activeTab === 'my' && (
                        <button onClick={handleCreatePack} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                            <PlusCircle size={18} /><span>Создать пак</span>
                        </button>
                    )}
                </div>
                
                <div className="flex space-x-2 border-b border-slate-300 dark:border-slate-700 mb-6">
                    <TabButton active={activeTab === 'my'} onClick={() => setActiveTab('my')} icon={Brush}>Мои паки</TabButton>
                    <TabButton active={activeTab === 'added'} onClick={() => setActiveTab('added')} icon={Library}>Добавленные</TabButton>
                    <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={Search}>Поиск паков</TabButton>
                </div>

                {/* --- НАЧАЛО ИЗМЕНЕНИЯ: Панель с под-вкладками --- */}
                <div className="flex items-center space-x-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <SubTabButton active={activeTypeFilter === 'all'} onClick={() => setActiveTypeFilter('all')}>Все</SubTabButton>
                    <SubTabButton active={activeTypeFilter === 'sticker'} onClick={() => setActiveTypeFilter('sticker')}>Стикеры</SubTabButton>
                    <SubTabButton active={activeTypeFilter === 'emoji'} onClick={() => setActiveTypeFilter('emoji')}>Эмодзи</SubTabButton>
                </div>
                {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}

                {activeTab === 'search' && (
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по названию пака..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg"/>
                    </div>
                )}

                <div>{renderContent()}</div>
            </div>
        </main>
    );
};

export default WorkshopPage;