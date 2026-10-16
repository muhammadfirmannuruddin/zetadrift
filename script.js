document.addEventListener('DOMContentLoaded', () => {
    // --- GAME DATA STRUCTURES ---
    const traits = [
        { id: 'antifreeze', name: 'Antifreeze Glycoproteins', cost: 2, counter: 'Polar Freeze' },
        { id: 'bioluminescence', name: 'Bioluminescence Enzymes', cost: 2, counter: 'Abyssal Pitch' },
        { id: 'osmoregulation', name: 'Euryhaline Osmoregulation', cost: 2, counter: 'Estuary Drop' },
        { id: 'toxic_resistance', name: 'Detoxifying Exudates', cost: 2, counter: 'Anoxic Bloom' }
    ];

    const initialBasins = [
        { id: 'north_atlantic', name: 'Arctic Drift', filter: 'Polar Freeze', colonized: false },
        { id: 'marianas', name: 'Hadals Deep', filter: 'Abyssal Pitch', colonized: false },
        { id: 'baltic', name: 'Coastal Estuary', filter: 'Estuary Drop', colonized: false },
        { id: 'benguela', name: 'Eutrophic Upwelling', filter: 'Anoxic Bloom', colonized: false }
    ];

    const epochHazards = [
        "A sudden warming event melts high-latitude barriers, but triggers low-oxygen dead zones.",
        "Deep-sea tectonic venting introduces extreme pressure and chemical toxicity across global trenches.",
        "Continental runoff dramatically drops salinity levels in shallow, coastal areas.",
        "A massive algal boom creates eutrophic, oxygen-depleted zones globally."
    ];

    // --- GAME STATE ---
    let gameState = {
        lineage: '',
        points: 5,
        epoch: 1,
        unlockedTraits: [],
        colonizedBasins: [],
        selectedDispersals: []
    };

    // --- DOM ELEMENT CACHE ---
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    const displayLineage = document.getElementById('display-lineage');
    const displayPoints = document.getElementById('display-points');
    const displayEpoch = document.getElementById('display-epoch');
    const displayZeta = document.getElementById('display-zeta');
    const traitsList = document.getElementById('traits-list');
    const basinsList = document.getElementById('basins-list');
    const mapVisual = document.getElementById('map-visual');
    const gameLog = document.getElementById('game-log');
    const endReason = document.getElementById('end-reason');
    const endZeta = document.getElementById('end-zeta');
    const endColonies = document.getElementById('end-colonies');
    const endFeedback = document.getElementById('end-feedback');

    // --- INITIALIZATION ---
    document.getElementById('select-teleost').addEventListener('click', () => initGame('Teleost Fish'));
    document.getElementById('select-crustacean').addEventListener('click', () => initGame('Crustacean'));
    document.getElementById('select-mollusk').addEventListener('click', () => initGame('Benthic Mollusk'));
    document.getElementById('btn-end-turn').addEventListener('click', processEndTurn);
    document.getElementById('btn-restart').addEventListener('click', restartGame);

    function initGame(lineageChoice) {
        gameState.lineage = lineageChoice;
        gameState.points = 6; // Starting budget
        gameState.epoch = 1;
        gameState.unlockedTraits = [];
        gameState.colonizedBasins = [];
        gameState.selectedDispersals = [];

        // Distribute free ancestral starting traits based on chosen class
        if (lineageChoice === 'Teleost Fish') {
            gameState.unlockedTraits.push('Active Swimming');
        } else if (lineageChoice === 'Crustacean') {
            gameState.unlockedTraits.push('Chitinous Armor');
        } else {
            gameState.unlockedTraits.push('Calcium Carbonate Shell');
        }

        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        
        displayLineage.textContent = lineageChoice;
        
        logMessage(`Evolutionary sequence initiated with lineage: ${lineageChoice}.`, 'info');
        renderUI();
    }

    // --- GAME LOG SYSTEM ---
    function logMessage(text, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = `[Epoch ${gameState.epoch}] ${text}`;
        gameLog.appendChild(entry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    // --- RENDER GAME INTERFACE ---
    function renderUI() {
        displayPoints.textContent = gameState.points;
        displayEpoch.textContent = `${gameState.epoch}/5`;
        
        const zetaPercent = calculateZetaDiversity();
        displayZeta.textContent = `${zetaPercent}%`;

        renderTraits();
        renderDispersalOptions();
        renderMap();
    }

    function renderTraits() {
        traitsList.innerHTML = '';
        traits.forEach(trait => {
            const isUnlocked = gameState.unlockedTraits.includes(trait.id);
            
            const div = document.createElement('div');
            div.className = `item-row ${isUnlocked ? 'unlocked' : ''}`;
            
            const info = document.createElement('div');
            info.innerHTML = `<strong>${trait.name}</strong><br><span class="small-text">Bypasses: ${trait.counter}</span>`;
            div.appendChild(info);

            if (!isUnlocked) {
                const btn = document.createElement('button');
                btn.className = 'btn-small';
                btn.textContent = `Evolve (2 EP)`;
                btn.disabled = gameState.points < trait.cost;
                btn.addEventListener('click', () => evolveTrait(trait.id, trait.cost));
                div.appendChild(btn);
            }
            traitsList.appendChild(div);
        });
    }

    function renderDispersalOptions() {
        basinsList.innerHTML = '';
        initialBasins.forEach(basin => {
            const isColonized = gameState.colonizedBasins.includes(basin.id);
            const isSelected = gameState.selectedDispersals.includes(basin.id);

            const div = document.createElement('div');
            div.className = 'item-row';

            const info = document.createElement('div');
            info.innerHTML = `<strong>${basin.name}</strong><br><span class="small-text">Constraint: ${basin.filter}</span>`;
            div.appendChild(info);

            if (!isColonized) {
                const btn = document.createElement('button');
                btn.className = 'btn-small';
                btn.textContent = isSelected ? 'Selected' : 'Drift (1 EP)';
                btn.style.backgroundColor = isSelected ? 'rgba(0, 255, 170, 0.2)' : '';
                btn.style.borderColor = isSelected ? 'var(--accent)' : '';
                
                btn.addEventListener('click', () => toggleDispersal(basin.id));
                div.appendChild(btn);
            } else {
                const statusSpan = document.createElement('span');
                statusSpan.textContent = 'Colonized';
                statusSpan.style.color = 'var(--accent)';
                div.appendChild(statusSpan);
            }

            basinsList.appendChild(div);
        });
    }

    function renderMap() {
        mapVisual.innerHTML = '';
        initialBasins.forEach(basin => {
            const isColonized = gameState.colonizedBasins.includes(basin.id);
            
            const div = document.createElement('div');
            div.className = `map-node ${isColonized ? 'colonized' : ''}`;
            
            div.innerHTML = `
                <h4>${basin.name}</h4>
                <div class="filter-badge">Filter: ${basin.filter}</div>
            `;
            mapVisual.appendChild(div);
        });
    }

    // --- GAME ACTIONS ---
    function evolveTrait(traitId, cost) {
        if (gameState.points >= cost) {
            gameState.points -= cost;
            gameState.unlockedTraits.push(traitId);
            const traitObj = traits.find(t => t.id === traitId);
            logMessage(`Successfully evolved: ${traitObj.name}!`, 'success');
            renderUI();
        }
    }

    function toggleDispersal(basinId) {
        const index = gameState.selectedDispersals.indexOf(basinId);
        if (index > -1) {
            gameState.selectedDispersals.splice(index, 1);
            gameState.points += 1;
        } else {
            if (gameState.selectedDispersals.length >= 2) {
                logMessage("You can only target up to 2 basins per epoch.", "warn");
                return;
            }
            if (gameState.points >= 1) {
                gameState.points -= 1;
                gameState.selectedDispersals.push(basinId);
            } else {
                logMessage("Insufficient Evolution Points to drift.", "warn");
            }
        }
        renderUI();
    }

    // --- MACROECOLOGICAL MATH (ZETA DIVERSITY) ---
    function calculateZetaDiversity() {
        if (gameState.colonizedBasins.length === 0) return 0;
        
        // Simulating the structural community overlap across different environmental settings.
        // As you collect more colonizing species with shared evolutionary roots, overlap index goes up.
        const totalPossibleBasins = initialBasins.length;
        const colonizedCount = gameState.colonizedBasins.length;
        const adaptationOverlap = gameState.unlockedTraits.length;
        
        const rawZeta = (colonizedCount / totalPossibleBasins) * (0.5 + (adaptationOverlap / 8));
        return Math.min(100, Math.round(rawZeta * 100));
    }

    // --- TURN PROGRESSION LOOP ---
    function processEndTurn() {
        if (gameState.selectedDispersals.length === 0) {
            logMessage("You must select at least one basin to disperse into this turn.", "warn");
            return;
        }

        logMessage("Drifting phase began. Analyzing physiological filters...", "info");

        // Clone list so we can clear selected choices during verification
        const targets = [...gameState.selectedDispersals];
        gameState.selectedDispersals = [];

        targets.forEach(basinId => {
            const basin = initialBasins.find(b => b.id === basinId);
            const correspondingTrait = traits.find(t => t.counter === basin.filter);
            
            // Check if player developed physiological trait to bypass filter
            const hasAdaptation = correspondingTrait ? gameState.unlockedTraits.includes(correspondingTrait.id) : false;

            if (hasAdaptation) {
                gameState.colonizedBasins.push(basinId);
                logMessage(`Successful Colonization! Your lineage successfully established in the ${basin.name}.`, 'success');
            } else {
                logMessage(`Drifting Failed! The ${basin.name} physiological constraint (${basin.filter}) decimated your planktonic drift stage.`, 'warn');
            }
        });

        // Award dynamic Turn End Points
        gameState.points += 3; // Basic turn income
        gameState.points += gameState.colonizedBasins.length; // Extra points for ecological fitness
        
        gameState.epoch += 1;

        if (gameState.epoch > 5) {
            endSimulation("The geological transition has reached equilibrium.");
        } else {
            // Apply geological hazard warning
            const hazardText = epochHazards[gameState.epoch - 2];
            logMessage(`GEOLOGICAL REPORT: ${hazardText}`, 'warn');
            renderUI();
        }
    }

    // --- END GAME SYSTEM ---
    function endSimulation(reason) {
        gameScreen.classList.add('hidden');
        endScreen.classList.remove('hidden');

        endReason.textContent = reason;
        const finalZeta = calculateZetaDiversity();
        endZeta.textContent = `${finalZeta}%`;
        endColonies.textContent = gameState.colonizedBasins.length;

        let rating = '';
        if (finalZeta < 30) {
            rating = "🔴 Paleontological Footnote: Your lineage is highly isolated. You failed to create resilient geographic networks and were lost to the fossil record during a subsequent mass extinction event.";
        } else if (finalZeta >= 30 && finalZeta < 70) {
            rating = "🟡 Ecological Cosmopolite: Your group successfully colonized multiple critical basins, becoming an ecological anchor of regional aquatic communities.";
        } else {
            rating = "🟢 Cosmopolitan Super-Lineage: Perfect evolutionary drift! Your high genetic modularity and physical adaptations successfully bypassed every environmental filter, shaping modern planetary marine biogeography.";
        }
        endFeedback.textContent = rating;
    }

    function restartGame() {
        endScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
        gameLog.innerHTML = '';
        initialBasins.forEach(b => b.colonized = false);
    }
});
