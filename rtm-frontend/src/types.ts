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