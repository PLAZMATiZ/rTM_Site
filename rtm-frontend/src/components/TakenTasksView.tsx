import React, { useEffect, useState } from 'react';
import type { TaskItem } from '../types';
import { LiveTimer } from './LiveTimer';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

interface TakenTasksProps {
    userId: string;
    onNavigateToTab: (tabId: string) => void;
}

const PRIORITY_STYLES: Record<number, string> = {
    0: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    1: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    2: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
};
const PRIORITY_LABELS: Record<number, string> = { 0: 'Низький', 1: 'Середній', 2: 'Високий' };
const COMPLEXITY_ICONS: Record<number, string> = { 0: '🌱', 1: '⚙️', 2: '🔥' };

export const TakenTasksView: React.FC<TakenTasksProps> = ({ userId, onNavigateToTab }) => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [tabTasksCache, setTabTasksCache] = useState<Record<string, TaskItem[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchTakenTasks = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/tasks/taken?userId=${userId}`);
            if (res.ok) {
                const takenTasks: TaskItem[] = await res.json();
                const uniqueTabIds = Array.from(new Set(takenTasks.map(t => t.tabId)));
                const cache: Record<string, TaskItem[]> = {};

                for (const tabId of uniqueTabIds) {
                    const tabRes = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
                    if (tabRes.ok) cache[tabId] = await tabRes.json();
                }
                setTabTasksCache(cache);
                setTasks(takenTasks);
            }
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchTakenTasks(); }, [userId]);

    const getDescendants = (parentId: string, allTasks: TaskItem[], level: number, visited: Set<string>) => {
        let res: { task: TaskItem; level: number }[] = [];
        const parentTask = allTasks.find(t => t.id === parentId);
        if (!parentTask || !parentTask.dependentTasks) return res;

        const childrenIds = parentTask.dependentTasks.map(d => d.childTaskId);
        const children = allTasks.filter(t => childrenIds.includes(t.id));

        for (const child of children) {
            if (visited.has(child.id)) continue;
            res.push({ task: child, level });
            res = res.concat(getDescendants(child.id, allTasks, level + 1, new Set(visited).add(child.id)));
        }
        return res;
    };

    const handleMainStatusChange = async (taskId: string, status: number, hasActiveChildren: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        if (status === 1 && hasActiveChildren) { alert("Спочатку завершіть всі підзадачі."); return; }
        await fetch(`${API_URL}/tasks/${taskId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchTakenTasks();
    };

    const handleChildStatusChange = async (childTask: TaskItem, tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (childTask.status === 2) return;
        const newStatus = childTask.status === 1 ? 0 : 1;
        if (newStatus === 1) {
            const allTasksInThisTab = tabTasksCache[tabId] || [];
            if (getDescendants(childTask.id, allTasksInThisTab, 1, new Set([childTask.id])).some(d => d.task.status === 0)) {
                alert("Спочатку завершіть всі підзадачі ЦІЄЇ задачі."); return;
            }
        }
        await fetch(`${API_URL}/tasks/${childTask.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
        fetchTakenTasks();
    };

    const handleUntake = async (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await fetch(`${API_URL}/tasks/${taskId}/untake`, { method: 'POST' });
        fetchTakenTasks();
    };

    if (isLoading && tasks.length === 0) return <div className="p-10 text-center text-gray-500 font-medium">Завантаження задач...</div>;

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">🚀 Взяті в роботу</h2>
            {tasks.length === 0 ? (
                <div className="text-center py-20 text-gray-400">У вас немає взятих задач. Знайдіть задачу у вкладках і натисніть "Взяти в роботу"!</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
                    {tasks.map(task => {
                        const isDone = task.status === 1;
                        const allTasksInThisTab = tabTasksCache[task.tabId] || [];
                        const descendants = getDescendants(task.id, allTasksInThisTab, 1, new Set([task.id]));
                        const hasActiveChildren = descendants.some(d => d.task.status === 0);

                        // PROGRESS BAR LOGIC
                        const totalSubtasks = descendants.length;
                        const completedSubtasks = descendants.filter(d => d.task.status !== 0).length;
                        const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

                        return (
                            <div key={task.id} onClick={() => onNavigateToTab(task.tabId)}
                                className={`flex flex-col p-5 rounded-2xl border shadow-lg transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl
                                    ${isDone ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-80' : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900/50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <h3 className={`text-lg font-bold pr-2 ${isDone ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                                        {/* БЕЙДЖІ ПРІОРИТЕТУ ТА СКЛАДНОСТІ */}
                                        <div className="flex gap-2 mt-1">
                                            {task.priority !== undefined && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[0]}`}>
                                                    {PRIORITY_LABELS[task.priority] || 'Низький'}
                                                </span>
                                            )}
                                            {task.complexity !== undefined && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold">
                                                    {COMPLEXITY_ICONS[task.complexity] || '🌱'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={(e) => handleUntake(task.id, e)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
                                </div>

                                {task.description && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 mt-2">{task.description}</p>}

                                {/* PROGRESS BAR */}
                                {totalSubtasks > 0 && (
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Прогрес: {progressPercent}%</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{completedSubtasks} / {totalSubtasks}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
                                        </div>
                                    </div>
                                )}

                                {/* ДЕРЕВО ПІДЗАДАЧ */}
                                {descendants.length > 0 && (
                                    <div className="mb-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 overflow-hidden" onClick={e => e.stopPropagation()}>
                                        <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 pl-2 pb-1 mt-1">
                                            {descendants.map(({ task: child, level }) => {
                                                const isChildDone = child.status === 1;
                                                const isChildRejected = child.status === 2;
                                                return (
                                                    <div key={child.id} className="relative flex items-center gap-2 text-xs" style={{ marginLeft: `${level * 16}px` }}>
                                                        <div className="absolute top-[-16px] bottom-1/2 w-[1.5px] bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: '-12px' }}></div>
                                                        <div className="absolute top-1/2 h-[1.5px] bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: '-12px', width: '8px' }}></div>

                                                        <button
                                                            onClick={(e) => handleChildStatusChange(child, task.tabId, e)}
                                                            className={`w-4 h-4 flex-shrink-0 rounded-full z-10 border-2 flex items-center justify-center transition-all ${isChildDone ? 'bg-green-500 border-green-500 text-white' : isChildRejected ? 'bg-gray-200 border-gray-300 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed' : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-blue-500'}`}
                                                        >
                                                            {isChildDone && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                        </button>

                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0 z-10">
                                                            <span className={`truncate ${child.status !== 0 ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                                                {child.title}
                                                            </span>
                                                            {/* ДОДАНО: Бейджі для підзадач */}
                                                            {child.priority !== undefined && <span className={`text-[8px] px-1 py-0.5 rounded-full font-bold ${PRIORITY_STYLES[child.priority] || PRIORITY_STYLES[0]}`}>{PRIORITY_LABELS[child.priority] || 'Низ'}</span>}
                                                            {child.complexity !== undefined && <span className="text-[10px]">{COMPLEXITY_ICONS[child.complexity] || '🌱'}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                    <LiveTimer
                                        startedAt={task.startedAt}
                                        finishedAt={task.finishedAt}
                                        isPaused={task.isPaused}
                                        totalSpentSeconds={task.totalSpentSeconds}
                                    />

                                    <div className="flex items-center gap-2">
                                        {/* Кнопка Паузи / Продовження */}
                                        {!isDone && (
                                            task.isPaused ? (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await fetch(`${API_URL}/tasks/${task.id}/take`, { method: 'POST' });
                                                        fetchTakenTasks();
                                                    }}
                                                    className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60 transition"
                                                    title="Продовжити роботу"
                                                >
                                                    ▶
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await fetch(`${API_URL}/tasks/${task.id}/pause`, { method: 'POST' });
                                                        fetchTakenTasks();
                                                    }}
                                                    className="p-1.5 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500 dark:hover:bg-yellow-900/50 transition"
                                                    title="Поставити на паузу"
                                                >
                                                    ⏸
                                                </button>
                                            )
                                        )}

                                        {/* Кнопка Виконати */}
                                        <button
                                            onClick={(e) => handleMainStatusChange(task.id, isDone ? 0 : 1, hasActiveChildren, e)}
                                            disabled={!isDone && hasActiveChildren}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all 
                ${isDone
                                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    : hasActiveChildren
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800'
                                                        : 'bg-green-500 hover:bg-green-400 text-white shadow-md'
                                                }`}
                                        >
                                            {isDone ? 'Повернути' : '✓ Виконати'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};