/**
 * engine.js – Question Engine for EstudiA
 * Handles: typo tolerance, question pool building, shuffle, adaptive ordering
 */
const Engine = (() => {

  // ─── Levenshtein distance for typo tolerance ───────────────────────────
  function levenshtein(a, b) {
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => j === 0 ? i : 0));
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  // ─── Check text answer with typo tolerance ─────────────────────────────
  function checkTextAnswer(userAnswer, correctAnswer, acceptedAnswers = [], toleranceEnabled = true) {
    const ua = userAnswer.toLowerCase().trim();
    const ca = correctAnswer.toLowerCase().trim();
    const allAccepted = [ca, ...acceptedAnswers.map(a => a.toLowerCase().trim())];

    // Exact match check
    if (allAccepted.includes(ua)) return { correct: true, typo: false };

    if (!toleranceEnabled) return { correct: false, typo: false };

    // Typo tolerance: allow 1-2 char errors depending on word length
    for (const accepted of allAccepted) {
      const dist = levenshtein(ua, accepted);
      const threshold = accepted.length <= 4 ? 1 : accepted.length <= 8 ? 2 : 3;
      if (dist <= threshold && dist > 0) {
        return { correct: true, typo: true, expected: accepted };
      }
    }
    return { correct: false, typo: false };
  }

  // ─── Fisher-Yates shuffle ──────────────────────────────────────────────
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── Build question pool from data ────────────────────────────────────
  function buildPool(data, options = {}) {
    const { difficulty, subjectKey, mode } = options;
    let pool = [];

    const subjects = subjectKey ? [subjectKey] : Object.keys(data).filter(k => k !== 'meta' && k !== 'guias_repaso');

    subjects.forEach(subj => {
      const subject = data[subj];
      if (!subject || !subject.unidades) return;
      subject.unidades.forEach(unit => {
        unit.preguntas.forEach(q => {
          const item = { ...q, _subject: subj, _subjectName: subject.nombre, _subjectIcon: subject.icono, _subjectColor: subject.color };
          pool.push(item);
        });
      });
    });

    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      pool = pool.filter(q => q.dificultad === difficulty);
    }

    return pool;
  }

  // ─── Adaptive ordering: prioritize wrong answers and unseen ───────────
  function adaptiveOrder(pool, history, wrongQueue) {
    const wrongSet = new Set(wrongQueue);

    // Score each question (lower = higher priority)
    const scored = pool.map(q => {
      const qh = history[q.id] || { attempts: 0, wrongCount: 0, correct: false };
      let score = 0;
      if (wrongSet.has(q.id)) score -= 100; // wrong answers first
      if (qh.attempts === 0) score -= 50;   // unseen next
      score += qh.wrongCount * 10;           // more wrong = higher priority
      if (qh.correct && qh.attempts > 2) score += 100; // well-known = lower priority
      score += Math.random() * 20;          // some randomness
      return { q, score };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored.map(s => s.q);
  }

  // ─── Build review pool (only wrong answers) ────────────────────────────
  function buildReviewPool(data, wrongQueue) {
    if (!wrongQueue.length) return [];
    const allPool = buildPool(data, {});
    return shuffle(allPool.filter(q => wrongQueue.includes(q.id)));
  }

  // ─── Get session questions (10-15 questions) ──────────────────────────
  function getSessionQuestions(data, options, history, wrongQueue) {
    const { mode, difficulty, subjectKey } = options;
    const SESSION_SIZE = 12;
    let pool;

    if (mode === 'repaso') {
      pool = buildReviewPool(data, wrongQueue);
    } else if (mode === 'adaptive') {
      pool = adaptiveOrder(buildPool(data, { subjectKey }), history, wrongQueue);
    } else {
      pool = shuffle(buildPool(data, { difficulty, subjectKey }));
    }

    // Limit pool to session size, but always include variety
    let session = pool.slice(0, SESSION_SIZE);
    // If not enough questions, repeat some
    if (session.length === 0) session = shuffle(buildPool(data, {})).slice(0, SESSION_SIZE);
    return session;
  }

  // ─── Shuffle options (for single/multiple choice) ────────────────────
  function shuffleOptions(question) {
    if (question.tipo === 'seleccion_unica') {
      const original = [...question.opciones];
      const correct = original[question.respuesta_correcta];
      const shuffled = shuffle(original);
      const newCorrectIdx = shuffled.indexOf(correct);
      return { ...question, opciones: shuffled, respuesta_correcta: newCorrectIdx, _originalOpciones: original };
    }
    if (question.tipo === 'seleccion_multiple') {
      const original = [...question.opciones];
      const correctValues = question.respuestas_correctas.map(i => original[i]);
      const shuffled = shuffle(original);
      const newCorrect = correctValues.map(v => shuffled.indexOf(v));
      return { ...question, opciones: shuffled, respuestas_correctas: newCorrect };
    }
    if (question.tipo === 'unir_correspondiente') {
      const left = shuffle([...question.pares_correctos.map(p => p.izquierda)]);
      const right = shuffle([...question.pares_correctos.map(p => p.derecha)]);
      return { ...question, _leftItems: left, _rightItems: right };
    }
    if (question.tipo === 'armar_oracion') {
      return { ...question, palabras: shuffle([...question.palabras]) };
    }
    return question;
  }

  return { checkTextAnswer, shuffle, buildPool, adaptiveOrder, buildReviewPool, getSessionQuestions, shuffleOptions, levenshtein };
})();
