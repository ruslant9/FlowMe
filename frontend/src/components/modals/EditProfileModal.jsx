// frontend/src/components/modals/EditProfileModal.jsx

import React, { useState, Fragment, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Pencil } from 'lucide-react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import DatePicker, { registerLocale } from 'react-datepicker';
import { Listbox, Transition, Combobox } from '@headlessui/react';
import { getYear, getMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import useMediaQuery from '../../hooks/useMediaQuery';

import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker-custom.css';

registerLocale('ru', ru);
const API_URL = import.meta.env.VITE_API_URL;

// ... (CustomHeader component remains unchanged)
const CustomHeader = ({ date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => {
    const years = Array.from({ length: getYear(new Date()) - 1900 + 1 }, (_, i) => 1900 + i).reverse();
    const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
    
    return (
        <div className="p-2 flex items-center justify-between bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 dark:text-white">
            <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50">
                <ChevronLeft size={20}/>
            </button>
            <div className="flex items-center space-x-2">
                <Listbox value={months[getMonth(date)]} onChange={(monthName) => changeMonth(months.indexOf(monthName))}>
                    <div className="relative">
                        <Listbox.Button className="relative w-36 cursor-pointer rounded-lg bg-slate-200 dark:bg-black/30 py-1.5 pl-3 pr-8 text-left text-sm">
                            <span className="block truncate">{months[getMonth(date)]}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-10">
                                {months.map((month, index) => (
                                    <Listbox.Option key={index} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={month}>
                                        {({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{month}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span>)}</>)}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
                <Listbox value={getYear(date)} onChange={changeYear}>
                    <div className="relative">
                        <Listbox.Button className="relative w-28 cursor-pointer rounded-lg bg-slate-200 dark:bg-black/30 py-1.5 pl-3 pr-8 text-left text-sm">
                            <span className="block truncate">{getYear(date)}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-10">
                                {years.map((year, index) => (
                                    <Listbox.Option key={index} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={year}>
                                        {({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{year}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span>)}</>)}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </Listbox>
            </div>
            <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50">
                <ChevronRight size={20}/>
            </button>
        </div>
    );
};


const EditField = ({ label, name, value, onChange }) => (
    <div>
        <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">{label}</label>
        <input type="text" name={name} value={value} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
);

const EditProfileModal = ({ isOpen, onClose, user }) => {
    // ... (state declarations remain the same)
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [dob, setDob] = useState(null);
    const [gender, setGender] = useState('Не указан');
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const genderOptions = ['Не указан', 'Мужской', 'Женский'];
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [cityPage, setCityPage] = useState(1);
    const [hasMoreCities, setHasMoreCities] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    
    const [countrySearch, setCountrySearch] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [editingField, setEditingField] = useState(null);
    
    const debounceTimeout = useRef(null);
    const cityLoaderRef = useRef(null);
    const countryInputRef = useRef(null);
    const cityInputRef = useRef(null);
    
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    useEffect(() => {
        if (editingField === 'country') {
            countryInputRef.current?.focus();
        } else if (editingField === 'city') {
            cityInputRef.current?.focus();
        }
    }, [editingField]);

    // ... (fetch and other useEffect hooks remain the same)
    const fetchCountries = useCallback(async (initialCountryName) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/locations/countries`, { headers: { Authorization: `Bearer ${token}` } });
            setCountries(res.data);
            if (initialCountryName) {
                let countryToSet = res.data.find(c => c.name === initialCountryName);
                setSelectedCountry(countryToSet);
            }
        } catch (error) { toast.error("Не удалось загрузить страны"); }
    }, []);

    useEffect(() => {
        if (user && isOpen) {
            setFullName(user.fullName || '');
            setUsername(user.username || '');
            setDob(user.dob ? new Date(user.dob) : null);
            setGender(user.gender || 'Не указан');
            setSelectedCity(user.city || null);
            fetchCountries(user.country);
            setEditingField(null);
            setCountrySearch('');
            setCitySearch('');
        }
    }, [user, isOpen, fetchCountries]);

    const fetchCities = useCallback(async (page, countryCode, search, isNewSearch) => {
        if (!countryCode) return;
        setLoadingCities(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/locations/cities?countryCode=${countryCode}&search=${search}&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
            setCities(prev => isNewSearch ? res.data.cities : [...prev, ...res.data.cities]);
            setHasMoreCities(res.data.hasMore);
            setCityPage(page);
        } catch (error) { toast.error("Не удалось загрузить города"); } finally { setLoadingCities(false); }
    }, []);

    useEffect(() => {
        if (selectedCountry && !citySearch) {
             fetchCities(1, selectedCountry.code, '', true);
        }
    }, [selectedCountry, fetchCities]);
    
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            if (selectedCountry?.code) {
                fetchCities(1, selectedCountry.code, citySearch, true);
            }
        }, 500);
        return () => clearTimeout(debounceTimeout.current);
    }, [citySearch, selectedCountry, fetchCities]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreCities && !loadingCities) {
                    const nextPage = cityPage + 1;
                    fetchCities(nextPage, selectedCountry.code, citySearch, false);
                }
            },
            { threshold: 1.0 }
        );
        const currentLoader = cityLoaderRef.current;
        if (currentLoader) observer.observe(currentLoader);
        return () => { if (currentLoader) observer.unobserve(currentLoader); };
    }, [cityLoaderRef, hasMoreCities, loadingCities, cityPage, selectedCountry, citySearch, fetchCities]);

    // ... (handleSave remains the same)
    const handleSave = async () => {
        setLoading(true);
        const toastId = toast.loading('Сохранение изменений...');
        try {
            const token = localStorage.getItem('token');
            const payload = { 
                fullName, 
                username, 
                dob, 
                gender, 
                country: selectedCountry?.name || '', 
                city: selectedCity || '' 
            };
            const res = await axios.put(`${API_URL}/api/user/profile`, payload, { headers: { Authorization: `Bearer ${token}` } });
            
            const localUser = JSON.parse(localStorage.getItem('user'));
            if(localUser.username !== res.data.user.username) localStorage.setItem('user', JSON.stringify({id: res.data.user._id, username: res.data.user.username}));

            toast.success('Профиль обновлен!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка сохранения.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    const filteredCountries = countrySearch === '' ? countries : countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));

    const handlePencilClick = (fieldName, ref) => {
    if (editingField === fieldName) {
        // Сначала убираем фокус
        if (ref?.current) {
            ref.current.blur();
        }
        // Немного отложим сброс состояния, чтобы blur успел отработать
        setTimeout(() => {
            setEditingField(null);
        }, 50);
    } else {
        setEditingField(fieldName);
        // На десктопе сразу даём фокус
        if (!isMobile && ref?.current) {
            setTimeout(() => ref.current.focus(), 0);
        }
    }
};

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Редактирование профиля</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <EditField label="Полное имя" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                <EditField label="Имя пользователя" name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Дата рождения</label>
                                    <DatePicker 
                                        selected={dob} 
                                        onChange={date => setDob(date)} 
                                        maxDate={new Date()} 
                                        locale="ru" 
                                        dateFormat="dd.MM.yyyy" 
                                        placeholderText="ДД.ММ.ГГГГ" 
                                        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        renderCustomHeader={CustomHeader}
                                        showMonthDropdown
                                        showYearDropdown
                                        dropdownMode="select"
                                        portalId="modal-root"
                                        withPortal={isMobile}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Пол</label>
                                    <Listbox value={gender} onChange={setGender}><div className="relative"><Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 h-[40px]"><span className="block truncate">{gender}</span><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true"/></span></Listbox.Button><Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"><Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-20">{genderOptions.map((option, i) => (<Listbox.Option key={i} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={option}>{({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{option}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400"><Check className="h-5 w-5" aria-hidden="true"/></span>)}</>)}</Listbox.Option>))}</Listbox.Options></Transition></div></Listbox>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Страна</label>
                                    <Combobox value={selectedCountry} onChange={(country) => { setSelectedCountry(country); setSelectedCity(null); setCitySearch(''); setCountrySearch(''); setEditingField(null); }}>
                                        <div className="relative">
                                            <Combobox.Input
                                                ref={countryInputRef}
                                                readOnly={isMobile && editingField !== 'country'}
                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                onBlur={() => { if (isMobile) setEditingField(null); }}
                                                displayValue={(c) => c?.name || ''} 
                                                className="w-full pl-3 pr-16 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                {isMobile && (
                                                    <button type="button" className="p-1 rounded-full text-gray-400 hover:text-white" onClick={() => handlePencilClick('country', countryInputRef)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <Combobox.Button className="p-1">
                                                    <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true"/>
                                                </Combobox.Button>
                                            </div>
                                            <Combobox.Options className={`absolute w-full z-30 ${isMobile ? 'bottom-full mb-1' : 'mt-1'} max-h-60 overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none`}>
                                                {filteredCountries.map((country) => <Combobox.Option key={country.code} value={country} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`}>{({ selected }) => <><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{country.name}</span>{selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span> : null}</>}</Combobox.Option>)}
                                            </Combobox.Options>
                                        </div>
                                    </Combobox>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Город</label>
                                    <Combobox value={selectedCity} onChange={(city) => { setSelectedCity(city); setEditingField(null); }} disabled={!selectedCountry}>
                                        <div className="relative">
                                            <Combobox.Input
                                                ref={cityInputRef}
                                                readOnly={isMobile && editingField !== 'city'}
                                                onChange={(e) => setCitySearch(e.target.value)}
                                                onBlur={() => { if (isMobile) setEditingField(null); }}
                                                displayValue={(c) => c || ''}
                                                className="w-full pl-3 pr-16 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                placeholder={!selectedCountry ? "Сначала выберите страну" : "Поиск или выбор города..."}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                {isMobile && selectedCountry && (
                                                    <button type="button" className="p-1 rounded-full text-gray-400 hover:text-white" onClick={() => handlePencilClick('city', cityInputRef)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <Combobox.Button className="p-1">
                                                    <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true"/>
                                                </Combobox.Button>
                                            </div>
                                            <Combobox.Options className={`absolute w-full z-30 ${isMobile ? 'bottom-full mb-1' : 'mt-1'} max-h-60 overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none`}>
                                                {cities.length > 0 && cities.map((city, i) => <Combobox.Option key={`${city}-${i}`} value={city} className={({ active }) => `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`}>{city}</Combobox.Option>)}
                                                {hasMoreCities && <div ref={cityLoaderRef} className="py-2 text-center"><Loader2 className="animate-spin inline-block"/></div>}
                                                {!loadingCities && cities.length === 0 && citySearch.trim() !== '' && (<div className="relative cursor-default select-none py-2 px-4 text-slate-500 dark:text-slate-400">Город не найден.</div>)}
                                            </Combobox.Options>
                                        </div>
                                    </Combobox>                                
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end items-center mt-6 space-x-4">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">Отмена</button>
                            <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center">
                                {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />}
                                <Save size={18} className="mr-2" /> Сохранить
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EditProfileModal;