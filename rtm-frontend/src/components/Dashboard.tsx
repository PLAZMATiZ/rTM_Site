import React, { useEffect, useState } from 'react';
import type { Tab } from '../types';
import { ListView } from './ListView';
import { GraphView } from './GraphView';
import { TabHistory } from './TabHistory';
import { Analytics } from "@vercel/analytics/next"

const API_URL = 'https://rtmapi-production.up.railway.app/api';

interface DashboardProps {
    userId: string;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, onLogout, isDarkMode, toggleTheme }) => {
    // Стейт вкладок
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [newTabName, setNewTabName] = useState('');
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    
    // Стейт інтерфейсу
    const [viewMode, setViewMode] = useState<'graph' | 'list'>('list');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Завантаження вкладок
    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_URL}/tabs?userId=${userId}`);
            if (response.ok) {
                const data: Tab[] = await response.json();
                setTabs(data);
                
                if (!activeTabId && data.length > 0 && data[0].isActive) {
                    setActiveTabId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Помилка завантаження вкладок", error);
        }
    };

    useEffect(() => {
        fetchTabs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Створення нової вкладки
    const handleCreateTab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTabName.trim()) return;

        try {
            const response = await fetch(`${API_URL}/tabs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, name: newTabName }),
            });

            if (response.ok) {
                const newTab: Tab = await response.json();
                setTabs([newTab, ...tabs]); 
                setActiveTabId(newTab.id);  
                setNewTabName('');
                fetchTabs(); 
            }
        } catch (error) {
            console.error("Помилка створення вкладки", error);
        }
    };

    // Закриття вкладки
    const handleCloseTab = async (tabToClose: Tab, e: React.MouseEvent) => {
        e.stopPropagation(); 
        try {
            await fetch(`${API_URL}/tabs/${tabToClose.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tabToClose.name, isActive: false }),
            });
            
            if (activeTabId === tabToClose.id) setActiveTabId(null);
            fetchTabs(); 
        } catch (error) {
            console.error("Помилка закриття вкладки", error);
        }
    };

    const currentTab = tabs.find(t => t.id === activeTabId);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
            
            {/* ================= SIDEBAR (Бічна панель) ================= */}
            <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 z-20 shadow-sm transition-colors duration-300">
                
                {/* Заголовок Sidebar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h1 className="font-bold text-gray-800 dark:text-white text-lg tracking-tight">Rtm App</h1>
                    
                    <div className="flex items-center gap-3">
                        {/* Кнопка зміни теми */}
                        <button 
                            onClick={toggleTheme} 
                            className="text-lg hover:scale-110 transition-transform focus:outline-none"
                            title={isDarkMode ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
                        >
                            {isDarkMode ? '🌙' : '☀️'}
                        </button>
                        <button onClick={onLogout} className="text-xs font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 transition">
                            Вийти
                        </button>
                    </div>
                </div>

                {/* Форма створення вкладки */}
                <form onSubmit={handleCreateTab} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2">
                    <input
                        type="text"
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        placeholder="Нова вкладка..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button type="submit" className="px-3 py-1.5 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-sm">
                        +
                    </button>
                </form>

                {/* Список вкладок */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            onClick={() => tab.isActive && setActiveTabId(tab.id)}
                            className={`flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700/50 transition-all duration-200
                                ${tab.isActive 
                                    ? activeTabId === tab.id 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-500 text-blue-800 dark:text-blue-300 shadow-inner' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-pointer border-l-4 border-transparent' 
                                    : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 opacity-60 cursor-not-allowed border-l-4 border-transparent'} 
                            `}
                        >
                            <span className="truncate text-sm font-medium select-none">{tab.name}</span>
                            
                            {/* Кнопка закриття */}
                            {tab.isActive && (
                                <button
                                    onClick={(e) => handleCloseTab(tab, e)}
                                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                                    title="Закрити вкладку"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ================= MAIN CONTENT (Головна робоча зона) ================= */}
            <div className="flex-1 flex flex-col relative w-full h-full min-w-0 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                {currentTab ? (
                    <>
                        {/* Верхня панель інструментів */}
                        <div className="flex flex-wrap items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors duration-300">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate pr-4">
                                {currentTab.name}
                            </h2>
                            
                            <div className="flex items-center gap-3">
                                {/* Кнопка Історії */}
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
                                >
                                    🕒 <span className="hidden sm:inline">Історія</span>
                                </button>

                                {/* Вертикальний роздільник */}
                                <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

                                {/* Перемикач вигляду */}
                                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                            viewMode === 'list' 
                                                ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' 
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        Список
                                    </button>
                                    <button
                                        onClick={() => setViewMode('graph')}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                            viewMode === 'graph' 
                                                ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' 
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        Граф
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Контейнер для задач (Graph / List) */}
                        <div className="flex-1 p-4 sm:p-6 overflow-hidden bg-gray-50/50 dark:bg-gray-900 transition-colors duration-300">
                            {viewMode === 'list' ? (
                                <ListView tabId={currentTab.id} />
                            ) : (
                                <GraphView tabId={currentTab.id} isDarkMode={isDarkMode} />
                            )}
                        </div>

                        {/* Виїзна панель історії (Drawer) */}
                        <TabHistory 
                            isOpen={isHistoryOpen} 
                            onClose={() => setIsHistoryOpen(false)} 
                            tabId={currentTab.id} 
                        />
                    </>
                ) : (
                    // Стан, коли жодна вкладка не вибрана
                    <div className="flex items-center justify-center flex-1 flex-col gap-4 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500">
                        <div className="text-6xl opacity-20 dark:opacity-10">📁</div>
                        <p className="text-lg font-medium">Виберіть або створіть активну вкладку зліва</p>
                    </div>
                )}
            </div>
            <Analytics />
        </div>
    );
};