// frontend/src/pages/AdminPage.jsx

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import { useModal } from '../hooks/useModal';
import { AudioCache } from '../utils/AudioCacheService';
import AdminSubmissionsList from '../components/admin/AdminSubmissionsList';
import AdminUploadPanel from '../components/admin/AdminUploadPanel';
import AdminContentManager from '../components/admin/AdminContentManager';
import AdminUserManager from '../components/admin/AdminUserManager';
import { CheckCircle, UploadCloud, Database, Users, Trash2 } from 'lucide-react';

// Возвращаем стильный компонент для горизонтальных вкладок
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

const AdminPage = () => {
    useTitle('Панель администратора');
    const [activeTab, setActiveTab] = useState('submissions');
    const { showConfirmation } = useModal();

    // Компоненты для каждой вкладки
    const renderContent = () => {
        switch (activeTab) {
            case 'submissions': return <AdminSubmissionsList />;
            case 'content': return <AdminContentManager />;
            case 'users': return <AdminUserManager />;
            case 'create': return <AdminUploadPanel />;
            default: return null;
        }
    };

    const handleClearCache = () => {
        showConfirmation({
            title: 'Очистить аудио-кеш?',
            message: 'Это действие удалит все кешированные треки из вашего браузера. При следующем прослушивании они будут загружены заново. Продолжить?',
            onConfirm: async () => {
                const toastId = toast.loading('Очистка кеша...');
                try {
                    await AudioCache.clearAllAudio();
                    toast.success('Аудио-кеш успешно очищен!', { id: toastId });
                } catch (error) {
                    toast.error('Не удалось очистить кеш.', { id: toastId });
                }
            }
        });
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Панель администратора</h1>
                <button 
                    onClick={handleClearCache}
                    className="flex items-center space-x-2 text-xs sm:text-sm bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold px-3 py-2 sm:px-4 rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                    <span>Очистить аудио-кеш</span>
                </button>
            </div>
            
            {/* Горизонтальная панель навигации */}
            <div className="flex flex-wrap border-b border-slate-300 dark:border-slate-700 mb-6">
                <TabButton 
                    active={activeTab === 'submissions'} 
                    onClick={() => setActiveTab('submissions')}
                    icon={CheckCircle}
                >
                    Заявки на модерацию
                </TabButton>
                <TabButton 
                    active={activeTab === 'content'} 
                    onClick={() => setActiveTab('content')}
                    icon={Database}
                >
                    Управление контентом
                </TabButton>
                <TabButton 
                    active={activeTab === 'users'} 
                    onClick={() => setActiveTab('users')}
                    icon={Users}
                >
                    Управление пользователями
                </TabButton>
                <TabButton 
                    active={activeTab === 'create'} 
                    onClick={() => setActiveTab('create')}
                    icon={UploadCloud}
                >
                    Создать контент
                </TabButton>
            </div>

            {/* Область для отображения контента активной вкладки */}
            <div className="mt-6">
                {renderContent()}
            </div>
        </main>
    );
};

export default AdminPage;