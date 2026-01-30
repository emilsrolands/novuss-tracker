import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

// Hardcoded user credentials (passwords checked client-side)
const USER_CREDENTIALS = {
  emils: { password: 'emils123', playerId: '11111111-1111-1111-1111-111111111111' },
  peteris: { password: 'peteris123', playerId: '22222222-2222-2222-2222-222222222222' },
  emilssarmulis: { password: 'riskemils123', playerId: '33333333-3333-3333-3333-333333333333' },
};

// Achievement definitions
const ACHIEVEMENTS = [
  // Wins
  { key: 'first_blood', name: 'First Blood', description: 'Win your first game', icon: '🎯' },
  { key: 'getting_warmed_up', name: 'Getting Warmed Up', description: 'Win 5 games', icon: '🔥' },
  { key: 'double_digits', name: 'Double Digits', description: 'Win 10 games', icon: '🔟' },
  { key: 'quarter_century', name: 'Quarter Century', description: 'Win 25 games', icon: '🏅' },
  { key: 'half_century', name: 'Half Century', description: 'Win 50 games', icon: '⭐' },
  { key: 'centurion', name: 'Centurion', description: 'Win 100 games', icon: '💯' },
  { key: 'legend', name: 'Legend', description: 'Win 250 games', icon: '👑' },
  // Streaks
  { key: 'hat_trick', name: 'Hat Trick', description: 'Win 3 games in a row', icon: '🎩' },
  { key: 'on_fire', name: 'On Fire', description: 'Win 5 games in a row', icon: '🔥' },
  { key: 'unstoppable', name: 'Unstoppable', description: 'Win 7 games in a row', icon: '💪' },
  { key: 'dominant', name: 'Dominant', description: 'Win 10 games in a row', icon: '🦁' },
  // Comebacks
  { key: 'comeback_kid', name: 'Comeback Kid', description: 'Win after 3+ consecutive losses', icon: '🔄' },
  { key: 'redemption_arc', name: 'Redemption Arc', description: 'Win after 5+ consecutive losses', icon: '🌅' },
  // Rivalries
  { key: 'rival', name: 'Rival', description: 'Play 10 games against the same opponent', icon: '🤝' },
  { key: 'nemesis', name: 'Nemesis', description: 'Play 25 games against the same opponent', icon: '⚔️' },
  { key: 'arch_enemy', name: 'Arch Enemy', description: 'Play 50 games against the same opponent', icon: '🏆' },
  // Activity
  { key: 'dedicated', name: 'Dedicated', description: 'Play games on 7 different days', icon: '📅' },
  { key: 'regular', name: 'Regular', description: 'Play games on 30 different days', icon: '📆' },
  { key: 'veteran', name: 'Veteran', description: 'Play games on 100 different days', icon: '🎖️' },
  // Domination
  { key: 'sweep', name: 'Sweep', description: 'Lead 5-0 against an opponent', icon: '🧹' },
  { key: 'perfect_week', name: 'Perfect Week', description: 'Win every game in a week (min 3 games)', icon: '✨' },
  // Social
  { key: 'popular', name: 'Popular', description: 'Play against 3 different opponents', icon: '👥' },
  { key: 'social_butterfly', name: 'Social Butterfly', description: 'Play against 5 different opponents', icon: '🦋' },
  { key: 'the_challenger', name: 'The Challenger', description: 'Play against 10 different opponents', icon: '🌟' },
];

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // App state
  const [activeTab, setActiveTab] = useState('matchups');
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [games, setGames] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  
  // Game form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  
  // UI state
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [justAdded, setJustAdded] = useState(null);
  const [showAchievementPopup, setShowAchievementPopup] = useState(null);
  const [loading, setLoading] = useState(true);
  const toastTimeout = useRef(null);
  
  const todayStr = new Date().toISOString().split('T')[0];

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      const savedSession = localStorage.getItem('novuss-session-v3');
      if (savedSession) {
        try { 
          const parsed = JSON.parse(savedSession);
          setCurrentUser(parsed); 
        } catch (e) {}
      }
      const savedDarkMode = localStorage.getItem('novuss-dark-mode');
      if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      
      await loadPlayers();
      await loadGames();
      setLoading(false);
    };
    load();
  }, []);

  // Load achievements when user logs in
  useEffect(() => {
    if (currentUser) {
      loadAchievements();
    }
  }, [currentUser]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase.from('players').select('*').order('display_name');
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const loadGames = async () => {
    try {
      const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error loading games:', error);
      showToast('Failed to load games', 'error');
    }
  };

  const loadAchievements = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('player_id', currentUser.id);
      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const unlockAchievement = async (achievementKey) => {
    if (!currentUser) return;
    if (achievements.find(a => a.achievement_key === achievementKey)) return;
    
    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert([{ player_id: currentUser.id, achievement_key: achievementKey }])
        .select()
        .single();
      
      if (error && !error.message.includes('duplicate')) throw error;
      if (data) {
        setAchievements(prev => [...prev, data]);
        const achievement = ACHIEVEMENTS.find(a => a.key === achievementKey);
        if (achievement) {
          setShowAchievementPopup(achievement);
          setTimeout(() => setShowAchievementPopup(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  };

  const checkAllAchievements = async (allGames, currentPlayerId) => {
    const myGames = allGames.filter(g => g.player1_id === currentPlayerId || g.player2_id === currentPlayerId);
    const myWins = allGames.filter(g => g.winner_id === currentPlayerId);
    
    // Win milestones
    const winMilestones = { 1: 'first_blood', 5: 'getting_warmed_up', 10: 'double_digits', 25: 'quarter_century', 50: 'half_century', 100: 'centurion', 250: 'legend' };
    for (const [count, key] of Object.entries(winMilestones)) {
      if (myWins.length >= parseInt(count)) await unlockAchievement(key);
    }
    
    // Streak achievements
    const sortedGames = [...myGames].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    let currentStreak = 0;
    let maxStreak = 0;
    for (const game of sortedGames) {
      if (game.winner_id === currentPlayerId) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        break;
      }
    }
    
    if (maxStreak >= 3) await unlockAchievement('hat_trick');
    if (maxStreak >= 5) await unlockAchievement('on_fire');
    if (maxStreak >= 7) await unlockAchievement('unstoppable');
    if (maxStreak >= 10) await unlockAchievement('dominant');
    
    // Comeback achievements
    let loseStreak = 0;
    for (let i = 1; i < sortedGames.length; i++) {
      if (sortedGames[i].winner_id !== currentPlayerId) loseStreak++;
      else break;
    }
    if (loseStreak >= 3 && sortedGames[0]?.winner_id === currentPlayerId) await unlockAchievement('comeback_kid');
    if (loseStreak >= 5 && sortedGames[0]?.winner_id === currentPlayerId) await unlockAchievement('redemption_arc');
    
    // Rivalry achievements
    const opponentCounts = {};
    myGames.forEach(g => {
      const oppId = g.player1_id === currentPlayerId ? g.player2_id : g.player1_id;
      opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
    });
    const maxRivalry = Math.max(...Object.values(opponentCounts), 0);
    if (maxRivalry >= 10) await unlockAchievement('rival');
    if (maxRivalry >= 25) await unlockAchievement('nemesis');
    if (maxRivalry >= 50) await unlockAchievement('arch_enemy');
    
    // Social achievements
    const uniqueOpponents = Object.keys(opponentCounts).length;
    if (uniqueOpponents >= 3) await unlockAchievement('popular');
    if (uniqueOpponents >= 5) await unlockAchievement('social_butterfly');
    if (uniqueOpponents >= 10) await unlockAchievement('the_challenger');
    
    // Activity achievements
    const uniqueDays = new Set(myGames.map(g => g.date)).size;
    if (uniqueDays >= 7) await unlockAchievement('dedicated');
    if (uniqueDays >= 30) await unlockAchievement('regular');
    if (uniqueDays >= 100) await unlockAchievement('veteran');
    
    // Sweep achievement (5-0 against any opponent)
    for (const [oppId, count] of Object.entries(opponentCounts)) {
      const vsOpp = myGames.filter(g => 
        (g.player1_id === currentPlayerId && g.player2_id === oppId) ||
        (g.player2_id === currentPlayerId && g.player1_id === oppId)
      );
      const myWinsVsOpp = vsOpp.filter(g => g.winner_id === currentPlayerId).length;
      const theirWins = vsOpp.length - myWinsVsOpp;
      if (myWinsVsOpp >= 5 && theirWins === 0) await unlockAchievement('sweep');
    }
    
    // Perfect week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const thisWeekGames = myGames.filter(g => g.date >= weekStartStr);
    if (thisWeekGames.length >= 3 && thisWeekGames.every(g => g.winner_id === currentPlayerId)) {
      await unlockAchievement('perfect_week');
    }
  };

  // Auth functions
  const handleLogin = () => {
    const creds = USER_CREDENTIALS[loginForm.username.toLowerCase()];
    if (creds && creds.password === loginForm.password) {
      const player = players.find(p => p.id === creds.playerId);
      if (player) {
        setCurrentUser(player);
        setLoginError('');
        if (rememberMe) {
          localStorage.setItem('novuss-session-v3', JSON.stringify(player));
        }
        // Check achievements on login
        setTimeout(() => checkAllAchievements(games, player.id), 500);
      } else {
        setLoginError('Player not found in database');
      }
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedOpponent(null);
    setActiveTab('matchups');
    localStorage.removeItem('novuss-session-v3');
  };

  const showToast = (message, type = 'info', duration = 3000) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), duration);
  };

  // Game functions
  const saveGame = async (gameData) => {
    try {
      const { data, error } = await supabase.from('games').insert([gameData]).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving game:', error);
      showToast('Failed to save game', 'error');
      return null;
    }
  };

  const addGame = async (winnerId) => {
    if (!currentUser || !selectedOpponent) return;
    
    const gameData = {
      date,
      player1_id: currentUser.id,
      player2_id: selectedOpponent.id,
      winner_id: winnerId,
      winner: winnerId === currentUser.id ? 'p1' : 'p2', // Keep for backwards compatibility
      note: note.trim() || null
    };
    
    const savedGame = await saveGame(gameData);
    if (savedGame) {
      const newGames = [savedGame, ...games];
      setGames(newGames);
      setNote('');
      setShowNoteInput(false);
      setJustAdded(savedGame.id);
      setTimeout(() => setJustAdded(null), 1500);
      
      const winnerName = winnerId === currentUser.id ? currentUser.display_name : selectedOpponent.display_name;
      showToast(`${winnerName} wins!`, 'success');
      
      await checkAllAchievements(newGames, currentUser.id);
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

  // Helper functions
  const getH2HGames = (opponentId) => {
    if (!currentUser) return [];
    return games.filter(g =>
      (g.player1_id === currentUser.id && g.player2_id === opponentId) ||
      (g.player2_id === currentUser.id && g.player1_id === opponentId)
    );
  };

  const getH2HStats = (opponentId) => {
    const h2hGames = getH2HGames(opponentId);
    const myWins = h2hGames.filter(g => g.winner_id === currentUser?.id).length;
    const theirWins = h2hGames.length - myWins;
    const lastGame = h2hGames[0];
    return { myWins, theirWins, total: h2hGames.length, lastGame };
  };

  const getLeaderboardData = () => {
    let filteredGames = games;
    const now = new Date();
    
    if (leaderboardPeriod === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      const weekStartStr = weekStart.toISOString().split('T')[0];
      filteredGames = games.filter(g => g.date >= weekStartStr);
    } else if (leaderboardPeriod === 'month') {
      const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      filteredGames = games.filter(g => g.date >= monthStartStr);
    }
    
    const playerStats = {};
    players.forEach(p => {
      playerStats[p.id] = { player: p, wins: 0, games: 0 };
    });
    
    filteredGames.forEach(g => {
      if (playerStats[g.player1_id]) playerStats[g.player1_id].games++;
      if (playerStats[g.player2_id]) playerStats[g.player2_id].games++;
      if (playerStats[g.winner_id]) playerStats[g.winner_id].wins++;
    });
    
    return Object.values(playerStats)
      .filter(s => s.games > 0)
      .sort((a, b) => b.wins - a.wins || (b.wins / b.games) - (a.wins / a.games));
  };

  // Theme
  const theme = {
    light: { bg: '#F8F9FA', card: '#FFFFFF', text: '#1A1A2E', textSecondary: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB', rowBg: '#F3F4F6', buttonBg: '#1A1A2E', buttonText: '#FFFFFF', inputBg: '#FFFFFF' },
    dark: { bg: '#111113', card: '#1C1C1E', text: '#F5F5F7', textSecondary: '#A1A1A6', textMuted: '#6E6E73', border: '#2C2C2E', rowBg: '#242426', buttonBg: '#F5F5F7', buttonText: '#111113', inputBg: '#242426' },
    green: '#22C55E',
    greenBg: darkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    greenBgStrong: darkMode ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.18)',
    red: '#EF4444',
    redBg: darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
    gold: '#F59E0B',
    silver: '#9CA3AF',
    bronze: '#CD7F32',
  };
  const c = darkMode ? theme.dark : theme.light;

  // Loading screen
  if (loading) {
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
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full p-3 rounded-xl"
                  style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                  placeholder="Enter password"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded" />
                <label htmlFor="remember" className="text-sm" style={{ color: c.textSecondary }}>Remember me</label>
              </div>
              {loginError && (
                <div className="text-sm text-center py-2 px-3 rounded-lg" style={{ backgroundColor: theme.redBg, color: theme.red }}>{loginError}</div>
              )}
              <button onClick={handleLogin} className="w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: c.buttonBg, color: c.buttonText }}>
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

  // Get opponents (all players except current user)
  const opponents = players.filter(p => p.id !== currentUser.id);

  // H2H Detail View
  if (selectedOpponent) {
    const h2hGames = getH2HGames(selectedOpponent.id);
    const stats = getH2HStats(selectedOpponent.id);
    
    // Calculate additional stats
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    const weeklyGames = h2hGames.filter(g => g.date >= weekStartStr);
    const monthlyGames = h2hGames.filter(g => g.date >= monthStartStr);
    const weeklyStats = {
      myWins: weeklyGames.filter(g => g.winner_id === currentUser.id).length,
      theirWins: weeklyGames.filter(g => g.winner_id === selectedOpponent.id).length,
      total: weeklyGames.length
    };
    const monthlyStats = {
      myWins: monthlyGames.filter(g => g.winner_id === currentUser.id).length,
      theirWins: monthlyGames.filter(g => g.winner_id === selectedOpponent.id).length,
      total: monthlyGames.length
    };
    
    // Streak
    const getStreak = () => {
      if (h2hGames.length === 0) return null;
      let count = 0;
      const firstWinner = h2hGames[0].winner_id;
      for (const game of h2hGames) {
        if (game.winner_id === firstWinner) count++;
        else break;
      }
      return { playerId: firstWinner, count };
    };
    const streak = getStreak();
    
    // Win percentages
    const winPct = stats.total === 0 ? { me: 0, them: 0 } : {
      me: Math.round((stats.myWins / stats.total) * 100),
      them: Math.round((stats.theirWins / stats.total) * 100)
    };
    
    // Best streaks
    const getBestStreaks = () => {
      if (h2hGames.length === 0) return { me: 0, them: 0 };
      const sorted = [...h2hGames].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      let bestMe = 0, bestThem = 0, current = 0, currentPlayer = null;
      for (const game of sorted) {
        if (game.winner_id === currentPlayer) current++;
        else { current = 1; currentPlayer = game.winner_id; }
        if (currentPlayer === currentUser.id && current > bestMe) bestMe = current;
        else if (currentPlayer === selectedOpponent.id && current > bestThem) bestThem = current;
      }
      return { me: bestMe, them: bestThem };
    };
    const bestStreaks = getBestStreaks();
    
    // Recent form (last 5)
    const recentForm = {
      me: h2hGames.slice(0, 5).filter(g => g.winner_id === currentUser.id).length,
      them: h2hGames.slice(0, 5).filter(g => g.winner_id === selectedOpponent.id).length
    };
    
    // Monthly breakdown
    const getMonthlyBreakdown = () => {
      const months = {};
      h2hGames.forEach(game => {
        const monthKey = game.date.substring(0, 7);
        if (!months[monthKey]) months[monthKey] = { me: 0, them: 0 };
        if (game.winner_id === currentUser.id) months[monthKey].me++;
        else months[monthKey].them++;
      });
      const sortedMonths = Object.keys(months).sort().slice(-6);
      return sortedMonths.map(key => ({
        month: new Date(key + '-01').toLocaleDateString('en', { month: 'short' }),
        me: months[key].me,
        them: months[key].them,
      }));
    };
    const monthlyBreakdown = getMonthlyBreakdown();

    const StatBox = ({ title, myWins, theirWins, total, period }) => (
      <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: c.textSecondary }}>{title}</h3>
        {total === 0 ? (
          <div className="text-center py-4 text-sm" style={{ color: c.textMuted }}>No games {period}</div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-center flex-1 p-3 rounded-xl" style={myWins > theirWins ? { backgroundColor: theme.greenBg } : myWins < theirWins ? { backgroundColor: theme.redBg } : {}}>
              <div className="text-2xl font-bold" style={{ color: myWins > theirWins ? theme.green : myWins < theirWins ? theme.red : c.text }}>{myWins}</div>
              <div className="text-xs" style={{ color: c.textSecondary }}>{currentUser.display_name}</div>
            </div>
            <div className="px-3" style={{ color: c.textMuted }}>–</div>
            <div className="text-center flex-1 p-3 rounded-xl" style={theirWins > myWins ? { backgroundColor: theme.greenBg } : theirWins < myWins ? { backgroundColor: theme.redBg } : {}}>
              <div className="text-2xl font-bold" style={{ color: theirWins > myWins ? theme.green : theirWins < myWins ? theme.red : c.text }}>{theirWins}</div>
              <div className="text-xs" style={{ color: c.textSecondary }}>{selectedOpponent.display_name}</div>
            </div>
          </div>
        )}
      </div>
    );

    const MonthlyChart = ({ data }) => {
      if (data.length === 0) return null;
      const maxValue = Math.max(...data.flatMap(d => [d.me, d.them]), 1);
      return (
        <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: c.textSecondary }}>Monthly Breakdown</h3>
          <div className="space-y-3">
            {data.map((month, i) => (
              <div key={i} className="space-y-1">
                <div className="text-xs" style={{ color: c.textMuted }}>{month.month}</div>
                <div className="flex gap-1 h-6">
                  <div className="rounded-l flex items-center justify-end pr-1 text-xs font-medium text-white"
                    style={{ backgroundColor: theme.green, width: `${Math.max((month.me / maxValue) * 50, month.me > 0 ? 15 : 0)}%`, minWidth: month.me > 0 ? '20px' : '0' }}>
                    {month.me > 0 && month.me}
                  </div>
                  <div className="rounded-r flex items-center justify-start pl-1 text-xs font-medium text-white"
                    style={{ backgroundColor: theme.red, width: `${Math.max((month.them / maxValue) * 50, month.them > 0 ? 15 : 0)}%`, minWidth: month.them > 0 ? '20px' : '0' }}>
                    {month.them > 0 && month.them}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4 text-xs" style={{ color: c.textSecondary }}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: theme.green }}></span> {currentUser.display_name}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: theme.red }}></span> {selectedOpponent.display_name}</span>
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: c.bg }}>
        <div className="max-w-2xl mx-auto">
          {/* Toast */}
          {toast && (
            <div onClick={toast.type === 'undo' ? undoDelete : undefined} className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg cursor-pointer font-medium"
              style={{ backgroundColor: toast.type === 'success' ? theme.green : toast.type === 'error' ? theme.red : c.card, color: toast.type === 'success' || toast.type === 'error' ? '#FFFFFF' : c.text, border: toast.type === 'undo' ? `1px solid ${c.border}` : 'none' }}>
              {toast.message}
            </div>
          )}

          {/* Achievement popup */}
          {showAchievementPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="p-8 rounded-3xl shadow-2xl text-center" style={{ backgroundColor: c.card }}>
                <div className="text-5xl mb-3">{showAchievementPopup.icon}</div>
                <div className="text-2xl font-bold mb-1" style={{ color: theme.green }}>{showAchievementPopup.name}</div>
                <div style={{ color: c.textSecondary }}>{showAchievementPopup.description}</div>
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
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl font-medium" style={{ backgroundColor: c.rowBg, color: c.text }}>Cancel</button>
                  <button onClick={() => deleteGame(deleteConfirm)} className="flex-1 py-2.5 rounded-xl font-medium text-white" style={{ backgroundColor: theme.red }}>Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSelectedOpponent(null)} className="p-2 rounded-xl" style={{ backgroundColor: c.rowBg }}>
              <span style={{ color: c.text }}>←</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: c.text }}>vs {selectedOpponent.display_name}</h1>
              <p className="text-sm" style={{ color: c.textSecondary }}>Head-to-head matchup</p>
            </div>
            <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem('novuss-dark-mode', JSON.stringify(!darkMode)); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: c.rowBg, color: c.textSecondary }}>
              {darkMode ? '☀' : '☾'}
            </button>
          </div>

          {/* All Time Score */}
          <div className="rounded-2xl shadow-sm p-6 mb-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <h2 className="text-sm font-medium mb-4 text-center" style={{ color: c.textSecondary }}>All Time</h2>
            {stats.total === 0 ? (
              <div className="text-center py-8" style={{ color: c.textMuted }}>No games yet. Add your first game below!</div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="text-center p-6 rounded-2xl flex-1 transition-all duration-300"
                  style={stats.myWins > stats.theirWins ? { backgroundColor: theme.greenBgStrong, border: `2px solid ${theme.green}` } : stats.myWins < stats.theirWins ? { backgroundColor: theme.redBg, border: `2px solid ${theme.red}` } : { backgroundColor: c.rowBg }}>
                  <div className="text-4xl font-bold" style={{ color: stats.myWins > stats.theirWins ? theme.green : stats.myWins < stats.theirWins ? theme.red : c.text }}>{stats.myWins}</div>
                  <div className="text-sm font-medium mt-1" style={{ color: c.textSecondary }}>{currentUser.display_name}</div>
                </div>
                <div className="text-2xl font-light" style={{ color: c.textMuted }}>:</div>
                <div className="text-center p-6 rounded-2xl flex-1 transition-all duration-300"
                  style={stats.theirWins > stats.myWins ? { backgroundColor: theme.greenBgStrong, border: `2px solid ${theme.green}` } : stats.theirWins < stats.myWins ? { backgroundColor: theme.redBg, border: `2px solid ${theme.red}` } : { backgroundColor: c.rowBg }}>
                  <div className="text-4xl font-bold" style={{ color: stats.theirWins > stats.myWins ? theme.green : stats.theirWins < stats.myWins ? theme.red : c.text }}>{stats.theirWins}</div>
                  <div className="text-sm font-medium mt-1" style={{ color: c.textSecondary }}>{selectedOpponent.display_name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Add Game */}
          <div className="rounded-2xl shadow-sm p-6 mb-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: c.text }}>Add Game</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 p-3 rounded-xl"
                  style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
                <button onClick={() => setDate(todayStr)} className="px-4 rounded-xl font-medium"
                  style={date === todayStr ? { backgroundColor: c.buttonBg, color: c.buttonText } : { backgroundColor: c.rowBg, color: c.text, border: `1px solid ${c.border}` }}>
                  Today
                </button>
              </div>
              <div>
                <button onClick={() => setShowNoteInput(!showNoteInput)} className="text-sm" style={{ color: c.textSecondary }}>
                  + {showNoteInput ? 'Hide note' : 'Add note'}
                </button>
                {showNoteInput && (
                  <input type="text" placeholder="e.g., Lunch break game..." value={note} onChange={(e) => setNote(e.target.value)}
                    className="w-full mt-2 p-3 rounded-xl" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} maxLength={100} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => addGame(currentUser.id)} className="py-4 font-semibold rounded-xl transition-transform active:scale-95"
                  style={{ backgroundColor: c.buttonBg, color: c.buttonText }}>
                  {currentUser.display_name} won
                </button>
                <button onClick={() => addGame(selectedOpponent.id)} className="py-4 font-semibold rounded-xl transition-transform active:scale-95"
                  style={{ backgroundColor: c.buttonBg, color: c.buttonText }}>
                  {selectedOpponent.display_name} won
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats.total > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <StatBox title="This Week" myWins={weeklyStats.myWins} theirWins={weeklyStats.theirWins} total={weeklyStats.total} period="this week" />
                <StatBox title="This Month" myWins={monthlyStats.myWins} theirWins={monthlyStats.theirWins} total={monthlyStats.total} period="this month" />
              </div>

              {streak && streak.count >= 3 && (
                <div className="rounded-2xl shadow-sm p-5 mb-6 text-center" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                  <span className="text-2xl font-bold" style={{ color: theme.green }}>
                    {streak.playerId === currentUser.id ? currentUser.display_name : selectedOpponent.display_name}
                  </span>
                  <span className="text-lg ml-2" style={{ color: c.textSecondary }}>is on a</span>
                  <span className="text-2xl font-bold ml-2" style={{ color: theme.green }}>{streak.count} game</span>
                  <span className="text-lg ml-1" style={{ color: c.textSecondary }}>streak!</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                  <h3 className="text-xs font-medium mb-3" style={{ color: c.textSecondary }}>Win Rate</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: c.textSecondary }}>{currentUser.display_name}</span>
                      <span className="text-base font-bold" style={{ color: winPct.me >= winPct.them ? theme.green : theme.red }}>{winPct.me}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: c.textSecondary }}>{selectedOpponent.display_name}</span>
                      <span className="text-base font-bold" style={{ color: winPct.them > winPct.me ? theme.green : theme.red }}>{winPct.them}%</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                  <h3 className="text-xs font-medium mb-3" style={{ color: c.textSecondary }}>Best Streak</h3>
                  <div className="text-center">
                    <div className="text-base" style={{ color: theme.green }}>★</div>
                    <div className="text-sm font-bold" style={{ color: theme.green }}>
                      {bestStreaks.me >= bestStreaks.them ? currentUser.display_name : selectedOpponent.display_name}
                    </div>
                    <div className="text-base font-bold" style={{ color: c.text }}>{Math.max(bestStreaks.me, bestStreaks.them)}</div>
                  </div>
                </div>
                <div className="rounded-2xl shadow-sm p-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                  <h3 className="text-xs font-medium mb-3" style={{ color: c.textSecondary }}>Last 5</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: c.textSecondary }}>{currentUser.display_name}</span>
                      <span className="text-base font-bold" style={{ color: recentForm.me >= recentForm.them ? theme.green : theme.red }}>{recentForm.me}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: c.textSecondary }}>{selectedOpponent.display_name}</span>
                      <span className="text-base font-bold" style={{ color: recentForm.them > recentForm.me ? theme.green : theme.red }}>{recentForm.them}</span>
                    </div>
                  </div>
                </div>
              </div>

              {monthlyBreakdown.length > 1 && <div className="mb-6"><MonthlyChart data={monthlyBreakdown} /></div>}
            </>
          )}

          {/* Game History */}
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: c.text }}>Game History ({h2hGames.length})</h2>
            {h2hGames.length === 0 ? (
              <div className="text-center py-8" style={{ color: c.textMuted }}>Your game history will appear here.</div>
            ) : (
              <div className="space-y-2">
                {h2hGames.map((game) => (
                  <div key={game.id} className="p-3 rounded-xl transition-all duration-500"
                    style={{ backgroundColor: justAdded === game.id ? theme.greenBg : c.rowBg, transform: justAdded === game.id ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm w-14" style={{ color: c.textMuted }}>
                        {new Date(game.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        <span className="text-sm font-medium" style={{ color: game.winner_id === currentUser.id ? c.text : c.textMuted }}>{currentUser.display_name}</span>
                        <span className="text-xs font-bold px-2 py-1 rounded"
                          style={{ backgroundColor: game.winner_id === currentUser.id ? theme.greenBg : theme.redBg, color: game.winner_id === currentUser.id ? theme.green : theme.red }}>
                          {game.winner_id === currentUser.id ? 'W' : 'L'}
                        </span>
                        <span style={{ color: c.textMuted }}>–</span>
                        <span className="text-xs font-bold px-2 py-1 rounded"
                          style={{ backgroundColor: game.winner_id === selectedOpponent.id ? theme.greenBg : theme.redBg, color: game.winner_id === selectedOpponent.id ? theme.green : theme.red }}>
                          {game.winner_id === selectedOpponent.id ? 'W' : 'L'}
                        </span>
                        <span className="text-sm font-medium" style={{ color: game.winner_id === selectedOpponent.id ? c.text : c.textMuted }}>{selectedOpponent.display_name}</span>
                      </div>
                      <button onClick={() => setDeleteConfirm(game.id)} className="w-8 text-right text-sm opacity-50 hover:opacity-100" style={{ color: c.textMuted }}>✕</button>
                    </div>
                    {game.note && <div className="text-xs mt-1 ml-14 italic" style={{ color: c.textMuted }}>{game.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main App with Tabs
  return (
    <div className="min-h-screen" style={{ backgroundColor: c.bg }}>
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
        {/* Toast */}
        {toast && (
          <div onClick={toast.type === 'undo' ? undoDelete : undefined}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg cursor-pointer font-medium"
            style={{ backgroundColor: toast.type === 'success' ? theme.green : toast.type === 'error' ? theme.red : c.card, color: toast.type === 'success' || toast.type === 'error' ? '#FFFFFF' : c.text }}>
            {toast.message}
          </div>
        )}

        {/* Achievement popup */}
        {showAchievementPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="p-8 rounded-3xl shadow-2xl text-center" style={{ backgroundColor: c.card }}>
              <div className="text-5xl mb-3">{showAchievementPopup.icon}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: theme.green }}>{showAchievementPopup.name}</div>
              <div style={{ color: c.textSecondary }}>{showAchievementPopup.description}</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: c.text }}>Novuss</h1>
            <p style={{ color: c.textSecondary }}>
              Welcome, <span style={{ color: theme.green, fontWeight: 600 }}>{currentUser.display_name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem('novuss-dark-mode', JSON.stringify(!darkMode)); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: c.rowBg, color: c.textSecondary }}>
              {darkMode ? '☀' : '☾'}
            </button>
            <button onClick={handleLogout} className="px-3 h-10 rounded-xl flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: c.rowBg, color: c.textSecondary }}>
              Logout
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'matchups' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: c.text }}>Your Matchups</h2>
            {opponents.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                <p style={{ color: c.textMuted }}>No other players yet</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {opponents.map(opponent => {
                  const stats = getH2HStats(opponent.id);
                  const isWinning = stats.myWins > stats.theirWins;
                  const isLosing = stats.myWins < stats.theirWins;
                  
                  return (
                    <button
                      key={opponent.id}
                      onClick={() => setSelectedOpponent(opponent)}
                      className="w-full p-4 rounded-2xl text-left transition-transform active:scale-[0.98]"
                      style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                            style={{ backgroundColor: c.rowBg, color: c.text }}>
                            {opponent.display_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: c.text }}>{opponent.display_name}</div>
                            {stats.lastGame ? (
                              <div className="text-xs" style={{ color: c.textMuted }}>
                                Last played: {new Date(stats.lastGame.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </div>
                            ) : (
                              <div className="text-xs" style={{ color: c.textMuted }}>No games yet</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {stats.total > 0 ? (
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <span className="text-xl font-bold" style={{ color: isWinning ? theme.green : isLosing ? theme.red : c.text }}>{stats.myWins}</span>
                                <span style={{ color: c.textMuted }}>-</span>
                                <span className="text-xl font-bold" style={{ color: isLosing ? theme.green : isWinning ? theme.red : c.text }}>{stats.theirWins}</span>
                              </div>
                              <div className="text-xs" style={{ color: c.textMuted }}>{stats.total} games</div>
                            </div>
                          ) : (
                            <div className="text-sm px-3 py-1 rounded-lg" style={{ backgroundColor: c.rowBg, color: c.textMuted }}>
                              Start playing
                            </div>
                          )}
                          <span style={{ color: c.textMuted }}>→</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: c.text }}>Leaderboard</h2>
              <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: c.rowBg }}>
                {['week', 'month', 'all'].map(period => (
                  <button
                    key={period}
                    onClick={() => setLeaderboardPeriod(period)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={leaderboardPeriod === period ? { backgroundColor: c.card, color: c.text } : { color: c.textMuted }}
                  >
                    {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
              {getLeaderboardData().length === 0 ? (
                <div className="p-8 text-center" style={{ color: c.textMuted }}>
                  No games played {leaderboardPeriod === 'week' ? 'this week' : leaderboardPeriod === 'month' ? 'this month' : 'yet'}
                </div>
              ) : (
                getLeaderboardData().map((entry, index) => {
                  const isCurrentUser = entry.player.id === currentUser.id;
                  const medalColors = [theme.gold, theme.silver, theme.bronze];
                  const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : null;
                  
                  return (
                    <div
                      key={entry.player.id}
                      className="flex items-center gap-4 p-4"
                      style={{
                        backgroundColor: isCurrentUser ? theme.greenBg : 'transparent',
                        borderBottom: index < getLeaderboardData().length - 1 ? `1px solid ${c.border}` : 'none'
                      }}
                    >
                      <div className="w-8 text-center">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-sm font-medium" style={{ color: c.textMuted }}>{index + 1}</span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: c.rowBg, color: isCurrentUser ? theme.green : c.text }}>
                        {entry.player.display_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold" style={{ color: isCurrentUser ? theme.green : c.text }}>
                          {entry.player.display_name}
                          {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                        </div>
                        <div className="text-xs" style={{ color: c.textMuted }}>
                          {entry.games} games • {entry.games > 0 ? Math.round((entry.wins / entry.games) * 100) : 0}% win rate
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color: index === 0 ? theme.green : c.text }}>{entry.wins}</div>
                        <div className="text-xs" style={{ color: c.textMuted }}>wins</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: c.text }}>Achievements</h2>
              <div className="text-sm" style={{ color: c.textSecondary }}>
                {achievements.length} / {ACHIEVEMENTS.length} unlocked
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {ACHIEVEMENTS.map(achievement => {
                const unlockedAchievement = achievements.find(a => a.achievement_key === achievement.key);
                const isUnlocked = !!unlockedAchievement;
                
                return (
                  <div
                    key={achievement.key}
                    className="p-4 rounded-2xl transition-all"
                    style={{
                      backgroundColor: isUnlocked ? c.card : c.rowBg,
                      border: `1px solid ${isUnlocked ? theme.green : c.border}`,
                      opacity: isUnlocked ? 1 : 0.6
                    }}
                  >
                    <div className="text-3xl mb-2" style={{ filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                      {achievement.icon}
                    </div>
                    <div className="font-semibold text-sm mb-1" style={{ color: isUnlocked ? c.text : c.textMuted }}>
                      {achievement.name}
                    </div>
                    <div className="text-xs" style={{ color: c.textMuted }}>
                      {achievement.description}
                    </div>
                    {isUnlocked && (
                      <div className="text-xs mt-2" style={{ color: theme.green }}>
                        ✓ {new Date(unlockedAchievement.unlocked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t" style={{ backgroundColor: c.card, borderColor: c.border }}>
        <div className="max-w-2xl mx-auto flex">
          {[
            { id: 'matchups', label: 'Matchups', icon: '⚔️' },
            { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
            { id: 'achievements', label: 'Achievements', icon: '🎖️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 flex flex-col items-center gap-1 transition-colors"
              style={{ color: activeTab === tab.id ? theme.green : c.textMuted }}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
