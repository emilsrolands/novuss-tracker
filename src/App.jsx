import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const INVITE_CODE = 'novuss2025';

// Existing user credentials (for backwards compatibility)
const USER_CREDENTIALS = {
  emils: { password: 'emils123', playerId: '11111111-1111-1111-1111-111111111111' },
  peteris: { password: 'peteris123', playerId: '22222222-2222-2222-2222-222222222222' },
  emilssarmulis: { password: 'riskemils123', playerId: '33333333-3333-3333-3333-333333333333' },
};

// Achievements with target values for progress tracking
const ACHIEVEMENTS = [
  { key: 'first_blood', name: 'First Blood', description: 'Win your first game', icon: '🎯', category: 'Wins', target: 1, type: 'wins' },
  { key: 'getting_warmed_up', name: 'Getting Warmed Up', description: 'Win 5 games', icon: '🔥', category: 'Wins', target: 5, type: 'wins' },
  { key: 'double_digits', name: 'Double Digits', description: 'Win 10 games', icon: '🔟', category: 'Wins', target: 10, type: 'wins' },
  { key: 'quarter_century', name: 'Quarter Century', description: 'Win 25 games', icon: '🏅', category: 'Wins', target: 25, type: 'wins' },
  { key: 'half_century', name: 'Half Century', description: 'Win 50 games', icon: '⭐', category: 'Wins', target: 50, type: 'wins' },
  { key: 'centurion', name: 'Centurion', description: 'Win 100 games', icon: '💯', category: 'Wins', target: 100, type: 'wins' },
  { key: 'legend', name: 'Legend', description: 'Win 250 games', icon: '👑', category: 'Wins', target: 250, type: 'wins' },
  { key: 'hat_trick', name: 'Hat Trick', description: 'Win 3 games in a row', icon: '🎩', category: 'Streaks', target: 3, type: 'streak' },
  { key: 'on_fire', name: 'On Fire', description: 'Win 5 games in a row', icon: '🔥', category: 'Streaks', target: 5, type: 'streak' },
  { key: 'unstoppable', name: 'Unstoppable', description: 'Win 7 games in a row', icon: '💪', category: 'Streaks', target: 7, type: 'streak' },
  { key: 'dominant', name: 'Dominant', description: 'Win 10 games in a row', icon: '🦁', category: 'Streaks', target: 10, type: 'streak' },
  { key: 'comeback_kid', name: 'Comeback Kid', description: 'Win after 3+ losses', icon: '🔄', category: 'Comebacks', target: 1, type: 'special' },
  { key: 'redemption_arc', name: 'Redemption Arc', description: 'Win after 5+ losses', icon: '🌅', category: 'Comebacks', target: 1, type: 'special' },
  { key: 'rival', name: 'Rival', description: 'Play 10 games vs same opponent', icon: '🤝', category: 'Rivalries', target: 10, type: 'rivalry' },
  { key: 'nemesis', name: 'Nemesis', description: 'Play 25 games vs same opponent', icon: '⚔️', category: 'Rivalries', target: 25, type: 'rivalry' },
  { key: 'arch_enemy', name: 'Arch Enemy', description: 'Play 50 games vs same opponent', icon: '🏆', category: 'Rivalries', target: 50, type: 'rivalry' },
  { key: 'dedicated', name: 'Dedicated', description: 'Play on 7 different days', icon: '📅', category: 'Activity', target: 7, type: 'days' },
  { key: 'regular', name: 'Regular', description: 'Play on 30 different days', icon: '📆', category: 'Activity', target: 30, type: 'days' },
  { key: 'veteran', name: 'Veteran', description: 'Play on 100 different days', icon: '🎖️', category: 'Activity', target: 100, type: 'days' },
  { key: 'clean_sweep', name: 'Clean Sweep', description: 'Win a game 8-0', icon: '🧹', category: 'Domination', target: 1, type: 'special' },
  { key: 'nail_biter', name: 'Nail Biter', description: 'Win a game by just 1 puck', icon: '😅', category: 'Domination', target: 1, type: 'special' },
  { key: 'perfect_week', name: 'Perfect Week', description: 'Win every game in a week (min 3)', icon: '✨', category: 'Activity', target: 1, type: 'special' },
  { key: 'popular', name: 'Popular', description: 'Play against 3 different opponents', icon: '👥', category: 'Social', target: 3, type: 'opponents' },
  { key: 'social_butterfly', name: 'Social Butterfly', description: 'Play against 5 opponents', icon: '🦋', category: 'Social', target: 5, type: 'opponents' },
  { key: 'the_challenger', name: 'The Challenger', description: 'Play against 10 opponents', icon: '🌟', category: 'Social', target: 10, type: 'opponents' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ password: '', confirmPassword: '', firstName: '', lastName: '', inviteCode: '' });
  const [authError, setAuthError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState('matchups');
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [games, setGames] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [justAdded, setJustAdded] = useState(null);
  const [showAchievementPopup, setShowAchievementPopup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [selectedMargin, setSelectedMargin] = useState(null);
  const [showMoreMargins, setShowMoreMargins] = useState(false);
  const [marginChartPeriod, setMarginChartPeriod] = useState('all');
  const [scorePeriod, setScorePeriod] = useState('all');
  
  const toastTimeout = useRef(null);

  // Load initial data
  useEffect(() => {
    loadPlayers();
    loadGames();
    
    // Check for remembered user
    const savedUser = localStorage.getItem('novuss_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('novuss_user');
      }
    }
    setLoading(false);
  }, []);

  // Load achievements when user logs in
  useEffect(() => {
    if (currentUser) {
      loadAchievements();
    }
  }, [currentUser]);

  const loadPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('display_name');
    
    if (error) {
      console.error('Error loading players:', error);
      return;
    }
    setPlayers(data || []);
  };

  // Helper to get first name from display_name (e.g., "Emils B." -> "Emils")
  const getFirstName = (player) => {
    if (!player) return '';
    return player.display_name.split(' ')[0];
  };

  const loadGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading games:', error);
      return;
    }
    setGames(data || []);
  };

  const loadAchievements = async () => {
    if (!currentUser) return;
    
    const { data, error } = await supabase
      .from('player_achievements')
      .select('*')
      .eq('player_id', currentUser.id);
    
    if (error) {
      console.error('Error loading achievements:', error);
      return;
    }
    setAchievements(data || []);
  };

  const generateDisplayName = (firstName, lastName) => {
    if (!lastName) return firstName; // If no last name provided
    const baseName = `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
    // Check for collision
    const existing = players.filter(p => p.display_name === baseName);
    if (existing.length === 0) return baseName;
    // Try with more letters
    for (let i = 2; i <= lastName.length; i++) {
      const altName = `${firstName} ${lastName.substring(0, i)}.`;
      if (!players.find(p => p.display_name === altName)) return altName;
    }
    // Fallback with number
    return `${baseName}${existing.length + 1}`;
  };

  const handleLogin = async () => {
    // Check if this is an existing user with hardcoded credentials
    const creds = USER_CREDENTIALS[loginForm.username.toLowerCase()];
    if (creds) {
      if (creds.password === loginForm.password) {
        const player = players.find(p => p.id === creds.playerId);
        if (player) {
          setCurrentUser(player);
          setAuthError('');
          if (rememberMe) {
            localStorage.setItem('novuss_user', JSON.stringify(player));
          }
        } else {
          setAuthError('Player not found in database');
        }
      } else {
        setAuthError('Invalid password');
      }
      return;
    }
    
    // For new users, check by username (they would have registered)
    const player = players.find(p => p.username.toLowerCase() === loginForm.username.toLowerCase());
    if (player) {
      // TODO: In future, verify password against stored hash
      setCurrentUser(player);
      setAuthError('');
      if (rememberMe) {
        localStorage.setItem('novuss_user', JSON.stringify(player));
      }
    } else {
      setAuthError('Invalid username or password');
    }
  };

  const handleRegister = async () => {
    if (!registerForm.firstName.trim() || !registerForm.lastName.trim()) {
      setAuthError('First and last name are required');
      return;
    }
    if (registerForm.password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    if (registerForm.inviteCode !== INVITE_CODE) {
      setAuthError('Invalid invite code. Ask a friend for one!');
      return;
    }
    
    const newDisplayName = generateDisplayName(registerForm.firstName.trim(), registerForm.lastName.trim());

    // Insert new player into Supabase
    const { data, error } = await supabase
      .from('players')
      .insert([{
        username: registerForm.firstName.trim().toLowerCase(),
        display_name: newDisplayName,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      setAuthError('Failed to create account. Please try again.');
      return;
    }

    setPlayers([...players, data]);
    setCurrentUser(data);
    setAuthError('');
    showToast('Account created!', 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedOpponent(null);
    setActiveTab('matchups');
    setSelectedWinner(null);
    setSelectedMargin(null);
    localStorage.removeItem('novuss_user');
  };

  const showToast = (message, type = 'info', duration = 3000) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), duration);
  };

  const handleWinnerSelect = (winnerId) => {
    setSelectedWinner(winnerId);
    setSelectedMargin(null);
  };

  const handleMarginSelect = (margin) => {
    setSelectedMargin(margin);
  };

  const logGame = async () => {
    if (!currentUser || !selectedOpponent || !selectedWinner) return;
    
    const now = new Date();
    const newGame = {
      date: now.toISOString().split('T')[0],
      player1_id: currentUser.id,
      player2_id: selectedOpponent.id,
      winner_id: selectedWinner,
      winner: selectedWinner === currentUser.id ? 'p1' : 'p2',
      margin: selectedMargin,
      note: note.trim() || null
    };
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('games')
      .insert([newGame])
      .select()
      .single();

    if (error) {
      console.error('Error logging game:', error);
      showToast('Failed to log game', 'error');
      return;
    }

    setGames([data, ...games]);
    setNote('');
    setShowNoteInput(false);
    setJustAdded(data.id);
    setSelectedWinner(null);
    setSelectedMargin(null);
    setShowMoreMargins(false);
    setTimeout(() => setJustAdded(null), 1500);
    
    const winnerName = selectedWinner === currentUser.id ? currentUser.display_name : selectedOpponent.display_name;
    const marginText = selectedMargin ? ` (+${selectedMargin})` : '';
    showToast(`${winnerName} wins${marginText}!`, 'success');
  };

  const deleteGame = async (id) => {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting game:', error);
      showToast('Failed to delete game', 'error');
      return;
    }

    setGames(games.filter(g => g.id !== id));
    setDeleteConfirm(null);
    showToast('Game deleted', 'success');
  };

  // Calculate current streak for a player
  const getPlayerStreak = (playerId, gamesList = games) => {
    const playerGames = gamesList
      .filter(g => g.player1_id === playerId || g.player2_id === playerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (playerGames.length === 0) return 0;
    
    let streak = 0;
    const isWinning = playerGames[0].winner_id === playerId;
    
    for (const game of playerGames) {
      if ((game.winner_id === playerId) === isWinning) {
        streak++;
      } else {
        break;
      }
    }
    
    return isWinning ? streak : -streak;
  };

  // Calculate best streak vs opponent for BOTH players
  const getBestStreakVsOpponent = (opponentId) => {
    if (!currentUser) return { myBest: 0, myBestDate: null, theirBest: 0, theirBestDate: null, myCurrent: 0, theirCurrent: 0 };
    
    const h2hGames = games
      .filter(g => 
        (g.player1_id === currentUser.id && g.player2_id === opponentId) ||
        (g.player2_id === currentUser.id && g.player1_id === opponentId)
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    let myBest = 0, myBestDate = null;
    let theirBest = 0, theirBestDate = null;
    let myStreak = 0, theirStreak = 0;
    
    for (const game of h2hGames) {
      if (game.winner_id === currentUser.id) {
        myStreak++;
        theirStreak = 0;
        if (myStreak > myBest) {
          myBest = myStreak;
          myBestDate = game.date;
        }
      } else {
        theirStreak++;
        myStreak = 0;
        if (theirStreak > theirBest) {
          theirBest = theirStreak;
          theirBestDate = game.date;
        }
      }
    }
    
    // Get current streaks (from most recent games)
    let myCurrent = 0, theirCurrent = 0;
    const reversed = [...h2hGames].reverse();
    for (const game of reversed) {
      if (game.winner_id === currentUser.id) {
        if (theirCurrent > 0) break;
        myCurrent++;
      } else {
        if (myCurrent > 0) break;
        theirCurrent++;
      }
    }
    
    return { myBest, myBestDate, theirBest, theirBestDate, myCurrent, theirCurrent };
  };

  const getH2HGames = (opponentId) => {
    if (!currentUser) return [];
    return games.filter(g =>
      (g.player1_id === currentUser.id && g.player2_id === opponentId) ||
      (g.player2_id === currentUser.id && g.player1_id === opponentId)
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const getH2HStats = (opponentId) => {
    const h2hGames = getH2HGames(opponentId);
    const myWins = h2hGames.filter(g => g.winner_id === currentUser?.id).length;
    const theirWins = h2hGames.length - myWins;
    const lastGame = h2hGames[0];
    const winRate = h2hGames.length > 0 ? Math.round((myWins / h2hGames.length) * 100) : 0;
    
    let myNetPoints = 0;
    let theirNetPoints = 0;
    h2hGames.forEach(g => {
      if (g.margin) {
        if (g.winner_id === currentUser?.id) {
          myNetPoints += g.margin;
          theirNetPoints -= g.margin;
        } else {
          theirNetPoints += g.margin;
          myNetPoints -= g.margin;
        }
      }
    });
    
    const myWinsWithMargin = h2hGames.filter(g => g.winner_id === currentUser?.id && g.margin);
    const theirWinsWithMargin = h2hGames.filter(g => g.winner_id !== currentUser?.id && g.margin);
    const myAvgMargin = myWinsWithMargin.length > 0 
      ? (myWinsWithMargin.reduce((sum, g) => sum + g.margin, 0) / myWinsWithMargin.length).toFixed(1)
      : null;
    const theirAvgMargin = theirWinsWithMargin.length > 0 
      ? (theirWinsWithMargin.reduce((sum, g) => sum + g.margin, 0) / theirWinsWithMargin.length).toFixed(1)
      : null;
    
    return { myWins, theirWins, total: h2hGames.length, lastGame, myNetPoints, theirNetPoints, myAvgMargin, theirAvgMargin, winRate };
  };

  // Calculate achievement progress
  const getAchievementProgress = (achievement) => {
    if (!currentUser) return { current: 0, target: achievement.target, percent: 0 };
    
    const userGames = games.filter(g => g.player1_id === currentUser.id || g.player2_id === currentUser.id);
    const userWins = userGames.filter(g => g.winner_id === currentUser.id);
    
    let current = 0;
    
    switch (achievement.type) {
      case 'wins':
        current = userWins.length;
        break;
      case 'streak':
        // Calculate best streak ever
        let bestStreak = 0;
        let tempStreak = 0;
        const sortedGames = [...userGames].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        for (const game of sortedGames) {
          if (game.winner_id === currentUser.id) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }
        current = bestStreak;
        break;
      case 'days':
        const uniqueDays = new Set(userGames.map(g => g.date));
        current = uniqueDays.size;
        break;
      case 'opponents':
        const opponents = new Set();
        userGames.forEach(g => {
          if (g.player1_id === currentUser.id) opponents.add(g.player2_id);
          else opponents.add(g.player1_id);
        });
        current = opponents.size;
        break;
      case 'rivalry':
        // Max games vs any single opponent
        const opponentCounts = {};
        userGames.forEach(g => {
          const oppId = g.player1_id === currentUser.id ? g.player2_id : g.player1_id;
          opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
        });
        current = Math.max(0, ...Object.values(opponentCounts));
        break;
      default:
        current = 0;
    }
    
    const percent = Math.min(100, Math.round((current / achievement.target) * 100));
    return { current, target: achievement.target, percent };
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
    players.forEach(p => { playerStats[p.id] = { player: p, wins: 0, games: 0, netPoints: 0 }; });
    
    filteredGames.forEach(g => {
      if (playerStats[g.player1_id]) playerStats[g.player1_id].games++;
      if (playerStats[g.player2_id]) playerStats[g.player2_id].games++;
      if (g.margin) {
        if (playerStats[g.winner_id]) playerStats[g.winner_id].netPoints += g.margin;
        const loserId = g.winner_id === g.player1_id ? g.player2_id : g.player1_id;
        if (playerStats[loserId]) playerStats[loserId].netPoints -= g.margin;
      }
      if (playerStats[g.winner_id]) playerStats[g.winner_id].wins++;
    });
    
    // Calculate streaks and win rates
    Object.values(playerStats).forEach(stat => {
      stat.winRate = stat.games > 0 ? Math.round((stat.wins / stat.games) * 100) : 0;
      stat.streak = getPlayerStreak(stat.player.id, filteredGames);
    });
    
    return Object.values(playerStats).filter(s => s.games > 0).sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  };

  const theme = {
    light: { bg: '#F8F9FA', card: '#FFFFFF', text: '#1A1A2E', textSecondary: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB', rowBg: '#F3F4F6', buttonBg: '#1A1A2E', buttonText: '#FFFFFF', inputBg: '#FFFFFF' },
    dark: { bg: '#111113', card: '#1C1C1E', text: '#F5F5F7', textSecondary: '#A1A1A6', textMuted: '#6E6E73', border: '#2C2C2E', rowBg: '#242426', buttonBg: '#F5F5F7', buttonText: '#111113', inputBg: '#242426' },
    green: '#22C55E', greenBg: darkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)',
    greenBgStrong: darkMode ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.18)',
    red: '#EF4444', redBg: darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
    gold: '#F59E0B', silver: '#9CA3AF', bronze: '#CD7F32',
  };
  const c = darkMode ? theme.dark : theme.light;

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: c.bg }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: c.text }}>Novuss</h1>
          <p style={{ color: c.textMuted }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: c.bg }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-2" style={{ color: c.text }}>Novuss</h1>
            <p style={{ color: c.textSecondary }}>Track your games</p>
          </div>
          
          <div className="flex mb-4 p-1 rounded-xl" style={{ backgroundColor: c.rowBg }}>
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={authMode === 'login' ? { backgroundColor: c.card, color: c.text } : { color: c.textMuted }}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={authMode === 'register' ? { backgroundColor: c.card, color: c.text } : { color: c.textMuted }}
            >
              Register
            </button>
          </div>

          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            {authMode === 'login' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: c.textSecondary }}>First Name</label>
                  <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full p-3 rounded-xl outline-none"
                    style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Enter your first name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: c.textSecondary }}>Password</label>
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full p-3 rounded-xl outline-none"
                    style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Enter password" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded" />
                  <label htmlFor="remember" className="text-sm" style={{ color: c.textSecondary }}>Remember me</label>
                </div>
                {authError && <div className="text-sm text-center py-2 px-3 rounded-lg" style={{ backgroundColor: theme.redBg, color: theme.red }}>{authError}</div>}
                <button onClick={handleLogin} className="w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: c.buttonBg, color: c.buttonText }}>Sign In</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: c.textSecondary }}>First Name</label>
                    <input type="text" value={registerForm.firstName} onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      className="w-full p-3 rounded-xl outline-none" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Jānis" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: c.textSecondary }}>Last Name</label>
                    <input type="text" value={registerForm.lastName} onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      className="w-full p-3 rounded-xl outline-none" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Bērziņš" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: c.textSecondary }}>Password</label>
                  <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full p-3 rounded-xl outline-none" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Min 6 characters" />
                  <p className="text-xs mt-1" style={{ color: c.textMuted }}>Minimum 6 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: c.textSecondary }}>Confirm Password</label>
                  <input type="password" value={registerForm.confirmPassword} onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="w-full p-3 rounded-xl outline-none" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Re-enter password" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: c.textSecondary }}>Invite Code</label>
                  <input type="text" value={registerForm.inviteCode} onChange={(e) => setRegisterForm({ ...registerForm, inviteCode: e.target.value })}
                    className="w-full p-3 rounded-xl outline-none" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} placeholder="Ask a friend for a code" />
                </div>
                {registerForm.firstName && registerForm.lastName && (
                  <div className="text-sm text-center py-2 px-3 rounded-lg" style={{ backgroundColor: theme.greenBg, color: theme.green }}>
                    Display name: {generateDisplayName(registerForm.firstName, registerForm.lastName)}
                  </div>
                )}
                {authError && <div className="text-sm text-center py-2 px-3 rounded-lg" style={{ backgroundColor: theme.redBg, color: theme.red }}>{authError}</div>}
                <button onClick={handleRegister} className="w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: c.buttonBg, color: c.buttonText }}>Create Account</button>
              </div>
            )}
          </div>
          
          <button onClick={() => setDarkMode(!darkMode)} className="mx-auto mt-4 block p-2 rounded-lg" style={{ color: c.textMuted }}>
            {darkMode ? '☀ Light mode' : '☾ Dark mode'}
          </button>
        </div>
      </div>
    );
  }

  const opponents = players.filter(p => p.id !== currentUser.id);

  // H2H Detail Page
  if (selectedOpponent) {
    const h2hGames = getH2HGames(selectedOpponent.id);
    const stats = getH2HStats(selectedOpponent.id);
    const streakData = getBestStreakVsOpponent(selectedOpponent.id);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Check if any games have margin data for chart
    const hasMarginData = h2hGames.some(g => g.margin !== null);

    // Margin Trend Chart Component
    const MarginTrendChart = () => {
      const [hoveredPoint, setHoveredPoint] = useState(null);
      
      let filteredGames = [...h2hGames];
      
      if (marginChartPeriod === 'week') {
        filteredGames = h2hGames.filter(g => g.date >= weekStartStr);
      } else if (marginChartPeriod === 'month') {
        filteredGames = h2hGames.filter(g => g.date >= monthStartStr);
      }
      
      // Check if filtered games have margin data
      const filteredHasMargin = filteredGames.some(g => g.margin !== null);
      
      if (filteredGames.length === 0) {
        return <div className="text-center py-6 text-sm" style={{ color: c.textMuted }}>No games in this period</div>;
      }
      
      if (!filteredHasMargin) {
        return (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm" style={{ color: c.textMuted }}>Log games with puck counts to see trends</div>
          </div>
        );
      }
      
      const sortedGames = [...filteredGames].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      const aggregateGames = () => {
        const buckets = {};
        
        sortedGames.forEach(g => {
          let bucketKey;
          let bucketLabel;
          
          if (marginChartPeriod === 'week') {
            bucketKey = g.date;
            bucketLabel = new Date(g.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          } else if (marginChartPeriod === 'month') {
            const d = new Date(g.date);
            const startOfYear = new Date(d.getFullYear(), 0, 1);
            const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
            bucketKey = `${d.getFullYear()}-W${weekNum}`;
            const dayOfWeek = d.getDay() || 7;
            const monday = new Date(d);
            monday.setDate(d.getDate() - dayOfWeek + 1);
            bucketLabel = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
          } else {
            const d = new Date(g.date);
            bucketKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            bucketLabel = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          }
          
          if (!buckets[bucketKey]) {
            buckets[bucketKey] = { key: bucketKey, label: bucketLabel, games: [], totalMargin: 0 };
          }
          
          const marginChange = g.margin ? (g.winner_id === currentUser.id ? g.margin : -g.margin) : 0;
          buckets[bucketKey].games.push(g);
          buckets[bucketKey].totalMargin += marginChange;
        });
        
        return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
      };
      
      const aggregatedData = aggregateGames();
      
      // Calculate CUMULATIVE running average - each point shows avg of all games UP TO that point
      let cumulativeGames = 0;
      let cumulativeMargin = 0;
      
      const dataPoints = aggregatedData.map((bucket, idx) => {
        cumulativeGames += bucket.games.length;
        cumulativeMargin += bucket.totalMargin;
        const runningAvg = cumulativeGames > 0 ? cumulativeMargin / cumulativeGames : 0;
        return {
          ...bucket,
          avgMargin: Math.round(runningAvg * 10) / 10,
          totalGames: cumulativeGames,
          idx
        };
      });
      
      const chartHeight = 150;
      const chartWidth = 300;
      const padding = { top: 25, bottom: 30, left: 28, right: 15 };
      const innerWidth = chartWidth - padding.left - padding.right;
      const innerHeight = chartHeight - padding.top - padding.bottom;
      
      const maxY = 8;
      const minY = -8;
      const yScale = (val) => padding.top + innerHeight / 2 - (val / maxY) * (innerHeight / 2);
      const xScale = (i) => padding.left + (i / Math.max(1, dataPoints.length - 1)) * innerWidth;
      
      if (dataPoints.length === 1) {
        const d = dataPoints[0];
        const x = padding.left + innerWidth / 2;
        const y = yScale(Math.max(minY, Math.min(maxY, d.avgMargin)));
        
        return (
          <div className="relative">
            <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible"
              onMouseLeave={() => setHoveredPoint(null)} onTouchEnd={() => setHoveredPoint(null)}>
              <text x={padding.left - 6} y={yScale(8)} textAnchor="end" alignmentBaseline="middle" fontSize="9" fill={c.textMuted}>+8</text>
              <text x={padding.left - 6} y={yScale(0)} textAnchor="end" alignmentBaseline="middle" fontSize="9" fill={c.textMuted}>0</text>
              <text x={padding.left - 6} y={yScale(-8)} textAnchor="end" alignmentBaseline="middle" fontSize="9" fill={c.textMuted}>-8</text>
              <line x1={padding.left} y1={yScale(8)} x2={chartWidth - padding.right} y2={yScale(8)} stroke={c.border} strokeWidth="0.5" opacity="0.5" />
              <line x1={padding.left} y1={yScale(0)} x2={chartWidth - padding.right} y2={yScale(0)} stroke={c.textMuted} strokeWidth="1" strokeDasharray="4,3" />
              <line x1={padding.left} y1={yScale(-8)} x2={chartWidth - padding.right} y2={yScale(-8)} stroke={c.border} strokeWidth="0.5" opacity="0.5" />
              <circle cx={x} cy={y} r={hoveredPoint === 0 ? 6 : 4} fill={d.avgMargin >= 0 ? theme.green : theme.red} stroke={hoveredPoint === 0 ? c.card : 'none'} strokeWidth={2} />
              <circle cx={x} cy={y} r={20} fill="transparent" onMouseEnter={() => setHoveredPoint(0)} onTouchStart={() => setHoveredPoint(0)} style={{ cursor: 'pointer' }} />
              <text x={x} y={chartHeight - 8} textAnchor="middle" fontSize="9" fill={c.textMuted}>{d.label}</text>
            </svg>
            {hoveredPoint === 0 && (
              <div className="absolute px-3 py-2 rounded-xl shadow-lg pointer-events-none"
                style={{ backgroundColor: c.card, border: `1px solid ${c.border}`, left: '50%', top: `${(y / chartHeight) * 100 - 12}%`, transform: 'translate(-50%, -100%)', zIndex: 10 }}>
                <div className="text-xs font-medium" style={{ color: c.text }}>{d.label}</div>
                <div className="text-sm font-bold" style={{ color: d.avgMargin >= 0 ? theme.green : theme.red }}>{d.avgMargin >= 0 ? '+' : ''}{d.avgMargin.toFixed(1)}</div>
              </div>
            )}
          </div>
        );
      }
      
      const catmullRomSpline = (points, tension = 0.5) => {
        if (points.length < 2) return '';
        if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
          const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
          const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
          const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
      };
      
      const curvePoints = dataPoints.map((d, i) => ({ x: xScale(i), y: yScale(Math.max(minY, Math.min(maxY, d.avgMargin))) }));
      const linePath = catmullRomSpline(curvePoints, 1);
      const zeroY = yScale(0);
      const areaPath = `${linePath} L ${curvePoints[curvePoints.length - 1].x} ${zeroY} L ${curvePoints[0].x} ${zeroY} Z`;
      
      const getDateLabels = () => {
        if (dataPoints.length <= 4) return dataPoints;
        return [dataPoints[0], dataPoints[Math.floor(dataPoints.length / 2)], dataPoints[dataPoints.length - 1]];
      };
      
      const dateLabels = getDateLabels();
      const isHovering = hoveredPoint !== null;
      
      return (
        <div className="relative">
          <div className="text-xs text-center mb-2" style={{ color: c.textMuted }}>Cumulative avg. margin over time</div>
          <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible"
            onMouseLeave={() => setHoveredPoint(null)} onTouchEnd={() => setHoveredPoint(null)}>
            <defs>
              <clipPath id="clipAboveZero"><rect x={padding.left} y={0} width={innerWidth} height={zeroY} /></clipPath>
              <clipPath id="clipBelowZero"><rect x={padding.left} y={zeroY} width={innerWidth} height={chartHeight - zeroY} /></clipPath>
              <linearGradient id="greenFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={theme.green} stopOpacity="0.35" />
                <stop offset="100%" stopColor={theme.green} stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="redFill" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={theme.red} stopOpacity="0.35" />
                <stop offset="100%" stopColor={theme.red} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <text x={padding.left - 6} y={yScale(8)} textAnchor="end" alignmentBaseline="middle" fontSize="9" fill={c.textMuted}>+8</text>
            <text x={padding.left - 6} y={yScale(0)} textAnchor="end" alignmentBaseline="middle" fontSize="9" fill={c.textMuted}>0</text>
            <text x={padding.left - 6} y={yScale(-8)} textAnchor="end" alignmentBaseline="middle" fontSize="9" fill={c.textMuted}>-8</text>
            <line x1={padding.left} y1={yScale(8)} x2={chartWidth - padding.right} y2={yScale(8)} stroke={c.border} strokeWidth="0.5" opacity="0.5" />
            <line x1={padding.left} y1={yScale(0)} x2={chartWidth - padding.right} y2={yScale(0)} stroke={c.textMuted} strokeWidth="1" strokeDasharray="4,3" />
            <line x1={padding.left} y1={yScale(-8)} x2={chartWidth - padding.right} y2={yScale(-8)} stroke={c.border} strokeWidth="0.5" opacity="0.5" />
            <g style={{ opacity: isHovering ? 0.4 : 1, transition: 'opacity 0.15s ease' }}>
              <g clipPath="url(#clipAboveZero)"><path d={areaPath} fill="url(#greenFill)" /></g>
              <g clipPath="url(#clipBelowZero)"><path d={areaPath} fill="url(#redFill)" /></g>
              <g clipPath="url(#clipAboveZero)"><path d={linePath} fill="none" stroke={theme.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
              <g clipPath="url(#clipBelowZero)"><path d={linePath} fill="none" stroke={theme.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
              {dataPoints.map((d, i) => {
                if (hoveredPoint === i) return null;
                return <circle key={i} cx={xScale(i)} cy={yScale(Math.max(minY, Math.min(maxY, d.avgMargin)))} r={3} fill={d.avgMargin >= 0 ? theme.green : theme.red} />;
              })}
            </g>
            {hoveredPoint !== null && dataPoints[hoveredPoint] && (() => {
              const d = dataPoints[hoveredPoint];
              return <circle cx={xScale(hoveredPoint)} cy={yScale(Math.max(minY, Math.min(maxY, d.avgMargin)))} r={5} fill={d.avgMargin >= 0 ? theme.green : theme.red} stroke={c.card} strokeWidth={2} />;
            })()}
            {dataPoints.map((d, i) => (
              <circle key={`hit-${i}`} cx={xScale(i)} cy={yScale(Math.max(minY, Math.min(maxY, d.avgMargin)))} r={20} fill="transparent"
                onMouseEnter={() => setHoveredPoint(i)} onTouchStart={() => setHoveredPoint(i)} style={{ cursor: 'pointer' }} />
            ))}
            {dateLabels.map((d) => (
              <text key={d.idx} x={xScale(d.idx)} y={chartHeight - 8} textAnchor="middle" fontSize="9" fill={c.textMuted}>{d.label}</text>
            ))}
          </svg>
          {hoveredPoint !== null && dataPoints[hoveredPoint] && (
            <div className="absolute px-3 py-2 rounded-xl shadow-lg pointer-events-none"
              style={{ backgroundColor: c.card, border: `1px solid ${c.border}`, left: `${(xScale(hoveredPoint) / chartWidth) * 100}%`,
                top: `${(yScale(Math.max(minY, Math.min(maxY, dataPoints[hoveredPoint].avgMargin))) / chartHeight) * 100 - 12}%`,
                transform: 'translate(-50%, -100%)', zIndex: 10 }}>
              <div className="text-xs font-medium" style={{ color: c.text }}>{dataPoints[hoveredPoint].label}</div>
              <div className="text-sm font-bold" style={{ color: dataPoints[hoveredPoint].avgMargin >= 0 ? theme.green : theme.red }}>
                {dataPoints[hoveredPoint].avgMargin >= 0 ? '+' : ''}{dataPoints[hoveredPoint].avgMargin.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="min-h-screen p-4" style={{ backgroundColor: c.bg }}>
        <div className="max-w-lg mx-auto">
          {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg font-medium" style={{ backgroundColor: toast.type === 'success' ? theme.green : theme.red, color: '#FFFFFF' }}>{toast.message}</div>}
          
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
          
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setSelectedOpponent(null); setSelectedWinner(null); setSelectedMargin(null); }} className="p-2 rounded-xl" style={{ backgroundColor: c.rowBg }}><span style={{ color: c.text }}>←</span></button>
            <div className="flex-1">
              <h1 className="text-xl font-bold" style={{ color: c.text }}>vs {selectedOpponent.display_name}</h1>
              <p className="text-sm" style={{ color: c.textSecondary }}>Head-to-head</p>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.rowBg, color: c.textSecondary }}>{darkMode ? '☀' : '☾'}</button>
          </div>

          {/* Score Block - unified with period toggle */}
          <div className="rounded-2xl shadow-sm p-5 mb-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium" style={{ color: c.textSecondary }}>Score</h2>
              <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: c.rowBg }}>
                {[{ key: 'today', label: 'Today' }, { key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'all', label: 'All' }].map(p => (
                  <button key={p.key} onClick={() => setScorePeriod(p.key)}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={scorePeriod === p.key ? { backgroundColor: c.card, color: c.text } : { color: c.textMuted }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            
            {(() => {
              // Filter games by period
              const todayStr = now.toISOString().split('T')[0];
              let periodGames = h2hGames;
              
              if (scorePeriod === 'today') {
                periodGames = h2hGames.filter(g => g.date === todayStr);
              } else if (scorePeriod === 'week') {
                periodGames = h2hGames.filter(g => g.date >= weekStartStr);
              } else if (scorePeriod === 'month') {
                periodGames = h2hGames.filter(g => g.date >= monthStartStr);
              }
              
              const myWins = periodGames.filter(g => g.winner_id === currentUser.id).length;
              const theirWins = periodGames.length - myWins;
              const total = periodGames.length;
              const winRate = total > 0 ? Math.round((myWins / total) * 100) : 0;
              
              if (total === 0) {
                const periodLabel = scorePeriod === 'today' ? 'today' : scorePeriod === 'week' ? 'this week' : scorePeriod === 'month' ? 'this month' : '';
                return (
                  <div className="text-center py-6" style={{ color: c.textMuted }}>
                    No games {periodLabel}
                  </div>
                );
              }
              
              return (
                <>
                  {/* Current streak badge */}
                  {(streakData.myCurrent >= 3 || streakData.theirCurrent >= 3) && (
                    <div className="mb-4 text-center">
                      <span className="text-xs px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1" 
                        style={{ backgroundColor: streakData.myCurrent >= 3 ? theme.greenBg : c.rowBg, color: streakData.myCurrent >= 3 ? theme.green : c.textSecondary }}>
                        🔥 {streakData.myCurrent >= 3 ? `You have a ${streakData.myCurrent} win streak` : `${getFirstName(selectedOpponent)} has a ${streakData.theirCurrent} win streak`}
                      </span>
                    </div>
                  )}
                  
                  {/* Score display */}
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: c.text }}>{myWins}</div>
                      <div className="text-sm mt-1" style={{ color: c.textSecondary }}>You</div>
                    </div>
                    <div className="text-2xl font-light" style={{ color: c.textMuted }}>:</div>
                    <div className="text-center">
                      <div className="text-4xl font-bold" style={{ color: c.text }}>{theirWins}</div>
                      <div className="text-sm mt-1" style={{ color: c.textSecondary }}>{getFirstName(selectedOpponent)}</div>
                    </div>
                  </div>
                  
                  {/* Win rate bar */}
                  <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: c.rowBg }}>
                    <div className="h-full transition-all" style={{ width: `${winRate}%`, backgroundColor: theme.green }} />
                    <div className="h-full transition-all" style={{ width: `${100 - winRate}%`, backgroundColor: theme.red }} />
                  </div>
                  
                  {/* Win rate text */}
                  <div className="text-center mt-3">
                    <span className="text-sm font-medium" style={{ color: winRate >= 50 ? theme.green : theme.red }}>{winRate}% win rate</span>
                    <span className="text-sm" style={{ color: c.textMuted }}> · {total} game{total !== 1 ? 's' : ''}</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Add Game */}
          <div className="rounded-2xl shadow-sm p-5 mb-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: c.text }}>Log Game</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => handleWinnerSelect(currentUser.id)} className="py-3 font-semibold rounded-xl transition-all"
                style={selectedWinner === currentUser.id ? { backgroundColor: theme.green, color: '#FFFFFF' } : { backgroundColor: c.rowBg, color: c.text }}>
                {getFirstName(currentUser)} won
              </button>
              <button onClick={() => handleWinnerSelect(selectedOpponent.id)} className="py-3 font-semibold rounded-xl transition-all"
                style={selectedWinner === selectedOpponent.id ? { backgroundColor: theme.green, color: '#FFFFFF' } : { backgroundColor: c.rowBg, color: c.text }}>
                {getFirstName(selectedOpponent)} won
              </button>
            </div>

            {selectedWinner && (
              <>
                <div className="mb-3">
                  <p className="text-sm mb-2" style={{ color: c.textSecondary }}>Pucks remaining (optional)</p>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <button key={num} onClick={() => handleMarginSelect(selectedMargin === num ? null : num)}
                        className="flex-1 py-2 rounded-lg font-medium text-sm transition-all"
                        style={selectedMargin === num ? { backgroundColor: theme.green, color: '#FFFFFF' } : { backgroundColor: c.rowBg, color: c.text }}>
                        {num}
                      </button>
                    ))}
                    {!showMoreMargins && (
                      <button onClick={() => setShowMoreMargins(true)} className="px-2 py-2 rounded-lg text-sm" style={{ backgroundColor: c.rowBg, color: c.textMuted }}>+</button>
                    )}
                  </div>
                  {showMoreMargins && (
                    <div className="flex gap-1 mt-1">
                      {[9, 10, 11, 12].map(num => (
                        <button key={num} onClick={() => handleMarginSelect(selectedMargin === num ? null : num)}
                          className="py-2 px-3 rounded-lg font-medium text-sm transition-all"
                          style={selectedMargin === num ? { backgroundColor: theme.green, color: '#FFFFFF' } : { backgroundColor: c.rowBg, color: c.text }}>
                          {num}
                        </button>
                      ))}
                      <button onClick={() => setShowMoreMargins(false)} className="py-2 px-3 rounded-lg text-sm" style={{ color: c.textMuted }}>Less</button>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <button onClick={() => setShowNoteInput(!showNoteInput)} className="text-sm" style={{ color: c.textSecondary }}>+ {showNoteInput ? 'Hide' : 'Add'} note</button>
                  {showNoteInput && (
                    <input type="text" placeholder="e.g., Tournament game..." value={note} onChange={(e) => setNote(e.target.value)}
                      className="w-full mt-2 p-3 rounded-xl outline-none" style={{ backgroundColor: c.inputBg, color: c.text, border: `1px solid ${c.border}` }} />
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setSelectedWinner(null); setSelectedMargin(null); setShowNoteInput(false); setNote(''); setShowMoreMargins(false); }}
                    className="px-4 py-3 rounded-xl text-sm" style={{ color: c.textMuted }}>
                    Cancel
                  </button>
                  <button onClick={logGame} className="flex-1 py-3 rounded-xl font-semibold transition-transform active:scale-95"
                    style={{ backgroundColor: c.buttonBg, color: c.buttonText }}>
                    Log Game {selectedMargin ? `(+${selectedMargin})` : ''}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Best Streak Record */}
          {(streakData.myBest > 0 || streakData.theirBest > 0) && (
            <div className="rounded-2xl shadow-sm p-4 mb-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: c.textSecondary }}>Best Win Streak</h3>
              <div className="flex items-center justify-between">
                {(() => {
                  const iHaveRecord = streakData.myBest >= streakData.theirBest;
                  const recordHolder = iHaveRecord ? currentUser : selectedOpponent;
                  const recordStreak = iHaveRecord ? streakData.myBest : streakData.theirBest;
                  const recordDate = iHaveRecord ? streakData.myBestDate : streakData.theirBestDate;
                  const isMe = iHaveRecord;
                  
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" 
                          style={{ backgroundColor: isMe ? theme.greenBg : c.rowBg, color: isMe ? theme.green : c.text }}>
                          {getFirstName(recordHolder).charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: c.text }}>
                            {getFirstName(recordHolder)} {isMe && <span className="text-xs" style={{ color: theme.green }}>(You)</span>}
                          </div>
                          {recordDate && (
                            <div className="text-xs" style={{ color: c.textMuted }}>
                              {new Date(recordDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl font-bold flex items-center gap-1" style={{ color: isMe ? theme.green : c.text }}>
                        🔥 {recordStreak}
                      </div>
                    </>
                  );
                })()}
              </div>
              {/* Show runner up if both have streaks */}
              {streakData.myBest > 0 && streakData.theirBest > 0 && streakData.myBest !== streakData.theirBest && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
                  <div className="text-xs" style={{ color: c.textMuted }}>
                    {streakData.myBest > streakData.theirBest ? getFirstName(selectedOpponent) : 'Your'} best: {streakData.myBest > streakData.theirBest ? streakData.theirBest : streakData.myBest} wins
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Margin Trend Chart */}
          {stats.total > 0 && (
            <div className="rounded-2xl shadow-sm p-4 mb-4" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium" style={{ color: c.textSecondary }}>Margin Trend</h3>
                <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: c.rowBg }}>
                  {[{ key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'all', label: 'All' }].map(p => (
                    <button key={p.key} onClick={() => setMarginChartPeriod(p.key)}
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={marginChartPeriod === p.key ? { backgroundColor: c.card, color: c.text } : { color: c.textMuted }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <MarginTrendChart />
            </div>
          )}

          {/* Game History */}
          <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: c.text }}>History ({h2hGames.length})</h2>
            {h2hGames.length === 0 ? <div className="text-center py-6" style={{ color: c.textMuted }}>No games yet</div> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {h2hGames.slice(0, 15).map((game) => {
                  const iWon = game.winner_id === currentUser.id;
                  const margin = game.margin;
                  return (
                    <div key={game.id} className="p-3 rounded-xl transition-all" style={{ backgroundColor: justAdded === game.id ? theme.greenBg : c.rowBg, transform: justAdded === game.id ? 'scale(1.02)' : 'scale(1)' }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm w-16" style={{ color: c.textMuted }}>{new Date(game.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                        <div className="flex items-center gap-2 flex-1 justify-center">
                          <span className="text-sm" style={{ color: iWon ? c.text : c.textMuted }}>{getFirstName(currentUser)}</span>
                          <span className="text-xs font-bold px-2 py-1 rounded min-w-[40px] text-center" style={{ backgroundColor: iWon ? theme.greenBg : theme.redBg, color: iWon ? theme.green : theme.red }}>
                            {iWon ? '+' : '−'}{margin || 0}
                          </span>
                          <span style={{ color: c.textMuted }}>:</span>
                          <span className="text-xs font-bold px-2 py-1 rounded min-w-[40px] text-center" style={{ backgroundColor: !iWon ? theme.greenBg : theme.redBg, color: !iWon ? theme.green : theme.red }}>
                            {!iWon ? '+' : '−'}{margin || 0}
                          </span>
                          <span className="text-sm" style={{ color: !iWon ? c.text : c.textMuted }}>{getFirstName(selectedOpponent)}</span>
                        </div>
                        <button onClick={() => setDeleteConfirm(game.id)} className="text-sm opacity-50 hover:opacity-100 w-8 text-right" style={{ color: c.textMuted }}>✕</button>
                      </div>
                    </div>
                  );
                })}
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
      <div className="max-w-lg mx-auto p-4 pb-28">
        {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg font-medium" style={{ backgroundColor: theme.green, color: '#FFFFFF' }}>{toast.message}</div>}
        {showAchievementPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="p-8 rounded-3xl shadow-2xl text-center" style={{ backgroundColor: c.card }}>
              <div className="text-5xl mb-3">{showAchievementPopup.icon}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: theme.green }}>{showAchievementPopup.name}</div>
              <div style={{ color: c.textSecondary }}>{showAchievementPopup.description}</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: c.text }}>Novuss</h1>
            <p style={{ color: c.textSecondary }}>Welcome, <span style={{ color: theme.green, fontWeight: 600 }}>{getFirstName(currentUser)}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.rowBg, color: c.textSecondary }}>{darkMode ? '☀' : '☾'}</button>
            <button onClick={handleLogout} className="px-3 h-10 rounded-xl text-sm font-medium" style={{ backgroundColor: c.rowBg, color: c.textSecondary }}>Logout</button>
          </div>
        </div>

        {/* Matchups Tab */}
        {activeTab === 'matchups' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: c.text }}>Your Matchups</h2>
            {opponents.map(opponent => {
              const stats = getH2HStats(opponent.id);
              const streakData = getBestStreakVsOpponent(opponent.id);
              return (
                <button key={opponent.id} onClick={() => setSelectedOpponent(opponent)} className="w-full p-4 rounded-2xl text-left active:scale-[0.98] transition-transform" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: c.rowBg, color: c.text }}>{getFirstName(opponent).charAt(0)}</div>
                      <div>
                        <div className="font-semibold flex items-center gap-2" style={{ color: c.text }}>
                          {opponent.display_name}
                          {streakData.myCurrent >= 3 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: theme.greenBg, color: theme.green }}>🔥{streakData.myCurrent}</span>
                          )}
                        </div>
                        {stats.lastGame ? <div className="text-xs" style={{ color: c.textMuted }}>Last: {new Date(stats.lastGame.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div> : <div className="text-xs" style={{ color: c.textMuted }}>No games yet</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {stats.total > 0 ? (
                        <div className="text-right">
                          <div className="flex items-center justify-end">
                            <span className="text-xl font-bold w-6 text-right" style={{ color: c.text }}>{stats.myWins}</span>
                            <span className="w-4 text-center" style={{ color: c.textMuted }}>-</span>
                            <span className="text-xl font-bold w-6 text-left" style={{ color: c.text }}>{stats.theirWins}</span>
                          </div>
                          <div className="text-xs" style={{ color: c.textMuted }}>{stats.winRate}% win rate</div>
                        </div>
                      ) : <div className="text-sm px-3 py-1 rounded-lg" style={{ backgroundColor: c.rowBg, color: c.textMuted }}>Challenge</div>}
                      <span style={{ color: c.textMuted }}>→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: c.text }}>Leaderboard</h2>
              <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: c.rowBg }}>
                {['week', 'month', 'all'].map(period => (
                  <button key={period} onClick={() => setLeaderboardPeriod(period)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={leaderboardPeriod === period ? { backgroundColor: c.card, color: c.text } : { color: c.textMuted }}>
                    {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}>
              {getLeaderboardData().length === 0 ? <div className="p-8 text-center" style={{ color: c.textMuted }}>No games yet</div> : (
                getLeaderboardData().map((entry, index) => {
                  const isCurrentUser = entry.player.id === currentUser.id;
                  const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : null;
                  return (
                    <div key={entry.player.id} className="flex items-center gap-4 p-4" style={{ backgroundColor: isCurrentUser ? theme.greenBg : 'transparent', borderBottom: index < getLeaderboardData().length - 1 ? `1px solid ${c.border}` : 'none' }}>
                      <div className="w-8 text-center">{medal ? <span className="text-xl">{medal}</span> : <span className="text-sm font-medium" style={{ color: c.textMuted }}>{index + 1}</span>}</div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: c.rowBg, color: isCurrentUser ? theme.green : c.text }}>{getFirstName(entry.player).charAt(0)}</div>
                      <div className="flex-1">
                        <div className="font-semibold" style={{ color: isCurrentUser ? theme.green : c.text }}>{entry.player.display_name}{isCurrentUser && <span className="ml-2 text-xs">(You)</span>}</div>
                        <div className="text-xs" style={{ color: c.textMuted }}>{entry.games} games · {entry.winRate}% win rate</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {entry.streak >= 3 && (
                          <div className="text-sm font-medium" style={{ color: theme.green }}>
                            🔥{entry.streak}
                          </div>
                        )}
                        <div>
                          <div className="text-2xl font-bold" style={{ color: index === 0 ? theme.green : c.text }}>{entry.wins}</div>
                          <div className="text-xs" style={{ color: c.textMuted }}>wins</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: c.text }}>Achievements</h2>
              <div className="text-sm" style={{ color: c.textSecondary }}>
                {ACHIEVEMENTS.filter(a => {
                  const unlocked = achievements.find(u => u.achievement_key === a.key);
                  const progress = getAchievementProgress(a);
                  return !!unlocked || progress.current >= progress.target;
                }).length} / {ACHIEVEMENTS.length}
              </div>
            </div>
            
            {/* Group by category */}
            {['Wins', 'Streaks', 'Comebacks', 'Rivalries', 'Activity', 'Domination', 'Social'].map(category => {
              const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category);
              if (categoryAchievements.length === 0) return null;
              
              return (
                <div key={category}>
                  <h3 className="text-sm font-medium mb-2 mt-4" style={{ color: c.textMuted }}>{category}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryAchievements.map(achievement => {
                      const unlockedAchievement = achievements.find(a => a.achievement_key === achievement.key);
                      const progress = getAchievementProgress(achievement);
                      // Consider unlocked if in database OR if progress meets target
                      const isUnlocked = !!unlockedAchievement || progress.current >= progress.target;
                      
                      return (
                        <div key={achievement.key} className="p-4 rounded-2xl" style={{ backgroundColor: isUnlocked ? c.card : c.rowBg, border: `1px solid ${isUnlocked ? theme.green : c.border}`, opacity: isUnlocked ? 1 : 0.8 }}>
                          <div className="text-2xl mb-2" style={{ filter: isUnlocked ? 'none' : 'grayscale(0.5)' }}>{achievement.icon}</div>
                          <div className="font-semibold text-sm mb-1" style={{ color: isUnlocked ? c.text : c.textMuted }}>{achievement.name}</div>
                          <div className="text-xs mb-2" style={{ color: c.textMuted }}>{achievement.description}</div>
                          
                          {isUnlocked ? (
                            <div className="text-xs" style={{ color: theme.green }}>
                              ✓ {unlockedAchievement 
                                ? new Date(unlockedAchievement.unlocked_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Unlocked'}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span style={{ color: c.textMuted }}>{progress.current}/{progress.target}</span>
                                <span style={{ color: c.textMuted }}>{progress.percent}%</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent}%`, backgroundColor: theme.green }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t" style={{ backgroundColor: c.card, borderColor: c.border }}>
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'matchups', label: 'Matchups', icon: '⚔️', disabled: false },
            { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', disabled: false },
            { id: 'achievements', label: 'Achievements', icon: '🎖️', disabled: false },
            { id: 'stats', label: 'Your Stats', icon: '📊', disabled: true, comingSoon: true }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => !tab.disabled && setActiveTab(tab.id)} 
              className="flex-1 py-3 flex flex-col items-center gap-1 relative"
              style={{ 
                color: tab.disabled ? c.textMuted : (activeTab === tab.id ? theme.green : c.textMuted),
                opacity: tab.disabled ? 0.5 : 1,
                cursor: tab.disabled ? 'not-allowed' : 'pointer'
              }}
              disabled={tab.disabled}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.comingSoon && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: theme.green, color: '#FFFFFF' }}>
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
