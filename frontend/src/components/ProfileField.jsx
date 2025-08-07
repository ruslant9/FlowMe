// frontend/src/components/ProfileField.jsx
import React from 'react';

const ProfileField = ({ label, value, accentTextColor }) => {
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    // Классы для подписи (label) и значения (value) теперь адаптивные
    const labelClasses = accentTextColor ? '' : 'text-slate-500 dark:text-slate-400';
    const valueClasses = accentTextColor ? '' : 'text-slate-800 dark:text-white';
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    const labelStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {};

    return (
        <div>
            <p className={`text-sm ${labelClasses}`} style={labelStyle}>{label}</p>
            <p className={`text-lg break-words ${valueClasses}`}>{value || 'Не указано'}</p>
        </div>
    );
};

export default ProfileField;