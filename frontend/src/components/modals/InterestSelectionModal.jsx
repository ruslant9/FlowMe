// frontend/src/components/modals/InterestSelectionModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom'; // --- ИМПОРТ ReactDOM ---
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, ArrowLeft, Search, CheckCircle, Brush, Code,
    Gamepad, HeartPulse, Dumbbell
} from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_INTERESTS = 8;

const interestCategories = [
    {
        name: "Творчество и Искусство",
        icon: Brush,
        interests: ["Дизайн", "Музыка", "Кино", "Фотография", "Искусство", "Литература", "Архитектура", "Театр", "Поэзия", "Танцы", "Вокал"]
    },
    {
        name: "Технологии и Наука",
        icon: Code,
        interests: ["Программирование", "Наука", "Технологии", "Космос", "Робототехника", "AI & ML", "Гаджеты", "Стартапы", "Биотехнологии"]
    },
    {
        name: "Развлечения и Хобби",
        icon: Gamepad,
        interests: ["Видеоигры", "Чтение", "Настольные игры", "Комиксы", "Аниме и Манга", "Сериалы", "Подкасты", "Коллекционирование"]
    },
    {
        name: "Стиль жизни и Увлечения",
        icon: HeartPulse,
        interests: ["Путешествия", "Кулинария", "Фитнес", "Психология", "Философия", "Юмор", "Природа", "Животные", "Садоводство", "DIY", "Волонтерство", "Мода", "Автомобили", "История"]
    },
    {
        name: "Спорт",
        icon: Dumbbell,
        interests: ["Футбол", "Баскетбол", "Хоккей", "Теннис", "Автоспорт", "Киберспорт", "Йога", "Бег", "Плавание"]
    }
];

const allInterests = [...new Set(interestCategories.flatMap(c => c.interests))];

const InterestButton = ({ interest, isSelected, onToggle }) => (
    <motion.button
        key={interest}
        onClick={() => onToggle(interest)}
        className={`p-3 rounded-lg text-xs font-semibold transition-all duration-200 text-center flex items-center justify-center h-12 relative overflow-hidden
            ${isSelected 
                ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                : 'bg-slate-200/70 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20'
            }
        `}
        whileTap={{ scale: 0.95 }}
    >
        <AnimatePresence>
        {isSelected && (
            <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-1 right-1 bg-white/20 rounded-full p-0.5"
            >
                <CheckCircle size={14} className="text-white"/>
            </motion.div>
        )}
        </AnimatePresence>
        {interest}
    </motion.button>
);

const InterestSelectionModal = ({ isOpen, onClose, onSave, initialSelectedInterests }) => {
    const [selectedInterests, setSelectedInterests] = useState(initialSelectedInterests || []);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedInterests(initialSelectedInterests || []);
            setSearchQuery('');
        }
    }, [isOpen, initialSelectedInterests]);

    const handleToggleInterest = (interest) => {
        const isSelected = selectedInterests.includes(interest);
        if (isSelected) {
            setSelectedInterests(prev => prev.filter(item => item !== interest));
        } else {
            if (selectedInterests.length >= MAX_INTERESTS) {
                toast.error(`Можно выбрать не более ${MAX_INTERESTS} интересов.`);
                return;
            }
            setSelectedInterests(prev => [...prev, interest]);
        }
    };

    const handleSaveClick = () => {
        onSave(selectedInterests);
        onClose();
    };
    
    const handleClose = (e) => {
        e.stopPropagation();
        onClose();
    };

    const filteredInterests = useMemo(() => {
        if (!searchQuery.trim()) return null;
        return allInterests.filter(interest => 
            interest.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                // --- НАЧАЛО ИСПРАВЛЕНИЯ 1: Центрируем контент на всех экранах ---
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                // --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---
            >
                <motion.div
                    // --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Анимация и стили теперь едины для всех экранов ---
                    initial={{ scale: 0.95, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 50 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="ios-glass-final w-full max-w-3xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]"
                    // --- КОНЕЦ ИСПРАВЛЕНИЯ 2 ---
                >
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h2 className="text-xl font-bold">Выберите интересы</h2>
                        <p className={`font-semibold ${selectedInterests.length === MAX_INTERESTS ? 'text-red-500' : 'text-slate-500 dark:text-white/60'}`}>
                            {selectedInterests.length} / {MAX_INTERESTS}
                        </p>
                    </div>
                    
                    <div className="relative mb-4 flex-shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Поиск по интересам..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto -mx-2 px-2 py-2 min-h-0">
                        {filteredInterests ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredInterests.length > 0 ? (
                                    filteredInterests.map(interest => (
                                        <InterestButton 
                                            key={interest}
                                            interest={interest}
                                            isSelected={selectedInterests.includes(interest)}
                                            onToggle={handleToggleInterest}
                                        />
                                    ))
                                ) : (
                                    <p className="col-span-full text-center py-10 text-slate-500">Ничего не найдено</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {interestCategories.map(category => (
                                    <div key={category.name}>
                                        <div className="flex items-center space-x-2 mb-3">
                                            <category.icon className="text-blue-500" size={18} />
                                            <h3 className="font-semibold text-slate-600 dark:text-white/80">{category.name}</h3>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {category.interests.map(interest => (
                                                 <InterestButton 
                                                    key={interest}
                                                    interest={interest}
                                                    isSelected={selectedInterests.includes(interest)}
                                                    onToggle={handleToggleInterest}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
                        <button onClick={handleClose} className="px-6 py-2.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors flex items-center space-x-2">
                            <ArrowLeft size={18} />
                            <span>Назад</span>
                        </button>
                        <button onClick={handleSaveClick} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            Сохранить
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default InterestSelectionModal;