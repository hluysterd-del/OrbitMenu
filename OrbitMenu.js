// ====================================================================
//  Orbit Menu V5.0 — Animal Company
//  Controller input, tabs, fly, platforms, orbit-all.
//  Proven IL2CPP bridge patterns from the working V3.0 build.
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V5.0 LOADING =====");

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
    // Force-reset state on reload so stale handles don't stick
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

    // Use the property getter — the field name in the dump is _headTransform
    // but V3 used "headFollower" which does not exist. get_head() is the safe
    // accessor that returns the actual camera/head Transform.
    function headTf() {
        const p = playerInst();
        if (!p) return null;
        // Try property first (safest)
        try {
            const h = p.method("get_head").invoke();
            if (h && !h.handle.isNull()) return h;
        } catch (_) {}
        // Fallback: try field names the bridge might accept
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
        // Try secondary-button via GetButtonDown(hand, 1)
        try { const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 1); return !!v; } catch(_){}
        // fallback: right trigger
        return trigger(hand);
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
            {l:"< Back",    t:"back"},
            {l:"Orbit All", t:"tog", k:"orbitAllOn"},
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
            }
            L.push(cur + txt);
        }
        L.push("");
        L.push("<color=#888888>Stick↑↓ nav   B=select</color>");
        return L.join("\n");
    }

    // ================================================================
    //  INPUT + NAVIGATION
    // ================================================================
    function processInput() {
        // Both joysticks — pick the one with more deflection
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
            if (it.t === "tab")  { O.tab = it.to; O.cursor = 0; }
            else if (it.t === "back") { O.tab = "main"; O.cursor = 0; }
            else if (it.t === "tog") {
                O[it.k] = !O[it.k];
                log(it.k + " = " + O[it.k]);
                onToggle(it.k, O[it.k]);
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

    // ---- ORBIT ALL ----
    function tickOrbitAll() {
        if (!O.orbitAllOn) return;
        O.orbitAngle += 0.03;
        try {
            const myPos = readPos(headTf());
            if (!myPos) return;
            const allPlayers = NetPlayerClass.method("get_spawnedPlayers").invoke();
            if (!allPlayers || allPlayers.handle.isNull()) return;
            const localP = NetPlayerClass.method("get_localPlayer").invoke();
            const localHandle = localP ? localP.handle.toString() : "";

            let count = 0;
            try { count = allPlayers.method("get_Count").invoke(); } catch(_) { return; }
            if (count <= 1) return;

            let idx = 0;
            const radius = 2.5;
            for (let i = 0; i < count; i++) {
                let np;
                try { np = allPlayers.method("get_Item").invoke(i); } catch(_) { continue; }
                if (!np || np.handle.isNull()) continue;
                if (np.handle.toString() === localHandle) continue;

                const angle = O.orbitAngle + idx * ((2 * Math.PI) / (count - 1));
                const ox = myPos.x + Math.cos(angle) * radius;
                const oz = myPos.z + Math.sin(angle) * radius;
                const oy = myPos.y;

                // Move avatar root transform
                try {
                    const root = np.field("avatarRoot").value;
                    if (root && !root.handle.isNull()) {
                        root.method("set_position").invoke([ox, oy, oz]);
                    }
                } catch(_){}
                // Also move head for visual
                try {
                    const hd = np.field("head").value;
                    if (hd && !hd.handle.isNull()) {
                        hd.method("set_position").invoke([ox, oy + 0.2, oz]);
                    }
                } catch(_){}
                idx++;
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
                // Throttled log
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

    log("===== Orbit Menu V5.0 READY =====");
});
