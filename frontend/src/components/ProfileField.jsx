// frontend/src/components/ProfileField.jsx

import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ProfileField = ({ label, value, accentTextColor }) => {
    const labelClasses = accentTextColor ? '' : 'text-slate-500 dark:text-white/50';
    const labelStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {};

    const formattedValue = value instanceof Date 
        ? format(value, 'd MMMM yyyy', { locale: ru })
        : (value || 'Не указано');

    return (
        <div>
            <p className={`text-sm ${labelClasses}`} style={labelStyle}>{label}</p>
            <p className="text-lg break-words">{formattedValue}</p>
        </div>
    );
};

export default ProfileField;