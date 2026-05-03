import React, { useState, useEffect } from 'react';

export const LiveTimer: React.FC<{ startedAt: string, finishedAt: string | null }> = ({ startedAt, finishedAt }) => {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(startedAt).getTime();
            // Якщо задача завершена - рахуємо до finishedAt, інакше - до поточного часу (Date.now())
            const end = finishedAt ? new Date(finishedAt).getTime() : Date.now(); 
            
            const diff = Math.floor((end - start) / 1000); // в секундах
            if (diff < 0) return '00:00:00';

            const h = String(Math.floor(diff / 3600)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            
            setElapsed(`${h}:${m}:${s}`);
        };

        calculateTime();
        // Якщо задача не завершена, оновлюємо таймер щосекунди
        if (!finishedAt) {
            const interval = setInterval(calculateTime, 1000);
            return () => clearInterval(interval);
        }
    }, [startedAt, finishedAt]);

    return (
        <span className={`font-mono font-bold tracking-widest px-2 py-1 rounded-md text-xs
            ${finishedAt ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'}
        `}>
            ⏱ {elapsed}
        </span>
    );
};