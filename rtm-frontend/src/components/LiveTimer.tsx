import React, { useState, useEffect } from 'react';

export const LiveTimer: React.FC<{ startedAt: string | null, finishedAt: string | null, isPaused: boolean, totalSpentSeconds: number }> = ({ startedAt, finishedAt, isPaused, totalSpentSeconds }) => {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const calculateTime = () => {
            let currentSessionSeconds = 0;
            
            // Якщо є час старту (задача не на паузі і не завершена)
            if (startedAt && !finishedAt && !isPaused) {
                currentSessionSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
            }

            const diff = totalSpentSeconds + currentSessionSeconds;

            const h = String(Math.floor(diff / 3600)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            
            setElapsed(`${h}:${m}:${s}`);
        };

        calculateTime();
        
        // Запускаємо інтервал тільки якщо задача АКТИВНА (не завершена і не на паузі)
        if (!finishedAt && !isPaused && startedAt) {
            const interval = setInterval(calculateTime, 1000);
            return () => clearInterval(interval);
        }
    }, [startedAt, finishedAt, isPaused, totalSpentSeconds]);

    // Визначаємо стиль залежно від стану
    let styleClasses = '';
    let icon = '⏱';
    
    if (finishedAt) {
        styleClasses = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        icon = '✅';
    } else if (isPaused) {
        styleClasses = 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
        icon = '⏸';
    } else {
        styleClasses = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse';
        icon = '▶';
    }

    return (
        <span className={`font-mono font-bold tracking-widest px-2 py-1 rounded-md text-xs transition-colors ${styleClasses}`}>
            {icon} {elapsed}
        </span>
    );
};