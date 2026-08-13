/**
 * questions.js – Question Renderers for EstudiA
 * Each question type has a render() and getAnswer() function
 */
const Questions = (() => {

  // ─── SELECCIÓN ÚNICA ───────────────────────────────────────────────────
  function renderSingleChoice(q, container) {
    const text = q.texto_lectura
      ? `<div class="q-reading">${q.texto_lectura}</div><p class="q-text">${q.pregunta}</p>`
      : `<p class="q-text">${q.pregunta}</p>`;

    container.innerHTML = `
      <div class="q-type-badge">Selección única · Toca tu respuesta</div>
      ${text}
      <div class="options-list" id="options-list">
        ${q.opciones.map((opt, i) => `
          <button class="option-btn" data-index="${i}" onclick="Questions.selectSingle(this, ${i})">
            <span class="option-letter">${'ABCD'[i]}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  function selectSingle(btn, idx) {
    // Prevent double-tap: if already processing, ignore
    if (btn.dataset.processing) return;

    // Mark all buttons as selected/unselected
    document.querySelectorAll('#options-list .option-btn').forEach(b => {
      b.classList.remove('selected');
      b.dataset.processing = '1'; // lock all buttons while animating
    });
    btn.classList.add('selected');

    // Submit after a short visual pause so the selection is visible
    setTimeout(function() {
      App.submitAnswer();
    }, 450);
  }

  function getSingleAnswer() {
    const selected = document.querySelector('.option-btn.selected');
    if (!selected) return null;
    return parseInt(selected.dataset.index);
  }

  function checkSingle(answer, q) {
    const correct = answer === q.respuesta_correcta;
    document.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.respuesta_correcta) btn.classList.add('correct');
      else if (i === answer && !correct) btn.classList.add('wrong');
    });
    return { correct, points: correct ? q.puntos : 0 };
  }

  // ─── SELECCIÓN MÚLTIPLE ────────────────────────────────────────────────
  function renderMultiChoice(q, container) {
    container.innerHTML = `
      <div class="q-type-badge">Selección múltiple (elige todas las correctas)</div>
      <p class="q-text">${q.pregunta}</p>
      <div class="options-list" id="options-list">
        ${q.opciones.map((opt, i) => `
          <button class="option-btn multi" data-index="${i}" onclick="Questions.toggleMulti(this)">
            <span class="option-check"></span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
      <button class="multi-submit" onclick="Questions.submitMulti()">Confirmar selección ✓</button>
    `;
  }

  function toggleMulti(btn) {
    if (btn.disabled) return;
    btn.classList.toggle('selected');
  }

  function submitMulti() {
    App.submitAnswer();
  }

  function getMultiAnswer() {
    const selected = [];
    document.querySelectorAll('.option-btn.multi.selected').forEach(btn => {
      selected.push(parseInt(btn.dataset.index));
    });
    return selected;
  }

  function checkMulti(answer, q) {
    const correct_set = new Set(q.respuestas_correctas);
    const answer_set = new Set(answer);
    const correct = correct_set.size === answer_set.size &&
      [...correct_set].every(v => answer_set.has(v));

    document.querySelectorAll('.option-btn.multi').forEach((btn, i) => {
      btn.disabled = true;
      const isCorrect = correct_set.has(i);
      const isSelected = answer_set.has(i);
      if (isCorrect) btn.classList.add('correct');
      else if (isSelected && !isCorrect) btn.classList.add('wrong');
    });

    // Partial credit
    let pts = 0;
    if (correct) pts = q.puntos;
    else {
      const correctSelected = [...answer_set].filter(v => correct_set.has(v)).length;
      pts = Math.round((correctSelected / correct_set.size) * q.puntos * 0.5);
    }
    return { correct, points: pts };
  }

  // ─── TEXTO LIBRE ───────────────────────────────────────────────────────
  function renderTextInput(q, container) {
    container.innerHTML = `
      <div class="q-type-badge">Respuesta escrita</div>
      <p class="q-text">${q.pregunta}</p>
      <div class="text-input-wrap">
        <input class="text-input-field" id="text-answer" type="text" placeholder="Escribe tu respuesta aquí..." autocomplete="off" autocorrect="off" spellcheck="false">
        <div style="display:flex;gap:.5rem;">
          <button class="btn-hint" onclick="Questions.showHint('${escapeStr(q.guia)}')">💡 Pista</button>
          <button class="btn-submit-text" onclick="Questions.submitTextAnswer()" style="flex:1;">Verificar ✓</button>
        </div>
      </div>
    `;
    const inp = document.getElementById('text-answer');
    inp.focus();
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') Questions.submitTextAnswer(); });
  }

  function submitTextAnswer() { App.submitAnswer(); }

  function getTextAnswer() {
    const inp = document.getElementById('text-answer');
    return inp ? inp.value : '';
  }

  function checkText(answer, q) {
    const result = Engine.checkTextAnswer(answer, q.respuesta_correcta, q.respuestas_aceptadas || [], q.tolerancia_tipeo !== false);
    const inp = document.getElementById('text-answer');
    if (inp) {
      inp.disabled = true;
      inp.classList.add(result.correct ? 'correct' : 'wrong');
    }
    return { correct: result.correct, typo: result.typo, expected: result.expected, points: result.correct ? q.puntos : 0 };
  }

  // ─── COMPLETAR ESPACIOS ────────────────────────────────────────────────
  function renderFillBlank(q, container) {
    let textHtml = q.texto;
    q.espacios.forEach((_, i) => {
      textHtml = textHtml.replace('______', `<input class="blank-input" id="blank-${i}" data-index="${i}" type="text" autocomplete="off" spellcheck="false" placeholder="...">`);
    });

    container.innerHTML = `
      <div class="q-type-badge">Completar espacios</div>
      <p class="q-text">${q.pregunta}</p>
      <div class="fill-text">${textHtml}</div>
      <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn-hint" onclick="Questions.showHint('${escapeStr(q.guia)}')">💡 Pista</button>
        <button class="btn-submit-text" onclick="Questions.submitFill()" style="flex:1;">Verificar ✓</button>
      </div>
    `;

    // Enter moves to next blank
    q.espacios.forEach((_, i) => {
      const inp = document.getElementById(`blank-${i}`);
      if (inp) inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const next = document.getElementById(`blank-${i+1}`);
          if (next) next.focus(); else Questions.submitFill();
        }
      });
    });
  }

  function submitFill() { App.submitAnswer(); }

  function getFillAnswer(q) {
    return q.espacios.map((_, i) => {
      const inp = document.getElementById(`blank-${i}`);
      return inp ? inp.value.trim() : '';
    });
  }

  function checkFill(answers, q) {
    let allCorrect = true, anyTypo = false;
    q.espacios.forEach((correct, i) => {
      const result = Engine.checkTextAnswer(answers[i], correct, [], true);
      const inp = document.getElementById(`blank-${i}`);
      if (inp) {
        inp.disabled = true;
        inp.classList.add(result.correct ? 'correct' : 'wrong');
        if (!result.correct) { allCorrect = false; inp.value = correct; }
        if (result.typo) anyTypo = true;
      }
    });
    const pts = allCorrect ? q.puntos : 0;
    return { correct: allCorrect, typo: anyTypo, points: pts };
  }

  // ─── UNIR CORRESPONDIENTE ─────────────────────────────────────────────
  function renderMatch(q, container) {
    const lefts = q._leftItems || q.pares_correctos.map(p => p.izquierda);
    const rights = q._rightItems || q.pares_correctos.map(p => p.derecha);

    container.innerHTML = `
      <div class="q-type-badge">Unir con el correspondiente</div>
      <p class="q-text">${q.pregunta}</p>
      <div class="match-container">
        <div class="match-col">
          <div class="match-col-title">Columna A</div>
          ${lefts.map((item, i) => `<div class="match-item left-item" data-left="${i}" data-val="${escapeStr(item)}" onclick="Questions.selectLeft(this)">${item}</div>`).join('')}
        </div>
        <div class="match-col">
          <div class="match-col-title">Columna B</div>
          ${rights.map((item, i) => `<div class="match-item right-item" data-right="${i}" data-val="${escapeStr(item)}" onclick="Questions.selectRight(this)">${item}</div>`).join('')}
        </div>
      </div>
      <div id="match-status" style="margin-top:.75rem;font-size:.82rem;color:var(--text2);text-align:center;"></div>
    `;
    window._matchState = { selectedLeft: null, matched: [], total: q.pares_correctos.length, q };
  }

  function selectLeft(el) {
    if (el.classList.contains('matched')) return;
    document.querySelectorAll('.left-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    window._matchState.selectedLeft = el;
    tryMatch();
  }

  function selectRight(el) {
    if (el.classList.contains('matched')) return;
    document.querySelectorAll('.right-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    window._matchState.selectedRight = el;
    tryMatch();
  }

  function tryMatch() {
    const ms = window._matchState;
    if (!ms.selectedLeft) return;
    const rightEl = document.querySelector('.right-item.selected');
    if (!rightEl) return;

    const leftVal = ms.selectedLeft.dataset.val;
    const rightVal = rightEl.dataset.val;

    // Find correct pair
    const isCorrect = ms.q.pares_correctos.some(p => p.izquierda === leftVal && p.derecha === rightVal);

    if (isCorrect) {
      ms.selectedLeft.classList.add('matched');
      rightEl.classList.add('matched');
      ms.matched.push({ left: leftVal, right: rightVal });
      document.getElementById('match-status').textContent = `✅ ${ms.matched.length}/${ms.total} pares correctos`;

      if (ms.matched.length === ms.total) {
        setTimeout(() => App.submitAnswer(), 600);
      }
    } else {
      ms.selectedLeft.classList.add('wrong-match');
      rightEl.classList.add('wrong-match');
      setTimeout(() => {
        ms.selectedLeft.classList.remove('wrong-match', 'selected');
        rightEl.classList.remove('wrong-match', 'selected');
        ms.selectedLeft = null;
        ms.selectedRight = null;
      }, 500);
      return;
    }

    ms.selectedLeft = null;
    ms.selectedRight = null;
    document.querySelectorAll('.match-item').forEach(e => e.classList.remove('selected'));
  }

  function getMatchAnswer() {
    return window._matchState ? window._matchState.matched : [];
  }

  function checkMatch(answered, q) {
    const total = q.pares_correctos.length;
    const correct = answered.length === total;
    const pts = correct ? q.puntos : Math.round((answered.length / total) * q.puntos * 0.6);
    return { correct, points: pts };
  }

  // ─── ARMAR ORACIÓN ────────────────────────────────────────────────────
  function renderWordOrder(q, container) {
    container.innerHTML = `
      <div class="q-type-badge">Ordena las palabras</div>
      <p class="q-text">${q.pregunta}</p>
      <p class="word-instruction">👆 Toca una palabra para añadirla · Toca la oración para quitar una palabra</p>
      <div class="word-sentence" id="word-sentence"></div>
      <p class="word-instruction" style="margin-top:.5rem;">Palabras disponibles:</p>
      <div class="word-bank" id="word-bank">
        ${q.palabras.map(w => `<span class="word-chip bank-chip" onclick="Questions.addWord(this, '${escapeStr(w)}')">${w}</span>`).join('')}
      </div>
      <button class="multi-submit" id="btn-check-order" onclick="Questions.submitOrder()">Verificar oración ✓</button>
    `;
    window._wordOrder = { sentence: [], available: [...q.palabras], q };
  }

  function addWord(el, word) {
    if (el.dataset.used) return;
    el.dataset.used = '1';
    el.style.opacity = '.3';
    el.style.pointerEvents = 'none';

    const sentence = document.getElementById('word-sentence');
    const chip = document.createElement('span');
    chip.className = 'word-chip sentence-chip';
    chip.textContent = word;
    chip.dataset.word = word;
    chip.dataset.sourceEl = el.dataset.idx;
    chip.onclick = () => removeWord(chip, el);
    sentence.appendChild(chip);
    window._wordOrder.sentence.push(word);
  }

  function removeWord(chip, sourceEl) {
    chip.remove();
    if (sourceEl) {
      sourceEl.style.opacity = '';
      sourceEl.style.pointerEvents = '';
      delete sourceEl.dataset.used;
    }
    const idx = window._wordOrder.sentence.indexOf(chip.dataset.word);
    if (idx > -1) window._wordOrder.sentence.splice(idx, 1);
  }

  function submitOrder() { App.submitAnswer(); }

  function getOrderAnswer() {
    const chips = document.querySelectorAll('.sentence-chip');
    return [...chips].map(c => c.dataset.word).join(' ');
  }

  function checkOrder(answer, q) {
    const correctNorm = q.oracion_correcta.toLowerCase().trim();
    const answerNorm = answer.toLowerCase().trim();
    const correct = correctNorm === answerNorm;

    const sentence = document.getElementById('word-sentence');
    if (correct) { sentence.classList.add('correct-order'); }
    else {
      sentence.classList.add('wrong-order');
      // Show correct answer
      const correctDiv = document.createElement('div');
      correctDiv.style.cssText = 'margin-top:.5rem;font-size:.82rem;color:var(--success);';
      correctDiv.textContent = `✓ Correcto: "${q.oracion_correcta}"`;
      sentence.parentNode.insertBefore(correctDiv, sentence.nextSibling);
    }

    // Disable bank
    document.querySelectorAll('.bank-chip').forEach(c => c.style.pointerEvents = 'none');
    document.querySelectorAll('.sentence-chip').forEach(c => c.onclick = null);
    const btn = document.getElementById('btn-check-order');
    if (btn) btn.disabled = true;

    return { correct, points: correct ? q.puntos : 0 };
  }

  // ─── SOPA DE LETRAS ───────────────────────────────────────────────────
  function renderWordSearch(q, container) {
    const grid = q.grid;
    const rows = grid.length;
    const cols = grid[0].length;

    container.innerHTML = `
      <div class="q-type-badge">Sopa de letras</div>
      <p class="q-text">${q.pregunta}</p>
      <div class="word-search-container">
        <div class="word-search-grid" id="ws-grid" style="grid-template-columns: repeat(${cols}, 36px);">
          ${grid.map((row, r) => row.map((cell, c) =>
            `<div class="ws-cell" data-r="${r}" data-c="${c}" onclick="Questions.wsClick(this)">${cell}</div>`
          ).join('')).join('')}
        </div>
      </div>
      <div class="ws-words" id="ws-words">
        ${q.palabras_buscar.map(w => `<span class="ws-word" data-word="${w}">${w}</span>`).join('')}
      </div>
      <button class="multi-submit" id="btn-ws-done" onclick="Questions.submitWordSearch()">Listo ✓</button>
    `;
    window._wsState = {
      grid, rows, cols, words: q.palabras_buscar,
      selection: [], foundWords: [],
      findDirections: [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]
    };
  }

  function wsClick(el) {
    const ws = window._wsState;
    const r = parseInt(el.dataset.r), c = parseInt(el.dataset.c);

    if (el.classList.contains('found')) return;
    if (el.classList.contains('selected')) {
      // Deselect
      el.classList.remove('selected');
      ws.selection = ws.selection.filter(s => !(s.r === r && s.c === c));
      return;
    }

    el.classList.add('selected');
    ws.selection.push({ r, c, el });

    // Check if selection forms a valid word
    if (ws.selection.length >= 2) {
      const letters = ws.selection.map(s => ws.grid[s.r][s.c]).join('');
      const lettersRev = [...letters].reverse().join('');

      const matched = ws.words.find(w => w === letters || w === lettersRev);
      if (matched) {
        ws.selection.forEach(s => {
          s.el.classList.remove('selected');
          s.el.classList.add('found');
        });
        ws.foundWords.push(matched);
        ws.selection = [];

        // Mark word as found
        const wordEl = document.querySelector(`.ws-word[data-word="${matched}"]`);
        if (wordEl) wordEl.classList.add('found');

        if (ws.foundWords.length === ws.words.length) {
          setTimeout(() => App.submitAnswer(), 600);
        }
      }
    }
  }

  function submitWordSearch() { App.submitAnswer(); }

  function getWordSearchAnswer() {
    return window._wsState ? window._wsState.foundWords : [];
  }

  function checkWordSearch(found, q) {
    const total = q.palabras_buscar.length;
    const correct = found.length === total;
    const pts = Math.round((found.length / total) * q.puntos);
    return { correct, points: pts };
  }

  // ─── CRUCIGRAMA ───────────────────────────────────────────────────────
  function renderCrossword(q, container) {
    const { pistas } = q;
    const allWords = [...(pistas.horizontal || []), ...(pistas.vertical || [])];

    // Build grid
    let maxR = 0, maxC = 0;
    allWords.forEach(w => {
      if (w.fila !== undefined) maxR = Math.max(maxR, w.fila + (pistas.vertical?.includes(w) ? w.respuesta.length : 1));
      if (w.col_inicio !== undefined) maxC = Math.max(maxC, w.col_inicio + (pistas.horizontal?.includes(w) ? w.respuesta.length : 1));
    });
    maxR = Math.max(maxR, 8); maxC = Math.max(maxC, 12);

    // Build grid map
    const gridMap = {};
    const numberMap = {};

    (pistas.horizontal || []).forEach(clue => {
      for (let i = 0; i < clue.respuesta.length; i++) {
        const key = `${clue.fila},${clue.col_inicio + i}`;
        gridMap[key] = gridMap[key] || { letter: clue.respuesta[i], hClue: null, vClue: null };
        if (i === 0) {
          gridMap[key].num = clue.numero;
          numberMap[key] = clue.numero;
        }
      }
    });
    (pistas.vertical || []).forEach(clue => {
      for (let i = 0; i < clue.respuesta.length; i++) {
        const key = `${clue.fila + i},${clue.col_inicio}`;
        gridMap[key] = gridMap[key] || { letter: clue.respuesta[i], hClue: null, vClue: null };
        if (i === 0 && !numberMap[key]) {
          gridMap[key].num = clue.numero;
        }
      }
    });

    // Render compact grid - only used cells
    const usedRows = new Set(), usedCols = new Set();
    Object.keys(gridMap).forEach(k => {
      const [r, c] = k.split(',').map(Number);
      usedRows.add(r); usedCols.add(c);
    });
    const sortedRows = [...usedRows].sort((a, b) => a - b);
    const sortedCols = [...usedCols].sort((a, b) => a - b);

    const gridHtml = sortedRows.map(r =>
      sortedCols.map(c => {
        const key = `${r},${c}`;
        const cell = gridMap[key];
        if (!cell) return `<div class="cw-cell black"></div>`;
        return `<div class="cw-cell">
          ${cell.num ? `<span class="cw-num">${cell.num}</span>` : ''}
          <input type="text" maxlength="1" data-key="${key}" data-letter="${cell.letter}" 
                 autocomplete="off" spellcheck="false" 
                 oninput="Questions.cwInput(this)" onkeydown="Questions.cwKeydown(event, this)">
        </div>`;
      }).join('')
    ).join('');

    container.innerHTML = `
      <div class="q-type-badge">Crucigrama</div>
      <p class="q-text">${q.pregunta}</p>
      <div class="crossword-wrap">
        <div class="crossword-grid" id="cw-grid" style="grid-template-columns: repeat(${sortedCols.length}, 36px);">
          ${gridHtml}
        </div>
      </div>
      <div class="cw-clues">
        ${pistas.horizontal?.length ? `
          <div class="cw-clue-section">
            <div class="cw-clue-title">→ Horizontales</div>
            ${pistas.horizontal.map(c => `<div class="cw-clue"><span>${c.numero}.</span> ${c.pista}</div>`).join('')}
          </div>` : ''}
        ${pistas.vertical?.length ? `
          <div class="cw-clue-section">
            <div class="cw-clue-title">↓ Verticales</div>
            ${pistas.vertical.map(c => `<div class="cw-clue"><span>${c.numero}.</span> ${c.pista}</div>`).join('')}
          </div>` : ''}
      </div>
      <button class="btn-check-cw" onclick="Questions.submitCrossword()">Verificar crucigrama ✓</button>
    `;
    window._cwState = { gridMap };
  }

  function cwInput(el) {
    el.value = el.value.toUpperCase();
    // Auto-advance
    const allInputs = [...document.querySelectorAll('.cw-cell input')];
    const idx = allInputs.indexOf(el);
    if (el.value && idx < allInputs.length - 1) allInputs[idx + 1].focus();
  }

  function cwKeydown(e, el) {
    if (e.key === 'Backspace' && !el.value) {
      const allInputs = [...document.querySelectorAll('.cw-cell input')];
      const idx = allInputs.indexOf(el);
      if (idx > 0) allInputs[idx - 1].focus();
    }
  }

  function submitCrossword() { App.submitAnswer(); }

  function getCrosswordAnswer() {
    const inputs = document.querySelectorAll('.cw-cell input');
    let correct = 0, total = inputs.length;
    inputs.forEach(inp => {
      const isCorrect = inp.value.toUpperCase() === inp.dataset.letter.toUpperCase();
      inp.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) inp.value = inp.dataset.letter;
      if (isCorrect) correct++;
    });
    return { correct, total };
  }

  function checkCrossword(result, q) {
    const pct = result.total > 0 ? result.correct / result.total : 0;
    const correct = pct === 1;
    const pts = Math.round(pct * q.puntos);
    return { correct, points: pts };
  }

  // ─── COMPRENSIÓN LECTORA ──────────────────────────────────────────────
  function renderReadingComp(q, container) {
    renderSingleChoice(q, container);
    // Reading text already included in renderSingleChoice via texto_lectura check
  }

  // ─── UTILITY ──────────────────────────────────────────────────────────
  function showHint(guia) {
    document.getElementById('guide-text').textContent = guia;
    document.getElementById('guide-overlay').classList.remove('hidden');
  }

  function escapeStr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // ─── MAIN RENDER DISPATCHER ───────────────────────────────────────────
  function render(q, container) {
    // Reset per-question state
    Questions._submitted = false;
    clearTimeout(Questions._autoSubmitTimer);

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'q-card';
    container.appendChild(wrapper);

    switch (q.tipo) {
      case 'seleccion_unica': renderSingleChoice(q, wrapper); break;
      case 'seleccion_multiple': renderMultiChoice(q, wrapper); break;
      case 'texto_libre': renderTextInput(q, wrapper); break;
      case 'completar_espacios': renderFillBlank(q, wrapper); break;
      case 'unir_correspondiente': renderMatch(q, wrapper); break;
      case 'armar_oracion': renderWordOrder(q, wrapper); break;
      case 'sopa_letras': renderWordSearch(q, wrapper); break;
      case 'crucigrama': renderCrossword(q, wrapper); break;
      case 'comprension_lectora': renderReadingComp(q, wrapper); break;
      default: renderSingleChoice(q, wrapper);
    }
  }

  // ─── GET ANSWER DISPATCHER ────────────────────────────────────────────
  function getAnswer(q) {
    switch (q.tipo) {
      case 'seleccion_unica':
      case 'comprension_lectora': return getSingleAnswer();
      case 'seleccion_multiple': return getMultiAnswer();
      case 'texto_libre': return getTextAnswer();
      case 'completar_espacios': return getFillAnswer(q);
      case 'unir_correspondiente': return getMatchAnswer();
      case 'armar_oracion': return getOrderAnswer();
      case 'sopa_letras': return getWordSearchAnswer();
      case 'crucigrama': return getCrosswordAnswer();
      default: return null;
    }
  }

  // ─── CHECK ANSWER DISPATCHER ──────────────────────────────────────────
  function checkAnswer(answer, q) {
    switch (q.tipo) {
      case 'seleccion_unica':
      case 'comprension_lectora': return checkSingle(answer, q);
      case 'seleccion_multiple': return checkMulti(answer, q);
      case 'texto_libre': return checkText(answer, q);
      case 'completar_espacios': return checkFill(answer, q);
      case 'unir_correspondiente': return checkMatch(answer, q);
      case 'armar_oracion': return checkOrder(answer, q);
      case 'sopa_letras': return checkWordSearch(answer, q);
      case 'crucigrama': return checkCrossword(answer, q);
      default: return { correct: false, points: 0 };
    }
  }

  // Auto-submit types (match, word search)
  function isAutoSubmit(q) {
    return ['unir_correspondiente', 'sopa_letras'].includes(q.tipo);
  }

  // Needs explicit confirm button
  function needsConfirm(q) {
    return ['seleccion_multiple', 'armar_oracion', 'completar_espacios', 'crucigrama'].includes(q.tipo);
  }

  return {
    // Core
    render, getAnswer, checkAnswer, isAutoSubmit, needsConfirm,
    // Single choice
    selectSingle,
    // Multiple choice
    toggleMulti, submitMulti,
    // Text input
    submitTextAnswer,
    // Fill blank
    submitFill,
    // Word order
    addWord, removeWord, submitOrder,
    // Match
    selectLeft, selectRight,
    // Word search
    wsClick, submitWordSearch,
    // Crossword
    cwInput, cwKeydown, submitCrossword,
    // Hint
    showHint
  };
})();
