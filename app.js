(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const FOCUS = 25 * 60;
  const BREAK = 5 * 60;
  const MIN_SAVE = 60;
  const KEY = {
    session: 'studiness_session',
    intro: 'studiness_intro_seen',
    accounts: 'studiness_accounts',
    timer: 'studiness_timer',
  };
  const dataKey = (email) => 'studiness_data_' + email;

  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d); };
  const firstOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const fmtDur = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
  const mmss = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SUBJECTS = [
    { key: 'physics', name: 'Physics', chapters: [
      ['phy-measurement', 'Measurement'], ['phy-vectors', 'Vectors'], ['phy-motion', 'Motion'],
      ['phy-force', "Force and Newton's Laws"], ['phy-work-energy', 'Work, Energy and Power'],
      ['phy-gravitation', 'Gravitation'], ['phy-oscillation', 'Oscillation and Waves'],
      ['phy-thermo', 'Thermodynamics'], ['phy-electrostatics', 'Electrostatics'],
      ['phy-current', 'Current Electricity'], ['phy-magnetism', 'Electromagnetism'], ['phy-modern', 'Modern Physics'],
    ] },
    { key: 'chemistry', name: 'Chemistry', chapters: [
      ['chem-matter', 'Matter and State'], ['chem-atom', 'Atomic Structure'], ['chem-periodic', 'Periodic Table'],
      ['chem-bonding', 'Chemical Bonding'], ['chem-stoich', 'Stoichiometry'], ['chem-solution', 'Solutions'],
      ['chem-thermo', 'Thermochemistry'], ['chem-equilibrium', 'Chemical Equilibrium'], ['chem-acid', 'Acids and Bases'],
      ['chem-electro', 'Electrochemistry'], ['chem-organic', 'Organic Chemistry'],
    ] },
    { key: 'higher-math', name: 'Higher Math', chapters: [
      ['hm-sets', 'Sets and Functions'], ['hm-trig', 'Trigonometry'], ['hm-complex', 'Complex Numbers'],
      ['hm-matrix', 'Matrices and Determinants'], ['hm-coord', 'Coordinate Geometry'], ['hm-diff', 'Differentiation'],
      ['hm-integ', 'Integration'], ['hm-stat', 'Statistics'], ['hm-prob', 'Probability'],
    ] },
    { key: 'biology', name: 'Biology', chapters: [
      ['bio-cell', 'Cell Biology'], ['bio-genetics', 'Genetics'], ['bio-evolution', 'Evolution'],
      ['bio-plant', 'Plant Physiology'], ['bio-animal', 'Animal Physiology'], ['bio-ecology', 'Ecology'],
      ['bio-repro', 'Reproduction'], ['bio-biotech', 'Biotechnology'],
    ] },
    { key: 'ict', name: 'ICT', chapters: [
      ['ict-comm', 'Communication Systems'], ['ict-number', 'Number Systems'], ['ict-logic', 'Logic Gates'],
      ['ict-prog', 'Programming'], ['ict-db', 'Database'], ['ict-web', 'Web Design'], ['ict-society', 'ICT and Society'],
    ] },
  ];
  const findSubject = (key) => SUBJECTS.find((s) => s.key === key);
  const chapterLabel = (key) => {
    for (const s of SUBJECTS) {
      const c = s.chapters.find((c) => c[0] === key);
      if (c) return `${s.name} / ${c[1]}`;
    }
    return '';
  };

  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    del(k) { localStorage.removeItem(k); },
  };

  /* ---------- State ---------- */
  const blankTimer = () => ({ running: false, phase: 'focus', target: 0, startedAt: 0, subject: '', chapter: '', cycles: 0, email: '' });
  let user = null;   // { email, name }
  let data = null;   // { sessions, progress, tasks }
  let timer = blankTimer();
  let timerSel = { subject: '', chapter: '' };
  let authMode = 'login';
  let currentTab = 'main';
  let mainSubject = SUBJECTS[0].key;
  let statSubject = SUBJECTS[0].key;
  let calMonth = firstOfMonth(new Date());
  let calSel = dateKey(new Date());
  let toastTimer = null;

  function persist() { if (user) store.set(dataKey(user.email), data); }
  function persistTimer() { store.set(KEY.timer, timer); }

  /* ---------- UI basics ---------- */
  function showView(id) { $$('.view').forEach((v) => { v.hidden = v.id !== id; }); }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function beep() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* audio blocked, ignore */ }
  }

  function notify(text) {
    beep();
    toast(text);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Studiness', { body: text });
    }
  }

  function requestNotify() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }

  /* ---------- Splash and routing ---------- */
  function runSplash() {
    const word = $('#splash-word');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    word.innerHTML = '';
    'Studiness'.split('').forEach((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.animationDelay = (reduce ? 0 : i * 0.1) + 's';
      word.appendChild(s);
    });
    showView('splash');
    setTimeout(() => {
      localStorage.setItem(KEY.intro, '1');
      route();
    }, reduce ? 800 : 3200);
  }

  function route() {
    const email = store.get(KEY.session, null);
    if (email) enterApp(email);
    else showView('landing');
  }

  function enterApp(email) {
    const acc = store.get(KEY.accounts, {})[email];
    if (!acc) { store.del(KEY.session); showView('landing'); return; }

    user = { email, name: acc.name };
    data = Object.assign({ sessions: [], progress: {}, tasks: [] }, store.get(dataKey(email), {}));
    $('#hello').textContent = 'Hi, ' + user.name;

    if (timer.running && timer.email !== email) timer = blankTimer(); // অন্য user-এর timer
    if (timer.running) timerSel = { subject: timer.subject, chapter: timer.chapter };

    // Page বন্ধ থাকার সময় timer শেষ হয়ে গেলে session save করা হবে
    if (timer.running && Date.now() >= timer.target) {
      if (timer.phase === 'focus') recordSession(FOCUS, timer.startedAt, timer.subject, timer.chapter);
      toast('Your timer finished while the app was closed.');
      resetTimer();
    }

    showView('app');
    showTab('main');
  }

  function logout() {
    if (timer.running) stopTimer();
    store.del(KEY.session);
    user = null;
    data = null;
    showView('landing');
  }

  /* ---------- Auth ---------- */
  function setAuthMode(m) {
    authMode = m;
    $$('.seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    $('#name-wrap').hidden = m !== 'register';
    $('#f-name').required = m === 'register';
    $('#auth-submit').textContent = m === 'login' ? 'Log in' : 'Create account';
    $('#auth-msg').textContent = '';
  }

  async function hash(text) {
    if (!window.crypto || !crypto.subtle) throw new Error('This page must be opened over https or localhost.');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Google Form-এ login/register event পাঠায়। Form সেট না করা থাকলে কিছু করে না।
  function notifyForm(event, name, email) {
    if (!CONFIG.LOGIN_FORM_ACTION || CONFIG.LOGIN_FORM_ACTION.includes('YOUR_')) return;
    const f = CONFIG.LOGIN_FORM_FIELDS;
    const body = new URLSearchParams();
    body.append(f.event, event);
    body.append(f.name, name);
    body.append(f.email, email);
    body.append(f.time, new Date().toISOString());
    fetch(CONFIG.LOGIN_FORM_ACTION, { method: 'POST', mode: 'no-cors', body }).catch(() => {});
  }

  async function submitAuth(e) {
    e.preventDefault();
    const msg = $('#auth-msg');
    msg.textContent = '';
    const name = $('#f-name').value.trim();
    const email = $('#f-email').value.trim().toLowerCase();
    const pass = $('#f-pass').value;

    if (pass.length < 6) { msg.textContent = 'Password must be at least 6 characters.'; return; }

    try {
      const accounts = store.get(KEY.accounts, {});
      const h = await hash(pass);

      if (authMode === 'register') {
        if (!name) { msg.textContent = 'Please enter your name.'; return; }
        if (accounts[email]) { msg.textContent = 'This email is already registered. Please log in.'; return; }
        accounts[email] = { name, hash: h };
        store.set(KEY.accounts, accounts);
        notifyForm('register', name, email);
      } else {
        const acc = accounts[email];
        if (!acc || acc.hash !== h) { msg.textContent = 'Wrong email or password.'; return; }
        notifyForm('login', acc.name, email);
      }

      store.set(KEY.session, email);
      e.target.reset();
      enterApp(email);
    } catch (err) {
      msg.textContent = err.message;
    }
  }

  /* ---------- Tabs ---------- */
  function showTab(name) {
    currentTab = name;
    $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    const renderers = { main: renderMain, timer: renderTimer, planner: renderPlanner, stats: renderStats };
    renderers[name]();
  }

  /* ---------- Main tab ---------- */
  function renderMain() {
    const subj = findSubject(mainSubject);
    const done = subj.chapters.filter((c) => data.progress[c[0]]).length;
    const pct = Math.round((done / subj.chapters.length) * 100);

    $('#content').innerHTML = `
      <div class="card row between dim">
        <div><h3 style="margin:0">Mock Test</h3><p class="muted small" style="margin:4px 0 0">Practice exams by chapter</p></div>
        <span class="badge">Coming soon</span>
      </div>
      <div class="chips">
        ${SUBJECTS.map((s) => `<button class="chip ${s.key === mainSubject ? 'on' : ''}" data-subject="${s.key}">${s.name}</button>`).join('')}
      </div>
      <div class="card">
        <div class="row between small"><span class="muted">${subj.name} progress</span><b>${pct}%</b></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
      <ul class="list">
        ${subj.chapters.map(([k, n]) => `
          <li class="card item">
            <label class="row gap">
              <input type="checkbox" data-chapter="${k}" ${data.progress[k] ? 'checked' : ''} />
              <span class="${data.progress[k] ? 'done' : ''}">${esc(n)}</span>
            </label>
          </li>`).join('')}
      </ul>`;

    $$('[data-subject]').forEach((b) => { b.onclick = () => { mainSubject = b.dataset.subject; renderMain(); }; });
    $$('[data-chapter]').forEach((cb) => {
      cb.onchange = () => { data.progress[cb.dataset.chapter] = cb.checked; persist(); renderMain(); };
    });
  }

  /* ---------- Timer tab ---------- */
  function resetTimer() {
    timer = blankTimer();
    persistTimer();
  }

  function recordSession(seconds, startedMs, subject, chapter) {
    if (!user || !chapter || seconds <= 0) return;
    data.sessions.push({
      subject,
      chapter,
      seconds,
      date: dateKey(new Date(startedMs)),
      started: new Date(startedMs).toISOString(),
    });
    persist();
  }

  function startTimer() {
    if (!timerSel.subject || !timerSel.chapter) { toast('Select a subject and chapter first.'); return; }
    requestNotify();
    const now = Date.now();
    timer = {
      running: true, phase: 'focus', target: now + FOCUS * 1000, startedAt: now,
      subject: timerSel.subject, chapter: timerSel.chapter, cycles: 0, email: user.email,
    };
    persistTimer();
    renderTimer();
  }

  function stopTimer() {
    if (timer.running && timer.phase === 'focus') {
      const elapsed = Math.min(FOCUS, Math.floor((Date.now() - timer.startedAt) / 1000));
      if (elapsed >= MIN_SAVE) {
        recordSession(elapsed, timer.startedAt, timer.subject, timer.chapter);
        toast(`Saved ${fmtDur(elapsed)} of study.`);
      }
    }
    resetTimer();
    if (currentTab === 'timer') renderTimer();
  }

  function finishPhase() {
    if (timer.phase === 'focus') {
      recordSession(FOCUS, timer.startedAt, timer.subject, timer.chapter);
      timer.cycles += 1;
      timer.phase = 'break';
      timer.target = Date.now() + BREAK * 1000;
      timer.startedAt = Date.now();
      notify('Focus session done. Take a 5 minute break.');
    } else {
      timer.phase = 'focus';
      timer.target = Date.now() + FOCUS * 1000;
      timer.startedAt = Date.now();
      notify('Break over. Back to focus.');
    }
    persistTimer();
    if (currentTab === 'timer') renderTimer();
  }

  function paintTimer() {
    const time = $('#t-time');
    if (!time) return;
    const total = timer.phase === 'focus' ? FOCUS : BREAK;
    if (!timer.running) {
      time.textContent = mmss(FOCUS);
      $('#t-ring').style.background = 'conic-gradient(#6366f1 0%, var(--track) 0)';
      $('#t-phase').textContent = 'Focus';
      $('#t-cycles').textContent = '0';
      return;
    }
    const left = Math.max(0, Math.ceil((timer.target - Date.now()) / 1000));
    const color = timer.phase === 'focus' ? '#6366f1' : '#10b981';
    time.textContent = mmss(left);
    $('#t-ring').style.background = `conic-gradient(${color} ${((total - left) / total) * 100}%, var(--track) 0)`;
    $('#t-phase').textContent = timer.phase === 'focus' ? 'Focus' : 'Break';
    $('#t-cycles').textContent = String(timer.cycles);
  }

  function tick() {
    if (!timer.running) return;
    if (Date.now() >= timer.target) finishPhase();
    else paintTimer();
  }

  function renderTimer() {
    const r = timer.running;
    const subj = findSubject(timerSel.subject);
    $('#content').innerHTML = `
      <div class="card stack">
        <select id="t-subject" class="input" ${r ? 'disabled' : ''}>
          <option value="">Select subject</option>
          ${SUBJECTS.map((s) => `<option value="${s.key}" ${s.key === timerSel.subject ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <select id="t-chapter" class="input" ${r || !subj ? 'disabled' : ''}>
          <option value="">Select chapter</option>
          ${subj ? subj.chapters.map(([k, n]) => `<option value="${k}" ${k === timerSel.chapter ? 'selected' : ''}>${esc(n)}</option>`).join('') : ''}
        </select>
      </div>
      <div class="card center stack big">
        <p class="muted small upper" id="t-phase">Focus</p>
        <div class="ring" id="t-ring"><div class="ring-in"><span id="t-time">${mmss(FOCUS)}</span></div></div>
        <p class="muted small">Completed focus sessions: <b id="t-cycles">${timer.cycles}</b></p>
        ${r
          ? '<button id="t-stop" class="btn-ghost">Stop and save</button>'
          : '<button id="t-start" class="btn-primary">Start</button>'}
      </div>
      <p class="muted small">Stop চাপলে অন্তত ১ মিনিট পড়া হলে তা সংরক্ষিত হবে। Timer এখানে বন্ধ হলেও পরে ফিরে এলে চলতে থাকবে।</p>`;

    $('#t-subject').onchange = (e) => { timerSel = { subject: e.target.value, chapter: '' }; renderTimer(); };
    $('#t-chapter').onchange = (e) => { timerSel.chapter = e.target.value; };
    const startBtn = $('#t-start'); if (startBtn) startBtn.onclick = startTimer;
    const stopBtn = $('#t-stop'); if (stopBtn) stopBtn.onclick = stopTimer;
    paintTimer();
  }

  /* ---------- Planner tab ---------- */
  function taskHtml(t) {
    const link = t.chapter ? ` · ${chapterLabel(t.chapter)}` : '';
    return `
      <div class="card item row gap">
        <input type="checkbox" data-tk-toggle="${t.id}" ${t.done ? 'checked' : ''} />
        <div class="grow">
          <p class="${t.done ? 'done' : ''}" style="margin:0">${esc(t.title)}</p>
          <p class="muted small" style="margin:4px 0 0">${t.start} to ${t.end}${esc(link)}</p>
        </div>
        <button class="link-btn danger" data-tk-del="${t.id}">Delete</button>
      </div>`;
  }

  function renderPlanner() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    const todayKey = dateKey(new Date());
    const cells = Array(calMonth.getDay()).fill('<span></span>');
    for (let d = 1; d <= count; d++) {
      const key = dateKey(new Date(y, m, d));
      const has = data.tasks.some((t) => t.start <= key && key <= t.end);
      cells.push(`<button class="day ${key === calSel ? 'on' : ''} ${key === todayKey ? 'today' : ''}" data-day="${key}">${d}${has ? '<i class="dot"></i>' : ''}</button>`);
    }
    const dayTasks = data.tasks.filter((t) => t.start <= calSel && calSel <= t.end);
    const monthLabel = calMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    $('#content').innerHTML = `
      <div class="card stack">
        <div class="row between">
          <button class="link-btn" id="cal-prev">‹</button>
          <b>${monthLabel}</b>
          <button class="link-btn" id="cal-next">›</button>
        </div>
        <div class="grid7 small muted">${WEEK.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="grid7">${cells.join('')}</div>
      </div>

      <h3 class="small muted" style="margin:0">Tasks on ${calSel}</h3>
      <div class="stack">
        ${dayTasks.length ? dayTasks.map(taskHtml).join('') : '<p class="muted small">No tasks for this day.</p>'}
      </div>

      <form id="task-form" class="card stack">
        <h3 style="margin:0">Add task</h3>
        <input id="tk-title" class="input" placeholder="Task name" required />
        <div class="grid2">
          <select id="tk-subject" class="input">
            <option value="">Subject (optional)</option>
            ${SUBJECTS.map((s) => `<option value="${s.key}">${s.name}</option>`).join('')}
          </select>
          <select id="tk-chapter" class="input" disabled>
            <option value="">Chapter (optional)</option>
          </select>
        </div>
        <div class="grid2">
          <label class="small muted stack" style="gap:4px">From<input id="tk-start" type="date" class="input" value="${calSel}" required /></label>
          <label class="small muted stack" style="gap:4px">To<input id="tk-end" type="date" class="input" value="${calSel}" required /></label>
        </div>
        <button class="btn-primary" type="submit">Save task</button>
      </form>`;

    $$('[data-day]').forEach((b) => { b.onclick = () => { calSel = b.dataset.day; renderPlanner(); }; });
    $('#cal-prev').onclick = () => { calMonth = new Date(y, m - 1, 1); renderPlanner(); };
    $('#cal-next').onclick = () => { calMonth = new Date(y, m + 1, 1); renderPlanner(); };

    $('#tk-subject').onchange = (e) => {
      const s = findSubject(e.target.value);
      const sel = $('#tk-chapter');
      sel.innerHTML = '<option value="">Chapter (optional)</option>' +
        (s ? s.chapters.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('') : '');
      sel.disabled = !s;
    };
    $('#task-form').onsubmit = (e) => { e.preventDefault(); addTask(); };
    $$('[data-tk-toggle]').forEach((c) => {
      c.onchange = () => {
        const t = data.tasks.find((x) => x.id === c.dataset.tkToggle);
        if (t) { t.done = c.checked; persist(); renderPlanner(); }
      };
    });
    $$('[data-tk-del]').forEach((b) => {
      b.onclick = () => { data.tasks = data.tasks.filter((x) => x.id !== b.dataset.tkDel); persist(); renderPlanner(); };
    });
  }

  function addTask() {
    const title = $('#tk-title').value.trim();
    const subject = $('#tk-subject').value;
    const chapter = $('#tk-chapter').value;
    const start = $('#tk-start').value;
    const end = $('#tk-end').value;
    if (!title) return;
    if (end < start) { toast('End date must be the same or after start date.'); return; }
    data.tasks.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title, subject, chapter, start, end, done: false,
    });
    persist();
    toast('Task saved');
    renderPlanner();
  }

  /* ---------- Stats tab ---------- */
  function statCard(label, value, hint) {
    return `<div class="card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>${hint ? `<div class="stat-hint">${hint}</div>` : ''}</div>`;
  }

  function renderStats() {
    if (!data.sessions.length) {
      $('#content').innerHTML = `<div class="card center muted">এখনো কোনো study session নেই। Timer tab থেকে একটি session শুরু করুন।</div>`;
      return;
    }

    const perDay = {}, perChap = {};
    const monthPrefix = dateKey(new Date()).slice(0, 7);
    let monthTotal = 0;
    for (const s of data.sessions) {
      perDay[s.date] = (perDay[s.date] || 0) + s.seconds;
      perChap[s.chapter] = (perChap[s.chapter] || 0) + s.seconds;
      if (s.date.startsWith(monthPrefix)) monthTotal += s.seconds;
    }
    const sumDays = (from, to) => { let t = 0; for (let i = from; i <= to; i++) t += perDay[daysAgo(i)] || 0; return t; };
    const today = perDay[daysAgo(0)] || 0;
    const thisWeek = sumDays(0, 6);
    const lastWeek = sumDays(7, 13);
    const delta = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    let streak = 0;
    let off = today > 0 ? 0 : 1;
    while ((perDay[daysAgo(off)] || 0) > 0) { streak++; off++; }

    const trend = [];
    for (let i = 13; i >= 0; i--) trend.push({ day: daysAgo(i), min: Math.round((perDay[daysAgo(i)] || 0) / 60) });
    const maxMin = Math.max(1, ...trend.map((t) => t.min));

    const subj = findSubject(statSubject);
    const doneCount = subj.chapters.filter((c) => data.progress[c[0]]).length;
    const pct = Math.round((doneCount / subj.chapters.length) * 100);
    const chapRows = subj.chapters.map(([k, n]) => ({ n, sec: perChap[k] || 0 }));
    const maxSec = Math.max(1, ...chapRows.map((c) => c.sec));

    const weakest = SUBJECTS
      .flatMap((s) => s.chapters.map(([k, n]) => ({ subject: s.name, n, sec: perChap[k] || 0 })))
      .sort((a, b) => a.sec - b.sec)
      .slice(0, 5);

    $('#content').innerHTML = `
      <div class="stat-grid">
        ${statCard('Today', fmtDur(today))}
        ${statCard('This week', fmtDur(thisWeek), delta === null ? 'No data last week' : `${delta >= 0 ? '+' : ''}${delta}% vs last week`)}
        ${statCard('This month', fmtDur(monthTotal))}
        ${statCard('Study streak', `${streak} day${streak === 1 ? '' : 's'}`)}
      </div>

      <div class="card stack">
        <h3 style="margin:0">Last 14 days (minutes)</h3>
        <div class="trend">
          ${trend.map((t) => `<div class="col" title="${t.day}: ${t.min} min"><i style="height:${(t.min / maxMin) * 100}%"></i></div>`).join('')}
        </div>
        <div class="trend-axis"><span>${trend[0].day.slice(5)}</span><span>${trend[13].day.slice(5)}</span></div>
      </div>

      <div class="chips">
        ${SUBJECTS.map((s) => `<button class="chip ${s.key === statSubject ? 'on' : ''}" data-stat="${s.key}">${s.name}</button>`).join('')}
      </div>

      <div class="card donut-row">
        <div class="donut" style="background:conic-gradient(#10b981 ${pct}%, var(--track) 0)"><span>${pct}%</span></div>
        <div>
          <p class="muted small" style="margin:0">${subj.name} syllabus</p>
          <p style="font-size:1.5rem;font-weight:700;margin:4px 0">${doneCount} / ${subj.chapters.length}</p>
          <p class="muted small" style="margin:0">chapters completed</p>
        </div>
      </div>

      <div class="card stack">
        <h3 style="margin:0">Time per chapter</h3>
        ${chapRows.map((c) => `
          <div class="hbar-row">
            <span>${esc(c.n)}</span>
            <div class="hbar"><i style="width:${(c.sec / maxSec) * 100}%"></i></div>
            <span>${fmtDur(c.sec)}</span>
          </div>`).join('')}
      </div>

      <div class="card stack">
        <h3 style="margin:0">Needs attention (least time)</h3>
        ${weakest.map((c) => `<div class="row between small"><span>${esc(c.subject)} · ${esc(c.n)}</span><span class="muted">${fmtDur(c.sec)}</span></div>`).join('')}
      </div>`;

    $$('[data-stat]').forEach((b) => { b.onclick = () => { statSubject = b.dataset.stat; renderStats(); }; });
  }

  /* ---------- Init ---------- */
  function init() {
    $$('[data-feedback]').forEach((a) => {
      a.href = CONFIG.FEEDBACK_FORM_URL;
      a.target = '_blank';
      a.rel = 'noopener';
    });
    $$('[data-go]').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.dataset.go === 'auth') setAuthMode(el.dataset.mode || 'login');
        showView(el.dataset.go);
      });
    });
    $$('.seg-btn').forEach((b) => b.addEventListener('click', () => setAuthMode(b.dataset.mode)));
    $('#auth-form').addEventListener('submit', submitAuth);
    $$('.tabbar button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('#logout').addEventListener('click', logout);

    timer = Object.assign(blankTimer(), store.get(KEY.timer, {}));
    setInterval(tick, 250);

    if (!localStorage.getItem(KEY.intro)) runSplash();
    else route();
  }

  init();
})();
