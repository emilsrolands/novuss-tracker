import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

// Hardcoded users
const USERS = {
  emils: { username: 'emils', password: 'emils123', displayName: 'Emils', playerId: 'p1' },
  peteris: { username: 'peteris', password: 'peteris123', displayName: 'Pēteris', playerId: 'p2' },
};

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // App state
  const [games, setGames] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [justAdded, setJustAdded] = useState(null);
  const [showAchievement, setShowAchievement] = useState(null);
  const [loading, setLoading] = useState(true);
  const toastTimeout = useRef(null);
  
  const players = { p1: 'Emils', p2: 'Pēteris' };
  const todayStr = new Date().toISOString().split('T')[0];

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      // Check saved session
      const savedSession = localStorage.getItem('novuss-session');
      if (savedSession) {
        try {
          setCurrentUser(JSON.parse(savedSession));
        } catch (e) {}
      }
      
      // Load dark mode
      const savedDarkMode = localStorage.getItem('novuss-dark-mode');
      if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      
      // Load games from Supabase
      await loadGames();
    };
    load();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error loading games:', error);
      showToast('Failed to load games', 'error');
    }
    setLoading(false);
  };

  const saveGame = async (gameData) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([gameData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving game:', error);
      showToast('Failed to save game', 'error');
      return null;
    }
  };

  // Auth functions
  const handleLogin = () => {
    const user = Object.values(USERS).find(
      u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password
    );
    if (user) {
      setCurrentUser(user);
      setLoginError('');
      if (rememberMe) {
        localStorage.setItem('novuss-session', JSON.stringify(user));
      }
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('novuss-session');
  };

  const showToast = (message, type = 'info', duration = 3000) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), duration);
  };

  // Achievement checker
  const checkAchievements = (newGames, winner, user) => {
    if (winner !== user.playerId) return;
    
    const myWins = newGames.filter(g => g.winner === user.playerId).length;
    
    // Win milestones
    const winMilestones = [1, 5, 10, 25, 50, 100];
    if (winMilestones.includes(myWins)) {
      const titles = { 1: 'First Blood!', 5: 'Getting Started!', 10: 'Double Digits!', 25: 'Quarter Century!', 50: 'Half Century!', 100: 'Centurion!' };
      setShowAchievement({ title: titles[myWins], subtitle: `${myWins} wins achieved` });
      setTimeout(() => setShowAchievement(null), 3000);
      return;
    }

    // Streak achievements
    const sorted = [...newGames].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    let streak = 0;
    for (const game of sorted) {
      if (game.winner === user.playerId) streak++;
      else break;
    }
    const streakMilestones = [3, 5, 7, 10];
    if (streakMilestones.includes(streak)) {
      const titles = { 3: 'Hat Trick!', 5: 'On Fire!', 7: 'Unstoppable!', 10: 'Legendary!' };
      setShowAchievement({ title: titles[streak], subtitle: `${streak} wins in a row` });
      setTimeout(() => setShowAchievement(null), 3000);
      return;
    }

    // Comeback achievement
    if (sorted.length >= 4) {
      let loseStreak = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].winner !== user.playerId) loseStreak++;
        else break;
      }
      if (loseStreak >= 3 && sorted[0].winner === user.playerId) {
        setShowAchievement({ title: 'Comeback Kid!', subtitle: `Won after ${loseStreak} losses` });
        setTimeout(() => setShowAchievement(null), 3000);
        return;
      }
    }
  };

  const addGame = async (selectedWinner) => {
    const gameData = { date, winner: selectedWinner, note: note.trim() || null };
    const savedGame = await saveGame(gameData);
    
    if (savedGame) {
      const newGames = [savedGame, ...games];
      setGames(newGames);
      setNote('');
      setShowNoteInput(false);
      
      // Confirmation animation
      setJustAdded(savedGame.id);
      setTimeout(() => setJustAdded(null), 1500);
      
      showToast(`${selectedWinner === 'p1' ? players.p1 : players.p2} wins!`, 'success');
      
      if (currentUser) {
        checkAchievements(newGames, selectedWinner, currentUser);
      }
    }
  };

  const deleteGame = async (id) => {
    try {
      const gameToDelete = games.find(g => g.id === id);
      const { error } = await supabase.from('games').delete().eq('id', id);
      
      if (error) throw error;
      
      setGames(games.filter(g => g.id !== id));
      setLastDeleted(gameToDelete);
      setDeleteConfirm(null);
      showToast('Game deleted. Tap to undo.', 'undo', 5000);
    } catch (error) {
      console.error('Error deleting game:', error);
      showToast('Failed to delete', 'error');
    }
  };

  const undoDelete = async () => {
    if (!lastDeleted) return;
    try {
      const { id, created_at, ...gameData } = lastDeleted;
      const { data, error } = await supabase.from('games').insert([gameData]).select().single();
      
      if (error) throw error;
      
      setGames([data, ...games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setLastDeleted(null);
      setToast(null);
      showToast('Game restored!', 'success');
    } catch (error) {
      console.error('Error restoring:', error);
      showToast('Failed to restore', 'error');
    }
  };

  // Stats calculations
  const getStats = (gamesList) => ({
    wins1: gamesList.filter(g => g.winner === 'p1').length,
    wins2: gamesList.filter(g => g.winner === 'p2').length,
    total: gamesList.length
  });

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const weekStartStr = startOfWeek.toISOString().split('T')[0];
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const weeklyGames = games.filter(g => g.date >= weekStartStr && g.date <= todayStr);
  const monthlyGames = games.filter(g => g.date >= monthStartStr && g.date <= todayStr);
  const totalStats = getStats(games);
  const weeklyStats = getStats(weeklyGames);
  const monthlyStats = getStats(monthlyGames);

  const winPct = games.length === 0 ? { p1: 0, p2: 0 } : { 
    p1: Math.round((totalStats.wins1 / games.length) * 100),
    p2: Math.round((totalStats.wins2 / games.length) * 100)
  };

  // Monthly breakdown for chart
  const getMonthlyBreakdown = () => {
    const months = {};
    games.forEach(game => {
      const monthKey = game.date.substring(0, 7);
      if (!months[monthKey]) months[monthKey] = { p1: 0, p2: 0 };
      months[monthKey][game.winner]++;
    });
    
    const sortedMonths = Object.keys(months).sort().slice(-6);
    return sortedMonths.map(key => ({
      month: new Date(key + '-01').toLocaleDateString('en', { month: 'short' }),
      p1: months[key].p1,
      p2: months[key].p2,
    }));
  };

  // Win rate trend vs last month
  const getWinRateTrend = () => {
    if (games.length < 5) return null;
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const lastMonthGames = games.filter(g => g.date.startsWith(lastMonthStr));
    const thisMonthGames = games.filter(g => g.date.startsWith(thisMonthStr));
    
    if (lastMonthGames.length < 2 || thisMonthGames.length < 2) return null;
    
    const lastMonthRate = {
      p1: lastMonthGames.filter(g => g.winner === 'p1').length / lastMonthGames.length * 100,
      p2: lastMonthGames.filter(g => g.winner === 'p2').length / lastMonthGames.length * 100,
    };
    const thisMonthRate = {
      p1: thisMonthGames.filter(g => g.winner === 'p1').length / thisMonthGames.length * 100,
      p2: thisMonthGames.filter(g => g.winner === 'p2').length / thisMonthGames.length * 100,
    };
    
    return {
      p1: Math.round(thisMonthRate.p1 - lastMonthRate.p1),
      p2: Math.round(thisMonthRate.p2 - lastMonthRate.p2),
    };
  };

  const getStreak = () => {
    if (games.length === 0) return null;
    const sorted = [...games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    let count = 0;
    for (const game of sorted) {
      if (game.winner === sorted[0].winner) count++;
      else break;
    }
    return { player: sorted[0].winner === 'p1' ? players.p1 : players.p2, playerId: sorted[0].winner, count };
  };

  const getBestStreak = () => {
    if (games.length === 0) return { p1: 0, p2: 0 };
    const sorted = [...games].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    let bestP1 = 0, bestP2 = 0, current = 0, currentPlayer = null;
    for (const game of sorted) {
      if (game.winner === currentPlayer) current++;
      else { current = 1; currentPlayer = game.winner; }
      if (currentPlayer === 'p1' && current > bestP1) bestP1 = current;
      else if (currentPlayer === 'p2' && current > bestP2) bestP2 = current;
    }
    return { p1: bestP1, p2: bestP2 };
  };

  const getRecentForm = () => {
    const recent = [...games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    return { p1: recent.filter(g => g.winner === 'p1').length, p2: recent.filter(g => g.winner === 'p2').length };
  };

  const streak = getStreak();
  const bestStreaks = getBestStreak();
  const recentForm = getRecentForm();
  const monthlyBreakdown = getMonthlyBreakdown();
  const winRateTrend = getWinRateTrend();

  // Theme
  const theme = {
    light: {
      bg: '#F8F9FA',
      card: '#FFFFFF',
      text: '#1A1A2E',
      textSecondary: '#6B7280',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      rowBg: '#F3F4F6',
      buttonBg: '#1A1A2E',
      buttonText: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
    dark: {
      bg: '#111113',
      card: '#1C1C1E',
      text: '#F5F5F7',
      textSecondary: '#A1A1A6',
      textMuted: '#6E6E73',
      border: '#2C2C2E',
      rowBg: '#242426',
      buttonBg: '#F5F5F7',
      buttonText: '#111113',
      inputBg: '#242426',
    },
    green: '#22C55E',
    greenBg: darkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    greenBgStrong: darkMode ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.18)',
    red: '#EF4444',
    redBg: darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
  };

  const c = darkMode ? theme.dark : theme.light;

  // Loading screen
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: c.bg }}>
        <div style={{ color: c.textMuted }}>Loading...</div>
      </div>
    );
  }

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: c.bg }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: c.text }}>Novuss</h1>
            <p style={{ color: c.textSecondary }}>Track your games</p>
          </div>
          
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: c.textSecondary }}>Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full p-3 rounded-xl"
                  style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: c.textSecondary }}>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full p-3 rounded-xl"
                  style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                  placeholder="Enter password"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="remember" className="text-sm" style={{ color: c.textSecondary }}>Remember me</label>
              </div>

              {loginError && (
                <div className="text-sm text-center py-2 px-3 rounded-lg" style={{ backgroundColor: theme.redBg, color: theme.red }}>
                  {loginError}
                </div>
              )}

              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-xl font-semibold"
                style={{ backgroundColor: c.buttonBg, color: c.buttonText }}
              >
                Sign In
              </button>
            </div>
          </div>

          <button
            onClick={() => { setDarkMode(!darkMode); localStorage.setItem('novuss-dark-mode', JSON.stringify(!darkMode)); }}
            className="mx-auto mt-6 block p-2 rounded-lg"
            style={{ color: c.textMuted }}
          >
            {darkMode ? '☀ Light mode' : '☾ Dark mode'}
          </button>
        </div>
      </div>
    );
  }

  // Main App Components
  const StatBox = ({ title, stats, period }) => (
    <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: c.textSecondary }}>{title}</h3>
      {stats.total === 0 ? (
        <div className="text-center py-4 text-sm" style={{ color: c.textMuted }}>No games {period}</div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 p-3 rounded-xl" style={stats.wins1 > stats.wins2 ? { backgroundColor: theme.greenBg } : stats.wins1 < stats.wins2 ? { backgroundColor: theme.redBg } : {}}>
            <div className="text-2xl font-bold" style={{ color: stats.wins1 > stats.wins2 ? theme.green : stats.wins1 < stats.wins2 ? theme.red : c.text }}>{stats.wins1}</div>
            <div className="text-xs" style={{ color: c.textSecondary }}>{players.p1}</div>
          </div>
          <div className="px-3" style={{ color: c.textMuted }}>–</div>
          <div className="text-center flex-1 p-3 rounded-xl" style={stats.wins2 > stats.wins1 ? { backgroundColor: theme.greenBg } : stats.wins2 < stats.wins1 ? { backgroundColor: theme.redBg } : {}}>
            <div className="text-2xl font-bold" style={{ color: stats.wins2 > stats.wins1 ? theme.green : stats.wins2 < stats.wins1 ? theme.red : c.text }}>{stats.wins2}</div>
            <div className="text-xs" style={{ color: c.textSecondary }}>{players.p2}</div>
          </div>
        </div>
      )}
    </div>
  );

  const MonthlyChart = ({ data }) => {
    if (data.length === 0) return null;
    const maxValue = Math.max(...data.flatMap(d => [d.p1, d.p2]), 1);
    
    return (
      <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
        <h3 className="text-sm font-medium mb-4" style={{ color: c.textSecondary }}>Monthly Breakdown</h3>
        <div className="space-y-3">
          {data.map((month, i) => (
            <div key={i} className="space-y-1">
              <div className="text-xs" style={{ color: c.textMuted }}>{month.month}</div>
              <div className="flex gap-1 h-6">
                <div 
                  className="rounded-l flex items-center justify-end pr-1 text-xs font-medium text-white"
                  style={{ 
                    backgroundColor: theme.green, 
                    width: `${Math.max((month.p1 / maxValue) * 50, month.p1 > 0 ? 15 : 0)}%`,
                    minWidth: month.p1 > 0 ? '20px' : '0'
                  }}
                >
                  {month.p1 > 0 && month.p1}
                </div>
                <div 
                  className="rounded-r flex items-center justify-start pl-1 text-xs font-medium text-white"
                  style={{ 
                    backgroundColor: theme.red, 
                    width: `${Math.max((month.p2 / maxValue) * 50, month.p2 > 0 ? 15 : 0)}%`,
                    minWidth: month.p2 > 0 ? '20px' : '0'
                  }}
                >
                  {month.p2 > 0 && month.p2}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-xs" style={{ color: c.textSecondary }}>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: theme.green }}></span> {players.p1}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: theme.red }}></span> {players.p2}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: c.bg }}>
      <div className="max-w-2xl mx-auto">
        
        {/* Toast */}
        {toast && (
          <div 
            onClick={toast.type === 'undo' ? undoDelete : undefined}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg cursor-pointer font-medium"
            style={{ 
              backgroundColor: toast.type === 'success' ? theme.green : toast.type === 'error' ? theme.red : c.card,
              color: toast.type === 'success' || toast.type === 'error' ? '#FFFFFF' : c.text,
              border: toast.type === 'undo' ? `1px solid ${c.border}` : 'none'
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Achievement popup */}
        {showAchievement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div 
              className="p-8 rounded-3xl shadow-2xl text-center"
              style={{ backgroundColor: c.card, animation: 'pulse 0.5s ease-in-out' }}
            >
              <div className="text-5xl mb-3">🏆</div>
              <div className="text-2xl font-bold mb-1" style={{ color: theme.green }}>{showAchievement.title}</div>
              <div style={{ color: c.textSecondary }}>{showAchievement.subtitle}</div>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="p-6 rounded-2xl shadow-xl w-full max-w-sm" style={{ backgroundColor: c.card }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: c.text }}>Delete Game?</h3>
              <p className="mb-4" style={{ color: c.textSecondary }}>This will update all stats.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="flex-1 py-2.5 rounded-xl font-medium"
                  style={{ backgroundColor: c.rowBg, color: c.text }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteGame(deleteConfirm)} 
                  className="flex-1 py-2.5 rounded-xl font-medium text-white"
                  style={{ backgroundColor: theme.red }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: c.text }}>Novuss</h1>
            <p style={{ color: c.textSecondary }}>
              Logged in as <span style={{ color: theme.green, fontWeight: 600 }}>{currentUser.displayName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setDarkMode(!darkMode); localStorage.setItem('novuss-dark-mode', JSON.stringify(!darkMode)); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: c.rowBg, color: c.textSecondary }}
            >
              {darkMode ? '☀' : '☾'}
            </button>
            <button 
              onClick={handleLogout} 
              className="px-3 h-10 rounded-xl flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: c.rowBg, color: c.textSecondary }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="rounded-2xl shadow-sm p-6 mb-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <h2 className="text-sm font-medium mb-4 text-center" style={{ color: c.textSecondary }}>All Time</h2>
          {games.length === 0 ? (
            <div className="text-center py-8" style={{ color: c.textMuted }}>
              <p>No games yet. Add your first game below!</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <div 
                className="text-center p-6 rounded-2xl flex-1 transition-all duration-300"
                style={totalStats.wins1 > totalStats.wins2 
                  ? { backgroundColor: theme.greenBgStrong, border: `2px solid ${theme.green}` } 
                  : totalStats.wins1 < totalStats.wins2
                  ? { backgroundColor: theme.redBg, border: `2px solid ${theme.red}` }
                  : { backgroundColor: c.rowBg }
                }
              >
                <div className="text-4xl font-bold" style={{ color: totalStats.wins1 > totalStats.wins2 ? theme.green : totalStats.wins1 < totalStats.wins2 ? theme.red : c.text }}>{totalStats.wins1}</div>
                <div className="text-sm font-medium mt-1" style={{ color: c.textSecondary }}>{players.p1}</div>
              </div>
              <div className="text-2xl font-light" style={{ color: c.textMuted }}>:</div>
              <div 
                className="text-center p-6 rounded-2xl flex-1 transition-all duration-300"
                style={totalStats.wins2 > totalStats.wins1 
                  ? { backgroundColor: theme.greenBgStrong, border: `2px solid ${theme.green}` } 
                  : totalStats.wins2 < totalStats.wins1
                  ? { backgroundColor: theme.redBg, border: `2px solid ${theme.red}` }
                  : { backgroundColor: c.rowBg }
                }
              >
                <div className="text-4xl font-bold" style={{ color: totalStats.wins2 > totalStats.wins1 ? theme.green : totalStats.wins2 < totalStats.wins1 ? theme.red : c.text }}>{totalStats.wins2}</div>
                <div className="text-sm font-medium mt-1" style={{ color: c.textSecondary }}>{players.p2}</div>
              </div>
            </div>
          )}
        </div>

        {/* Add Game */}
        <div className="rounded-2xl shadow-sm p-6 mb-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: c.text }}>Add Game</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="flex-1 p-3 rounded-xl"
                style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} 
              />
              <button 
                onClick={() => setDate(todayStr)} 
                className="px-4 rounded-xl font-medium"
                style={date === todayStr 
                  ? { backgroundColor: c.buttonBg, color: c.buttonText } 
                  : { backgroundColor: c.rowBg, color: c.text, border: `1px solid ${c.border}` }
                }
              >
                Today
              </button>
            </div>
            <div>
              <button onClick={() => setShowNoteInput(!showNoteInput)} className="text-sm" style={{ color: c.textSecondary }}>
                + {showNoteInput ? 'Hide note' : 'Add note'}
              </button>
              {showNoteInput && (
                <input 
                  type="text" 
                  placeholder="e.g., Lunch break game..." 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  className="w-full mt-2 p-3 rounded-xl"
                  style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} 
                  maxLength={100} 
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => addGame('p1')} 
                className="py-4 font-semibold rounded-xl transition-transform active:scale-95"
                style={{ backgroundColor: c.buttonBg, color: c.buttonText }}
              >
                {players.p1} won
              </button>
              <button 
                onClick={() => addGame('p2')} 
                className="py-4 font-semibold rounded-xl transition-transform active:scale-95"
                style={{ backgroundColor: c.buttonBg, color: c.buttonText }}
              >
                {players.p2} won
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {games.length > 0 && (
          <React.Fragment>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatBox title="This Week" stats={weeklyStats} period="this week" />
              <StatBox title="This Month" stats={monthlyStats} period="this month" />
            </div>

            {streak && streak.count >= 3 && (
              <div className="rounded-2xl shadow-sm p-5 mb-6 text-center" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                <span className="text-2xl font-bold" style={{ color: theme.green }}>{streak.player}</span>
                <span className="text-lg ml-2" style={{ color: c.textSecondary }}>is on a</span>
                <span className="text-2xl font-bold ml-2" style={{ color: theme.green }}>{streak.count} game</span>
                <span className="text-lg ml-1" style={{ color: c.textSecondary }}>streak!</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Win Rate */}
              <div className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                <h3 className="text-xs font-medium mb-3" style={{ color: c.textSecondary }}>Win Rate</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: c.textSecondary }}>{players.p1}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold" style={{ color: winPct.p1 >= winPct.p2 ? theme.green : theme.red }}>{winPct.p1}%</span>
                      {winRateTrend && winRateTrend.p1 !== 0 && (
                        <span className="text-xs" style={{ color: winRateTrend.p1 > 0 ? theme.green : theme.red }}>
                          {winRateTrend.p1 > 0 ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: c.textSecondary }}>{players.p2}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-base font-bold" style={{ color: winPct.p2 > winPct.p1 ? theme.green : theme.red }}>{winPct.p2}%</span>
                      {winRateTrend && winRateTrend.p2 !== 0 && (
                        <span className="text-xs" style={{ color: winRateTrend.p2 > 0 ? theme.green : theme.red }}>
                          {winRateTrend.p2 > 0 ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Streak */}
              <div className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                <h3 className="text-xs font-medium mb-3" style={{ color: c.textSecondary }}>Best Streak</h3>
                <div className="text-center">
                  <div className="text-base" style={{ color: theme.green }}>★</div>
                  <div className="text-sm font-bold" style={{ color: theme.green }}>{bestStreaks.p1 >= bestStreaks.p2 ? players.p1 : players.p2}</div>
                  <div className="text-base font-bold" style={{ color: c.text }}>{Math.max(bestStreaks.p1, bestStreaks.p2)}</div>
                </div>
              </div>

              {/* Last 5 */}
              <div className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                <h3 className="text-xs font-medium mb-3" style={{ color: c.textSecondary }}>Last 5</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: c.textSecondary }}>{players.p1}</span>
                    <span className="text-base font-bold" style={{ color: recentForm.p1 >= recentForm.p2 ? theme.green : theme.red }}>{recentForm.p1}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: c.textSecondary }}>{players.p2}</span>
                    <span className="text-base font-bold" style={{ color: recentForm.p2 > recentForm.p1 ? theme.green : theme.red }}>{recentForm.p2}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            {monthlyBreakdown.length > 1 && (
              <div className="mb-6">
                <MonthlyChart data={monthlyBreakdown} />
              </div>
            )}
          </React.Fragment>
        )}

        {/* History */}
        <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: c.text }}>Game History ({games.length})</h2>
          {games.length === 0 ? (
            <div className="text-center py-8" style={{ color: c.textMuted }}>Your game history will appear here.</div>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <div 
                  key={game.id} 
                  className="p-3 rounded-xl transition-all duration-500"
                  style={{ 
                    backgroundColor: justAdded === game.id ? theme.greenBg : c.rowBg,
                    transform: justAdded === game.id ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm w-14" style={{ color: c.textMuted }}>
                      {new Date(game.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <span className="text-sm font-medium" style={{ color: game.winner === 'p1' ? c.text : c.textMuted }}>{players.p1}</span>
                      <span 
                        className="text-xs font-bold px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: game.winner === 'p1' ? theme.greenBg : theme.redBg,
                          color: game.winner === 'p1' ? theme.green : theme.red
                        }}
                      >
                        {game.winner === 'p1' ? 'W' : 'L'}
                      </span>
                      <span style={{ color: c.textMuted }}>–</span>
                      <span 
                        className="text-xs font-bold px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: game.winner === 'p2' ? theme.greenBg : theme.redBg,
                          color: game.winner === 'p2' ? theme.green : theme.red
                        }}
                      >
                        {game.winner === 'p2' ? 'W' : 'L'}
                      </span>
                      <span className="text-sm font-medium" style={{ color: game.winner === 'p2' ? c.text : c.textMuted }}>{players.p2}</span>
                    </div>
                    <button 
                      onClick={() => setDeleteConfirm(game.id)} 
                      className="w-8 text-right text-sm opacity-50 hover:opacity-100"
                      style={{ color: c.textMuted }}
                    >
                      ✕
                    </button>
                  </div>
                  {game.note && <div className="text-xs mt-1 ml-14 italic" style={{ color: c.textMuted }}>{game.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs" style={{ color: c.textMuted }}>Total: {games.length} games</div>
      </div>
    </div>
  );
}
