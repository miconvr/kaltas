const MAX_QUESTION_LENGTH = 600;
const MAX_FIELD_LENGTH = 1200;

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function allowOrigin(req, res) {
  const origin = req.headers.origin;
  if (origin && (origin.startsWith("chrome-extension://") || origin === "http://localhost")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
}

function text(value, limit = MAX_FIELD_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

module.exports = async function handler(req, res) {
  allowOrigin(req, res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "POST required" });
  if (!process.env.GEMINI_API_KEY) return sendJson(res, 503, { error: "AI assistant is not configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const question = text(body.question, MAX_QUESTION_LENGTH);
  const offer = body.offer && typeof body.offer === "object" ? body.offer : {};
  const name = text(offer.name, 160);
  const perk = text(offer.perk);
  const details = text(offer.details);
  const requirements = text(offer.requirements);
  const caveats = text(offer.caveats);

  if (!question || !name || !perk) {
    return sendJson(res, 400, { error: "question, offer.name, and offer.perk are required" });
  }

  const prompt = [
    "You are Iskolar's student-discount assistant.",
    "Answer only from the supplied offer record. Do not invent prices, eligibility, dates, links, or policies.",
    "If the record does not answer the question, say that the student should check the official offer page.",
    "Keep the answer under 120 words. Be clear and practical.",
    "",
    `Offer: ${name}`,
    `Perk: ${perk}`,
    details ? `Details: ${details}` : "",
    requirements ? `Who qualifies: ${requirements}` : "",
    caveats ? `Good to know: ${caveats}` : "",
    "",
    `Student question: ${question}`,
  ].filter(Boolean).join("\n");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "Never claim that an offer is current or guaranteed. Use the supplied facts only." }],
        },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 220 },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("Gemini request failed", upstream.status);
      return sendJson(res, 502, { error: "AI provider request failed" });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) {
      console.error("Gemini response had no text");
      return sendJson(res, 502, { error: "AI provider returned no answer" });
    }
    return sendJson(res, 200, { answer: answer.trim() });
  } catch (error) {
    console.error("Offer assistant request failed", error);
    return sendJson(res, 502, { error: "AI assistant is temporarily unavailable" });
  }
};
