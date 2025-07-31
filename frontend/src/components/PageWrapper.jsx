// frontend/src/components/PageWrapper.jsx
import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20, // Начинаем чуть ниже
  },
  in: {
    opacity: 1,
    y: 0, // Приезжаем в центр
  },
  out: {
    opacity: 0,
    y: -20, // Уезжаем чуть вверх
  }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;