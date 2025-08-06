// frontend/src/pages/SettingsPage.jsx

import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import { useModal } from '../hooks/useModal';
import { useUser } from '../hooks/useUser';
import { jwtDecode } from 'jwt-decode';
import { format } from 'date-fns';
import {
    Trash2, Loader2, MessageSquare, Calendar, Image, FileText, Mail, EyeOff, Tag, Check, ChevronDown, UserPlus, Users, Briefcase, Globe, Lock, MapPin, KeyRound, Shield, Laptop, Smartphone, XCircle, Music, Bell, ShieldAlert, BellOff
} from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDynamicPosition } from '../hooks/useDynamicPosition';
import PageWrapper from '../components/PageWrapper';

const API_URL = import.meta.env.VITE_API_URL;

const privacyOptions = [
    { id: 'everyone', name: 'Все' },
    { id: 'friends', name: 'Только друзья' },
    { id: 'private', name: 'Только я' },
];

const friendRequestOptions = [
    { id: 'everyone', name: 'Все' },
    { id: 'private', name: 'Никому' },
];

const messageMeOptions = [
    { id: 'everyone', name: 'Все' },
    { id: 'friends', name: 'Только друзья' },
    { id: 'private', name: 'Никто' },
];

const communityInviteOptions = [
    { id: 'everyone', name: 'Все' },
    { id: 'friends', name: 'Только друзья' },
    { id: 'private', name: 'Никто' },
];

const getDeviceIcon = (deviceString) => {
    if (!deviceString) return <Laptop size={24} />;
    const lowerCaseDevice = deviceString.toLowerCase();
    if (['iphone', 'pixel', 'samsung', 'xiaomi', 'huawei', 'oneplus', 'mobile', 'android'].some(d => lowerCaseDevice.includes(d))) {
        return <Smartphone size={24} />;
    }
    return <Laptop size={24} />;
};

const Section = ({ title, icon: Icon, children, isInitiallyOpen = false }) => {
    const [isOpen, setIsOpen] = useState(isInitiallyOpen);
    return (
        <section className="mb-4">
            <button className="w-full flex justify-between items-center p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors group" onClick={() => setIsOpen(v => !v)}>
                <div className="flex items-center space-x-4">
                    <Icon size={22} className="text-slate-500 dark:text-white/70" />
                    <div>
                        <h2 className="text-lg font-bold text-left">{title}</h2>
                    </div>
                </div>
                <ChevronDown size={24} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial="collapsed" animate="open" exit="collapsed"
                        variants={{ open: { opacity: 1, height: 'auto', marginTop: '1rem' }, collapsed: { opacity: 0, height: 0, marginTop: '0rem' } }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="rounded-lg bg-slate-100/30 dark:bg-slate-800/30 p-4 overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

const ToggleControl = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-sm">
        <div>
            <p className="font-semibold text-slate-700 dark:text-white">{label}</p>
            {description && <p className="text-sm text-slate-500 dark:text-white/60">{description}</p>}
        </div>
        <label htmlFor={label.replace(/\s+/g, '-')} className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id={label.replace(/\s+/g, '-')} className="sr-only peer" checked={checked} onChange={onChange} />
            <div className="w-11 h-6 bg-gray-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
    </div>
);

const PrivacySettingControl = ({ label, icon: Icon, value, onChange, description, children, options }) => {
    const [buttonRef, position] = useDynamicPosition();

    return (
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-sm flex-wrap gap-4">
            <div className="flex items-center space-x-3">
                <Icon size={20} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-slate-700 dark:text-white">{label}</p>
                    {description && <p className="text-sm text-slate-500 dark:text-white/60">{description}</p>}
                </div>
            </div>
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-end sm:justify-start">
                {children}
                <Listbox value={value} onChange={onChange}>
                    <div className="relative w-full sm:w-48">
                        <Listbox.Button ref={buttonRef} className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
                            <span className="block truncate">{options.find(opt => opt.id === value)?.name}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className={`absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-50 ${
                                position === 'top' ? 'bottom-full mb-1' : ''
                            }`}>
                                {options.map((option) => (
                                    <Listbox.Option key={option.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 dark:bg-blue-600' : '' }`} value={option.id}>
                                        {({ selected }) => (<><span className={`block truncate ${ selected ? 'font-medium text-blue-600 dark:text-white' : 'font-normal text-slate-900 dark:text-slate-200' }`}>{option.name}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5" /></span>)}</>)}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>
        </div>
    );
};

const NotificationToggle = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState('default');
    const [loading, setLoading] = useState(true);
    const [subscriptionObject, setSubscriptionObject] = useState(null);

    const checkSubscription = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPermission('denied');
            setLoading(false);
            return;
        }
        setPermission(Notification.permission);
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setIsSubscribed(!!sub);
        setSubscriptionObject(sub);
        setLoading(false);
    }, []);

    useEffect(() => {
        checkSubscription();
    }, [checkSubscription]);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = "=".repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeUser = async () => {
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') {
                toast.error('Вы заблокировали уведомления. Измените это в настройках браузера.');
                setLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/vapid-public-key`, { headers: { Authorization: `Bearer ${token}` } });
            const applicationServerKey = urlBase64ToUint8Array(res.data.publicKey);

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            await axios.post(`${API_URL}/api/user/subscribe`, sub, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Уведомления включены!');
            checkSubscription();
        } catch (error) {
            toast.error('Не удалось включить уведомления.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    const unsubscribeUser = async () => {
        if (!subscriptionObject) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/user/unsubscribe`, { endpoint: subscriptionObject.endpoint }, { headers: { Authorization: `Bearer ${token}` } });
            await subscriptionObject.unsubscribe();
            toast.success('Уведомления отключены.');
            checkSubscription();
        } catch (error) {
            toast.error('Не удалось отключить уведомления.');
        } finally {
            setLoading(false);
        }
    };
    
    const isMobile = useMemo(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0, []);
    
    if (!isMobile) {
        return null;
    }
    
    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center"><Loader2 className="animate-spin" /></div>;
        }

        if (permission === 'denied') {
            return (
                <>
                    <p className="text-sm text-red-500 dark:text-red-400">
                        Уведомления заблокированы в настройках вашего браузера. Чтобы их включить, измените разрешения для этого сайта.
                    </p>
                    <button
                        disabled
                        className="mt-2 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed flex items-center space-x-2"
                    >
                        <ShieldAlert size={18} /><span>Заблокировано</span>
                    </button>
                </>
            );
        }
        
        if (isSubscribed) {
            return (
                <button
                    onClick={unsubscribeUser}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center space-x-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><BellOff size={18} /><span>Отключить</span></>}
                </button>
            );
        }

        return (
            <button
                onClick={subscribeUser}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <><Bell size={18} /><span>Включить</span></>}
            </button>
        );
    };

    return (
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-start gap-3">
            <div>
                <p className="font-semibold text-slate-700 dark:text-white">Push-уведомления</p>
                <p className="text-sm text-slate-500 dark:text-white/60">Получайте уведомления, даже когда сайт закрыт.</p>
            </div>
            {renderContent()}
        </div>
    );
};

const SettingsPage = () => {
    useTitle('Настройки');
    const navigate = useNavigate();
    const { showConfirmation } = useModal();
    const { currentUser, refetchUser } = useUser();
    const [loadingAccountDelete, setLoadingAccountDelete] = useState(false);
    const [loadingPrivacySettings, setLoadingPrivacySettings] = useState(true);
    const [initialSettings, setInitialSettings] = useState(null);
    const [privacySettings, setPrivacySettings] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [sessionsExpanded, setSessionsExpanded] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', verificationCode: '' });
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [verificationRequired, setVerificationRequired] = useState(false);

    const currentSessionId = useMemo(() => {
        const token = localStorage.getItem('token');
        try {
            return token ? jwtDecode(token).sessionId : null;
        } catch (e) { return null; }
    }, []);

    const fetchPrivacySettings = useCallback(async () => {
        setLoadingPrivacySettings(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/privacy-settings`, { headers: { Authorization: `Bearer ${token}` } });
            setPrivacySettings(res.data);
            setInitialSettings(res.data);
        } catch (error) { toast.error('Не удалось загрузить настройки приватности.'); } 
        finally { setLoadingPrivacySettings(false); }
    }, []);
    
    const fetchSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/sessions`, { headers: { Authorization: `Bearer ${token}` } });
            setSessions(res.data);
        } catch (error) { toast.error('Не удалось загрузить активные сессии.'); }
        finally { setLoadingSessions(false); }
    }, []);

    useEffect(() => {
        fetchPrivacySettings();
        fetchSessions();
    }, [fetchPrivacySettings, fetchSessions]);

    const handlePrivacyChange = useCallback((key, value) => setPrivacySettings(prev => ({ ...prev, [key]: value })), []);
    const handleToggleChange = useCallback((key, checked) => setPrivacySettings(prev => ({ ...prev, [key]: checked })), []);
    
    const savePrivacySettings = async () => {
        const toastId = toast.loading('Сохранение настроек...');
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/user/privacy-settings`, privacySettings, { headers: { Authorization: `Bearer ${token}` } });
            setInitialSettings(privacySettings);
            toast.success('Настройки сохранены.', { id: toastId });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка сохранения.', { id: toastId });
        }
    };
    
    const haveSettingsChanged = () => JSON.stringify(initialSettings) !== JSON.stringify(privacySettings);
    
    const handleDeleteAccount = () => {
        showConfirmation({
            title: 'Удалить аккаунт?',
            message: 'Это действие необратимо! Все ваши данные будут удалены навсегда. Вы уверены?',
            onConfirm: async () => {
                setLoadingAccountDelete(true);
                const toastId = toast.loading('Удаление аккаунта...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/delete-account`, { headers: { Authorization: `Bearer ${token}` } });
                    localStorage.clear();
                    toast.success('Аккаунт успешно удален.', { id: toastId });
                    navigate('/register');
                } catch (error) { toast.error(error.response?.data?.message || 'Ошибка удаления.', { id: toastId }); } 
                finally { setLoadingAccountDelete(false); }
            }
        });
    };
    
    const terminateSession = (sessionId) => {
        showConfirmation({
            title: "Прервать сессию?",
            message: "Устройство будет немедленно отключено от вашего аккаунта. Вы уверены?",
            onConfirm: async () => {
                const toastId = toast.loading('Прерывание сессии...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Сессия прервана.', { id: toastId });
                    fetchSessions();
                } catch (error) { toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId }); }
            }
        });
    };

    const terminateAllOtherSessions = () => {
        showConfirmation({
            title: "Прервать все другие сессии?",
            message: "Все устройства, кроме текущего, будут отключены от вашего аккаунта.",
            onConfirm: async () => {
                const toastId = toast.loading('Прерывание сессий...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/sessions`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Все другие сессии прерваны.', { id: toastId });
                    fetchSessions();
                } catch (error) { toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId }); }
            }
        });
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordChangeLoading(true);
        const endpoint = verificationRequired ? '/password/verify-change' : '/password/change';
        const payload = verificationRequired 
            ? { code: passwordData.verificationCode } 
            : { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword, confirmPassword: passwordData.confirmPassword };

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/user${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.verificationRequired) {
                setVerificationRequired(true);
                toast.success(res.data.message);
            } else {
                toast.success(res.data.message);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '', verificationCode: '' });
                setVerificationRequired(false);
                refetchUser();
            }
        } catch (error) { toast.error(error.response?.data?.message || 'Произошла ошибка.'); }
        finally { setPasswordChangeLoading(false); }
    };

    return (
        <PageWrapper>
            <main className="flex-1 p-4 md:p-8">
                <div className="ios-glass-final rounded-3xl p-6 w-full max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-center">Настройки</h1>

                    <Section title="Уведомления" icon={Bell} isInitiallyOpen={false}>
                        <div className="space-y-4">
                            <NotificationToggle />
                            {privacySettings && (
                                <ToggleControl label="Отключить всплывающие уведомления в приложении" description="Вы не будете получать уведомления внутри сайта." checked={privacySettings.disableToasts} onChange={(e) => handleToggleChange('disableToasts', e.target.checked)} />
                            )}
                            {haveSettingsChanged() && (
                                <div className="flex justify-end pt-2">
                                    <button onClick={savePrivacySettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Сохранить</button>
                                </div>
                            )}
                        </div>
                    </Section>
                    
                    <Section title="Безопасность и вход" icon={Shield} isInitiallyOpen={false}>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Смена пароля</h3>
                                <form onSubmit={handlePasswordChange} className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    {verificationRequired ? (
                                        <>
                                            <p className="text-sm text-center text-green-600 dark:text-green-400">На вашу почту отправлен код подтверждения. Введите его ниже.</p>
                                            <input type="text" placeholder="Код из письма" value={passwordData.verificationCode} onChange={(e) => setPasswordData(p => ({...p, verificationCode: e.target.value}))} className="w-full p-2 bg-slate-200 dark:bg-slate-700 rounded-lg" required />
                                        </>
                                    ) : (
                                        <>
                                            {currentUser?.hasPassword && (
                                                <input type="password" placeholder="Текущий пароль (если сессия старше 1 часа)" value={passwordData.currentPassword} onChange={(e) => setPasswordData(p => ({...p, currentPassword: e.target.value}))} className="w-full p-2 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                                            )}
                                            <input type="password" placeholder={currentUser?.hasPassword ? "Новый пароль" : "Задайте пароль для входа"} value={passwordData.newPassword} onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))} className="w-full p-2 bg-slate-200 dark:bg-slate-700 rounded-lg" required />
                                            <input type="password" placeholder="Подтвердите новый пароль" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} className="w-full p-2 bg-slate-200 dark:bg-slate-700 rounded-lg" required />
                                        </>
                                    )}
                                    <div className="flex justify-end pt-2">
                                        <button type="submit" disabled={passwordChangeLoading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center min-w-[180px]">
                                            {passwordChangeLoading ? <Loader2 className="animate-spin" /> : (verificationRequired ? 'Подтвердить' : (currentUser?.hasPassword ? 'Сменить пароль' : 'Установить пароль'))}
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Активные сессии</h3>
                                {loadingSessions ? <Loader2 className="animate-spin"/> : (
                                    <div className="space-y-2">
                                        {(sessionsExpanded ? sessions : sessions.slice(0, 3)).map(session => {
                                            const isCurrent = session._id === currentSessionId;
                                            const isLocal = session.ipAddress === '::1' || session.ipAddress === '127.0.0.1';
                                            const primaryIp = session.ipAddress ? session.ipAddress.split(',')[0].trim() : 'Неизвестный IP';

                                            return (
                                                <div key={session._id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-start justify-between gap-3">
                                                    <div className="flex items-start space-x-3 min-w-0">
                                                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 mt-1">
                                                            {getDeviceIcon(session.device)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold truncate">
                                                                {session.browser || 'Unknown'} on {session.os || 'Unknown'}
                                                                {isCurrent && <span className="text-xs text-green-500 ml-2">(Текущая)</span>}
                                                            </p>
                                                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
                                                                {isLocal ? (
                                                                    <span className="font-semibold text-cyan-500">Локальная сессия</span>
                                                                ) : (
                                                                    <div className="flex items-center space-x-2">
                                                                        {session.countryCode && session.countryCode !== 'xx' && (
                                                                            <img src={`https://flagcdn.com/w20/${session.countryCode}.png`} alt={session.countryCode} className="w-5 h-auto rounded-sm"/>
                                                                        )}
                                                                        <span className="truncate">{primaryIp}</span>
                                                                    </div>
                                                                )}
                                                                <span className="hidden sm:inline">•</span>
                                                                <span>{format(new Date(session.lastActive), 'dd.MM.yyyy HH:mm')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {!isCurrent && (
                                                        <button onClick={() => terminateSession(session._id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full flex-shrink-0" title="Прервать сессию">
                                                            <XCircle/>
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div className="mt-4 flex items-center justify-between">
                                            {sessions.length > 3 ? (
                                                <button 
                                                    onClick={() => setSessionsExpanded(!sessionsExpanded)} 
                                                    className="text-sm font-semibold text-blue-500 hover:underline"
                                                >
                                                    {sessionsExpanded ? 'Скрыть' : `Показать еще ${sessions.length - 3}`}
                                                </button>
                                            ) : (
                                                <span /> 
                                            )}
                                            
                                            {sessions.length > 1 && (
                                                <button 
                                                    onClick={terminateAllOtherSessions} 
                                                    className="text-sm font-semibold text-red-500 hover:underline"
                                                >
                                                    Прервать все другие сессии
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>

                    <Section title="Настройки приватности" icon={Lock}>
                        {loadingPrivacySettings || !privacySettings ? <Loader2 className="animate-spin mx-auto"/> : (
                            <div className="space-y-4">
                                 <div className="space-y-4">
                                    <PrivacySettingControl label="Кто видит дату рождения" icon={Calendar} value={privacySettings.viewDOB} onChange={(v) => handlePrivacyChange('viewDOB', v)} options={privacyOptions}>{privacySettings.viewDOB !== 'private' && (<label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-white/70"><input type="checkbox" checked={privacySettings.hideDOBYear} onChange={(e) => handleToggleChange('hideDOBYear', e.target.checked)} className="form-checkbox h-4 w-4 rounded" /><span>Скрыть год</span></label>)}</PrivacySettingControl>
                                    <PrivacySettingControl label="Кто видит аватар" icon={Image} value={privacySettings.viewAvatar} onChange={(v) => handlePrivacyChange('viewAvatar', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит почту" icon={Mail} value={privacySettings.viewEmail} onChange={(v) => handlePrivacyChange('viewEmail', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит интересы" icon={Tag} value={privacySettings.viewInterests} onChange={(v) => handlePrivacyChange('viewInterests', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит местоположение" icon={MapPin} value={privacySettings.viewLocation} onChange={(v) => handlePrivacyChange('viewLocation', v)} options={privacyOptions} /> 
                                    <PrivacySettingControl label="Кто видит список друзей" icon={Users} value={privacySettings.viewFriends} onChange={(v) => handlePrivacyChange('viewFriends', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит список подписчиков" icon={Users} value={privacySettings.viewSubscribers} onChange={(v) => handlePrivacyChange('viewSubscribers', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит мои сообщества" icon={Globe} value={privacySettings.viewSubscribedCommunities} onChange={(v) => handlePrivacyChange('viewSubscribedCommunities', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит посты" icon={FileText} value={privacySettings.viewPosts} onChange={(v) => handlePrivacyChange('viewPosts', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто видит онлайн активность" icon={EyeOff} value={privacySettings.viewOnlineStatus} onChange={(v) => handlePrivacyChange('viewOnlineStatus', v)} options={privacyOptions} />
                                    <PrivacySettingControl label="Кто может писать мне" icon={MessageSquare} value={privacySettings.messageMe} onChange={(v) => handlePrivacyChange('messageMe', v)} options={messageMeOptions} />
                                    <PrivacySettingControl label="Кто может отправлять запросы в друзья" icon={UserPlus} value={privacySettings.sendFriendRequest} onChange={(v) => handlePrivacyChange('sendFriendRequest', v)} options={friendRequestOptions} />
                                    <PrivacySettingControl label="Кто может приглашать в сообщества" icon={Briefcase} value={privacySettings.inviteToCommunity} onChange={(v) => handlePrivacyChange('inviteToCommunity', v)} options={communityInviteOptions} />
                                    <PrivacySettingControl label="Кто видит мою музыку" icon={Music} value={privacySettings.viewMusic} onChange={(v) => handlePrivacyChange('viewMusic', v)} options={privacyOptions} />
                                 </div>
                                <div className="flex justify-end pt-4">
                                    <button onClick={savePrivacySettings} disabled={!haveSettingsChanged()} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">Сохранить</button>
                                </div>
                            </div>
                        )}
                    </Section>
                    
                    <section className="mt-8">
                        <div className="bg-red-500/10 dark:bg-red-900/20 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h2 className="font-bold text-red-700 dark:text-red-300">Удаление аккаунта</h2>
                                <p className="text-sm text-red-600 dark:text-red-400">Это действие нельзя будет отменить.</p>
                            </div>
                            <button onClick={handleDeleteAccount} disabled={loadingAccountDelete} className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                                {loadingAccountDelete ? <Loader2 className="animate-spin" /> : <Trash2 />}<span>Удалить аккаунт</span>
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </PageWrapper>
    );
};

export default SettingsPage;