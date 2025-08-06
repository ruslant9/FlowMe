// frontend/src/components/MorePanel.jsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const MorePanel = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Функция очистки для восстановления скролла при размонтировании
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return ReactDOM.createPortal(
      <AnimatePresence>
          {isOpen && (
              // Затемняющий фон
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              >
                  {/* Сама панель */}
                  <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", stiffness: 400, damping: 40 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-0 left-0 right-0 bg-slate-100 dark:bg-slate-900 rounded-t-2xl p-4 flex flex-col"
                      style={{ height: 'auto', maxHeight: '50vh' }}
                  >
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Больше опций</h2>
                          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10">
                              <X size={20} />
                          </button>
                      </div>
                      <div className="overflow-y-auto">
                          <div className="flex flex-col space-y-2">
                              {children}
                          </div>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>,
      document.getElementById('modal-root')
  );
};

export default MorePanel;