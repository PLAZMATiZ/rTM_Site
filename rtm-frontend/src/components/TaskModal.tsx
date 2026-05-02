import React, { useState } from 'react';
import type { TaskItem } from '../types';

interface TaskModalProps {
    task: TaskItem;
    onClose: () => void;
    onSave: (taskId: string, title: string, description: string, status: number) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [status, setStatus] = useState(task.status);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave(task.id, title, description, status);
        setIsLoading(false);
        onClose();
    };

    return (
        // Затемнений фон з розмиттям (Blur)
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            
            {/* Контейнер модалки (адаптовано під темну тему) */}
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-6 rounded-xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 transition-colors">
                
                <h2 className="text-xl font-bold mb-4">Редагувати задачу</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Назва</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            // Інпути адаптовано під темну тему
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Опис</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            // Текстареа адаптовано під темну тему
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            rows={4}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Статус</label>
                        <select
                            value={status}
                            onChange={e => setStatus(Number(e.target.value))}
                            // Селект адаптовано під темну тему
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors cursor-pointer appearance-none"
                        >
                            <option value={0}>Очікує (Pending)</option>
                            <option value={1}>Виконано (Done)</option>
                            <option value={2}>Відхилено (Rejected)</option>
                        </select>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-8">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            // Кнопка скасування адаптована
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Скасувати
                        </button>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 transition-colors shadow-sm"
                        >
                            {isLoading ? 'Збереження...' : 'Зберегти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};