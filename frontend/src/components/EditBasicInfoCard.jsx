// frontend/src/components/EditBasicInfoCard.jsx
import React, { useState, Fragment, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DatePicker, { registerLocale } from 'react-datepicker';
import { getYear, getMonth, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Listbox, Combobox, Transition } from '@headlessui/react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';

registerLocale('ru', ru);
const API_URL = import.meta.env.VITE_API_URL;

const CustomHeader = ({ date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => {
    const years = Array.from({ length: getYear(new Date()) - 1900 + 1 }, (_, i) => 1900 + i).reverse();
    const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
    return (
        <div className="p-2 flex items-center justify-between bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 dark:text-white">
            <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"><ChevronLeft size={20}/></button>
            <div className="flex items-center space-x-2">
                <Listbox value={months[getMonth(date)]} onChange={(monthName) => changeMonth(months.indexOf(monthName))}>
                    <div className="relative"><Listbox.Button className="relative w-36 cursor-pointer rounded-lg bg-slate-200 dark:bg-black/30 py-1.5 pl-3 pr-8 text-left text-sm"><span className="block truncate">{months[getMonth(date)]}</span><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></span></Listbox.Button><Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"><Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-10">{months.map((month, index) => (<Listbox.Option key={index} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={month}>{({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{month}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span>)}</>)}</Listbox.Option>))}</Listbox.Options></Transition></div>
                </Listbox>
                <Listbox value={getYear(date)} onChange={changeYear}>
                    <div className="relative"><Listbox.Button className="relative w-28 cursor-pointer rounded-lg bg-slate-200 dark:bg-black/30 py-1.5 pl-3 pr-8 text-left text-sm"><span className="block truncate">{getYear(date)}</span><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></span></Listbox.Button><Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"><Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-10">{years.map((year, index) => (<Listbox.Option key={index} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={year}>{({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{year}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span>)}</>)}</Listbox.Option>))}</Listbox.Options></Transition></div>
                </Listbox>
            </div>
            <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"><ChevronRight size={20}/></button>
        </div>
    );
};

const EditField = ({ label, name, value, onChange }) => (
    <div>
        <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">{label}</label>
        <input type="text" name={name} value={value || ''} onChange={onChange} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
);

const ProfileFieldDisplay = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-white/50">{label}</p>
        <p className="text-lg break-words">{value || 'Не указано'}</p>
    </div>
);

const EditBasicInfoCard = ({ user, isEditing, onSave, onCancel }) => {
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Разбиваем состояние на отдельные части ---
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [dob, setDob] = useState(null);
    const [gender, setGender] = useState('Не указан');
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const [loading, setLoading] = useState(false);
    const genderOptions = ['Не указан', 'Мужской', 'Женский'];
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [cityPage, setCityPage] = useState(1);
    const [hasMoreCities, setHasMoreCities] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const debounceTimeout = useRef(null);
    const cityLoaderRef = useRef(null);
    
    useEffect(() => {
        if (user && isEditing) {
            setFullName(user.fullName || '');
            setUsername(user.username || '');
            setDob(user.dob ? new Date(user.dob) : null);
            setGender(user.gender || 'Не указан');
            setSelectedCity(user.city || null);
            fetchCountries(user.country);
        }
    }, [user, isEditing]);

    const fetchCountries = useCallback(async (initialCountryName) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/locations/countries`, { headers: { Authorization: `Bearer ${token}` } });
            setCountries(res.data);
            let countryToSet = res.data.find(c => c.name === initialCountryName) || res.data.find(c => c.code === 'RU');
            setSelectedCountry(countryToSet);
        } catch (error) { toast.error("Не удалось загрузить страны"); }
    }, []);

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
        if (selectedCountry) {
             fetchCities(1, selectedCountry.code, citySearch, true);
        }
    }, [selectedCountry]);
    
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

    const handleSave = async () => {
        setLoading(true);
        const toastId = toast.loading('Сохранение...');
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
            onSave();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка сохранения.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <ProfileFieldDisplay label="Полное имя" value={user.fullName} />
                <ProfileFieldDisplay label="Местоположение" value={[user.city, user.country].filter(Boolean).join(', ')} />
                <ProfileFieldDisplay label="Дата рождения" value={user.dob ? format(new Date(user.dob), 'd MMMM yyyy', { locale: ru }) : ''} />
                <ProfileFieldDisplay label="Пол" value={user.gender} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <EditField label="Полное имя" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <EditField label="Имя пользователя" name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Дата рождения</label>
                <DatePicker selected={dob} onChange={date => setDob(date)} maxDate={new Date()} locale="ru" dateFormat="dd.MM.yyyy" placeholderText="ДД.ММ.ГГГГ" className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" renderCustomHeader={CustomHeader} showMonthDropdown showYearDropdown dropdownMode="select" />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Пол</label>
                <Listbox value={gender} onChange={setGender}><div className="relative"><Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 h-[40px]"><span className="block truncate">{gender}</span><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true"/></span></Listbox.Button><Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"><Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-20">{genderOptions.map((option, i) => (<Listbox.Option key={i} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={option}>{({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{option}</span>{selected && (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400"><Check className="h-5 w-5" aria-hidden="true"/></span>)}</>)}</Listbox.Option>))}</Listbox.Options></Transition></div></Listbox>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Страна</label>
                <Combobox value={selectedCountry} onChange={(country) => { setSelectedCountry(country); setSelectedCity(null); setCitySearch(''); }}><div className="relative"><Combobox.Input onChange={(e) => {}} displayValue={(c) => c?.name || ''} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" /><Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true"/></Combobox.Button><Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-30">{countries.map((country) => <Combobox.Option key={country.code} value={country} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`}>{({ selected }) => <><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{country.name}</span>{selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span> : null}</>}</Combobox.Option>)}</Combobox.Options></div></Combobox>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-1 block">Город</label>
                <Combobox value={selectedCity} onChange={setSelectedCity} disabled={!selectedCountry}><div className="relative"><Combobox.Input onChange={(e) => setCitySearch(e.target.value)} displayValue={(c) => c || ''} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder={!selectedCountry ? "Сначала выберите страну" : "Поиск города..."}/><Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></Combobox.Button><Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none z-30">{cities.length > 0 && cities.map((city, i) => <Combobox.Option key={`${city}-${i}`} value={city} className={({ active }) => `relative cursor-pointer select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`}>{city}</Combobox.Option>)}{hasMoreCities && <div ref={cityLoaderRef} className="py-2 text-center"><Loader2 className="animate-spin inline-block"/></div>}{!loadingCities && cities.length === 0 && citySearch.trim() !== '' && (<div className="relative cursor-default select-none py-2 px-4 text-slate-500 dark:text-slate-400">Город не найден.</div>)}</Combobox.Options></div></Combobox>
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center">
                    {loading ? <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> : <Save size={18} className="mr-2" />}
                    Сохранить
                </button>
            </div>
        </div>
    );
};

export default EditBasicInfoCard;