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

// extension/badge.ts
var STATE_CLASS = {
  clean: "lnslop-good",
  borderline: "lnslop-meh",
  slop: "lnslop-bad"
};
var STATE_WORD = {
  clean: "Clean",
  borderline: "Mixed",
  slop: "Slop"
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
  chip.replaceChildren(makeDot(), chipPart("lnslop-word", STATE_WORD[verdict]), chipPart("lnslop-num", score.toFixed(SCORE_DECIMALS)));
  chip.removeAttribute("aria-busy");
  chip.setAttribute("aria-label", `Slop score ${score.toFixed(SCORE_DECIMALS)} of 10, ${verdict}. View detail.`);
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
  verdict.append(makeDot(), document.createTextNode(`${STATE_WORD[slop.verdict]} ${slop.score.toFixed(SCORE_DECIMALS)}/10`));
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
  const lead = fired.length > 0 ? `Reads like: ${fired.join(", ")}.` : "No bait signals fired.";
  const tail = slop.reason.key === "none" ? fired.length > 0 ? "Still low overall." : "Reads like a human post." : `Main tell: ${slop.reason.label}.`;
  reason.textContent = `${lead} ${tail}`;
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
  return isVerdict(candidate.verdict) && typeof candidate.score === "number" && Array.isArray(candidate.signals) && hasReason(candidate.reason);
}
function hasReason(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const candidate = value;
  return typeof candidate.key === "string" && typeof candidate.label === "string";
}

// extension/classify.ts
var REPLY_TIMEOUT_MS = 35000;
async function requestVerdict(context) {
  const request = extensionApi.runtime.sendMessage({ type: "classify", context });
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
  return error.code === "no-key" ? "no-key" : "request";
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

// extension/media.ts
var COMMENT_SELECTOR = '[data-urn^="urn:li:comment"], [data-testid="comments-list"], .comments-comment-entity, .comments-comment-item';
var VIDEO_SELECTOR = 'video, [data-testid="video-player"], .update-components-video';
var DOCUMENT_SELECTOR = '.update-components-document, [data-testid="document-container"]';
var DOCUMENT_TITLE_SELECTOR = ".update-components-document__title";
var IMAGE_SELECTOR = '.update-components-image__image, .update-components-image img, [data-testid="feed-images-content"] img, figure img';
function readKind(card) {
  return card.closest(COMMENT_SELECTOR) ? "comment" : "post";
}
function readMedia(card) {
  if (card.querySelector(VIDEO_SELECTOR))
    return { media: "video", mediaLabel: "" };
  const document2 = card.querySelector(DOCUMENT_SELECTOR);
  if (document2)
    return { media: "document", mediaLabel: readDocumentLabel(document2) };
  const image = card.querySelector(IMAGE_SELECTOR);
  if (image)
    return { media: "image", mediaLabel: clampLabel(image.alt) };
  return { media: "none", mediaLabel: "" };
}
function readDocumentLabel(node) {
  const title = node.querySelector(DOCUMENT_TITLE_SELECTOR)?.textContent ?? "";
  return clampLabel(title.replace(/\s+/g, " "));
}
function clampLabel(label) {
  return label.trim().slice(0, MAX_MEDIA_LABEL_LENGTH);
}

// extension/extract.ts
var LEGACY_TEXT_SELECTORS = [
  ".update-components-text",
  ".feed-shared-update-v2__commentary",
  ".feed-shared-text"
];
var MIN_POST_LENGTH = 40;
var MIN_CAPTION_LENGTH = 10;
function extractPost(card, anchor) {
  const { media, mediaLabel } = readMedia(card);
  const minimum = media === "none" ? MIN_POST_LENGTH : MIN_CAPTION_LENGTH;
  for (const candidate of textCandidates(card, anchor)) {
    const text = normalize(candidate).slice(0, MAX_TEXT_LENGTH);
    if (text.length >= minimum)
      return { kind: readKind(card), media, mediaLabel, text };
  }
  return null;
}
function textCandidates(card, anchor) {
  const candidates = anchor ? [readAnchor(anchor)] : [];
  for (const selector of LEGACY_TEXT_SELECTORS) {
    const node = card.querySelector(selector);
    if (node)
      candidates.push(node.textContent ?? "");
  }
  return candidates;
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
    const key = chip.dataset.lnslopKey ?? "";
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

// extension/content.ts
var TEXT_ANCHOR_SELECTOR = '[data-testid="expandable-text-box"]';
var LEGACY_CARD_SELECTOR = '[data-urn^="urn:li:activity"], [data-id^="urn:li:activity"]';
var SOCIAL_BAR_SELECTOR = 'svg#comment-small, svg#repost-small, svg#thumbs-up-outline-small, [aria-label^="Reaction button state"]';
var COMMENT_ICON = "svg#comment-small";
var REPOST_ICON = "svg#repost-small";
var CHIP_CLASS2 = "lnslop-chip";
var HOST_CLASS = "lnslop-host";
var CARD_MARKER = "lnslopCard";
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
var skipMedia = false;
async function start() {
  console.info("[lnslop] watching the feed");
  hideSettings = await readHide();
  skipMedia = await readSkipMedia();
  onHideChange((next) => {
    hideSettings = next;
    deck.sync(document, next);
  });
  onSkipMediaChange((next) => {
    skipMedia = next;
    scheduleScan();
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
    const context = extractPost(card, findCommentaryAnchor(card));
    if (!context)
      continue;
    if (skipMedia && context.media !== "none")
      continue;
    attach(card, context);
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
function attach(card, context) {
  card.dataset[CARD_MARKER] = "1";
  const chip = createChip(card);
  const key = postKey(context);
  chip.dataset.lnslopKey = key;
  chip.dataset.lnslopContext = JSON.stringify(context);
  const cached = verdicts.get(key);
  if (cached) {
    applyVerdict(chip, cached);
    deck.note(chip, cached, hideSettings);
    return;
  }
  queue.push({ chip, context });
  pump();
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
function readContext(chip) {
  const raw = chip.dataset.lnslopContext;
  if (!raw)
    return null;
  try {
    return parsePostContext(JSON.parse(raw));
  } catch {
    return null;
  }
}
function handleChipClick(chip) {
  if (chip.dataset.lnslopCode === "no-key") {
    delete chip.dataset.lnslopCode;
    applyPending(chip);
    requeue(chip);
    extensionApi.runtime.sendMessage({ type: "openOptions" });
    return;
  }
  if (chip.classList.contains("lnslop-error")) {
    applyPending(chip);
    requeue(chip);
    return;
  }
  togglePopover(chip);
}
function requeue(chip) {
  const context = readContext(chip);
  if (!context)
    return;
  queue.push({ chip, context });
  pump();
}
function togglePopover(chip) {
  if (openChip === chip) {
    closePopover(true);
    return;
  }
  closePopover(false);
  const context = readContext(chip);
  if (!context)
    return;
  const reply = verdicts.get(postKey(context));
  if (reply)
    mountPopover(chip, context, reply);
}
function mountPopover(chip, context, reply) {
  const host = chip.closest(`.${HOST_CLASS}`);
  if (!host)
    return;
  const popover = buildCardPopover(chip, context, reply);
  host.append(popover);
  chip.setAttribute("aria-expanded", "true");
  openPopover = popover;
  openChip = chip;
  popover.querySelector(".lnslop-close")?.focus();
}
function buildCardPopover(chip, context, reply) {
  const popover = buildPopover(reply, (label) => {
    saveLabel(chip, context, label);
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
async function saveLabel(chip, context, label) {
  try {
    await extensionApi.runtime.sendMessage({ type: "label", context, label });
    verdicts.delete(postKey(context));
    applyPending(chip);
    closePopover(false);
    queue.push({ chip, context });
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
    const reply = await requestVerdict(task.context);
    rememberVerdict(postKey(task.context), reply);
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
