import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskItem } from '../types';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

// Для зручності роботи зі статусами
const STATUS_PENDING = 0;
const STATUS_DONE = 1;
const STATUS_REJECTED = 2;

interface ListViewProps {
    tabId: string;
}

export const ListView: React.FC<ListViewProps> = ({ tabId }) => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Завантаження задач
    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
            if (response.ok) {
                const data = await response.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Помилка завантаження задач", error);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [tabId]);

    // Створення нової задачі
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const response = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tabId, title: newTaskTitle, description: '' })
            });

            if (response.ok) {
                const newTask = await response.json();
                setTasks(prev => [newTask, ...prev]);
                setNewTaskTitle('');
            }
        } catch (error) {
            console.error("Помилка створення задачі", error);
        }
    };

    // Зміна статусу (відправляє PATCH/PUT на бекенд і оновлює локальний стейт)
    const handleStatusChange = async (taskId: string, newStatus: number) => {
        // Оптимістичне оновлення UI (щоб анімація почалася одразу)
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            // Зверніть увагу: у контролері ми писали HttpPatch для статусу
            await fetch(`${API_URL}/tasks/${taskId}/status`, {
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Помилка зміни статусу", error);
            // У разі помилки можна було б повернути попередній стан (fetchTasks())
        }
    };

    // Логіка сортування: Pending (0) завжди зверху. Done і Rejected - знизу.
    const sortedTasks = [...tasks].sort((a, b) => {
        const aIsActive = a.status === STATUS_PENDING;
        const bIsActive = b.status === STATUS_PENDING;

        if (aIsActive && !bIsActive) return -1; // a вище
        if (!aIsActive && bIsActive) return 1;  // b вище
        return 0; // Якщо статуси в одній категорії, зберігаємо оригінальний порядок (по даті)
    });

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full">
            {/* Форма додавання задачі */}
            <form onSubmit={handleCreateTask} className="mb-6 flex gap-3">
                <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Що потрібно зробити?"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button 
                    type="submit"
                    className="px-6 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                    Додати
                </button>
            </form>

            {/* Список задач */}
            <div className="flex-1 overflow-y-auto pr-2">
                <ul className="space-y-3 pb-6">
                    <AnimatePresence>
                        {sortedTasks.map((task) => {
                            const isActive = task.status === STATUS_PENDING;

                            return (
                                // motion.li з атрибутом layout автоматично анімує зміну позиції
                                <motion.li
                                    layout
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                                    key={task.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors shadow-sm
                                        ${isActive 
                                            ? 'bg-white border-gray-200' 
                                            : 'bg-gray-50 border-gray-100 opacity-50 grayscale-[30%]'
                                        }
                                    `}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className={`text-lg font-medium truncate ${isActive ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
                                            {task.title}
                                        </h3>
                                        {task.description && (
                                            <p className="text-sm text-gray-500 truncate mt-0.5">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Перемикач статусів */}
                                    <div className="flex-shrink-0">
                                        <select
                                            value={task.status}
                                            onChange={(e) => handleStatusChange(task.id, Number(e.target.value))}
                                            className={`block w-40 pl-3 pr-8 py-2 text-sm font-semibold border-0 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 appearance-none
                                                ${task.status === STATUS_PENDING ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}
                                                ${task.status === STATUS_DONE ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                                                ${task.status === STATUS_REJECTED ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                                            `}
                                        >
                                            <option value={STATUS_PENDING}>⏳ Очікує</option>
                                            <option value={STATUS_DONE}>✅ Виконано</option>
                                            <option value={STATUS_REJECTED}>❌ Відхилено</option>
                                        </select>
                                    </div>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                    
                    {tasks.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            Немає задач. Створіть першу!
                        </div>
                    )}
                </ul>
            </div>
        </div>
    );
};