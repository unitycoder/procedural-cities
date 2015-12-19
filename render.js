"use strict";

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var math_1 = require("./math");
var mapgen_1 = require("./mapgen");
var config_1 = require("./config");
var PIXI = require('pixi.js');
(location.search.substr(1) + "&" + location.hash.substr(1)).split(/[&;]/).forEach(item => {
    var _item$split = item.split("=");

    var _item$split2 = _slicedToArray(_item$split, 2);

    const k = _item$split2[0];
    const v = _item$split2[1];

    if (!k) return;
    const key = decodeURIComponent(k).trim();
    let val = v ? decodeURIComponent(v).trim() : "";
    const list = key.toUpperCase().trim().split(".");
    const attr = list.pop();
    const targ = list.reduce((a, b, i, arr) => a[b], config_1.config);
    const origValue = targ[attr];
    console.log(`config: ${ attr } = ${ val }`);
    if (typeof origValue === "undefined" && attr.substr(0, 2) !== "//") console.warn("unknown config: " + attr);
    if (typeof origValue === "number" || typeof origValue === "boolean") val = +val;
    targ[attr] = val;
});
let seed = config_1.config.SEED || Math.random() + "";
let W = window.innerWidth,
    H = window.innerHeight;
exports.dobounds = function (segs) {
    let interpolate = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

    const lim = segs.map(s => s.limits());
    const bounds = {
        minx: Math.min(...lim.map(s => s.x)),
        miny: Math.min(...lim.map(s => s.y)),
        maxx: Math.max(...lim.map(s => s.x + s.width)),
        maxy: Math.max(...lim.map(s => s.y + s.height))
    };
    const scale = Math.min(W / (bounds.maxx - bounds.minx), H / (bounds.maxy - bounds.miny)) * config_1.config.TARGET_ZOOM;
    const npx = -(bounds.maxx + bounds.minx) / 2 * scale + W / 2;
    const npy = -(bounds.maxy + bounds.miny) / 2 * scale + H / 2;
    exports.stage.position.x = math_1.math.lerp(exports.stage.position.x, npx, interpolate);
    exports.stage.position.y = math_1.math.lerp(exports.stage.position.y, npy, interpolate);
    exports.stage.scale.x = math_1.math.lerp(exports.stage.scale.x, scale, interpolate);
    exports.stage.scale.y = math_1.math.lerp(exports.stage.scale.y, scale, interpolate);
};
function restart() {
    console.log("generating with seed " + seed);
    exports.generator = mapgen_1.generate(seed);
    for (let i = 0; i < config_1.config.SKIP_ITERATIONS; i++) exports.generator.next();
    done = false;
    iteration = 0;
    iteration_wanted = 0;
    has_interacted = false;
}
exports.renderer = PIXI.autoDetectRenderer(W, H, { backgroundColor: config_1.config.BACKGROUND_COLOR, antialias: true, transparent: config_1.config.TRANSPARENT });
document.body.appendChild(exports.renderer.view);
exports.graphics = new PIXI.Graphics();
exports.stage = new PIXI.Container();
exports.stage.addChild(exports.graphics);
exports.stage.interactive = true;
exports.stage.hitArea = new PIXI.Rectangle(-1e7, -1e7, 2e7, 2e7);
let has_interacted = false;
function renderSegment(seg) {
    let color = arguments.length <= 1 || arguments[1] === undefined ? 0x000000 : arguments[1];

    if (!color) color = seg.q.color;
    const x1 = seg.start.x;
    const x2 = seg.end.x;
    const y1 = seg.start.y;
    const y2 = seg.end.y;
    const len = seg.length();
    const arrowLength = Math.min(len, config_1.config.ARROWHEAD_SIZE);
    if (config_1.config.DRAW_CIRCLE_ON_SEGMENT_BASE) {
        exports.graphics.beginFill(color);
        exports.graphics.drawCircle(x1, y1, config_1.config.DRAW_CIRCLE_ON_SEGMENT_BASE);
        exports.graphics.endFill();
    }
    if (config_1.config.ARROWHEAD_SIZE) {
        exports.graphics.lineStyle(seg.width * 2, color, 1);
        exports.graphics.moveTo(x1, y1);
        exports.graphics.lineTo(math_1.math.lerp(x1, x2, 1 - arrowLength / len), math_1.math.lerp(y1, y2, 1 - arrowLength / len));
    } else {
        exports.graphics.lineStyle(seg.width * 10, color, 1);
        exports.graphics.moveTo(x1, y1);
        exports.graphics.lineTo(x2, y2);
    }
    if (config_1.config.ARROWHEAD_SIZE) {
        const angle = Math.PI / 8;
        const h = Math.abs(arrowLength / Math.cos(angle));
        const lineangle = Math.atan2(y2 - y1, x2 - x1);
        const angle1 = lineangle + Math.PI + angle;
        const topx = x2 + Math.cos(angle1) * h;
        const topy = y2 + Math.sin(angle1) * h;
        const angle2 = lineangle + Math.PI - angle;
        const botx = x2 + Math.cos(angle2) * h;
        const boty = y2 + Math.sin(angle2) * h;
        exports.graphics.beginFill(color, 1);
        exports.graphics.lineStyle(0, 0, 1);
        exports.graphics.moveTo(x2, y2);
        exports.graphics.lineTo(topx, topy);
        exports.graphics.lineTo(botx, boty);
        exports.graphics.lineTo(x2, y2);
        exports.graphics.endFill();
    }
}
exports.stage.on('mousedown', onDragStart).on('touchstart', onDragStart).on('mouseup', onDragEnd).on('mouseupoutside', onDragEnd).on('touchend', onDragEnd).on('touchendoutside', onDragEnd).on('mousemove', onDragMove).on('touchmove', onDragMove).on('click', onClick);
function onClick(event) {
    if (this.wasdragged || !config_1.config.DEBUG) return;
    const p = event.data.getLocalPosition(exports.graphics);
    const poss = exports.stuff.qTree.retrieve({
        x: p.x - 10, y: p.y - 10,
        width: 20, height: 20
    });
    const dist = a => {
        const x = math_1.math.distanceToLine(p, a.start, a.end);
        if (x.lineProj2 >= 0 && x.lineProj2 <= x.length2) return x.distance2;else return Infinity;
    };
    poss.sort((a, b) => dist(a) - dist(b));
    poss[0].debugLinks();
}
function onDragStart(event) {
    this.dragstart = { x: event.data.global.x, y: event.data.global.y };
    this.wasdragged = false;
    has_interacted = true;
}
function onDragEnd() {
    this.dragstart = null;
}
function onDragMove(event) {
    this.wasdragged = true;
    if (this.dragstart) {
        this.position.x += event.data.global.x - this.dragstart.x;
        this.position.y += event.data.global.y - this.dragstart.y;
        this.dragstart = { x: event.data.global.x, y: event.data.global.y };
    }
}
function zoom(x, y, direction) {
    const beforeTransform = exports.stage.toLocal(new PIXI.Point(x, y));
    var factor = 1 + direction * 0.1;
    exports.stage.scale.x *= factor;
    exports.stage.scale.y *= factor;
    const afterTransform = exports.stage.toLocal(new PIXI.Point(x, y));
    exports.stage.position.x += (afterTransform.x - beforeTransform.x) * exports.stage.scale.x;
    exports.stage.position.y += (afterTransform.y - beforeTransform.y) * exports.stage.scale.y;
}
window.addEventListener('wheel', e => {
    has_interacted = true;
    zoom(e.clientX, e.clientY, -math_1.math.sign(e.deltaY));
});
let done = false;
let done_time = 0;
let iteration = 0;
let iteration_wanted = 0;
let last_timestamp = 0;
let last_t_found = -1;
restart();
requestAnimationFrame(animate);
function animate(timestamp) {
    let delta = timestamp - last_timestamp;
    last_timestamp = timestamp;
    if (delta > 100) {
        console.warn("delta = " + delta);
        delta = 100;
    }
    if (!done) {
        iteration_wanted += (iteration * config_1.config.ITERATION_SPEEDUP + config_1.config.ITERATIONS_PER_SECOND) * delta / 1000;
        while (iteration < iteration_wanted) {
            const iter = exports.generator.next();
            if (iter.done) {
                done = true;
                done_time = timestamp;
                break;
            } else {
                exports.stuff = iter.value;
                exports.stuff = exports.stuff;
                iteration++;
            }
        }
    } else {
        if (config_1.config.RESTART_AFTER_SECONDS >= 0 && done_time + config_1.config.RESTART_AFTER_SECONDS * 1000 < timestamp) {
            if (config_1.config.RESEED_AFTER_RESTART) {
                seed = Math.random() + "";
            }
            restart();
        }
    }
    if (!has_interacted) exports.dobounds([...exports.stuff.segments, ...exports.stuff.priorityQ], iteration <= config_1.config.SMOOTH_ZOOM_START ? 1 : 0.05);
    exports.graphics.clear();
    if (config_1.config.DRAW_HEATMAP) {
        const dim = config_1.config.HEATMAP_PIXEL_DIM;
        for (let x = 0; x < W; x += dim) for (let y = 0; y < H; y += dim) {
            const p = exports.stage.toLocal(new PIXI.Point(x, y));
            const pop = mapgen_1.heatmap.populationAt(p.x + dim / 2, p.y + dim / 2);
            let v;
            if (config_1.config.HEATMAP_AS_THRESHOLD) {
                v = pop > config_1.config.NORMAL_BRANCH_POPULATION_THRESHOLD ? 255 : pop > config_1.config.HIGHWAY_BRANCH_POPULATION_THRESHOLD ? 200 : 150;
            } else {
                v = 255 - pop * 255 | 0;
            }
            exports.graphics.beginFill(v << 16 | v << 8 | v);
            exports.graphics.drawRect(p.x, p.y, dim / exports.stage.scale.x, dim / exports.stage.scale.y);
            exports.graphics.endFill();
        }
    }
    for (const seg of exports.stuff.segments) renderSegment(seg);
    if (!done) {
        if (config_1.config.PRIORITY_FUTURE_COLORS) {
            const minT = exports.stuff.priorityQ.reduce((min, seg) => Math.min(min, seg.t), Infinity);
            const future_colors = [0xFF0000, 0x44ff44, 0x6666ff];
            for (const seg of exports.stuff.priorityQ) renderSegment(seg, future_colors[Math.min(seg.t - minT, future_colors.length - 1)]);
        } else {
            for (const seg of exports.stuff.priorityQ) renderSegment(seg, 0xFF0000);
        }
        if (config_1.config.DELAY_BETWEEN_TIME_STEPS) {
            const first_t = exports.stuff.priorityQ[0].t;
            if (first_t !== last_t_found && exports.stuff.priorityQ.every(seg => seg.t === first_t)) {
                iteration_wanted -= config_1.config.DELAY_BETWEEN_TIME_STEPS * config_1.config.ITERATIONS_PER_SECOND;
                last_t_found = first_t;
            }
        }
    }
    requestAnimationFrame(animate);
    exports.renderer.render(exports.stage);
}
function onResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    exports.renderer.resize(W, H);
}
window.addEventListener("resize", onResize);
window._render = this;

