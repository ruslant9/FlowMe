// frontend/src/components/ImageViewer.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useCachedImage } from '../hooks/useCachedImage'; // ИМПОРТ

const API_URL = import.meta.env.VITE_API_URL;

// Компонент для кешированного изображения с анимацией
const CachedMotionImage = ({ src, ...props }) => {
    const { finalSrc, loading } = useCachedImage(src);

    if (loading) {
        return (
            <motion.div {...props} className="absolute w-full h-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-white" />
            </motion.div>
        );
    }

    return <motion.img src={finalSrc} {...props} />;
};

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.8
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.8
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => {
  return Math.abs(offset) * velocity;
};

const ImageViewer = ({ images, startIndex, onClose }) => {
  const [[page, direction], setPage] = React.useState([startIndex, 0]);

  const paginate = (newDirection) => {
    const newIndex = (page + newDirection + images.length) % images.length;
    setPage([newIndex, newDirection]);
  };

  const handleDotClick = (index) => {
    setPage([index, index > page ? 1 : -1]);
  }

  const handleClose = (e) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  }

  if (!images || images.length === 0) {
    return null;
  }

  const activeImageIndex = (page % images.length + images.length) % images.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-[101]"><X size={32}/></button>

      {images.length > 1 && (
        <>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/30 text-white text-sm rounded-full px-3 py-1 z-[101]">
                {activeImageIndex + 1} / {images.length}
            </div>
            <button onClick={() => paginate(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 text-white rounded-full z-[101] hover:bg-white/20">
              <ChevronLeft size={32} />
            </button>
            <button onClick={() => paginate(1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 text-white rounded-full z-[101] hover:bg-white/20">
              <ChevronRight size={32} />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-[101]">
                {images.map((_, index) => (
                <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); handleDotClick(index); }}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ease-in-out hover:scale-150 ${
                    index === activeImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
                    }`}
                ></button>
                ))}
            </div>
        </>
      )}

      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence initial={false} custom={direction}>
          <CachedMotionImage
            key={page}
            src={images[activeImageIndex]}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) {
                paginate(1);
              } else if (swipe > swipeConfidenceThreshold) {
                paginate(-1);
              }
            }}
            className="absolute max-w-[90%] max-h-[85%] object-contain"
          />
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ImageViewer;