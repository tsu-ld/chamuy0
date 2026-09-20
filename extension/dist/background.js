// core/hash.ts
var HASH_SEED = 5381;
var HASH_SHIFT = 5;
var HASH_RADIX = 36;
function hashText(text) {
  let hash = HASH_SEED;
  for (let index = 0;index < text.length; index += 1) {
    hash = (hash << HASH_SHIFT) + hash ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(HASH_RADIX);
}
function textKey(text) {
  return `${hashText(text)}:${text.length}`;
}

// core/rubric.ts
var SCORE_QUESTION_KEY = "slop_score";
var VERDICTS = ["clean", "borderline", "slop"];
var SCORE_INSTRUCTIONS = "Score how much this post is slop: engagement bait, rage bait, broetry, manufactured hooks, hype, empty jargon, generic AI or content-farm prose, or a fabricated story with a forced lesson. Judge content and style, whatever the language. Concrete substance anchors the score: a named tool, real numbers, a dated first-person failure or a genuine offhand anecdote keeps a post low even when it is polished or lightly hyped; but concreteness does not rescue a post whose point is hype, a manufactured hook, broetry or a forced lesson. Reserve the fabricated-story reading for a parable: a stranger, boss or client delivering a tidy lesson that ends in a pitch, not any first-person work story. Level 0 is plain and concrete; level 9 is pure interaction bait that adds nothing.";
var SCORE_CRITERIA = [
  "Plain, concrete and specific. Real information or a genuine, offhand anecdote, no hype.",
  "Real substance with a little polish or hype; still worth reading.",
  "Real information wrapped in a template or emoji bullets, but the substance survives: names, numbers or dated events are present.",
  "Content-farm texture: generic advice with a thin concrete core, or a mild brag.",
  "Vague or promotional, with some real substance left.",
  "Half substance, half filler: the point is thin and the packaging does the work.",
  "Filler dominates: stock phrases, hype or formatting carry a nearly empty post.",
  "A story engineered as bait: convenient anecdote, quoted dialogue, tidy lesson.",
  "Classic bait: broetry formatting, jargon, manufactured hook, forced moral.",
  "Pure engagement bait: asks for interaction, adds nothing, or is fully fabricated."
];
var SIGNAL_DEFINITIONS = [
  {
    key: "engagement_bait",
    label: "Engagement bait",
    instructions: `Asks for interaction or gates value behind it: like, comment, tag, repost or follow requests; "comment X and I'll DM"; link in comments; tag-piggybacking; false scarcity; "agree?"; empty closer questions.`,
    criteria: {
      true: "Asks for interaction or gates value behind engagement.",
      false: "Does not ask for interaction or gate value behind engagement."
    }
  },
  {
    key: "humblebrag",
    label: "Humblebrag",
    instructions: 'Shows off a success, status or virtue through complaint, humility, vulnerability or advice: "Humbled to announce", "So tired from my keynote", "Rejected 100 times", credential title stacks.',
    criteria: {
      true: "Brags about success, status or virtue through a humble or vulnerable framing.",
      false: "Does not brag through a humble or vulnerable framing."
    }
  },
  {
    key: "ai_generic",
    label: "AI generic",
    instructions: 'Reads machine- or content-farm-written: templates, LLM lexis (delve, tapestry, pivotal), translated calques ("en el vertiginoso mundo actual", "cabe destacar"), -ing analysis, negative parallelism, rule of three, connector chains, vague attribution, generic opens or closes, emoji bullets, markdown leakage, flat rhythm.',
    criteria: {
      true: "Reads like generated or content-farm text, not a person writing about something specific.",
      false: "Reads like a person writing about something specific."
    }
  },
  {
    key: "buzzwords",
    label: "Corporate buzzwords",
    instructions: "Dense empty corporate or fashion jargon: synergy, mindset, disruptive, thought leadership, growth mindset, relentless execution, personal brand, the future of work, at scale, 10x, rockstar, we're like a family, competitive salary.",
    criteria: {
      true: "Heavy use of empty corporate or fashion jargon.",
      false: "Little or no empty corporate jargon."
    }
  },
  {
    key: "broetry",
    label: "Broetry",
    instructions: "One sentence per line formatting: stacked short paragraphs, blank-line pauses, single-line suspense fragments and cliffhangers that manufacture drama.",
    criteria: {
      true: "Built from dramatic one-line paragraphs and manufactured pauses.",
      false: "Uses normal paragraph structure."
    }
  },
  {
    key: "fake_story",
    label: "Fabricated story",
    instructions: "A convenient anecdote polished for virality: word-for-word dialogue with a stranger, boss or janitor, mirrored-date turnarounds, a reversal, and a tidy lesson that usually ends in a pitch.",
    criteria: {
      true: "Convenient anecdote with quoted dialogue and a tidy, viral-ready lesson.",
      false: "No convenient anecdote with quoted dialogue and a tidy lesson."
    }
  },
  {
    key: "template_hook",
    label: "Manufactured hook",
    instructions: `Opens with an engineered hook instead of the point: curiosity gap, an eavesdrop quote ("'You're too expensive.' I hear this every week"), "After N years...", "Everyone told me...", "I was wrong about...", "This changed everything", "Here's what nobody tells you", "The result?", or a life event forced into a business lesson.`,
    criteria: {
      true: "Opens with an engineered hook or forced lesson frame.",
      false: "Opens with a plain statement or the actual point."
    }
  },
  {
    key: "rage_bait",
    label: "Rage bait",
    instructions: 'Frames outrage or moral emotion as the point: accusatory "you" blame, absolutist always/never/everyone claims, moral-emotional stacking, or a strawman the post invites readers to fight.',
    criteria: {
      true: "Frames outrage or moral emotion to provoke reaction rather than inform.",
      false: "Informs or opines without outrage framing or accusatory blame."
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

// core/examples.ts
var MAX_PER_LABEL = 2;
var EXCERPT_LENGTH = 600;
function addExample(pool, text, label) {
  const id = textKey(text);
  const rest = pool.filter((entry) => entry.id !== id);
  return [...rest, { id, label, text }];
}
function buildState(post, pool) {
  const samples = pickSamples(pool);
  if (samples.length === 0)
    return post;
  const blocks = samples.map((entry) => `[${entry.label}]
${excerpt(entry.text)}`);
  return `Labeled reference posts:

${blocks.join(`

`)}

Post to classify:

${post}`;
}
function pickSamples(pool) {
  return VERDICTS.flatMap((label) => pool.filter((entry) => entry.label === label).slice(-MAX_PER_LABEL));
}
function excerpt(text) {
  if (text.length <= EXCERPT_LENGTH)
    return text;
  return `${text.slice(0, EXCERPT_LENGTH)}...`;
}

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
  const excerpt2 = detail.slice(0, ERROR_EXCERPT_LENGTH);
  return new JevError(`Jev responded ${response.status}: ${excerpt2}`, response.status, readRetryAfterMs(response));
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

// extension/api.ts
var scope = globalThis;
var extensionApi = scope.browser ?? scope.chrome;
var isGecko = scope.browser !== undefined;
function onLocalChange(field, listener) {
  extensionApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(field in changes))
      return;
    listener(changes[field].newValue);
  });
}

// core/hide.ts
var MIN_THRESHOLD = 0;
var MAX_THRESHOLD = 10;
function parseHide(value) {
  if (typeof value !== "object" || value === null) {
    return { enabled: false, threshold: SLOP_MIN_SCORE };
  }
  const candidate = value;
  return {
    enabled: Boolean(candidate.enabled),
    threshold: clampThreshold(candidate.threshold)
  };
}
function clampThreshold(threshold) {
  if (typeof threshold !== "number" || !Number.isFinite(threshold))
    return SLOP_MIN_SCORE;
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, threshold));
}
function shouldHide(score, settings) {
  return settings.enabled && score >= settings.threshold;
}

// extension/storage.ts
var API_KEY_FIELD = "apiKey";
var TRAINING_FIELD = "trainingExamples";
var HIDE_FIELD = "hide";
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
async function readHide() {
  const stored = await extensionApi.storage.local.get(HIDE_FIELD);
  return parseHide(stored[HIDE_FIELD]);
}
async function writeHide(settings) {
  await extensionApi.storage.local.set({ [HIDE_FIELD]: settings });
}
function onHideChange(listener) {
  onLocalChange(HIDE_FIELD, (value) => listener(parseHide(value)));
}

// extension/background.ts
var MIN_TEXT_LENGTH = 20;
var MAX_TEXT_LENGTH = 8000;
extensionApi.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  respond(raw, sendResponse);
  return true;
});
extensionApi.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install")
    extensionApi.runtime.openOptionsPage();
});
async function respond(raw, sendResponse) {
  try {
    sendResponse(await route(readMessage(raw)));
  } catch (error) {
    sendResponse({ ok: false, code: "request", error: messageOf(error) });
  }
}
async function route(message) {
  switch (message.type) {
    case "classify":
      return classify(message.text);
    case "label":
      return label(message);
    default:
      extensionApi.runtime.openOptionsPage();
      return { ok: true };
  }
}
function readMessage(raw) {
  if (typeof raw !== "object" || raw === null || !("type" in raw)) {
    throw new Error("Malformed extension message");
  }
  const candidate = raw;
  if (candidate.type === "classify")
    return { type: "classify", text: readText(candidate.text) };
  if (candidate.type === "label") {
    if (!isVerdict(candidate.label))
      throw new Error("Unknown training label");
    return { type: "label", text: readText(candidate.text), label: candidate.label };
  }
  if (candidate.type === "openOptions")
    return { type: "openOptions" };
  throw new Error(`Unknown message type: ${String(candidate.type)}`);
}
function readText(value) {
  if (typeof value !== "string" || value.length < MIN_TEXT_LENGTH || value.length > MAX_TEXT_LENGTH) {
    throw new Error("Invalid post text");
  }
  return value;
}
async function classify(text) {
  const apiKey = await readApiKey();
  if (!apiKey)
    return { ok: false, code: "no-key", error: "TypeSafe API key not set" };
  if (!await hasApiAccess()) {
    return { ok: false, code: "no-access", error: "Access to TypeSafe was not granted" };
  }
  try {
    const pool = await readTraining();
    const response = await askJev(buildQuestions(), buildState(text, pool), { apiKey });
    return {
      ok: true,
      verdict: toVerdict(response.answers),
      model: response.model ?? DEFAULT_MODEL,
      trainedOn: pool.length
    };
  } catch (error) {
    return { ok: false, code: "request", error: messageOf(error) };
  }
}
async function label(message) {
  const pool = await readTraining();
  const updated = addExample(pool, message.text, message.label);
  await writeTraining(updated);
  return { ok: true, count: updated.length };
}
async function hasApiAccess() {
  return hasAccess([API_ORIGIN]);
}
async function hasAccess(origins) {
  return extensionApi.permissions.contains({ origins });
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
