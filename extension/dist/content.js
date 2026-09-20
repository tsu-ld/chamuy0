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
var isGecko = scope.browser !== undefined;
function onLocalChange(field, listener) {
  extensionApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(field in changes))
      return;
    listener(changes[field].newValue);
  });
}

// extension/badge.ts
var STATE_CLASS = {
  clean: "lnslop-good",
  borderline: "lnslop-meh",
  slop: "lnslop-bad"
};
var SCORE_DECIMALS = 1;
function applyPending(chip) {
  chip.className = "lnslop-chip lnslop-pending";
  chip.replaceChildren(makeDot(), chipPart("lnslop-word", "Slop"), chipPart("lnslop-num", "…"));
  chip.setAttribute("aria-label", "Analyzing post for slop");
  chip.setAttribute("aria-expanded", "false");
  chip.setAttribute("aria-busy", "true");
}
function applyFailure(chip) {
  chip.className = "lnslop-chip lnslop-error";
  chip.replaceChildren(makeDot(), chipPart("lnslop-word", "Slop"), chipPart("lnslop-num", "?"));
  chip.setAttribute("aria-expanded", "false");
  chip.removeAttribute("aria-busy");
  chip.setAttribute("aria-label", "Could not classify. Press to retry.");
}
function applyVerdict(chip, reply) {
  const { verdict, score } = reply.verdict;
  chip.className = `lnslop-chip ${STATE_CLASS[verdict]}`;
  chip.replaceChildren(makeDot(), chipPart("lnslop-word", "Slop"), chipPart("lnslop-num", score.toFixed(SCORE_DECIMALS)));
  chip.removeAttribute("aria-busy");
  chip.setAttribute("aria-label", `Slop ${score.toFixed(SCORE_DECIMALS)} of 10, ${verdict}. View detail.`);
}
function makeDot() {
  const dot = document.createElement("span");
  dot.className = "lnslop-dot";
  dot.setAttribute("aria-hidden", "true");
  return dot;
}
function chipPart(className, text) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}
function buildPopover(reply, onLabel) {
  const popover = document.createElement("div");
  popover.className = "lnslop-popover";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Slop analysis");
  popover.append(buildHeader(reply.verdict), buildReason(reply.verdict), buildTrainRow(onLabel), buildMeta(reply));
  return popover;
}
function buildHeader(slop) {
  const header = document.createElement("header");
  header.className = "lnslop-head";
  const verdict = document.createElement("strong");
  verdict.className = `lnslop-verdict ${STATE_CLASS[slop.verdict]}`;
  verdict.append(makeDot(), document.createTextNode(`Slop ${slop.score.toFixed(SCORE_DECIMALS)}/10`));
  const close = document.createElement("button");
  close.type = "button";
  close.className = "lnslop-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";
  header.append(verdict, close);
  return header;
}
function buildReason(slop) {
  const reason = document.createElement("p");
  reason.className = "lnslop-reason";
  const fired = slop.signals.filter((signal) => signal.on).map((signal) => signal.label);
  reason.textContent = fired.length > 0 ? `Reads like: ${fired.join(", ")}.` : "No bait signals fired.";
  return reason;
}
function buildMeta(reply) {
  const meta = document.createElement("p");
  meta.className = "lnslop-meta";
  meta.textContent = `${reply.model} · ${reply.trainedOn} examples`;
  return meta;
}
function buildTrainRow(onLabel) {
  const row = document.createElement("div");
  row.className = "lnslop-train";
  const question = document.createElement("span");
  question.className = "lnslop-train-label";
  question.textContent = "Was this right?";
  row.append(question);
  for (const verdict of VERDICTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lnslop-vote lnslop-vote-${verdict}`;
    button.textContent = verdict;
    button.addEventListener("click", () => onLabel(verdict));
    row.append(button);
  }
  return row;
}

// extension/protocol.ts
function isSlopReply(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const candidate = value;
  return candidate.ok === true && typeof candidate.model === "string" && typeof candidate.trainedOn === "number" && hasSlopVerdict(candidate.verdict);
}
function hasSlopVerdict(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const candidate = value;
  return isVerdict(candidate.verdict) && typeof candidate.score === "number" && Array.isArray(candidate.signals);
}

// extension/classify.ts
var REPLY_TIMEOUT_MS = 35000;
async function requestVerdict(text) {
  const request = extensionApi.runtime.sendMessage({ type: "classify", text });
  const reply = await withTimeout(request, REPLY_TIMEOUT_MS);
  if (isSlopReply(reply))
    return reply;
  if (!reply.ok) {
    const failure = new Error(reply.error);
    failure.code = reply.code;
    throw failure;
  }
  throw new Error("Malformed classifier reply");
}
function readFailureCode(error) {
  const code = error.code;
  return code === "no-key" || code === "no-access" ? code : "request";
}
function withTimeout(promise, milliseconds) {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("Classifier timed out")), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer);
  });
}

// extension/hide.ts
var CARD_CLASS = "lnslop-host";
var CHIP_CLASS = "lnslop-chip";
var HIDDEN_CLASS = "lnslop-hidden";
var BANISH_CLASS = "lnslop-banish";
var FALL_CLASS = "lnslop-fall";
var SEVERE_CLASS = "lnslop-severe";
var TOMB_CLASS = "lnslop-tomb";
var TEXT_CLASS = "lnslop-tomb-text";
var SHOW_CLASS = "lnslop-show";
var LIVE_CLASS = "lnslop-live";
var TOMB_SELECTOR = `.${TOMB_CLASS}`;
var TOMB_HEIGHT = "2.75rem";
var SCORE_DECIMALS2 = 1;
var SEVERE_SCORE = 9;
var FINISH_MS = 460;
var MAX_TRACKED_KEYS = 400;

class HideDeck {
  hidden = new Set;
  revealed = new Set;
  timers = new Map;
  frames = new Map;
  announcer = null;
  note(chip, reply, settings) {
    const card = chip.closest(`.${CARD_CLASS}`);
    if (!card)
      return;
    const key = textKey(chip.dataset.lnslopText ?? "");
    card.dataset.lnslopScore = String(reply.verdict.score);
    card.dataset.lnslopKey = key;
    if (!shouldHide(reply.verdict.score, settings))
      return;
    this.apply(card, key, reply.verdict.score);
  }
  sync(root, settings) {
    for (const card of root.querySelectorAll(`.${CARD_CLASS}[data-lnslop-key]`)) {
      this.reconcile(card, settings);
    }
  }
  reconcile(card, settings) {
    const key = card.dataset.lnslopKey;
    if (!key)
      return;
    const score = Number(card.dataset.lnslopScore);
    if (Number.isFinite(score) && shouldHide(score, settings)) {
      this.apply(card, key, score);
      return;
    }
    this.restore(card, key);
  }
  apply(card, key, score) {
    if (this.revealed.has(key))
      return;
    const tomb = card.querySelector(TOMB_SELECTOR);
    if (this.hidden.has(key) && tomb !== null)
      return;
    const fresh = !this.hidden.has(key);
    remember(this.hidden, key);
    const bar = tomb ?? buildTomb(card.ownerDocument, score, () => this.reveal(card, key));
    if (tomb === null)
      card.append(bar);
    if (fresh && score >= SEVERE_SCORE)
      card.classList.add(SEVERE_CLASS);
    this.place(card, bar, fresh);
    if (fresh)
      this.announce(card, `Post hidden. Slop score ${score.toFixed(SCORE_DECIMALS2)} of 10.`);
  }
  reveal(card, key) {
    this.hidden.delete(key);
    remember(this.revealed, key);
    this.clear(card);
    card.querySelector(TOMB_SELECTOR)?.remove();
    card.querySelector(`.${CHIP_CLASS}`)?.focus();
    this.announce(card, "Post restored.");
  }
  restore(card, key) {
    if (!this.hidden.has(key))
      return;
    this.hidden.delete(key);
    const focus = tombHasFocus(card);
    this.clear(card);
    card.querySelector(TOMB_SELECTOR)?.remove();
    if (focus)
      card.querySelector(`.${CHIP_CLASS}`)?.focus();
  }
  clear(card) {
    const frame = this.frames.get(card);
    if (frame !== undefined)
      cancelAnimationFrame(frame);
    this.frames.delete(card);
    const timer = this.timers.get(card);
    if (timer !== undefined)
      window.clearTimeout(timer);
    this.timers.delete(card);
    card.classList.remove(HIDDEN_CLASS, BANISH_CLASS, FALL_CLASS, SEVERE_CLASS);
    card.style.height = "";
  }
  place(card, bar, fresh) {
    const plan = planHide(card);
    if (fresh && plan.animated) {
      this.placeAnimated(card, bar, plan.focus);
      return;
    }
    this.placeInstant(card, bar, plan.focus);
  }
  placeInstant(card, bar, focus) {
    card.classList.add(HIDDEN_CLASS);
    if (focus)
      focusShow(bar);
  }
  placeAnimated(card, bar, focus) {
    card.style.height = `${card.getBoundingClientRect().height}px`;
    card.classList.add(BANISH_CLASS);
    this.frames.set(card, requestAnimationFrame(() => {
      this.frames.delete(card);
      card.classList.add(FALL_CLASS);
      card.style.height = TOMB_HEIGHT;
      this.timers.set(card, window.setTimeout(() => this.finishCollapse(card, bar, focus), FINISH_MS));
    }));
  }
  finishCollapse(card, bar, focus) {
    this.timers.delete(card);
    card.classList.remove(BANISH_CLASS, FALL_CLASS, SEVERE_CLASS);
    card.style.height = "";
    if (!bar.isConnected)
      return;
    card.classList.add(HIDDEN_CLASS);
    if (focus)
      focusShow(bar);
  }
  announce(card, message) {
    if (!this.announcer)
      this.announcer = createAnnouncer(card.ownerDocument);
    const region = this.announcer;
    region.textContent = "";
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }
}
function planHide(card) {
  const rect = card.getBoundingClientRect();
  const focus = hasFocusWithin(card);
  if (prefersReducedMotion())
    return { animated: false, focus };
  const viewport = card.ownerDocument.defaultView?.innerHeight ?? 0;
  return { animated: rect.top < viewport && rect.bottom > 0, focus };
}
function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function hasFocusWithin(card) {
  const active = card.ownerDocument.activeElement;
  return active !== null && card.contains(active);
}
function tombHasFocus(card) {
  const tomb = card.querySelector(TOMB_SELECTOR);
  const active = card.ownerDocument.activeElement;
  return tomb !== null && active !== null && tomb.contains(active);
}
function remember(set, key) {
  set.add(key);
  if (set.size <= MAX_TRACKED_KEYS)
    return;
  const oldest = set.keys().next().value;
  if (oldest !== undefined)
    set.delete(oldest);
}
function focusShow(bar) {
  bar.querySelector(`.${SHOW_CLASS}`)?.focus();
}
function buildTomb(doc, score, onShow) {
  const bar = doc.createElement("div");
  bar.className = TOMB_CLASS;
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", `Post hidden. Slop score ${score.toFixed(SCORE_DECIMALS2)} of 10.`);
  const text = doc.createElement("span");
  text.className = TEXT_CLASS;
  text.textContent = `Slop ${score.toFixed(SCORE_DECIMALS2)} · hidden`;
  const show = doc.createElement("button");
  show.type = "button";
  show.className = SHOW_CLASS;
  show.textContent = "Show";
  show.addEventListener("click", onShow);
  bar.append(text, show);
  return bar;
}
function createAnnouncer(doc) {
  const region = doc.createElement("div");
  region.className = LIVE_CLASS;
  region.setAttribute("aria-live", "polite");
  doc.body.append(region);
  return region;
}

// extension/palette.ts
var LIGHT_SIGNALS = { positive: "#057642", caution: "#915907", negative: "#b24020" };
var DARK_SIGNALS = { positive: "#7cc9a2", caution: "#d9ab63", negative: "#e08a6e" };
var TOKEN_NAMES = [
  ["ink", "--lnslop-ink"],
  ["inkSoft", "--lnslop-ink-soft"],
  ["surface", "--lnslop-surface"],
  ["hairline", "--lnslop-hairline"],
  ["hairlineSoft", "--lnslop-hairline-soft"],
  ["hover", "--lnslop-hover"],
  ["positive", "--lnslop-positive"],
  ["caution", "--lnslop-caution"],
  ["negative", "--lnslop-negative"],
  ["shadow", "--lnslop-shadow"]
];
var MAX_CHANNEL = 255;
var LUMA_RED = 0.2126;
var LUMA_GREEN = 0.7152;
var LUMA_BLUE = 0.0722;
var DARK_THRESHOLD = 0.4;
var INK_SOFT_PERCENT = 62;
var HAIRLINE_PERCENT = 15;
var HAIRLINE_SOFT_PERCENT = 8;
var HOVER_PERCENT = 8;
function readHostPalette(anchor) {
  const ink = getComputedStyle(anchor).color;
  const surface = findSurface(anchor);
  const dark = isDark(surface);
  const signals = dark ? DARK_SIGNALS : LIGHT_SIGNALS;
  return {
    ink,
    inkSoft: mix(ink, INK_SOFT_PERCENT),
    surface,
    hairline: mix(ink, HAIRLINE_PERCENT),
    hairlineSoft: mix(ink, HAIRLINE_SOFT_PERCENT),
    hover: mix(ink, HOVER_PERCENT),
    ...signals,
    shadow: dark ? "0 4px 12px rgba(0, 0, 0, .45)" : "0 4px 12px rgba(0, 0, 0, .15)"
  };
}
function applyPalette(element, palette) {
  for (const [key, name] of TOKEN_NAMES)
    element.style.setProperty(name, palette[key]);
}
function mix(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
function findSurface(element) {
  let node = element;
  while (node) {
    const background = getComputedStyle(node).backgroundColor;
    if (!isTransparent(background))
      return background;
    node = node.parentElement;
  }
  return "#fff";
}
function isTransparent(color) {
  return color === "transparent" || color === "rgba(0, 0, 0, 0)";
}
function isDark(color) {
  const channels = (color.match(/[\d.]+/g) ?? []).map((channel) => Number(channel));
  const [red = MAX_CHANNEL, green = MAX_CHANNEL, blue = MAX_CHANNEL] = channels;
  const luminance = (LUMA_RED * red + LUMA_GREEN * green + LUMA_BLUE * blue) / MAX_CHANNEL;
  return luminance < DARK_THRESHOLD;
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

// extension/content.ts
var TEXT_ANCHOR_SELECTOR = '[data-testid="expandable-text-box"]';
var LEGACY_CARD_SELECTOR = '[data-urn^="urn:li:activity"], [data-id^="urn:li:activity"]';
var LEGACY_TEXT_SELECTORS = [
  ".update-components-text",
  ".feed-shared-update-v2__commentary",
  ".feed-shared-text"
];
var SOCIAL_BAR_SELECTOR = 'svg#comment-small, svg#repost-small, svg#thumbs-up-outline-small, [aria-label^="Reaction button state"]';
var COMMENT_ICON = "svg#comment-small";
var REPOST_ICON = "svg#repost-small";
var CHIP_CLASS2 = "lnslop-chip";
var HOST_CLASS = "lnslop-host";
var CARD_MARKER = "lnslopCard";
var MIN_POST_LENGTH = 40;
var SCAN_DEBOUNCE_MS = 400;
var MAX_CONCURRENT = 2;
var MAX_CACHED_VERDICTS = 200;
var MAX_CARD_WALK = 20;
var verdicts = new Map;
var deck = new HideDeck;
var queue = [];
var inFlight = 0;
var openPopover = null;
var openChip = null;
var scanTimer;
var lastCardCount = -1;
var hideSettings = parseHide(null);
async function start() {
  console.info("[lnslop] watching the feed");
  hideSettings = await readHide();
  onHideChange((next) => {
    hideSettings = next;
    deck.sync(document, next);
  });
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}
function scheduleScan() {
  clearTimeout(scanTimer);
  scanTimer = window.setTimeout(scan, SCAN_DEBOUNCE_MS);
}
function scan() {
  const cards = collectCards();
  if (cards.length !== lastCardCount) {
    console.info(`[lnslop] ${cards.length} posts found`);
    lastCardCount = cards.length;
  }
  for (const card of cards) {
    if (card.dataset[CARD_MARKER] && card.querySelector(`.${CHIP_CLASS2}`))
      continue;
    attach(card);
  }
}
function collectCards() {
  const cards = [];
  const seen = new Set;
  const push = (card) => {
    if (!card || seen.has(card))
      return;
    seen.add(card);
    cards.push(card);
  };
  for (const anchor of document.querySelectorAll(TEXT_ANCHOR_SELECTOR)) {
    push(closestPostCard(anchor));
  }
  for (const legacy of document.querySelectorAll(LEGACY_CARD_SELECTOR)) {
    push(legacy);
  }
  return cards.filter((card) => !hasCardAncestor(card, seen));
}
function closestPostCard(anchor) {
  let node = anchor.parentElement;
  for (let depth = 0;node && depth < MAX_CARD_WALK; depth += 1) {
    if (node.querySelector(SOCIAL_BAR_SELECTOR))
      return realBox(node);
    node = node.parentElement;
  }
  return null;
}
function realBox(node) {
  let current = node;
  while (current.parentElement && getComputedStyle(current).display === "contents") {
    current = current.parentElement;
  }
  return current;
}
function hasCardAncestor(card, cards) {
  let node = card.parentElement;
  while (node) {
    if (cards.has(node))
      return true;
    node = node.parentElement;
  }
  return false;
}
function attach(card) {
  const text = extractText(card, findCommentaryAnchor(card));
  if (!text)
    return;
  card.dataset[CARD_MARKER] = "1";
  const chip = createChip(card);
  chip.dataset.lnslopText = text;
  const cached = verdicts.get(textKey(text));
  if (cached) {
    applyVerdict(chip, cached);
    deck.note(chip, cached, hideSettings);
    return;
  }
  queue.push({ chip, text });
  pump();
}
function extractText(card, anchor) {
  const anchored = anchor ? normalize(readAnchor(anchor)) : "";
  if (anchored.length >= MIN_POST_LENGTH)
    return anchored;
  for (const selector of LEGACY_TEXT_SELECTORS) {
    const node = card.querySelector(selector);
    const text = normalize(node?.textContent ?? "");
    if (text.length >= MIN_POST_LENGTH)
      return text;
  }
  return null;
}
function findCommentaryAnchor(card) {
  const bar = card.querySelector(SOCIAL_BAR_SELECTOR);
  for (const anchor of card.querySelectorAll(TEXT_ANCHOR_SELECTOR)) {
    if (!bar)
      return anchor;
    if (anchor.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING)
      return anchor;
  }
  return null;
}
function readAnchor(anchor) {
  const clone = anchor.cloneNode(true);
  for (const button of clone.querySelectorAll("button"))
    button.remove();
  return clone.textContent ?? "";
}
function normalize(raw) {
  return raw.replaceAll(/[\u200B\u200C\u200D]/g, "").replace(/\s+/g, " ").trim();
}
function createChip(card) {
  const chip = document.createElement("button");
  chip.type = "button";
  applyPending(chip);
  applyPalette(chip, readHostPalette(findCommentaryAnchor(card) ?? card));
  chip.addEventListener("click", () => handleChipClick(chip));
  card.classList.add(HOST_CLASS);
  const bar = findActionBar(card);
  if (bar) {
    bar.append(chip);
  } else {
    chip.dataset.lnslopFloating = "true";
    card.append(chip);
  }
  return chip;
}
function findActionBar(card) {
  let node = card.querySelector(COMMENT_ICON)?.parentElement ?? null;
  while (node && node !== card) {
    if (node.querySelector(REPOST_ICON))
      return node;
    node = node.parentElement;
  }
  return null;
}
function handleChipClick(chip) {
  if (chip.dataset.lnslopCode === "no-key" || chip.dataset.lnslopCode === "no-access") {
    const text = chip.dataset.lnslopText ?? "";
    delete chip.dataset.lnslopCode;
    applyPending(chip);
    queue.push({ chip, text });
    pump();
    extensionApi.runtime.sendMessage({ type: "openOptions" });
    return;
  }
  if (chip.classList.contains("lnslop-error")) {
    applyPending(chip);
    const text = chip.dataset.lnslopText ?? "";
    queue.push({ chip, text });
    pump();
    return;
  }
  togglePopover(chip);
}
function togglePopover(chip) {
  if (openChip === chip) {
    closePopover(true);
    return;
  }
  closePopover(false);
  const text = chip.dataset.lnslopText ?? "";
  const reply = verdicts.get(textKey(text));
  if (!reply)
    return;
  const host = chip.closest(`.${HOST_CLASS}`);
  if (!host)
    return;
  const popover = buildCardPopover(chip, text, reply);
  host.append(popover);
  chip.setAttribute("aria-expanded", "true");
  openPopover = popover;
  openChip = chip;
  popover.querySelector(".lnslop-close")?.focus();
}
function buildCardPopover(chip, text, reply) {
  const popover = buildPopover(reply, (label) => {
    saveLabel(chip, text, label);
  });
  const host = chip.closest(`.${HOST_CLASS}`);
  if (host)
    applyPalette(popover, readHostPalette(findCommentaryAnchor(host) ?? host));
  popover.querySelector(".lnslop-close")?.addEventListener("click", () => closePopover(true));
  return popover;
}
function closePopover(refocus) {
  if (openPopover)
    openPopover.remove();
  if (openChip)
    openChip.setAttribute("aria-expanded", "false");
  if (refocus && openChip)
    openChip.focus();
  openPopover = null;
  openChip = null;
}
async function saveLabel(chip, text, label) {
  try {
    await extensionApi.runtime.sendMessage({ type: "label", text, label });
    verdicts.delete(textKey(text));
    applyPending(chip);
    closePopover(false);
    queue.push({ chip, text });
    pump();
  } catch {
    closePopover(false);
    chip.dataset.lnslopCode = "request";
    applyFailure(chip);
  }
}
function pump() {
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift();
    if (!task)
      return;
    inFlight += 1;
    run(task);
  }
}
async function run(task) {
  try {
    const reply = await requestVerdict(task.text);
    rememberVerdict(textKey(task.text), reply);
    delete task.chip.dataset.lnslopCode;
    applyVerdict(task.chip, reply);
    deck.note(task.chip, reply, hideSettings);
  } catch (error) {
    task.chip.dataset.lnslopCode = readFailureCode(error);
    applyFailure(task.chip);
  } finally {
    inFlight -= 1;
    pump();
  }
}
function rememberVerdict(key, reply) {
  verdicts.set(key, reply);
  if (verdicts.size <= MAX_CACHED_VERDICTS)
    return;
  const oldest = verdicts.keys().next().value;
  if (oldest !== undefined)
    verdicts.delete(oldest);
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    closePopover(true);
});
document.addEventListener("click", (event) => {
  if (!openPopover || !openChip)
    return;
  const target = event.target;
  if (openPopover.contains(target) || openChip.contains(target))
    return;
  closePopover(false);
});
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => void start());
else
  start();
