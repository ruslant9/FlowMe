// frontend/src/components/PageWrapper.jsx
import React from 'react';

// Компонент теперь просто рендерит дочерние элементы без анимации
const PageWrapper = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};

export default PageWrapper;