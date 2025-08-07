// frontend/src/pages/AdminPage.jsx

import React, { useState } from 'react';
import useTitle from '../hooks/useTitle';
import AdminSubmissionsList from '../components/admin/AdminSubmissionsList';
import AdminUploadPanel from '../components/admin/AdminUploadPanel';
import AdminContentManager from '../components/admin/AdminContentManager';
import AdminUserManager from '../components/admin/AdminUserManager';
import { CheckCircle, UploadCloud, Database, Users, Code } from 'lucide-react';
import ResponsiveNav from '../components/ResponsiveNav'; 
import CodeViewerModal from '../components/admin/CodeViewerModal';
import myProfilePageSource from './MyProfilePage.jsx?raw';
import PageWrapper from '../components/PageWrapper';

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
   const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const navItems = [
        { key: 'submissions', label: 'Заявки', icon: CheckCircle, onClick: () => setActiveTab('submissions') },
        { key: 'create', label: 'Создать контент', icon: UploadCloud, onClick: () => setActiveTab('create') },
        { key: 'content', label: 'Управление контентом', icon: Database, onClick: () => setActiveTab('content') },
        { key: 'users', label: 'Управление пользователями', icon: Users, onClick: () => setActiveTab('users') },
       { key: 'debug', label: 'Инструменты', icon: Code, onClick: () => setIsCodeViewerOpen(true) }
    ];
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

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
        <PageWrapper>
            <main className="flex-1 p-4 md:p-8 flex flex-col">
               <CodeViewerModal
                   isOpen={isCodeViewerOpen}
                   onClose={() => setIsCodeViewerOpen(false)}
                   title="Исходный код: MyProfilePage.jsx"
                   code={myProfilePageSource}
               />
                <div className="max-w-7xl mx-auto w-full flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold">Панель администратора</h1>
                    </div>
                    
                    <div className="hidden md:flex border-b border-slate-300 dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar flex-wrap">
                        {navItems.map(item => (
                            <TabButton 
                                key={item.key}
                               active={activeTab === item.key && item.key !== 'debug'}
                                onClick={item.onClick}
                                icon={item.icon}
                            >
                                {item.label}
                            </TabButton>
                        ))}
                    </div>
                    
                    <div className="md:hidden mb-6">
                        <ResponsiveNav 
                            items={navItems}
                           visibleCount={3}
                            activeKey={activeTab}
                        />
                    </div>
        
                    <div className="flex-1 flex flex-col">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
};

export default AdminPage;