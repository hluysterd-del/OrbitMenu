// ====================================================================
//  Orbit Menu V6.1 — Animal Company
//  Fixed: B-button selection, softer joystick, orbit-all debug,
//         item gun, OP actions visible/working.
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.1 LOADING =====");

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

    // PrefabGenerator for item spawning
    let PrefabGeneratorClass = null;
    try { PrefabGeneratorClass = acImage.class("AnimalCompany.PrefabGenerator"); } catch(_) {}

    // ---- state ----
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
        itemGunOn: false,

        // platform handles
        platL: null,
        platR: null,

        // fly
        savedGrav: null,

        // orbit-all
        orbitAngle: 0,

        // item gun
        gunCd: 0,

        // action flash
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
    //  PLAYER ITERATION
    // ================================================================
    function forEachOtherPlayer(fn) {
        try {
            const allPlayers = NetPlayerClass.method("get_spawnedPlayers").invoke();
            if (!allPlayers || allPlayers.handle.isNull()) {
                if (O.tick % 300 === 0) log("get_spawnedPlayers returned null");
                return 0;
            }
            const localP = NetPlayerClass.method("get_localPlayer").invoke();

            let count = 0;
            try { count = allPlayers.method("get_Count").invoke(); } catch(_) { return 0; }

            let affected = 0;
            for (let i = 0; i < count; i++) {
                let np;
                try { np = allPlayers.method("get_Item").invoke(i); } catch(_) { continue; }
                if (!np || np.handle.isNull()) continue;

                // Skip local player
                try {
                    const mine = np.method("get_IsMine").invoke();
                    // Unbox if needed
                    let isMine = false;
                    if (mine === true) isMine = true;
                    else if (mine && mine !== false) {
                        try { isMine = !!mine.unbox(); } catch(_) { isMine = !!mine; }
                    }
                    if (isMine) continue;
                } catch(_) {
                    // Fallback: handle comparison
                    if (localP && np.handle.toString() === localP.handle.toString()) continue;
                }

                try { fn(np); affected++; } catch(e) {
                    if (O.tick % 300 === 0) log("forEachOther item err: " + e);
                }
            }
            return affected;
        } catch(e) {
            if (O.tick % 300 === 0) log("forEachOtherPlayer err: " + e);
            return 0;
        }
    }

    // ================================================================
    //  XR INPUT — fixed with unboxing
    // ================================================================
    function readBool(v) {
        if (v === true) return true;
        if (v === false || v === null || v === undefined) return false;
        try { return !!v.unbox(); } catch(_) {}
        return !!v;
    }

    function joyY(hand) {
        try {
            const r = XRInputManagerClass.method("GetJoystickValue").invoke(hand);
            if (!r) return 0;
            try { return r.unbox().field("y").value; } catch(_){}
            return r.field("y").value;
        } catch (_) { return 0; }
    }

    function trigger(hand) {
        try { return readBool(XRInputManagerClass.method("GetTriggerButtonValue").invoke(hand)); }
        catch (_) { return false; }
    }

    function grip(hand) {
        try { return readBool(XRInputManagerClass.method("AnyGrabInputPressed", 1).invoke(hand)); }
        catch (_) { return false; }
    }

    // B button — try GetButtonDown with proper unboxing
    function bBtn(hand) {
        // Try GetButtonDown(handSide, button)
        // Button enum: 0=primary(A/X), 1=secondary(B/Y)
        try {
            const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 1);
            if (readBool(v)) return true;
        } catch(_){}
        // Also try button index 0 (some games swap A/B)
        try {
            const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 0);
            if (readBool(v)) return true;
        } catch(_){}
        return false;
    }

    // ================================================================
    //  OP ACTIONS
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
        forEachOtherPlayer(np => {
            // Try RPC first (network synced)
            try { np.method("RPC_Teleport", 1).invoke([myPos.x, myPos.y, myPos.z]); n++; return; } catch(_) {}
            // Fallback: direct transform
            try {
                const tf = np.method("get_transform").invoke();
                if (tf && !tf.handle.isNull()) { tf.method("set_position").invoke([myPos.x, myPos.y, myPos.z]); n++; }
            } catch(_) {}
        });
        flashAction("TP'd " + n + " to you!");
    }

    // Yeet All — RPC_AddForce(Vector3) upward
    function actYeetAll() {
        let n = 0;
        forEachOtherPlayer(np => {
            try { np.method("RPC_AddForce", 1).invoke([0, 50.0, 0]); n++; } catch(_) {}
        });
        flashAction("Yeeted " + n + "!");
    }

    // Stink All — RPC_TagAsStinky()
    function actStinkAll() {
        let n = 0;
        forEachOtherPlayer(np => {
            try { np.method("RPC_TagAsStinky", 0).invoke(); n++; } catch(_) {}
        });
        flashAction("Stinked " + n + "!");
    }

    // Color All — RPC_SetColorHSV(float h, float s, float v, float a) — 4 params per dump
    function actColorAll() {
        let n = 0;
        forEachOtherPlayer(np => {
            const h = Math.random() * 360;
            try { np.method("RPC_SetColorHSV", 4).invoke(h, 1.0, 1.0, 1.0); n++; } catch(_) {
                try { np.method("RPC_SetColorHSV", 3).invoke(h, 1.0, 1.0); n++; } catch(_2) {
                    try { np.method("RPC_SetColorHSV").invoke(h, 1.0, 1.0, 1.0); n++; } catch(_3) {}
                }
            }
        });
        flashAction("Colored " + n + "!");
    }

    // Fling All Up — massive upward force
    function actFlingAll() {
        let n = 0;
        forEachOtherPlayer(np => {
            try { np.method("RPC_AddForce", 1).invoke([0, 80.0, 0]); n++; } catch(_) {
                try { np.method("RPC_Teleport", 1).invoke([0, 100.0, 0]); n++; } catch(_2) {}
            }
        });
        flashAction("Flung " + n + "!");
    }

    // Void All — RPC_Teleport to Y=-500
    function actVoidAll() {
        let n = 0;
        forEachOtherPlayer(np => {
            try { np.method("RPC_Teleport", 1).invoke([0, -500.0, 0]); n++; } catch(_) {
                try {
                    const tf = np.method("get_transform").invoke();
                    if (tf && !tf.handle.isNull()) { tf.method("set_position").invoke([0, -500.0, 0]); n++; }
                } catch(_2) {}
            }
        });
        flashAction("Voided " + n + "!");
    }

    // Money All — RPC_AddPlayerMoney(int)
    function actMoneyAll() {
        let n = 0;
        forEachOtherPlayer(np => {
            try { np.method("RPC_AddPlayerMoney", 1).invoke(99999); n++; } catch(_) {}
        });
        flashAction("$99999 to " + n + "!");
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
        // Action feedback flash (3 seconds)
        if (O.actionMsg && (O.tick - O.actionTick) < 180) {
            L.push("<color=#00ffaa>" + O.actionMsg + "</color>");
        }
        L.push("<color=#888888>Stick↕ nav  B/Trigger=select</color>");
        return L.join("\n");
    }

    // ================================================================
    //  INPUT + NAVIGATION — softened
    // ================================================================
    function processInput() {
        const yR = joyY(1), yL = joyY(0);
        const y = Math.abs(yR) > Math.abs(yL) ? yR : yL;
        const its = items();

        // Softer joystick: higher threshold, longer cooldown
        if (O.joyCd > 0) { O.joyCd--; }
        else {
            if (y < -0.55 && O.cursor < its.length - 1) { O.cursor++; O.joyCd = 20; }
            else if (y > 0.55 && O.cursor > 0)           { O.cursor--; O.joyCd = 20; }
        }

        // Selection: B button OR right trigger — both work
        const bNow = bBtn(1);
        const trigNow = trigger(1);
        const selNow = bNow || trigNow;
        const press = selNow && !O.selWas;
        O.selWas = selNow;

        if (press && O.cursor < its.length) {
            const it = its[O.cursor];
            log("SELECT: " + it.l + " type=" + it.t);
            if (it.t === "tab")       { O.tab = it.to; O.cursor = 0; }
            else if (it.t === "back") { O.tab = "main"; O.cursor = 0; }
            else if (it.t === "tog")  {
                O[it.k] = !O[it.k];
                log(it.k + " = " + O[it.k]);
                onToggle(it.k, O[it.k]);
            }
            else if (it.t === "act")  {
                try { it.fn(); } catch(e) { flashAction("err: " + (e.message||e)); }
            }
        }
    }

    // ================================================================
    //  MOD TOGGLE HANDLERS
    // ================================================================
    function onToggle(k, on) {
        if (k === "flyOn")      toggleFly(on);
        if (k === "platformsOn" && !on) { killPlat(0); killPlat(1); }
        if (k === "orbitAllOn") {
            if (on) {
                // Debug: log player count when toggling on
                try {
                    const all = NetPlayerClass.method("get_spawnedPlayers").invoke();
                    let c = 0;
                    if (all && !all.handle.isNull()) {
                        try { c = all.method("get_Count").invoke(); } catch(_){}
                    }
                    log("Orbit All ON — " + c + " players in lobby");
                } catch(e) { log("Orbit debug err: " + e); }
            } else {
                log("Orbit All OFF");
            }
        }
        if (k === "itemGunOn") {
            log("Item Gun " + (on ? "ON" : "OFF"));
            if (on) O.gunCd = 0;
        }
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

    // ---- ORBIT ALL — fixed with multiple approaches ----
    function tickOrbitAll() {
        if (!O.orbitAllOn) return;
        O.orbitAngle += 0.033;
        if (O.orbitAngle > 6.2831853) O.orbitAngle -= 6.2831853;
        try {
            const myPos = readPos(headTf());
            if (!myPos) return;

            const radius = 3.8;
            let others = [];
            forEachOtherPlayer(np => { others.push(np); });

            if (others.length === 0) {
                if (O.tick % 300 === 0) log("orbitAll: 0 other players found");
                return;
            }

            const step = (2 * Math.PI) / others.length;
            for (let idx = 0; idx < others.length; idx++) {
                const np = others[idx];
                const angle = O.orbitAngle + step * idx;
                const ox = myPos.x + Math.cos(angle) * radius;
                const oz = myPos.z + Math.sin(angle) * radius;
                const oy = myPos.y + 0.5;

                let moved = false;

                // Method 1: RPC_Teleport (network synced — most reliable for MP)
                if (!moved) {
                    try {
                        np.method("RPC_Teleport", 1).invoke([ox, oy, oz]);
                        moved = true;
                    } catch(_) {}
                }

                // Method 2: avatarRoot.set_position (direct transform)
                if (!moved) {
                    try {
                        const root = np.field("avatarRoot").value;
                        if (root && !root.handle.isNull()) {
                            root.method("set_position").invoke([ox, oy, oz]);
                            moved = true;
                        }
                    } catch(_) {}
                }

                // Method 3: get_transform().set_position
                if (!moved) {
                    try {
                        const tf = np.method("get_transform").invoke();
                        if (tf && !tf.handle.isNull()) {
                            tf.method("set_position").invoke([ox, oy, oz]);
                            moved = true;
                        }
                    } catch(_) {}
                }
            }
        } catch(e) {
            if (O.tick % 300 === 0) log("orbitAll err: " + e);
        }
    }

    // ---- RANDOM ITEM GUN ----
    const ITEM_IDS = [
        "item_apple", "item_goldbar", "item_dynamite", "item_glowstick",
        "item_metal_ball", "item_landmine", "item_teleport_gun",
        "item_jetpack", "item_goldcoin", "item_stinky_cheese",
    ];

    function tickItemGun() {
        if (!O.itemGunOn) return;
        if (O.gunCd > 0) { O.gunCd--; return; }

        // Fire with right trigger
        if (!trigger(1)) return;
        O.gunCd = 30; // ~0.5s cooldown between shots

        const head = headTf();
        const pos = readPos(head);
        const fwd = readFwd(head);
        if (!pos || !fwd) return;

        // Spawn point: 2m in front of head
        const sx = pos.x + fwd.x * 2;
        const sy = pos.y + fwd.y * 2;
        const sz = pos.z + fwd.z * 2;
        const itemId = ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)];

        let spawned = false;

        // Try PrefabGenerator.SpawnItem(string, Vector3, Quaternion, null)
        if (PrefabGeneratorClass && !spawned) {
            try {
                PrefabGeneratorClass.method("SpawnItem", 4).invoke(
                    Il2Cpp.string(itemId), [sx, sy, sz], [0, 0, 0, 1], NULL
                );
                spawned = true;
            } catch(_) {}

            // Try 3-param version
            if (!spawned) {
                try {
                    PrefabGeneratorClass.method("SpawnItem", 3).invoke(
                        Il2Cpp.string(itemId), [sx, sy, sz], [0, 0, 0, 1]
                    );
                    spawned = true;
                } catch(_) {}
            }
        }

        if (spawned) {
            if (O.tick % 60 === 0) log("spawned " + itemId);
        } else {
            if (O.tick % 300 === 0) log("item gun: spawn failed (PrefabGenerator may need instance)");
        }
    }

    // ================================================================
    //  MENU BUILD
    // ================================================================
    function initMenu() {
        if (O.menuInited || O.buildFailed) return;
        try {
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
                    log("waiting for head... player=" + (playerInst()?"found":"null"));
                }
                return;
            }

            log("building menu...");

            const menuGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try { menuGO.method("GetComponent",1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch(_){}
            menuGO.method("get_transform").invoke().method("SetParent",2).invoke(head, false);
            menuGO.method("get_transform").invoke().method("set_localPosition").invoke([-0.15, 0, 0.45]);
            menuGO.method("get_transform").invoke().method("set_localRotation").invoke([0,0,0,1]);
            menuGO.method("get_transform").invoke().method("set_localScale").invoke([1e-3,1e-3,1e-3]);

            const canvas = menuGO.method("AddComponent",1).inflate(CanvasClass).invoke();
            canvas.method("set_renderMode").invoke(2);

            const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try { textGO.method("GetComponent",1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch(_){}
            textGO.method("get_transform").invoke().method("SetParent",2).invoke(menuGO.method("get_transform").invoke(), false);

            const menuText = textGO.method("AddComponent",1).inflate(TextClass).invoke();
            if (font) menuText.method("set_font").invoke(font);
            menuText.method("set_supportRichText").invoke(true);
            menuText.method("set_fontSize").invoke(14);
            menuText.method("set_alignment").invoke(0);
            menuText.method("set_resizeTextForBestFit").invoke(false);
            menuText.method("set_fontStyle").invoke(1);

            try {
                const rt = textGO.method("GetComponent",1).inflate(RectTransformClass).invoke();
                if (rt && !rt.handle.isNull()) {
                    rt.method("set_anchorMin").invoke([0,1]);
                    rt.method("set_anchorMax").invoke([0,1]);
                    rt.method("set_pivot").invoke([0,1]);
                    rt.method("set_anchoredPosition").invoke([0,0]);
                    rt.method("set_sizeDelta").invoke([400,800]);
                }
            } catch(_){}

            ObjectClass.method("DontDestroyOnLoad").invoke(menuGO);

            O.menuGO = menuGO;
            O.menuText = menuText;
            O.menuInited = true;
            log("MENU BUILT — PrefabGen=" + (PrefabGeneratorClass ? "found" : "null"));
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
            tickItemGun();
            setText(render());
        }
        if (O.tick - O.lastLog >= 300) {
            O.lastLog = O.tick;
            log("t=" + O.tick + " menu=" + O.menuInited +
                " tab=" + O.tab +
                " fly=" + O.flyOn + " plat=" + O.platformsOn +
                " orb=" + O.orbitAllOn + " gun=" + O.itemGunOn);
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

    log("===== Orbit Menu V6.1 READY =====");
});
