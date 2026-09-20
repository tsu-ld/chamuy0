// extension/api.ts
var scope = globalThis;
var extensionApi = scope.browser ?? scope.chrome;
var isGecko = scope.browser !== undefined;

// core/jev.ts
var DEFAULT_MODEL = "jev-1.13.0";
var BASE_URL = "https://api.typesafe.ai/v1/systemone";
var API_ORIGIN = "https://api.typesafe.ai/*";
var MAX_RETRIES = 2;
var BACKOFF_MS = 500;
var JITTER_RATIO = 0.25;
var TIMEOUT_MS = 1e4;
var MS_PER_SECOND = 1000;
var MAX_RETRY_AFTER_MS = 2000;
var ERROR_EXCERPT_LENGTH = 200;
var HTTP_REQUEST_TIMEOUT = 408;
var HTTP_UNPROCESSABLE = 422;
var HTTP_RATE_LIMIT = 429;
var HTTP_SERVER_ERROR_FLOOR = 500;
var NETWORK_FAILURE = 0;

class JevError extends Error {
  status;
  retryAfterMs;
  constructor(message, status, retryAfterMs = 0) {
    super(message);
    this.name = "JevError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}
async function askJev(questions, state, options) {
  const resolved = { apiKey: options.apiKey, model: options.model ?? DEFAULT_MODEL };
  async function attempt(retriesLeft) {
    try {
      return await postOnce(questions, state, resolved);
    } catch (error) {
      const failure = toJevError(error);
      if (retriesLeft === 0 || !isRetryable(failure.status))
        throw failure;
      await pause(failure.retryAfterMs, MAX_RETRIES - retriesLeft);
      return attempt(retriesLeft - 1);
    }
  }
  return attempt(MAX_RETRIES);
}
async function postOnce(questions, state, options) {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ model: options.model, questions, state }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok)
    throw await responseFailure(response);
  const payload = await response.json();
  return readResponse(payload);
}
function readResponse(payload) {
  if (typeof payload !== "object" || payload === null) {
    throw new JevError("Jev returned a non-object payload", HTTP_UNPROCESSABLE);
  }
  const candidate = payload;
  if (typeof candidate.answers !== "object" || candidate.answers === null) {
    throw new JevError("Jev payload is missing answers", HTTP_UNPROCESSABLE);
  }
  return {
    answers: candidate.answers,
    model: typeof candidate.model === "string" ? candidate.model : undefined
  };
}
async function responseFailure(response) {
  const detail = await response.text();
  const excerpt = detail.slice(0, ERROR_EXCERPT_LENGTH);
  return new JevError(`Jev responded ${response.status}: ${excerpt}`, response.status, readRetryAfterMs(response));
}
function readRetryAfterMs(response) {
  const milliseconds = response.headers.get("retry-after-ms");
  if (milliseconds) {
    const parsed2 = Number(milliseconds);
    return Number.isFinite(parsed2) && parsed2 > 0 ? parsed2 : 0;
  }
  const seconds = response.headers.get("retry-after");
  if (!seconds)
    return 0;
  const parsed = Number(seconds);
  return Number.isFinite(parsed) && parsed > 0 ? parsed * MS_PER_SECOND : 0;
}
async function pause(retryAfterMs, attemptNumber) {
  const backoff = BACKOFF_MS * 2 ** attemptNumber;
  const jitter = BACKOFF_MS * JITTER_RATIO * Math.random();
  const waitMs = Math.max(Math.min(retryAfterMs, MAX_RETRY_AFTER_MS), backoff + jitter);
  await new Promise((resolve) => {
    setTimeout(resolve, waitMs);
  });
}
function isRetryable(status) {
  if (status === NETWORK_FAILURE || status === HTTP_REQUEST_TIMEOUT || status === HTTP_RATE_LIMIT) {
    return true;
  }
  return status >= HTTP_SERVER_ERROR_FLOOR;
}
function toJevError(error) {
  if (error instanceof JevError)
    return error;
  const message = error instanceof Error ? error.message : "Jev request failed";
  return new JevError(message, NETWORK_FAILURE);
}

// extension/origins.ts
var LINKEDIN_ORIGIN = "https://www.linkedin.com/*";
var ACCESS_ORIGINS = [LINKEDIN_ORIGIN, API_ORIGIN];

// core/rubric.ts
var SCORE_QUESTION_KEY = "slop_score";
var VERDICTS = ["clean", "borderline", "slop"];
var SCORE_INSTRUCTIONS = "Rate how much this LinkedIn post is slop: engagement bait, broetry (dramatic one-line paragraphs), manufactured hype, empty corporate jargon, generic AI-written text, or a fabricated story with a forced moral. Judge content and style, regardless of the post language. A post can cite numbers and still be slop when it wraps them in hype or reads like a content-farm summary. A first-person story that quotes a boss, recruiter or colleague word for word and ends with a tidy lesson is usually fabricated bait; a messy, offhand anecdote without a tidy lesson is not. The first level is a plain, concrete post with real information or a genuine personal anecdote; the last level is pure bait that asks for interaction while adding nothing.";
var SCORE_CRITERIA = [
  "Plain, concrete, verifiable information or a real specific personal experience, written without hype.",
  "Real substance with a touch of hype or formatting.",
  "Real information wrapped in hype, emoji bullets or manufactured excitement.",
  "Content-farm texture: recycled news, breathless tone, little of the author in it.",
  "Vague or promotional, with some real substance.",
  "Half substance, half filler or self-promotion.",
  "Filler dominates, with very little information.",
  "A story engineered as bait: fake vulnerability, quoted dialogue, tidy moral; or promotion disguised as advice.",
  "Classic bait: broetry formatting, jargon, forced moral.",
  "Pure engagement bait: asks for likes, comments or reposts while adding nothing."
];
var SIGNAL_DEFINITIONS = [
  {
    key: "engagement_bait",
    label: "Engagement bait",
    instructions: 'Explicitly asks for interaction (like, comment, tag, repost) or closes with empty questions such as "agree?".',
    criteria: {
      true: "Explicitly asks for interaction or closes with an empty question.",
      false: "Does not ask for interaction or close with an empty question."
    }
  },
  {
    key: "humblebrag",
    label: "Humblebrag",
    instructions: "Shows off an achievement, success or virtue disguised as humility, vulnerability or advice.",
    criteria: {
      true: "Brags about a success or virtue through a humble or vulnerable framing.",
      false: "Does not brag through a humble or vulnerable framing."
    }
  },
  {
    key: "ai_generic",
    label: "AI generic",
    instructions: "Reads like AI-generated or content-farm text: predictable template, filler phrases, emoji bullet lists, breathless hype, no personal voice and no concrete details.",
    criteria: {
      true: "Reads like AI-generated or content-farm text with template structure and no personal voice.",
      false: "Reads like text written by a person about something specific."
    }
  },
  {
    key: "buzzwords",
    label: "Corporate buzzwords",
    instructions: 'High density of empty corporate or fashion jargon (synergy, mindset, disruptive, leadership, "the future of work").',
    criteria: {
      true: "Heavy use of empty corporate or fashion jargon.",
      false: "Little or no empty corporate jargon."
    }
  },
  {
    key: "broetry",
    label: "Broetry",
    instructions: "Uses one-sentence-per-line dramatic formatting: stacked short lines and pauses that manufacture emotion or suspense.",
    criteria: {
      true: "Built from dramatic one-line paragraphs and manufactured pauses.",
      false: "Uses normal paragraph structure."
    }
  },
  {
    key: "fake_story",
    label: "Fabricated story",
    instructions: "Tells a convenient anecdote with quoted dialogue and a tidy lesson, as if fabricated or polished for virality.",
    criteria: {
      true: "Convenient anecdote with quoted dialogue and a tidy, viral-ready lesson.",
      false: "No convenient anecdote with quoted dialogue and a tidy lesson."
    }
  }
];
var CLEAN_MAX_SCORE = 2.5;
var SLOP_MIN_SCORE = 5;
var SIGNAL_ON_THRESHOLD = 0.5;
var SCORE_PRECISION = 10;
var SCORE_RAW_MIN = 0;
var SCORE_RAW_MAX = SCORE_CRITERIA.length - 1;
var SCORE_DISPLAY_MAX = 10;
var SCORE_DISPLAY_FACTOR = SCORE_DISPLAY_MAX / SCORE_RAW_MAX;
var VERDICT_QUESTION_KEY = "verdict_choice";
var AMBIGUITY_MARGIN = 0.6;
var VERDICT_INSTRUCTIONS = "Decide the final verdict for this post: clean (a reader gets real value), borderline (mixed: real substance with promotional or hype framing), or slop (low-value bait a careful reader should skip).";
var VERDICT_OPTIONS = {
  clean: "Concrete information or a genuine anecdote, no sales or virality agenda.",
  borderline: "Real substance mixed with promotion, hype or bait framing.",
  slop: "Engagement farming, broetry, manufactured hype or generic filler."
};
function buildQuestions() {
  const questions = {
    [SCORE_QUESTION_KEY]: { type: "score", instructions: SCORE_INSTRUCTIONS, criteria: SCORE_CRITERIA },
    [VERDICT_QUESTION_KEY]: { type: "choice", instructions: VERDICT_INSTRUCTIONS, criteria: VERDICT_OPTIONS }
  };
  for (const definition of SIGNAL_DEFINITIONS) {
    questions[definition.key] = {
      type: "noul",
      instructions: definition.instructions,
      criteria: definition.criteria
    };
  }
  return questions;
}
function isVerdict(value) {
  return typeof value === "string" && VERDICTS.includes(value);
}
function toVerdict(answers) {
  const rawScore = readScore(answers, SCORE_QUESTION_KEY);
  const score = roundScore(rawScore * SCORE_DISPLAY_FACTOR);
  const signals = SIGNAL_DEFINITIONS.map((definition) => {
    const probability = readProbability(answers, definition.key);
    return {
      key: definition.key,
      label: definition.label,
      probability,
      on: probability > SIGNAL_ON_THRESHOLD
    };
  });
  return { score, verdict: resolveVerdict(score, readChoice(answers)), signals };
}
function resolveVerdict(score, choice) {
  if (isNearBoundary(score))
    return choice;
  return verdictFor(score);
}
function isNearBoundary(score) {
  const nearClean = Math.abs(score - CLEAN_MAX_SCORE) <= AMBIGUITY_MARGIN;
  const nearSlop = Math.abs(score - SLOP_MIN_SCORE) <= AMBIGUITY_MARGIN;
  return nearClean || nearSlop;
}
function readChoice(answers) {
  const answer = answers[VERDICT_QUESTION_KEY];
  if (!answer || !isVerdict(answer.choice)) {
    throw new Error(`Jev answer "${VERDICT_QUESTION_KEY}" must contain a valid verdict`);
  }
  return answer.choice;
}
function readScore(answers, key) {
  const answer = answers[key];
  if (!answer || typeof answer.score !== "number" || !Number.isFinite(answer.score)) {
    throw new Error(`Jev answer "${key}" must contain a finite score`);
  }
  if (answer.score < SCORE_RAW_MIN || answer.score > SCORE_RAW_MAX) {
    throw new Error(`Jev score "${key}" is out of the expected level range`);
  }
  return answer.score;
}
function readProbability(answers, key) {
  const answer = answers[key];
  if (!answer || typeof answer.noul !== "number" || !Number.isFinite(answer.noul)) {
    throw new Error(`Jev answer "${key}" must contain a finite probability`);
  }
  if (answer.noul < SCORE_RAW_MIN || answer.noul > 1) {
    throw new Error(`Jev probability "${key}" is out of the 0 to 1 range`);
  }
  return answer.noul;
}
function roundScore(score) {
  return Math.round(score * SCORE_PRECISION) / SCORE_PRECISION;
}
function verdictFor(score) {
  if (score >= SLOP_MIN_SCORE)
    return "slop";
  if (score < CLEAN_MAX_SCORE)
    return "clean";
  return "borderline";
}

// extension/storage.ts
var API_KEY_FIELD = "apiKey";
var TRAINING_FIELD = "trainingExamples";
async function readApiKey() {
  const stored = await extensionApi.storage.local.get(API_KEY_FIELD);
  const value = stored[API_KEY_FIELD];
  return typeof value === "string" ? value : "";
}
async function writeApiKey(apiKey) {
  await extensionApi.storage.local.set({ [API_KEY_FIELD]: apiKey });
}
async function readTraining() {
  const stored = await extensionApi.storage.local.get(TRAINING_FIELD);
  const value = stored[TRAINING_FIELD];
  if (!Array.isArray(value))
    return [];
  return value.filter(isTrainingExample);
}
function isTrainingExample(entry) {
  if (typeof entry !== "object" || entry === null)
    return false;
  const candidate = entry;
  return typeof candidate.id === "string" && typeof candidate.text === "string" && isVerdict(candidate.label);
}
async function writeTraining(pool) {
  await extensionApi.storage.local.set({ [TRAINING_FIELD]: pool });
}

// extension/popup.ts
var EXCERPT_LIMIT = 140;
var SHOWN_LIMIT = 4;
var keyInput = mustFind("#api-key");
var keyForm = mustFind("#key-form");
var keyStatus = mustFind("#key-status");
var accessButton = mustFind("#access-button");
var accessStatus = mustFind("#access-status");
var accessManual = mustFind("#access-manual");
var trainingCount = mustFind("#training-count");
var trainingList = mustFind("#training-list");
async function start() {
  keyInput.value = await readApiKey();
  await refreshAccess();
  await renderTraining();
  accessButton.addEventListener("click", () => {
    requestAccess();
  });
  keyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveKey();
  });
  extensionApi.permissions.onAdded.addListener(() => {
    refreshAccess();
  });
  extensionApi.permissions.onRemoved.addListener(() => {
    refreshAccess();
  });
}
async function requestAccess() {
  const granted = await extensionApi.permissions.request({ origins: ACCESS_ORIGINS });
  await refreshAccess(!granted);
  return granted;
}
async function refreshAccess(promptDismissed = false) {
  const granted = await extensionApi.permissions.contains({ origins: ACCESS_ORIGINS });
  accessButton.hidden = granted;
  accessManual.hidden = granted || !isGecko;
  if (granted) {
    accessStatus.textContent = "Access granted. Open or reload linkedin.com.";
    return;
  }
  if (promptDismissed) {
    accessStatus.textContent = isGecko ? "The prompt closed before you could answer. Grant access by hand." : "Access was denied. Click the button again and choose Allow.";
    return;
  }
  accessStatus.textContent = "Access is off. Click the button and accept the prompt.";
}
async function saveKey() {
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    keyStatus.textContent = "Enter a key first.";
    return;
  }
  await writeApiKey(apiKey);
  const granted = await extensionApi.permissions.contains({ origins: ACCESS_ORIGINS });
  keyStatus.textContent = granted ? "Saved. Open or reload linkedin.com to classify with it." : "Saved. Grant access in step 1, then open linkedin.com.";
}
async function renderTraining() {
  const pool = await readTraining();
  trainingCount.textContent = pool.length === 0 ? "No examples yet." : `${pool.length} examples stored, newest first.`;
  const shown = pool.slice(-SHOWN_LIMIT).reverse();
  trainingList.replaceChildren(...shown.map(buildExampleRow));
}
function buildExampleRow(example) {
  const row = document.createElement("li");
  row.className = "lnslop-example";
  const tag = document.createElement("span");
  tag.className = `lnslop-tag lnslop-tag-${example.label}`;
  tag.textContent = example.label;
  const text = document.createElement("span");
  text.className = "lnslop-example-text";
  text.textContent = excerpt(example.text);
  row.append(tag, text);
  return row;
}
function excerpt(text) {
  if (text.length <= EXCERPT_LIMIT)
    return text;
  return `${text.slice(0, EXCERPT_LIMIT)}...`;
}
function mustFind(selector) {
  const node = document.querySelector(selector);
  if (!node)
    throw new Error(`Missing element ${selector}`);
  return node;
}
start();
