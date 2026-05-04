export interface User {
    id: string;
    username: string;
}

export interface Tab {
    id: string;
    userId: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

export interface Dependency {
    id: string;
    parentTaskId: string;
    childTaskId: string;
}

export interface TaskItem {
    id: string;
    tabId: string;
    title: string;
    description: string;
    status: number;
    priority?: number;
    complexity?: number;
    dependentTasks: any[];
    startedAt: string | null;
    finishedAt: string | null;
    deadline?: string | null;
}

export interface HistoryLog {
    id: string;
    tabId: string;
    taskId: string | null;
    action: string;
    createdAt: string;
}

export interface TaskStatistic {
    id: string;
    userId: string;
    taskId: string;
    taskTitle: string;
    tabName: string;
    startedAt: string;
    finishedAt: string;
    durationSeconds: number;
}