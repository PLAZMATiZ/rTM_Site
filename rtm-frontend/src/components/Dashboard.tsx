import React, { useEffect, useState } from 'react';
import type { Tab } from '../types'; // Додано слово type

const API_URL = 'http://localhost:8080/api';

interface DashboardProps {
    userId: string;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, onLogout }) => {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [newTabName, setNewTabName] = useState('');
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'graph' | 'list'>('list');

    // Завантаження вкладок. Бекенд вже сортує їх (активні зверху).
    const fetchTabs = async () => {
        try {
            const response = await fetch(`${API_URL}/tabs?userId=${userId}`);
            if (response.ok) {
                const data: Tab[] = await response.json();
                setTabs(data);
                // Якщо немає вибраної вкладки, вибираємо першу активну
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
    }, [userId]);

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
                setTabs([newTab, ...tabs]); // Додаємо наверх списку локально
                setActiveTabId(newTab.id);
                setNewTabName('');
                fetchTabs(); // Оновлюємо з бекенду для правильного сортування
            }
        } catch (error) {
            console.error("Помилка створення вкладки", error);
        }
    };

    const handleCloseTab = async (tabToClose: Tab, e: React.MouseEvent) => {
        e.stopPropagation(); // Щоб не спрацював клік по самій вкладці
        
        try {
            await fetch(`${API_URL}/tabs/${tabToClose.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tabToClose.name, isActive: false }),
            });
            
            if (activeTabId === tabToClose.id) {
                setActiveTabId(null);
            }
            fetchTabs(); // Оновлюємо список
        } catch (error) {
            console.error("Помилка закриття вкладки", error);
        }
    };

    const currentTab = tabs.find(t => t.id === activeTabId);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar (Бічна панель) */}
            <div className="w-64 bg-white border-r flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-100">
                    <h1 className="font-bold text-gray-800">Rtm App</h1>
                    <button onClick={onLogout} className="text-xs text-red-500 hover:underline">Вийти</button>
                </div>

                {/* Форма створення вкладки */}
                <form onSubmit={handleCreateTab} className="p-4 border-b flex gap-2">
                    <input
                        type="text"
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        placeholder="Нова вкладка..."
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="submit" className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">
                        +
                    </button>
                </form>

                {/* Список вкладок */}
                <div className="flex-1 overflow-y-auto">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            onClick={() => tab.isActive && setActiveTabId(tab.id)}
                            className={`flex items-center justify-between p-3 cursor-pointer border-b transition-colors
                                ${tab.isActive 
                                    ? activeTabId === tab.id 
                                        ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' 
                                        : 'hover:bg-gray-50 text-gray-700' 
                                    : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'} 
                            `}
                        >
                            <span className="truncate text-sm font-medium">{tab.name}</span>
                            
                            {/* Кнопка закриття (лише для активних) */}
                            {tab.isActive && (
                                <button
                                    onClick={(e) => handleCloseTab(tab, e)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Закрити вкладку"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content (Головне вікно) */}
            <div className="flex-1 flex flex-col">
                {currentTab ? (
                    <>
                        {/* Верхня панель інструментів */}
                        <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
                            <h2 className="text-xl font-semibold text-gray-800">{currentTab.name}</h2>
                            
                            {/* Перемикач вигляду */}
                            <div className="flex bg-gray-100 p-1 rounded-md">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-4 py-1 text-sm font-medium rounded-md transition-shadow ${
                                        viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Вигляд списку
                                </button>
                                <button
                                    onClick={() => setViewMode('graph')}
                                    className={`px-4 py-1 text-sm font-medium rounded-md transition-shadow ${
                                        viewMode === 'graph' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Вигляд графа
                                </button>
                            </div>
                        </div>

                        {/* Контейнер для задач (Заглушка) */}
                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                            {viewMode === 'list' ? (
                                <div className="p-4 bg-white rounded shadow-sm border text-gray-500">
                                    Тут буде список задач для вкладки {currentTab.name}...
                                </div>
                            ) : (
                                <div className="p-4 bg-white rounded shadow-sm border border-dashed border-gray-300 h-full flex items-center justify-center text-gray-400">
                                    Тут буде React Flow (Граф) для задач...
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center flex-1 text-gray-400">
                        Виберіть або створіть активну вкладку
                    </div>
                )}
            </div>
        </div>
    );
};