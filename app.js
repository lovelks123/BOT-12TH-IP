// ------------ CONFIG ------------
const EXEC_URL =
  "https://script.google.com/macros/s/AKfycbxJrBmPChrrsT2QhNlH7QAYZu_flZ1qWs0pvnvg8ZGP7RKOJu35SyMaJkue7JkODG36yw/exec";
// --------------------------------

// JSONP loader
function jsonp(url, cbName, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch { window[cbName] = undefined; }
      document.getElementById(cbName)?.remove();
    }

    window[cbName] = (data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(data);
    };

    const s = document.createElement("script");
    s.id = cbName;
    s.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cbName}&_t=${Date.now()}`;
    s.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP load error"));
    };

    document.body.appendChild(s);
  });
}

const cb = p => `${p}_${Math.random().toString(36).slice(2, 9)}`;

// ---- DOM refs (safe) ----
const unitSel    = document.getElementById('unitSelect');
const chapterSel = document.getElementById('chapterSelect');
const listBox    = document.getElementById('questionList');
const askBtn     = document.getElementById('askBtn');
const askInput   = document.getElementById('studentQuestion');
const resultCard = document.getElementById('resultArea');
const confEl     = document.getElementById('confidence');
const ansEl      = document.getElementById('answerText');
const msgEl      = document.getElementById('message');

function showError(msg) {
  console.error(msg);
  msgEl.textContent = msg;
}
function setMessage(t="") { msgEl.textContent = t; }
function enable(el, on) {
  el.disabled = !on;
  el.classList.toggle("disabled", !on);
}
function clearSelect(sel, placeholder) {
  sel.innerHTML = `<option disabled selected>${placeholder}</option>`;
}

// ---------------- LOADERS ----------------
async function loadUnits() {
  try {
    setMessage("Loading units...");
    clearSelect(unitSel, "— Choose a unit —");
    clearSelect(chapterSel, "— Choose a unit first —");
    enable(chapterSel, false);
    enable(askBtn, false);
    resultCard.style.display = "none";

    const res = await jsonp(`${EXEC_URL}?action=units`, cb("u"));
    (res.units || []).forEach(u => {
      const o = document.createElement("option");
      o.value = o.textContent = u;
      unitSel.appendChild(o);
    });
    setMessage("");
  } catch (e) { showError(e.message); }
}

async function loadChapters(unit) {
  try {
    setMessage("Loading chapters...");
    clearSelect(chapterSel, "— Choose a chapter —");
    enable(chapterSel, true);
    enable(askBtn, false);

    const res = await jsonp(
      `${EXEC_URL}?action=chapters&unit=${encodeURIComponent(unit)}`,
      cb("c")
    );

    (res.chapters || []).forEach(c => {
      const o = document.createElement("option");
      o.value = o.textContent = c;
      chapterSel.appendChild(o);
    });
    setMessage("");
  } catch (e) { showError(e.message); }
}

async function loadQuestions(unit, chapter) {
  try {
    setMessage("Loading questions...");
    listBox.innerHTML = "";

    const res = await jsonp(
      `${EXEC_URL}?action=questions&unit=${encodeURIComponent(unit)}&chapter=${encodeURIComponent(chapter)}`,
      cb("q")
    );

    (res.questions || []).forEach(q => {
      const w = document.createElement("div");
      const qu = document.createElement("div");
      const an = document.createElement("div");

      qu.textContent = q.question;
      qu.className = "qitem";
      an.textContent = q.answer || "(No answer)";
      an.className = "qanswer hidden";

      qu.onclick = () => an.classList.toggle("hidden");

      w.append(qu, an);
      listBox.appendChild(w);
    });
    setMessage("");
  } catch (e) { showError(e.message); }
}

async function ask() {
  try {
    if (!askInput.value.trim()) return showError("Type a question.");
    setMessage("Searching...");
    const res = await jsonp(
      `${EXEC_URL}?action=ask&unit=${unitSel.value}&chapter=${chapterSel.value}&question=${encodeURIComponent(askInput.value)}`,
      cb("a")
    );
    resultCard.style.display = "block";
    confEl.textContent = `Confidence: ${res.score || 0}%`;
    ansEl.textContent = res.answer || "No answer.";
    setMessage("");
  } catch (e) { showError(e.message); }
}

// ---- events ----
unitSel.onchange = e => loadChapters(e.target.value);
chapterSel.onchange = () => loadQuestions(unitSel.value, chapterSel.value);
askBtn.onclick = ask;

// ---- boot ----
loadUnits();
