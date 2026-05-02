import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
    Background, Controls, MiniMap, Panel,
    useNodesState, useEdgesState, addEdge, 
    type Connection, type Edge, type Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre'; // ДОДАНО

import { TaskNode } from './TaskNode';
import { TaskModal } from './TaskModal';
import type { TaskItem } from '../types';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

interface GraphViewProps {
    tabId: string;
    isDarkMode: boolean;
}

// Функція для автоматичного розрахунку позицій та створення контейнерів
const getLayoutedElements = (tasks: TaskItem[], edges: Edge[], isDarkMode: boolean) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Налаштування дерева: TB (Top to Bottom), відступи між нодами
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 120 });

    const nodeWidth = 260; // Приблизна ширина TaskNode
    const nodeHeight = 130; // Приблизна висота TaskNode

    // 1. Передаємо розміри в dagre
    tasks.forEach((task) => {
        dagreGraph.setNode(task.id, { width: nodeWidth, height: nodeHeight });
    });
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // 2. Викликаємо математику
    dagre.layout(dagreGraph);

    // 3. Шукаємо "острови" звязаних графів (щоб створити групи)
    const adjList: Record<string, string[]> = {};
    tasks.forEach(t => adjList[t.id] = []);
    edges.forEach(e => {
        adjList[e.source].push(e.target);
        adjList[e.target].push(e.source); // Зв'язок в обидва боки для пошуку групи
    });

    const visited = new Set<string>();
    const clusters: string[][] = [];

    tasks.forEach(t => {
        if (!visited.has(t.id)) {
            const cluster: string[] = [];
            const queue = [t.id];
            visited.add(t.id);
            while(queue.length > 0) {
                const curr = queue.shift()!;
                cluster.push(curr);
                adjList[curr].forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                });
            }
            clusters.push(cluster);
        }
    });

    const finalNodes: Node[] = [];
    const padding = 50;

    // 4. Формуємо фінальні ноди та контейнери
    clusters.forEach((clusterIds, index) => {
        const groupId = `group-${index}`;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        // Отримуємо абсолютні позиції від Dagre і шукаємо межі контейнера
        const absoluteNodes = clusterIds.map(id => {
            const nodeWithPosition = dagreGraph.node(id);
            const x = nodeWithPosition.x - nodeWidth / 2;
            const y = nodeWithPosition.y - nodeHeight / 2;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + nodeWidth);
            maxY = Math.max(maxY, y + nodeHeight);

            const task = tasks.find(t => t.id === id)!;
            return { id, x, y, task };
        });

        // Створюємо контейнер
        finalNodes.push({
            id: groupId,
            type: 'group', // Вбудований тип React Flow
            position: { x: minX - padding, y: minY - padding },
            style: {
                width: maxX - minX + padding * 2,
                height: maxY - minY + padding * 2,
                backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.4)' : 'rgba(239, 246, 255, 0.6)',
                border: `2px dashed ${isDarkMode ? '#4b5563' : '#93c5fd'}`,
                borderRadius: '24px',
            },
            data: {}
        });

        // Додаємо ноди ВЕРЕДИНУ контейнера (рахуємо відносну позицію)
        absoluteNodes.forEach(n => {
            finalNodes.push({
                id: n.id,
                type: 'taskNode',
                parentNode: groupId, // Робить ноду частиною групи
                extent: 'parent',    // Не дає витягнути ноду за межі групи
                position: { 
                    x: n.x - (minX - padding), // Відносно X батька
                    y: n.y - (minY - padding)  // Відносно Y батька
                },
                data: { task: n.task },
                zIndex: 10
            });
        });
    });

    return finalNodes;
};

export const GraphView: React.FC<GraphViewProps> = ({ tabId, isDarkMode }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const nodeTypes = useMemo(() => ({ taskNode: TaskNode }), []);

    const fetchTasks = async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
            const tasks: TaskItem[] = await response.json();

            // Спочатку збираємо всі ребра
            const rawEdges: Edge[] = [];
            tasks.forEach(task => {
                if (task.dependentTasks) {
                    task.dependentTasks.forEach(dep => {
                        rawEdges.push({
                            id: dep.id,
                            source: dep.parentTaskId,
                            target: dep.childTaskId,
                            animated: true,
                            style: { stroke: isDarkMode ? '#60a5fa' : '#3b82f6', strokeWidth: 2 },
                        });
                    });
                }
            });

            // Віддаємо дані в алгоритм для створення контейнерів і позиціонування
            const layoutedNodes = getLayoutedElements(tasks, rawEdges, isDarkMode);

            setNodes(layoutedNodes);
            setEdges(rawEdges);
        } catch (error) {
            console.error("Помилка завантаження графа", error);
        }
    };

    useEffect(() => { fetchTasks(); }, [tabId, isDarkMode]);

    const onConnect = useCallback(async (params: Connection) => {
        if (!params.source || !params.target) return;
        try {
            const response = await fetch(`${API_URL}/dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parentTaskId: params.source, childTaskId: params.target })
            });

            if (response.ok) {
                // Після з'єднання граф може змінити структуру, тому перемальовуємо все
                fetchTasks(); 
            }
        } catch (error) { console.error(error); }
    }, [isDarkMode]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tabId, title: newTaskTitle, description: '' })
            });
            setNewTaskTitle('');
            setIsCreating(false);
            fetchTasks(); 
        } catch (error) { console.error(error); }
    };

    return (
        <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDoubleClick={(_, node) => {
                    if (node.type === 'taskNode') setSelectedTask(node.data.task);
                }}
                nodeTypes={nodeTypes}
                fitView
                style={{ background: isDarkMode ? '#111827' : '#f9fafb' }}
            >
                <Background color={isDarkMode ? '#374151' : '#ccc'} gap={16} />
                <Controls className="bg-white dark:bg-gray-800 dark:fill-white" />
                <MiniMap 
                    nodeColor={isDarkMode ? '#4b5563' : '#e5e7eb'} 
                    maskColor={isDarkMode ? 'rgba(17, 24, 39, 0.7)' : 'rgba(249, 250, 251, 0.7)'} 
                />
                
                <Panel position="top-right" className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    {!isCreating ? (
                        <button onClick={() => setIsCreating(true)} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition">
                            + Додати задачу
                        </button>
                    ) : (
                        <form onSubmit={handleCreateTask} className="flex gap-2">
                            <input 
                                type="text" autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Назва задачі..."
                                className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">✓</button>
                            <button type="button" onClick={() => setIsCreating(false)} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">✕</button>
                        </form>
                    )}
                </Panel>
            </ReactFlow>

            {selectedTask && (
                <TaskModal 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)} 
                    onSave={async (id, title, desc, status) => {
                        await fetch(`${API_URL}/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: desc }) });
                        await fetch(`${API_URL}/tasks/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
                        fetchTasks();
                    }} 
                />
            )}
        </div>
    );
};