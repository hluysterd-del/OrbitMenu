// ====================================================================
//  Orbit Menu V6.0 — Animal Company
//  Controller input, tabs, fly, platforms, orbit-all + OP features.
//  OP features ported from ACCompanion: TP All, Yeet, Stink, Jellify,
//  Color, Void, Fling, Money.
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.0 LOADING =====");

    // ---- assemblies ----
    const acImage    = Il2Cpp.domain.assembly("AnimalCompany").image;
    const coreImage  = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const uiModImage = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
    const uiImage    = Il2Cpp.domain.assembly("UnityEngine.UI").image;
    const textImage  = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

    // ---- classes ----
    const GameObjectClass    = coreImage.class("UnityEngine.GameObject");
    const ObjectClass        = coreImage.class("UnityEngine.Object");
    const RendererClass      = coreImage.class("UnityEngine.Renderer");
    const ResourcesClass     = coreImage.class("UnityEngine.Resources");
    const CanvasClass        = uiModImage.class("UnityEngine.Canvas");
    const TextClass          = uiImage.class("UnityEngine.UI.Text");
    const FontClass          = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");

    const PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController");
    const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");
    const XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager");
    const NetPlayerClass         = acImage.class("AnimalCompany.NetPlayer");

    // ---- state ----
    // Force-reset on reload so stale handles don't stick
    globalThis.orbit = {
        tick: 0,
        hookInstalled: false,
        menuInited: false,
        menuGO: null,
        menuText: null,
        buildFailed: false,

        cursor: 0,
        tab: "main",

        joyCd: 0,
        selWas: false,

        // mod toggles
        platformsOn: false,
        flyOn: false,
        orbitAllOn: false,

        // platform handles
        platL: null,
        platR: null,

        // fly
        savedGrav: null,

        // orbit-all
        orbitAngle: 0,

        // action flash (shows result text briefly)
        actionMsg: "",
        actionTick: 0,

        // logging
        lastLog: 0,
        lastText: "",
        headWaitTick: 0,
    };

    const O = globalThis.orbit;
    function log(m) { console.log("[Orbit] " + m); }

    // ================================================================
    //  HELPERS — singletons & transforms
    // ================================================================
    function playerInst() {
        try {
            const v = PlayerControllerClass.method("get_instance").invoke();
            if (v && !v.handle.isNull()) return v;
        } catch (_) {}
        return null;
    }

    function gorillaInst() {
        try {
            const v = GorillaLocomotionClass.method("get_Instance").invoke();
            if (v && !v.handle.isNull()) return v;
        } catch (_) {}
        return null;
    }

    function headTf() {
        const p = playerInst();
        if (!p) return null;
        try {
            const h = p.method("get_head").invoke();
            if (h && !h.handle.isNull()) return h;
        } catch (_) {}
        for (const n of ["_headTransform", "_cameraTransform", "headFollower"]) {
            try {
                const v = p.field(n).value;
                if (v && !v.handle.isNull()) return v;
            } catch (_) {}
        }
        return null;
    }

    function handTf(side) {
        const p = playerInst();
        if (!p) return null;
        const fname = side === 0 ? "_handTransformLeft" : "_handTransformRight";
        try {
            const v = p.field(fname).value;
            if (v && !v.handle.isNull()) return v;
        } catch (_) {}
        return null;
    }

    function readPos(tf) {
        if (!tf) return null;
        try {
            const v = tf.method("get_position").invoke();
            try { const u = v.unbox(); return {x:u.field("x").value, y:u.field("y").value, z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value, y:v.field("y").value, z:v.field("z").value};
        } catch (_) {}
        return null;
    }

    function readFwd(tf) {
        if (!tf) return null;
        try {
            const v = tf.method("get_forward").invoke();
            try { const u = v.unbox(); return {x:u.field("x").value, y:u.field("y").value, z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value, y:v.field("y").value, z:v.field("z").value};
        } catch (_) {}
        return null;
    }

    // ================================================================
    //  PLAYER ITERATION — ported from ACCompanion
    // ================================================================
    // Calls fn(netPlayer) on every non-local player. Returns count affected.
    function forEachOtherPlayer(fn) {
        try {
            const allPlayers = NetPlayerClass.method("get_spawnedPlayers").invoke();
            if (!allPlayers || allPlayers.handle.isNull()) return 0;
            const localP = NetPlayerClass.method("get_localPlayer").invoke();

            let count = 0;
            try { count = allPlayers.method("get_Count").invoke(); } catch(_) { return 0; }

            let affected = 0;
            for (let i = 0; i < count; i++) {
                let np;
                try { np = allPlayers.method("get_Item").invoke(i); } catch(_) { continue; }
                if (!np || np.handle.isNull()) continue;

                // Skip local player — try get_IsMine() first (ACCompanion pattern)
                try {
                    if (np.method("get_IsMine").invoke()) continue;
                } catch(_) {
                    if (localP && np.handle.toString() === localP.handle.toString()) continue;
                }

                try { fn(np); affected++; } catch(e) {
                    if (O.tick % 300 === 0) log("forEachOther err: " + e);
                }
            }
            return affected;
        } catch(e) {
            if (O.tick % 300 === 0) log("forEachOtherPlayer err: " + e);
            return 0;
        }
    }

    // ================================================================
    //  XR INPUT
    // ================================================================
    function joyY(hand) {
        try {
            const r = XRInputManagerClass.method("GetJoystickValue").invoke(hand);
            if (!r) return 0;
            try { return r.unbox().field("y").value; } catch(_){}
            return r.field("y").value;
        } catch (_) { return 0; }
    }

    function trigger(hand) {
        try { return !!XRInputManagerClass.method("GetTriggerButtonValue").invoke(hand); }
        catch (_) { return false; }
    }

    function grip(hand) {
        try { return !!XRInputManagerClass.method("AnyGrabInputPressed", 1).invoke(hand); }
        catch (_) { return false; }
    }

    function bBtn(hand) {
        try { const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 1); return !!v; } catch(_){}
        return trigger(hand);
    }

    // ================================================================
    //  OP ACTIONS — ported from ACCompanion RPCs
    // ================================================================
    function flashAction(msg) {
        O.actionMsg = msg;
        O.actionTick = O.tick;
        log(msg);
    }

    // TP All to Me — RPC_Teleport(Vector3)
    function actTpAllToMe() {
        const myPos = readPos(headTf());
        if (!myPos) { flashAction("no head pos"); return; }
        let n = 0;
        // Try RPC first
        forEachOtherPlayer(np => {
            try { np.method("RPC_Teleport", 1).invoke([myPos.x, myPos.y, myPos.z]); n++; } catch(_) {
                // Fallback: direct transform set
                try {
                    const tf = np.method("get_transform").invoke();
                    if (tf && !tf.handle.isNull()) tf.method("set_position").invoke([myPos.x, myPos.y, myPos.z]);
                    n++;
                } catch(_2) {}
            }
        });
        flashAction("TP'd " + n + " players to you!");
    }

    // Yeet All — RPC_AddForce(Vector3) upward
    function actYeetAll() {
        let n = forEachOtherPlayer(np => {
            np.method("RPC_AddForce", 1).invoke([0, 50.0, 0]);
        });
        flashAction("Yeeted " + n + " players!");
    }

    // Stink All — RPC_TagAsStinky()
    function actStinkAll() {
        let n = forEachOtherPlayer(np => {
            np.method("RPC_TagAsStinky", 0).invoke();
        });
        flashAction("Stinked " + n + " players!");
    }

    // Jellify All — RPC_Jellify(float duration, float strength)
    function actJellifyAll() {
        let n = forEachOtherPlayer(np => {
            np.method("RPC_Jellify", 2).invoke(10.0, 1.0);
        });
        flashAction("Jellified " + n + " players!");
    }

    // Color All — RPC_SetColorHSV(float h, float s, float v) random colors
    function actColorAll() {
        let n = forEachOtherPlayer(np => {
            const h = Math.random() * 360;
            // Try 3-param first, then 4-param
            try { np.method("RPC_SetColorHSV", 3).invoke(h, 1.0, 1.0); } catch(_) {
                try { np.method("RPC_SetColorHSV", 4).invoke(h, 1.0, 1.0, 1.0); } catch(_2) {
                    np.method("RPC_SetColorHSV").invoke(h, 1.0, 1.0);
                }
            }
        });
        flashAction("Colored " + n + " players!");
    }

    // Fling All Up — RPC_AddForce with massive upward force
    function actFlingAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_AddForce", 1).invoke([0, 80.0, 0]); } catch(_) {
                // Fallback: RPC_Teleport to Y=100
                try { np.method("RPC_Teleport", 1).invoke([0, 100.0, 0]); } catch(_2) {}
            }
        });
        flashAction("Flung " + n + " players!");
    }

    // Void All — RPC_Teleport to Y=-500
    function actVoidAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_Teleport", 1).invoke([0, -500.0, 0]); } catch(_) {
                try {
                    const tf = np.method("get_transform").invoke();
                    if (tf && !tf.handle.isNull()) tf.method("set_position").invoke([0, -500.0, 0]);
                } catch(_2) {}
            }
        });
        flashAction("Voided " + n + " players!");
    }

    // Money All — RPC_AddPlayerMoney(int)
    function actMoneyAll() {
        let n = forEachOtherPlayer(np => {
            np.method("RPC_AddPlayerMoney", 1).invoke(99999);
        });
        flashAction("$99999 to " + n + " players!");
    }

    // ================================================================
    //  MENU STRUCTURE
    // ================================================================
    function items() {
        switch (O.tab) {
        case "main": return [
            {l:"Movement",  t:"tab", to:"move"},
            {l:"Items",     t:"tab", to:"items"},
            {l:"<color=#ff3333>Overpowered</color>", t:"tab", to:"op"},
        ];
        case "move": return [
            {l:"< Back",    t:"back"},
            {l:"Platforms", t:"tog", k:"platformsOn"},
            {l:"Fly",       t:"tog", k:"flyOn"},
        ];
        case "items": return [
            {l:"< Back",    t:"back"},
            {l:"Random Item Gun", t:"tog", k:"itemGunOn"},
        ];
        case "op": return [
            {l:"< Back",       t:"back"},
            {l:"Orbit All",    t:"tog", k:"orbitAllOn"},
            {l:"TP All to Me", t:"act", fn: actTpAllToMe},
            {l:"Yeet All",     t:"act", fn: actYeetAll},
            {l:"Stink All",    t:"act", fn: actStinkAll},
            {l:"Jellify All",  t:"act", fn: actJellifyAll},
            {l:"Color All",    t:"act", fn: actColorAll},
            {l:"Fling All Up", t:"act", fn: actFlingAll},
            {l:"Void All",     t:"act", fn: actVoidAll},
            {l:"Money All",    t:"act", fn: actMoneyAll},
        ];
        default: return [];
        }
    }

    function tabTitle() {
        switch(O.tab) {
        case "move":  return " > Movement";
        case "items": return " > Items";
        case "op":    return " > <color=#ff3333>OP</color>";
        default:      return "";
        }
    }

    function render() {
        const its = items();
        const L = ["<color=#bb88ff>Orbit Menu" + tabTitle() + "</color>",""];
        for (let i = 0; i < its.length; i++) {
            const it = its[i];
            const cur = (i === O.cursor) ? "<color=#ffcc00>▶</color> " : "   ";
            let txt = it.l;
            if (it.t === "tog") {
                txt += O[it.k] ? " <color=#00ff00>[ON]</color>"
                                : " <color=#ff4444>[OFF]</color>";
            } else if (it.t === "tab") {
                txt += " ▸";
            } else if (it.t === "act") {
                txt = "<color=#ffaa44>" + txt + "</color>";
            }
            L.push(cur + txt);
        }
        L.push("");
        // Show action result flash for 3 seconds (~180 ticks)
        if (O.actionMsg && (O.tick - O.actionTick) < 180) {
            L.push("<color=#00ffaa>" + O.actionMsg + "</color>");
        }
        L.push("<color=#888888>Stick↑↓ nav   B=select</color>");
        return L.join("\n");
    }

    // ================================================================
    //  INPUT + NAVIGATION
    // ================================================================
    function processInput() {
        const yR = joyY(1), yL = joyY(0);
        const y = Math.abs(yR) > Math.abs(yL) ? yR : yL;
        const its = items();

        if (O.joyCd > 0) { O.joyCd--; }
        else {
            if (y < -0.45 && O.cursor < its.length - 1) { O.cursor++; O.joyCd = 14; }
            else if (y > 0.45 && O.cursor > 0)           { O.cursor--; O.joyCd = 14; }
        }

        const sel = bBtn(1);
        const press = sel && !O.selWas;
        O.selWas = sel;

        if (press && O.cursor < its.length) {
            const it = its[O.cursor];
            if (it.t === "tab")       { O.tab = it.to; O.cursor = 0; }
            else if (it.t === "back") { O.tab = "main"; O.cursor = 0; }
            else if (it.t === "tog")  {
                O[it.k] = !O[it.k];
                log(it.k + " = " + O[it.k]);
                onToggle(it.k, O[it.k]);
            }
            else if (it.t === "act")  {
                try { it.fn(); } catch(e) { flashAction("err: " + e.message); }
            }
        }
    }

    // ================================================================
    //  MOD TOGGLE HANDLERS
    // ================================================================
    function onToggle(k, on) {
        if (k === "flyOn")      toggleFly(on);
        if (k === "platformsOn" && !on) { killPlat(0); killPlat(1); }
        if (k === "orbitAllOn" && !on) log("Orbit All OFF");
    }

    // ---- FLY ----
    function toggleFly(on) {
        const gl = gorillaInst(); if (!gl) return;
        try {
            if (on) {
                O.savedGrav = gl.method("get_gravityScale").invoke();
                gl.method("set_gravityScale").invoke(0.0);
                log("fly ON");
            } else {
                gl.method("set_gravityScale").invoke(O.savedGrav != null ? O.savedGrav : 1.0);
                O.savedGrav = null;
                log("fly OFF");
            }
        } catch(e) { log("fly err: "+e); }
    }

    function tickFly() {
        if (!O.flyOn) return;
        const gl = gorillaInst(); if (!gl) return;
        try { gl.method("set_gravityScale").invoke(0.0); } catch(_){}
        try {
            const rb = gl.method("get_playerRigidbody").invoke();
            if (!rb || rb.handle.isNull()) return;
            const y = joyY(1);
            const head = headTf();
            const fwd = readFwd(head);
            if (!fwd) return;
            const sp = 7;
            if (Math.abs(y) > 0.25) {
                rb.method("set_velocity").invoke([fwd.x*y*sp, fwd.y*y*sp, fwd.z*y*sp]);
            } else {
                rb.method("set_velocity").invoke([0,0,0]);
            }
        } catch(_){}
    }

    // ---- PLATFORMS ----
    function ensurePlat(s) {
        const k = s===0?"platL":"platR";
        if (O[k] && !O[k].handle.isNull()) { movePlat(s); return; }
        try {
            const p = GameObjectClass.method("CreatePrimitive").invoke(3);
            p.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
            p.method("get_transform").invoke().method("set_localScale").invoke([0.35, 0.025, 0.35]);
            ObjectClass.method("DontDestroyOnLoad").invoke(p);
            O[k] = p;
            movePlat(s);
        } catch(e) { log("plat err: "+e); }
    }

    function movePlat(s) {
        const k = s===0?"platL":"platR";
        const p = O[k]; if (!p) return;
        const pos = readPos(handTf(s)); if (!pos) return;
        try { p.method("get_transform").invoke().method("set_position").invoke([pos.x, pos.y-0.15, pos.z]); } catch(_){}
    }

    function killPlat(s) {
        const k = s===0?"platL":"platR";
        if (!O[k]) return;
        try { ObjectClass.method("Destroy").invoke(O[k]); } catch(_){}
        O[k] = null;
    }

    function tickPlat() {
        if (!O.platformsOn) return;
        if (grip(0)) ensurePlat(0); else killPlat(0);
        if (grip(1)) ensurePlat(1); else killPlat(1);
    }

    // ---- ORBIT ALL — improved with ACCompanion params ----
    function tickOrbitAll() {
        if (!O.orbitAllOn) return;
        // ACCompanion: speed 2.0, interval ~0.05s → angle += speed * dt
        // We run at ~60fps (dt ≈ 0.0167), so angle += 2.0 * 0.0167 ≈ 0.033
        O.orbitAngle += 0.033;
        if (O.orbitAngle > 6.2831853) O.orbitAngle -= 6.2831853;
        try {
            const myPos = readPos(headTf());
            if (!myPos) return;

            const radius = 3.8;  // ACCompanion uses 3.8

            let others = [];
            forEachOtherPlayer(np => { others.push(np); });
            if (others.length === 0) return;

            const step = (2 * Math.PI) / others.length;
            for (let idx = 0; idx < others.length; idx++) {
                const np = others[idx];
                const angle = O.orbitAngle + step * idx;
                const ox = myPos.x + Math.cos(angle) * radius;
                const oz = myPos.z + Math.sin(angle) * radius;
                const oy = myPos.y + 0.5;  // ACCompanion: Y + 0.5

                // Move via transform (direct position set like ACCompanion)
                try {
                    const root = np.field("avatarRoot").value;
                    if (root && !root.handle.isNull()) {
                        root.method("set_position").invoke([ox, oy, oz]);
                    }
                } catch(_) {
                    // Fallback: get_transform
                    try {
                        const tf = np.method("get_transform").invoke();
                        if (tf && !tf.handle.isNull()) {
                            tf.method("set_position").invoke([ox, oy, oz]);
                        }
                    } catch(_2) {}
                }
            }
        } catch(e) {
            if (O.tick % 300 === 0) log("orbitAll err: " + e);
        }
    }

    // ================================================================
    //  MENU BUILD — proven V3.0 pattern
    // ================================================================
    function initMenu() {
        if (O.menuInited || O.buildFailed) return;
        try {
            // Font
            let font = null;
            try {
                const fonts = ResourcesClass.method("FindObjectsOfTypeAll", 1).invoke(FontClass.type);
                for (let i = 0; i < fonts.length; i++) {
                    try {
                        const nm = FontClass.method("get_name").on(fonts.get(i)).invoke().toString();
                        if (nm === "Utopium") { font = fonts.get(i); break; }
                    } catch(_){}
                }
            } catch(_){}
            if (!font) {
                try { font = ResourcesClass.method("GetBuiltinResource",1).inflate(FontClass).invoke(Il2Cpp.string("Arial.ttf")); } catch(_){}
            }

            const head = headTf();
            if (!head) {
                if (O.tick - O.headWaitTick >= 300) {
                    O.headWaitTick = O.tick;
                    const pi = playerInst();
                    log("waiting for head... player=" + (pi?"found":"null"));
                }
                return;
            }

            log("building menu...");

            // Invisible quad holder parented to head
            const menuGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try { menuGO.method("GetComponent",1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch(_){}
            menuGO.method("get_transform").invoke().method("SetParent",2).invoke(head, false);
            menuGO.method("get_transform").invoke().method("set_localPosition").invoke([-0.15, 0, 0.45]);
            menuGO.method("get_transform").invoke().method("set_localRotation").invoke([0,0,0,1]);
            menuGO.method("get_transform").invoke().method("set_localScale").invoke([1e-3,1e-3,1e-3]);

            // Canvas — WorldSpace
            const canvas = menuGO.method("AddComponent",1).inflate(CanvasClass).invoke();
            canvas.method("set_renderMode").invoke(2);

            // Text holder — invisible quad child
            const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try { textGO.method("GetComponent",1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch(_){}
            textGO.method("get_transform").invoke().method("SetParent",2).invoke(menuGO.method("get_transform").invoke(), false);

            // UI.Text component
            const menuText = textGO.method("AddComponent",1).inflate(TextClass).invoke();
            if (font) menuText.method("set_font").invoke(font);
            menuText.method("set_supportRichText").invoke(true);
            menuText.method("set_fontSize").invoke(14);
            menuText.method("set_alignment").invoke(0);
            menuText.method("set_resizeTextForBestFit").invoke(false);
            menuText.method("set_fontStyle").invoke(1);

            // RectTransform
            try {
                const rt = textGO.method("GetComponent",1).inflate(RectTransformClass).invoke();
                if (rt && !rt.handle.isNull()) {
                    rt.method("set_anchorMin").invoke([0,1]);
                    rt.method("set_anchorMax").invoke([0,1]);
                    rt.method("set_pivot").invoke([0,1]);
                    rt.method("set_anchoredPosition").invoke([0,0]);
                    rt.method("set_sizeDelta").invoke([400,600]);
                }
            } catch(_){}

            ObjectClass.method("DontDestroyOnLoad").invoke(menuGO);

            O.menuGO = menuGO;
            O.menuText = menuText;
            O.menuInited = true;
            log("MENU BUILT");
            setText(render());
        } catch(e) {
            O.buildFailed = true;
            log("BUILD FAILED: " + (e.stack||e.message||e));
        }
    }

    function setText(s) {
        if (!O.menuText || s === O.lastText) return;
        O.lastText = s;
        try {
            O.menuText.method("set_text").invoke(Il2Cpp.string(s));
        } catch(e) {
            log("setText err: " + e);
            O.menuGO = null; O.menuText = null; O.menuInited = false;
        }
    }

    // ================================================================
    //  TICK
    // ================================================================
    function onTick() {
        O.tick++;
        if (!O.menuInited && !O.buildFailed) initMenu();
        if (O.menuInited) {
            processInput();
            tickFly();
            tickPlat();
            tickOrbitAll();
            setText(render());
        }
        if (O.tick - O.lastLog >= 300) {
            O.lastLog = O.tick;
            log("t=" + O.tick + " menu=" + O.menuInited +
                " fly=" + O.flyOn + " plat=" + O.platformsOn +
                " orb=" + O.orbitAllOn);
        }
    }

    // ================================================================
    //  HOOK
    // ================================================================
    if (!O.hookInstalled) {
        const tgt = GorillaLocomotionClass.tryMethod("OnUpdate")
                 || GorillaLocomotionClass.tryMethod("FixedUpdate");
        if (!tgt) { log("ERROR: no update method"); }
        else {
            Interceptor.attach(tgt.virtualAddress, {
                onEnter() { try { onTick(); } catch(_){} }
            });
            O.hookInstalled = true;
            log("hook installed on GorillaLocomotion." + tgt.name);
        }
    }

    log("===== Orbit Menu V6.0 READY =====");
});
