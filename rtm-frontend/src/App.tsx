import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

function App() {
  const [userId, setUserId] = useState<string | null>(null);

  // Перевіряємо, чи є збережений юзер при завантаженні сторінки
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setUserId(null);
  };

  return (
    <>
      {userId ? (
        <Dashboard userId={userId} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={setUserId} />
      )}
    </>
  );
}

export default App;