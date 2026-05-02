import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskItem } from '../types';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

const STATUS_PENDING = 0;
const STATUS_DONE = 1;
const STATUS_REJECTED = 2;

interface ListViewProps {
    tabId: string;
}

interface TaskGroup {
    root: TaskItem;
    descendants: { task: TaskItem; level: number }[];
}

export const ListView: React.FC<ListViewProps> = ({ tabId }) => {
    // --- СТЕЙТИ ---
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [isGrouped, setIsGrouped] = useState(true);

    // Стейт форми створення
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [parentIds, setParentIds] = useState<string[]>([]);
    const [childIds, setChildIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Стейт пошуку
    const [parentSearch, setParentSearch] = useState('');
    const [childSearch, setChildSearch] = useState('');

    // Стейт контекстного меню
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; task: TaskItem | null }>({
        visible: false, x: 0, y: 0, task: null
    });

    // Стейт редагування
    const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');

    // --- API ЗАПИТИ ---
    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
            if (response.ok) setTasks(await response.json());
        } catch (error) {
            console.error("Помилка завантаження задач", error);
        }
    };

    useEffect(() => { fetchTasks(); }, [tabId]);

    // Закриття контекстного меню при кліку поза ним
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
                body: JSON.stringify({ tabId, title: newTitle, description: newDesc })
            });
            if (!taskRes.ok) throw new Error("Помилка створення");
            const newTask = await taskRes.json();

            const pPromises = parentIds.map(id => fetch(`${API_URL}/dependencies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parentTaskId: id, childTaskId: newTask.id })
            }));
            const cPromises = childIds.map(id => fetch(`${API_URL}/dependencies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parentTaskId: newTask.id, childTaskId: id })
            }));

            await Promise.all([...pPromises, ...cPromises]);

            setNewTitle(''); setNewDesc(''); setParentIds([]); setChildIds([]);
            setIsCreating(false);
            await fetchTasks();
        } catch (error) { console.error(error); } finally { setIsSaving(false); }
    };

    const handleStatusChange = async (taskId: string, newStatus: number) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            await fetch(`${API_URL}/tasks/${taskId}/status`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) { console.error(error); }
    };

    const handleDeleteTask = async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
            await fetchTasks(); // Оновлюємо, щоб підтягнути зміни зв'язків
        } catch (error) { console.error("Помилка видалення", error); }
    };

    const handleEditSave = async () => {
        if (!editingTask || !editTitle.trim()) return;
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: editTitle, description: editDesc } : t));
        try {
            await fetch(`${API_URL}/tasks/${editingTask.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editTitle, description: editDesc })
            });
            setEditingTask(null);
        } catch (error) { console.error("Помилка редагування", error); }
    };

    // --- ЛОГІКА UI ---
    const handleContextMenu = (e: React.MouseEvent, task: TaskItem) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, task });
    };

    const handleMenuClick = (e: React.MouseEvent, task: TaskItem) => {
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.clientX - 120, y: e.clientY + 10, task }); // Зсув для меню від кнопки
    };

    const startEditing = (task: TaskItem) => {
        setEditTitle(task.title);
        setEditDesc(task.description || '');
        setEditingTask(task);
    };

    // --- СОРТУВАННЯ ТА ДЕРЕВО ---
    const sortTasks = (a: TaskItem, b: TaskItem) => {
        if (a.status === STATUS_PENDING && b.status !== STATUS_PENDING) return -1;
        if (a.status !== STATUS_PENDING && b.status === STATUS_PENDING) return 1;
        return 0;
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


    // --- КОМПОНЕНТИ ---
// Оновлений тумблер: тепер це надійна кнопка, яка точно реагує на клік
    const SelectionSwitch = ({ title, isSelected, onToggle }: { title: string, isSelected: boolean, onToggle: () => void }) => (
        <button 
            type="button" // Важливо: щоб не сабмітити форму при кліку
            onClick={(e) => {
                e.preventDefault();
                onToggle();
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl transition-all mb-1 group
                ${isSelected 
                    ? 'bg-blue-600/10 border border-blue-500/30' 
                    : 'bg-transparent border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/40'}`}
        >
            <span className={`text-xs font-semibold truncate pr-2 transition-colors
                ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {title}
            </span>
            <div className={`relative inline-flex h-4.5 w-8 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none 
                ${isSelected ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5
                    ${isSelected ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </div>
        </button>
    );

    // У формі створення задачі змініть блок вибору на цей:
    {/* Блоки вибору з пошуком */}
    {[ { label: 'Батьківські', search: parentSearch, setSearch: setParentSearch, items: filteredParents, selected: parentIds, setSelected: setParentIds },
       { label: 'Дочірні', search: childSearch, setSearch: setChildSearch, items: filteredChildren, selected: childIds, setSelected: setChildIds }
    ].map((col, idx) => (
        <div key={idx} className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{col.label}</span>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner">
                <div className="p-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                    <input 
                        type="text" 
                        placeholder="🔍 Пошук..." 
                        value={col.search} 
                        onChange={e => col.setSearch(e.target.value)} 
                        className="w-full px-2 py-1.5 text-xs bg-transparent outline-none font-medium" 
                    />
                </div>
                <div className="h-40 overflow-y-auto p-1.5 custom-scrollbar">
                    {col.items.length > 0 ? (
                        col.items.map(t => (
                            <SelectionSwitch 
                                key={t.id} 
                                title={t.title} 
                                isSelected={col.selected.includes(t.id)} 
                                onToggle={() => {
                                    if (col.selected.includes(t.id)) {
                                        col.setSelected(col.selected.filter(id => id !== t.id));
                                    } else {
                                        col.setSelected([...col.selected, t.id]);
                                    }
                                }} 
                            />
                        ))
                    ) : (
                        <div className="text-[10px] text-center text-gray-400 py-4 italic">Нічого не знайдено</div>
                    )}
                </div>
            </div>
        </div>
    ))}

    // Новий трігер зліва
    const TaskTrigger = ({ task }: { task: TaskItem }) => {
        const isDone = task.status === STATUS_DONE;
        const isRejected = task.status === STATUS_REJECTED;

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(task.id, isDone ? STATUS_PENDING : STATUS_DONE);
                }}
                // Кружечок завжди має бордер, фон прозорий
                className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-600 flex items-center justify-center transition-colors hover:border-blue-500"
            >
                {isDone && (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
                {isRejected && (
                    <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
            </button>
        );
    };


    // Рендер рядка задачі
    const TaskRow = ({ task, level = 0, isSubTask = false }: { task: TaskItem, level?: number, isSubTask?: boolean }) => {
        const isPending = task.status === STATUS_PENDING;
        
        return (
            <div 
                className="relative flex items-center justify-between group py-1.5" 
                // Стандартизований відступ: 24 пікселі на кожен рівень
                style={{ marginLeft: level ? `${level * 24}px` : '0' }}
                onContextMenu={(e) => handleContextMenu(e, task)}
            >
                {/* Лінії дерева */}
                {isSubTask && (
                    <>
                        {/* Вертикальна лінія: опускається від центру батька (-14px від поточного початку) */}
                        <div className="absolute top-[-24px] bottom-1/2 w-[1.5px] bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: '-14px' }}></div>
                        {/* Горизонтальна лінія: йде до кружка, але не перетинає його (ширина 10px залишає проміжок 4px) */}
                        <div className="absolute top-1/2 h-[1.5px] bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: '-14px', width: '10px' }}></div>
                    </>
                )}

                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 relative z-10">
                    <TaskTrigger task={task} />
                    
                    {/* Текст задачі (Дабл-клік тут) */}
                    <div 
                        className="flex-1 cursor-text" 
                        onDoubleClick={(e) => { e.stopPropagation(); startEditing(task); }}
                    >
                        <h4 className={`text-sm font-medium truncate select-none transition-colors ${!isPending ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                            {task.title}
                        </h4>
                        {task.description && <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 select-none">{task.description}</p>}
                    </div>
                </div>

                {/* Три точки меню */}
                <button 
                    onClick={(e) => handleMenuClick(e, task)}
                    className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 dark:hover:text-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full text-gray-900 dark:text-gray-100 relative">
            
            {/* ШАПКА ТА ФОРМА (Залишилась без змін) */}
            <div className="mb-6 flex flex-col gap-4">
               {/* ... (Ваш попередній код форми створення залишається тут без змін) ... */}
               {!isCreating ? (
                    <div className="flex justify-between items-center">
                        <button onClick={() => setIsCreating(true)} className="px-5 py-2 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                            + Нова задача
                        </button>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors">Згрупувати</span>
                            <div className="relative">
                                <input type="checkbox" checked={isGrouped} onChange={(e) => setIsGrouped(e.target.checked)} className="sr-only peer" />
                                <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
                            </div>
                        </label>
                    </div>
                ) : (
                    <motion.form initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} onSubmit={handleCreateAdvanced} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-full space-y-3">
                                <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Назва задачі *" className="w-full px-4 py-2.5 text-lg font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Короткий опис..." className="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} />
                            </div>

                            {[ { label: 'Батьківські', search: parentSearch, setSearch: setParentSearch, items: filteredParents, selected: parentIds, setSelected: setParentIds },
                               { label: 'Дочірні', search: childSearch, setSearch: setChildSearch, items: filteredChildren, selected: childIds, setSelected: setChildIds }
                            ].map((col, idx) => (
                                <div key={idx} className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{col.label}</span>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="p-2 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <input type="text" placeholder="🔍 Пошук..." value={col.search} onChange={e => col.setSearch(e.target.value)} className="w-full px-2 py-1 text-xs bg-transparent outline-none" />
                                        </div>
                                        <div className="h-32 overflow-y-auto p-1 custom-scrollbar">
                                            {col.items.map(t => (
                                                <SelectionSwitch key={t.id} title={t.title} isSelected={col.selected.includes(t.id)} onToggle={() => col.selected.includes(t.id) ? col.setSelected(col.selected.filter(id => id !== t.id)) : col.setSelected([...col.selected, t.id])} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white transition">Скасувати</button>
                            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-md transition-all active:scale-95">Створити</button>
                        </div>
                    </motion.form>
                )}
            </div>

            {/* СПИСОК ЗАДАЧ */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                <ul className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {groupedTasks.map((group) => {
                            const isRootActive = group.root.status === STATUS_PENDING;
                            return (
                                <motion.li layout key={group.root.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                                    className={`p-4 rounded-2xl border shadow-sm transition-colors ${isRootActive ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-100/50 dark:bg-gray-900/40 border-transparent opacity-80'}`}
                                >
                                    <TaskRow task={group.root} />
                                    
                                    {group.descendants.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-1">
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
                <div 
                    className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl w-48 py-1 text-sm font-medium overflow-hidden"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Щоб клік по меню не закривав його одразу
                >
                    <button 
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                        onClick={() => { startEditing(contextMenu.task!); setContextMenu({ ...contextMenu, visible: false }); }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Редагувати
                    </button>
                    {contextMenu.task.status !== STATUS_REJECTED && (
                        <button 
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                            onClick={() => { handleStatusChange(contextMenu.task!.id, STATUS_REJECTED); setContextMenu({ ...contextMenu, visible: false }); }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Відхилити
                        </button>
                    )}
                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
                    <button 
                        className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400"
                        onClick={() => { handleDeleteTask(contextMenu.task!.id); setContextMenu({ ...contextMenu, visible: false }); }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Видалити
                    </button>
                </div>
            )}

            {/* МОДАЛКА РЕДАГУВАННЯ */}
            <AnimatePresence>
                {editingTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingTask(null)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4">Редагувати задачу</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Назва</label>
                                    <input 
                                        type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Опис</label>
                                    <textarea 
                                        value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                                    Скасувати
                                </button>
                                <button onClick={handleEditSave} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition active:scale-95">
                                    Зберегти
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};