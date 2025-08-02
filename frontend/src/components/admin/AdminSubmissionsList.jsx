// frontend/components/admin/AdminSubmissionsList.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle, Tag, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL;

// Хелпер-функция для получения полного URL изображения
const getImageUrl = (url) => {
    if (!url || url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const AdminSubmissionsList = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/admin/submissions`, { headers: { Authorization: `Bearer ${token}` } });
            setSubmissions(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить заявки.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const handleAction = async (id, action) => {
        setProcessingId(id);
        const toastId = toast.loading("Обработка...");
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/submissions/${id}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Заявка ${action === 'approve' ? 'одобрена' : 'отклонена'}`, { id: toastId });
            fetchSubmissions();
        } catch (error) {
            toast.error("Ошибка при обработке заявки.", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>;
    if (submissions.length === 0) return <p className="text-center text-slate-500 p-8">Нет новых заявок на проверку.</p>;

    return (
        <div className="space-y-4">
            {submissions.map(sub => {
                const { data } = sub;
                const imageUrl = data.avatarUrl || data.coverArtUrl;

                return (
                    <div key={sub._id} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col sm:flex-row gap-4">
                        {/* Левая часть: Обложка */}
                        <div className="w-full sm:w-24 h-24 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                                <img src={getImageUrl(imageUrl)} alt="Обложка" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon size={40} className="text-slate-400" />
                            )}
                        </div>
                        
                        {/* Средняя часть: Информация о заявке */}
                        <div className="flex-grow min-w-0">
                            <p className="font-bold text-lg">{sub.entityType}: <span className="text-blue-500">{data.name || data.title}</span></p>
                            
                            {data.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 flex items-start space-x-2">
                                    <FileText size={14} className="flex-shrink-0 mt-0.5"/> 
                                    <span className="line-clamp-2">{data.description}</span>
                                </p>
                            )}

                            {data.tags && data.tags.length > 0 && (
                                <div className="mt-2 flex items-center space-x-2 flex-wrap">
                                    <Tag size={14} className="text-slate-500 flex-shrink-0"/>
                                    {data.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{tag}</span>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-slate-400 mt-2">
                                Заявка от: <span className="font-semibold">{sub.submittedBy.username}</span> • {format(new Date(sub.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                            </p>
                        </div>

                        {/* Правая часть: Кнопки управления */}
                        <div className="flex space-x-2 flex-shrink-0 self-center sm:self-start">
                            <button 
                                onClick={() => handleAction(sub._id, 'approve')} 
                                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50" 
                                title="Одобрить"
                                disabled={processingId === sub._id}
                            >
                                {processingId === sub._id ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                            </button>
                            <button 
                                onClick={() => handleAction(sub._id, 'reject')} 
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50" 
                                title="Отклонить"
                                disabled={processingId === sub._id}
                            >
                                {processingId === sub._id ? <Loader2 size={20} className="animate-spin" /> : <XCircle size={20} />}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

export default AdminSubmissionsList;