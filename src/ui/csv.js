import { histOf, me, save, statsOf } from "../core/db.js";
import { toast } from "../core/dom.js";
import { renderProgress } from "./progress.js";

/* ---------- CSV in / out (same columns as the old Streamlit trainer) ---------- */
export function exportCSV(){
  const p = me(), h = histOf(p.id);
  if (!h.length){ toast("No rounds to save yet."); return; }
  const rows = [["Timestamp","Accuracy","AvgTime","Questions","Operation","Mode"]];
  h.forEach(r => rows.push([
    new Date(r.ts).toISOString().slice(0, 19).replace("T", " "),
    r.acc.toFixed(2), r.avgTime.toFixed(2), r.n, r.ops, r.style
  ]));
  const csv = rows.map(r => r.join(",")).join("\n");
  const name = `math_history_${p.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.csv`;
  saveFile(name, csv);
}
// Published on claude.ai the viewer mediates saves; opened as a local file a
// plain anchor is all there is. Try the first, fall back to the second.
async function saveFile(name, text){
  try {
    const dl = await window.claude?.use?.("downloads");
    if (dl){ await dl.save({ filename:name, data:text }); return; }
  } catch { return; }                       // viewer declined — nothing more to do
  try {
    const url = URL.createObjectURL(new Blob([text], { type:"text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    toast("This browser would not let the page save a file.");
  }
}
export function importCSV(file){
  const fr = new FileReader();
  fr.onload = () => {
    const lines = String(fr.result).trim().split(/\r?\n/);
    const head = lines.shift().split(",").map(s => s.trim());
    const col = n => head.indexOf(n);
    if (col("Timestamp") < 0 || col("Accuracy") < 0){ toast("That file is not a maths history CSV."); return; }
    const h = histOf(me().id);
    const known = new Set(h.map(r => r.ts));
    let added = 0;
    lines.forEach(line => {
      const c = line.split(",");
      if (c.length < 4) return;
      const ts = new Date(c[col("Timestamp")].trim().replace(" ", "T")).toISOString();
      if (known.has(ts)) return;
      known.add(ts);
      h.push({
        ts,
        acc: +(+c[col("Accuracy")] || 0).toFixed(2),
        avgTime: +(+c[col("AvgTime")] || 0).toFixed(2),
        n: +c[col("Questions")] || 0,
        ops: (c[col("Operation")] || "+").trim().replace(/addition/i, "+").replace(/subtraction/i, "−").replace(/both/i, "+−"),
        range: "10",
        style: (c[col("Mode")] || "mixed").trim()
      });
      added++;
    });
    h.sort((a, b) => a.ts.localeCompare(b.ts));
    const st = statsOf(me().id);
    st.questions = h.reduce((a, r) => a + r.n, 0);
    save(); renderProgress();
    toast(`Loaded ${added} older round${added === 1 ? "" : "s"} for ${me().name}.`);
  };
  fr.readAsText(file);
}

