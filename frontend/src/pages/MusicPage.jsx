// frontend/src/pages/MusicPage.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ (ТЕСТОВАЯ ЗАГЛУШКА) ---

import React from 'react';
import useTitle from '../hooks/useTitle';
import PageWrapper from '../components/PageWrapper';

const MusicPage = () => {
    useTitle('Музыка');

    return (
        <PageWrapper>
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Страница работает
                    </h1>
                </div>
            </main>
        </PageWrapper>
    );
};

export default MusicPage;