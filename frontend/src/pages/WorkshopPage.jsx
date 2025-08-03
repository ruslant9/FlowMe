// frontend/src/pages/WorkshopPage.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState } from 'react';
import useTitle from '../hooks/useTitle';
import { Brush, Star, Library, Search } from 'lucide-react';
// import MyPacks from '../components/workshop/MyPacks';
// import AddedPacks from '../components/workshop/AddedPacks';
// import SearchPacks from '../components/workshop/SearchPacks';

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

const WorkshopPage = () => {
    useTitle('Мастерская');
    const [activeTab, setActiveTab] = useState('my');

    const renderContent = () => {
        // Здесь будут рендериться компоненты для каждой вкладки
        // Для примера пока поставим заглушки
        switch (activeTab) {
            case 'my':
                return <div>Контент для "Мои паки"</div>; // <MyPacks />
            case 'added':
                return <div>Контент для "Добавленные"</div>; // <AddedPacks />
            case 'search':
                return <div>Контент для "Поиск"</div>; // <SearchPacks />
            default:
                return null;
        }
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Мастерская</h1>
                    {/* Кнопка создания будет внутри компонента MyPacks */}
                </div>
                
                <div className="flex space-x-2 border-b border-slate-300 dark:border-slate-700 mb-6">
                    <TabButton active={activeTab === 'my'} onClick={() => setActiveTab('my')} icon={Brush}>
                        Мои паки
                    </TabButton>
                    <TabButton active={activeTab === 'added'} onClick={() => setActiveTab('added')} icon={Library}>
                        Добавленные
                    </TabButton>
                    <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={Search}>
                        Поиск паков
                    </TabButton>
                </div>

                <div>
                    {renderContent()}
                </div>
            </div>
        </main>
    );
};

export default WorkshopPage;