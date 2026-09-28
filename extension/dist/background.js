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

// core/examples.ts
var MAX_PER_LABEL = 2;
var EXCERPT_LENGTH = 600;
function addExample(pool, context, label) {
  const id = textKey(postKey(context));
  const rest = pool.filter((entry) => entry.id !== id);
  return [...rest, { id, label, text: context.text, kind: context.kind, media: context.media }];
}
function buildState(context, pool) {
  const samples = pickSamples(pool);
  const post = `Post to classify.
Kind: ${context.kind}.
Media: ${context.media}.${mediaLine(context)}

${context.text}`;
  if (samples.length === 0)
    return post;
  const blocks = samples.map((entry) => `[${referenceTag(entry)}]
${excerpt(entry.text)}`);
  return `Labeled reference posts:

${blocks.join(`

`)}

${post}`;
}
function mediaLine(context) {
  return context.mediaLabel ? `
Media label: "${context.mediaLabel}".` : "";
}
function referenceTag(entry) {
  return `${entry.label} · ${entry.kind ?? "post"} · ${entry.media ?? "none"}`;
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
  const resolved = { apiKey: options.apiKey, model: options.model ?? DEFAULT_MODEL, baseUrl: options.baseUrl ?? BASE_URL };
  async function attempt(retriesLeft) {
    try {
      return await postOnce(questions, state, resolved);
    } catch (error) {
      const failure = toJevError(error);
      if (retriesLeft === 0 || !isRetryable(failure))
        throw failure;
      await pause(failure.retryAfterMs, MAX_RETRIES - retriesLeft);
      return attempt(retriesLeft - 1);
    }
  }
  return attempt(MAX_RETRIES);
}
async function postOnce(questions, state, options) {
  const response = await fetch(options.baseUrl, {
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
  if (response.status === HTTP_RATE_LIMIT && errorField(detail) === "quota") {
    return new JevError("quota", response.status, readRetryAfterMs(response));
  }
  const excerpt = detail.slice(0, ERROR_EXCERPT_LENGTH);
  return new JevError(`Jev responded ${response.status}: ${excerpt}`, response.status, readRetryAfterMs(response));
}
function errorField(detail) {
  try {
    const payload = JSON.parse(detail);
    return typeof payload.error === "string" ? payload.error : "";
  } catch {
    return "";
  }
}
function readRetryAfterMs(response) {
  const milliseconds = response.headers.get("retry-after-ms");
  if (milliseconds) {
    const parsed = Number(milliseconds);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
function isRetryable(failure) {
  if (isQuota(failure))
    return false;
  if (failure.status === NETWORK_FAILURE || failure.status === HTTP_REQUEST_TIMEOUT || failure.status === HTTP_RATE_LIMIT) {
    return true;
  }
  return failure.status >= HTTP_SERVER_ERROR_FLOOR;
}
function isQuota(failure) {
  return failure.status === HTTP_RATE_LIMIT && failure.message === "quota";
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
var SKIP_MEDIA_FIELD = "skipMedia";
var ACCESS_FIELD = "access";
function isPlan(value) {
  return value === "trial" || value === "sub" || value === "none";
}
async function readApiKey() {
  const stored = await extensionApi.storage.local.get(API_KEY_FIELD);
  const value = stored[API_KEY_FIELD];
  return typeof value === "string" ? value : "";
}
async function writeApiKey(apiKey) {
  await extensionApi.storage.local.set({ [API_KEY_FIELD]: apiKey });
}
async function readAccess() {
  const stored = await extensionApi.storage.sync.get(ACCESS_FIELD);
  const value = stored[ACCESS_FIELD];
  if (typeof value !== "object" || value === null)
    return null;
  const candidate = value;
  if (typeof candidate.token !== "string" || !isPlan(candidate.plan) || typeof candidate.until !== "number") {
    return null;
  }
  return { token: candidate.token, plan: candidate.plan, until: candidate.until, renews: candidate.renews !== false };
}
async function writeAccess(access) {
  await extensionApi.storage.sync.set({ [ACCESS_FIELD]: access });
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

// extension/entitlement.ts
var WORKER_URL = "https://chamuy0-api.t-su.workers.dev";
var SESSION_URL = `${WORKER_URL}/session`;
var CLASSIFY_URL = `${WORKER_URL}/classify`;
var SUBSCRIBE_URL = `${WORKER_URL}/subscribe`;
var CANCEL_URL = `${WORKER_URL}/cancel`;
var PLANS_URL = `${WORKER_URL}/plans`;
var SESSION_TIMEOUT_MS = 1e4;
var HTTP_UNAUTHORIZED = 401;
var HTTP_PAYMENT_REQUIRED = 402;
var HTTP_BAD_GATEWAY = 502;
var HEX_RADIX = 16;
function isPlanActive(access, now) {
  if (!access || access.plan === "none")
    return false;
  return access.until > now;
}
async function startPlan() {
  return storeReply(await postSession(await deviceFingerprint()));
}
async function currentPlan() {
  const access = await readAccess();
  if (!access)
    return startPlan();
  try {
    return storeReply(await getSession(access.token));
  } catch (error) {
    if (error instanceof JevError && error.status === HTTP_UNAUTHORIZED)
      return startPlan();
    return access;
  }
}
async function askPlan(questions, state) {
  const access = await readAccess();
  if (!isPlanActive(access, Date.now()) || !access)
    throw new JevError("No plan", HTTP_PAYMENT_REQUIRED);
  return askJev(questions, state, { apiKey: access.token, baseUrl: CLASSIFY_URL });
}
async function readPlans() {
  const response = await fetch(PLANS_URL, { signal: AbortSignal.timeout(SESSION_TIMEOUT_MS) });
  if (!response.ok)
    throw await requestError(response, "Plans request failed");
  const payload = await response.json();
  if (!Array.isArray(payload.plans))
    throw new JevError("Malformed plans reply", HTTP_BAD_GATEWAY);
  return payload.plans.filter(isPublicPlan);
}
async function requestSubscribe(plan) {
  const payload = await postAuthorized(SUBSCRIBE_URL, { plan });
  if (typeof payload.url !== "string" || !payload.url)
    throw new JevError("Malformed subscribe reply", HTTP_BAD_GATEWAY);
  return payload.url;
}
async function cancelPlan() {
  await postAuthorized(CANCEL_URL, {});
}
async function postAuthorized(url, body) {
  const access = await readAccess();
  if (!access)
    throw new JevError("No install token", HTTP_UNAUTHORIZED);
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${access.token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS)
  });
  if (!response.ok)
    throw await requestError(response, "Request failed");
  return response.json();
}
var ERROR_TEXT = {
  "no-subscription": "No subscription to cancel.",
  "unknown-plan": "That plan is not available.",
  "unknown-token": "This install is not recognized. Close and reopen the popup.",
  "no-token": "This install is not recognized. Close and reopen the popup.",
  "no-access": "Free trial ended. Subscribe or add your own key.",
  quota: "Daily limit reached. Try again tomorrow.",
  "too-many-sessions": "Too many trials from this network today.",
  "mercado-pago": "Mercado Pago did not accept the request. Try again."
};
async function requestError(response, fallback) {
  const code = errorField2(await response.text());
  const known = ERROR_TEXT[code];
  const message = known ? known : `${fallback}: ${response.status}`;
  return new JevError(message, response.status);
}
function errorField2(detail) {
  try {
    const payload = JSON.parse(detail);
    return typeof payload.error === "string" ? payload.error : "";
  } catch {
    return "";
  }
}
function isPublicPlan(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const plan = value;
  return typeof plan.id === "string" && typeof plan.amount === "number" && typeof plan.usd === "number" && typeof plan.currency === "string" && typeof plan.period === "string";
}
async function postSession(fingerprint) {
  const response = await fetch(SESSION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fingerprint }),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS)
  });
  return readReply(response);
}
async function getSession(token) {
  const response = await fetch(SESSION_URL, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS)
  });
  return readReply(response);
}
async function readReply(response) {
  if (!response.ok)
    throw await requestError(response, "Session request failed");
  return parseReply(await response.json());
}
function parseReply(payload) {
  const candidate = payload;
  if (!candidate || typeof candidate.token !== "string" || typeof candidate.until !== "number" || !isPlan(candidate.plan)) {
    throw new JevError("Malformed session reply", HTTP_BAD_GATEWAY);
  }
  return {
    token: candidate.token,
    plan: candidate.plan,
    until: candidate.until,
    renews: candidate.renews !== false
  };
}
async function storeReply(reply) {
  const access = { token: reply.token, plan: reply.plan, until: reply.until, renews: reply.renews };
  await writeAccess(access);
  return access;
}
async function deviceFingerprint() {
  const memory = navigator.deviceMemory;
  const source = [
    navigator.platform,
    navigator.userAgent.replace(/[\d.]+/g, ""),
    navigator.language,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency),
    String(memory ?? "")
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(HEX_RADIX).padStart(2, "0")).join("");
}

// extension/background.ts
var HTTP_UNAUTHORIZED2 = 401;
var HTTP_PAYMENT_REQUIRED2 = 402;
var HTTP_TOO_MANY_REQUESTS = 429;
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
      return classify(message.context);
    case "label":
      return label(message);
    case "access":
      return access();
    case "subscribe":
      return subscribe(message.plan);
    case "cancel":
      return cancel();
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
  switch (candidate.type) {
    case "classify":
      return { type: "classify", context: readContext(candidate.context) };
    case "label":
      return readLabel(candidate);
    case "openOptions":
      return { type: "openOptions" };
    case "access":
      return { type: "access" };
    case "subscribe":
      return readSubscribe(candidate);
    case "cancel":
      return { type: "cancel" };
    default:
      throw new Error(`Unknown message type: ${String(candidate.type)}`);
  }
}
function readLabel(candidate) {
  if (!isVerdict(candidate.label))
    throw new Error("Unknown training label");
  return { type: "label", context: readContext(candidate.context), label: candidate.label };
}
function readSubscribe(candidate) {
  if (typeof candidate.plan !== "string")
    throw new Error("Unknown plan");
  return { type: "subscribe", plan: candidate.plan };
}
function readContext(value) {
  const context = parsePostContext(value);
  if (!context)
    throw new Error("Invalid post context");
  return context;
}
async function classify(context) {
  const pool = await readTraining();
  try {
    const source = await pickSource();
    if (source.kind === "none")
      return noAccessReply();
    const questions = buildQuestions();
    const state = buildState(context, pool);
    const response = source.kind === "plan" ? await askPlan(questions, state) : await askJev(questions, state, { apiKey: source.apiKey });
    return {
      ok: true,
      verdict: toVerdict(response.answers),
      model: response.model ?? DEFAULT_MODEL,
      trainedOn: pool.length
    };
  } catch (error) {
    return failureReply(error);
  }
}
async function pickSource() {
  const access = await readAccess();
  if (isPlanActive(access, Date.now()))
    return { kind: "plan" };
  const apiKey = await readApiKey();
  if (apiKey)
    return { kind: "key", apiKey };
  const plan = await currentPlan();
  return isPlanActive(plan, Date.now()) ? { kind: "plan" } : { kind: "none" };
}
async function access() {
  try {
    const plan = await currentPlan();
    const apiKey = await readApiKey();
    const state = { ...plan, source: sourceOf(plan, apiKey), plans: await optionalPlans() };
    return { ok: true, state };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}
async function optionalPlans() {
  try {
    return await readPlans();
  } catch {
    return [];
  }
}
async function subscribe(plan) {
  try {
    return { ok: true, url: await requestSubscribe(plan) };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}
async function cancel() {
  try {
    await cancelPlan();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}
function sourceOf(plan, apiKey) {
  if (isPlanActive(plan, Date.now()))
    return "plan";
  return apiKey ? "key" : "none";
}
function failureReply(error) {
  if (!(error instanceof JevError))
    return { ok: false, code: "request", error: messageOf(error) };
  if (error.status === HTTP_UNAUTHORIZED2 || error.status === HTTP_PAYMENT_REQUIRED2)
    return noAccessReply();
  if (error.status === HTTP_TOO_MANY_REQUESTS && error.message === "quota")
    return quotaReply();
  return { ok: false, code: "request", error: messageOf(error) };
}
function quotaReply() {
  return { ok: false, code: "quota", error: "Daily limit reached. Try again tomorrow." };
}
function noAccessReply() {
  return { ok: false, code: "no-access", error: "Free trial ended. Subscribe or add your own TypeSafe key." };
}
async function label(message) {
  const pool = await readTraining();
  const updated = addExample(pool, message.context, message.label);
  await writeTraining(updated);
  return { ok: true, count: updated.length };
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
