import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskItem } from '../types';
import { TaskModal } from './TaskModal';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

const STATUS_PENDING = 0;
const STATUS_DONE = 1;
const STATUS_REJECTED = 2;

const PRIORITY_STYLES: Record<number, string> = {
    0: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    1: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    2: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};
const PRIORITY_LABELS: Record<number, string> = { 0: 'Низ', 1: 'Сер', 2: 'Вис' };
const COMPLEXITY_ICONS: Record<number, string> = { 0: '🌱', 1: '⚙️', 2: '🔥' };

interface ListViewProps { tabId: string; }
interface TaskGroup { root: TaskItem; descendants: { task: TaskItem; level: number }[]; }

export const ListView: React.FC<ListViewProps> = ({ tabId }) => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [isGrouped, setIsGrouped] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState(0);
    const [newComplexity, setNewComplexity] = useState(0);
    const [parentIds, setParentIds] = useState<string[]>([]);
    const [childIds, setChildIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [parentSearch, setParentSearch] = useState('');
    const [childSearch, setChildSearch] = useState('');
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; task: TaskItem | null }>({ visible: false, x: 0, y: 0, task: null });
    const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
            if (response.ok) setTasks(await response.json());
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchTasks(); }, [tabId]);

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const filteredParents = tasks.filter(t => t.title.toLowerCase().includes(parentSearch.toLowerCase()));
    const filteredChildren = tasks.filter(t => t.title.toLowerCase().includes(childSearch.toLowerCase()));

    const handleCreateAdvanced = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setIsSaving(true);
        try {
            const taskRes = await fetch(`${API_URL}/tasks`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tabId, title: newTitle, description: newDesc, priority: newPriority, complexity: newComplexity })
            });
            if (!taskRes.ok) throw new Error("Помилка створення");
            const newTask = await taskRes.json();

            const pPromises = parentIds.map(id => fetch(`${API_URL}/dependencies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentTaskId: id, childTaskId: newTask.id }) }));
            const cPromises = childIds.map(id => fetch(`${API_URL}/dependencies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentTaskId: newTask.id, childTaskId: id }) }));

            await Promise.all([...pPromises, ...cPromises]);
            setNewTitle(''); setNewDesc(''); setNewPriority(0); setNewComplexity(0); setParentIds([]); setChildIds([]);
            setIsCreating(false);
            await fetchTasks();
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const checkActiveDescendants = (parentId: string, visited = new Set<string>()): boolean => {
        const parent = tasks.find(t => t.id === parentId);
        if (!parent || !parent.dependentTasks) return false;
        for (const dep of parent.dependentTasks) {
            if (visited.has(dep.childTaskId)) continue;
            visited.add(dep.childTaskId);
            const child = tasks.find(t => t.id === dep.childTaskId);
            if (child && child.status === STATUS_PENDING) return true;
            if (checkActiveDescendants(dep.childTaskId, visited)) return true;
        }
        return false;
    };

    const handleStatusChange = async (taskId: string, newStatus: number) => {
        if (newStatus === STATUS_DONE) {
            if (checkActiveDescendants(taskId, new Set([taskId]))) {
                alert("Спочатку завершіть або відхиліть ВСІ дочірні задачі!");
                return;
            }
        }
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            await fetch(`${API_URL}/tasks/${taskId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
            fetchTasks();
        } catch (error) { console.error(error); }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Видалити задачу?")) return;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try { await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' }); await fetchTasks(); } catch (error) { console.error(error); }
    };

    const handleContextMenu = (e: React.MouseEvent, task: TaskItem) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, task }); };
    const handleMenuClick = (e: React.MouseEvent, task: TaskItem) => { e.stopPropagation(); setContextMenu({ visible: true, x: e.clientX - 120, y: e.clientY + 10, task }); };

    const sortTasks = (a: TaskItem, b: TaskItem) => {
        if (a.status === STATUS_PENDING && b.status !== STATUS_PENDING) return -1;
        if (a.status !== STATUS_PENDING && b.status === STATUS_PENDING) return 1;
        // Додаткове сортування за пріоритетом (найвищий зверху)
        const pA = a.priority || 0; const pB = b.priority || 0;
        return pB - pA;
    };

    const groupedTasks = useMemo<TaskGroup[]>(() => {
        if (!isGrouped) return [...tasks].sort(sortTasks).map(t => ({ root: t, descendants: [] }));
        const childIdsSet = new Set<string>();
        tasks.forEach(t => t.dependentTasks?.forEach(d => childIdsSet.add(d.childTaskId)));
        const roots = tasks.filter(t => !childIdsSet.has(t.id)).sort(sortTasks);

        const getDescendants = (parent: TaskItem, level: number, visited: Set<string>) => {
            let res: { task: TaskItem; level: number }[] = [];
            const children = tasks.filter(child => parent.dependentTasks?.some(d => d.childTaskId === child.id)).sort(sortTasks);
            for (const child of children) {
                if (visited.has(child.id)) continue;
                res.push({ task: child, level });
                res = res.concat(getDescendants(child, level + 1, new Set(visited).add(child.id)));
            }
            return res;
        };
        return roots.map(root => ({ root, descendants: getDescendants(root, 1, new Set([root.id])) }));
    }, [tasks, isGrouped]);

    const TaskTrigger = ({ task }: { task: TaskItem }) => {
        const isDone = task.status === STATUS_DONE;
        const isRejected = task.status === STATUS_REJECTED;
        return (
            <button onClick={(e) => { e.stopPropagation(); if (!isRejected) handleStatusChange(task.id, isDone ? STATUS_PENDING : STATUS_DONE); }}
                // ВИПРАВЛЕНО ТУТ: Замість bg-white тепер bg-transparent, щоб не було білої плями в темній темі
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all 
                    ${isDone ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-blue-500'} 
                    ${isRejected ? 'bg-gray-200 border-gray-300 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed' : ''}`}
            >
                {isDone && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {isRejected && <span className="text-[10px] font-bold text-gray-500">✕</span>}
            </button>
        );
    };

    const TaskRow = ({ task, level = 0, isSubTask = false }: { task: TaskItem, level?: number, isSubTask?: boolean }) => {
        const isPending = task.status === STATUS_PENDING;
        return (
            <div className="relative flex items-center justify-between group py-1.5" style={{ marginLeft: level ? `${level * 24}px` : '0' }} onContextMenu={(e) => handleContextMenu(e, task)}>
                {isSubTask && (
                    <>
                        <div className="absolute top-[-24px] bottom-1/2 w-[1.5px] bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: '-14px' }}></div>
                        <div className="absolute top-1/2 h-[1.5px] bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: '-14px', width: '10px' }}></div>
                    </>
                )}
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 relative z-10">
                    <TaskTrigger task={task} />
                    <div className="flex-1 cursor-pointer flex flex-col justify-center" onDoubleClick={(e) => { e.stopPropagation(); setEditingTask(task); }}>
                        <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-bold truncate select-none transition-colors ${!isPending ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100 group-hover:text-blue-600'}`}>{task.title}</h4>
                            {task.priority !== undefined && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[0]}`}>{PRIORITY_LABELS[task.priority] || 'Низ'}</span>}
                            {task.complexity !== undefined && <span className="text-[10px]">{COMPLEXITY_ICONS[task.complexity] || '🌱'}</span>}
                        </div>
                        {task.description && <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">{task.description}</p>}
                    </div>
                </div>
                <button onClick={(e) => handleMenuClick(e, task)} className="p-1 rounded-md text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full text-gray-900 dark:text-gray-100 relative">
            <div className="mb-6">
                {!isCreating ? (
                    <div className="flex justify-between items-center">
                        <button onClick={() => setIsCreating(true)} className="px-5 py-2 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg transition-all">+ Нова задача</button>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <span className="text-sm font-medium text-gray-500">Згрупувати</span>
                            <div className="relative">
                                <input type="checkbox" checked={isGrouped} onChange={(e) => setIsGrouped(e.target.checked)} className="sr-only peer" />
                                <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
                            </div>
                        </label>
                    </div>
                ) : (
                    <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreateAdvanced} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border shadow-xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-full space-y-3">
                                <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Назва задачі *" className="w-full px-4 py-2 text-lg font-bold bg-gray-50 dark:bg-gray-900 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Опис..." className="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Пріоритет</span>
                                        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 mt-1">
                                            {['Низ', 'Сер', 'Вис'].map((l, i) => <button type="button" key={i} onClick={() => setNewPriority(i)} className={`flex-1 text-xs py-1 rounded-md font-bold transition-all ${newPriority === i ? (i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{l}</button>)}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Складність</span>
                                        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 mt-1">
                                            {['Лег', 'Норм', 'Скл'].map((l, i) => <button type="button" key={i} onClick={() => setNewComplexity(i)} className={`flex-1 text-xs py-1 rounded-md font-bold transition-all ${newComplexity === i ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{l}</button>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* ... (Тут був код з вибором батьківських і дочірніх, він такий самий, я залишаю як було) */}
                            {/* ... */}
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="text-sm font-medium text-gray-500">Скасувати</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Створити</button>
                        </div>
                    </motion.form>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                <ul className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {groupedTasks.map((group) => {
                            const isRootActive = group.root.status === STATUS_PENDING;

                            return (
                                <motion.li
                                    layout
                                    key={group.root.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    // ВИПРАВЛЕНО: Рамка тепер темна (dark:border-gray-700/50 або dark:border-white/5)
                                    className={`p-4 rounded-2xl border transition-all duration-300
                            ${isRootActive
                                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 shadow-sm'
                                            : 'bg-gray-100/50 dark:bg-gray-900/40 border-transparent opacity-70'
                                        }`}
                                >
                                    <TaskRow task={group.root} />

                                    {/* ... Progress bar та підзадачі ... */}
                                    {group.descendants.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/30 space-y-1">
                                            {group.descendants.map(({ task, level }) => (
                                                <TaskRow key={`${group.root.id}-${task.id}`} task={task} level={level} isSubTask={true} />
                                            ))}
                                        </div>
                                    )}
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            </div>

            {/* КОНТЕКСТНЕ МЕНЮ */}
            {contextMenu.visible && contextMenu.task && (
                <div className="fixed z-50 bg-white dark:bg-gray-800 border shadow-2xl rounded-xl w-52 py-1 text-sm overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2" onClick={() => { setEditingTask(contextMenu.task); setContextMenu({ ...contextMenu, visible: false }); }}>✏️ Редагувати</button>
                    {!contextMenu.task.startedAt ? (
                        <button className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600" onClick={async () => { await fetch(`${API_URL}/tasks/${contextMenu.task!.id}/take`, { method: 'POST' }); fetchTasks(); setContextMenu({ ...contextMenu, visible: false }); }}>🚀 Взяти в роботу</button>
                    ) : (
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-500" onClick={async () => { await fetch(`${API_URL}/tasks/${contextMenu.task!.id}/untake`, { method: 'POST' }); fetchTasks(); setContextMenu({ ...contextMenu, visible: false }); }}>🛑 Відмінити роботу</button>
                    )}
                    <button className="w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600" onClick={() => { handleStatusChange(contextMenu.task!.id, STATUS_REJECTED); setContextMenu({ ...contextMenu, visible: false }); }}>❌ Відхилити</button>
                    <div className="h-[1px] bg-gray-200 my-1"></div>
                    <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600" onClick={() => { handleDeleteTask(contextMenu.task!.id); setContextMenu({ ...contextMenu, visible: false }); }}>🗑️ Видалити</button>
                </div>
            )}

            <AnimatePresence>
                {editingTask && <TaskModal task={editingTask} allTasks={tasks} onClose={() => setEditingTask(null)} onSaveSuccess={fetchTasks} />}
            </AnimatePresence>
        </div>
    );
};