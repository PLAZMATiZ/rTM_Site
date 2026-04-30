import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { TaskItem } from '../types';

const statusConfig = {
    0: { label: 'Очікує', color: 'bg-gray-100 border-gray-300 text-gray-700' },
    1: { label: 'Виконано', color: 'bg-green-100 border-green-400 text-green-800' },
    2: { label: 'Відхилено', color: 'bg-red-100 border-red-400 text-red-800' }
};

export const TaskNode: React.FC<NodeProps<{ task: TaskItem }>> = ({ data }) => {
    const { task } = data;
    const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig[0];

    return (
        <div className={`w-64 p-4 border-2 rounded-lg shadow-sm bg-white ${config.color} transition-all hover:shadow-md`}>
            {/* Точка для вхідних зв'язків (зверху) */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
            
            <div className="font-bold text-lg mb-1 truncate">{task.title}</div>
            <div className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[2.5rem]">
                {task.description || 'Немає опису...'}
            </div>
            
            <div className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-white bg-opacity-50">
                {config.label}
            </div>

            {/* Точка для вихідних зв'язків (знизу) */}
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
        </div>
    );
};