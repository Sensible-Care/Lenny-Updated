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

// Append a new row to a Snapforms field table array.
// existingArray: [{row:1, data:[{fieldname, fieldvalue}...]}, ...]  from GET
// parts: array of string values to fill into columns in order.
// The last column absorbs any extra pipe-separated parts.
// Returns the updated array, or null if the structure is unrecognisable.
function appendFieldTableRow(existingArray, parts) {
  if (!Array.isArray(existingArray) || existingArray.length === 0) return null;
  const template = existingArray.find(r => Array.isArray(r.data) && r.data.length > 0);
  if (!template) return null;
  const fieldNames = template.data.map(d => d.fieldname || "");
  const nextRowNum = Math.max(...existingArray.map(r => Number(r.row) || 0)) + 1;
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

    // ── Claude proxy ─────────────────────────────────────────────────────────
    if (path === "/claude-proxy" && request.method === "POST") {
      try {
        const body      = await request.json();
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type":      "application/json",
            "x-api-key":         env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });
        const data = await claudeRes.json();
        return jsonResponse(data, claudeRes.status);
      } catch (err) {
        return errorResponse("Claude proxy error: " + err.message);
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

        // 1. Check KV cache first — instant lookup if this participant was seen before
        const kvKey   = `participant:${normWS(name)}`;
        const cached  = await env.LENNY_PARTICIPANTS.get(kvKey);
        if (cached) {
          const p = JSON.parse(cached);
          console.log(`KV cache hit for "${name}": responseId=${p.response_id}`);
          return jsonResponse({ responseId: p.response_id, participantName: p.name || name });
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

            if (rawArr) {
              const parts   = item.answer.split(/\s*\|\s*/);
              const updated = appendFieldTableRow(rawArr, parts);
              if (updated) {
                console.log(`Field-table append for "${q}": now ${updated.length} row(s)`);
                return { question: q, answer: updated };
              }
            }
            // Fallback: plain-text append (no existing table found)
            return { question: q, answer: prev ? `${prev}\n${item.answer}` : item.answer };
          }

          // Normal text field: blank-line-separated append
          return { question: q, answer: prev ? `${prev}\n\n${item.answer}` : item.answer };
        });

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
