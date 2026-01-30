import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [games, setGames] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const toastTimeout = useRef(null);
  
  const players = { p1: 'Emils', p2: 'Pēteris' };
  const todayStr = new Date().toISOString().split('T')[0];

  // Load data from Supabase
  useEffect(() => {
    loadGames();
    const savedDarkMode = localStorage.getItem('novuss-dark-mode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
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

  const showToast = (message, type = 'info', duration = 3000) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), duration);
  };

  const checkMilestone = (newGames, winner) => {
    const wins = newGames.filter(g => g.winner === winner).length;
    const totalGames = newGames.length;
    const playerName = winner === 'p1' ? players.p1 : players.p2;
    
    if ([10, 25, 50, 100, 150, 200].includes(wins)) {
      setMilestone({ type: 'wins', player: playerName, count: wins });
      setTimeout(() => setMilestone(null), 4000);
    } else if ([10, 25, 50, 100, 200, 500].includes(totalGames)) {
      setMilestone({ type: 'games', count: totalGames });
      setTimeout(() => setMilestone(null), 4000);
    }
  };

  const addGame = async (selectedWinner) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{ date, winner: selectedWinner, note: note.trim() || null }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newGames = [data, ...games];
      setGames(newGames);
      setNote('');
      setShowNoteInput(false);
      
      showToast(`${selectedWinner === 'p1' ? players.p1 : players.p2} wins!`, 'success');
      checkMilestone(newGames, selectedWinner);
    } catch (error) {
      console.error('Error adding game:', error);
      showToast('Failed to save game', 'error');
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
  const getStats = (gamesList) => {
    const wins1 = gamesList.filter(g => g.winner === 'p1').length;
    const wins2 = gamesList.filter(g => g.winner === 'p2').length;
    return { wins1, wins2, total: gamesList.length };
  };

  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStartStr = startOfWeek.toISOString().split('T')[0];
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const weeklyGames = games.filter(g => g.date >= weekStartStr && g.date <= todayStr);
  const monthlyGames = games.filter(g => g.date >= monthStartStr && g.date <= todayStr);

  const totalStats = getStats(games);
  const weeklyStats = getStats(weeklyGames);
  const monthlyStats = getStats(monthlyGames);

  const winPct = games.length === 0 
    ? { p1: 0, p2: 0 } 
    : { 
        p1: Math.round((totalStats.wins1 / games.length) * 100),
        p2: Math.round((totalStats.wins2 / games.length) * 100)
      };

  const getStreak = () => {
    if (games.length === 0) return null;
    const sorted = [...games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const firstWinner = sorted[0].winner;
    let count = 0;
    for (const game of sorted) {
      if (game.winner === firstWinner) count++;
      else break;
    }
    return { player: firstWinner === 'p1' ? players.p1 : players.p2, count };
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

  const getDayPatterns = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const patterns = { p1: Array(7).fill(0), p2: Array(7).fill(0), total: Array(7).fill(0) };
    
    games.forEach(game => {
      const day = new Date(game.date).getDay();
      patterns.total[day]++;
      patterns[game.winner][day]++;
    });
    
    let bestP1 = { day: '', rate: 0, games: 0 }, bestP2 = { day: '', rate: 0, games: 0 };
    for (let i = 0; i < 7; i++) {
      if (patterns.total[i] >= 3) {
        const p1Rate = patterns.p1[i] / patterns.total[i];
        const p2Rate = patterns.p2[i] / patterns.total[i];
        if (p1Rate > bestP1.rate) bestP1 = { day: days[i], rate: Math.round(p1Rate * 100), games: patterns.total[i] };
        if (p2Rate > bestP2.rate) bestP2 = { day: days[i], rate: Math.round(p2Rate * 100), games: patterns.total[i] };
      }
    }
    return { p1: bestP1, p2: bestP2 };
  };

  const exportStats = () => {
    const text = `🎯 Novuss Tracker
━━━━━━━━━━━━━━━━━━

📊 ${players.p1} ${totalStats.wins1} - ${totalStats.wins2} ${players.p2}

Win Rate: ${players.p1} ${winPct.p1}% | ${players.p2} ${winPct.p2}%
This Week: ${weeklyStats.wins1} - ${weeklyStats.wins2}
This Month: ${monthlyStats.wins1} - ${monthlyStats.wins2}

Total games: ${games.length}`;
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
  };

  const streak = getStreak();
  const bestStreaks = getBestStreak();
  const recentForm = getRecentForm();
  const dayPatterns = getDayPatterns();
  const getLeader = (s) => s.wins1 > s.wins2 ? players.p1 : s.wins2 > s.wins1 ? players.p2 : null;

  // Theme
  const t = {
    bg: darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-amber-50 to-orange-100',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-gray-100' : 'text-gray-800',
    muted: darkMode ? 'text-gray-400' : 'text-gray-500',
    subtle: darkMode ? 'text-gray-500' : 'text-gray-400',
    input: darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200',
    row: darkMode ? 'bg-gray-700/50' : 'bg-gray-50',
    hover: darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    amber: darkMode ? 'text-amber-400' : 'text-amber-600',
    amberBg: darkMode ? 'bg-amber-900/30' : 'bg-amber-100',
  };

  const StatBox = ({ title, stats, period }) => (
    <div className={`${t.card} rounded-2xl shadow-lg p-5`}>
      <h3 className={`text-sm font-medium ${t.muted} mb-3`}>{title}</h3>
      {stats.total === 0 ? (
        <div className={`text-center py-4 ${t.subtle} text-sm`}>No games {period}</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className={`text-center flex-1 p-3 rounded-xl ${stats.wins1 > stats.wins2 ? t.amberBg : ''}`}>
              <div className={`text-2xl font-bold ${t.text}`}>{stats.wins1}</div>
              <div className={`text-xs ${t.muted}`}>{players.p1}</div>
            </div>
            <div className={`px-3 ${t.subtle}`}>–</div>
            <div className={`text-center flex-1 p-3 rounded-xl ${stats.wins2 > stats.wins1 ? t.amberBg : ''}`}>
              <div className={`text-2xl font-bold ${t.text}`}>{stats.wins2}</div>
              <div className={`text-xs ${t.muted}`}>{players.p2}</div>
            </div>
          </div>
          {getLeader(stats) && <div className={`mt-2 text-center text-xs ${t.amber}`}>👑 {getLeader(stats)}</div>}
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
        <div className={`text-xl ${t.muted}`}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.bg} p-4 md:p-8 transition-colors`}>
      <div className="max-w-2xl mx-auto">
        
        {/* Toast */}
        {toast && (
          <div 
            onClick={toast.type === 'undo' ? undoDelete : undefined}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg cursor-pointer ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-gray-800 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Milestone */}
        {milestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className={`${t.card} p-8 rounded-3xl shadow-2xl text-center animate-pulse`}>
              <div className="text-6xl mb-4">🎉</div>
              {milestone.type === 'wins' ? (
                <>
                  <div className={`text-2xl font-bold ${t.text}`}>{milestone.player}</div>
                  <div className={`text-lg ${t.muted}`}>reached</div>
                  <div className="text-4xl font-bold text-amber-500">{milestone.count} wins!</div>
                </>
              ) : (
                <>
                  <div className={`text-lg ${t.muted}`}>You've played</div>
                  <div className="text-4xl font-bold text-amber-500">{milestone.count} games!</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`${t.card} p-6 rounded-2xl shadow-xl w-full max-w-sm`}>
              <h3 className={`text-lg font-semibold ${t.text} mb-2`}>Delete Game?</h3>
              <p className={`${t.muted} mb-4`}>This will update all stats.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className={`flex-1 py-2 rounded-xl ${t.muted} ${t.hover}`}>Cancel</button>
                <button onClick={() => deleteGame(deleteConfirm)} className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>🎯 Novuss</h1>
            <p className={t.muted}>{players.p1} vs {players.p2}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportStats} className={`p-2 rounded-lg ${t.muted} ${t.hover}`}>📤</button>
            <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem('novuss-dark-mode', JSON.stringify(!darkMode)); }} className={`p-2 rounded-lg ${t.muted} ${t.hover}`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        <div className={`${t.card} rounded-2xl shadow-lg p-6 mb-6`}>
          <h2 className={`text-sm font-medium ${t.muted} mb-4 text-center`}>All Time</h2>
          {games.length === 0 ? (
            <div className={`text-center py-8 ${t.subtle}`}>
              <div className="text-4xl mb-3">🎯</div>
              <p>No games yet. Add your first game below!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-6">
                <div className={`text-center p-6 rounded-2xl flex-1 ${totalStats.wins1 > totalStats.wins2 ? `${t.amberBg} ring-2 ring-amber-400` : t.row}`}>
                  <div className={`text-4xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>{totalStats.wins1}</div>
                  <div className={`text-sm font-medium ${t.muted} mt-1`}>{players.p1}</div>
                </div>
                <div className={`text-3xl font-light ${t.subtle}`}>vs</div>
                <div className={`text-center p-6 rounded-2xl flex-1 ${totalStats.wins2 > totalStats.wins1 ? `${t.amberBg} ring-2 ring-amber-400` : t.row}`}>
                  <div className={`text-4xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>{totalStats.wins2}</div>
                  <div className={`text-sm font-medium ${t.muted} mt-1`}>{players.p2}</div>
                </div>
              </div>
              {getLeader(totalStats) && (
                <div className={`mt-4 text-center text-sm ${t.amber} ${t.amberBg} py-2 rounded-lg`}>
                  👑 {getLeader(totalStats)} is the champion!
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Game */}
        <div className={`${t.card} rounded-2xl shadow-lg p-6 mb-6`}>
          <h2 className={`text-lg font-semibold ${t.text} mb-4`}>Add Game</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`flex-1 p-3 border rounded-xl ${t.input} ${t.text}`}
              />
              <button
                onClick={() => setDate(todayStr)}
                className={`px-4 rounded-xl ${date === todayStr ? 'bg-amber-500 text-white' : `${t.row} ${t.text}`}`}
              >
                Today
              </button>
            </div>
            
            <div>
              <button onClick={() => setShowNoteInput(!showNoteInput)} className={`text-sm ${t.muted}`}>
                📝 {showNoteInput ? 'Hide note' : 'Add note'}
              </button>
              {showNoteInput && (
                <input
                  type="text"
                  placeholder="e.g., Lunch break game..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`w-full mt-2 p-3 border rounded-xl ${t.input} ${t.text}`}
                  maxLength={100}
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => addGame('p1')} className="py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600">
                {players.p1} won
              </button>
              <button onClick={() => addGame('p2')} className="py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600">
                {players.p2} won
              </button>
            </div>
          </div>
        </div>

        {/* Stats - only show when games exist */}
        {games.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatBox title="This Week" stats={weeklyStats} period="this week" />
              <StatBox title="This Month" stats={monthlyStats} period="this month" />
            </div>

            {streak && streak.count >= 3 && (
              <div className={`${t.card} rounded-2xl shadow-lg p-5 mb-6`}>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <div className="text-center">
                    <span className={`text-2xl font-bold ${t.amber}`}>{streak.player}</span>
                    <span className={`text-lg ${t.muted} ml-2`}>is on a</span>
                    <span className={`text-2xl font-bold ${t.amber} ml-2`}>{streak.count} game</span>
                    <span className={`text-lg ${t.muted} ml-1`}>streak!</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`${t.card} rounded-2xl shadow-lg p-4`}>
                <h3 className={`text-xs font-medium ${t.muted} mb-2`}>Win Rate</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs ${t.muted}`}>{players.p1}</span>
                    <span className={`text-lg font-bold ${winPct.p1 >= winPct.p2 ? t.amber : t.subtle}`}>{winPct.p1}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${t.muted}`}>{players.p2}</span>
                    <span className={`text-lg font-bold ${winPct.p2 > winPct.p1 ? t.amber : t.subtle}`}>{winPct.p2}%</span>
                  </div>
                </div>
              </div>

              <div className={`${t.card} rounded-2xl shadow-lg p-4`}>
                <h3 className={`text-xs font-medium ${t.muted} mb-2`}>Best Streak</h3>
                <div className="text-center">
                  <div className="text-xl">🏆</div>
                  <div className={`text-sm font-bold ${t.amber}`}>{bestStreaks.p1 >= bestStreaks.p2 ? players.p1 : players.p2}</div>
                  <div className={`text-lg font-bold ${t.text}`}>{Math.max(bestStreaks.p1, bestStreaks.p2)}</div>
                </div>
              </div>

              <div className={`${t.card} rounded-2xl shadow-lg p-4`}>
                <h3 className={`text-xs font-medium ${t.muted} mb-2`}>Last 5</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={`text-xs ${t.muted}`}>{players.p1}</span>
                    <span className={`text-lg font-bold ${recentForm.p1 >= recentForm.p2 ? t.amber : t.subtle}`}>{recentForm.p1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`text-xs ${t.muted}`}>{players.p2}</span>
                    <span className={`text-lg font-bold ${recentForm.p2 > recentForm.p1 ? t.amber : t.subtle}`}>{recentForm.p2}</span>
                  </div>
                </div>
              </div>
            </div>

            {games.length >= 10 && (dayPatterns.p1.games >= 3 || dayPatterns.p2.games >= 3) && (
              <div className={`${t.card} rounded-2xl shadow-lg p-5 mb-6`}>
                <h3 className={`text-sm font-medium ${t.muted} mb-3`}>Best Days</h3>
                <div className="grid grid-cols-2 gap-4">
                  {dayPatterns.p1.games >= 3 && (
                    <div className="text-center">
                      <div className={`text-sm ${t.muted}`}>{players.p1}</div>
                      <div className={`text-lg font-bold ${t.amber}`}>{dayPatterns.p1.day}</div>
                      <div className={`text-xs ${t.subtle}`}>{dayPatterns.p1.rate}% win rate</div>
                    </div>
                  )}
                  {dayPatterns.p2.games >= 3 && (
                    <div className="text-center">
                      <div className={`text-sm ${t.muted}`}>{players.p2}</div>
                      <div className={`text-lg font-bold ${t.amber}`}>{dayPatterns.p2.day}</div>
                      <div className={`text-xs ${t.subtle}`}>{dayPatterns.p2.rate}% win rate</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* History */}
        <div className={`${t.card} rounded-2xl shadow-lg p-6`}>
          <h2 className={`text-lg font-semibold ${t.text} mb-4`}>Game History ({games.length})</h2>
          {games.length === 0 ? (
            <div className={`text-center py-8 ${t.subtle}`}>Your game history will appear here.</div>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <div key={game.id} className={`p-3 ${t.row} rounded-xl ${t.hover}`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm ${t.subtle} w-16`}>
                      {new Date(game.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-center">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${game.winner === 'p1' ? t.text : t.subtle}`}>{players.p1}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${game.winner === 'p1' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {game.winner === 'p1' ? 'W' : 'L'}
                        </span>
                      </div>
                      <span className={t.subtle}>–</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${game.winner === 'p2' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {game.winner === 'p2' ? 'W' : 'L'}
                        </span>
                        <span className={`text-sm font-medium ${game.winner === 'p2' ? t.text : t.subtle}`}>{players.p2}</span>
                      </div>
                    </div>
                    <button onClick={() => setDeleteConfirm(game.id)} className={`${t.subtle} hover:text-red-500 w-8 text-right`}>✕</button>
                  </div>
                  {game.note && <div className={`text-xs ${t.subtle} mt-1 ml-16 italic`}>📝 {game.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {games.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => { if (confirm('Clear ALL games?')) { supabase.from('games').delete().neq('id', 0).then(() => { setGames([]); showToast('All games cleared', 'info'); }); }}}
              className={`text-sm ${t.subtle} hover:text-red-500`}
            >
              Reset all games
            </button>
          </div>
        )}

        <div className={`mt-8 text-center text-xs ${t.subtle}`}>Total: {games.length} games</div>
      </div>
    </div>
  );
}
