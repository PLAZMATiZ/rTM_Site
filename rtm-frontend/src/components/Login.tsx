import React, { useState } from 'react';

const API_URL = 'https://rtm-temp.reaniplay.com/api';

interface LoginProps {
    onLoginSuccess: (userId: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) throw new Error('Помилка авторизації');

            const data = await response.json();
            localStorage.setItem('userId', data.id);
            onLoginSuccess(data.id);
        } catch (err) {
            setError('Не вдалося підключитися до сервера');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
                <h2 className="mb-6 text-3xl font-extrabold text-center text-gray-900 dark:text-white">Rtm App</h2>
                {error && <p className="mb-4 text-sm font-medium text-red-600 dark:text-red-400 text-center">{error}</p>}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Ваш Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            placeholder="Введіть ім'я"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-md"
                    >
                        {isLoading ? 'Завантаження...' : 'Увійти'}
                    </button>
                </form>
            </div>
        </div>
    );
};