// frontend/components/admin/AdminContentManager.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Search, MicVocal, Disc, Music, ArrowUp, ArrowDown, Edit as EditIcon, Trash2 as TrashIcon } from 'lucide-react';
import EditContentModal from './EditContentModal';
import { useModal } from '../../hooks/useModal';

const API_URL = import.meta.env.VITE_API_URL;

const getImageUrl = (url) => {
    if (!url || url.startsWith('http') || url.startsWith('blob:')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const SubTabButton = ({ active, onClick, children, icon: Icon }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
        <Icon size={16} />
        <span>{children}</span>
    </button>
);

export const AdminContentManager = () => {
    const [activeType, setActiveType] = useState('artists');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { showConfirmation } = useModal();
    const [editingItem, setEditingItem] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [allArtists, setAllArtists] = useState([]);
    const [allAlbums, setAllAlbums] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ page, search, sortBy, sortOrder });
            const res = await axios.get(`${API_URL}/api/admin/content/${activeType}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(res.data.items);
            setTotalPages(res.data.totalPages);
            setPage(res.data.currentPage);
        } catch (error) {
            toast.error(`Не удалось загрузить ${activeType}.`);
        } finally {
            setLoading(false);
        }
    }, [activeType, page, search, sortBy, sortOrder]);
    
    const fetchAuxiliaryData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [artistsRes, albumsRes] = await Promise.all([
                axios.get(`${API_URL}/api/music/artists/all`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/music/albums/all`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAllArtists(artistsRes.data);
            setAllAlbums(albumsRes.data);
        } catch(e) {
            toast.error("Ошибка загрузки списков для форм.");
        }
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            setPage(1);
            fetchData();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search, fetchData]);

    useEffect(() => {
        setPage(1);
        fetchData();
    }, [activeType, sortBy, sortOrder]);
    
    useEffect(() => {
        fetchAuxiliaryData();
    }, [fetchAuxiliaryData]);
    
    const handleSort = (key) => {
        if (sortBy === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsEditModalOpen(true);
    };

    const handleDelete = (item) => {
        showConfirmation({
            title: `Удалить ${item.name || item.title}?`,
            message: 'Это действие необратимо. Связанные сущности могут быть затронуты.',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/admin/content/${activeType}/${item._id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    toast.success('Успешно удалено!', { id: toastId });
                    fetchData();
                } catch (error) {
                    toast.error('Ошибка удаления.', { id: toastId });
                }
            }
        });
    };

    const handleModalSuccess = () => {
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchData();
        fetchAuxiliaryData();
    };

    const SortableHeader = ({ label, sortKey }) => (
        <button onClick={() => handleSort(sortKey)} className="flex items-center space-x-1 font-semibold text-slate-600 dark:text-slate-400">
            <span>{label}</span>
            {sortBy === sortKey && (sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />)}
        </button>
    );

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>;
        if (items.length === 0) return <p className="text-center text-slate-500 p-8">Ничего не найдено.</p>;
        
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead>
                        <tr className="border-b dark:border-slate-700">
                            <th className="p-2 w-12"> </th>
                            <th className="p-2"><SortableHeader label={activeType === 'artists' ? "Артист" : "Название"} sortKey={activeType === 'artists' ? "name" : "title"} /></th>
                            {activeType !== 'artists' && <th className="p-2">Артист</th>}
                            <th className="p-2"><SortableHeader label="Дата создания" sortKey="createdAt" /></th>
                            <th className="p-2 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item._id} className="border-b dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <td className="p-2">
                                    {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем item.albumArtUrl --- */}
                                    <img src={getImageUrl(item.avatarUrl || item.coverArtUrl || item.albumArtUrl)} alt="cover" className="w-10 h-10 rounded object-cover bg-slate-200 dark:bg-slate-700" />
                                </td>
                                <td className="p-2 font-semibold">{item.name || item.title}</td>
                                {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Корректно отображаем список артистов --- */}
                                {activeType !== 'artists' && (
                                    <td className="p-2 text-slate-500">
                                        {Array.isArray(item.artist) 
                                            ? item.artist.map(a => a.name).join(', ') 
                                            : (item.artist?.name || 'N/A')}
                                    </td>
                                )}
                                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                                <td className="p-2 text-sm text-slate-500">{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td>
                                <td className="p-2">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full" title="Редактировать"><EditIcon size={16} /></button>
                                        <button onClick={() => handleDelete(item)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title="Удалить"><TrashIcon size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <EditContentModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                item={editingItem}
                itemType={activeType}
                artists={allArtists}
                albums={allAlbums}
                onSuccess={handleModalSuccess}
            />
            
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <SubTabButton active={activeType === 'artists'} onClick={() => setActiveType('artists')} icon={MicVocal}>Артисты</SubTabButton>
                    <SubTabButton active={activeType === 'albums'} onClick={() => setActiveType('albums')} icon={Disc}>Альбомы</SubTabButton>
                    <SubTabButton active={activeType === 'tracks'} onClick={() => setActiveType('tracks')} icon={Music}>Сольные треки</SubTabButton>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 w-full sm:w-64" />
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default AdminContentManager;