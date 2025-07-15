import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";
document.addEventListener("DOMContentLoaded", function () {
  console.log("Spinner element:", document.getElementById("loading"));
  loadRoadmapHistory();
  document.getElementById("submitBtn").addEventListener("click", getRoadmap);
});
// 🔧 Convert messy milestone paragraphs into structured bullets
function formatMilestones(rawText) {
  const lines = rawText.split("\n").filter(line => line.trim().startsWith("*"));
  let html = `<h4 style="color:#34A853;">📍 High-Level Milestones</h4><ol style="padding-left:1.2rem;">`;
  lines.forEach((line, idx) => {
    const [title, ...rest] = line.replace(/^\*\s*/, "").split(":");
    const phaseTitle = title.trim();
    const subpoints = rest.join(":").split(/\. (?=[A-Z])/);
    html += `<li><strong>${phaseTitle}</strong><ul style="margin-top:0.2rem;">`;
    subpoints.forEach(point => {
      if (point.trim()) {
        html += `<li>${point.trim().replace(/\.$/, "")}</li>`;
      }
    });
    html += `</ul></li>`;
  });
  html += `</ol>`;
  return html;
}
// 🧩 Format roadmap sections for display (used for both output & history)
function formatRoadmapContent(text) {
  let content = text;
  // Motivation section
  content = content.replace(/^Motivational Line\/CTA:\s*(.*)$/gim, '<h4 style="color:#EA4335;">🚀 Motivation / Call To Action</h4><p>$1</p>');
  // Tag sections with emoji and clean styling
  content = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\*\s*(.+)/gm, '<ul><li>$1</li></ul>')
    .replace(/Suggested tech stack:/i, '<h4 style="color:#6CA0DC; border-bottom:2px solid #A4C2F4; padding-bottom:4px; margin-bottom:8px;">🧪 Suggested Tech Stack</h4>')
    .replace(/Optional collaborators:/i, '<h4 style="color:#6CA0DC; border-bottom:2px solid #A4C2F4; padding-bottom:4px; margin-bottom:8px;">🧠 Optional Collaborators</h4>')
    .replace(/Project Title:/i, '<h4 style="color:#6CA0DC; border-bottom:2px solid #A4C2F4; padding-bottom:4px; margin-bottom:8px;">📌 Project Title</h4>')
    .replace(/(High-level milestones|3–5 high-level milestones):?/i, '<h4 style="color:#6CA0DC; border-bottom:2px solid #A4C2F4; padding-bottom:4px; margin-bottom:8px;">📍 High-Level Milestones</h4>')
    .replace(/^(Motivational Line\/CTA|CTA|Call to action|Motivational message):?\s*(.*)$/gim, '<h4 style="color:#6CA0DC; border-bottom:2px solid #A4C2F4; padding-bottom:4px; margin-bottom:8px;">🚀 Motivation / Call To Action</h4><p>$2</p>')
    //.replace(/^Motivational Line\/CTA:\s*(.*)$/gim, '<h4 style="color:#6CA0DC; border-bottom:2px solid #A4C2F4; padding-bottom:4px; margin-bottom:8px;">🚀 Motivation / Call To Action</h4><p>$1</p>')
    //.replace(/Project Title:/i, '<h4 style="color:#4285F4;">📌 Project Title</h4>')
    //.replace(/Suggested tech stack:/i, '<h4 style="color:#3367D6;">🧪 Suggested Tech Stack</h4>')
    //.replace(/Optional collaborators:/i, '<h4 style="color:#FBBC05;">🧠 Optional Collaborators</h4>')
    //.replace(/(High-level milestones|3–5 high-level milestones):?/i, '<h4 style="color:#34A853;">📍 High-Level Milestones</h4>');
  // Format milestone section with indentation
  content = content.replace(/<h4 style="color:#34A853;">📍 High-Level Milestones<\/h4><br>([\s\S]*?)<h4/g, (match, bullets) => {
    return `${formatMilestones(bullets)}<h4`;
  });
  // Handle final formatting cleanup
  content = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return content;
}
function formatRoadmapEntry(data) {
  const structuredContent = formatRoadmapContent(data.roadmap);
  return `
    <div style="margin-bottom:1.5rem; padding:1rem; border:1px solid #dadce0; border-radius:8px; background:#fefefe; box-shadow:0 1px 3px rgba(0,0,0,0.1); font-family:Roboto, sans-serif;">
      <strong>💡 ${data.idea}</strong><br>
      <small style="color:#5f6368;">${new Date(data.timestamp).toLocaleString()}</small><br>
      <details style="margin-top:0.5rem;">
        <summary style="cursor:pointer; color:#4285F4; font-weight:bold;">View roadmap</summary>
        <div style="margin-top:0.8rem; font-size:0.95rem; line-height:1.6;">
          ${structuredContent}
        </div>
      </details>
    </div>
  `;
}
async function saveToFirestore(idea, roadmap) {
  try {
    const docRef = await addDoc(collection(window.db, "roadmaps"), {
      idea: idea,
      roadmap: roadmap,
      timestamp: new Date().toISOString()
    });
    console.log("Saved to Firestore:", docRef.id);
  } catch (error) {
    console.error("Error saving to Firestore:", error);
  }
}
async function loadRoadmapHistory() {
  const historyContainer = document.getElementById("historyList");
  historyContainer.innerHTML = "<em>Loading history...</em>";
  try {
    const q = query(collection(window.db, "roadmaps"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    let output = "";
    snapshot.forEach(doc => {
      output += formatRoadmapEntry(doc.data());
    });
    historyContainer.innerHTML = output || "<em>No roadmaps saved yet.</em>";
  } catch (err) {
    console.error("Error loading history:", err);
    historyContainer.innerHTML = `<div style="color:#EA4335;">⚠️ Failed to load history.</div>`;
  }
}
async function getRoadmap() {
  const ideaText = document.getElementById("ideaInput").value.trim();
  if (!ideaText) {
    document.getElementById("output").innerHTML = `<div style="color:#EA4335;">⚠️ Please enter your idea first!</div>`;
    return;
  }
  document.getElementById("loading").style.display = "block";
  document.getElementById("output").innerHTML = "";
  const prompt = `
    You are an AI assistant helping a student turn a vague project idea into an actionable roadmap.
    When the user says: "${ideaText}"
    You should return:
    - A project title
    - 3–5 high-level milestones
    - Suggested tech stack (frontend, backend, tools)
    - Optional collaborators (e.g., design, content, psychology student)
    - A motivational line or CTA at the end
    Use clear formatting and bullet points.
  `;
  const apiKey = "AIzaSyCQJhhd_tuau9lUmrLKwNosOiVEB9bZLbQ";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });
    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    document.getElementById("loading").style.display = "none";
    if (!resultText.trim()) {
      document.getElementById("output").innerHTML = `
        <div style="color:#EA4335;">
          Hmm... Gemini didn’t respond. Try again in a minute or simplify your idea!
        </div>
      `;
      return;
    }
    const formattedBlock = formatRoadmapEntry({
      idea: ideaText,
      roadmap: resultText,
      timestamp: new Date().toISOString()
    });
    document.getElementById("output").innerHTML = `
      <h3 style="color:#4285F4; font-size:1.4rem; margin-bottom:0.5rem;">🧠 Generated Roadmap</h3>
      ${formattedBlock}
    `;
    await saveToFirestore(ideaText, resultText);
    await loadRoadmapHistory();
  } catch (error) {
    console.error("Error fetching Gemini response:", error);
    document.getElementById("loading").style.display = "none";
    document.getElementById("output").innerText = "⚠️ Failed to generate roadmap. Try again!";
  }
}