// frontend/src/pages/AdminPage.jsx

import React, { useState } from 'react';
import useTitle from '../hooks/useTitle';
import AdminSubmissionsList from '../components/admin/AdminSubmissionsList';
import AdminUploadPanel from '../components/admin/AdminUploadPanel';
import AdminContentManager from '../components/admin/AdminContentManager';
import AdminUserManager from '../components/admin/AdminUserManager';
import { CheckCircle, UploadCloud, Database, Users } from 'lucide-react';

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

    return (
        // Основной контейнер, который центрирует контент на странице
        <main className="flex-1 p-4 md:p-8">
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Панель администратора</h1>
                
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
                <div>
                    {renderContent()}
                </div>
            </div>
        </main>
    );
};

export default AdminPage;