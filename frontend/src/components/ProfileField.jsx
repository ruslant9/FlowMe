// frontend/src/components/ProfileField.jsx --- НОВЫЙ ФАЙЛ ---

import React from 'react';

const ProfileField = ({ label, value, accentTextColor }) => {
    // Класс для подписи (label) теперь всегда светло-серый, подходящий для темного фона.
    const labelClasses = accentTextColor ? '' : 'text-slate-400';
    const labelStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {};

    return (
        <div>
            <p className={`text-sm ${labelClasses}`} style={labelStyle}>{label}</p>
            {/* Основной текст (value) будет наследовать белый цвет от родительского контейнера. */}
            <p className="text-lg break-words">{value || 'Не указано'}</p>
        </div>
    );
};

export default ProfileField;