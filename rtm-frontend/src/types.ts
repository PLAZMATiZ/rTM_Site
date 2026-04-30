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
    status: number; // 0 = Pending, 1 = Done, 2 = Rejected
    dependentTasks: Dependency[];
}

export interface HistoryLog {
    id: string;
    tabId: string;
    taskId: string | null;
    action: string;
    createdAt: string;
}