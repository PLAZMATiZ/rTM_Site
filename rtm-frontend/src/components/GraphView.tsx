import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
    Background, Controls, MiniMap, 
    useNodesState, useEdgesState, addEdge, 
    type Connection, type Edge, type Node
} from 'reactflow';
import 'reactflow/dist/style.css'; // Обов'язкові стилі

import { TaskNode } from './TaskNode';
import { TaskModal } from './TaskModal';
import type { TaskItem } from '../types';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

interface GraphViewProps {
    tabId: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ tabId }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

    // Реєструємо кастомну ноду
    const nodeTypes = useMemo(() => ({ taskNode: TaskNode }), []);

    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
            const tasks: TaskItem[] = await response.json();

            // Перетворюємо задачі у формат Нод React Flow
            // Оскільки ми не зберігаємо X/Y в базі, розміщуємо їх сіткою для прикладу
            const initialNodes: Node[] = tasks.map((task, index) => ({
                id: task.id,
                type: 'taskNode',
                // Формуємо просту сітку 3 колонки
                position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 200 },
                data: { task }
            }));

            // Формуємо лінії (Edges) з масиву dependentTasks
            const initialEdges: Edge[] = [];
            tasks.forEach(task => {
                if (task.dependentTasks) {
                    task.dependentTasks.forEach(dep => {
                        initialEdges.push({
                            id: dep.id,
                            source: dep.parentTaskId, // Звідки йде лінія
                            target: dep.childTaskId,  // Куди приходить
                            animated: true,
                            type: 'smoothstep'
                        });
                    });
                }
            });

            setNodes(initialNodes);
            setEdges(initialEdges);
        } catch (error) {
            console.error("Помилка завантаження графа", error);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [tabId]);

    // Обробник з'єднання двох нод (перетягування лінії)
    const onConnect = useCallback(async (params: Connection) => {
        if (!params.source || !params.target) return;

        try {
            const response = await fetch(`${API_URL}/dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parentTaskId: params.source, childTaskId: params.target })
            });

            if (response.ok) {
                const newDependency = await response.json();
                setEdges((eds) => addEdge({
                    ...params, 
                    id: newDependency.id,
                    animated: true,
                    type: 'smoothstep'
                }, eds));
            } else {
                alert("Не вдалося створити зв'язок (можливо, він вже існує або утворює цикл).");
            }
        } catch (error) {
            console.error(error);
        }
    }, [setEdges]);

    // Подвійний клік на ноду
    const onNodeDoubleClick = (_event: React.MouseEvent, node: Node) => {
        setSelectedTask(node.data.task);
    };

    // Збереження після редагування в модалці
    const handleSaveTask = async (taskId: string, title: string, description: string, status: number) => {
        // Оновлення тексту
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });
        // Оновлення статусу
        await fetch(`${API_URL}/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        fetchTasks(); // Перезавантажуємо граф для оновлення UI
    };

    return (
        <div className="w-full h-full bg-gray-50 rounded-lg shadow-inner overflow-hidden border border-gray-200">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                fitView // Автоматично масштабує граф під розмір вікна
            >
                <Background color="#ccc" gap={16} />
                <Controls />
                <MiniMap zoomable pannable />
            </ReactFlow>

            {selectedTask && (
                <TaskModal 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)} 
                    onSave={handleSaveTask} 
                />
            )}
        </div>
    );
};