// frontend/src/components/AuthLayout.jsx
import React from 'react';
import BackgroundBlobs from './BackgroundBlobs';

const AuthLayout = ({ children }) => {
  return (
    // Этот div задает постоянный темный фон и содержит анимированные "капли"
    <div className="min-h-screen w-full font-sans bg-liquid-background text-white overflow-hidden relative">
      <BackgroundBlobs />
      {/* Здесь будут рендериться сами страницы (LoginPage, RegisterPage и т.д.) */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;