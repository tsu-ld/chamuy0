// core/rubric.ts
var SCORE_QUESTION_KEY = "slop_score";
var VERDICTS = ["clean", "borderline", "slop"];
var SCORE_INSTRUCTIONS = "Score how much this post is slop: engagement bait, rage bait, broetry, manufactured hooks, hype, empty jargon, generic AI or content-farm prose, a fabricated story with a forced lesson, or promotion dressed as content. Judge content and style, whatever the language. The state says whether this is a feed post or a comment and whether media is attached. A comment is conversation: a short reply, joke or reaction is normal and not slop. But a comment that asserts a provocative claim, dunks on an easy target or reports outrage with nothing behind it is a hot take, not conversation, and a hot take belongs at level 5 or higher. When media is attached the text is a caption: a short caption that leans on the image or video is not bait by itself, and media never rescues a sponsored, promotional or engagement-farming post. Paid, gifted or affiliate promotion presented through a lesson, story or testimonial makes the post promotional packaging: put it at level 5 or higher even when the details are technical, unless the sponsorship is a minor aside in an otherwise useful first-person account. A bare hot take also puts the post at level 5 or higher. Concrete substance anchors the score: a named tool, real numbers or a genuine offhand anecdote keeps a plainly reported post low even when it is polished or lightly hyped. But first-person detail does not lower a post whose point is a hardship or victim story engineered as a hook, a hot take, broetry, a forced lesson or a paid placement. Reserve the fabricated-story reading for a parable: a stranger, boss or client delivering a tidy lesson that ends in a pitch. A first-person work story, or a comic anecdote told for its own sake, is not a parable. A post that adds nothing, like a greeting or a one-line reaction, is low-value rather than pure bait. Level 0 is plain and concrete; level 9 is pure interaction bait, a fully fabricated story, or content whose only purpose is promotion.";
var SCORE_CRITERIA = [
  "Plain, concrete and specific. Real information or a genuine, offhand anecdote, no hype.",
  "Real substance with a little polish or hype; still worth reading.",
  "Real information wrapped in a template or emoji bullets, but the substance survives: names, numbers or dated events are present. A friendly reply or joke that stays conversational also sits here; a take that asserts rather than informs does not.",
  "Content-farm texture: generic advice with a thin concrete core, a mild brag, or a flat low-value take.",
  "Vague or promotional, with some real substance left. A sparse but provocative claim lands here too.",
  "Half substance, half filler: the point is thin and the packaging does the work, or a bold claim with nothing behind it.",
  "Filler dominates: stock phrases, hype or formatting carry a nearly empty post.",
  "A story engineered as bait: convenient anecdote, quoted dialogue, tidy lesson.",
  "Classic bait: broetry formatting, jargon, manufactured hook, forced moral; or a sponsored lesson where the promotion drives the post.",
  "Pure engagement bait: asks for interaction, adds nothing, is fully fabricated, or sells through a story with no value outside the pitch."
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
    key: "sponsored",
    label: "Sponsored or collab",
    instructions: 'Carries a paid partnership, gift or affiliate promotion presented as content: "#ad", "sponsored", "thanks to X for collaborating with me on this post", "my partner", "they sent me this", a referral push, or a third-party brand woven into a lesson or testimonial. Announcing your own product, event or service plainly is not sponsorship.',
    criteria: {
      true: "Presents a paid partnership, gift, affiliate or third-party promotion as content.",
      false: "No paid partnership, gift or affiliate promotion."
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
    instructions: "A convenient anecdote polished for virality: word-for-word dialogue with a stranger, boss or janitor, mirrored-date turnarounds, a reversal, and a tidy lesson that usually ends in a pitch. Not a self-deprecating or comic anecdote that ends on a punchline.",
    criteria: {
      true: "Convenient anecdote with quoted dialogue and a tidy lesson or pitch.",
      false: "No convenient anecdote with a tidy lesson or pitch; a comic anecdote is not one."
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
  },
  {
    key: "hot_take",
    label: "Hot take",
    instructions: 'States a bold or provocative claim as if it were a finding, with no source, evidence or firsthand experience: a dunk, a sweeping "the industry is rotten" one-liner, or a controversy framed for argument. A claim backed by a source, numbers or firsthand work is not a hot take.',
    criteria: {
      true: "Bold claim with no source, evidence or firsthand experience behind it.",
      false: "Backs its claims, or makes no provocative claim."
    }
  }
];
var REASON_QUESTION_KEY = "main_reason";
var REASON_INSTRUCTIONS = "Name the single trait that most drives the score. Use none only when the post is plain or an ordinary conversational reply, and low_value when it adds nothing but is not bait. When the score is 5 or higher, choose the flaw that drives it, not none.";
var REASON_LABELS = {
  none: "Reads human",
  low_value: "Low-value filler",
  ...Object.fromEntries(SIGNAL_DEFINITIONS.map((definition) => [definition.key, definition.label]))
};
var CLEAN_MAX_SCORE = 2.5;
var SLOP_MIN_SCORE = 5;
var SIGNAL_ON_THRESHOLD = 0.5;
var SCORE_PRECISION = 10;
var SCORE_RAW_MIN = 0;
var SCORE_RAW_MAX = SCORE_CRITERIA.length - 1;
var SCORE_DISPLAY_MAX = 10;
var SCORE_DISPLAY_FACTOR = SCORE_DISPLAY_MAX / SCORE_RAW_MAX;
function buildQuestions() {
  const questions = {
    [SCORE_QUESTION_KEY]: { type: "score", instructions: SCORE_INSTRUCTIONS, criteria: SCORE_CRITERIA },
    [REASON_QUESTION_KEY]: { type: "choice", instructions: REASON_INSTRUCTIONS, criteria: buildReasonOptions() }
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
function buildReasonOptions() {
  const options = {
    none: "Plain, concrete, or an ordinary conversational reply: no bait.",
    low_value: "Adds nothing specific, but is not farming engagement."
  };
  for (const definition of SIGNAL_DEFINITIONS)
    options[definition.key] = definition.criteria.true;
  return options;
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
  const stated = readReason(answers);
  const floored = applyFloors(score, stated);
  return { score: floored, verdict: verdictFor(floored), reason: resolveReason(stated, floored, signals), signals };
}
function applyFloors(score, stated) {
  if (stated !== "sponsored" && stated !== "hot_take")
    return score;
  return Math.max(score, SLOP_MIN_SCORE);
}
function verdictFor(score) {
  if (score >= SLOP_MIN_SCORE)
    return "slop";
  if (score < CLEAN_MAX_SCORE)
    return "clean";
  return "borderline";
}
function resolveReason(key, score, signals) {
  if (score < CLEAN_MAX_SCORE)
    return reasonFor("none");
  if (key !== "none")
    return reasonFor(key);
  const top = signals.reduce((best, signal) => signal.probability > best.probability ? signal : best);
  if (top.on)
    return { key: top.key, label: top.label };
  return reasonFor("low_value");
}
function reasonFor(key) {
  return { key, label: REASON_LABELS[key] };
}
function readReason(answers) {
  const answer = answers[REASON_QUESTION_KEY];
  if (!answer || typeof answer.choice !== "string" || !(answer.choice in REASON_LABELS)) {
    throw new Error(`Jev answer "${REASON_QUESTION_KEY}" must contain a valid reason`);
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

// core/post.ts
var POST_KINDS = ["post", "comment"];
var MEDIA_KINDS = ["none", "image", "video", "document"];
var MAX_MEDIA_LABEL_LENGTH = 200;
var MIN_TEXT_LENGTH = 10;
var MAX_TEXT_LENGTH = 8000;
function isPostKind(value) {
  return POST_KINDS.includes(value);
}
function isMediaKind(value) {
  return MEDIA_KINDS.includes(value);
}
function parsePostContext(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const candidate = value;
  if (!isPostKind(candidate.kind))
    return null;
  if (!isMediaKind(candidate.media))
    return null;
  if (typeof candidate.mediaLabel !== "string")
    return null;
  if (typeof candidate.text !== "string")
    return null;
  const text = candidate.text.slice(0, MAX_TEXT_LENGTH);
  if (text.length < MIN_TEXT_LENGTH)
    return null;
  return {
    kind: candidate.kind,
    media: candidate.media,
    mediaLabel: candidate.mediaLabel.slice(0, MAX_MEDIA_LABEL_LENGTH),
    text
  };
}
function postKey(context) {
  return `${context.kind}|${context.media}|${context.mediaLabel}|${context.text}`;
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
var SKIP_MEDIA_FIELD = "skipMedia";
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
  return value.filter(isTrainingExample).map(withCurrentId);
}
function withCurrentId(entry) {
  const id = textKey(postKey({
    kind: entry.kind ?? "post",
    media: entry.media ?? "none",
    mediaLabel: "",
    text: entry.text
  }));
  return id === entry.id ? entry : { ...entry, id };
}
function isTrainingExample(entry) {
  if (typeof entry !== "object" || entry === null)
    return false;
  const candidate = entry;
  return typeof candidate.id === "string" && typeof candidate.text === "string" && isVerdict(candidate.label) && (candidate.kind === undefined || isPostKind(candidate.kind)) && (candidate.media === undefined || isMediaKind(candidate.media));
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
async function readSkipMedia() {
  const stored = await extensionApi.storage.local.get(SKIP_MEDIA_FIELD);
  return stored[SKIP_MEDIA_FIELD] === true;
}
async function writeSkipMedia(skipMedia) {
  await extensionApi.storage.local.set({ [SKIP_MEDIA_FIELD]: skipMedia });
}
function onSkipMediaChange(listener) {
  onLocalChange(SKIP_MEDIA_FIELD, (value) => listener(value === true));
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
var skipMedia = mustFind("#skip-media");
async function start() {
  keyInput.value = await readApiKey();
  renderHide(await readHide());
  skipMedia.checked = await readSkipMedia();
  await renderTraining();
  keyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveKey();
  });
  skipMedia.addEventListener("change", () => {
    writeSkipMedia(skipMedia.checked);
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
