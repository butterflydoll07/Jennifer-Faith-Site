async function getVerse() {
  const ref = document.getElementById("ref").value;
  const res = await fetch(`/api/verse?ref=${encodeURIComponent(ref)}`);
  const data = await res.json();
  document.getElementById("verse").textContent = data.text || JSON.stringify(data);
}

async function saveJournal() {
  const text = document.getElementById("journalText").value;
  const res = await fetch("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  if (data.entry) {
    const li = document.createElement("li");
    li.textContent = data.entry.text + " (" + data.entry.at + ")";
    document.getElementById("journalList").prepend(li);
    document.getElementById("journalText").value = "";
  } else {
    alert(JSON.stringify(data));
  }
}

async function runCheck() {
  const text = document.getElementById("checkText").value;
  const res = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  document.getElementById("checkResult").textContent = JSON.stringify(data, null, 2);
}

async function genWeekHTML() {
  const week = document.getElementById("weekNum").value;
  const theme = document.getElementById("weekTheme").value;
  const refs = document.getElementById("weekRefs").value.split(",").map(r => r.trim());

  const res = await fetch("/api/printables/week", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week, theme, refs })
  });
  const html = await res.text();
  document.getElementById("preview").srcdoc = html;
}

async function genWeekPDF() {
  const week = document.getElementById("weekNum").value;
  const theme = document.getElementById("weekTheme").value;
  const refs = document.getElementById("weekRefs").value.split(",").map(r => r.trim());

  const res = await fetch("/api/printables/week.pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week, theme, refs })
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

// Bind buttons
document.getElementById("btn-verse").onclick = getVerse;
document.getElementById("btn-save").onclick = saveJournal;
document.getElementById("btn-check").onclick = runCheck;
document.getElementById("btn-week-html").onclick = genWeekHTML;
document.getElementById("btn-week-pdf").onclick = genWeekPDF;
