import { useState, useEffect, useRef, useCallback } from "react";

// ─── Colour tokens ─────────────────────────────────────────────────────────
const NAVY   = "#272973";
const RED    = "#ec1f24";
const WHITE  = "#ffffff";
const LIGHT  = "#f4f5fb";
const BORDER = "#dde0f0";
const FONT   = "'Montserrat', 'Segoe UI', sans-serif";

// ─── Snapforms field mapping ───────────────────────────────────────────────
const SNAP_FIELDS = {
  "12_who_will_assist": "12. Disaster & Emergency Management: Who will Assist in an Emergency",
  "12_emergency_plan":  "12. Disaster & Emergency Management: Location of Emergency Plan & Kit",
  "12_risks":           "12. Disaster & Emergency Management: Identified Risks",
  "12_goals":           "12. Disaster & Emergency Management: Goals & Reablement",
  "12_recs":            "12. Disaster & Emergency Management: Recommendations & Referrals",
  "20_How do you manage your personal care, what supports or aids do you use or need and is your bathroom suitable for your needs?": "20. Personal Care: How do you manage your personal care, what supports or aids do you use or need and is your bathroom suitable for your needs?",
  "20_risks": "20. Personal Care: Identified Risks",
  "20_goals": "20. Personal Care: Goals & Reablement",
  "20_recs":  "20. Personal Care: Recommendations & Referrals",
  "21_How do you take care of your oral hygiene, do you have any issues with your teeth, mouth, or dentures? Do you need any support?": "21. Oral Hygiene: How do you take care of your oral hygiene, do you have any issues with your teeth, mouth, or dentures? Do you need any support?",
  "21_risks": "21. Oral Hygiene: Identified Risks",
  "21_goals": "21. Oral Hygiene: Goals & Reablement",
  "21_recs":  "21. Oral Hygiene: Recommendations & Referrals",
  "22_How do you manage your continence, do you use any aids or equipment or need support?": "22. Toileting & Continence: How do you manage your continence, do you use any aids or equipment or need support?",
  "22_risks": "22. Toileting & Continence: Identified Risks",
  "22_goals": "22. Toileting & Continence: Goals & Reablement",
  "22_recs":  "22. Toileting & Continence: Recommendations & Referrals",
  "23_Do you use any mobility aids? Are there situations at home or in the community where you feel unsafe moving around? How do you access the community?": "23. Mobility & Transfers: Do you use any mobility aids? Are there situations at home or in the community where you feel unsafe moving around? How do you access the community?",
  "23_risks": "23. Mobility & Transfers: Identified Risks",
  "23_goals": "23. Mobility & Transfers: Goals & Reablement",
  "23_recs":  "23. Mobility & Transfers: Recommendations & Referrals",
  "24_How do you manage your cleaning and gardening? Which tasks can you do yourself and which ones do you need assistance with?": "24. Household Tasks: How do you manage your cleaning and gardening? Which tasks can you do yourself and which ones do you need assistance with?",
  "24_risks": "24. Household Tasks: Identified Risks",
  "24_goals": "24. Household Tasks: Goals & Reablement",
  "24_recs":  "24. Household Tasks: Recommendations & Referrals",
  "25_Is there anything about your home or garden environment that makes you feel unsafe or at risk?": "25. Home Environment: Is there anything about your home or garden environment that makes you feel unsafe or at risk?",
  "25_risks": "25. Home Environment: Identified Risks",
  "25_goals": "25. Home Environment: Goals & Reablement",
  "25_recs":  "25. Home Environment: Recommendations & Referrals",
  "26_What are your communication needs, including language preferences? Do you currently use any communication aids?": "26. Communication & Sensory Care: What are your communication needs, including language preferences? Do you currently use any communication aids?",
  "26_risks": "26. Communication & Sensory: Identified Risks",
  "26_goals": "26. Communication & Sensory Care: Goals & Reablement",
  "26_recs":  "26. Communication & Sensory Care: Recommendations & Referrals",
  "27_How do you manage your shopping, meal preparation, and dietary needs?": "27. Nutrition & Meal Planning & Preparation: How do you manage your shopping, meal preparation, and dietary needs?",
  "27_risks": "27. Nutrition & Meal Planning & Preparation: Identified Risks",
  "27_goals": "27. Nutrition & Meal Planning & Preparation:  Goals & Reablement",
  "27_recs":  "27. Nutrition & Meal Planning & Preparation: Recommendations & Referrals",
  "29_How does pain affect your daily life and what do you do to manage it?": "29. Clinical Care: How does pain affect your daily life and what do you do to manage it?",
  "29_risks": "29. Clinical Care: Identified Risks",
  "29_goals": "29. Clinical Care: Goals & Reablement",
  "29_recs":  "29. Clinical Care: Recommendations & Referrals",
  "30_How are you currently managing your medication? Who currently supports with medication management, and is medication assistance required?": "30. Medication Management: How are you currently managing your medication? Who currently supports with medication management, and is medication assistance required?",
  "30_risks": "30. Medication Management: Identified Risks",
  "30_goals": "30. Medication Management: Goals & Reablement",
  "30_recs":  "30. Medication Management: Recommendations & Referrals",
  "31_Do you have any concerns about your skin health? Are you prone to pressure areas?": "31. Skin Integrity: Do you have any concerns about your skin health? Are you prone to pressure areas?",
  "31_risks": "31. Skin Integrity: Identified Risks",
  "31_goals": "31. Skin Integrity: Goals & Reablement",
  "31_recs":  "31. Skin Integrity: Recommendations & Referrals",
  "32_Do you see a podiatrist?": "32. Foot Health: Do you see a podiatrist?",
  "32_risks": "32. Foot Health: Identified Risks",
  "32_goals": "32. Foot Health: Goals & Reablement",
  "32_recs":  "32. Foot Health: Recommendations & Referrals",
  "33_Do you sleep well? Is your bed adequate for your needs?": "33. Sleep: Do you sleep well? Is your bed adequate for your needs?",
  "33_risks": "33. Sleep: Identified Risks",
  "33_goals": "33. Sleep: Goals & Reablement",
  "33_recs":  "33. Sleep: Recommendations & Referrals",
  "34_Do you experience shortness of breath? If so, when does this occur?": "34. Breathing: Do you experience shortness of breath? If so, when does this occur?",
  "34_risks": "34. Breathing: Identified Risks",
  "34_goals": "34. Breathing: Goals & Reablement",
  "34_recs":  "34. Breathing: Recommendations & Referrals",
  "37_Have you or your family noticed any changes in your memory or behaviour?": "37. Cognition & Behaviour: Have you or your family noticed any changes in your memory or behaviour?",
  "37_risks": "37. Cognition & Mental Health: Identified Risks",
  "37_goals": "37. Cognition & Mental Health: Goals & Reablement",
  "37_recs":  "37. Cognition & Mental Health: Recommendations & Referrals",
  "38_Do you have any concerns about your mental or emotional health? What do you do to support your wellbeing?": "38. Mental Health: Do you have any concerns about your mental or emotional health? What do you do to support your wellbeing?",
  "38_risks": "38. Mental Health: Identified Risks",
  "38_goals": "38. Mental Health: Goals & Reablement",
  "38_recs":  "38. Mental Health: Recommendations & Referrals",
  "39_Do you receive support from your family/friends? Are there any supports we can put in place?": "39. Carer: Do you receive support from your family/friends? Are there any supports we can put in place?",
  "39_risks": "39. Carer: Identified Risks",
  "39_goals": "39. Carer: Goals & Reablement",
  "39_recs":  "39. Carer: Recommendations & Referrals",
  "47_review": "47. Assessment & Care Review Area",
  "51_athm":   "51. AT-HM Requests - Optional: AT-HM Request",
};

const FIELD_LABELS = {
  "12_who_will_assist": "Disaster & Emergency — Who Will Assist in an Emergency",
  "12_emergency_plan":  "Disaster & Emergency — Location of Emergency Plan & Kit",
  "12_risks":           "Disaster & Emergency — Identified Risks",
  "12_goals":           "Disaster & Emergency — Goals & Reablement",
  "12_recs":            "Disaster & Emergency — Recommendations & Referrals",
  "20_How do you manage your personal care, what supports or aids do you use or need and is your bathroom suitable for your needs?": "Personal Care — How do you manage your personal care?",
  "20_risks": "Personal Care — Identified Risks",
  "20_goals": "Personal Care — Goals & Reablement",
  "20_recs":  "Personal Care — Recommendations & Referrals",
  "21_How do you take care of your oral hygiene, do you have any issues with your teeth, mouth, or dentures? Do you need any support?": "Oral Hygiene — How do you take care of your oral hygiene?",
  "21_risks": "Oral Hygiene — Identified Risks",
  "21_goals": "Oral Hygiene — Goals & Reablement",
  "21_recs":  "Oral Hygiene — Recommendations & Referrals",
  "22_How do you manage your continence, do you use any aids or equipment or need support?": "Toileting & Continence — How do you manage your continence?",
  "22_risks": "Toileting & Continence — Identified Risks",
  "22_goals": "Toileting & Continence — Goals & Reablement",
  "22_recs":  "Toileting & Continence — Recommendations & Referrals",
  "23_Do you use any mobility aids? Are there situations at home or in the community where you feel unsafe moving around? How do you access the community?": "Mobility & Transfers — Do you use any mobility aids?",
  "23_risks": "Mobility & Transfers — Identified Risks",
  "23_goals": "Mobility & Transfers — Goals & Reablement",
  "23_recs":  "Mobility & Transfers — Recommendations & Referrals",
  "24_How do you manage your cleaning and gardening? Which tasks can you do yourself and which ones do you need assistance with?": "Household Tasks — How do you manage your cleaning and gardening?",
  "24_risks": "Household Tasks — Identified Risks",
  "24_goals": "Household Tasks — Goals & Reablement",
  "24_recs":  "Household Tasks — Recommendations & Referrals",
  "25_Is there anything about your home or garden environment that makes you feel unsafe or at risk?": "Home Environment — Is there anything about your home environment that makes you feel unsafe?",
  "25_risks": "Home Environment — Identified Risks",
  "25_goals": "Home Environment — Goals & Reablement",
  "25_recs":  "Home Environment — Recommendations & Referrals",
  "26_What are your communication needs, including language preferences? Do you currently use any communication aids?": "Communication & Sensory — What are your communication needs?",
  "26_risks": "Communication & Sensory — Identified Risks",
  "26_goals": "Communication & Sensory — Goals & Reablement",
  "26_recs":  "Communication & Sensory — Recommendations & Referrals",
  "27_How do you manage your shopping, meal preparation, and dietary needs?": "Nutrition & Meal Planning — How do you manage your shopping and meal preparation?",
  "27_risks": "Nutrition & Meal Planning — Identified Risks",
  "27_goals": "Nutrition & Meal Planning — Goals & Reablement",
  "27_recs":  "Nutrition & Meal Planning — Recommendations & Referrals",
  "29_How does pain affect your daily life and what do you do to manage it?": "Clinical Care — How does pain affect your daily life?",
  "29_risks": "Clinical Care — Identified Risks",
  "29_goals": "Clinical Care — Goals & Reablement",
  "29_recs":  "Clinical Care — Recommendations & Referrals",
  "30_How are you currently managing your medication? Who currently supports with medication management, and is medication assistance required?": "Medication Management — How are you currently managing your medication?",
  "30_risks": "Medication Management — Identified Risks",
  "30_goals": "Medication Management — Goals & Reablement",
  "30_recs":  "Medication Management — Recommendations & Referrals",
  "31_Do you have any concerns about your skin health? Are you prone to pressure areas?": "Skin Integrity — Do you have any concerns about your skin health?",
  "31_risks": "Skin Integrity — Identified Risks",
  "31_goals": "Skin Integrity — Goals & Reablement",
  "31_recs":  "Skin Integrity — Recommendations & Referrals",
  "32_Do you see a podiatrist?": "Foot Health — Do you see a podiatrist?",
  "32_risks": "Foot Health — Identified Risks",
  "32_goals": "Foot Health — Goals & Reablement",
  "32_recs":  "Foot Health — Recommendations & Referrals",
  "33_Do you sleep well? Is your bed adequate for your needs?": "Sleep — Do you sleep well?",
  "33_risks": "Sleep — Identified Risks",
  "33_goals": "Sleep — Goals & Reablement",
  "33_recs":  "Sleep — Recommendations & Referrals",
  "34_Do you experience shortness of breath? If so, when does this occur?": "Breathing — Do you experience shortness of breath?",
  "34_risks": "Breathing — Identified Risks",
  "34_goals": "Breathing — Goals & Reablement",
  "34_recs":  "Breathing — Recommendations & Referrals",
  "37_Have you or your family noticed any changes in your memory or behaviour?": "Cognition & Behaviour — Have you noticed any changes in your memory or behaviour?",
  "37_risks": "Cognition & Mental Health — Identified Risks",
  "37_goals": "Cognition & Mental Health — Goals & Reablement",
  "37_recs":  "Cognition & Mental Health — Recommendations & Referrals",
  "38_Do you have any concerns about your mental or emotional health? What do you do to support your wellbeing?": "Mental Health — Do you have any concerns about your mental or emotional health?",
  "38_risks": "Mental Health — Identified Risks",
  "38_goals": "Mental Health — Goals & Reablement",
  "38_recs":  "Mental Health — Recommendations & Referrals",
  "39_Do you receive support from your family/friends? Are there any supports we can put in place?": "Carer — Do you receive support from your family/friends?",
  "39_risks": "Carer — Identified Risks",
  "39_goals": "Carer — Goals & Reablement",
  "39_recs":  "Carer — Recommendations & Referrals",
  "47_review": "Assessment & Care Review",
  "51_athm":  "AT-HM Request",
};

const SECTION_OPTIONS = [
  "Disaster & Emergency", "Personal Care", "Oral Hygiene", "Toileting & Continence",
  "Mobility & Transfers", "Household Tasks", "Home Environment", "Communication & Sensory Care",
  "Nutrition & Meal Planning & Preparation", "Clinical Care", "Medication Management",
  "Skin Integrity", "Foot Health", "Sleep", "Breathing", "Cognition & Behaviour",
  "Mental Health", "Carer", "Proposed Services", "AT-HM Request", "Other",
];

const SECTION_TO_FIELD_KEY = {
  "Disaster & Emergency": "12_who_will_assist",
  "Personal Care": "20_How do you manage your personal care, what supports or aids do you use or need and is your bathroom suitable for your needs?",
  "Oral Hygiene": "21_How do you take care of your oral hygiene, do you have any issues with your teeth, mouth, or dentures? Do you need any support?",
  "Toileting & Continence": "22_How do you manage your continence, do you use any aids or equipment or need support?",
  "Mobility & Transfers": "23_Do you use any mobility aids? Are there situations at home or in the community where you feel unsafe moving around? How do you access the community?",
  "Household Tasks": "24_How do you manage your cleaning and gardening? Which tasks can you do yourself and which ones do you need assistance with?",
  "Home Environment": "25_Is there anything about your home or garden environment that makes you feel unsafe or at risk?",
  "Communication & Sensory Care": "26_What are your communication needs, including language preferences? Do you currently use any communication aids?",
  "Nutrition & Meal Planning & Preparation": "27_How do you manage your shopping, meal preparation, and dietary needs?",
  "Clinical Care": "29_How does pain affect your daily life and what do you do to manage it?",
  "Medication Management": "30_How are you currently managing your medication? Who currently supports with medication management, and is medication assistance required?",
  "Skin Integrity": "31_Do you have any concerns about your skin health? Are you prone to pressure areas?",
  "Foot Health": "32_Do you see a podiatrist?",
  "Sleep": "33_Do you sleep well? Is your bed adequate for your needs?",
  "Breathing": "34_Do you experience shortness of breath? If so, when does this occur?",
  "Cognition & Behaviour": "37_Have you or your family noticed any changes in your memory or behaviour?",
  "Mental Health": "38_Do you have any concerns about your mental or emotional health? What do you do to support your wellbeing?",
  "Carer": "39_Do you receive support from your family/friends? Are there any supports we can put in place?",
  "AT-HM Request": "51_athm",
};

const WORKER_URL = "https://care-plan-update-claude.systems-30d.workers.dev";

function getTodayString() {
  const d = new Date();
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getSectionsFromFieldKeys(keys) {
  const sectionNums = [...new Set(keys.map(k => k.split("_")[0]))];
  const sectionMap = {
    "12": "Disaster & Emergency Management", "20": "Personal Care", "21": "Oral Hygiene",
    "22": "Toileting & Continence", "23": "Mobility & Transfers", "24": "Household Tasks",
    "25": "Home Environment", "26": "Communication & Sensory Care",
    "27": "Nutrition & Meal Planning & Preparation", "29": "Clinical Care",
    "30": "Medication Management", "31": "Skin Integrity", "32": "Foot Health",
    "33": "Sleep", "34": "Breathing", "37": "Cognition & Behaviour",
    "38": "Mental Health", "39": "Carer", "47": "Assessment & Care Review", "51": "AT-HM",
  };
  return "Update of " + sectionNums.filter(n => sectionMap[n]).map(n => sectionMap[n]).join(", ");
}

async function refineSingleField(key, answer, participantName, pronouns, retries = 3) {
  const firstName = participantName ? participantName.trim().split(/\s+/)[0] : "";
  const pronounMap = {
    she:  { subject: "she",  object: "her",  possessive: "her"   },
    he:   { subject: "he",   object: "him",  possessive: "his"   },
    they: { subject: "they", object: "them", possessive: "their" },
  };
  const p = pronounMap[pronouns] || null;
  const pronounNote = p
    ? ` Use ${p.subject}/${p.object}/${p.possessive} pronouns (e.g. "${p.subject.charAt(0).toUpperCase()+p.subject.slice(1)} manages ${p.possessive} own…").`
    : "";
  const nameInstruction = firstName
    ? `IMPORTANT: The participant's name is ${firstName}. You MUST refer to them by their first name "${firstName}" throughout the rewritten text.${pronounNote} NEVER use "the person", "the consumer", "the client", or "the participant" — always use "${firstName}" by name.`
    : `IMPORTANT: Never use "the person", "the consumer", or "the client" — use "the participant" throughout.`;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${WORKER_URL}/claude-proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an aged care documentation specialist. Rewrite the following care plan field answer to use professional clinical language, person-centred terminology, and Support at Home (SaH) programme language. Use Australian English spelling. Do not change the meaning or add information that was not in the original. ${nameInstruction} Return ONLY the rewritten text with no explanation, preamble, or markdown.

Field answer to rewrite:
${answer}`
          }]
        }),
      });
      clearTimeout(timeout);
      if (res.status === 429) {
        const wait = (attempt + 1) * 3000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`Refinement failed (${res.status})`);
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || answer;
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") return answer;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw e;
    }
  }
  return answer;
}

// ─── Participant Search component ──────────────────────────────────────────
function ParticipantSearch({ onSelect }) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); setSearchError(""); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setSearchError("");
      try {
        const res  = await fetch(`${WORKER_URL}/snapforms-proxy/kv-search-participants?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data.results || []);
      } catch (e) {
        setSearchError("Search error: " + e.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={S.hintLabel}>Find Participant</p>
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "0 10px", gap: 6 }}>
        <span style={{ fontSize: 12, opacity: 0.5 }}>🔍</span>
        <input
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: WHITE, fontSize: 13, padding: "9px 0", fontFamily: FONT }}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type a name…"
        />
        {loading && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>⟳</span>}
      </div>
      {searchError && <p style={{ color: "#ff7073", fontSize: 11, margin: 0 }}>{searchError}</p>}
      {results.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
          {results.map((r, i) => (
            <button key={i}
              style={{ display: "flex", flexDirection: "column", width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "9px 12px", cursor: "pointer", textAlign: "left", gap: 2 }}
              onClick={() => { onSelect(r); setQuery(""); setResults([]); }}>
              <span style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{r.name}</span>
              {r.dob && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: FONT }}>{r.dob}</span>}
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 2 && !loading && results.length === 0 && !searchError && (
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0, textAlign: "center", padding: "6px 0", fontFamily: FONT }}>No participants found</p>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [inputValue, setInputValue]           = useState("");
  const [notes, setNotes]                     = useState("");
  const [attachedFiles, setAttachedFiles]     = useState([]); // [{name, kind, data, mediaType?, text?}]
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [stage, setStage]                     = useState("input");
  const [responseId, setResponseId]           = useState(null);
  const [participantName, setParticipantName] = useState("");
  const [participantDob, setParticipantDob]   = useState("");
  const [pronouns, setPronouns]               = useState(""); // "she", "he", "they", or ""
  const [fieldMap, setFieldMap]               = useState([]);
  const [originalAnswers, setOriginalAnswers] = useState({});
  const [refinedAnswers, setRefinedAnswers]   = useState({});
  const [refiningFields, setRefiningFields]   = useState({});
  const [refineAll, setRefineAll]             = useState(false);
  const [reviewDate, setReviewDate]           = useState(getTodayString());
  const [reviewInitials, setReviewInitials]   = useState("");
  const [reviewSections, setReviewSections]   = useState("");
  const [includeReview, setIncludeReview]     = useState(true);
  const [additionalUpdates, setAdditionalUpdates] = useState([]);
  // existingValues removed — append handled server-side in the Worker

  function handleParticipantSelect(participant) {
    if (participant.record_key) setInputValue(participant.record_key);
    if (participant.name) setParticipantName(participant.name);
    if (participant.dob) setParticipantDob(participant.dob);
    if (participant.response_id) setResponseId(participant.response_id);
  }

  async function resolveRecordKey(raw, forceRescan = false) {
    const rkMatch    = raw.match(/recordKey=([^&\s]+)/);
    const tokenMatch = raw.match(/wf_token=([^&\s]+)/);

    // Snapforms URL with wf_token — resolve directly via token
    if (tokenMatch) {
      const wfToken = decodeURIComponent(tokenMatch[1]);
      const res = await fetch(`${WORKER_URL}/snapforms-proxy/resolve-token?wf_token=${encodeURIComponent(wfToken)}`);
      if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error(`Could not resolve URL (${res.status})${b ? ": " + b : ""}`); }
      const data = await res.json();
      if (!data.responseId) throw new Error("No response found for that URL");
      return { responseId: data.responseId, participantName: data.participantName || "" };
    }

    // recordKey= URL param or plain text key
    const key = rkMatch ? decodeURIComponent(rkMatch[1]) : raw.trim();
    const res = await fetch(`${WORKER_URL}/snapforms-proxy/resolve-record-key?recordKey=${encodeURIComponent(key)}${forceRescan ? "&force=1" : ""}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Could not resolve record key (${res.status})${body ? ": " + body : ""}`);
    }
    const data = await res.json();
    if (!data.responseId) throw new Error("No responseId returned from worker");
    const namePart = key.replace(/^IACP-/i, "").split(/-\d{2}\/\d{2}\/\d{4}/)[0].trim();
    return { responseId: data.responseId, participantName: data.participantName || namePart };
  }

  // ── File attachment helpers ────────────────────────────────────────────────
  function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadMammoth() {
    if (window.mammoth) return Promise.resolve(window.mammoth);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src     = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";
      s.onload  = () => resolve(window.mammoth);
      s.onerror = () => reject(new Error("Could not load DOCX reader"));
      document.head.appendChild(s);
    });
  }

  async function processFile(file) {
    const MAX_MB = 20;
    if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name} exceeds ${MAX_MB} MB limit`);
    const ext = file.name.split(".").pop().toLowerCase();
    if (["jpg","jpeg","png","gif","webp","heic","heif"].includes(ext)) {
      const data = await readAsBase64(file);
      return { name: file.name, kind: "image", data, mediaType: file.type || "image/jpeg" };
    }
    if (ext === "pdf") {
      const data = await readAsBase64(file);
      return { name: file.name, kind: "pdf", data, mediaType: "application/pdf" };
    }
    if (ext === "docx") {
      const mammoth     = await loadMammoth();
      const arrayBuffer = await file.arrayBuffer();
      const result      = await mammoth.extractRawText({ arrayBuffer });
      return { name: file.name, kind: "docx_text", text: result.value };
    }
    throw new Error(`Unsupported file type: .${ext} — please use JPG, PNG, PDF or DOCX`);
  }

  async function handleFileAttach(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const processed = [];
    for (const f of files) {
      try { processed.push(await processFile(f)); }
      catch (err) { setError(err.message); }
    }
    setAttachedFiles(prev => [...prev, ...processed]);
  }

  function removeFile(idx) {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function structureNotes(notesText, files = []) {
    // Combine typed notes with any DOCX-extracted text
    const docxTexts = files.filter(f => f.kind === "docx_text").map(f => f.text);
    const allText   = [notesText, ...docxTexts].filter(Boolean).join("\n\n");

    // Replace straight double quotes in the source text with typographic equivalents.
    // Straight " inside a JSON string value must be escaped as \" — if Gemini echoes
    // the text back without escaping them, the JSON breaks.  Using curly quotes avoids
    // this entirely without changing the meaning of clinical content.
    const safeText = allText
      .replace(/“|”/g, "'")   // already-curly quotes → apostrophe (normalise first)
      .replace(/(?<=\s|^)"(?=\S)/g, "“")  // opening straight quote → left "
      .replace(/(?<=\S)"(?=[\s.,;:!?]|$)/g, "”")  // closing straight quote → right "
      .replace(/"/g, "'");              // any remaining straight quotes → single quote

    const instruction = `You are a care plan assistant for an aged care organisation. Extract care plan updates from the notes and/or attached files below and return ONLY a valid JSON object in this exact format:
{"fields": [{"key": "20_goals", "answer": "..."}, ...], "pronouns": "she"}

The "pronouns" value must be one of: "she", "he", "they", or null (if genuinely unclear from the notes).
Detect pronouns from how the participant is referred to in the notes (e.g. "she manages her own…" → "she", "he uses a walker" → "he").

Only use field keys from this list: ${Object.keys(SNAP_FIELDS).join(", ")}

Key mapping rules — pay close attention to these distinctions:
- Keys ending in _goals = Goals & Reablement (what the participant wants to achieve, outcomes, reablement focus)
- Keys ending in _recs = Recommendations & Referrals (actions staff will take, services to arrange, referrals)
- Keys ending in _risks = Identified Risks (risks and safety concerns)
- Keys with a long question text (e.g. 20_How do you...) = the main narrative/assessment field for that section
- Do NOT put recommendations or staff actions into a _goals field
- Do NOT put participant goals or outcomes into a _recs field
- Each piece of content should go into exactly one field — do not duplicate content across multiple fields

Do not include any explanation, markdown, or code fences. JSON only.${safeText ? `\n\nNotes:\n${safeText}` : ""}`;

    // Build content array — text instruction first, then any image/PDF attachments
    const content = [{ type: "text", text: instruction }];
    for (const f of files) {
      if (f.kind === "image") {
        content.push({ type: "image", source: { type: "base64", media_type: f.mediaType, data: f.data } });
      } else if (f.kind === "pdf") {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } });
      }
      // docx_text already merged into allText above
    }

    const res = await fetch(`${WORKER_URL}/claude-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const detail  = errBody?.error?.message || errBody?.message || JSON.stringify(errBody);
      throw new Error(`Claude proxy failed (${res.status}): ${detail}`);
    }
    const data   = await res.json();
    const text   = data.content?.[0]?.text || "";

    // ── Robust JSON extraction + repair ───────────────────────────────────────
    // Handles the three most common ways Gemini breaks JSON:
    //   (a) unescaped double-quotes inside string values  "She has "limited" mobility."
    //   (b) literal newline / tab characters inside string values
    //   (c) markdown code fences or trailing explanation text around the object
    function extractAndRepairJSON(raw) {
      // Step 1 — strip markdown fences, find outermost { … }
      let s = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      const start = s.indexOf("{");
      const end   = s.lastIndexOf("}");
      if (start !== -1 && end > start) s = s.slice(start, end + 1);

      // Step 2 — character-level repair (always run — cheaper than a failed parse)
      const CTRL = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
      let out = "";
      let inString = false;
      let escaped  = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        // Handle the character after a backslash (already-escaped sequence)
        if (escaped) { out += ch; escaped = false; continue; }
        if (ch === "\\" && inString) { escaped = true; out += ch; continue; }
        // Control characters must be escaped inside JSON strings
        if (inString && CTRL[ch]) { out += CTRL[ch]; continue; }
        if (ch === '"') {
          if (!inString) { inString = true; out += ch; continue; }
          // We're inside a string. Is this the closing quote or an unescaped inner quote?
          // Look at the next non-whitespace character:
          //   JSON structural chars (:  ,  }  ]) or end-of-input → legitimate string-close
          //   Anything else → unescaped quote inside the value → escape it
          const after = s.slice(i + 1).trimStart();
          const next  = after[0] ?? "";
          if (next === ":" || next === "," || next === "}" || next === "]" || next === "") {
            inString = false; out += ch;
          } else {
            out += '\\"';
          }
          continue;
        }
        out += ch;
      }
      return out;
    }

    let parsed;
    try {
      parsed = JSON.parse(extractAndRepairJSON(text));
    } catch (e) {
      // Log first 300 chars of the raw Gemini response to help diagnose future failures
      console.error("JSON repair failed. Raw response start:", text.slice(0, 300));
      throw new Error(`JSON parse failed: ${e.message}  —  Response started: ${text.slice(0, 120)}`);
    }
    if (!parsed.fields || !Array.isArray(parsed.fields)) throw new Error("Unexpected response from AI");
    return { fields: parsed.fields, detectedPronouns: parsed.pronouns || null };
  }

  async function handleProcess(forceRescan = false) {
    setError(""); setLoading(true);
    try {
      // If participant was selected from the sidebar, responseId is already known — skip the scan
      // unless forceRescan=true (user clicked "Wrong participant? Re-scan")
      let rid = forceRescan ? null : responseId;
      if (!rid) {
        const resolved = await resolveRecordKey(inputValue, forceRescan);
        rid = resolved.responseId;
        if (resolved.participantName) setParticipantName(resolved.participantName);
        setResponseId(rid);
      }


      const { fields, detectedPronouns } = await structureNotes(notes, attachedFiles);
      // Auto-set pronouns from notes if user hasn't manually chosen one
      if (detectedPronouns && !pronouns) setPronouns(detectedPronouns);
      const mapped = fields.filter(f => SNAP_FIELDS[f.key]).map(f => ({ key: f.key, question: SNAP_FIELDS[f.key], answer: f.answer }));
      setFieldMap(mapped);
      // Store originals keyed by index
      const originals = {};
      mapped.forEach((f, i) => { originals[i] = f.answer; });
      setOriginalAnswers(originals);
      setRefinedAnswers({});
      setRefiningFields({});
      setRefineAll(false);
      setReviewSections(getSectionsFromFieldKeys(mapped.map(f => f.key)));
      setStage("review");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleRefineField(idx) {
    const field = fieldMap[idx];
    if (!field) return;
    // If already refined, restore original
    if (refinedAnswers[idx] !== undefined) {
      setRefinedAnswers(p => { const n = { ...p }; delete n[idx]; return n; });
      setFieldMap(p => p.map((f, i) => i === idx ? { ...f, answer: originalAnswers[idx] } : f));
      return;
    }
    setRefiningFields(p => ({ ...p, [idx]: true }));
    try {
      const refined = await refineSingleField(field.key, field.answer, participantName, pronouns);
      setRefinedAnswers(p => ({ ...p, [idx]: refined }));
      setFieldMap(p => p.map((f, i) => i === idx ? { ...f, answer: refined } : f));
    } catch (e) {
      setError("Refinement failed: " + e.message);
    } finally {
      setRefiningFields(p => { const n = { ...p }; delete n[idx]; return n; });
    }
  }

  async function handleRefineAll() {
    const allRefined = fieldMap.every((_, i) => refinedAnswers[i] !== undefined);
    if (allRefined) {
      setFieldMap(p => p.map((f, i) => ({ ...f, answer: originalAnswers[i] ?? f.answer })));
      setRefinedAnswers({});
      setRefineAll(false);
      return;
    }
    setRefineAll(true);
    setLoading(true);
    const snapshot = fieldMap.map(f => ({ ...f }));
    const newRefined = { ...refinedAnswers };
    try {
      for (let i = 0; i < snapshot.length; i++) {
        if (newRefined[i] !== undefined) continue;
        setRefiningFields(p => ({ ...p, [i]: true }));
        const refined = await refineSingleField(snapshot[i].key, snapshot[i].answer, participantName, pronouns);
        newRefined[i] = refined;
        snapshot[i] = { ...snapshot[i], answer: refined };
        setRefiningFields(p => { const n = { ...p }; delete n[i]; return n; });
        setRefinedAnswers({ ...newRefined });
        setFieldMap([...snapshot]);
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      setError("Refinement failed: " + e.message);
      setRefineAll(false);
    } finally {
      setLoading(false);
    }
  }

  function updateFieldAnswer(idx, val) {
    setFieldMap(p => p.map((f, i) => i === idx ? { ...f, answer: val } : f));
    // If manually edited, update the refined answer so unticking still restores original
    if (refinedAnswers[idx] !== undefined) {
      setRefinedAnswers(p => ({ ...p, [idx]: val }));
    }
  }
  function updateFieldDestination(idx, key) { setFieldMap(p => p.map((f, i) => i === idx ? { ...f, key, question: SNAP_FIELDS[key] } : f)); }
  function removeField(idx)                 { setFieldMap(p => p.filter((_, i) => i !== idx)); }
  function addAdditionalUpdate()            { setAdditionalUpdates(p => [...p, { heading: "", customHeading: "", fieldKey: "", content: "" }]); }
  function updateAdditionalUpdate(idx, chg) { setAdditionalUpdates(p => p.map((u, i) => i === idx ? { ...u, ...chg } : u)); }
  function removeAdditionalUpdate(idx)      { setAdditionalUpdates(p => p.filter((_, i) => i !== idx)); }
  function buildReviewRow()                 { return `${reviewDate} | ${reviewInitials} | ${reviewSections}`; }

  async function handleSend() {
    setError(""); setLoading(true);
    try {
      const today = getTodayString();

      // Date-prefix new content — Worker fetches existing values and appends server-side
      const payload = fieldMap.filter(f => f.answer?.trim()).map(f => ({
        question: f.question,
        answer: `${today}: ${f.answer.trim()}`,
      }));
      for (const u of additionalUpdates) {
        if (!u.content.trim()) continue;
        const heading  = u.heading === "Other" ? u.customHeading : u.heading;
        const fieldKey = SECTION_TO_FIELD_KEY[heading] || u.fieldKey;
        if (!fieldKey || !SNAP_FIELDS[fieldKey]) continue;
        const question = SNAP_FIELDS[fieldKey];
        payload.push({ question, answer: `${today}: ${u.content.trim()}` });
      }
      if (includeReview && reviewInitials.trim()) {
        const reviewQuestion = SNAP_FIELDS["47_review"];
        const newRow = buildReviewRow();
        // appendPlain=true tells Worker to append without adding a date prefix
        payload.push({ question: reviewQuestion, answer: newRow, appendPlain: true });
      }
      // Retry the PUT up to 3 times — each attempt is a fresh request with its own timeout
      const putBody = JSON.stringify({
        participant: {
          name: participantName || inputValue.trim().split("-")[0].trim() || null,
          dob: participantDob || null,
          record_key: inputValue.trim(),
        },
        payload,
      });
      let res;
      for (let attempt = 1; attempt <= 3; attempt++) {
        res = await fetch(`${WORKER_URL}/snapforms-proxy/responses/${responseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: putBody,
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) break;
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 2000));
      }
      if (!res.ok) { const body = await res.text(); throw new Error(`Snapforms returned ${res.status}: ${body}`); }
      setStage("success");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleReset() {
    setInputValue(""); setNotes(""); setFieldMap([]); setResponseId(null); setAttachedFiles([]);
    setParticipantName(""); setParticipantDob(""); setPronouns("");
    setOriginalAnswers({}); setRefinedAnswers({}); setRefiningFields({}); setRefineAll(false);
    setReviewDate(getTodayString()); setReviewInitials(""); setReviewSections("");
    setIncludeReview(true); setAdditionalUpdates([]); setError(""); setStage("input");
  }

  const totalFields =
    fieldMap.filter(f => f.answer?.trim()).length +
    additionalUpdates.filter(u => u.content?.trim()).length +
    (includeReview && reviewInitials.trim() ? 1 : 0);

  // ── Shared sidebar ─────────────────────────────────────────────────────────
  const sidebar = (
    <div style={S.sidebar}>
      <div style={S.logoWrap}>
        <img src="/Sensible_Care_PNG.png" alt="Sensible Care" style={{ ...S.logo, cursor: "pointer" }} onClick={handleReset} />
      </div>
      <div style={S.sidebarBody}>
        <ParticipantSearch onSelect={handleParticipantSelect} />
        <div style={S.divider} />
        {stage === "input" && (
          <>
            <p style={S.sidebarIntro}>Search for a participant above, or enter a Record Key in the form. Paste your care notes and Lenny will map and submit the update directly to Snapforms.</p>
            <div style={S.divider} />
            <p style={S.hintLabel}>Supported formats</p>
            <div style={S.hintBox}>Firstname Lastname-DD/MM/YYYY-IACP</div>
            <div style={S.hintBox}>snapforms.com.au/...?recordKey=...</div>
          </>
        )}
        {(stage === "review" || stage === "success") && (
          <>
            <div style={S.participantCard}>
              <p style={S.pMeta}>Participant</p>
              <p style={S.pName}>{participantName || "—"}</p>
              {pronouns && <p style={{ ...S.pMeta, marginTop: 2 }}>{pronouns === "she" ? "She/Her" : pronouns === "he" ? "He/Him" : "They/Them"}</p>}
              <p style={S.pMeta}>Submission ID</p>
              <p style={S.pId}>{responseId || "—"}</p>
            </div>
            {stage === "review" && (
              <div style={S.fieldBadge}>
                <span style={S.fieldBadgeNum}>{fieldMap.length}</span>
                <span style={S.fieldBadgeLabel}>fields mapped by Lenny</span>
              </div>
            )}
            <button style={S.btnGhost} onClick={handleReset}>← Start Over</button>
          </>
        )}
      </div>
    </div>
  );

  // ── INPUT STAGE ────────────────────────────────────────────────────────────
  if (stage === "input") return (
    <div style={S.page}>
      {sidebar}
      <div style={S.main}>
        <div style={S.centreWrap}>
          <div style={S.card}>
            <div style={S.redBar} />
            <div style={S.cardInner}>
              <h2 style={S.cardTitle}>Update Care Plan</h2>
              <p style={S.cardSub}>Search for a participant in the sidebar, or enter a Record Key below</p>
              <label style={S.label}>Snapforms URL or Record Key</label>
              <input style={S.input} value={inputValue} onChange={e => { setInputValue(e.target.value); setResponseId(null); }}
                placeholder="e.g. Michael Scott-01/01/1955-IACP" />
              <label style={S.label}>Pronouns <span style={{ fontWeight: 400, opacity: 0.6 }}>(auto-detected from notes — override if needed)</span></label>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                {[["", "Not set"], ["she", "She/Her"], ["he", "He/Him"], ["they", "They/Them"]].map(([val, label]) => (
                  <button key={val} type="button"
                    style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${pronouns === val ? NAVY : BORDER}`, background: pronouns === val ? NAVY : WHITE, color: pronouns === val ? WHITE : NAVY, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    onClick={() => setPronouns(val)}>{label}</button>
                ))}
              </div>
              <label style={S.label}>Update Notes</label>
              <textarea style={{ ...S.input, minHeight: 200, resize: "vertical" }} value={notes}
                onChange={e => setNotes(e.target.value)} placeholder="Paste the care manager's notes here..." />

              {/* ── File attachments ── */}
              <div style={{ marginTop: 8 }}>
                <input id="file-attach" type="file" multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.pdf,.docx"
                  style={{ display: "none" }} onChange={handleFileAttach} />
                <label htmlFor="file-attach" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                  border: `1.5px dashed ${BORDER}`, background: LIGHT,
                  fontSize: 13, color: NAVY, fontFamily: FONT, fontWeight: 600,
                }}>
                  📎 Attach files <span style={{ fontWeight: 400, opacity: 0.6 }}>(JPG, PNG, PDF, DOCX)</span>
                </label>
                {attachedFiles.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {attachedFiles.map((f, i) => (
                      <div key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 20, background: "#e8eaf6",
                        fontSize: 12, color: NAVY, fontFamily: FONT,
                      }}>
                        <span>{f.kind === "image" ? "🖼️" : f.kind === "pdf" ? "📄" : "📝"}</span>
                        <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                        <span onClick={() => removeFile(i)} style={{ cursor: "pointer", color: RED, fontWeight: 700, fontSize: 14 }}>×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <div style={S.error}>{error}</div>}
              <button style={loading || !inputValue.trim() || (!notes.trim() && attachedFiles.length === 0) ? S.btnDisabled : S.btnPrimary}
                onClick={() => handleProcess(false)} disabled={loading || !inputValue.trim() || (!notes.trim() && attachedFiles.length === 0)}>
                {loading ? "Processing…" : "Analyse & Map Fields →"}
              </button>
              {inputValue.trim() && !loading && (
                <button
                  style={{ marginTop: 8, width: "100%", padding: "9px 0", background: "transparent", color: "#888", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}
                  onClick={() => handleProcess(true)}>
                  ↺ Wrong participant? Re-scan Snapforms (bypasses cache)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── SUCCESS STAGE ──────────────────────────────────────────────────────────
  if (stage === "success") return (
    <div style={S.page}>
      {sidebar}
      <div style={S.main}>
        <div style={S.centreWrap}>
          <div style={S.card}>
            <div style={S.redBar} />
            <div style={{ ...S.cardInner, textAlign: "center", padding: "56px 40px" }}>
              <div style={S.successCircle}>✓</div>
              <h2 style={S.successTitle}>Snapforms updated successfully</h2>
              <p style={S.successSub}>
                {fieldMap.filter(f => f.answer?.trim()).length + additionalUpdates.filter(u => u.content?.trim()).length} field(s) sent to response <strong>{responseId}</strong>
                {participantName ? ` for ${participantName}` : ""}.
              </p>
              <button style={{ ...S.btnPrimary, maxWidth: 280, margin: "28px auto 0", display: "block" }} onClick={handleReset}>
                Update Another Participant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── REVIEW STAGE ───────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {sidebar}
      <div style={S.main}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ ...S.cardTitle, margin: 0 }}>Review Before Sending</h2>
          <button
            onClick={handleRefineAll}
            disabled={loading}
            style={{ padding: "8px 16px", background: refineAll ? "#22c55e" : NAVY, color: WHITE, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
            {loading && refineAll ? "Refining…" : refineAll ? "✓ All Refined — Undo All" : "✨ Refine All"}
          </button>
        </div>
        <p style={{ ...S.cardSub, marginBottom: 20 }}>Edit content or change destination fields before sending to Snapforms</p>

        {fieldMap.map((field, idx) => (
          <div key={idx} style={{ ...S.fieldBlock, border: refinedAnswers[idx] !== undefined ? "1.5px solid #22c55e" : `1.5px solid ${BORDER}` }}>
            <div style={S.fieldRow}>
              <select style={S.select} value={field.key} onChange={e => updateFieldDestination(idx, e.target.value)}>
                {Object.entries(FIELD_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <button
                onClick={() => handleRefineField(idx)}
                disabled={!!refiningFields[idx]}
                style={{ padding: "5px 10px", background: refinedAnswers[idx] !== undefined ? "#22c55e" : "transparent", color: refinedAnswers[idx] !== undefined ? WHITE : NAVY, border: `1.5px solid ${refinedAnswers[idx] !== undefined ? "#22c55e" : BORDER}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: refiningFields[idx] ? "not-allowed" : "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
                {refiningFields[idx] ? "⟳" : refinedAnswers[idx] !== undefined ? "✓ Refined" : "✨ Refine"}
              </button>
              <button style={S.removeBtn} onClick={() => removeField(idx)}>✕</button>
            </div>
            <textarea style={S.fieldTextarea} value={field.answer} onChange={e => updateFieldAnswer(idx, e.target.value)} />
            <div style={S.snapLabel}>→ {field.question}</div>
          </div>
        ))}

        <div style={S.sectionDiv}><span style={S.sectionDivLabel}>Additional Updates</span></div>

        {additionalUpdates.map((u, idx) => (
          <div key={idx} style={S.fieldBlock}>
            <div style={S.fieldRow}>
              <select style={S.select} value={u.heading} onChange={e => {
                const heading = e.target.value;
                updateAdditionalUpdate(idx, { heading, fieldKey: SECTION_TO_FIELD_KEY[heading] || "" });
              }}>
                <option value="">— choose section —</option>
                {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button style={S.removeBtn} onClick={() => removeAdditionalUpdate(idx)}>✕</button>
            </div>
            {u.heading === "Other" && (
              <input style={{ ...S.input, marginBottom: 8 }} placeholder="Custom heading / section name"
                value={u.customHeading} onChange={e => updateAdditionalUpdate(idx, { customHeading: e.target.value })} />
            )}
            {u.heading && u.heading !== "Other" && SECTION_TO_FIELD_KEY[u.heading] && (
              <div style={{ marginBottom: 8 }}>
                <select style={S.select} value={u.fieldKey || SECTION_TO_FIELD_KEY[u.heading]}
                  onChange={e => updateAdditionalUpdate(idx, { fieldKey: e.target.value })}>
                  {Object.entries(FIELD_LABELS)
                    .filter(([k]) => k.startsWith(SECTION_TO_FIELD_KEY[u.heading]?.split("_")[0] + "_"))
                    .map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            )}
            <textarea style={S.fieldTextarea} placeholder="Enter update notes…" value={u.content}
              onChange={e => updateAdditionalUpdate(idx, { content: e.target.value })} />
            {u.fieldKey && SNAP_FIELDS[u.fieldKey] && <div style={S.snapLabel}>→ {SNAP_FIELDS[u.fieldKey]}</div>}
          </div>
        ))}

        <button style={S.btnAdd} onClick={addAdditionalUpdate}>+ Add Additional Update</button>

        <div style={S.sectionDiv}><span style={S.sectionDivLabel}>Assessment & Care Review (Section 47)</span></div>

        <div style={S.fieldBlock}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <input type="checkbox" id="includeReview" checked={includeReview}
              onChange={e => setIncludeReview(e.target.checked)} style={{ accentColor: RED, width: 16, height: 16, cursor: "pointer" }} />
            <label htmlFor="includeReview" style={{ fontSize: 14, color: NAVY, fontFamily: FONT, fontWeight: 500 }}>
              Include a review entry for this update
            </label>
          </div>
          {includeReview && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 160px" }}>
                <label style={S.label}>Date</label>
                <input style={S.input} value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
              </div>
              <div style={{ flex: "0 0 120px" }}>
                <label style={S.label}>Staff Initials</label>
                <input style={S.input} placeholder="e.g. RD" value={reviewInitials} onChange={e => setReviewInitials(e.target.value)} />
              </div>
              <div style={{ flex: "1 1 300px" }}>
                <label style={S.label}>Related To Which Section</label>
                <input style={S.input} value={reviewSections} onChange={e => setReviewSections(e.target.value)}
                  placeholder="Auto-suggested from updated sections" />
              </div>
            </div>
          )}
          {includeReview && reviewInitials.trim() && (
            <div style={{ ...S.snapLabel, marginTop: 8 }}>Preview: {buildReviewRow()}</div>
          )}
        </div>

        {error && <div style={S.error}>{error}</div>}

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 28 }}>
          <button
            onClick={handleRefineAll}
            disabled={loading}
            style={{ padding: "15px 20px", background: refineAll ? "#22c55e" : NAVY, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
            {loading && refineAll ? "Refining…" : refineAll ? "✓ Undo All" : "✨ Refine All"}
          </button>
          <button style={{ ...(loading || totalFields === 0 ? S.btnDisabled : S.btnSend), marginTop: 0, flex: 1 }}
            onClick={handleSend} disabled={loading || totalFields === 0}>
            {loading ? "Sending…" : `Send ${totalFields} Field${totalFields !== 1 ? "s" : ""} to Snapforms`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const S = {
  page:        { minHeight: "100vh", display: "flex", fontFamily: FONT, background: LIGHT },
  sidebar:     { width: 300, minWidth: 300, background: NAVY, display: "flex", flexDirection: "column", minHeight: "100vh" },
  logoWrap:    { padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  logo:        { height: 38, objectFit: "contain", filter: "brightness(0) invert(1)", maxWidth: "100%" },
  sidebarBody: { padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 },
  sidebarIntro:{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.65, margin: 0 },
  divider:     { height: 1, background: "rgba(255,255,255,0.1)", flexShrink: 0 },
  hintLabel:   { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 },
  hintBox:     { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 10px", color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" },
  participantCard: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "12px 14px" },
  pMeta:       { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: "6px 0 2px" },
  pName:       { color: WHITE, fontWeight: 700, fontSize: 14, margin: 0 },
  pId:         { color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "monospace", margin: 0 },
  fieldBadge:  { background: "rgba(236,31,36,0.14)", border: "1px solid rgba(236,31,36,0.28)", borderRadius: 8, padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  fieldBadgeNum:   { color: "#ff7073", fontSize: 30, fontWeight: 800, lineHeight: 1 },
  fieldBadgeLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 3 },
  btnGhost:    { padding: "10px 0", background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, textAlign: "center", marginTop: "auto" },
  main:        { flex: 1, padding: "36px 40px", overflowY: "auto", display: "flex", flexDirection: "column" },
  centreWrap:  { flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "60px" },
  card:        { background: WHITE, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(39,41,115,0.08)", border: `1px solid ${BORDER}`, width: "100%", maxWidth: 680 },
  redBar:      { height: 4, background: RED },
  cardInner:   { padding: "32px 36px" },
  cardTitle:   { fontSize: 21, fontWeight: 800, color: NAVY, margin: "0 0 4px 0", letterSpacing: "-0.02em" },
  cardSub:     { fontSize: 13, color: "#999", margin: "0 0 24px 0" },
  label:       { display: "block", fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 5, marginTop: 16, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: FONT },
  input:       { display: "block", width: "100%", padding: "10px 13px", border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none", background: WHITE, fontFamily: FONT, color: "#222" },
  btnPrimary:  { marginTop: 24, width: "100%", padding: "13px 0", background: RED, color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, letterSpacing: "0.05em", textTransform: "uppercase" },
  btnDisabled: { marginTop: 24, width: "100%", padding: "13px 0", background: "#c8cadc", color: WHITE, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "not-allowed", fontFamily: FONT, letterSpacing: "0.05em", textTransform: "uppercase" },
  btnSend:     { marginTop: 28, width: "100%", padding: "15px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT, letterSpacing: "0.05em", textTransform: "uppercase" },
  btnAdd:      { marginTop: 10, padding: "10px 0", background: "transparent", color: NAVY, border: `1.5px dashed ${BORDER}`, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT, width: "100%" },
  error:       { background: "#fff2f2", border: `1px solid ${RED}`, borderRadius: 8, padding: "10px 14px", color: RED, fontSize: 13, marginTop: 16, fontFamily: FONT },
  fieldBlock:  { background: WHITE, borderRadius: 10, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(39,41,115,0.04)" },
  fieldRow:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  select:      { flex: 1, padding: "8px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 6, fontSize: 13, background: WHITE, fontFamily: FONT, color: NAVY, fontWeight: 600, outline: "none" },
  removeBtn:   { background: "transparent", border: "none", color: "#c0c4d8", fontSize: 15, cursor: "pointer", padding: "4px 8px", borderRadius: 4 },
  fieldTextarea: { width: "100%", minHeight: 80, padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: LIGHT, resize: "vertical", fontFamily: FONT, color: "#333", outline: "none" },
  snapLabel:   { fontSize: 11, color: "#aaa", marginTop: 6, fontStyle: "italic", wordBreak: "break-word", fontFamily: FONT },
  sectionDiv:  { display: "flex", alignItems: "center", margin: "28px 0 16px" },
  sectionDivLabel: { background: NAVY, color: WHITE, padding: "5px 14px", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: FONT },
  successCircle: { width: 68, height: 68, borderRadius: "50%", background: "#22c55e", color: WHITE, fontSize: 34, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  successTitle:  { color: NAVY, fontSize: 21, fontWeight: 800, margin: "0 0 8px 0", letterSpacing: "-0.02em" },
  successSub:    { color: "#888", fontSize: 14, margin: 0 },
};