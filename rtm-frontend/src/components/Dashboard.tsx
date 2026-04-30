import React, { useEffect, useState } from 'react';
import type { Tab } from '../types';
import { ListView } from './ListView';
import { GraphView } from './GraphView';
import { TabHistory } from './TabHistory';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

interface DashboardProps {
    userId: string;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, onLogout }) => {
    // Стейт вкладок
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [newTabName, setNewTabName] = useState('');
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    
    // Стейт інтерфейсу
    const [viewMode, setViewMode] = useState<'graph' | 'list'>('list');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // 1. Завантаження вкладок
    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_URL}/tabs?userId=${userId}`);
            if (response.ok) {
                const data: Tab[] = await response.json();
                setTabs(data);
                
                // Якщо немає вибраної вкладки, вибираємо першу активну (якщо вона є)
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

    // 2. Створення нової вкладки
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
                setTabs([newTab, ...tabs]); // Додаємо наверх локально
                setActiveTabId(newTab.id);  // Робимо її активною
                setNewTabName('');
                fetchTabs(); // Оновлюємо з бекенду для правильного сортування
            }
        } catch (error) {
            console.error("Помилка створення вкладки", error);
        }
    };

    // 3. Закриття (деактивація) вкладки
    const handleCloseTab = async (tabToClose: Tab, e: React.MouseEvent) => {
        e.stopPropagation(); // Запобігаємо кліку по самій вкладці
        
        try {
            await fetch(`${API_URL}/tabs/${tabToClose.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tabToClose.name, isActive: false }),
            });
            
            if (activeTabId === tabToClose.id) {
                setActiveTabId(null);
            }
            fetchTabs(); // Перезавантажуємо список
        } catch (error) {
            console.error("Помилка закриття вкладки", error);
        }
    };

    const currentTab = tabs.find(t => t.id === activeTabId);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            
            {/* ================= SIDEBAR (Бічна панель) ================= */}
            <div className="w-64 bg-white border-r flex flex-col flex-shrink-0 z-20 shadow-sm">
                
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h1 className="font-bold text-gray-800 text-lg tracking-tight">Rtm App</h1>
                    <button onClick={onLogout} className="text-xs font-medium text-red-500 hover:text-red-700 transition">
                        Вийти
                    </button>
                </div>

                {/* Форма створення вкладки */}
                <form onSubmit={handleCreateTab} className="p-4 border-b bg-white flex gap-2">
                    <input
                        type="text"
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        placeholder="Нова вкладка..."
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button type="submit" className="px-3 py-1.5 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm">
                        +
                    </button>
                </form>

                {/* Список вкладок */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            onClick={() => tab.isActive && setActiveTabId(tab.id)}
                            className={`flex items-center justify-between p-3 border-b transition-all duration-200
                                ${tab.isActive 
                                    ? activeTabId === tab.id 
                                        ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-800 shadow-inner' 
                                        : 'hover:bg-gray-50 text-gray-700 cursor-pointer border-l-4 border-transparent' 
                                    : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed border-l-4 border-transparent'} 
                            `}
                        >
                            <span className="truncate text-sm font-medium select-none">{tab.name}</span>
                            
                            {/* Кнопка закриття */}
                            {tab.isActive && (
                                <button
                                    onClick={(e) => handleCloseTab(tab, e)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
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
            <div className="flex-1 flex flex-col relative w-full h-full min-w-0">
                {currentTab ? (
                    <>
                        {/* Верхня панель інструментів */}
                        <div className="flex flex-wrap items-center justify-between p-4 bg-white border-b shadow-sm z-10">
                            <h2 className="text-xl font-bold text-gray-800 truncate pr-4">
                                {currentTab.name}
                            </h2>
                            
                            <div className="flex items-center gap-3">
                                {/* Кнопка Історії */}
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm border border-gray-200"
                                >
                                    🕒 <span className="hidden sm:inline">Історія</span>
                                </button>

                                {/* Вертикальний роздільник */}
                                <div className="hidden sm:block w-px h-6 bg-gray-300"></div>

                                {/* Перемикач вигляду */}
                                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-inner">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                            viewMode === 'list' 
                                                ? 'bg-white shadow text-blue-600' 
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Список
                                    </button>
                                    <button
                                        onClick={() => setViewMode('graph')}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                            viewMode === 'graph' 
                                                ? 'bg-white shadow text-blue-600' 
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Граф
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Контейнер для задач (Займає весь залишковий простір) */}
                        <div className="flex-1 p-4 sm:p-6 overflow-hidden bg-gray-50/50">
                            {viewMode === 'list' ? (
                                <ListView tabId={currentTab.id} />
                            ) : (
                                <GraphView tabId={currentTab.id} />
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
                    <div className="flex items-center justify-center flex-1 text-gray-400 bg-gray-50 flex-col gap-4">
                        <div className="text-6xl opacity-20">📁</div>
                        <p className="text-lg font-medium">Виберіть або створіть активну вкладку зліва</p>
                    </div>
                )}
            </div>
        </div>
    );
};