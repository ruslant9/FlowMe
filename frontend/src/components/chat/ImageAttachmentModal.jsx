// frontend/src/components/chat/ImageAttachmentModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crop, Brush, Send, Loader2, Eraser, RotateCcw, Music, XCircle } from 'lucide-react';
import { Cropper } from 'react-cropper';
import toast from 'react-hot-toast';
import AttachTrackModal from '../music/AttachTrackModal';
import AttachedTrack from '../music/AttachedTrack';

const ImageAttachmentModal = ({ isOpen, onClose, file, onSave, showCaptionInput = false }) => {
    const [caption, setCaption] = useState('');
    const [imageSrc, setImageSrc] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [activeTool, setActiveTool] = useState('crop');
    const [brushColor, setBrushColor] = useState('#ef4444');
    const [brushSize, setBrushSize] = useState(5);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Состояния для прикрепления трека ---
    const [attachedTrack, setAttachedTrack] = useState(null);
    const [isAttachTrackModalOpen, setIsAttachTrackModalOpen] = useState(false);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const cropperRef = useRef(null);
    const drawCanvasRef = useRef(null);
    const drawCtxRef = useRef(null);
    const cropperContainerRef = useRef(null);

    useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result);
                setActiveTool('crop');
                setAttachedTrack(null); // Сбрасываем трек при выборе нового файла
                if (drawCtxRef.current) {
                    drawCtxRef.current.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
                }
            };
            reader.readAsDataURL(file);
        } else {
            setImageSrc('');
            setCaption('');
        }
    }, [file]);

    useEffect(() => {
        const cropper = cropperRef.current?.cropper;
        if (!cropper) return;
        const container = cropperContainerRef.current;
        if (!container) return;
        const cropBoxElement = container.querySelector('.cropper-crop-box');

        if (activeTool === 'draw' || activeTool === 'eraser') {
            cropper.disable();
            if (cropBoxElement) cropBoxElement.style.display = 'none';
        } else if (activeTool === 'crop') {
            cropper.enable();
            if (cropBoxElement) cropBoxElement.style.display = 'block';
        }
    }, [activeTool]);

    useEffect(() => {
        if (drawCtxRef.current) {
            if (activeTool === 'draw') {
                drawCtxRef.current.globalCompositeOperation = 'source-over';
                drawCtxRef.current.strokeStyle = brushColor;
                drawCtxRef.current.lineWidth = brushSize;
            } else if (activeTool === 'eraser') {
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
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDrawing = (e) => {
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

    const stopDrawing = () => setIsDrawing(false);

    // --- НАЧАЛО ИЗМЕНЕНИЯ: Обновляем handleSaveClick ---
    const handleSaveClick = async () => {
        setLoading(true);
        const toastId = toast.loading('Обработка...');

        try {
            const cropper = cropperRef.current?.cropper;
            if (!cropper) throw new Error("Cropper не инициализирован");

            let imageBlob;

            if (activeTool === 'crop') {
                imageBlob = await new Promise(resolve => cropper.getCroppedCanvas().toBlob(resolve, 'image/jpeg', 0.9));
            } else {
                const finalCanvas = document.createElement('canvas');
                const finalCtx = finalCanvas.getContext('2d');
                
                const originalImage = new Image();
                originalImage.src = imageSrc;

                await new Promise(resolve => {
                    originalImage.onload = () => {
                        finalCanvas.width = originalImage.naturalWidth;
                        finalCanvas.height = originalImage.naturalHeight;
                        finalCtx.drawImage(originalImage, 0, 0);
                        finalCtx.drawImage(drawCanvasRef.current, 0, 0, finalCanvas.width, finalCanvas.height);
                        resolve();
                    }
                });

                imageBlob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', 0.9));
            }

            await onSave(imageBlob, caption, attachedTrack); // Передаем трек

            toast.success('Отправлено!', { id: toastId });
            onClose();

        } catch (error) {
            toast.error(error.message || 'Ошибка обработки изображения', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <AttachTrackModal
                isOpen={isAttachTrackModalOpen}
                onClose={() => setIsAttachTrackModalOpen(false)}
                onSelectTrack={(track) => {
                    setAttachedTrack(track);
                    setIsAttachTrackModalOpen(false);
                }}
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-800 w-full max-w-2xl h-full max-h-[90vh] rounded-3xl flex flex-col text-slate-900 dark:text-white"
                >
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10">
                        <h2 className="text-xl font-bold">Отправить изображение</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" disabled={loading}><X /></button>
                    </div>

                    <div className="flex items-center p-2 space-x-4 border-b border-slate-200 dark:border-white/10">
                        <button onClick={() => setActiveTool('crop')} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${activeTool === 'crop' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                            <Crop size={18} /><span>Обрезать</span>
                        </button>
                        <button onClick={() => setActiveTool('draw')} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${activeTool === 'draw' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                            <Brush size={18} /><span>Рисовать</span>
                        </button>
                        <button onClick={() => setActiveTool('eraser')} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${activeTool === 'eraser' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                            <Eraser size={18} /><span>Ластик</span>
                        </button>
                        {(activeTool === 'draw' || activeTool === 'eraser') && (
                            <>
                                {activeTool === 'draw' && (
                                    <div className="relative w-8 h-8">
                                        <div className="w-full h-full rounded-md border-2 border-slate-300 dark:border-white/20" style={{ backgroundColor: brushColor }}></div>
                                        <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    </div>
                                )}
                                <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-32" />
                                <button onClick={() => drawCtxRef.current?.clearRect(0,0,drawCanvasRef.current.width, drawCanvasRef.current.height)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" title="Очистить рисунок"><RotateCcw size={18} /></button>
                            </>
                        )}
                    </div>
                    
                    <div ref={cropperContainerRef} className="flex-1 bg-black p-4 flex items-center justify-center overflow-hidden relative">
                         {imageSrc && (
                            <Cropper
                                ref={cropperRef}
                                src={imageSrc}
                                style={{ height: '100%', width: '100%' }}
                                initialAspectRatio={1}
                                viewMode={1}
                                guides={true}
                                responsive={true}
                                autoCrop={true}
                                checkOrientation={false}
                                className="max-h-full"
                                ready={setupDrawingCanvas}
                            />
                         )}
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
                    
                    <div className="p-4 border-t border-slate-200 dark:border-white/10">
                        {/* --- НАЧАЛО ИЗМЕНЕНИЯ: Отображение прикрепленного трека --- */}
                        {attachedTrack && (
                             <div className="px-2 pb-2">
                                <div className="p-2 bg-slate-200 dark:bg-slate-700/50 rounded-lg relative">
                                     <AttachedTrack track={attachedTrack} />
                                     <button onClick={() => setAttachedTrack(null)} className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 rounded-full bg-white/50 dark:bg-slate-800/50">
                                         <X size={16}/>
                                     </button>
                                </div>
                            </div>
                        )}
                        {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                        <div className="flex items-center space-x-3">
                            {/* --- НАЧАЛО ИЗМЕНЕНИЯ: Добавление кнопки "Прикрепить трек" --- */}
                            <button
                                type="button"
                                onClick={() => setIsAttachTrackModalOpen(true)}
                                disabled={!!attachedTrack}
                                className="p-2 rounded-full text-slate-500 hover:text-purple-500 dark:text-slate-400 dark:hover:text-purple-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                <Music size={20} />
                            </button>
                            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                            {showCaptionInput && (
                                <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Добавить подпись..." className="w-full bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            )}
                            <button onClick={handleSaveClick} disabled={loading} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex-shrink-0 ml-auto">
                                {loading ? <Loader2 className="animate-spin" /> : <Send />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageAttachmentModal;