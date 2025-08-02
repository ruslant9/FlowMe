// frontend/components/admin/AdminSubmissionsList.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL;

const AdminSubmissionsList = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

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
        const toastId = toast.loading("Обработка...");
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/submissions/${id}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Заявка ${action === 'approve' ? 'одобрена' : 'отклонена'}`, { id: toastId });
            fetchSubmissions();
        } catch (error) {
            toast.error("Ошибка при обработке заявки.", { id: toastId });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>;
    if (submissions.length === 0) return <p className="text-center text-slate-500 p-8">Нет новых заявок на проверку.</p>;

    return (
        <div className="space-y-4">
            {submissions.map(sub => (
                <div key={sub._id} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 flex justify-between items-center flex-wrap gap-4">
                    <div className="min-w-0">
                        <p className="font-bold text-lg">{sub.entityType}: <span className="text-blue-500">{sub.data.name || sub.data.title}</span></p>
                        <p className="text-sm text-slate-500">
                            Действие: {sub.action === 'create' ? 'Создание' : 'Редактирование'} | Автор: {sub.submittedBy.username}
                        </p>
                         <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(sub.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                        </p>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                        <button onClick={() => handleAction(sub._id, 'approve')} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors" title="Одобрить">
                            <CheckCircle size={20} />
                        </button>
                        <button onClick={() => handleAction(sub._id, 'reject')} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" title="Отклонить">
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdminSubmissionsList;