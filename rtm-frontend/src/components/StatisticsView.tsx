import React, { useEffect, useState } from 'react';
import type { TaskStatistic } from '../types';

const API_URL = 'https://rtmapi-production.up.railway.app/api';

export const StatisticsView: React.FC<{ userId: string }> = ({ userId }) => {
    const [stats, setStats] = useState<TaskStatistic[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const res = await fetch(`${API_URL}/tasks/statistics?userId=${userId}`);
            if (res.ok) setStats(await res.json());
        };
        fetchStats();
    }, [userId]);

    // Форматування секунд у красивий текст (напр. "2 год 15 хв")
    const formatDuration = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        if (h > 0) return `${h}г ${m}хв ${s}с`;
        if (m > 0) return `${m}хв ${s}с`;
        return `${s} сек`;
    };

    // Загальний час за весь час
    const totalTime = stats.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
                📊 Ваша статистика
            </h2>

            {/* Картка загального часу */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-10 text-white shadow-xl shadow-blue-500/20">
                <p className="text-blue-100 font-medium mb-1 uppercase tracking-wider text-sm">Загалом витрачено часу</p>
                <div className="text-4xl md:text-5xl font-black tracking-tight">
                    {formatDuration(totalTime)}
                </div>
                <p className="mt-4 text-sm text-blue-200">Виконано задач: {stats.length}</p>
            </div>

            {/* Таблиця статистики */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Задача</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Вкладка</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Завершено</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Витрачено часу</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {stats.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Немає даних для відображення</td></tr>
                            ) : (
                                stats.map(stat => (
                                    <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="p-4 font-semibold">{stat.taskTitle}</td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">{stat.tabName}</span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(stat.finishedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {formatDuration(stat.durationSeconds)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};