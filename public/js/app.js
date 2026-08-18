/**
 * app.js – Main Application Controller for EstudiA
 * Handles: navigation, quiz flow, stats, UI rendering
 */
const App = (() => {
  // ─── STATE ────────────────────────────────────────────────────────────
  let DATA = null;
  let state = {
    screen: 'loading',
    currentLevel: null,
    quiz: {
      questions: [],
      current: 0,
      correct: 0,
      wrong: 0,
      points: 0,
      mode: null,
      subject: null,
      answered: false
    }
  };

  const LEVELS = [
    { id: '4to_egb', label: '4to EGB', emoji: '🌱', desc: 'Subnivel Elemental · 9-10 años', available: true, file: '4to_egb.json' },
    { id: '5to_egb', label: '5to EGB', emoji: '🌿', desc: 'Subnivel Elemental · 10-11 años', available: false, file: null },
    { id: '6to_egb', label: '6to EGB', emoji: '🌳', desc: 'Subnivel Medio · 11-12 años', available: false, file: null },
    { id: '7mo_egb', label: '7mo EGB', emoji: '⚡', desc: 'Subnivel Medio · 12-13 años', available: false, file: null },
    { id: 'bachillerato', label: 'Bachillerato', emoji: '🎓', desc: 'Ingreso BGU · 14-15 años', available: false, file: null },
    { id: 'sercop', label: 'Sercop', emoji: '🎓', desc: 'Servicio de Compras Públicas', available: true, file: 'sercop.json' }
  ];

  // ─── INIT ─────────────────────────────────────────────────────────────
  async function init() {
    // Bind all header button events first
    bindEvents();
    // Simulate loading progress
    await sleep(2800);

    const savedLevel = Storage.getLevel();
    if (savedLevel) {
      await loadLevel(savedLevel);
    } else {
      showScreen('welcome-screen');
      renderLevelCards();
    }
  }

  async function loadLevel(levelId) {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level || !level.available) {
      showScreen('welcome-screen');
      renderLevelCards();
      return;
    }

    try {
      const res = await fetch(`/data/${level.file}`);
      DATA = await res.json();
      state.currentLevel = level;
      Storage.setLevel(levelId);
      showScreen('home-screen');
      renderHome();
    } catch (e) {
      console.error('Error loading data:', e);
      showToast('❌ Error cargando datos. Intenta de nuevo.');
      showScreen('welcome-screen');
      renderLevelCards();
    }
  }

  // ─── LEVEL CARDS ──────────────────────────────────────────────────────
  function renderLevelCards() {
    const container = document.getElementById('level-cards');
    container.innerHTML = LEVELS.map(l => `
      <button class="level-card ${!l.available ? 'disabled' : ''}" 
              onclick="${l.available ? `App.selectLevel('${l.id}')` : ''}"
              ${!l.available ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ''}>
        <span class="lc-emoji">${l.emoji}</span>
        <div class="lc-info">
          <span class="lc-title">${l.label}</span>
          <span class="lc-sub">${l.desc}</span>
        </div>
        ${l.available ? '<span class="lc-badge">Disponible</span>' : '<span class="lc-soon">Próximamente</span>'}
      </button>
    `).join('');
  }

  async function selectLevel(levelId) {
    showToast('⏳ Cargando nivel...');
    await loadLevel(levelId);
  }

  // ─── HOME ─────────────────────────────────────────────────────────────
  function renderHome() {
    if (!DATA) return;
    const subjects = getSubjects();

    // Progress
    const overallPct = Storage.getOverallMastery(subjects.map(s => s.key));
    document.getElementById('overall-percent').textContent = `${overallPct}%`;
    const circle = document.getElementById('overall-progress-circle');
    const circumference = 251.2;
    circle.style.strokeDashoffset = circumference - (circumference * overallPct / 100);

    // Greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? '¡Buenos días!' : hour < 18 ? '¡Buenas tardes!' : '¡Buenas noches!';
    document.getElementById('greeting-text').textContent = greet;
    document.getElementById('level-badge-text').textContent = state.currentLevel?.label || '4to EGB';

    // Stats
    const s = Storage.getAll();
    document.getElementById('stat-correct').textContent = s.totalCorrect;
    document.getElementById('stat-wrong').textContent = s.totalWrong;
    const streakEl = document.getElementById('stat-streak');
    streakEl.textContent = s.streak;
    if (s.streak >= 5) streakEl.parentElement.querySelector('.stat-icon').classList.add('streak-glow');

    // Review badge
    const wrongCount = Storage.getWrongQueue().length;
    document.getElementById('review-badge').textContent = wrongCount;
    document.getElementById('mode-review').style.opacity = wrongCount > 0 ? '1' : '.5';

    // Subject grid
    renderSubjectGrid(subjects);
  }

  function getSubjects() {
    if (!DATA) return [];
    return Object.entries(DATA)
      .filter(([k]) => k !== 'meta' && k !== 'guias_repaso')
      .map(([key, val]) => ({
        key, nombre: val.nombre, icono: val.icono, color: val.color,
        totalQ: val.unidades?.reduce((acc, u) => acc + u.preguntas.length, 0) || 0
      }));
  }

  function renderSubjectGrid(subjects) {
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = subjects.map(s => {
      const mastery = Storage.getSubjectMastery(s.key, s.totalQ);
      return `
        <div class="subject-card subject-${s.key}" style="--subject-color:${s.color}" 
             onclick="App.openSubjectModal('${s.key}')">
          <span class="subject-emoji">${s.icono}</span>
          <span class="subject-name">${s.nombre}</span>
          <div class="subject-progress-bar-wrap">
            <div class="subject-progress-bar" style="width:${mastery}%; background:${s.color};"></div>
          </div>
          <span class="subject-percent">${mastery}% dominio · ${s.totalQ} preguntas</span>
        </div>
      `;
    }).join('');
  }

  // ─── SUBJECT MODAL ────────────────────────────────────────────────────
  function openSubjectModal(subjectKey) {
    const subject = DATA[subjectKey];
    if (!subject) return;

    document.getElementById('subject-modal-body').innerHTML = `
      <div style="margin-bottom:1rem;">
        <div style="font-size:2rem;margin-bottom:.4rem;">${subject.icono}</div>
        <div style="font-weight:800;font-size:1.1rem;margin-bottom:.25rem;">${subject.nombre}</div>
        <div style="color:var(--text2);font-size:.85rem;">${subject.unidades?.length || 0} unidades · 
          ${subject.unidades?.reduce((a, u) => a + u.preguntas.length, 0) || 0} preguntas</div>
      </div>
      <div class="section-title" style="margin-top:0;">Practicar por dificultad</div>
      <div class="mode-cards">
        ${[
          { d:'facil', icon:'🌱', label:'Fácil' },
          { d:'intermedio', icon:'⚡', label:'Intermedio' },
          { d:'dificil', icon:'🔥', label:'Difícil' },
          { d:'all', icon:'🎲', label:'Todas' }
        ].map(m => `
          <button class="mode-card" onclick="App.startSubjectQuiz('${subjectKey}', '${m.d}')">
            <span class="mode-icon">${m.icon}</span>
            <div class="mode-info">
              <span class="mode-name">${m.label}</span>
            </div>
            <span class="mode-arrow">›</span>
          </button>
        `).join('')}
      </div>
      <div class="section-title">Guía de repaso</div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:1rem;">
        ${(DATA.guias_repaso?.[subjectKey]?.temas_clave || []).map(t => 
          `<div style="font-size:.84rem;color:var(--text2);padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.04);">📌 ${t}</div>`
        ).join('')}
        ${(DATA.guias_repaso?.[subjectKey]?.trucos_memoria || []).map(t => 
          `<div style="font-size:.84rem;color:var(--accent);padding:.3rem 0;">💡 ${t}</div>`
        ).join('')}
      </div>
    `;

    document.getElementById('subject-modal').classList.remove('hidden');
  }

  function closeSubjectModal() {
    document.getElementById('subject-modal').classList.add('hidden');
  }

  function startSubjectQuiz(subjectKey, difficulty) {
    closeSubjectModal();
    startQuiz({ mode: difficulty === 'all' ? 'adaptive' : null, difficulty: difficulty === 'all' ? null : difficulty, subjectKey });
  }

  // ─── QUIZ FLOW ────────────────────────────────────────────────────────
  function startMode(mode) {
    if (mode === 'repaso' && Storage.getWrongQueue().length === 0) {
      showToast('🎉 ¡Sin errores pendientes! Sigue practicando.');
      return;
    }

    const modeMap = {
      'adaptive': { mode: 'adaptive', difficulty: null, subjectKey: null },
      'facil': { mode: null, difficulty: 'facil', subjectKey: null },
      'intermedio': { mode: null, difficulty: 'intermedio', subjectKey: null },
      'dificil': { mode: null, difficulty: 'dificil', subjectKey: null },
      'repaso': { mode: 'repaso', difficulty: null, subjectKey: null }
    };

    startQuiz(modeMap[mode] || modeMap.adaptive);
  }

  function startQuiz(options) {
    if (!DATA) return;

    const st = Storage.getAll();
    const questions = Engine.getSessionQuestions(DATA, options, st.questionHistory, st.wrongQueue);

    if (!questions.length) {
      showToast('No hay preguntas disponibles con ese filtro. Prueba otro modo.');
      return;
    }

    // Shuffle options for each question
    const prepared = questions.map(q => Engine.shuffleOptions(q));

    state.quiz = {
      questions: prepared,
      current: 0,
      correct: 0,
      wrong: 0,
      points: 0,
      mode: options.mode,
      subject: options.subjectKey,
      answered: false,
      wrongInSession: []
    };

    Storage.incrementSessions();

    // Set labels
    const modeLabels = { adaptive: 'Adaptativo', repaso: 'Repaso', null: '' };
    const diffLabels = { facil: 'Fácil', intermedio: 'Intermedio', dificil: 'Difícil' };
    document.getElementById('quiz-mode-label').textContent =
      (options.mode ? modeLabels[options.mode] : '') || diffLabels[options.difficulty] || 'Mixto';

    if (options.subjectKey && DATA[options.subjectKey]) {
      document.getElementById('quiz-subject-label').textContent =
        DATA[options.subjectKey].icono + ' ' + DATA[options.subjectKey].nombre;
    } else {
      document.getElementById('quiz-subject-label').textContent = '📚 Todas las materias';
    }

    showScreen('quiz-screen');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.quiz.questions[state.quiz.current];
    const total = state.quiz.questions.length;
    const current = state.quiz.current + 1;

    // Header progress
    document.getElementById('quiz-current').textContent = current;
    document.getElementById('quiz-total').textContent = total;
    const pct = (current / total) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${pct}%`;

    // Score strip
    document.getElementById('quiz-correct-count').textContent = state.quiz.correct;
    document.getElementById('quiz-wrong-count').textContent = state.quiz.wrong;
    document.getElementById('quiz-points').textContent = state.quiz.points;

    // Hide feedback
    document.getElementById('answer-feedback').classList.add('hidden');
    state.quiz.answered = false;

    // Render question
    const container = document.getElementById('quiz-content');
    Questions.render(q, container);

    // Auto-submit for match & word search is handled in questions.js
  }

  function submitAnswer() {
    if (state.quiz.answered) return;

    const q = state.quiz.questions[state.quiz.current];
    const answer = Questions.getAnswer(q);

    // Validate answer exists
    if (answer === null || answer === undefined || answer === '') {
      showToast('⚠️ Selecciona o escribe una respuesta primero');
      return;
    }
    if (Array.isArray(answer) && answer.length === 0 && q.tipo === 'seleccion_multiple') {
      showToast('⚠️ Elige al menos una opción');
      return;
    }

    state.quiz.answered = true;
    Questions._submitted = true; // cancel pending auto-submit timer

    // Check answer
    const result = Questions.checkAnswer(answer, q);

    // Record in storage
    Storage.recordAnswer(q.id, result.correct, result.points, q._subject);

    // Update session stats
    if (result.correct) {
      state.quiz.correct++;
      state.quiz.points += result.points;
    } else {
      state.quiz.wrong++;
      state.quiz.wrongInSession.push(q.id);
    }

    // Show feedback
    showFeedback(result, q);
  }

  function showFeedback(result, q) {
    const fb = document.getElementById('answer-feedback');
    fb.classList.remove('hidden', 'is-correct', 'is-wrong');

    if (result.correct) {
      fb.classList.add('is-correct');
      document.getElementById('feedback-icon').textContent = '✅';
      document.getElementById('feedback-title').textContent = getCorrectMessage();
      if (result.typo) {
        const spellingEl = document.getElementById('feedback-spelling');
        spellingEl.style.display = 'block';
        spellingEl.textContent = `✏️ ¡Casi perfecto! La ortografía correcta es: "${result.expected}". ¡Fíjate bien la próxima vez!`;
      } else {
        document.getElementById('feedback-spelling').style.display = 'none';
      }
      // Celebrate on streak
      const s = Storage.getAll();
      if (s.streak > 0 && s.streak % 5 === 0) launchConfetti();
    } else {
      fb.classList.add('is-wrong');
      document.getElementById('feedback-icon').textContent = '❌';
      document.getElementById('feedback-title').textContent = getWrongMessage();
      document.getElementById('feedback-spelling').style.display = 'none';
    }

    // Post-answer: show a "See explanation" button (NOT auto-reveal, user chooses)
    const guiaEl = document.getElementById('feedback-guia');
    if (q.guia) {
      guiaEl.innerHTML = `<button onclick="Questions.showHint('${q.guia.replace(/'/g, "&#39;").replace(/"/g, '&quot;')}', false)" 
        style="margin-top:.5rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:var(--text1);padding:.5rem 1rem;border-radius:.5rem;cursor:pointer;font-size:.82rem;width:100%;">
        📖 Ver explicación completa
      </button>`;
    } else {
      guiaEl.innerHTML = '';
    }

    // Update score strip
    document.getElementById('quiz-correct-count').textContent = state.quiz.correct;
    document.getElementById('quiz-wrong-count').textContent = state.quiz.wrong;
    document.getElementById('quiz-points').textContent = state.quiz.points;
  }

  function nextQuestion() {
    state.quiz.current++;
    if (state.quiz.current >= state.quiz.questions.length) {
      showResults();
    } else {
      renderQuestion();
    }
  }

  function exitQuiz() {
    if (confirm('¿Seguro que quieres salir? Perderás el progreso de esta ronda.')) {
      showScreen('home-screen');
      renderHome();
    }
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────
  function showResults() {
    document.getElementById('answer-feedback').classList.add('hidden');
    const q = state.quiz;
    const total = q.questions.length;
    const pct = total > 0 ? Math.round((q.correct / total) * 100) : 0;

    document.getElementById('res-correct').textContent = q.correct;
    document.getElementById('res-wrong').textContent = q.wrong;
    document.getElementById('res-points').textContent = q.points;
    document.getElementById('res-percent').textContent = `${pct}%`;

    // Trophy & title
    let trophy = '🏆', title = '¡Ronda completada!';
    if (pct === 100) { trophy = '🌟'; title = '¡PERFECTO! ¡Increíble!'; }
    else if (pct >= 80) { trophy = '🥇'; title = '¡Excelente trabajo!'; }
    else if (pct >= 60) { trophy = '🥈'; title = '¡Muy bien! Sigue así.'; }
    else if (pct >= 40) { trophy = '🥉'; title = '¡Buen esfuerzo!'; }
    else { trophy = '💪'; title = '¡No te rindas!'; }

    document.getElementById('results-trophy').textContent = trophy;
    document.getElementById('results-title').textContent = title;
    document.getElementById('results-subtitle').textContent =
      `${q.correct} de ${total} preguntas correctas`;

    // Message
    const messages = [
      pct === 100 ? '¡Eres una estrella! Dominas este tema perfectamente. 🌟' : '',
      pct >= 80 ? '¡Vas muy bien! Estás listo para enfrentar el examen. 💪' : '',
      pct >= 60 ? 'Buen camino. Repasa las preguntas que fallaste para mejorar. 📚' : '',
      pct < 60 ? 'No te preocupes, el error es parte del aprendizaje. ¡Repasa y vuelve a intentarlo! 🔄' : ''
    ].filter(Boolean)[0] || '¡Sigue practicando!';

    document.getElementById('results-message').textContent = messages;

    // Show review button if there are wrong answers
    const reviewBtn = document.getElementById('btn-review-errors');
    if (q.wrongInSession && q.wrongInSession.length > 0) {
      reviewBtn.style.display = 'block';
    } else {
      reviewBtn.style.display = 'none';
    }

    showScreen('results-screen');
    if (pct >= 80) launchConfetti();
  }

  function playAgain() {
    const q = state.quiz;
    startQuiz({
      mode: q.mode,
      difficulty: q.mode ? null : (q.questions[0]?.dificultad || null),
      subjectKey: q.subject
    });
  }

  function goHome() {
    showScreen('home-screen');
    renderHome();
  }

  function reviewErrors() {
    startMode('repaso');
  }

  // ─── STATS MODAL ──────────────────────────────────────────────────────
  function openStats() {
    const subjects = getSubjects();
    const s = Storage.getAll();

    document.getElementById('stats-body').innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.7rem;margin-bottom:1rem;">
          <div class="stat-card"><span class="stat-icon">✅</span><div class="stat-info"><span class="stat-value">${s.totalCorrect}</span><span class="stat-label">Correctas</span></div></div>
          <div class="stat-card"><span class="stat-icon">❌</span><div class="stat-info"><span class="stat-value">${s.totalWrong}</span><span class="stat-label">Errores</span></div></div>
          <div class="stat-card"><span class="stat-icon">🔥</span><div class="stat-info"><span class="stat-value">${s.maxStreak}</span><span class="stat-label">Mejor racha</span></div></div>
        </div>
        <div class="stat-card" style="margin-bottom:.5rem;">
          <span class="stat-icon">🏆</span>
          <div class="stat-info"><span class="stat-value">${s.totalPoints}</span><span class="stat-label">Puntos totales</span></div>
        </div>
      </div>
      <div class="section-title" style="margin-top:0;">Por materia</div>
      ${subjects.map(subj => {
        const ss = s.subjectStats[subj.key] || { correct: 0, wrong: 0 };
        const total = ss.correct + ss.wrong;
        const pct = total > 0 ? Math.round((ss.correct / total) * 100) : 0;
        return `
          <div class="stats-subject-row">
            <span class="stats-subject-icon">${subj.icono}</span>
            <div class="stats-subject-info">
              <div class="stats-subject-name">${subj.nombre}</div>
              <div class="stats-subject-bar-wrap">
                <div class="stats-subject-bar" style="width:${pct}%;background:${subj.color};"></div>
              </div>
              <div class="stats-subject-nums">✅ ${ss.correct} correctas · ❌ ${ss.wrong} errores · ${pct}% precisión</div>
            </div>
          </div>
        `;
      }).join('')}
      <div style="margin-top:1rem;font-size:.78rem;color:var(--text3);text-align:center;">
        Sesiones de práctica: ${s.sessions} · En error pendiente: ${s.wrongQueue?.length || 0} preguntas
      </div>
    `;

    document.getElementById('stats-modal').classList.remove('hidden');
  }

  function closeStats() { document.getElementById('stats-modal').classList.add('hidden'); }

  function confirmReset() {
    if (confirm('⚠️ ¿Estás seguro? Se borrará TODO tu progreso y no se puede recuperar.')) {
      Storage.reset();
      closeStats();
      showToast('✅ Progreso reiniciado.');
      renderHome();
    }
  }

  function closeGuide() { document.getElementById('guide-overlay').classList.add('hidden'); }

  // ─── SCREEN NAVIGATION ────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen, .loading-screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    state.screen = id;
    window.scrollTo(0, 0);
  }

  // ─── UI HELPERS ───────────────────────────────────────────────────────
  function showToast(msg, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add('hidden'), duration);
  }

  function launchConfetti() {
    const colors = ['#6C63FF','#FFD93D','#FF6B6B','#06D6A0','#FF9F1C'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: -10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${1.5 + Math.random() * 1.5}s;
        animation-delay: ${Math.random() * 0.5}s;
        transform: rotate(${Math.random() * 360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  function getCorrectMessage() {
    const msgs = ['¡Correcto! 🎉', '¡Excelente! ✨', '¡Muy bien! 🌟', '¡Genial! 🚀', '¡Perfecto! 💫', '¡Así se hace! 👏'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function getWrongMessage() {
    const msgs = ['¡Casi! Sigue intentando 💪', 'No te rindas 🔄', 'Aprende del error 📚', 'La próxima lo logras 🎯'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById('btn-stats').addEventListener('click', openStats);
    document.getElementById('btn-change-level').addEventListener('click', () => {
      if (confirm('¿Cambiar de nivel? Se mantendrá tu progreso actual.')) {
        Storage.setLevel(null);
        DATA = null;
        showScreen('welcome-screen');
        renderLevelCards();
      }
    });
  }

  // ─── SVG GRADIENT ─────────────────────────────────────────────────────
  function injectSvgDefs() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = `<defs>
      <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#6C63FF"/>
        <stop offset="100%" stop-color="#FFD93D"/>
      </linearGradient>
    </defs>`;
    document.body.prepend(svg);
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────
  return {
    init, selectLevel, startMode, startSubjectQuiz,
    openSubjectModal, closeSubjectModal,
    submitAnswer, nextQuestion, exitQuiz,
    playAgain, goHome, reviewErrors,
    openStats: () => openStats(), closeStats, confirmReset,
    closeGuide,
    showToast,
    // Expose these for inline onclick
    startMode, startQuiz
  };
})();

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Inject SVG gradient
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  svg.innerHTML = `<defs>
    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6C63FF"/>
      <stop offset="100%" stop-color="#FFD93D"/>
    </linearGradient>
  </defs>`;
  document.body.prepend(svg);
});
