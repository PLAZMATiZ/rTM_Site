import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { TaskItem } from '../types';

const statusConfig = {
    0: { label: 'Очікує', light: 'bg-gray-100 border-gray-300 text-gray-800', dark: 'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100' },
    1: { label: 'Виконано', light: 'bg-green-100 border-green-400 text-green-800', dark: 'dark:bg-green-900/30 dark:border-green-700 dark:text-green-400' },
    2: { label: 'Відхилено', light: 'bg-red-100 border-red-400 text-red-800', dark: 'dark:bg-red-900/30 dark:border-red-700 dark:text-red-400' }
};

const PRIORITY_STYLES: Record<number, string> = {
    0: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    1: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    2: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};
const PRIORITY_LABELS: Record<number, string> = { 0: 'Низ', 1: 'Сер', 2: 'Вис' };
const COMPLEXITY_ICONS: Record<number, string> = { 0: '🌱', 1: '⚙️', 2: '🔥' };

export const TaskNode: React.FC<NodeProps<{ task: TaskItem }>> = ({ data }) => {
    const { task } = data;
    const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig[0];

    return (
        <div className={`w-64 p-4 border-2 rounded-lg shadow-sm transition-all hover:shadow-md ${config.light} ${config.dark}`}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-none" />
            
            <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-bold text-lg truncate flex-1">{task.title}</div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-1">
                    {task.priority !== undefined && <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[0]}`}>{PRIORITY_LABELS[task.priority] || 'Низ'}</span>}
                    {task.complexity !== undefined && <span className="text-[10px]">{COMPLEXITY_ICONS[task.complexity] || '🌱'}</span>}
                </div>
            </div>
            
            <div className="text-xs line-clamp-2 mb-3 min-h-[2rem] opacity-80">
                {task.description || 'Немає опису...'}
            </div>
            
            <div className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/50 dark:bg-black/20">
                {config.label}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-none" />
        </div>
    );
};