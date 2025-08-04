// frontend/src/pages/AdminPage.jsx

import React, { useState } from 'react';
import useTitle from '../hooks/useTitle';
import AdminSubmissionsList from '../components/admin/AdminSubmissionsList';
import AdminContentManager from '../components/admin/AdminContentManager';
import AdminUserManager from '../components/admin/AdminUserManager';
import AdminUploadPanel from '../components/admin/AdminUploadPanel';
import { CheckCircle, UploadCloud, Database, Users, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// Новый, более стильный компонент навигационной кнопки для боковой панели
const NavButton = ({ active, onClick, children, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full space-x-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors relative ${
            active 
            ? 'text-white' 
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
        }`}
    >
        {/* Анимированный индикатор активной вкладки */}
        {active && (
            <motion.div
                layoutId="admin-active-pill"
                className="absolute inset-0 bg-blue-600 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
        )}
        <Icon size={20} className="relative z-10" />
        <span className="relative z-10">{children}</span>
    </button>
);

const AdminPage = () => {
    useTitle('Панель администратора');
    const [activeTab, setActiveTab] = useState('submissions');

    // Структура для удобного управления вкладками и их содержимым
    const TABS = {
        submissions: { title: 'Заявки на модерацию', component: <AdminSubmissionsList />, icon: CheckCircle },
        content: { title: 'Управление контентом', component: <AdminContentManager />, icon: Database },
        users: { title: 'Управление пользователями', component: <AdminUserManager />, icon: Users },
        create: { title: 'Создать контент', component: <AdminUploadPanel />, icon: UploadCloud },
    };

    return (
        // Полноэкранный контейнер
        <div className="flex h-full w-full bg-slate-100 dark:bg-slate-900">
            {/* Боковая панель, специфичная для админки */}
            <aside className="w-64 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col">
                <div className="flex items-center space-x-2 p-2 mb-6">
                     <div className="p-2 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg">
                        <Shield className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold">Админ-панель</h1>
                </div>
                <nav className="space-y-2">
                    {Object.keys(TABS).map(key => (
                        <NavButton
                            key={key}
                            active={activeTab === key}
                            onClick={() => setActiveTab(key)}
                            icon={TABS[key].icon}
                        >
                            {TABS[key].title}
                        </NavButton>
                    ))}
                </nav>
            </aside>

            {/* Основная область контента */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">{TABS[activeTab].title}</h1>
                    <div>
                        {TABS[activeTab].component}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;