// frontend/src/components/AnimatedSphere.jsx

import React from 'react';

const AnimatedSphere = () => {
  return (
    <div className="scene">
      <div className="sphere">
        {/* Создаем несколько колец с разными трансформациями */}
         <div className="sphere-ring sphere-ring-1"></div>
        <div className="sphere-ring sphere-ring-2"></div>
        <div className="sphere-ring sphere-ring-3"></div>

        {/* Ядро сферы */}
        <div className="core"></div>
      </div>
    </div>
  );
};

export default AnimatedSphere;