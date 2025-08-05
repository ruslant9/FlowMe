// frontend/src/components/ProfileField.jsx --- НОВЫЙ ФАЙЛ ---

import React from 'react';

const ProfileField = ({ label, value, accentTextColor }) => {
    const labelClasses = accentTextColor ? '' : 'text-slate-500 dark:text-white/50';
    const labelStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {};

    return (
        <div>
            <p className={`text-sm ${labelClasses}`} style={labelStyle}>{label}</p>
            <p className="text-lg break-words">{value || 'Не указано'}</p>
        </div>
    );
};

export default ProfileField;