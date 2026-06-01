import React, { useState, useEffect } from 'react';
import type { TaskItem } from '../types';

const API_URL = 'https://rtm-temp.reaniplay.com/api';

interface TaskModalProps {
    task: TaskItem;
    allTasks: TaskItem[];
    onClose: () => void;
    onSaveSuccess: () => void;
}

const SelectionSwitch = ({ title, isSelected, onToggle }: { title: string, isSelected: boolean, onToggle: () => void }) => (
    <button type="button" onClick={(e) => { e.preventDefault(); onToggle(); }}
        className={`w-full flex items-center justify-between py-2 px-3 rounded-xl transition-all mb-1 group
            ${isSelected ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/40'}`}
    >
        <span className={`text-xs font-semibold truncate pr-2 transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{title}</span>
        <div className={`relative inline-flex h-4.5 w-8 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${isSelected ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 mt-0.5 ml-0.5 ${isSelected ? 'translate-x-3.5' : 'translate-x-0'}`} />
        </div>
    </button>
);

export const TaskModal: React.FC<TaskModalProps> = ({ task, allTasks, onClose, onSaveSuccess }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority || 0);
    const [complexity, setComplexity] = useState(task.complexity || 0);
    const [isLoading, setIsLoading] = useState(false);
    const [deadline, setDeadline] = useState(task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');

    const [parentSearch, setParentSearch] = useState('');
    const [childSearch, setChildSearch] = useState('');
    const [parentIds, setParentIds] = useState<string[]>([]);
    const [childIds, setChildIds] = useState<string[]>([]);

    useEffect(() => {
        setChildIds(task.dependentTasks?.map(d => d.childTaskId) || []);
        setParentIds(allTasks.filter(t => t.dependentTasks?.some(d => d.childTaskId === task.id)).map(t => t.id));
    }, [task, allTasks]);

    const availableTasks = allTasks.filter(t => t.id !== task.id);
    const filteredParents = availableTasks.filter(t => t.title.toLowerCase().includes(parentSearch.toLowerCase()));
    const filteredChildren = availableTasks.filter(t => t.title.toLowerCase().includes(childSearch.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await fetch(`${API_URL}/tasks/${task.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title, description, priority, complexity,
                    deadline: deadline ? new Date(deadline).toISOString() : null // <--- Передаємо дедлайн
                })
            });;
            await fetch(`${API_URL}/tasks/${task.id}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            const oldChildren = task.dependentTasks?.map(d => d.childTaskId) || [];
            const oldParents = allTasks.filter(t => t.dependentTasks?.some(d => d.childTaskId === task.id)).map(t => t.id);

            const parentsToAdd = parentIds.filter(id => !oldParents.includes(id));
            const parentsToRemove = oldParents.filter(id => !parentIds.includes(id));
            const childrenToAdd = childIds.filter(id => !oldChildren.includes(id));
            const childrenToRemove = oldChildren.filter(id => !childIds.includes(id));

            const apiPromises: Promise<any>[] = [];
            parentsToAdd.forEach(pId => apiPromises.push(fetch(`${API_URL}/dependencies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentTaskId: pId, childTaskId: task.id }) })));
            parentsToRemove.forEach(pId => apiPromises.push(fetch(`${API_URL}/dependencies/${pId}/${task.id}`, { method: 'DELETE' })));
            childrenToAdd.forEach(cId => apiPromises.push(fetch(`${API_URL}/dependencies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentTaskId: task.id, childTaskId: cId }) })));
            childrenToRemove.forEach(cId => apiPromises.push(fetch(`${API_URL}/dependencies/${task.id}/${cId}`, { method: 'DELETE' })));

            await Promise.all(apiPromises);
            onSaveSuccess();
            onClose();
        } catch (error) { console.error("Помилка збереження", error); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Редагувати задачу</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Назва</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Опис</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                            </div>

                            {/* ПРІОРИТЕТ ТА СКЛАДНІСТЬ */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Пріоритет</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                                        {['Низ', 'Сер', 'Вис'].map((l, i) => (
                                            <button type="button" key={i} onClick={() => setPriority(i)} className={`flex-1 text-xs py-1 rounded-md font-bold transition-all ${priority === i ? (i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{l}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Складність</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                                        {['Лег', 'Норм', 'Скл'].map((l, i) => (
                                            <button type="button" key={i} onClick={() => setComplexity(i)} className={`flex-1 text-xs py-1 rounded-md font-bold transition-all ${complexity === i ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{l}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Дедлайн</label>
                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>


                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Статус</label>
                                <select value={status} onChange={e => setStatus(Number(e.target.value))} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-semibold cursor-pointer">
                                    <option value={0}>⏳ Очікує (Pending)</option>
                                    <option value={1}>✅ Виконано (Done)</option>
                                    <option value={2}>❌ Відхилено (Rejected)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[{ label: 'Батьківські задачі', search: parentSearch, setSearch: setParentSearch, items: filteredParents, selected: parentIds, setSelected: setParentIds },
                            { label: 'Дочірні задачі', search: childSearch, setSearch: setChildSearch, items: filteredChildren, selected: childIds, setSelected: setChildIds }
                            ].map((col, idx) => (
                                <div key={idx} className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase">{col.label}</span>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner">
                                        <div className="p-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <input type="text" placeholder="🔍 Пошук..." value={col.search} onChange={e => col.setSearch(e.target.value)} className="w-full px-2 py-1 text-xs bg-transparent outline-none" />
                                        </div>
                                        <div className="h-[120px] overflow-y-auto p-1 custom-scrollbar">
                                            {col.items.map(t => (
                                                <SelectionSwitch key={t.id} title={t.title} isSelected={col.selected.includes(t.id)} onToggle={() => col.selected.includes(t.id) ? col.setSelected(col.selected.filter(id => id !== t.id)) : col.setSelected([...col.selected, t.id])} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition">Скасувати</button>
                        <button type="submit" disabled={isLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg transition active:scale-95">{isLoading ? 'Збереження...' : 'Зберегти зміни'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};