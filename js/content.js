const DEFAULT_CONTENT = {
    config: {
        startingStats: {repression: 40, mask: 60, child: 60},
        arcadeStartingStats: {
            repression: {min: 20, max: 50},
            mask: {min: 50, max: 80},
            child: {min: 50, max: 80}
        },
        statLabels: {repression: "Repression Level", mask: "Social Mask", child: "Inner Child"},
        splash: {
            title: "Trauma Response Simulator",
            intro: "You are about to have a very bad day. Every choice you make is quietly one of five ways people cope with stress and anxiety.\n\nYou won't know which one is which, or what it will cost you, until it's already happened."
        },
        maxTurns: 10,
        hardModeTurns: 20,
        hardModeMultiplier: 1.25,
        unlockThreshold: 3,
        glitchChance: 0.15,
        weakZoneWeight: 2.5,
        timedEventChance: 0.2,
        timedDuration: 8000
    },

    zones: [
        {key: "WORK", statBias: "repression"},
        {key: "HOME", statBias: "child"},
        {key: "SOCIAL", statBias: "mask"},
        {key: "SELF", statBias: "child"},
        {key: "BODY", statBias: "repression"},
        {key: "PUBLIC", statBias: "mask"}
    ],

    mechanisms: CONTENT_MECHANISMS,

    glitchLogs: CONTENT_GLITCH_LOGS,

    failureEndings: CONTENT_FAILURE_ENDINGS,

    endings: CONTENT_ENDINGS,

    events: CONTENT_EVENTS
};

const CONTENT_KEY = 'uct_custom_content_v1';
let contentCache = null;

const MECHANISM_TAGS = ['fawn', 'flight', 'fight', 'freeze', 'secure'];
const CONFIG_NUMBER_FIELDS = ['maxTurns', 'hardModeTurns', 'hardModeMultiplier', 'unlockThreshold', 'glitchChance',
    'weakZoneWeight', 'timedEventChance', 'timedDuration'];
const EFFECT_OPS = ['add', 'subtract', 'set'];

function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

// Lists what would break a run (a crash, a softlock, or string math on a stat).
// Cosmetic gaps (missing text, a missing glitch or desc) fall back to defaults
// elsewhere and are not reported. Returns [] for a usable pack.
function contentPackProblems(obj) {
    const problems = [];
    if (!isPlainObject(obj)) return ['The pack is not a JSON object.'];

    if (!isPlainObject(obj.config)) {
        problems.push('"config" must be an object.');
    } else {
        CONFIG_NUMBER_FIELDS.forEach(k => {
            if (k in obj.config && !isFiniteNumber(obj.config[k])) problems.push(`config.${k} must be a number.`);
        });
        const start = obj.config.startingStats;
        if (start !== undefined) {
            if (!isPlainObject(start)) problems.push('config.startingStats must be an object.');
            else ['repression', 'mask', 'child'].forEach(k => {
                if (k in start && !isFiniteNumber(start[k])) problems.push(`config.startingStats.${k} must be a number.`);
            });
        }
    }

    if (!Array.isArray(obj.zones) || obj.zones.length === 0) {
        problems.push('"zones" must be a non-empty list.');
    } else {
        obj.zones.forEach((z, i) => {
            if (!isPlainObject(z) || typeof z.key !== 'string') problems.push(`zones[${i}] needs a text "key".`);
        });
    }

    if (!isPlainObject(obj.mechanisms)) {
        problems.push('"mechanisms" must be an object.');
    } else {
        MECHANISM_TAGS.forEach(tag => {
            const m = obj.mechanisms[tag];
            if (!isPlainObject(m)) {
                problems.push(`mechanisms.${tag} is missing.`);
                return;
            }
            if (!isPlainObject(m.mod)) {
                problems.push(`mechanisms.${tag}.mod must be an object.`);
                return;
            }
            ['rep', 'mask', 'child'].forEach(k => {
                if (m.mod[k] != null && !isFiniteNumber(m.mod[k])) problems.push(`mechanisms.${tag}.mod.${k} must be a number.`);
            });
        });
    }

    if (!Array.isArray(obj.glitchLogs)) problems.push('"glitchLogs" must be a list.');

    if (!Array.isArray(obj.endings) || obj.endings.length === 0) {
        problems.push('"endings" must be a non-empty list.');
    } else {
        obj.endings.forEach((e, i) => {
            if (!isPlainObject(e)) problems.push(`endings[${i}] must be an object.`);
            else if (e.conditions !== undefined && !Array.isArray(e.conditions)) problems.push(`endings[${i}].conditions must be a list.`);
            else if (Array.isArray(e.variants) && e.variants.some(v => !isPlainObject(v))) problems.push(`endings[${i}] has a variant that is not an object.`);
        });
    }

    if (!Array.isArray(obj.events) || obj.events.length === 0) {
        problems.push('"events" must be a non-empty list.');
    } else {
        const tags = isPlainObject(obj.mechanisms) ? obj.mechanisms : {};
        obj.events.forEach((evt, i) => {
            const where = isPlainObject(evt) && typeof evt.title === 'string' ? `Event "${evt.title}"` : `events[${i}]`;
            if (!isPlainObject(evt)) {
                problems.push(`${where} must be an object.`);
                return;
            }
            if (typeof evt.title !== 'string') problems.push(`${where} needs a text "title".`);
            if (!Array.isArray(evt.choices) || evt.choices.length === 0) {
                problems.push(`${where} needs at least one choice.`);
                return;
            }
            evt.choices.forEach((c, j) => {
                const cw = `${where}, choice ${j + 1}`;
                if (!isPlainObject(c)) {
                    problems.push(`${cw} must be an object.`);
                    return;
                }
                if (c.tag != null && !(c.tag in tags)) problems.push(`${cw} has unknown tag "${c.tag}".`);
                if (c.effects == null) return;
                if (!isPlainObject(c.effects)) {
                    problems.push(`${cw}: "effects" must be an object.`);
                    return;
                }
                ['rep', 'mask', 'child'].forEach(k => {
                    const fx = c.effects[k];
                    if (fx == null || isFiniteNumber(fx)) return;
                    if (!isPlainObject(fx) || !EFFECT_OPS.includes(fx.op) || (fx.value != null && !isFiniteNumber(fx.value))) {
                        problems.push(`${cw}: effect "${k}" must be a number or {op: add|subtract|set, value: number}.`);
                    }
                });
            });
        });
    }
    return problems;
}

function isValidContentPack(obj) {
    return contentPackProblems(obj).length === 0;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function getContent() {
    if (contentCache) return contentCache;
    try {
        const raw = localStorage.getItem(CONTENT_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        contentCache = (parsed && isValidContentPack(parsed)) ? parsed : DEFAULT_CONTENT;
    } catch (e) {
        contentCache = DEFAULT_CONTENT;
    }
    return contentCache;
}

function saveContent(content) {
    contentCache = content;
    try {
        localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
    } catch (e) {
    }
}

function resetContent() {
    contentCache = DEFAULT_CONTENT;
    try {
        localStorage.removeItem(CONTENT_KEY);
    } catch (e) {
    }
}
