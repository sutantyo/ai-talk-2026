// Coding RPG, browser version: a port of the Java/JavaFX prototype in ../../coding-rpg.
// Walk a grid world; every battle is a programming question. Progress is saved in the browser (localStorage).
"use strict";

const TILE = 16;
const SCALE = 3;
const WIDTH = 960;
const HEIGHT = 720;
const MAX_LIFE = 6;
/** Share of the area's questions you must have answered right once before the boss will fight. */
const BOSS_GATE = 0.7;
const SAVE_KEY = "coding-rpg.save";

const Facing = {
    DOWN: { dx: 0, dy: 1, row: 0 },
    LEFT: { dx: -1, dy: 0, row: 1 },
    RIGHT: { dx: 1, dy: 0, row: 2 },
    UP: { dx: 0, dy: -1, row: 3 },
};

const random = Math.random;

function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

// ---- spaced repetition (Leitner) ----

/**
 * A right answer moves a question up a level (two if it was fast), a wrong one drops it to 0. Each level has a
 * review interval; higher levels come back less often.
 */
const Scheduler = {
    MAX_LEVEL: 5,
    MASTERED_LEVEL: 3,
    /** Answers faster than this count as "easy". Answer time is recorded, never enforced. */
    FAST_MS: 20_000,
    INTERVALS_MS: [0, 10 * 60_000, 86_400_000, 3 * 86_400_000, 7 * 86_400_000, 21 * 86_400_000],

    record(p, correct, takenMs, now) {
        if (correct) {
            const step = takenMs <= this.FAST_MS ? 2 : 1;
            p.level = Math.min(this.MAX_LEVEL, p.level + step);
            p.right++;
        } else {
            p.level = 0;
            p.wrong++;
        }
        p.dueAt = now + this.INTERVALS_MS[p.level];
    },

    status(p, now) {
        if (!p) {
            return "NEW";
        }
        if (p.dueAt <= now) {
            return "DUE";
        }
        return p.level >= this.MASTERED_LEVEL ? "MASTERED" : "LEARNING";
    },

    isMastered(p) {
        return !!p && p.level >= this.MASTERED_LEVEL;
    },

    /** Answered right at least once. Used for the boss gate. */
    isLearned(p) {
        return !!p && p.right > 0;
    },

    /**
     * Picks the next question for a battle: due reviews first (weakest first), then new questions in random order,
     * then whatever comes due soonest. Questions already asked in this battle are skipped until the pool runs out.
     */
    next(pool, progress, asked, now) {
        let candidates = pool.filter(id => !asked.has(id));
        if (candidates.length === 0) {
            candidates = [...pool];
        }
        shuffle(candidates);
        const tier = id => ({ DUE: 0, NEW: 1 })[this.status(progress[id], now)] ?? 2;
        const level = id => progress[id]?.level ?? 0;
        const due = id => progress[id]?.dueAt ?? now;
        candidates.sort((a, b) => tier(a) - tier(b) || level(a) - level(b) || due(a) - due(b));
        return candidates[0];
    },
};

// ---- save ----

const SaveStore = {
    load() {
        try {
            const text = localStorage.getItem(SAVE_KEY);
            return text ? JSON.parse(text) : null;
        } catch {
            return null;
        }
    },

    save(data) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch {
            // Private windows can refuse storage; the game still plays, it just won't remember.
        }
    },

    clear() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // Nothing to clear.
        }
    },
};

// ---- content and map ----

class Content {
    constructor(data) {
        this.questions = new Map(data.questions.map(q => [q.id, q]));
        this.monsterList = data.monsters;
        this.monsters = new Map(data.monsters.map(m => [m.id, m]));
        this.library = data.library;
        for (const m of this.monsterList) {
            for (const id of m.questions) {
                if (!this.questions.has(id)) {
                    throw new Error(`Monster ${m.id} asks unknown question ${id}`);
                }
            }
        }
    }
}

/**
 * One map section. The ground is a grid of characters: . grass, , tall grass (random encounters), = road,
 * ~ water, X exit. Props (trees, houses) and NPCs sit on top; their positions are in tiles.
 */
class WorldMap {
    static TALL_GRASS = ",";
    static ROAD = "=";
    static WATER = "~";
    static EXIT = "X";

    constructor(data) {
        this.data = data;
        this.height = data.ground.length;
        this.width = data.ground[0].length;
        this.blockedGrid = [];
        for (let y = 0; y < this.height; y++) {
            if (data.ground[y].length !== this.width) {
                throw new Error(`Map row ${y} has the wrong length`);
            }
            this.blockedGrid.push([...data.ground[y]].map(c => c === WorldMap.WATER));
        }
        for (const npc of data.npcs) {
            this.blockedGrid[npc.y][npc.x] = true;
        }
    }

    /**
     * Marks a prop's solid tiles, once its picture's size (in tiles) is known. Only the bottom solidRows rows
     * block walking (so you can walk behind a treetop); 0 means the whole picture, -1 means none (flowers).
     */
    placeProp(prop, widthTiles, heightTiles) {
        if (prop.solidRows < 0) {
            return;
        }
        const solid = prop.solidRows <= 0 ? heightTiles : Math.min(prop.solidRows, heightTiles);
        for (let y = prop.y + heightTiles - solid; y < prop.y + heightTiles; y++) {
            for (let x = prop.x; x < prop.x + widthTiles; x++) {
                if (this.inside(x, y)) {
                    this.blockedGrid[y][x] = true;
                }
            }
        }
    }

    inside(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    blocked(x, y) {
        return !this.inside(x, y) || this.blockedGrid[y][x];
    }

    ground(x, y) {
        return this.inside(x, y) ? this.data.ground[y][x] : WorldMap.WATER;
    }
}

// ---- images ----

/** Loads images from assets/ once. A missing image becomes a magenta checkerboard instead of a crash. */
class Assets {
    constructor() {
        this.cache = new Map();
    }

    load(paths) {
        return Promise.all([...new Set(paths)].map(path => new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                this.cache.set(path, img);
                resolve();
            };
            img.onerror = () => {
                console.error("Missing asset: " + path);
                this.cache.set(path, Assets.placeholder());
                resolve();
            };
            img.src = "assets/" + path.split("/").map(encodeURIComponent).join("/");
        })));
    }

    image(path) {
        if (!this.cache.has(path)) {
            console.error("Asset not preloaded: " + path);
            this.cache.set(path, Assets.placeholder());
        }
        return this.cache.get(path);
    }

    static placeholder() {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g = c.getContext("2d");
        for (let y = 0; y < 128; y += 4) {
            for (let x = 0; x < 128; x += 4) {
                g.fillStyle = (x / 4 + y / 4) % 2 === 0 ? "magenta" : "black";
                g.fillRect(x, y, 4, 4);
            }
        }
        return c;
    }

    /** Draws one frame of a sheet. row is the direction (0 down, 1 left, 2 right, 3 up). */
    drawFrame(ctx, sprite, row, frame, x, y, scale) {
        const fw = sprite.frameWidth;
        const fh = sprite.frameHeight;
        ctx.drawImage(this.image(sprite.sheet), (frame % sprite.frames) * fw, row * fh, fw, fh,
            x, y, fw * scale, fh * scale);
    }
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

function drawHearts(ctx, game, x, y) {
    const full = game.assets.image("ui/heart_full.png");
    const empty = game.assets.image("ui/heart_empty.png");
    for (let i = 0; i < MAX_LIFE; i++) {
        ctx.drawImage(i < game.save.life ? full : empty, x + i * 34, y, 32, 32);
    }
}

function show(el, visible) {
    el.classList.toggle("hidden", !visible);
}

// ---- the overworld ----

const PLAYER_WALK = { sheet: "sprites/Swashbuckler_walk.png", frameWidth: 48, frameHeight: 48, frames: 4 };
const PLAYER_IDLE = { sheet: "sprites/Swashbuckler_idle.png", frameWidth: 48, frameHeight: 48, frames: 4 };

/** Walking around the map: grid movement, tall-grass encounters, NPCs, the boss, dialogue and the monster book. */
class OverworldScreen {
    static STEP_SECONDS = 0.16;
    static ENCOUNTER_CHANCE = 0.15;

    constructor(game) {
        this.g = game;
        this.map = game.map;
        this.facing = game.save.facing;
        this.fromX = game.save.x;
        this.fromY = game.save.y;
        this.moving = false;
        this.moveT = 0;
        this.lastSave = 0;
        this.clock = 0;
        this.lines = [];
        this.afterDialogue = null;
        this.layer = document.getElementById("overworld");
        this.dialogue = document.getElementById("dialogue");
        this.book = document.getElementById("book");
    }

    teleport(x, y) {
        this.g.save.x = x;
        this.g.save.y = y;
        this.g.save.facing = this.facing = "DOWN";
        this.moving = false;
    }

    say(text, then = null) {
        this.lines.push(...text);
        this.afterDialogue = then;
        this.showNextLine();
    }

    showNextLine() {
        const line = this.lines.shift();
        show(this.dialogue, line !== undefined);
        if (line !== undefined) {
            this.dialogue.textContent = line + "\n\n▶ Enter";
        } else if (this.afterDialogue) {
            const r = this.afterDialogue;
            this.afterDialogue = null;
            r();
        }
    }

    visible(el) {
        return !el.classList.contains("hidden");
    }

    busy() {
        return this.visible(this.dialogue) || this.visible(this.book);
    }

    // ---- input and movement ----

    keyPressed(code) {
        if (this.visible(this.book)) {
            if (code === "KeyB" || code === "Escape" || code === "Enter") {
                show(this.book, false);
            }
            return;
        }
        if (this.visible(this.dialogue)) {
            if (code === "Enter" || code === "Space") {
                this.showNextLine();
            }
            return;
        }
        if (code === "KeyB") {
            this.openBook();
        } else if ((code === "Enter" || code === "Space") && !this.moving) {
            this.interact();
        }
    }

    heldDirection() {
        const held = this.g.held;
        if (held.has("ArrowUp") || held.has("KeyW")) {
            return "UP";
        }
        if (held.has("ArrowDown") || held.has("KeyS")) {
            return "DOWN";
        }
        if (held.has("ArrowLeft") || held.has("KeyA")) {
            return "LEFT";
        }
        if (held.has("ArrowRight") || held.has("KeyD")) {
            return "RIGHT";
        }
        return null;
    }

    update(dt) {
        this.clock += dt;
        if (this.moving) {
            this.moveT += dt / OverworldScreen.STEP_SECONDS;
            if (this.moveT >= 1) {
                this.moving = false;
                this.arrived();
            }
            return;
        }
        if (this.busy()) {
            return;
        }
        const dir = this.heldDirection();
        if (!dir) {
            return;
        }
        const save = this.g.save;
        this.facing = save.facing = dir;
        const nx = save.x + Facing[dir].dx;
        const ny = save.y + Facing[dir].dy;
        if (!this.blocked(nx, ny)) {
            this.fromX = save.x;
            this.fromY = save.y;
            save.x = nx;
            save.y = ny;
            this.moving = true;
            this.moveT = 0;
        }
    }

    blocked(x, y) {
        return this.map.blocked(x, y) || this.isBoss(x, y);
    }

    isBoss(x, y) {
        const b = this.map.data.boss;
        return !this.g.save.bossDefeated && x >= b.x && x <= b.x + 1 && y >= b.y && y <= b.y + 1;
    }

    arrived() {
        const { x, y } = this.g.save;
        if (this.clock - this.lastSave > 2) {
            this.g.autosave();
            this.lastSave = this.clock;
        }
        const ground = this.map.ground(x, y);
        if (ground === WorldMap.EXIT) {
            this.say(this.map.data.exitLines, () => {
                this.teleport(x - 1, y);
                this.facing = this.g.save.facing = "LEFT";
            });
        } else if (ground === WorldMap.TALL_GRASS && random() < OverworldScreen.ENCOUNTER_CHANCE) {
            this.g.startBattle(this.pickEncounter());
        }
    }

    /** Monsters with questions due (or never seen) turn up more often, so revision happens while you play. */
    pickEncounter() {
        const now = Date.now();
        const pool = [];
        for (const m of this.g.content.monsterList) {
            if (m.boss) {
                continue;
            }
            let weight = 1;
            for (const id of m.questions) {
                const s = Scheduler.status(this.g.save.progress[id], now);
                if (s === "DUE" || s === "NEW") {
                    weight++;
                }
            }
            for (let i = 0; i < weight; i++) {
                pool.push(m);
            }
        }
        return pool[Math.floor(random() * pool.length)];
    }

    interact() {
        const tx = this.g.save.x + Facing[this.facing].dx;
        const ty = this.g.save.y + Facing[this.facing].dy;
        const npc = this.map.data.npcs.find(n => n.x === tx && n.y === ty);
        if (npc) {
            this.talkTo(npc);
        } else if (this.isBoss(tx, ty)) {
            this.challengeBoss();
        }
    }

    talkTo(npc) {
        switch (npc.action) {
            case "heal":
                this.g.save.life = MAX_LIFE;
                this.g.autosave();
                this.say(npc.lines);
                break;
            case "library":
                this.say(this.g.content.library);
                break;
            default:
                this.say(npc.lines);
        }
    }

    challengeBoss() {
        const boss = this.g.content.monsters.get(this.map.data.boss.monster);
        const [learned, total] = this.g.learnedInArea();
        const needed = Math.ceil(total * BOSS_GATE);
        if (learned < needed) {
            this.say(["The Branching Ogre looks you up and down.",
                `"Hah! You've only learned ${learned} of this area's ${total} questions. `
                    + `Come back when you know at least ${needed}."`,
                "(Answer questions from monsters in the tall grass. The Librarian can help.)"]);
        } else {
            this.say([boss.intro], () => this.g.startBattle(boss));
        }
    }

    openBook() {
        const now = Date.now();
        let text = "MONSTER BOOK\n\n";
        for (const m of this.g.content.monsterList) {
            let mastered = 0;
            let learned = 0;
            let due = 0;
            for (const id of m.questions) {
                const p = this.g.save.progress[id];
                mastered += Scheduler.isMastered(p) ? 1 : 0;
                learned += Scheduler.isLearned(p) ? 1 : 0;
                due += Scheduler.status(p, now) === "DUE" ? 1 : 0;
            }
            const n = m.questions.length;
            text += `${m.name.padEnd(18)} mastered ${mastered}/${n}   learned ${learned}/${n}   due now ${due}\n`;
        }
        const [learned, total] = this.g.learnedInArea();
        text += `\nArea 1: learned ${learned} of ${total} questions. The boss needs ${Math.ceil(total * BOSS_GATE)}.\n`;
        text += this.g.save.bossDefeated ? "The Branching Ogre: beaten!\n" : "";
        text += "\nLearned = answered right at least once. Mastered = right several times, spaced out.\n";
        text += "Press B to close.";
        this.book.textContent = text;
        show(this.book, true);
    }

    // ---- drawing ----

    draw(ctx, time) {
        const g = this.g;
        const map = this.map;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                this.drawTile(ctx, this.groundTile(x, y), x, y);
                if (map.ground(x, y) === WorldMap.TALL_GRASS) {
                    this.drawTile(ctx, "tiles/Tall grass.png", x, y);
                }
            }
        }

        // Painter's order: whatever stands lower on the screen is drawn later, so it overlaps things behind it.
        const sprites = [];
        for (const prop of map.data.props) {
            const img = g.assets.image(prop.image);
            const bottom = prop.solidRows < 0 ? -1 : prop.y + img.height / TILE;
            sprites.push({ bottom, draw: () => ctx.drawImage(img, prop.x * TILE * SCALE, prop.y * TILE * SCALE,
                img.width * SCALE, img.height * SCALE) });
        }
        for (const npc of map.data.npcs) {
            sprites.push({ bottom: npc.y + 1, draw: () => g.assets.drawFrame(ctx, npc.sprite, Facing[npc.facing].row,
                Math.floor(time * 4), npc.x * TILE * SCALE, (npc.y * TILE - 8) * SCALE, SCALE) });
        }
        if (!g.save.bossDefeated) {
            const b = map.data.boss;
            const sprite = g.content.monsters.get(b.monster).sprite;
            sprites.push({ bottom: b.y + 2, draw: () => g.assets.drawFrame(ctx, sprite, Facing.LEFT.row,
                Math.floor(time * 4), b.x * TILE * SCALE, b.y * TILE * SCALE, SCALE) });
        }
        let px = g.save.x;
        let py = g.save.y;
        if (this.moving) {
            const t = Math.min(this.moveT, 1);
            px = this.fromX + (g.save.x - this.fromX) * t;
            py = this.fromY + (g.save.y - this.fromY) * t;
        }
        sprites.push({ bottom: py + 1, draw: () => {
            const sheet = this.moving ? PLAYER_WALK : PLAYER_IDLE;
            const frame = Math.floor(time * (this.moving ? 10 : 4));
            g.assets.drawFrame(ctx, sheet, Facing[this.facing].row, frame, (px * TILE - 16) * SCALE,
                (py * TILE - 16) * SCALE, SCALE);
        } });
        sprites.sort((a, b) => a.bottom - b.bottom);
        sprites.forEach(s => s.draw());

        roundRect(ctx, 6, 6, 34 * MAX_LIFE + 12, 42, 6, "rgba(255, 246, 224, 0.9)", "#3b2335");
        drawHearts(ctx, g, 12, 10);
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText("Arrows/WASD: walk    Enter: talk    B: monster book", 14, HEIGHT - 10);
    }

    drawTile(ctx, path, x, y) {
        ctx.drawImage(this.g.assets.image(path), x * TILE * SCALE, y * TILE * SCALE, TILE * SCALE, TILE * SCALE);
    }

    // ---- autotiling (numbering checked against the images by the asset librarian) ----

    groundTile(x, y) {
        const c = this.map.ground(x, y);
        if (c === WorldMap.ROAD || c === WorldMap.EXIT) {
            return this.roadTile(x, y);
        }
        if (c === WorldMap.WATER) {
            return "tiles/Water_tile.png";
        }
        return this.coastTile(x, y) ?? "tiles/Grass_tile.png";
    }

    isRoad(x, y) {
        const c = this.map.ground(x, y);
        return !this.map.inside(x, y) || c === WorldMap.ROAD || c === WorldMap.EXIT;
    }

    isWater(x, y) {
        return this.map.inside(x, y) && this.map.ground(x, y) === WorldMap.WATER;
    }

    /** Road_edge_N is a road cell with grass outside it: 1-8 sides and corners, 9-12 inner corners. */
    roadTile(x, y) {
        const n = this.isRoad(x, y - 1);
        const s = this.isRoad(x, y + 1);
        const w = this.isRoad(x - 1, y);
        const e = this.isRoad(x + 1, y);
        let edge;
        if (!n && !w) {
            edge = 1;
        } else if (!n && !e) {
            edge = 3;
        } else if (!s && !w) {
            edge = 6;
        } else if (!s && !e) {
            edge = 8;
        } else if (!n) {
            edge = 2;
        } else if (!w) {
            edge = 4;
        } else if (!e) {
            edge = 5;
        } else if (!s) {
            edge = 7;
        } else if (!this.isRoad(x + 1, y + 1)) {
            edge = 9;
        } else if (!this.isRoad(x - 1, y + 1)) {
            edge = 10;
        } else if (!this.isRoad(x + 1, y - 1)) {
            edge = 11;
        } else if (!this.isRoad(x - 1, y - 1)) {
            edge = 12;
        } else {
            return "tiles/Road_tile.png";
        }
        return `tiles/Road_edge_${edge}.png`;
    }

    /** Water_coast_N is a land cell with water outside it, so a pond is ringed with these. Null if no water. */
    coastTile(x, y) {
        const n = this.isWater(x, y - 1);
        const s = this.isWater(x, y + 1);
        const w = this.isWater(x - 1, y);
        const e = this.isWater(x + 1, y);
        let edge;
        if (n && w) {
            edge = 1;
        } else if (n && e) {
            edge = 3;
        } else if (s && w) {
            edge = 6;
        } else if (s && e) {
            edge = 8;
        } else if (s) {
            edge = 7;
        } else if (n) {
            edge = 2;
        } else if (e) {
            edge = 5;
        } else if (w) {
            edge = 4;
        } else if (this.isWater(x + 1, y + 1)) {
            edge = 9;
        } else if (this.isWater(x - 1, y + 1)) {
            edge = 10;
        } else if (this.isWater(x + 1, y - 1)) {
            edge = 11;
        } else if (this.isWater(x - 1, y - 1)) {
            edge = 12;
        } else {
            return null;
        }
        return `tiles/Water_coast_${edge}.png`;
    }
}

// ---- battles ----

/**
 * A battle: the monster asks its questions one at a time. A right answer costs the monster one hit point, a wrong
 * one costs you a heart. Every answer updates the question's spaced-repetition record and is saved at once.
 */
class BattleScreen {
    constructor(game, monster) {
        this.g = game;
        this.monster = monster;
        this.monsterHp = monster.hp;
        this.asked = new Set();
        this.state = "INTRO";
        this.outcome = null;
        this.question = null;
        this.order = [];
        this.shownAt = 0;
        this.monsterFlash = 0;
        this.playerFlash = 0;
        this.monsterFade = 1;

        this.layer = document.getElementById("battle");
        this.topic = document.getElementById("topic");
        this.prompt = document.getElementById("prompt");
        this.code = document.getElementById("code");
        this.choices = document.getElementById("choices");
        this.feedback = document.getElementById("feedback");
        this.next = document.getElementById("next");
        this.run = document.getElementById("run");
        this.next.onclick = () => this.proceed();
        this.run.onclick = () => this.flee();
        this.showIntro();
    }

    // ---- flow ----

    showIntro() {
        this.state = "INTRO";
        this.topic.textContent = this.monster.boss ? "BOSS" : "A wild monster";
        this.prompt.textContent = this.monster.intro;
        show(this.code, false);
        this.choices.replaceChildren();
        show(this.feedback, false);
        this.next.textContent = "Fight! (Enter)";
        show(this.next, true);
        show(this.run, !this.monster.boss);
    }

    showQuestion() {
        this.state = "QUESTION";
        const id = Scheduler.next(this.monster.questions, this.g.save.progress, this.asked, Date.now());
        this.asked.add(id);
        const q = this.question = this.g.content.questions.get(id);
        this.order = shuffle(q.choices.map((_, i) => i));

        this.topic.textContent = q.topic;
        this.prompt.textContent = q.prompt;
        const hasCode = !!q.code && q.code.trim() !== "";
        show(this.code, hasCode);
        if (hasCode) {
            this.code.textContent = BattleScreen.numbered(q.code);
        }
        this.choices.replaceChildren(...this.order.map((choice, i) => {
            const b = document.createElement("button");
            b.className = "choice";
            b.textContent = `${i + 1}.  ${q.choices[choice]}`;
            b.onclick = () => this.choose(i);
            return b;
        }));
        show(this.feedback, false);
        show(this.next, false);
        show(this.run, false);
        this.shownAt = Date.now();
    }

    /** Adds line numbers when the code has more than one line, so "which line?" questions make sense. */
    static numbered(text) {
        const lines = text.split("\n");
        if (lines.length === 1) {
            return text;
        }
        return lines.map((line, i) => `${String(i + 1).padStart(2)}  ${line}`).join("\n");
    }

    choose(index) {
        if (this.state !== "QUESTION" || index >= this.order.length) {
            return;
        }
        this.state = "FEEDBACK";
        const now = Date.now();
        const q = this.question;
        const correct = this.order[index] === q.answer;
        Scheduler.record(this.g.progress(q.id), correct, now - this.shownAt, now);
        if (correct) {
            this.monsterHp--;
            this.monsterFlash = 0.6;
        } else {
            this.g.save.life--;
            this.playerFlash = 0.6;
        }
        this.g.autosave();

        [...this.choices.children].forEach((b, i) => {
            b.disabled = true;
            if (this.order[i] === q.answer) {
                b.classList.add("right");
            } else if (i === index) {
                b.classList.add("wrong");
            }
        });
        this.feedback.textContent = (correct ? "Right! " : "Not quite. ") + q.explanation;
        this.feedback.className = "feedback " + (correct ? "good" : "bad");
        show(this.feedback, true);
        this.next.textContent = "Continue (Enter)";
        show(this.next, true);
    }

    proceed() {
        switch (this.state) {
            case "INTRO":
                this.showQuestion();
                break;
            case "FEEDBACK":
                if (this.monsterHp <= 0) {
                    this.finish("WON", `You beat the ${this.monster.name}! ${this.masterySummary()}`);
                } else if (this.g.save.life <= 0) {
                    this.finish("LOST", `You're out of hearts! The ${this.monster.name} wins this time.`);
                } else {
                    this.showQuestion();
                }
                break;
            case "OVER":
                this.g.endBattle(this.monster, this.outcome);
                break;
        }
    }

    masterySummary() {
        const mastered = this.monster.questions.filter(id => Scheduler.isMastered(this.g.save.progress[id])).length;
        return `You've mastered ${mastered} of its ${this.monster.questions.length} questions.`;
    }

    finish(result, message) {
        this.state = "OVER";
        this.outcome = result;
        this.topic.textContent = result === "WON" ? "Victory" : "Defeat";
        this.prompt.textContent = message;
        show(this.code, false);
        this.choices.replaceChildren();
        show(this.feedback, false);
        this.next.textContent = "Continue (Enter)";
    }

    flee() {
        if (this.state === "INTRO" && !this.monster.boss) {
            this.g.endBattle(this.monster, "FLED");
        }
    }

    keyPressed(code) {
        if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
            this.proceed();
        } else if (code === "Escape") {
            this.flee();
        } else {
            const m = /^(?:Digit|Numpad)([1-4])$/.exec(code);
            if (m) {
                this.choose(Number(m[1]) - 1);
            }
        }
    }

    // ---- drawing ----

    update(dt) {
        this.monsterFlash = Math.max(0, this.monsterFlash - dt);
        this.playerFlash = Math.max(0, this.playerFlash - dt);
        if (this.monsterHp <= 0) {
            this.monsterFade = Math.max(0, this.monsterFade - dt * 1.5);
        }
    }

    draw(ctx, time) {
        const g = this.g;
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, "#8fd3f4");
        sky.addColorStop(1, "#d8f1c8");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "#7cb35a";
        ctx.fillRect(0, 170, WIDTH, HEIGHT);

        const shake = this.playerFlash > 0 ? Math.sin(time * 80) * 6 : 0;

        // Platforms
        ctx.fillStyle = "#5e9443";
        ctx.beginPath();
        ctx.ellipse(710, 235, 150, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(240 + shake, 280, 150, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Monster: the overworld sprite's down-facing frames, scaled up.
        const s = this.monster.sprite;
        const scale = s.frameWidth >= 32 ? 6 : 8;
        const w = s.frameWidth * scale;
        const h = s.frameHeight * scale;
        const blink = this.monsterFlash > 0 && Math.floor(time * 16) % 2 === 0;
        if (!blink) {
            ctx.globalAlpha = this.monsterFade;
            g.assets.drawFrame(ctx, s, 0, Math.floor(time * 5), 710 - w / 2, 245 - h, scale);
            ctx.globalAlpha = 1;
        }

        // Player, seen from behind.
        const playerBlink = this.playerFlash > 0 && Math.floor(time * 16) % 2 === 0;
        if (!playerBlink) {
            g.assets.drawFrame(ctx, PLAYER_IDLE, 3, Math.floor(time * 4), 240 - 24 * 5 + shake, 290 - 33 * 5, 5);
        }

        // Monster name and hit points.
        roundRect(ctx, 24, 20, 330, 70, 7, "#fff6e0", "#3b2335");
        ctx.fillStyle = "#3b2335";
        ctx.font = "bold 20px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(this.monster.name, 40, 48);
        for (let i = 0; i < this.monster.hp; i++) {
            roundRect(ctx, 40 + i * 34, 60, 28, 16, 3, i < this.monsterHp ? "#d9534f" : "#c9b9a6");
        }

        drawHearts(ctx, g, WIDTH - 34 * MAX_LIFE - 20, 24);
    }
}

// ---- the game ----

/** Holds the game's state and switches between the overworld and battles. */
class Game {
    constructor(assets) {
        this.assets = assets;
        this.content = new Content(window.CONTENT);
        this.map = new WorldMap(window.MAP);
        this.held = new Set();
        for (const prop of this.map.data.props) {
            const img = assets.image(prop.image);
            this.map.placeProp(prop, Math.ceil(img.width / TILE), Math.ceil(img.height / TILE));
        }

        const saved = SaveStore.load();
        this.save = saved ?? this.newSave();
        this.overworld = new OverworldScreen(this);
        if (!saved) {
            this.overworld.say([
                "Welcome to Coding RPG! Use the arrow keys (or WASD) to walk.",
                "Monsters hide in the tall grass. Beat them by answering their questions.",
                "Wrong answers cost a heart. The Healer, by the small house, restores your life.",
                "The Librarian, by the big house, explains this area's topics. Press Enter to talk.",
                "Press B any time to open your monster book and see what you've mastered."]);
        }
        this.setScreen(this.overworld);
    }

    newSave() {
        return {
            version: 1,
            x: this.map.data.start.x,
            y: this.map.data.start.y,
            facing: "DOWN",
            life: MAX_LIFE,
            bossDefeated: false,
            progress: {},
        };
    }

    press(code) {
        this.held.add(code);
        this.screen.keyPressed(code);
    }

    release(code) {
        this.held.delete(code);
    }

    start(ctx) {
        ctx.imageSmoothingEnabled = false;
        const first = performance.now();
        let last = -1;
        const frame = now => {
            const dt = last < 0 ? 0 : Math.min(0.05, (now - last) / 1000);
            last = now;
            this.screen.update(dt);
            this.screen.draw(ctx, (now - first) / 1000);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    setScreen(next) {
        if (this.screen) {
            show(this.screen.layer, false);
        }
        this.screen = next;
        this.held.clear();
        show(next.layer, true);
    }

    autosave() {
        SaveStore.save(this.save);
    }

    progress(questionId) {
        return this.save.progress[questionId] ??= { level: 0, dueAt: 0, right: 0, wrong: 0 };
    }

    /** Questions of the area's ordinary monsters that have been answered right at least once, out of all. */
    learnedInArea() {
        let learned = 0;
        let total = 0;
        for (const m of this.content.monsterList) {
            if (m.boss) {
                continue;
            }
            for (const id of m.questions) {
                total++;
                learned += Scheduler.isLearned(this.save.progress[id]) ? 1 : 0;
            }
        }
        return [learned, total];
    }

    startBattle(monster) {
        this.autosave();
        this.setScreen(new BattleScreen(this, monster));
    }

    endBattle(monster, outcome) {
        switch (outcome) {
            case "LOST":
                this.save.life = MAX_LIFE;
                this.overworld.teleport(this.map.data.town.x, this.map.data.town.y);
                this.overworld.say(["You ran out of life and hurried back to town.",
                    "The Healer patched you up. What you learned is still yours."]);
                break;
            case "WON":
                if (monster.boss) {
                    this.save.bossDefeated = true;
                    this.overworld.say(["The Branching Ogre is beaten! The road east is open."]);
                }
                break;
            case "FLED":
                this.overworld.say(["You got away safely."]);
                break;
        }
        this.autosave();
        this.setScreen(this.overworld);
    }
}

/** Every image the game can draw, so they're all loaded (and their sizes known) before it starts. */
function assetPaths() {
    const paths = ["tiles/Grass_tile.png", "tiles/Road_tile.png", "tiles/Water_tile.png", "tiles/Tall grass.png",
        "ui/heart_full.png", "ui/heart_empty.png", PLAYER_WALK.sheet, PLAYER_IDLE.sheet];
    for (let i = 1; i <= 12; i++) {
        paths.push(`tiles/Road_edge_${i}.png`, `tiles/Water_coast_${i}.png`);
    }
    paths.push(...window.MAP.props.map(p => p.image), ...window.MAP.npcs.map(n => n.sprite.sheet));
    paths.push(...window.CONTENT.monsters.map(m => m.sprite.sheet));
    return paths;
}

/** Scales the 960x720 game to fill the window, keeping its shape, so it looks right on a projector. */
function fitToWindow() {
    const stage = document.getElementById("stage");
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

/** Keys the browser would otherwise use itself (scrolling, or pressing a focused button). */
const CAPTURED_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "NumpadEnter"]);

async function main() {
    // Open index.html?new to start over with a fresh save.
    if (new URLSearchParams(location.search).has("new")) {
        SaveStore.clear();
        history.replaceState(null, "", location.pathname);
    }
    fitToWindow();
    window.addEventListener("resize", fitToWindow);

    const assets = new Assets();
    await assets.load(assetPaths());
    const game = new Game(assets);
    window.addEventListener("keydown", e => {
        if (CAPTURED_KEYS.has(e.code)) {
            e.preventDefault();
        }
        if (e.repeat) {
            return;
        }
        game.press(e.code);
    });
    window.addEventListener("keyup", e => game.release(e.code));
    window.addEventListener("blur", () => game.held.clear());
    window.addEventListener("pagehide", () => game.autosave());
    game.start(document.getElementById("canvas").getContext("2d"));
    window.game = game;
}

main();
