// frontend/src/pages/PremiumPage.jsx
import React, { useState, useEffect } from 'react';
import useTitle from '../hooks/useTitle';
import { Sparkles, Loader2, Crown, Trash2, Check, Newspaper, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUser } from '../hooks/useUser';
import { Link } from 'react-router-dom';
import { useModal } from '../hooks/useModal';
import { motion } from 'framer-motion';
const API_URL = import.meta.env.VITE_API_URL;
const PremiumPage = () => {
useTitle('Flow PREMIUM');
const [loadingPlan, setLoadingPlan] = useState(null);
const [plans, setPlans] = useState([]);
const [loadingPage, setLoadingPage] = useState(true);
const [isCancelling, setIsCancelling] = useState(false);

const { currentUser, refetchUser } = useUser();
const { showConfirmation } = useModal();

useEffect(() => {
    if (!currentUser?.premium?.isActive) {
        const fetchPlans = async () => {
            setLoadingPage(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/premium/plans`, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                const plansArray = Object.entries(res.data).map(([id, data]) => ({ id, ...data }));
                setPlans(plansArray);
            } catch (error) {
                toast.error("Не удалось загрузить тарифные планы.");
            } finally {
                setLoadingPage(false);
            }
        };
        fetchPlans();
    } else {
        setLoadingPage(false);
    }
}, [currentUser]);

const handlePurchase = async (planId) => {
    setLoadingPlan(planId);
    try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/api/premium/create-payment`, 
            { planId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.confirmationUrl) {
            window.location.href = res.data.confirmationUrl;
        } else {
            toast.error('Не удалось получить ссылку на оплату.');
        }
    } catch (error) {
        toast.error(error.response?.data?.message || 'Ошибка при создании платежа.');
        setLoadingPlan(null);
    }
};

const handleCancelPremium = () => {
    showConfirmation({
        title: "Отключить Premium?",
        message: "Подписка будет немедленно деактивирована. Все премиум-функции станут недоступны. Вы уверены?",
        onConfirm: async () => {
            setIsCancelling(true);
            const toastId = toast.loading('Отменяем подписку...');
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/premium/cancel`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Подписка Premium отменена.', { id: toastId });
                refetchUser();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Ошибка отмены подписки.', { id: toastId });
            } finally {
                setIsCancelling(false);
            }
        }
    });
};

if (loadingPage) {
    return (
        <main className="flex-1 p-8 flex items-center justify-center h-full">
            <Loader2 size={48} className="animate-spin text-slate-400" />
        </main>
    );
}

return (
    <main className="flex-1 p-4 md:p-8 flex items-center justify-center h-full">
        {currentUser?.premium?.isActive ? (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-2xl text-center flex flex-col items-center gap-8"
            >
                <div className="w-32 h-32 premium-gradient-bg rounded-full mx-auto flex items-center justify-center shadow-lg">
                    <Crown size={64} className="text-white" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} />
                </div>
                <div className="flex flex-col gap-4">
                    <h1 className="text-5xl md:text-6xl font-extrabold premium-shimmer-text">Вы — Premium пользователь!</h1>
                    <p className="text-lg text-slate-600 dark:text-white/70 max-w-lg mx-auto">
                        Спасибо за вашу поддержку! Теперь вам доступны все эксклюзивные функции для самовыражения.
                    </p>
                </div>
                {currentUser.premium.expiresAt && (
                    <div className="flex items-center justify-center gap-2 text-slate-800 dark:text-white px-4 py-2 bg-slate-200/50 dark:bg-white/10 rounded-full">
                       <Calendar size={16} />
                       <p className="font-medium text-sm">
                            Подписка действует до: {format(new Date(currentUser.premium.expiresAt), 'd MMMM yyyy г.', { locale: ru })}
                        </p>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm">
                     {/* --- НАЧАЛО ИЗМЕНЕНИЯ --- */}
                     <Link to="/" className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        <Newspaper size={18} />
                        <span className="whitespace-nowrap">Вернуться в ленту</span>
                    </Link>
                    <button 
                        onClick={handleCancelPremium}
                        disabled={isCancelling}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-red-600/20 text-red-400 font-semibold rounded-lg hover:bg-red-600/40 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                        {isCancelling ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                        <span className="whitespace-nowrap">Отключить Premium</span>
                    </button>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </div>
            </motion.div>
        ) : (
            <div className="w-full max-w-5xl text-center">
                <Sparkles size={48} className="mx-auto text-yellow-400" />
                <h1 className="text-4xl md:text-5xl font-bold mt-4">Flow PREMIUM</h1>
                <p className="text-lg text-slate-600 dark:text-white/70 mt-2">
                    Получите доступ к эксклюзивным функциям и поддержите развитие проекта!
                </p>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div key={plan.id} className="relative pt-4">
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                                    ПОПУЛЯРНОЕ
                                </div>
                            )}
                            <div className={`ios-glass-final rounded-3xl p-8 h-full flex flex-col ${plan.popular ? 'border-2 border-blue-500' : ''}`}>
                                <h2 className="text-2xl font-bold">{plan.name}</h2>
                                <p className="text-slate-500 dark:text-white/60 mt-2">{plan.description}</p>
                                <p className="text-5xl font-extrabold my-6">
                                    {parseFloat(plan.amount).toFixed(0)} <span className="text-2xl font-medium">₽</span>
                                </p>
                                
                                <ul className="text-left space-y-3 my-6 text-slate-600 dark:text-white/80">
                                    {plan.features?.map((feature, index) => (
                                        <li key={index} className="flex items-start space-x-3">
                                            <Check className="text-green-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex-grow"></div>
                                <button
                                    onClick={() => handlePurchase(plan.id)}
                                    disabled={!!loadingPlan}
                                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center mt-auto"
                                >
                                    {loadingPlan === plan.id ? <Loader2 className="animate-spin" /> : 'Выбрать'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-10 text-xs text-slate-400">
                    <p>Нажимая "Выбрать", вы будете перенаправлены на защищенную страницу оплаты YooKassa.</p>
                    <p>Подписка будет активирована автоматически после успешного платежа.</p>
                </div>
            </div>
        )}
    </main>
);

};
export default PremiumPage;