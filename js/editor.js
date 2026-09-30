const elEditorBody = document.getElementById('editor-body');
const elEditorStatus = document.getElementById('editor-status');
const elPlayPackLink = document.getElementById('play-pack-link');

let editorDraft = null;

let activeEditorTab = 'config';
let openEventZones = new Set();

const EDITOR_TABS = [
    {key: 'config', label: () => 'Config'},
    {key: 'zones', label: () => 'Zones'},
    {key: 'mechanisms', label: () => 'Mechanisms'},
    {key: 'failureEndings', label: () => 'Failure Endings'},
    {key: 'endings', label: () => 'Survival Endings'},
    {key: 'events', label: () => `Events (${editorDraft.events.length})`}
];

function ensureEditorDraft() {
    if (!editorDraft) editorDraft = deepClone(getContent());
}

function labeledWrap(labelText, el) {
    const box = document.createElement('div');
    const label = document.createElement('label');
    label.className = "editor-label";
    label.textContent = labelText;
    box.appendChild(label);
    box.appendChild(el);
    return box;
}

function buildEditorTabsBar() {
    const nav = document.createElement('nav');
    nav.id = "editor-tabs";
    nav.className = "tabs";
    EDITOR_TABS.forEach(t => {
        const btn = document.createElement('button');
        btn.className = "tab" + (activeEditorTab === t.key ? " active" : "");
        btn.textContent = t.label();
        btn.onclick = () => {
            activeEditorTab = t.key;
            renderEditor();
        };
        nav.appendChild(btn);
    });
    return nav;
}

function renderEditor() {
    elEditorBody.innerHTML = '';
    elEditorBody.appendChild(buildEditorTabsBar());

    const sectionBuilders = {
        config: buildConfigSection,
        zones: buildZonesSection,
        mechanisms: buildMechanismsSection,
        failureEndings: buildFailureEndingsSection,
        endings: buildEndingsSection,
        events: buildEventsSection
    };
    const content = document.createElement('div');
    content.className = "editor-tab-content";
    const builder = sectionBuilders[activeEditorTab] || buildConfigSection;
    content.appendChild(builder());
    elEditorBody.appendChild(content);
}

function buildConfigSection() {
    const wrap = document.createElement('div');
    wrap.className = "editor-section";
    const title = document.createElement('h3');
    title.className = "editor-section-title";
    title.textContent = "Config";
    wrap.appendChild(title);

    const grid = document.createElement('div');
    grid.className = "editor-grid-config";
    wrap.appendChild(grid);

    const cfg = editorDraft.config;
    const fields = [
        {
            label: "Starting Repression",
            get: () => cfg.startingStats.repression,
            set: v => cfg.startingStats.repression = v
        },
        {label: "Starting Mask", get: () => cfg.startingStats.mask, set: v => cfg.startingStats.mask = v},
        {label: "Starting Inner Child", get: () => cfg.startingStats.child, set: v => cfg.startingStats.child = v},
        {label: "Base Max Turns", get: () => cfg.maxTurns, set: v => cfg.maxTurns = v},
        {label: "Extended Therapy Turns", get: () => cfg.hardModeTurns, set: v => cfg.hardModeTurns = v},
        {
            label: "Extended Therapy Multiplier",
            get: () => cfg.hardModeMultiplier,
            set: v => cfg.hardModeMultiplier = v,
            step: 0.05
        },
        {label: "Mechanism Unlock Threshold", get: () => cfg.unlockThreshold, set: v => cfg.unlockThreshold = v},
        {label: "Glitch Chance (0-1)", get: () => cfg.glitchChance, set: v => cfg.glitchChance = v, step: 0.01},
        {label: "Weak Zone Weight", get: () => cfg.weakZoneWeight, set: v => cfg.weakZoneWeight = v, step: 0.1},
        {
            label: "Timed Event Chance (0-1)",
            get: () => cfg.timedEventChance,
            set: v => cfg.timedEventChance = v,
            step: 0.01
        },
        {
            label: "Timed Event Duration (ms)",
            get: () => cfg.timedDuration,
            set: v => cfg.timedDuration = v,
            step: 500
        }
    ];

    fields.forEach(f => {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = f.step || 1;
        input.value = f.get();
        input.className = "editor-input";
        input.oninput = () => {
            const v = parseFloat(input.value);
            if (!isNaN(v)) f.set(v);
        };
        grid.appendChild(labeledWrap(f.label, input));
    });

    if (!cfg.arcadeStartingStats) {
        cfg.arcadeStartingStats = {
            repression: {min: 20, max: 50},
            mask: {min: 50, max: 80},
            child: {min: 50, max: 80}
        };
    }
    const arcadeNote = document.createElement('p');
    arcadeNote.className = "editor-note";
    arcadeNote.textContent = "Arcade Mode Starting Stats";
    wrap.appendChild(arcadeNote);

    const arcadeGrid = document.createElement('div');
    arcadeGrid.className = "editor-grid-config";
    wrap.appendChild(arcadeGrid);

    ["repression", "mask", "child"].forEach(key => {
        const range = cfg.arcadeStartingStats[key];
        ["min", "max"].forEach(bound => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = "editor-input";
            input.value = range[bound];
            input.oninput = () => {
                const v = parseFloat(input.value);
                if (!isNaN(v)) range[bound] = v;
            };
            const label = `${key[0].toUpperCase()}${key.slice(1)} ${bound === 'min' ? 'Min' : 'Max'}`;
            arcadeGrid.appendChild(labeledWrap(label, input));
        });
    });

    if (!cfg.statLabels) cfg.statLabels = {repression: "Repression Level", mask: "Social Mask", child: "Inner Child"};
    const labelNote = document.createElement('p');
    labelNote.className = "editor-note";
    labelNote.textContent = "Bar Display Names";
    wrap.appendChild(labelNote);

    const labelGrid = document.createElement('div');
    labelGrid.className = "editor-grid-config";
    wrap.appendChild(labelGrid);

    const labelFields = [
        {label: "Repression Bar Name", get: () => cfg.statLabels.repression, set: v => cfg.statLabels.repression = v},
        {label: "Mask Bar Name", get: () => cfg.statLabels.mask, set: v => cfg.statLabels.mask = v},
        {label: "Inner Child Bar Name", get: () => cfg.statLabels.child, set: v => cfg.statLabels.child = v}
    ];
    labelFields.forEach(f => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = f.get();
        input.className = "editor-input";
        input.oninput = () => {
            f.set(input.value);
        };
        labelGrid.appendChild(labeledWrap(f.label, input));
    });

    if (!cfg.splash) cfg.splash = {title: "", intro: ""};
    const splashNote = document.createElement('p');
    splashNote.className = "editor-note";
    splashNote.textContent = "Splash Screen";
    wrap.appendChild(splashNote);

    const splashTitleInput = document.createElement('input');
    splashTitleInput.type = 'text';
    splashTitleInput.className = "editor-input";
    splashTitleInput.placeholder = "Splash title";
    splashTitleInput.value = cfg.splash.title;
    splashTitleInput.oninput = () => {
        cfg.splash.title = splashTitleInput.value;
    };
    wrap.appendChild(splashTitleInput);

    const splashIntroArea = document.createElement('textarea');
    splashIntroArea.rows = 3;
    splashIntroArea.className = "editor-input";
    splashIntroArea.placeholder = "Splash intro text";
    splashIntroArea.value = cfg.splash.intro;
    splashIntroArea.oninput = () => {
        cfg.splash.intro = splashIntroArea.value;
    };
    wrap.appendChild(splashIntroArea);

    return wrap;
}

function buildZonesSection() {
    const wrap = document.createElement('div');
    wrap.className = "editor-section";
    const title = document.createElement('h3');
    title.className = "editor-section-title";
    title.textContent = "Zones";
    wrap.appendChild(title);
    const note = document.createElement('p');
    note.className = "editor-note";
    note.textContent = "Stat Bias controls which zone gets weighted heavier when that stat is in danger.";
    wrap.appendChild(note);

    editorDraft.zones.forEach((zone, idx) => {
        const row = document.createElement('div');
        row.className = "editor-row";

        const keySpan = document.createElement('span');
        keySpan.className = "editor-zone-key";
        keySpan.textContent = zone.key;

        const select = document.createElement('select');
        select.className = "editor-input";
        select.style.width = "auto";
        ["repression", "mask", "child"].forEach(stat => {
            const opt = document.createElement('option');
            opt.value = stat;
            opt.textContent = stat;
            if (zone.statBias === stat) opt.selected = true;
            select.appendChild(opt);
        });
        select.onchange = () => {
            zone.statBias = select.value;
        };

        const delBtn = document.createElement('button');
        delBtn.textContent = "Remove";
        delBtn.className = "editor-btn-danger";
        delBtn.onclick = () => {
            const inUse = editorDraft.events.some(e => e.zone === zone.key);
            if (inUse) {
                alert(`Can't remove "${zone.key}" — events still use it. Reassign or delete those events first.`);
                return;
            }
            if (editorDraft.zones.length <= 1) {
                alert("Keep at least one zone.");
                return;
            }
            editorDraft.zones.splice(idx, 1);
            renderEditor();
        };

        row.appendChild(keySpan);
        row.appendChild(select);
        row.appendChild(delBtn);
        wrap.appendChild(row);
    });

    const addRow = document.createElement('div');
    addRow.className = "editor-row mt";
    const keyInput = document.createElement('input');
    keyInput.placeholder = "NEW ZONE KEY";
    keyInput.className = "editor-input";
    keyInput.style.width = "10rem";
    const biasSelect = document.createElement('select');
    biasSelect.className = "editor-input";
    biasSelect.style.width = "auto";
    ["repression", "mask", "child"].forEach(stat => {
        const opt = document.createElement('option');
        opt.value = stat;
        opt.textContent = stat;
        biasSelect.appendChild(opt);
    });
    const addBtn = document.createElement('button');
    addBtn.textContent = "+ Add Zone";
    addBtn.className = "editor-btn";
    addBtn.onclick = () => {
        const key = keyInput.value.trim().toUpperCase();
        if (!key) {
            alert("Zone needs a name.");
            return;
        }
        if (editorDraft.zones.some(z => z.key === key)) {
            alert("That zone key already exists.");
            return;
        }
        editorDraft.zones.push({key, statBias: biasSelect.value});
        renderEditor();
    };
    addRow.appendChild(keyInput);
    addRow.appendChild(biasSelect);
    addRow.appendChild(addBtn);
    wrap.appendChild(addRow);

    return wrap;
}

function buildMechanismsSection() {
    const wrap = document.createElement('div');
    wrap.className = "editor-section";
    const title = document.createElement('h3');
    title.className = "editor-section-title";
    title.textContent = "Coping Mechanisms";
    wrap.appendChild(title);
    const note = document.createElement('p');
    note.className = "editor-note";
    note.textContent = "The five response identities (fawn/flight/fight/freeze/secure) are fixed";
    wrap.appendChild(note);

    Object.entries(editorDraft.mechanisms).forEach(([tag, mech]) => {
        const row = document.createElement('div');
        row.className = "editor-card";

        const head = document.createElement('div');
        head.className = "editor-row";
        const tagLabel = document.createElement('span');
        tagLabel.className = "editor-tag-label";
        tagLabel.textContent = tag;
        const nameInput = document.createElement('input');
        nameInput.className = "editor-input";
        nameInput.value = mech.name;
        nameInput.oninput = () => {
            mech.name = nameInput.value;
        };
        head.appendChild(tagLabel);
        head.appendChild(nameInput);
        row.appendChild(head);

        const descArea = document.createElement('textarea');
        descArea.rows = 2;
        descArea.className = "editor-input";
        descArea.placeholder = "Shown when a player hovers or taps this mechanism once unlocked.";
        descArea.value = mech.desc || '';
        descArea.oninput = () => {
            mech.desc = descArea.value;
        };
        row.appendChild(descArea);

        const modGrid = document.createElement('div');
        modGrid.className = "editor-grid-mods";
        ["rep", "mask", "child"].forEach(k => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = "editor-input";
            input.value = mech.mod[k] || 0;
            input.oninput = () => {
                const v = parseFloat(input.value);
                mech.mod[k] = isNaN(v) ? 0 : v;
            };
            modGrid.appendChild(labeledWrap(`Mod: ${k}`, input));
        });
        row.appendChild(modGrid);

        wrap.appendChild(row);
    });

    return wrap;
}

function buildFailureEndingsSection() {
    const wrap = document.createElement('div');
    wrap.className = "editor-section";
    const title = document.createElement('h3');
    title.className = "editor-section-title";
    title.textContent = "Failure Endings";
    wrap.appendChild(title);
    const note = document.createElement('p');
    note.className = "editor-note";
    note.textContent = "Shown the instant a stat crosses its loss threshold";
    wrap.appendChild(note);

    if (!editorDraft.failureEndings) editorDraft.failureEndings = {};
    ["repression", "mask", "child"].forEach(key => {
        const existing = editorDraft.failureEndings[key];
        if (Array.isArray(existing) && existing.length) return;
        if (existing && typeof existing === 'object' && existing.title) {
            editorDraft.failureEndings[key] = [existing];
            return;
        }
        editorDraft.failureEndings[key] = deepClone(DEFAULT_CONTENT.failureEndings[key]);
    });

    [
        {key: "repression", trigger: "Repression ≥ 100"},
        {key: "mask", trigger: "Mask ≤ 0"},
        {key: "child", trigger: "Inner Child ≤ 0"}
    ].forEach(({key, trigger}) => {
        const pool = editorDraft.failureEndings[key];

        const triggerLabel = document.createElement('p');
        triggerLabel.className = "editor-tag-label";
        triggerLabel.textContent = trigger;
        wrap.appendChild(triggerLabel);

        pool.forEach((fe, idx) => {
            const card = document.createElement('div');
            card.className = "editor-card";

            const head = document.createElement('div');
            head.className = "editor-row";
            const titleInput = document.createElement('input');
            titleInput.className = "editor-input";
            titleInput.value = fe.title;
            titleInput.oninput = () => {
                fe.title = titleInput.value;
            };
            const delBtn = document.createElement('button');
            delBtn.textContent = "Remove";
            delBtn.className = "editor-btn-danger";
            delBtn.onclick = () => {
                if (pool.length <= 1) {
                    alert("Keep at least one variant.");
                    return;
                }
                pool.splice(idx, 1);
                renderEditor();
            };
            head.appendChild(titleInput);
            head.appendChild(delBtn);
            card.appendChild(head);

            const descArea = document.createElement('textarea');
            descArea.rows = 2;
            descArea.className = "editor-input";
            descArea.value = fe.desc;
            descArea.oninput = () => {
                fe.desc = descArea.value;
            };
            card.appendChild(descArea);

            wrap.appendChild(card);
        });

        const addBtn = document.createElement('button');
        addBtn.textContent = "+ Add Variant";
        addBtn.className = "editor-btn self-start";
        addBtn.onclick = () => {
            pool.push({title: "", desc: ""});
            renderEditor();
        };
        wrap.appendChild(addBtn);
    });

    return wrap;
}

function normalizeEditorEndingVariants(ending) {
    if (Array.isArray(ending.variants) && ending.variants.length) return;
    if (ending.title) {
        ending.variants = [{title: ending.title, desc: ending.desc || ""}];
        delete ending.title;
        delete ending.desc;
        return;
    }
    ending.variants = [{title: "New Ending", desc: "Describe what this ending means."}];
}

function buildEndingsSection() {
    const wrap = document.createElement('div');
    wrap.className = "editor-section";
    const title = document.createElement('h3');
    title.className = "editor-section-title";
    title.textContent = "Survival Endings";
    wrap.appendChild(title);
    const note = document.createElement('p');
    note.className = "editor-note";
    note.textContent = "Evaluated top to bottom. First ending whose conditions all match wins.";
    wrap.appendChild(note);

    editorDraft.endings.forEach(normalizeEditorEndingVariants);

    editorDraft.endings.forEach((ending, idx) => {
        const card = document.createElement('div');
        card.className = "editor-card";

        const headRow = document.createElement('div');
        headRow.className = "editor-row";
        const headLabel = document.createElement('p');
        headLabel.className = "editor-tag-label";
        headLabel.textContent = `Ending ${idx + 1} (${ending.variants.length} variant${ending.variants.length === 1 ? '' : 's'})`;
        headRow.appendChild(headLabel);

        const upBtn = document.createElement('button');
        upBtn.textContent = "↑";
        upBtn.className = "editor-btn";
        upBtn.disabled = idx === 0;
        upBtn.onclick = () => {
            [editorDraft.endings[idx - 1], editorDraft.endings[idx]] = [editorDraft.endings[idx], editorDraft.endings[idx - 1]];
            renderEditor();
        };
        const downBtn = document.createElement('button');
        downBtn.textContent = "↓";
        downBtn.className = "editor-btn";
        downBtn.disabled = idx === editorDraft.endings.length - 1;
        downBtn.onclick = () => {
            [editorDraft.endings[idx + 1], editorDraft.endings[idx]] = [editorDraft.endings[idx], editorDraft.endings[idx + 1]];
            renderEditor();
        };
        const delBtn = document.createElement('button');
        delBtn.textContent = "Remove";
        delBtn.className = "editor-btn-danger";
        delBtn.onclick = () => {
            if (editorDraft.endings.length <= 1) {
                alert("Keep at least one ending.");
                return;
            }
            editorDraft.endings.splice(idx, 1);
            renderEditor();
        };
        headRow.appendChild(upBtn);
        headRow.appendChild(downBtn);
        headRow.appendChild(delBtn);
        card.appendChild(headRow);

        const variantWrap = document.createElement('div');
        variantWrap.className = "editor-col";
        ending.variants.forEach((variant, vIdx) => {
            const variantCard = document.createElement('div');
            variantCard.className = "editor-card";

            const variantRow = document.createElement('div');
            variantRow.className = "editor-row";
            const titleInput = document.createElement('input');
            titleInput.className = "editor-input";
            titleInput.value = variant.title;
            titleInput.oninput = () => {
                variant.title = titleInput.value;
            };
            const removeVariantBtn = document.createElement('button');
            removeVariantBtn.textContent = "Remove";
            removeVariantBtn.className = "editor-btn-danger";
            removeVariantBtn.onclick = () => {
                if (ending.variants.length <= 1) {
                    alert("Keep at least one variant.");
                    return;
                }
                ending.variants.splice(vIdx, 1);
                renderEditor();
            };
            variantRow.appendChild(titleInput);
            variantRow.appendChild(removeVariantBtn);
            variantCard.appendChild(variantRow);

            const descArea = document.createElement('textarea');
            descArea.rows = 2;
            descArea.className = "editor-input";
            descArea.value = variant.desc;
            descArea.oninput = () => {
                variant.desc = descArea.value;
            };
            variantCard.appendChild(descArea);

            variantWrap.appendChild(variantCard);
        });
        card.appendChild(variantWrap);

        const addVariantBtn = document.createElement('button');
        addVariantBtn.textContent = "+ Add Variant";
        addVariantBtn.className = "editor-btn self-start";
        addVariantBtn.onclick = () => {
            ending.variants.push({title: "", desc: ""});
            renderEditor();
        };
        card.appendChild(addVariantBtn);

        const condWrap = document.createElement('div');
        condWrap.className = "editor-col";
        (ending.conditions || []).forEach((cond, cIdx) => {
            const condRow = document.createElement('div');
            condRow.className = "editor-row";

            const statSelect = document.createElement('select');
            statSelect.className = "editor-input";
            statSelect.style.width = "auto";
            ["repression", "mask", "child"].forEach(stat => {
                const opt = document.createElement('option');
                opt.value = stat;
                opt.textContent = stat;
                if (cond.stat === stat) opt.selected = true;
                statSelect.appendChild(opt);
            });
            statSelect.onchange = () => {
                cond.stat = statSelect.value;
            };

            const opSelect = document.createElement('select');
            opSelect.className = "editor-input";
            opSelect.style.width = "auto";
            [">=", "<=", ">", "<", "=="].forEach(op => {
                const opt = document.createElement('option');
                opt.value = op;
                opt.textContent = op;
                if (cond.op === op) opt.selected = true;
                opSelect.appendChild(opt);
            });
            opSelect.onchange = () => {
                cond.op = opSelect.value;
            };

            const valInput = document.createElement('input');
            valInput.type = 'number';
            valInput.className = "editor-input";
            valInput.style.width = "5rem";
            valInput.value = cond.value;
            valInput.oninput = () => {
                const v = parseFloat(valInput.value);
                if (!isNaN(v)) cond.value = v;
            };

            const removeCondBtn = document.createElement('button');
            removeCondBtn.textContent = "×";
            removeCondBtn.className = "editor-btn-danger";
            removeCondBtn.onclick = () => {
                ending.conditions.splice(cIdx, 1);
                renderEditor();
            };

            condRow.appendChild(statSelect);
            condRow.appendChild(opSelect);
            condRow.appendChild(valInput);
            condRow.appendChild(removeCondBtn);
            condWrap.appendChild(condRow);
        });
        card.appendChild(condWrap);

        const addCondBtn = document.createElement('button');
        addCondBtn.textContent = "+ Add Condition";
        addCondBtn.className = "editor-btn self-start";
        addCondBtn.onclick = () => {
            ending.conditions = ending.conditions || [];
            ending.conditions.push({stat: "repression", op: ">=", value: 50});
            renderEditor();
        };
        card.appendChild(addCondBtn);

        wrap.appendChild(card);
    });

    const addEndingBtn = document.createElement('button');
    addEndingBtn.textContent = "+ Add Ending";
    addEndingBtn.className = "editor-btn self-start";
    addEndingBtn.onclick = () => {
        editorDraft.endings.push({
            variants: [{title: "New Ending", desc: "Describe what this ending means."}],
            conditions: []
        });
        renderEditor();
    };
    wrap.appendChild(addEndingBtn);

    return wrap;
}

function newBlankEvent(zoneKey) {
    return {
        zone: zoneKey,
        title: "New Event",
        desc: "Describe the trigger.",
        choices: [
            {text: "First response.", tag: "fawn", effects: {rep: 0, mask: 0, child: 0}, log: "Logged reaction."},
            {text: "Second response.", tag: "secure", effects: {rep: 0, mask: 0, child: 0}, log: "Logged reaction."}
        ],
        glitch: {text: "", log: ""}
    };
}

function buildEventZoneGroup(zoneKey, zoneEntries, statBias) {
    const details = document.createElement('details');
    details.className = "editor-zone-group";
    if (statBias) details.classList.add("bias-" + statBias);
    details.open = openEventZones.has(zoneKey);
    details.addEventListener('toggle', () => {
        if (details.open) openEventZones.add(zoneKey); else openEventZones.delete(zoneKey);
    });

    const summary = document.createElement('summary');
    summary.className = "editor-zone-summary";
    summary.textContent = `${zoneKey} (${zoneEntries.length})`;
    details.appendChild(summary);

    const cardsWrap = document.createElement('div');
    cardsWrap.className = "editor-zone-cards";
    details.appendChild(cardsWrap);

    const cardEntries = zoneEntries.map(({evt, idx}) => {
        const card = buildEventCard(evt, idx);
        cardsWrap.appendChild(card);
        return {card, evt};
    });

    return {zoneKey, details, cardEntries};
}

function buildEventsSection() {
    const wrap = document.createElement('div');
    wrap.className = "editor-section";
    const title = document.createElement('h3');
    title.className = "editor-section-title";
    title.textContent = `Events (${editorDraft.events.length})`;
    wrap.appendChild(title);
    const note = document.createElement('p');
    note.className = "editor-note";
    note.textContent = "Grouped by zone, collapsed by default. Filter by title to jump straight to one.";
    wrap.appendChild(note);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = "editor-input";
    searchInput.placeholder = "Filter by title...";
    wrap.appendChild(searchInput);

    const groupsWrap = document.createElement('div');
    groupsWrap.className = "editor-col";
    wrap.appendChild(groupsWrap);

    const usedIndices = new Set();
    const zoneGroups = editorDraft.zones.map(zone => {
        const zoneEntries = editorDraft.events
            .map((evt, idx) => ({evt, idx}))
            .filter(x => x.evt.zone === zone.key);
        zoneEntries.forEach(x => usedIndices.add(x.idx));

        const group = buildEventZoneGroup(zone.key, zoneEntries, zone.statBias);

        const addBtn = document.createElement('button');
        addBtn.textContent = `+ Add Event to ${zone.key}`;
        addBtn.className = "editor-btn self-start";
        addBtn.onclick = () => {
            editorDraft.events.push(newBlankEvent(zone.key));
            openEventZones.add(zone.key);
            renderEditor();
        };
        group.details.appendChild(addBtn);

        groupsWrap.appendChild(group.details);
        return group;
    });

    const orphaned = editorDraft.events
        .map((evt, idx) => ({evt, idx}))
        .filter(x => !usedIndices.has(x.idx));
    if (orphaned.length) {
        const orphanNote = document.createElement('p');
        orphanNote.className = "editor-note";
        orphanNote.textContent = "These reference a zone that no longer exists — reassign them below.";
        const group = buildEventZoneGroup("UNASSIGNED", orphaned, null);
        group.details.classList.add("bias-unassigned");
        group.details.insertBefore(orphanNote, group.details.children[1]);
        groupsWrap.appendChild(group.details);
        zoneGroups.push(group);
    }

    searchInput.oninput = () => {
        const q = searchInput.value.trim().toLowerCase();
        zoneGroups.forEach(g => {
            let anyMatch = false;
            g.cardEntries.forEach(({card, evt}) => {
                const matches = !q || evt.title.toLowerCase().includes(q);
                card.style.display = matches ? '' : 'none';
                if (matches) anyMatch = true;
            });
            g.details.classList.toggle('force-open', !!q && anyMatch);
        });
    };

    return wrap;
}

function buildEventCard(evt, idx) {
    const card = document.createElement('div');
    card.className = "editor-card";

    const titleInput = document.createElement('input');
    titleInput.className = "editor-input";
    titleInput.value = evt.title;
    titleInput.oninput = () => {
        evt.title = titleInput.value;
    };
    card.appendChild(titleInput);

    const metaRow = document.createElement('div');
    metaRow.className = "editor-row";

    const zoneSelect = document.createElement('select');
    zoneSelect.className = "editor-input";
    zoneSelect.style.width = "auto";
    editorDraft.zones.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z.key;
        opt.textContent = z.key;
        if (evt.zone === z.key) opt.selected = true;
        zoneSelect.appendChild(opt);
    });
    zoneSelect.onchange = () => {
        evt.zone = zoneSelect.value;
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = "Remove Event";
    delBtn.className = "editor-btn-danger";
    delBtn.onclick = () => {
        if (editorDraft.events.length <= 1) {
            alert("Keep at least one event.");
            return;
        }
        editorDraft.events.splice(idx, 1);
        renderEditor();
    };

    metaRow.appendChild(zoneSelect);
    metaRow.appendChild(delBtn);
    card.appendChild(metaRow);

    const descArea = document.createElement('textarea');
    descArea.rows = 2;
    descArea.className = "editor-input";
    descArea.value = evt.desc;
    descArea.oninput = () => {
        evt.desc = descArea.value;
    };
    card.appendChild(descArea);

    const choicesWrap = document.createElement('div');
    choicesWrap.className = "editor-choices-wrap";
    evt.choices.forEach((choice, cIdx) => {
        choicesWrap.appendChild(buildChoiceRow(evt, choice, cIdx));
    });
    card.appendChild(choicesWrap);

    const addChoiceBtn = document.createElement('button');
    addChoiceBtn.textContent = "+ Add Choice";
    addChoiceBtn.className = "editor-btn self-start";
    addChoiceBtn.disabled = evt.choices.length >= 5;
    addChoiceBtn.onclick = () => {
        if (evt.choices.length >= 5) return;
        evt.choices.push({
            text: "New response.",
            tag: "fawn",
            effects: {rep: 0, mask: 0, child: 0},
            log: "Logged reaction."
        });
        renderEditor();
    };
    card.appendChild(addChoiceBtn);

    card.appendChild(buildEventGlitchRow(evt));

    return card;
}

function buildEventGlitchRow(evt) {
    if (!evt.glitch) evt.glitch = {text: "", log: ""};

    const wrap = document.createElement('div');
    wrap.className = "editor-glitch-row";

    const label = document.createElement('div');
    label.className = "editor-tag-label";
    label.textContent = "Wildcard (15% chance, untagged, random effects)";
    wrap.appendChild(label);

    const textInput = document.createElement('input');
    textInput.className = "editor-input";
    textInput.placeholder = "Button text — leave blank for the generic default";
    textInput.value = evt.glitch.text;
    textInput.oninput = () => {
        evt.glitch.text = textInput.value;
    };
    wrap.appendChild(textInput);

    const logInput = document.createElement('input');
    logInput.className = "editor-input";
    logInput.placeholder = "Action log line — leave blank to pull from the pack's shared pool";
    logInput.value = evt.glitch.log;
    logInput.oninput = () => {
        evt.glitch.log = logInput.value;
    };
    wrap.appendChild(logInput);

    return wrap;
}

function buildChoiceRow(evt, choice, cIdx) {
    choice.effects = choice.effects || {rep: 0, mask: 0, child: 0};
    const row = document.createElement('div');
    row.className = "editor-choice-row";

    const textInput = document.createElement('input');
    textInput.className = "editor-input";
    textInput.value = choice.text;
    textInput.placeholder = "Choice text";
    textInput.oninput = () => {
        choice.text = textInput.value;
    };
    row.appendChild(textInput);

    const metaRow = document.createElement('div');
    metaRow.className = "editor-meta-row";

    const tagSelect = document.createElement('select');
    tagSelect.className = "editor-input";
    Object.keys(editorDraft.mechanisms).forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        opt.textContent = tag;
        if (choice.tag === tag) opt.selected = true;
        tagSelect.appendChild(opt);
    });
    tagSelect.onchange = () => {
        choice.tag = tagSelect.value;
    };
    metaRow.appendChild(labeledWrap("Response", tagSelect));

    ["rep", "mask", "child"].forEach(k => {
        metaRow.appendChild(buildStatEffectControl(choice, k));
    });

    const removeChoiceBtn = document.createElement('button');
    removeChoiceBtn.textContent = "Remove";
    removeChoiceBtn.className = "editor-btn-danger";
    removeChoiceBtn.disabled = evt.choices.length <= 2;
    removeChoiceBtn.onclick = () => {
        if (evt.choices.length <= 2) return;
        evt.choices.splice(cIdx, 1);
        renderEditor();
    };
    metaRow.appendChild(removeChoiceBtn);

    row.appendChild(metaRow);

    const logInput = document.createElement('input');
    logInput.className = "editor-input";
    logInput.placeholder = "Action log line";
    logInput.value = choice.log;
    logInput.oninput = () => {
        choice.log = logInput.value;
    };
    row.appendChild(logInput);

    return row;
}

const STAT_EFFECT_MODES = [
    {value: "add", label: "+"},
    {value: "subtract", label: "−"},
    {value: "set", label: "="}
];

function buildStatEffectControl(choice, statKey) {
    const current = choice.effects[statKey];
    if (current === null || typeof current !== 'object') {
        const v = current || 0;
        choice.effects[statKey] = {op: v < 0 ? "subtract" : "add", value: Math.abs(v)};
    }
    const raw = choice.effects[statKey];

    const box = document.createElement('div');
    const label = document.createElement('label');
    label.className = "editor-label";
    label.textContent = statKey;
    box.appendChild(label);

    const row = document.createElement('div');
    row.className = "editor-stat-effect-row";

    const modeSelect = document.createElement('select');
    modeSelect.className = "editor-input editor-stat-op-select";
    modeSelect.title = "+ / − add or subtract a magnitude. = sets the stat to an exact value.";
    STAT_EFFECT_MODES.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        if (m.value === raw.op) opt.selected = true;
        modeSelect.appendChild(opt);
    });
    modeSelect.onchange = () => {
        raw.op = modeSelect.value;
    };

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = "editor-input";
    valueInput.value = raw.value || 0;
    valueInput.oninput = () => {
        const v = parseFloat(valueInput.value);
        raw.value = isNaN(v) ? 0 : v;
    };

    row.appendChild(modeSelect);
    row.appendChild(valueInput);
    box.appendChild(row);
    return box;
}

function logEditorStatus(msg) {
    elEditorStatus.textContent = msg;
}

function saveContentDraft() {
    if (!editorDraft) return;
    const cfg = editorDraft.config;
    cfg.glitchChance = Math.max(0, Math.min(1, cfg.glitchChance));
    cfg.unlockThreshold = Math.max(1, Math.round(cfg.unlockThreshold));
    cfg.maxTurns = Math.max(1, Math.round(cfg.maxTurns));
    cfg.hardModeTurns = Math.max(1, Math.round(cfg.hardModeTurns));
    cfg.hardModeMultiplier = Math.max(0.1, cfg.hardModeMultiplier);
    cfg.weakZoneWeight = Math.max(0, cfg.weakZoneWeight);
    cfg.timedEventChance = Math.max(0, Math.min(1, cfg.timedEventChance || 0));
    cfg.timedDuration = Math.max(1000, Math.round(cfg.timedDuration || 8000));

    saveContent(editorDraft);
    logEditorStatus("Saved. Open the simulator to play with these changes.");
    elPlayPackLink.classList.remove('hidden');
}

function discardEditorDraft() {
    editorDraft = deepClone(getContent());
    renderEditor();
    logEditorStatus("Draft reverted to last saved content.");
}

function resetContentPack() {
    if (!window.confirm("Reset to the default content pack? Your custom events and mechanics will be discarded.")) return;
    resetContent();
    editorDraft = deepClone(getContent());
    renderEditor();
    logEditorStatus("Reverted to default content.");
    elPlayPackLink.classList.remove('hidden');
}

function exportContentPack() {
    const pack = editorDraft || getContent();
    const blob = new Blob([JSON.stringify(pack, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uct-content-pack-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            const problems = contentPackProblems(parsed);
            if (problems.length) {
                const shown = problems.slice(0, 10);
                if (problems.length > shown.length) shown.push(`...and ${problems.length - shown.length} more.`);
                throw new Error("\n\n" + shown.join("\n"));
            }
            editorDraft = parsed;
            renderEditor();
            logEditorStatus("Pack imported. Review it below, then Save All Changes to apply.");
        } catch (e) {
            alert("That file doesn't look like a valid content pack: " + e.message);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

window.onload = () => {
    ensureEditorDraft();
    renderEditor();
};
