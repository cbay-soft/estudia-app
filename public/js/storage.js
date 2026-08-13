/**
 * storage.js – localStorage manager for EstudiA
 * Handles all persistent state: progress, wrong answers, streaks, stats
 */
const Storage = (() => {
  const KEY = 'estudia_v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || defaultState();
    } catch { return defaultState(); }
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Storage error', e); }
  }

  function defaultState() {
    return {
      currentLevel: null,
      totalCorrect: 0,
      totalWrong: 0,
      totalPoints: 0,
      streak: 0,
      maxStreak: 0,
      // Map: questionId -> { correct: bool, attempts: number, lastSeen: timestamp }
      questionHistory: {},
      // Array of question IDs answered wrong (for review mode)
      wrongQueue: [],
      // Per-subject stats: { correct, wrong, points }
      subjectStats: {},
      // Sessions played
      sessions: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function recordAnswer(qId, correct, points, subject) {
    const state = load();
    const now = Date.now();

    // Update question history
    if (!state.questionHistory[qId]) {
      state.questionHistory[qId] = { correct: false, attempts: 0, lastSeen: 0, wrongCount: 0 };
    }
    const qh = state.questionHistory[qId];
    qh.attempts++;
    qh.lastSeen = now;
    qh.correct = correct;
    if (!correct) qh.wrongCount = (qh.wrongCount || 0) + 1;

    // Update wrong queue
    if (!correct) {
      if (!state.wrongQueue.includes(qId)) {
        state.wrongQueue.push(qId);
      }
    } else {
      // Remove from wrong queue if answered correctly
      const idx = state.wrongQueue.indexOf(qId);
      if (idx > -1) state.wrongQueue.splice(idx, 1);
    }

    // Update totals
    if (correct) {
      state.totalCorrect++;
      state.totalPoints += points;
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    } else {
      state.totalWrong++;
      state.streak = 0;
    }

    // Subject stats
    if (!state.subjectStats[subject]) {
      state.subjectStats[subject] = { correct: 0, wrong: 0, points: 0 };
    }
    if (correct) {
      state.subjectStats[subject].correct++;
      state.subjectStats[subject].points += points;
    } else {
      state.subjectStats[subject].wrong++;
    }

    state.updatedAt = now;
    save(state);
    return state;
  }

  function getSubjectMastery(subject, totalQuestionsInSubject) {
    const state = load();
    const stats = state.subjectStats[subject] || { correct: 0, wrong: 0 };
    const answered = stats.correct + stats.wrong;
    if (answered === 0) return 0;
    const accuracy = stats.correct / answered;
    const coverage = Math.min(answered / (totalQuestionsInSubject * 2), 1);
    return Math.round(accuracy * coverage * 100);
  }

  function getOverallMastery(allSubjects) {
    const state = load();
    let totalAnswered = 0, totalCorrect = 0;
    allSubjects.forEach(s => {
      const stats = state.subjectStats[s] || { correct: 0, wrong: 0 };
      totalAnswered += stats.correct + stats.wrong;
      totalCorrect += stats.correct;
    });
    if (totalAnswered === 0) return 0;
    return Math.round((totalCorrect / totalAnswered) * 100);
  }

  function getWrongQueue() { return load().wrongQueue || []; }
  function getAll() { return load(); }
  function setLevel(level) { const s = load(); s.currentLevel = level; save(s); }
  function getLevel() { return load().currentLevel; }
  function incrementSessions() { const s = load(); s.sessions++; s.updatedAt = Date.now(); save(s); }

  function reset() {
    save(defaultState());
  }

  return { recordAnswer, getSubjectMastery, getOverallMastery, getWrongQueue, getAll, setLevel, getLevel, incrementSessions, reset, load };
})();
