const storagePrefix = "cksh-g10-second-exam:";

const state = {
  currentIndex: 0,
  submitted: false,
  answersVisible: false,
  timerId: null,
  remainingSeconds: 0
};

const els = {
  examSelect: document.getElementById("examSelect"),
  subjectList: document.getElementById("subjectList"),
  examMeta: document.getElementById("examMeta"),
  examTitle: document.getElementById("examTitle"),
  examSubtitle: document.getElementById("examSubtitle"),
  form: document.getElementById("examForm"),
  summary: document.getElementById("summary"),
  scoreNow: document.getElementById("scoreNow"),
  scoreBar: document.getElementById("scoreBar"),
  timer: document.getElementById("timer"),
  startBtn: document.getElementById("startBtn"),
  submitBtn: document.getElementById("submitBtn"),
  showAnswersBtn: document.getElementById("showAnswersBtn"),
  clearBtn: document.getElementById("clearBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  printBtn: document.getElementById("printBtn")
};

function currentExam() {
  return window.EXAM_DATA[state.currentIndex];
}

function storageKey(examId) {
  return `${storagePrefix}${examId}`;
}

function totalPoints(exam = currentExam()) {
  return exam.questions.reduce((sum, question) => sum + question.points, 0);
}

function objectivePoints(exam = currentExam()) {
  return exam.questions
    .filter((question) => ["single", "multi", "fill"].includes(question.type))
    .reduce((sum, question) => sum + question.points, 0);
}

function manualPoints(exam = currentExam()) {
  return totalPoints(exam) - objectivePoints(exam);
}

function loadSaved(exam = currentExam()) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(exam.id))) || {};
  } catch {
    return {};
  }
}

function saveCurrent() {
  const exam = currentExam();
  const saved = {};

  exam.questions.forEach((question) => {
    const key = `q-${question.id}`;
    if (question.type === "single") {
      const checked = els.form.querySelector(`input[name="${key}"]:checked`);
      saved[key] = checked ? checked.value : "";
    } else if (question.type === "multi") {
      saved[key] = Array.from(els.form.querySelectorAll(`input[name="${key}"]:checked`)).map((input) => input.value);
    } else if (question.type === "fill") {
      const input = els.form.querySelector(`[name="${key}"]`);
      saved[key] = input ? input.value : "";
    } else {
      const textarea = els.form.querySelector(`[name="${key}"]`);
      const score = els.form.querySelector(`[name="score-${question.id}"]`);
      saved[key] = textarea ? textarea.value : "";
      saved[`score-${question.id}`] = score ? score.value : "";
    }
  });

  localStorage.setItem(storageKey(exam.id), JSON.stringify(saved));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("（", "(")
    .replaceAll("）", ")")
    .replaceAll("，", ",")
    .replaceAll("−", "-")
    .replace(/\s+/g, "");
}

function arraysEqual(a, b) {
  const left = [...a].sort().join("");
  const right = [...b].sort().join("");
  return left === right;
}

function getUserAnswer(question) {
  const key = `q-${question.id}`;
  if (question.type === "single") {
    const checked = els.form.querySelector(`input[name="${key}"]:checked`);
    return checked ? checked.value : "";
  }
  if (question.type === "multi") {
    return Array.from(els.form.querySelectorAll(`input[name="${key}"]:checked`)).map((input) => input.value);
  }
  if (question.type === "fill") {
    const input = els.form.querySelector(`[name="${key}"]`);
    return input ? input.value : "";
  }
  const textarea = els.form.querySelector(`[name="${key}"]`);
  return textarea ? textarea.value : "";
}

function isCorrect(question) {
  const answer = getUserAnswer(question);
  if (question.type === "single") {
    return answer === question.answer;
  }
  if (question.type === "multi") {
    return arraysEqual(answer, question.answer);
  }
  if (question.type === "fill") {
    return question.answer.map(normalize).includes(normalize(answer));
  }
  return null;
}

function clampScore(raw, max) {
  const number = Number(raw);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, number));
}

function calculateScore() {
  const exam = currentExam();
  let auto = 0;
  let manual = 0;
  let answered = 0;

  exam.questions.forEach((question) => {
    const userAnswer = getUserAnswer(question);
    const hasAnswer = Array.isArray(userAnswer) ? userAnswer.length > 0 : String(userAnswer).trim() !== "";
    if (hasAnswer) answered += 1;

    if (["single", "multi", "fill"].includes(question.type)) {
      if (isCorrect(question)) auto += question.points;
    } else {
      const scoreInput = els.form.querySelector(`[name="score-${question.id}"]`);
      manual += clampScore(scoreInput ? scoreInput.value : 0, question.points);
    }
  });

  return {
    auto,
    manual,
    total: auto + manual,
    max: totalPoints(exam),
    autoMax: objectivePoints(exam),
    manualMax: manualPoints(exam),
    answered,
    count: exam.questions.length
  };
}

function renderSelectors() {
  els.examSelect.innerHTML = window.EXAM_DATA.map((exam, index) => (
    `<option value="${index}">${escapeHtml(exam.title)}</option>`
  )).join("");

  els.subjectList.innerHTML = window.EXAM_DATA.map((exam, index) => (
    `<button type="button" data-index="${index}">${escapeHtml(exam.title)}<br><small>${totalPoints(exam)} 分｜${exam.durationMinutes} 分鐘</small></button>`
  )).join("");
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function resetTimerForExam() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.remainingSeconds = currentExam().durationMinutes * 60;
  els.timer.textContent = formatTimer(state.remainingSeconds);
  els.startBtn.textContent = "開始計時";
}

function renderExam() {
  const exam = currentExam();
  const saved = loadSaved(exam);
  state.submitted = false;
  state.answersVisible = false;
  els.showAnswersBtn.textContent = "顯示參考答案";

  els.examSelect.value = String(state.currentIndex);
  els.examTitle.textContent = exam.title;
  els.examSubtitle.textContent = exam.subtitle;
  els.examMeta.innerHTML = `${exam.questions.length} 題<br>${objectivePoints(exam)} 分自動評分<br>${manualPoints(exam)} 分自評`;
  els.summary.hidden = true;
  els.summary.innerHTML = "";
  resetTimerForExam();

  Array.from(els.subjectList.querySelectorAll("button")).forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.index) === state.currentIndex);
  });

  let lastSection = "";
  els.form.className = "exam-form";
  els.form.innerHTML = exam.questions.map((question) => {
    const sectionMarkup = question.section !== lastSection
      ? `<h3 class="section-title">${escapeHtml(question.section)}</h3>`
      : "";
    lastSection = question.section;
    return `${sectionMarkup}${renderQuestion(question, saved)}`;
  }).join("");

  updateScoreDisplay();
}

function renderQuestion(question, saved) {
  const key = `q-${question.id}`;
  const savedAnswer = saved[key];
  const heading = `
    <div class="q-head">
      <div class="q-title">第 ${question.id} 題</div>
      <div class="q-points">${question.points} 分</div>
    </div>`;
  const passage = question.passage ? `<div class="passage">${escapeHtml(question.passage)}</div>` : "";
  const prompt = `<div class="prompt">${escapeHtml(question.prompt)}</div>`;

  let control = "";
  if (question.type === "single") {
    control = `<div class="choices">${Object.entries(question.choices).map(([letter, text]) => `
      <label class="choice">
        <input type="radio" name="${key}" value="${letter}" ${savedAnswer === letter ? "checked" : ""}>
        <span><strong>${letter}.</strong> ${escapeHtml(text)}</span>
      </label>`).join("")}</div>`;
  } else if (question.type === "multi") {
    const picked = Array.isArray(savedAnswer) ? savedAnswer : [];
    control = `<div class="choices">${Object.entries(question.choices).map(([letter, text]) => `
      <label class="choice">
        <input type="checkbox" name="${key}" value="${letter}" ${picked.includes(letter) ? "checked" : ""}>
        <span><strong>${letter}.</strong> ${escapeHtml(text)}</span>
      </label>`).join("")}</div>`;
  } else if (question.type === "fill") {
    control = `<input class="answer-input" name="${key}" value="${escapeHtml(savedAnswer || "")}" autocomplete="off" placeholder="輸入答案">`;
  } else {
    control = `
      <textarea name="${key}" placeholder="在這裡作答">${escapeHtml(savedAnswer || "")}</textarea>
      <div class="manual-score">
        <label for="score-${question.id}">自評分數</label>
        <input id="score-${question.id}" name="score-${question.id}" type="number" min="0" max="${question.points}" step="0.5" value="${escapeHtml(saved[`score-${question.id}`] || "")}">
        <span>/ ${question.points}</span>
      </div>`;
  }

  const feedback = `
    <div class="feedback" data-feedback-for="${question.id}">
      ${renderFeedback(question)}
    </div>`;

  return `<article class="question" data-question-id="${question.id}" data-type="${question.type}">
    ${heading}
    ${passage}
    ${prompt}
    ${control}
    ${feedback}
  </article>`;
}

function renderFeedback(question) {
  if (question.type === "single" || question.type === "fill") {
    return `<strong>參考答案：</strong>${escapeHtml(Array.isArray(question.answer) ? question.answer[0] : question.answer)}${question.sample ? `<br>${escapeHtml(question.sample)}` : ""}`;
  }
  if (question.type === "multi") {
    return `<strong>參考答案：</strong>${escapeHtml(question.answer.join(""))}${question.sample ? `<br>${escapeHtml(question.sample)}` : ""}`;
  }
  return `<strong>參考答案 / 評分提示：</strong><br>${escapeHtml(question.sample || "請依題意與詳解自行評分。")}`;
}

function markQuestions() {
  const exam = currentExam();
  exam.questions.forEach((question) => {
    const article = els.form.querySelector(`[data-question-id="${question.id}"]`);
    if (!article) return;
    article.classList.remove("correct", "incorrect");
    const badge = article.querySelector(".status-pill");
    if (badge) badge.remove();

    if (!state.submitted || !["single", "multi", "fill"].includes(question.type)) return;

    const correct = isCorrect(question);
    article.classList.add(correct ? "correct" : "incorrect");
    article.querySelector(".q-head").insertAdjacentHTML("beforeend", `<span class="status-pill ${correct ? "ok" : "bad"}">${correct ? "正確" : "需訂正"}</span>`);
  });
}

function updateScoreDisplay() {
  const score = calculateScore();
  els.scoreNow.textContent = `${score.total} / ${score.max}`;
  els.scoreBar.style.width = `${score.max ? (score.total / score.max) * 100 : 0}%`;

  if (state.submitted) {
    els.summary.hidden = false;
    els.summary.innerHTML = `
      <strong>評分完成：</strong>${score.total} / ${score.max} 分。
      自動評分 ${score.auto} / ${score.autoMax} 分，自評 ${score.manual} / ${score.manualMax} 分。
      已作答 ${score.answered} / ${score.count} 題。`;
  }

  markQuestions();
}

function submitExam() {
  saveCurrent();
  state.submitted = true;
  state.answersVisible = true;
  els.form.classList.add("submitted", "show-feedback");
  els.showAnswersBtn.textContent = "隱藏參考答案";
  updateScoreDisplay();
  els.summary.scrollIntoView({behavior: "smooth", block: "start"});
}

function toggleAnswers() {
  state.answersVisible = !state.answersVisible;
  els.form.classList.toggle("show-feedback", state.answersVisible);
  els.showAnswersBtn.textContent = state.answersVisible ? "隱藏參考答案" : "顯示參考答案";
}

function switchExam(index) {
  saveCurrent();
  state.currentIndex = index;
  renderExam();
}

function startTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
    els.startBtn.textContent = "繼續計時";
    return;
  }

  els.startBtn.textContent = "暫停計時";
  state.timerId = setInterval(() => {
    state.remainingSeconds -= 1;
    els.timer.textContent = formatTimer(state.remainingSeconds);
    if (state.remainingSeconds <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      state.remainingSeconds = 0;
      els.timer.textContent = "00:00";
      submitExam();
    }
  }, 1000);
}

els.examSelect.addEventListener("change", (event) => switchExam(Number(event.target.value)));
els.subjectList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (button) switchExam(Number(button.dataset.index));
});
els.form.addEventListener("input", () => {
  saveCurrent();
  updateScoreDisplay();
});
els.form.addEventListener("change", () => {
  saveCurrent();
  updateScoreDisplay();
});
els.startBtn.addEventListener("click", startTimer);
els.submitBtn.addEventListener("click", submitExam);
els.showAnswersBtn.addEventListener("click", toggleAnswers);
els.clearBtn.addEventListener("click", () => {
  if (!confirm("要清除此科作答紀錄嗎？")) return;
  localStorage.removeItem(storageKey(currentExam().id));
  renderExam();
});
els.resetAllBtn.addEventListener("click", () => {
  if (!confirm("要清除所有科目的本機作答紀錄嗎？")) return;
  window.EXAM_DATA.forEach((exam) => localStorage.removeItem(storageKey(exam.id)));
  renderExam();
});
els.printBtn.addEventListener("click", () => window.print());

renderSelectors();
renderExam();
