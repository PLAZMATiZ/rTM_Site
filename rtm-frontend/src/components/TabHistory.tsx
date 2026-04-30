import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryLog } from '../types';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

interface TabHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    tabId: string;
}

export const TabHistory: React.FC<TabHistoryProps> = ({ isOpen, onClose, tabId }) => {
    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && tabId) {
            fetchHistory();
        }
    }, [isOpen, tabId]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/history/by-tab/${tabId}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (error) {
            console.error("Помилка завантаження історії", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Форматування дати у зручний вигляд (напр. "14:30, 12 Жовтня")
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('uk-UA', {
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'short'
        }).format(date);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Темний фон (Backdrop), клік по якому закриває панель */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black bg-opacity-20 z-40 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Сама виїзна панель (Drawer) */}
                    <motion.div
                        initial={{ x: '100%' }} // Починає за межами екрана справа
                        animate={{ x: 0 }}      // Виїжджає на своє місце
                        exit={{ x: '100%' }}    // Ховається назад
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
                    >
                        {/* Хедер панелі */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <span>🕒</span> Історія активності
                            </h3>
                            <button 
                                onClick={onClose}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-200 transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Список подій */}
                        <div className="flex-1 overflow-y-auto p-4 bg-white">
                            {isLoading ? (
                                <div className="text-center text-gray-400 mt-10">Завантаження...</div>
                            ) : logs.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10">Історія порожня.</div>
                            ) : (
                                <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                                    {logs.map((log) => (
                                        <div key={log.id} className="relative pl-6">
                                            {/* Крапочка на таймлайні */}
                                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-blue-400 ring-4 ring-white" />
                                            
                                            <p className="text-sm text-gray-700 font-medium">
                                                {log.action}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {formatDate(log.createdAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};