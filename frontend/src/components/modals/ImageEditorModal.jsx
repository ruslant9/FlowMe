// frontend/src/components/modals/ImageEditorModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crop, Brush, RotateCcw, Eraser } from 'lucide-react'; // Импортируем иконку ластика
import { Cropper } from 'react-cropper';
// Стили импортируются глобально в main.jsx
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const ImageEditorModal = ({ post, onSave, onClose }) => {
    // ИЗМЕНЕНИЕ: Добавляем 'eraser' в возможные инструменты
    const [activeTool, setActiveTool] = useState('crop'); // 'crop', 'draw', или 'eraser'
    const [brushColor, setBrushColor] = useState('#ef4444'); // red-500
    const [brushSize, setBrushSize] = useState(5);
    const [imageUrl, setImageUrl] = useState('');
    const cropperRef = useRef(null);
    const cropperContainerRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const drawCtxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (post?.imageUrl) {
            // --- ИЗМЕНЕНИЕ ---
            setImageUrl(`${getImageUrl(post.imageUrl)}?t=${new Date().getTime()}`);
        }
    }, [post]);


    // Управляем видимостью и интерактивностью рамки обрезки
    useEffect(() => {
        const cropper = cropperRef.current?.cropper;
        if (!cropper) return;
        const container = cropperContainerRef.current;
        if (!container) return;

        const cropBoxElement = container.querySelector('.cropper-crop-box');

        // ИЗМЕНЕНИЕ: Скрываем рамку для всех инструментов, кроме обрезки
        if (activeTool === 'draw' || activeTool === 'eraser') {
            cropper.disable();
            if (cropBoxElement) {
                cropBoxElement.style.display = 'none';
            }
        } else if (activeTool === 'crop') {
            cropper.enable();
            if (cropBoxElement) {
                cropBoxElement.style.display = 'block';
            }
        }
    }, [activeTool]);

    // ИЗМЕНЕНИЕ: Обновляем свойства кисти/ластика
    useEffect(() => {
        if (drawCtxRef.current) {
            if (activeTool === 'draw') {
                // Режим рисования
                drawCtxRef.current.globalCompositeOperation = 'source-over';
                drawCtxRef.current.strokeStyle = brushColor;
                drawCtxRef.current.lineWidth = brushSize;
            } else if (activeTool === 'eraser') {
                // Режим ластика
                drawCtxRef.current.globalCompositeOperation = 'destination-out';
                drawCtxRef.current.lineWidth = brushSize;
            }
        }
    }, [activeTool, brushColor, brushSize]);

    const setupDrawingCanvas = () => {
        const canvas = drawCanvasRef.current;
        const container = cropperContainerRef.current;
        if (!canvas || !container) return;

        const cropperImage = container.querySelector('.cropper-canvas img');
        if (!cropperImage) return;

        canvas.width = cropperImage.clientWidth;
        canvas.height = cropperImage.clientHeight;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawCtxRef.current = ctx;

        // Применяем начальные стили
        if (activeTool === 'draw') {
             ctx.strokeStyle = brushColor;
             ctx.lineWidth = brushSize;
        } else if (activeTool === 'eraser') {
             ctx.lineWidth = brushSize;
        }
    };

    const getCoords = (e) => {
        const canvas = drawCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e) => {
        // Рисуем или стираем
        if (activeTool !== 'draw' && activeTool !== 'eraser') return;
        if (!drawCtxRef.current) return;
        const { x, y } = getCoords(e);
        drawCtxRef.current.beginPath();
        drawCtxRef.current.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || (activeTool !== 'draw' && activeTool !== 'eraser')) return;
        if (!drawCtxRef.current) return;
        const { x, y } = getCoords(e);
        drawCtxRef.current.lineTo(x, y);
        drawCtxRef.current.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // ИЗМЕНЕНИЕ: Основная логика сохранения
    const handleSave = async () => {
        const toastId = toast.loading('Сохранение изображения...');
        try {
            const cropper = cropperRef.current?.cropper;
            if (!cropper) throw new Error('Редактор не найден');

            // --- ВАРИАНТ 1: Сохраняем только ОБРЕЗКУ ---
            if (activeTool === 'crop') {
                const croppedCanvas = cropper.getCroppedCanvas();
                croppedCanvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('postImage', blob, 'cropped-post.png');
                    
                    const token = localStorage.getItem('token');
                    const res = await axios.put(`${API_URL}/api/posts/${post._id}/image`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                    });

                    toast.success('Изображение обрезано!', { id: toastId });
                    onSave(res.data.newImageUrl);
                    onClose();
                }, 'image/png');
            
            // --- ВАРИАНТ 2: Сохраняем только РИСУНОК/ЛАСТИК (на оригинальном фото) ---
            } else if (activeTool === 'draw' || activeTool === 'eraser') {
                const { naturalWidth, naturalHeight } = cropper.getCanvasData();

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = naturalWidth;
                finalCanvas.height = naturalHeight;
                const finalCtx = finalCanvas.getContext('2d');

                // Создаем и загружаем оригинальное изображение, чтобы избежать проблем с CORS
                const originalImage = new Image();
                originalImage.crossOrigin = 'anonymous'; // Важно для избежания "tainted canvas"
                originalImage.onload = () => {
                    // Рисуем оригинал
                    finalCtx.drawImage(originalImage, 0, 0);
                    // Рисуем наш слой с рисунком/ластиком поверх, масштабируя его до оригинального размера
                    finalCtx.drawImage(drawCanvasRef.current, 0, 0, naturalWidth, naturalHeight);

                    finalCanvas.toBlob(async (blob) => {
                        const formData = new FormData();
                        formData.append('postImage', blob, 'drawn-post.png');
                        
                        const token = localStorage.getItem('token');
                        const res = await axios.put(`${API_URL}/api/posts/${post._id}/image`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
                        });

                        toast.success('Изменения сохранены!', { id: toastId });
                        onSave(res.data.newImageUrl);
                        onClose();
                    }, 'image/png');
                };
                originalImage.src = imageUrl;
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Ошибка сохранения', { id: toastId });
        }
    };


    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-800 w-full max-w-4xl h-full max-h-[90vh] rounded-3xl flex flex-col text-slate-900 dark:text-white"
                >
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10">
                        <h2 className="text-xl font-bold">Редактор изображения</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                    </div>

                    <div className="flex items-center p-2 space-x-4 border-b border-slate-200 dark:border-white/10">
                        <button onClick={() => setActiveTool('crop')} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${activeTool === 'crop' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                            <Crop size={18} /><span>Обрезать</span>
                        </button>
                        <button onClick={() => setActiveTool('draw')} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${activeTool === 'draw' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                            <Brush size={18} /><span>Рисовать</span>
                        </button>
                        {/* ИЗМЕНЕНИЕ: Добавляем кнопку ластика */}
                        <button onClick={() => setActiveTool('eraser')} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${activeTool === 'eraser' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                            <Eraser size={18} /><span>Ластик</span>
                        </button>
                        
                        {/* ИЗМЕНЕНИЕ: Управляем видимостью панели инструментов */}
                        {(activeTool === 'draw' || activeTool === 'eraser') && (
                            <>
                                {/* Скрываем выбор цвета для ластика */}
                                {activeTool === 'draw' && (
                                    <div className="relative w-8 h-8">
                                        <div 
                                            className="w-full h-full rounded-md border-2 border-slate-300 dark:border-white/20"
                                            style={{ backgroundColor: brushColor }}
                                        ></div>
                                        <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    </div>
                                )}
                                <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-32" />
                                <button onClick={() => drawCtxRef.current?.clearRect(0,0,drawCanvasRef.current.width, drawCanvasRef.current.height)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" title="Очистить рисунок">
                                    <RotateCcw size={18} />
                                </button>
                            </>
                        )}
                    </div>

                    <div ref={cropperContainerRef} className="flex-1 bg-black p-4 flex items-center justify-center overflow-hidden relative">
                         {imageUrl && <Cropper
                            ref={cropperRef}
                            src={imageUrl}
                            style={{ height: '100%', width: '100%' }}
                            initialAspectRatio={1}
                            viewMode={1}
                            guides={true}
                            responsive={true}
                            autoCrop={true}
                            checkOrientation={false}
                            className="max-h-full"
                            ready={setupDrawingCanvas}
                        />}
                         <canvas
                            ref={drawCanvasRef}
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${activeTool === 'draw' || activeTool === 'eraser' ? 'z-10' : 'z-0 pointer-events-none'}`}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>
                    
                    <div className="flex justify-end items-center p-4 border-t border-slate-200 dark:border-white/10 space-x-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white transition-colors">Отмена</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white">Сохранить</button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageEditorModal;