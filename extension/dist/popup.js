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

// extension/api.ts
var scope = globalThis;
var extensionApi = scope.browser ?? scope.chrome;
function onLocalChange(field, listener) {
  extensionApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(field in changes))
      return;
    listener(changes[field].newValue);
  });
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

// extension/popup.ts
var EXCERPT_LIMIT = 140;
var SHOWN_LIMIT = 4;
var SCORE_DECIMALS = 1;
var keyInput = mustFind("#api-key");
var keyForm = mustFind("#key-form");
var keyStatus = mustFind("#key-status");
var trainingCount = mustFind("#training-count");
var trainingList = mustFind("#training-list");
var hideEnabled = mustFind("#hide-enabled");
var hideThreshold = mustFind("#hide-threshold");
var hideValue = mustFind("#hide-value");
var hideStatus = mustFind("#hide-status");
async function start() {
  keyInput.value = await readApiKey();
  renderHide(await readHide());
  await renderTraining();
  keyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveKey();
  });
  hideEnabled.addEventListener("change", () => {
    saveHide();
  });
  hideThreshold.addEventListener("input", () => {
    renderHide(readHideForm());
  });
  hideThreshold.addEventListener("change", () => {
    saveHide();
  });
}
async function saveKey() {
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    keyStatus.textContent = "Enter a key first.";
    return;
  }
  await writeApiKey(apiKey);
  keyStatus.textContent = "Saved. Open or reload linkedin.com to classify with it.";
}
function readHideForm() {
  return { enabled: hideEnabled.checked, threshold: Number(hideThreshold.value) };
}
function renderHide(settings) {
  hideEnabled.checked = settings.enabled;
  hideThreshold.value = String(settings.threshold);
  hideValue.value = settings.threshold.toFixed(SCORE_DECIMALS);
  hideStatus.textContent = settings.enabled ? `Reads like: at or above ${settings.threshold.toFixed(SCORE_DECIMALS)}, the post collapses to a marker. Show brings it back.` : "Reads like: off. Every post stays in the feed.";
}
async function saveHide() {
  const settings = readHideForm();
  await writeHide(settings);
  renderHide(parseHide(settings));
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
