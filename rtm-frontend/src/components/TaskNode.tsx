import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { TaskItem } from '../types';

const statusConfig = {
    0: { label: 'Очікує', light: 'bg-gray-100 border-gray-300 text-gray-800', dark: 'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100' },
    1: { label: 'Виконано', light: 'bg-green-100 border-green-400 text-green-800', dark: 'dark:bg-green-900/30 dark:border-green-700 dark:text-green-400' },
    2: { label: 'Відхилено', light: 'bg-red-100 border-red-400 text-red-800', dark: 'dark:bg-red-900/30 dark:border-red-700 dark:text-red-400' }
};

export const TaskNode: React.FC<NodeProps<{ task: TaskItem }>> = ({ data }) => {
    const { task } = data;
    const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig[0];

    return (
        <div className={`w-64 p-4 border-2 rounded-lg shadow-sm transition-all hover:shadow-md ${config.light} ${config.dark}`}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-none" />
            
            <div className="font-bold text-lg mb-1 truncate">{task.title}</div>
            <div className="text-sm line-clamp-2 mb-3 min-h-[2.5rem] opacity-80">
                {task.description || 'Немає опису...'}
            </div>
            
            <div className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-white/50 dark:bg-black/20">
                {config.label}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-none" />
        </div>
    );
};