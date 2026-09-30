// ============================================================
// CASE FILES — a persistent, cross-run record of every survival
// ending, failure ending, and coping mechanism the player has ever
// seen. Entries start silhouetted ("sealed") and reveal permanently
// once discovered in any run. Purely additive: it never changes
// game balance, only what's remembered about it.
// ============================================================

const CODEX_KEY = 'uct_codex_v1';
let codexCache = null;

function computeContentSignature(content) {
    const survivalShape = content.endings.map(e => normalizeEndingVariants(e).length).join(',');
    const fe = failureEndings();
    const failureShape = ['repression', 'mask', 'child'].map(k => (fe[k] || []).length).join(',');
    const mechKeys = Object.keys(content.mechanisms).sort().join(',');
    return `${survivalShape}|${failureShape}|${mechKeys}`;
}

function defaultCodexData() {
    return {signature: '', mechanisms: {}, survival: {}, failure: {}};
}

function loadCodex() {
    if (codexCache) return codexCache;
    let data = defaultCodexData();
    try {
        const raw = localStorage.getItem(CODEX_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                data = Object.assign(defaultCodexData(), parsed);
                data.mechanisms = parsed.mechanisms || {};
                data.survival = parsed.survival || {};
                data.failure = parsed.failure || {};
            }
        }
    } catch (e) {
    }

    const sig = computeContentSignature(getContent());
    if (data.signature !== sig) {
        // Content pack changed shape (or this is the first run ever) —
        // old indices no longer point at the same case files, so start clean.
        data = defaultCodexData();
        data.signature = sig;
    }
    codexCache = data;
    return codexCache;
}

function saveCodex() {
    if (!codexCache) return;
    try {
        localStorage.setItem(CODEX_KEY, JSON.stringify(codexCache));
    } catch (e) {
    }
}

function recordMechanismDiscovered(tag) {
    const data = loadCodex();
    if (!data.mechanisms[tag]) {
        data.mechanisms[tag] = true;
        saveCodex();
    }
}

function recordSurvivalDiscovered(slotIndex, variantIndex) {
    const data = loadCodex();
    const key = `${slotIndex}:${variantIndex}`;
    if (!data.survival[key]) {
        data.survival[key] = true;
        saveCodex();
    }
}

function recordFailureDiscovered(statKey, variantIndex) {
    const data = loadCodex();
    const key = `${statKey}:${variantIndex}`;
    if (!data.failure[key]) {
        data.failure[key] = true;
        saveCodex();
    }
}

const elCodexScreen = document.getElementById('codex-screen');
const elCodexProgress = document.getElementById('codex-progress');
const elCodexDetail = document.getElementById('codex-detail');
const elCodexBody = document.getElementById('codex-body');
let codexReturnOverlay = null;

function findVisibleOverlay(excludeId) {
    const ids = ['end-screen', 'splash-screen', 'help-screen'];
    for (const id of ids) {
        if (id === excludeId) continue;
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) return el;
    }
    return null;
}

// Pack text is untrusted (imported/shared packs), so it goes in as text, never HTML.
function showCodexDetail(title, desc) {
    elCodexDetail.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    elCodexDetail.append(strong, document.createElement('br'), desc || '');
    elCodexDetail.classList.remove('hidden');
}

function makeCodexHeading(className, label, count) {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = label + ' ';
    const span = document.createElement('span');
    span.className = 'codex-section-count';
    span.textContent = count;
    div.appendChild(span);
    return div;
}

function makeCodexTab(discovered, label, onOpen) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'codex-tab' + (discovered ? ' discovered' : ' locked');
    btn.textContent = label;
    btn.onclick = onOpen;
    return btn;
}

function renderCodexRow(container, discoveredCountRef, totalCountRef, entries) {
    const row = document.createElement('div');
    row.className = 'codex-row';
    entries.forEach(entry => row.appendChild(entry));
    container.appendChild(row);
}

function renderCodex() {
    const content = getContent();
    const data = loadCodex();
    const labels = statLabels();

    let discovered = 0;
    let total = 0;

    elCodexBody.innerHTML = '';
    elCodexDetail.classList.add('hidden');
    elCodexDetail.innerHTML = '';

    // --- Coping Mechanisms ---
    const mechTags = Object.keys(content.mechanisms);
    const mechFound = mechTags.filter(t => data.mechanisms[t]).length;
    total += mechTags.length;
    discovered += mechFound;

    const mechSection = document.createElement('div');
    mechSection.className = 'codex-section';
    mechSection.appendChild(makeCodexHeading('codex-section-title', 'Coping Mechanisms', `${mechFound}/${mechTags.length}`));
    const mechTabs = mechTags.map(tag => {
        const mech = content.mechanisms[tag];
        const isFound = !!data.mechanisms[tag];
        return makeCodexTab(isFound, isFound ? mech.name : '???', () => {
            showCodexDetail(...(isFound
                ? [mech.name, mech.desc]
                : ['??? Coping Mechanism', 'Not yet observed. Lean on the same response three times in one run to find out what it is.']));
        });
    });
    renderCodexRow(mechSection, null, null, mechTabs);
    elCodexBody.appendChild(mechSection);

    // --- Survival Endings ---
    const survivalSection = document.createElement('div');
    survivalSection.className = 'codex-section';
    survivalSection.innerHTML = `<div class="codex-section-title">Survival Endings</div>`;
    content.endings.forEach((ending, slotIdx) => {
        const variants = normalizeEndingVariants(ending);
        const foundHere = variants.filter((_, vIdx) => data.survival[`${slotIdx}:${vIdx}`]).length;
        total += variants.length;
        discovered += foundHere;

        const row = document.createElement('div');
        row.className = 'codex-subrow';
        row.appendChild(makeCodexHeading('codex-subrow-title', `Case #${slotIdx + 1}`, `${foundHere}/${variants.length}`));
        const tabs = variants.map((variant, vIdx) => {
            const isFound = !!data.survival[`${slotIdx}:${vIdx}`];
            return makeCodexTab(isFound, isFound ? variant.title : String(vIdx + 1).padStart(2, '0'), () => {
                showCodexDetail(...(isFound
                    ? [variant.title, variant.desc]
                    : [`Case #${slotIdx + 1}, File ${vIdx + 1}`, 'Sealed. Survive a run that lands here to open it.']));
            });
        });
        renderCodexRow(row, null, null, tabs);
        survivalSection.appendChild(row);
    });
    elCodexBody.appendChild(survivalSection);

    // --- Failure Endings ---
    const failureSection = document.createElement('div');
    failureSection.className = 'codex-section';
    failureSection.innerHTML = `<div class="codex-section-title">Failure Endings</div>`;
    const fe = failureEndings();
    [['repression', labels.repression], ['mask', labels.mask], ['child', labels.child]].forEach(([statKey, label]) => {
        const pool = fe[statKey] || [];
        const foundHere = pool.filter((_, vIdx) => data.failure[`${statKey}:${vIdx}`]).length;
        total += pool.length;
        discovered += foundHere;

        const row = document.createElement('div');
        row.className = 'codex-subrow';
        row.appendChild(makeCodexHeading('codex-subrow-title', label, `${foundHere}/${pool.length}`));
        const tabs = pool.map((variant, vIdx) => {
            const isFound = !!data.failure[`${statKey}:${vIdx}`];
            return makeCodexTab(isFound, isFound ? variant.title : String(vIdx + 1).padStart(2, '0'), () => {
                showCodexDetail(...(isFound
                    ? [variant.title, variant.desc]
                    : [`${label} Failure, File ${vIdx + 1}`, 'Sealed. Bottom out this stat to open it.']));
            });
        });
        renderCodexRow(row, null, null, tabs);
        failureSection.appendChild(row);
    });
    elCodexBody.appendChild(failureSection);

    elCodexProgress.textContent = `${discovered} / ${total} files opened`;
}

function openCodex() {
    codexReturnOverlay = findVisibleOverlay('codex-screen');
    if (codexReturnOverlay) codexReturnOverlay.classList.add('hidden');
    renderCodex();
    elCodexScreen.classList.remove('hidden');
}

function closeCodex() {
    elCodexScreen.classList.add('hidden');
    if (codexReturnOverlay) {
        codexReturnOverlay.classList.remove('hidden');
        codexReturnOverlay = null;
    }
}
