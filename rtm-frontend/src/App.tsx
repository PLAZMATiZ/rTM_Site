import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Analytics } from "@vercel/analytics/react"

function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Ініціалізація юзера та теми
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) setUserId(storedUserId);

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
      setIsDarkMode(!isDarkMode);
      if (!isDarkMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setUserId(null);
  };

  return (
    // Загальний фон для всього додатку
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {userId ? (
        <Dashboard 
            userId={userId} 
            onLogout={handleLogout} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
        />
      ) : (
        <Login onLoginSuccess={setUserId} />
      )}
      <Analytics />
    </div>
  );
}

export default App;