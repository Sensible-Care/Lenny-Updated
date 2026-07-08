const SNAP_BASE  = "https://user.snapforms.com.au/api";
const SNAP_AUTH  = "https://user.snapforms.com.au/oauth/token";
const CLIENT_ID  = "3864";
const FORM_SLUG  = "sensible-care---hcp-initial-assessment-and-care-plan";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Safely extract a string value from any answer format:
//   - plain string  → returned as-is
//   - field table   → [{row:1, data:[{fieldname,fieldvalue}]}] → all fieldvalues joined
//   - anything else → String()
function extractAnswerStr(answer) {
  if (answer == null) return "";
  if (typeof answer === "string") return answer;
  if (Array.isArray(answer)) {
    // Field table format from Snapforms
    return answer
      .map(row => {
        if (row && Array.isArray(row.data)) {
          return row.data.map(d => (d.fieldvalue != null ? String(d.fieldvalue) : "")).join(" ");
        }
        return String(row || "");
      })
      .join(" ");
  }
  return String(answer);
}

async function getBearerToken(env) {
  const res = await fetch(SNAP_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type:    "password",
      client_id:     CLIENT_ID,
      client_secret: env.SNAP_CLIENT_SECRET,
      username:      env.SNAP_USERNAME,
      password:      env.SNAP_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("Failed to get Snapforms token: " + (data.message || data.error || res.status));
  }
  return data.access_token;
}

function parseRecordKey(key) {
  const dobMatch = key.match(/\d{2}\/\d{2}\/\d{4}/);
  const dob = dobMatch ? dobMatch[0] : null;
  const name = key
    .replace(/\bIACP\b/gi, "")
    .replace(/\d{2}\/\d{2}\/\d{4}/g, "")
    .replace(/^[-\s]+|[-\s]+$/g, "")
    .replace(/--+/g, "-")
    .trim();
  return { name, dob };
}

// Normalise a DOB string for comparison — strips leading zeros from day/month
function normDobStr(s) {
  return s.replace(/\b0(\d)\//g, "$1/").toLowerCase().trim();
}

// Normalise whitespace — collapses multiple spaces/tabs into one, trims ends
function normWS(s) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// Column names for the Section 47 Assessment & Care Review field table.
// Used when the table has no existing rows (first-ever review entry).
const REVIEW_COLUMNS = ["Date", "Staff Initial", "Section"];

// Fallback checkbox question names for "Are there any Identified Risks?" per section.
// These are used when the checkbox field is not found in the existing form answers
// (e.g. because it was never answered and Snapforms omits null fields from the GET).
const RISKS_CHECKBOX_QUESTIONS = {
  "12. Disaster & Emergency Management":          "12. Disaster & Emergency Management: Are there any Identified Risks?",
  "20. Personal Care":                            "20. Personal Care: Are there any Identified Risks?",
  "21. Oral Hygiene":                             "21. Oral Hygiene: Are there any Identified Risks?",
  "22. Toileting & Continence":                   "22. Toileting & Continence: Are there any Identified Risks?",
  "23. Mobility & Transfers":                     "23. Mobility & Transfers: Are there any Identified Risks?",
  "24. Household Tasks":                          "24. Household Tasks: Are there any Identified Risks?",
  "25. Home Environment":                         "25. Home Environment: Are there any Identified Risks?",
  "26. Communication & Sensory Care":             "26. Communication & Sensory Care: Are there any Identified Risks?",
  "27. Nutrition & Meal Planning & Preparation":  "27. Nutrition & Meal Planning & Preparation: Are there any Identified Risks?",
  "29. Clinical Care":                            "29. Clinical Care: Are there any Identified Risks?",
  "30. Medication Management":                    "30. Medication Management: Are there any Identified Risks?",
  "31. Skin Integrity":                           "31. Skin Integrity: Are there any Identified Risks?",
  "32. Foot Health":                              "32. Foot Health: Are there any Identified Risks?",
  "33. Sleep":                                    "33. Sleep: Are there any Identified Risks?",
  "34. Breathing":                                "34. Breathing: Are there any Identified Risks?",
  "37. Cognition & Mental Health":                "37. Cognition & Mental Health: Are there any Identified Risks?",
  "38. Mental Health":                            "38. Mental Health: Are there any Identified Risks?",
  "39. Carer":                                    "39. Carer: Are there any Identified Risks?",
};

// Append a new row to a Snapforms field table array.
// existingArray: [{row:1, data:[{fieldname, fieldvalue}...]}, ...]  from GET
// parts: array of string values to fill into columns in order.
// defaultColumns: column names to use when existingArray is empty (first-ever row).
// The last column absorbs any extra pipe-separated parts.
// Returns the updated array, or null if the structure is unrecognisable.
function appendFieldTableRow(existingArray, parts, defaultColumns = null) {
  if (!Array.isArray(existingArray)) return null;

  let fieldNames;
  if (existingArray.length === 0) {
    // No existing rows — bootstrap with default column structure if supplied
    if (!defaultColumns || defaultColumns.length === 0) return null;
    fieldNames = defaultColumns;
  } else {
    const template = existingArray.find(r => Array.isArray(r.data) && r.data.length > 0);
    if (!template) return null;
    fieldNames = template.data.map(d => d.fieldname || "");
  }

  const nextRowNum = existingArray.length > 0
    ? Math.max(...existingArray.map(r => Number(r.row) || 0)) + 1
    : 1;
  const newData = fieldNames.map((fn, i) => ({
    fieldname:  fn,
    fieldvalue: i < fieldNames.length - 1
      ? (parts[i] || "")
      : parts.slice(i).join(" | "),   // last column gets any leftover parts
  }));
  return [...existingArray, { row: nextRowNum, data: newData }];
}

// Scan a single answer object (which may be a field table) for name / dob signals.
// Returns { hasName, hasDob, hasKey }
function scanAnswer(a, nameLower, dob, originalKey) {
  const q        = String(a.question || "").toLowerCase().trim();
  const v        = extractAnswerStr(a.answer).toLowerCase();
  const vNorm    = normWS(v);          // whitespace-normalised answer
  const nameNorm = normWS(nameLower);  // whitespace-normalised name to find
  const normDob  = normDobStr(dob);

  let hasName = false, hasDob = false, hasKey = false;

  // --- Tier 1: question-label–specific checks ---
  if (q === "record key" || q === "record key - archived" || q.includes("record key")) {
    if (originalKey && v === originalKey.toLowerCase()) hasKey = true;
    // Also accept if the record key contains name+dob (handles extra spaces in stored key)
    if (vNorm.includes(nameNorm) && (v.includes(dob.toLowerCase()) || v.includes(normDob))) hasKey = true;
  }
  if (q === "client name" || q.includes("client name")) {
    // normWS collapses double spaces so "soheir  salib" matches "soheir salib"
    if (vNorm.includes(nameNorm)) hasName = true;
  }
  if (q === "client dob" || q.includes("client dob") || q === "dob" || q.includes("date of birth")) {
    if (v === dob.toLowerCase() || normDobStr(v) === normDob) hasDob = true;
  }

  // --- Tier 2: scan field table fieldnames (when answer is an array) ---
  if (Array.isArray(a.answer)) {
    for (const row of a.answer) {
      for (const d of (row.data || [])) {
        const fn   = String(d.fieldname  || "").toLowerCase();
        const fv   = String(d.fieldvalue || "").toLowerCase();
        const fvNorm = normWS(fv);
        if ((fn.includes("client name") || fn === "name") && fvNorm.includes(nameNorm)) hasName = true;
        if ((fn.includes("dob") || fn.includes("date of birth") || fn.includes("birth")) &&
            (fv === dob.toLowerCase() || normDobStr(fv) === normDob)) hasDob = true;
        if (fn.includes("record key") && originalKey && fv === originalKey.toLowerCase()) hasKey = true;
      }
    }
  }

  // --- Tier 3: broad fallback — name/dob appearing in ANY answer value ---
  if (vNorm.includes(nameNorm)) hasName = true;
  if (v === dob.toLowerCase() || normDobStr(v) === normDob) hasDob = true;

  return { hasName, hasDob, hasKey };
}

// Fetch one page of Snapforms responses — returns [] on any error
async function fetchPage(token, offset, limit = 100) {
  try {
    const res = await fetch(
      `${SNAP_BASE}/forms/${FORM_SLUG}/responses?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.responses || (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

// Find a response by matching Record Key answer, Client Name + Client DOB,
// or by the name/DOB appearing anywhere across all answer values.
// Pages are fetched in parallel batches to stay well within Cloudflare's timeout.
async function findResponseByNameAndDob(name, dob, token, originalKey) {
  const limit     = 100;
  const batchSize = 5;   // fetch 5 pages simultaneously = 500 responses per round
  const maxPages  = 20;  // up to 2000 responses total
  const nameLower = name.toLowerCase();

  for (let batch = 0; batch < maxPages; batch += batchSize) {
    // Fire batchSize page requests in parallel
    const offsets  = Array.from({ length: batchSize }, (_, i) => (batch + i) * limit);
    const pages    = await Promise.all(offsets.map(o => fetchPage(token, o, limit)));
    const allEmpty = pages.every(p => p.length === 0);
    if (allEmpty) break;

    for (const responses of pages) {
      for (const r of responses) {
        const answers  = r.answers || [];
        let foundName  = false;
        let foundDob   = false;
        let foundKey   = false;

        for (const a of answers) {
          const { hasName, hasDob, hasKey } = scanAnswer(a, nameLower, dob, originalKey);
          if (hasKey)  foundKey  = true;
          if (hasName) foundName = true;
          if (hasDob)  foundDob  = true;
        }

        if (foundKey || (foundName && foundDob)) {
          console.log(`Match: id=${r.response_id} key=${foundKey} name=${foundName} dob=${foundDob}`);
          return String(r.response_id);
        }
      }
      // If a page returned fewer than limit, no more data — stop early
      if (responses.length < limit) return null;
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── Gemini proxy ─────────────────────────────────────────────────────────
    // Receives Anthropic-format requests from App.jsx, translates to Gemini,
    // calls Gemini API, then returns Anthropic-format response so App.jsx
    // needs no changes.
    if (path === "/claude-proxy" && request.method === "POST") {
      try {
        const body = await request.json();

        // Map Anthropic model names to Gemini equivalents
        const modelMap = {
          "claude-sonnet-4-6":         "gemini-2.5-flash",
          "claude-haiku-4-5-20251001": "gemini-2.5-flash",
        };
        const geminiModel = modelMap[body.model] || "gemini-2.5-flash";

        // Convert Anthropic content blocks to Gemini parts
        function toGeminiParts(content) {
          if (typeof content === "string") return [{ text: content }];
          if (!Array.isArray(content)) return [{ text: String(content) }];
          return content.map(block => {
            if (block.type === "text")     return { text: block.text };
            if (block.type === "image")    return { inlineData: { mimeType: block.source.media_type, data: block.source.data } };
            if (block.type === "document") return { inlineData: { mimeType: block.source.media_type, data: block.source.data } };
            return { text: "" };
          });
        }

        // Detect whether the prompt is asking for JSON output — if so, use
        // Gemini's JSON mode (responseMimeType) which guarantees valid, escaped JSON.
        const allPromptText = (body.messages || [])
          .flatMap(m => Array.isArray(m.content)
            ? m.content.filter(b => b.type === "text").map(b => b.text)
            : [String(m.content || "")])
          .join(" ");
        const wantsJson = /\bjson\b/i.test(allPromptText);

        const geminiBody = {
          contents: (body.messages || []).map(msg => ({
            role:  msg.role === "assistant" ? "model" : "user",
            parts: toGeminiParts(msg.content),
          })),
          generationConfig: {
            maxOutputTokens: body.max_tokens || 8192,
            ...(wantsJson ? { responseMimeType: "application/json" } : {}),
          },
          // Disable safety blocks that could interfere with aged-care clinical content
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
        };

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiBody) }
        );
        const geminiData = await geminiRes.json();
        if (!geminiRes.ok) return jsonResponse(geminiData, geminiRes.status);

        // Convert Gemini response back to Anthropic format so App.jsx is unchanged
        const text = geminiData.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
        return jsonResponse({ content: [{ type: "text", text }], stop_reason: "end_turn" });
      } catch (err) {
        return errorResponse("Gemini proxy error: " + err.message);
      }
    }

    // ── Resolve by wf_token (full Snapforms URL paste) ────────────────────────
    if (path === "/snapforms-proxy/resolve-token" && request.method === "GET") {
      const wfToken = url.searchParams.get("wf_token");
      if (!wfToken) return errorResponse("Missing wf_token", 400);
      try {
        const token = await getBearerToken(env);
        const res   = await fetch(
          `${SNAP_BASE}/forms/${FORM_SLUG}/responses?wf_token=${encodeURIComponent(wfToken)}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        if (!res.ok) return errorResponse(`Snapforms token lookup failed (${res.status})`, res.status);
        const data      = await res.json();
        const responses = data.responses || (Array.isArray(data) ? data : []);
        if (!responses.length) return errorResponse("No response found for that URL", 404);

        const r       = responses[0];
        const answers = r.answers || [];
        let name = null;
        for (const a of answers) {
          if (String(a.question || "").toLowerCase().includes("client name")) {
            name = extractAnswerStr(a.answer).trim();
          }
        }
        return jsonResponse({ responseId: String(r.response_id), participantName: name });
      } catch (err) {
        return errorResponse("Token resolve error: " + err.message);
      }
    }

    // ── DEBUG: show raw answers for name/dob scan ─────────────────────────────
    // GET /snapforms-proxy/debug?name=Soheir+Salib&dob=09/11/1954
    if (path === "/snapforms-proxy/debug" && request.method === "GET") {
      const dname = url.searchParams.get("name") || "";
      const ddob  = url.searchParams.get("dob")  || "";
      try {
        const token = await getBearerToken(env);
        const res   = await fetch(
          `${SNAP_BASE}/forms/${FORM_SLUG}/responses?limit=100&offset=0`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        const data      = await res.json();
        const responses = data.responses || (Array.isArray(data) ? data : []);
        // Return the first 3 responses' answer structures, and flag any containing the name
        const nameLow = dname.toLowerCase();
        const out = responses.slice(0, 200).map(r => {
          const answers = (r.answers || []).map(a => ({
            question: a.question,
            answerType: Array.isArray(a.answer) ? "field_table" : typeof a.answer,
            answerExtracted: extractAnswerStr(a.answer).slice(0, 120),
          }));
          const containsName = answers.some(a => a.answerExtracted.toLowerCase().includes(nameLow));
          return { response_id: r.response_id, containsName, answers };
        }).filter(r => r.containsName || dname === "");
        return jsonResponse({ total: responses.length, matching: out.length, results: out.slice(0, 5) });
      } catch (err) {
        return errorResponse("Debug error: " + err.message);
      }
    }

    // ── Resolve record key → responseId ──────────────────────────────────────
    if (path === "/snapforms-proxy/resolve-record-key" && request.method === "GET") {
      const recordKey = url.searchParams.get("recordKey");
      if (!recordKey) return errorResponse("Missing recordKey param", 400);
      try {
        const { name, dob } = parseRecordKey(recordKey);
        console.log(`Resolving: "${recordKey}" → name="${name}", dob="${dob}"`);

        if (!name || !dob) {
          return errorResponse(
            `Could not parse name and DOB from "${recordKey}". Use format: Firstname Lastname-DD/MM/YYYY-IACP`, 400
          );
        }

        // 1. Check KV cache first (skip if ?force=1 is passed to fix stale entries)
        const kvKey   = `participant:${normWS(name)}`;
        const force   = url.searchParams.get("force") === "1";
        if (!force) {
          const cached = await env.LENNY_PARTICIPANTS.get(kvKey);
          if (cached) {
            const p = JSON.parse(cached);
            console.log(`KV cache hit for "${name}": responseId=${p.response_id}`);
            return jsonResponse({ responseId: p.response_id, participantName: p.name || name });
          }
        } else {
          console.log(`Force-bypass KV cache for "${name}"`);
        }

        // 2. Full Snapforms scan
        const token      = await getBearerToken(env);
        const responseId = await findResponseByNameAndDob(name, dob, token, recordKey);

        if (!responseId) {
          return errorResponse(
            `No Snapforms response found for name="${name}", dob="${dob}". ` +
            `Check the name and date of birth match the care plan exactly.`,
            404
          );
        }

        // 3. Cache the result so next lookup is instant
        await env.LENNY_PARTICIPANTS.put(kvKey, JSON.stringify({
          name, dob, record_key: recordKey, response_id: responseId,
        }));

        return jsonResponse({ responseId, participantName: name });
      } catch (err) {
        return errorResponse(err.message);
      }
    }

    // ── KV search + live Snapforms fallback ───────────────────────────────────
    if (path === "/snapforms-proxy/kv-search-participants" && request.method === "GET") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      if (q.length < 2) return jsonResponse({ results: [] });
      try {
        // 1. Try KV first (fast — populated after each successful Lenny submission)
        const list    = await env.LENNY_PARTICIPANTS.list({ prefix: "participant:" + q });
        const results = [];
        for (const key of list.keys) {
          const val = await env.LENNY_PARTICIPANTS.get(key.name);
          if (val) results.push(JSON.parse(val));
        }
        if (results.length > 0) return jsonResponse({ results });

        // 2. Fall back to live Snapforms scan
        const token       = await getBearerToken(env);
        const limit       = 100;
        let   offset      = 0;
        const snapResults = [];

        while (offset <= 500 && snapResults.length < 10) {
          const res = await fetch(
            `${SNAP_BASE}/forms/${FORM_SLUG}/responses?limit=${limit}&offset=${offset}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
          );
          if (!res.ok) break;
          const data      = await res.json();
          const responses = data.responses || (Array.isArray(data) ? data : []);
          if (responses.length === 0) break;

          for (const r of responses) {
            if (snapResults.length >= 10) break;
            const answers = r.answers || [];
            let name = null, dob = null, recordKey = null;

            for (const a of answers) {
              const ql = String(a.question || "").toLowerCase().trim();
              const v  = extractAnswerStr(a.answer);
              if (ql === "client name" || ql.includes("client name"))           name      = v;
              if (ql === "record key"  || ql === "record key - archived")       recordKey = v;
              if (ql === "client dob"  || ql.includes("client dob") || ql === "dob") dob  = v;
            }

            if (name && name.toLowerCase().includes(q)) {
              snapResults.push({
                name:        name.trim(),
                dob:         dob       || null,
                record_key:  recordKey || null,
                response_id: String(r.response_id),
              });
            }
          }

          if (responses.length < limit) break;
          offset += limit;
        }

        return jsonResponse({ results: snapResults });
      } catch (err) {
        return errorResponse("Search error: " + err.message);
      }
    }

    // ── GET single response (for display) ────────────────────────────────────
    const getMatch = path.match(/^\/snapforms-proxy\/responses\/([^/]+)$/);
    if (getMatch && request.method === "GET") {
      const responseId = getMatch[1];
      try {
        const token  = await getBearerToken(env);
        const getRes = await fetch(
          `${SNAP_BASE}/forms/${FORM_SLUG}/responses/${responseId}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        if (!getRes.ok) return errorResponse(`Snapforms fetch failed (${getRes.status})`, getRes.status);
        const data = await getRes.json();
        return jsonResponse(data, getRes.status);
      } catch (err) {
        return errorResponse("Fetch error: " + err.message);
      }
    }

    // ── PUT: fetch existing, append new content, save ─────────────────────────
    const putMatch = path.match(/^\/snapforms-proxy\/responses\/([^/]+)$/);
    if (putMatch && request.method === "PUT") {
      const responseId = putMatch[1];
      try {
        const { participant, payload } = await request.json();
        const token = await getBearerToken(env);

        // 1. Fetch existing answers
        const getRes = await fetch(
          `${SNAP_BASE}/forms/${FORM_SLUG}/responses/${responseId}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        const existingData = getRes.ok ? await getRes.json().catch(() => ({})) : {};
        const existingRaw  = existingData.answers || existingData.fields || [];
        const existingMap    = {};  // question → extracted string (for plain-text fields)
        const existingMapRaw = {};  // question → raw value (preserves arrays for field tables)
        for (const f of existingRaw) {
          if (f.question && f.answer != null) {
            const key = f.question.trim();
            existingMap[key]    = extractAnswerStr(f.answer);
            existingMapRaw[key] = f.answer;
          }
        }
        console.log("existingMap size:", Object.keys(existingMap).length);

        // 2. Merge only the changed fields — send just these back to Snapforms.
        // Sending all 100+ answers causes 524 timeouts for records with accumulated content.
        // Snapforms partial-PUT updates only the fields included; others are left untouched.
        const changedOnly = payload.map(item => {
          const q       = item.question.trim();
          const prev    = existingMap[q] || "";
          const prevRaw = existingMapRaw[q];

          if (item.appendPlain) {
            // appendPlain is used for field-table rows (e.g. section 47 review).
            // Snapforms requires field tables to be PUT as [{row, data:[{fieldname,fieldvalue}...]}].
            // Try the exact label first, then fall back to a fuzzy search for any field-table
            // whose question label contains "47" or "review".
            const rawArr = Array.isArray(prevRaw)
              ? prevRaw
              : (() => {
                  const hit = existingRaw.find(f =>
                    Array.isArray(f.answer) && /47|review/i.test(String(f.question || ""))
                  );
                  return hit ? hit.answer : null;
                })();

            const parts = item.answer.split(/\s*\|\s*/);

            if (rawArr !== null && rawArr !== undefined) {
              // Pass REVIEW_COLUMNS as default so empty arrays (first-ever row) still work
              const updated = appendFieldTableRow(rawArr, parts, REVIEW_COLUMNS);
              if (updated) {
                console.log(`Field-table append for "${q}": now ${updated.length} row(s)`);
                return { question: q, answer: updated };
              }
            }

            // rawArr was null (field absent or answer was null — no previous rows ever).
            // For review-type questions, create the table from scratch.
            if (/47|review/i.test(q)) {
              const updated = appendFieldTableRow([], parts, REVIEW_COLUMNS);
              if (updated) {
                console.log(`New field-table for "${q}": created row 1`);
                return { question: q, answer: updated };
              }
            }

            // Fallback: plain-text append (non-review appendPlain fields)
            return { question: q, answer: prev ? `${prev}\n${item.answer}` : item.answer };
          }

          // Normal text field: blank-line-separated append
          return { question: q, answer: prev ? `${prev}\n\n${item.answer}` : item.answer };
        });

        // 2b. Auto-tick "Are there any Identified Risks?" checkboxes.
        // When Lenny writes content to a section's Identified Risks text field, the
        // companion checkbox that gates visibility of that field must also be ticked.
        // Strategy: look for the checkbox in existingRaw first (most reliable), then
        // fall back to the hardcoded RISKS_CHECKBOX_QUESTIONS map.
        for (const item of payload) {
          const q = item.question.trim();
          // Match "22. Toileting & Continence: Identified Risks" etc.
          const riskMatch = q.match(/^(\d+\.\s+.+?):\s+Identified Risks$/i);
          if (!riskMatch) continue;
          const sectionPrefix = riskMatch[1].trim();

          // Try to find the checkbox in the live form data first
          let checkboxQ = null;
          const checkboxField = existingRaw.find(f => {
            const fq = String(f.question || "").trim();
            return fq.toLowerCase().startsWith(sectionPrefix.toLowerCase()) &&
                   /Are there any Identified Risks\?/i.test(fq);
          });
          if (checkboxField) {
            checkboxQ = checkboxField.question.trim();
          } else {
            // Fall back to hardcoded map (Snapforms may omit null-valued fields from GET)
            checkboxQ = RISKS_CHECKBOX_QUESTIONS[sectionPrefix] || null;
          }

          if (checkboxQ && !changedOnly.some(c => c.question === checkboxQ)) {
            console.log(`Auto-ticking risks checkbox: "${checkboxQ}"`);
            changedOnly.push({ question: checkboxQ, answer: true });
          }
        }

        // 3. PUT only changed fields to Snapforms (retry up to 3 times on 5xx/524)
        const putBody = JSON.stringify(changedOnly);
        let putRes, result;
        for (let attempt = 1; attempt <= 3; attempt++) {
          putRes = await fetch(
            `${SNAP_BASE}/forms/${FORM_SLUG}/responses/${responseId}`,
            {
              method:  "PUT",
              headers: {
                Authorization:  `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept:         "application/json",
              },
              body: putBody,
            }
          );
          result = await putRes.json().catch(() => ({}));
          if (putRes.ok || (putRes.status >= 400 && putRes.status < 500)) break;
          // 5xx or network error — wait briefly then retry
          console.log(`PUT attempt ${attempt} failed (${putRes.status}), retrying...`);
          await new Promise(r => setTimeout(r, attempt * 1000));
        }

        // 4. Save participant to KV for quick search next time
        if (putRes.ok && participant?.name) {
          const kvKey = `participant:${participant.name.toLowerCase()}`;
          await env.LENNY_PARTICIPANTS.put(kvKey, JSON.stringify({
            name:        participant.name,
            dob:         participant.dob        || null,
            record_key:  participant.record_key || null,
            response_id: responseId,
          }));
        }

        return jsonResponse(result, putRes.status);
      } catch (err) {
        return errorResponse("Update error: " + err.message);
      }
    }

    return errorResponse("Not found", 404);
  },
};
