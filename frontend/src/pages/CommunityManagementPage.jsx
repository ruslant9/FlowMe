// frontend/src/pages/CommunityManagementPage.jsx

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import { useModal } from '../hooks/useModal';
import { Loader2, ArrowLeft, Save, Trash2, Image as ImageIcon, Check, X, UserX, Ban, UserCheck, ChevronDown } from 'lucide-react';
import Avatar from '../components/Avatar';
import { Listbox, Transition } from '@headlessui/react';

const API_URL = import.meta.env.VITE_API_URL;

// --- ИЗМЕНЕНИЕ 1: Добавляем универсальную функцию ---
const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const topics = [
    { id: 'General', name: 'Общая' }, { id: 'Gaming', name: 'Игры' }, { id: 'Art', name: 'Искусство' }, { id: 'Technology', name: 'Технологии' }, { id: 'Music', name: 'Музыка' }, { id: 'Sports', name: 'Спорт' }, { id: 'Science', name: 'Наука' }, { id: 'Books', name: 'Книги' }, { id: 'Food', name: 'Еда' }, { id: 'Travel', name: 'Путешествия' }, { id: 'Fashion', name: 'Мода' }, { id: 'Photography', name: 'Фотография' }, { id: 'Health', name: 'Здоровье' }, { id: 'Education', name: 'Образование' }, { id: 'Business', name: 'Бизнес' }, { id: 'Finance', name: 'Финансы' }, { id: 'Nature', name: 'Природа' }, { id: 'Pets', name: 'Питомцы' }, { id: 'DIY', name: 'Сделай сам' }, { id: 'Cars', name: 'Автомобили' }, { id: 'Movies', name: 'Фильмы' }, { id: 'TV Shows', name: 'ТВ-шоу' }, { id: 'Anime & Manga', name: 'Аниме и Манга' }, { id: 'Comics', name: 'Комиксы' }, { id: 'History', name: 'История' }, { id: 'Philosophy', name: 'Философия' }, { id: 'Politics', name: 'Политика' }, { id: 'News', name: 'Новости' }, { id: 'Humor', name: 'Юмор' }, { id: 'Fitness', name: 'Фитнес' }, { id: 'Other', name: 'Другое' },
];

const visibilityOptions = [
    { id: 'public', name: 'Публичное' },
    { id: 'private', name: 'Приватное' },
    { id: 'secret', name: 'Секретное' },
];

const joinPolicyOptions = [
    { id: 'open', name: 'Открытое' },
    { id: 'approval_required', name: 'По заявке' },
    { id: 'invite_only', name: 'По приглашению' },
];

const postingPolicyOptions = [
    { id: 'everyone', name: 'Все участники' },
    { id: 'admin_only', name: 'Только администратор' },
];

const adminVisibilityOptions = [
    { id: 'everyone', name: 'Все' },
    { id: 'members_only', name: 'Только участники' },
    { id: 'none', name: 'Никто' },
];

const memberListVisibilityOptions = [
    { id: 'everyone', name: 'Все' },
    { id: 'members_only', name: 'Только участники' },
    { id: 'none', name: 'Никто' },
];

const EditField = ({ label, name, value, onChange, type = 'text', options, onListboxChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-semibold mb-1">{label}</label>
        {type === 'textarea' ? (
            <textarea id={name} name={name} value={value} onChange={onChange} rows="3" className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        ) : type === 'listbox' ? (
            <Listbox value={value} onChange={onListboxChange}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
                        <span className="block truncate">{options.find(opt => opt.id === value)?.name || ''}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                            {options.map((option) => (
                                <Listbox.Option key={option.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 dark:bg-blue-600' : '' }`} value={option.id}>
                                    {({ selected }) => (<><span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{option.name}</span>{selected ? (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span>) : null}</>)}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        ) : (
            <input type={type} id={name} name={name} value={value} onChange={onChange} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}
    </div>
);

const CommunityManagementPage = () => {
    const { communityId } = useParams();
    const navigate = useNavigate();
    const { showConfirmation } = useModal();
    const [community, setCommunity] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState({ file: null, preview: '', removed: false });
    const [coverFile, setCoverFile] = useState({ file: null, preview: '', removed: false });
    const [processingActionId, setProcessingActionId] = useState(null);
    const [initialFormData, setInitialFormData] = useState(null);
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);

    useTitle(community ? `Управление: ${community.name}` : 'Управление сообществом');

    const fetchCommunityData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/communities/${communityId}`, { headers: { Authorization: `Bearer ${token}` } });
            
            if (!res.data.isOwner) {
                toast.error("У вас нет прав для управления этим сообществом.");
                navigate(`/communities/${communityId}`);
                return;
            }

            const communityData = {
                name: res.data.name,
                description: res.data.description,
                topic: res.data.topic,
                visibility: res.data.visibility,
                joinPolicy: res.data.joinPolicy,
                postingPolicy: res.data.postingPolicy,
                adminVisibility: res.data.adminVisibility,
                memberListVisibility: res.data.memberListVisibility,
            };

            setCommunity(res.data);
            setFormData(communityData);
            setInitialFormData(communityData); 
            // --- ИЗМЕНЕНИЕ 2: Используем getImageUrl ---
            setAvatarFile({ file: null, preview: getImageUrl(res.data.avatar), removed: false });
            setCoverFile({ file: null, preview: getImageUrl(res.data.coverImage), removed: false });

        } catch (error) {
            toast.error("Не удалось загрузить данные сообщества.");
            navigate('/communities');
        } finally {
            setLoading(false);
        }
    }, [communityId, navigate]);

    useEffect(() => { fetchCommunityData(); }, [fetchCommunityData]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const setFileState = type === 'avatar' ? setAvatarFile : setCoverFile;
        setFileState({ file, preview: URL.createObjectURL(file), removed: false });
    };

    const handleRemoveImage = (type) => {
        if (type === 'avatar') {
            setAvatarFile({ file: null, preview: '', removed: true });
        } else {
            setCoverFile({ file: null, preview: '', removed: true });
        }
    };

    const haveSettingsChanged = () => {
        if (!initialFormData || !formData) return false;
        const formFieldsChanged = JSON.stringify(initialFormData) !== JSON.stringify(formData);
        const filesChanged = !!avatarFile.file || !!coverFile.file || (avatarFile.removed && community?.avatar) || (coverFile.removed && community?.coverImage);
        return formFieldsChanged || filesChanged;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const toastId = toast.loading('Сохранение изменений...');
        const updateFormData = new FormData();
        Object.keys(formData).forEach(key => updateFormData.append(key, formData[key]));
        if (avatarFile.file) updateFormData.append('avatar', avatarFile.file);
        if (coverFile.file) updateFormData.append('coverImage', coverFile.file);
        if (avatarFile.removed) updateFormData.append('removeAvatar', 'true');
        if (coverFile.removed) updateFormData.append('removeCoverImage', 'true');

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/communities/${communityId}`, updateFormData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            toast.success('Сообщество обновлено!', { id: toastId });
            navigate(`/communities/${communityId}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка при сохранении.', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = () => {
        showConfirmation({
            title: `Удалить сообщество "${community.name}"?`,
            message: "Это действие необратимо. Все посты и данные сообщества будут удалены навсегда.",
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/communities/${communityId}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Сообщество удалено!', { id: toastId });
                    navigate('/communities');
                } catch (error) { toast.error(error.response?.data?.message || 'Ошибка при удалении.', { id: toastId }); }
            }
        });
    };

    const handleRequestAction = async (action, requestingUserId) => {
        setProcessingActionId(requestingUserId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/communities/${communityId}/requests/${requestingUserId}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(res.data.message);
            fetchCommunityData();
        } catch (error) { toast.error(error.response?.data?.message || 'Ошибка.'); } finally { setProcessingActionId(null); }
    };
    
    const handleMemberAction = (action, member) => {
        const actions = {
            remove: { title: 'Удалить участника?', message: `Вы уверены, что хотите удалить ${member.username} из сообщества?`, endpoint: 'remove' },
            ban: { title: 'Забанить участника?', message: `Вы уверены, что хотите забанить ${member.username}? Он будет удален и не сможет снова вступить.`, endpoint: 'ban' },
            unban: { title: 'Разбанить пользователя?', message: `Вы уверены, что хотите разбанить ${member.username}? Он сможет снова подать заявку.`, endpoint: 'unban' },
        };
        const actionDetails = actions[action];
        
        showConfirmation({
            title: actionDetails.title,
            message: actionDetails.message,
            onConfirm: async () => {
                setProcessingActionId(member._id);
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/communities/${communityId}/members/${member._id}/${actionDetails.endpoint}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Действие выполнено.');
                    fetchCommunityData();
                } catch (error) { toast.error(error.response?.data?.message || 'Ошибка.'); } finally { setProcessingActionId(null); }
            }
        });
    };

    if (loading || !formData) {
        return <main className="flex-1 p-8 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></main>;
    }

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <Link to={`/communities/${communityId}`} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 mr-2"><ArrowLeft size={24} /></Link>
                    <h1 className="text-3xl font-bold">Управление сообществом</h1>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <EditField label="Название сообщества" name="name" value={formData.name} onChange={handleChange} />
                    <EditField label="Описание" name="description" value={formData.description} onChange={handleChange} type="textarea" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EditField label="Тематика" type="listbox" value={formData.topic} onListboxChange={(value) => setFormData(p => ({ ...p, topic: value }))} options={topics} />
                        <EditField label="Видимость" type="listbox" value={formData.visibility} onListboxChange={(value) => setFormData(p => ({ ...p, visibility: value }))} options={visibilityOptions} />
                        <EditField label="Политика вступления" type="listbox" value={formData.joinPolicy} onListboxChange={(value) => setFormData(p => ({ ...p, joinPolicy: value }))} options={joinPolicyOptions} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Аватар</label>
                            <div className="flex items-center space-x-4">
                                <Avatar username={formData.name} avatarUrl={avatarFile.removed ? '' : avatarFile.preview} size="lg" />
                                <div className="flex flex-col space-y-2">
                                    <button type="button" onClick={() => avatarInputRef.current.click()} className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"><ImageIcon size={16} className="mr-2" /> Загрузить новый</button>
                                    {(community.avatar || avatarFile.file) && !avatarFile.removed && (
                                        <button type="button" onClick={() => handleRemoveImage('avatar')} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"><Trash2 size={16} className="mr-2" /> Удалить</button>
                                    )}
                                </div>
                                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Обложка</label>
                            <div className="flex items-center space-x-4">
                                <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">                                    
                                    {coverFile.preview && !coverFile.removed ? <img src={coverFile.preview} alt="Cover Preview" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-slate-400" />}
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <button type="button" onClick={() => coverInputRef.current.click()} className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"><ImageIcon size={16} className="mr-2" /> Загрузить новую</button>
                                     {(community.coverImage || coverFile.file) && !coverFile.removed && (
                                        <button type="button" onClick={() => handleRemoveImage('cover')} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"><Trash2 size={16} className="mr-2" /> Удалить</button>
                                    )}
                                </div>
                                <input type="file" ref={coverInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                            </div>
                        </div>
                    </div>
                    
                    <hr className="border-slate-200 dark:border-white/10 my-2" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Настройки публикаций и видимости</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <EditField label="Кто может публиковать посты" type="listbox" value={formData.postingPolicy} onListboxChange={(value) => setFormData(p => ({ ...p, postingPolicy: value }))} options={postingPolicyOptions} />
                        <EditField label="Кто видит администратора" type="listbox" value={formData.adminVisibility} onListboxChange={(value) => setFormData(p => ({ ...p, adminVisibility: value }))} options={adminVisibilityOptions} />
                        <EditField label="Кто видит участников" type="listbox" value={formData.memberListVisibility} onListboxChange={(value) => setFormData(p => ({ ...p, memberListVisibility: value }))} options={memberListVisibilityOptions} />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={!haveSettingsChanged() || isSaving} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving && <Loader2 className="animate-spin" />}<span>Сохранить изменения</span>
                        </button>
                    </div>
                </form>

                {community?.pendingJoinRequests?.length > 0 && (
                    <><hr className="border-slate-200 dark:border-white/10 my-8" /><div className="space-y-4"><h3 className="text-xl font-bold text-slate-800 dark:text-white">Заявки на вступление ({community.pendingJoinRequests.length})</h3><div className="space-y-2">{community.pendingJoinRequests.map(user => (<div key={user._id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"><Link to={`/profile/${user._id}`} className="flex items-center space-x-3 group">
                        {/* --- ИЗМЕНЕНИЕ 3 --- */}
                        <Avatar username={user.username} fullName={user.fullName} avatarUrl={getImageUrl(user.avatar)} />
                        <div><p className="font-semibold group-hover:underline">{user.fullName || user.username}</p></div></Link><div className="flex items-center space-x-2"><button onClick={() => handleRequestAction('approve', user._id)} disabled={!!processingActionId} className="p-2 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-500/30">{processingActionId === user._id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}</button><button onClick={() => handleRequestAction('deny', user._id)} disabled={!!processingActionId} className="p-2 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30">{processingActionId === user._id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}</button></div></div>))}</div></div></>
                )}

                {community?.members?.length > 0 && (
                    <><hr className="border-slate-200 dark:border-white/10 my-8" /><div className="space-y-4"><h3 className="text-xl font-bold text-slate-800 dark:text-white">Участники ({community.members.length})</h3><div className="space-y-2">{community.members.map(member => (<div key={member._id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"><Link to={`/profile/${member._id}`} className="flex items-center space-x-3 group">
                        {/* --- ИЗМЕНЕНИЕ 4 --- */}
                        <Avatar username={member.username} fullName={member.fullName} avatarUrl={getImageUrl(member.avatar)} />
                    <div>
                        <div className="flex items-baseline">
                            <p className="font-semibold group-hover:underline">{member.fullName || member.username}</p>
                            {member._id === community.owner._id && <span className="text-xs ml-2 text-blue-500 font-normal">(Владелец)</span>}
                        </div>
                    </div>
                    </Link>{member._id !== community.owner._id && <div className="flex items-center space-x-2">{processingActionId === member._id ? <Loader2 className="animate-spin" /> : <><button onClick={() => handleMemberAction('remove', member)} title="Удалить" className="p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600"><UserX size={16} /></button><button onClick={() => handleMemberAction('ban', member)} title="Забанить" className="p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600"><Ban size={16} /></button></>}</div>}</div>))}</div></div></>
                )}

                {community?.bannedUsers?.length > 0 && (
                    <><hr className="border-slate-200 dark:border-white/10 my-8" /><div className="space-y-4"><h3 className="text-xl font-bold text-slate-800 dark:text-white">Заблокированные пользователи ({community.bannedUsers.length})</h3><div className="space-y-2">{community.bannedUsers.map(user => (<div key={user._id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"><div className="flex items-center space-x-3">
                        {/* --- ИЗМЕНЕНИЕ 5 --- */}
                        <Avatar username={user.username} fullName={user.fullName} avatarUrl={getImageUrl(user.avatar)} />
                        <div><p className="font-semibold">{user.fullName || user.username}</p></div></div><div className="flex items-center space-x-2">{processingActionId === user._id ? <Loader2 className="animate-spin" /> : <button onClick={() => handleMemberAction('unban', user)} title="Разбанить" className="p-2 rounded-full text-slate-500 hover:bg-green-100 hover:text-green-600"><UserCheck size={16} /></button>}</div></div>))}</div></div></>
                )}
                
                <hr className="border-slate-200 dark:border-white/10 my-8" />
                <div className="bg-red-500/10 dark:bg-red-900/20 p-4 rounded-lg">
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-300">Опасная зона</h3>
                    <p className="mt-2 mb-4 text-sm text-red-700 dark:text-red-200">Удаление сообщества — необратимое действие. Все посты, комментарии и участники будут потеряны.</p>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"><Trash2 size={18} /><span>Удалить сообщество</span></button>
                </div>
            </div>
        </main>
    );
};

export default CommunityManagementPage;