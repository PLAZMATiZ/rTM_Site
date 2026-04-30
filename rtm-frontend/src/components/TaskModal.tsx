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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
                <h2 className="text-xl font-bold mb-4">Редагувати задачу</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Назва</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Опис</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Статус</label>
                        <select
                            value={status}
                            onChange={e => setStatus(Number(e.target.value))}
                            className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={0}>Очікує (Pending)</option>
                            <option value={1}>Виконано (Done)</option>
                            <option value={2}>Відхилено (Rejected)</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                            Скасувати
                        </button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                            Зберегти
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};