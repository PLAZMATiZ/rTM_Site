import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
    Background, Controls, MiniMap, Panel,
    useNodesState, useEdgesState, 
    type Connection, type Edge, type Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

import { TaskNode } from './TaskNode';
import { TaskModal } from './TaskModal';
import type { TaskItem } from '../types';

const API_URL = 'https://rtm-temp.reaniplay.comp/api';

interface GraphViewProps {
    tabId: string;
    isDarkMode: boolean;
}

const getLayoutedElements = (tasks: TaskItem[], edges: Edge[], isDarkMode: boolean) => {
    const nodeWidth = 260; 
    const nodeHeight = 130; 
    const padding = 40; 
    const groupSpacing = 80;

    const adjList: Record<string, string[]> = {};
    tasks.forEach(t => adjList[t.id] = []);
    edges.forEach(e => {
        adjList[e.source].push(e.target);
        adjList[e.target].push(e.source);
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
    let currentOffsetX = 0;

    clusters.forEach((clusterIds, index) => {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 120 });

        clusterIds.forEach(id => dagreGraph.setNode(id, { width: nodeWidth, height: nodeHeight }));
        edges.forEach(edge => {
            if (clusterIds.includes(edge.source) && clusterIds.includes(edge.target)) {
                dagreGraph.setEdge(edge.source, edge.target);
            }
        });

        dagre.layout(dagreGraph);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const absoluteNodes = clusterIds.map(id => {
            const nodeWithPosition = dagreGraph.node(id);
            const x = nodeWithPosition.x - nodeWidth / 2;
            const y = nodeWithPosition.y - nodeHeight / 2;
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + nodeWidth); maxY = Math.max(maxY, y + nodeHeight);
            return { id, x, y, task: tasks.find(t => t.id === id)! };
        });

        const clusterWidth = maxX - minX + padding * 2;
        const clusterHeight = maxY - minY + padding * 2;
        const groupId = `group-${index}`;

        finalNodes.push({
            id: groupId,
            type: 'group',
            position: { x: currentOffsetX, y: 0 },
            style: {
                width: clusterWidth,
                height: clusterHeight,
                backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.4)' : 'rgba(239, 246, 255, 0.6)',
                border: `2px dashed ${isDarkMode ? '#4b5563' : '#93c5fd'}`,
                borderRadius: '24px',
            },
            data: {}
        });

        absoluteNodes.forEach(n => {
            finalNodes.push({
                id: n.id,
                type: 'taskNode',
                parentNode: groupId,
                extent: 'parent',
                position: { x: n.x - minX + padding, y: n.y - minY + padding },
                data: { task: n.task },
                zIndex: 10
            });
        });

        currentOffsetX += clusterWidth + groupSpacing;
    });

    return finalNodes;
};

export const GraphView: React.FC<GraphViewProps> = ({ tabId, isDarkMode }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    
    const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // СТЕЙТИ ФОРМИ
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newPriority, setNewPriority] = useState(0);
    const [newComplexity, setNewComplexity] = useState(0);

    const nodeTypes = useMemo(() => ({ taskNode: TaskNode }), []);

    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/tasks/by-tab/${tabId}`);
            if (!response.ok) return;
            const tasks: TaskItem[] = await response.json();

            const rawEdges: Edge[] = [];
            tasks.forEach(task => {
                task.dependentTasks?.forEach(dep => {
                    rawEdges.push({
                        id: dep.id,
                        source: dep.parentTaskId,
                        target: dep.childTaskId,
                        animated: true,
                        style: { stroke: isDarkMode ? '#60a5fa' : '#3b82f6', strokeWidth: 2 },
                    });
                });
            });

            const layoutedNodes = getLayoutedElements(tasks, rawEdges, isDarkMode);
            setNodes(layoutedNodes);
            setEdges(rawEdges);
        } catch (error) { console.error("Error loading graph:", error); }
    }, [tabId, isDarkMode, setNodes, setEdges]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const onConnect = useCallback(async (params: Connection) => {
        if (!params.source || !params.target) return;
        const existingEdge = edges.find(e => e.source === params.source && e.target === params.target);

        if (existingEdge) {
            await fetch(`${API_URL}/dependencies/${params.source}/${params.target}`, { method: 'DELETE' });
        } else {
            await fetch(`${API_URL}/dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parentTaskId: params.source, childTaskId: params.target })
            });
        }
        fetchTasks();
    }, [edges, fetchTasks]);

    // ОНОВЛЕНЕ СТВОРЕННЯ
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tabId, 
                title: newTaskTitle, 
                description: '', 
                priority: newPriority, 
                complexity: newComplexity 
            })
        });
        setNewTaskTitle('');
        setNewPriority(0);
        setNewComplexity(0);
        setIsCreating(false);
        fetchTasks();
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
                minZoom={0.01}
                maxZoom={10}
                style={{ background: isDarkMode ? '#111827' : '#f9fafb' }}
            >
                <Background color={isDarkMode ? '#374151' : '#ccc'} gap={16} />
                <Controls className="bg-white dark:bg-gray-800 dark:fill-white" />
                <MiniMap 
                    nodeColor={isDarkMode ? '#4b5563' : '#e5e7eb'} 
                    maskColor={isDarkMode ? 'rgba(17, 24, 39, 0.7)' : 'rgba(249, 250, 251, 0.7)'} 
                />
                
                {/* ОНОВЛЕНА ПАНЕЛЬ СТВОРЕННЯ */}
                <Panel position="top-right" className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-72">
                    {!isCreating ? (
                        <button onClick={() => setIsCreating(true)} className="w-full py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition">
                            + Додати задачу
                        </button>
                    ) : (
                        <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
                            <input 
                                type="text" autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Назва задачі..."
                                className="px-3 py-2 text-sm border rounded-xl dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            
                            <div className="flex gap-2">
                                <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 flex">
                                    {['Низ', 'Сер', 'Вис'].map((l, i) => <button type="button" key={i} onClick={() => setNewPriority(i)} className={`flex-1 text-[10px] py-1 rounded-md font-bold transition-all ${newPriority === i ? (i===0?'bg-green-500 text-white':i===1?'bg-yellow-500 text-white':'bg-red-500 text-white') : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{l}</button>)}
                                </div>
                                <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 flex">
                                    {['Лег', 'Норм', 'Скл'].map((l, i) => <button type="button" key={i} onClick={() => setNewComplexity(i)} className={`flex-1 text-[10px] py-1 rounded-md font-bold transition-all ${newComplexity === i ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{l}</button>)}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-1">
                                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition">Скасувати</button>
                                <button type="submit" className="flex-1 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition">Створити</button>
                            </div>
                        </form>
                    )}
                </Panel>
            </ReactFlow>

            {selectedTask && (
                <TaskModal 
                    task={selectedTask} 
                    allTasks={nodes.filter(n => n.type === 'taskNode').map(n => n.data.task)}
                    onClose={() => setSelectedTask(null)} 
                    onSaveSuccess={fetchTasks} 
                />
            )}
        </div>
    );
};