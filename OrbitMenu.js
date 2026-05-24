// ====================================================================
//  Orbit Menu V4.0 — Animal Company
//  XR Controller Input + Tabs + Mods
//  Built on the working V3.0 pattern (Juelz-style IL2CPP bridge usage).
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V4.0 LOADING =====");

    const acImage    = Il2Cpp.domain.assembly("AnimalCompany").image;
    const coreImage  = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const uiModImage = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
    const uiImage    = Il2Cpp.domain.assembly("UnityEngine.UI").image;
    const textImage  = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

    let physImage = null;
    try { physImage = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image; } catch (_) {}

    const GameObjectClass    = coreImage.class("UnityEngine.GameObject");
    const ObjectClass        = coreImage.class("UnityEngine.Object");
    const RendererClass      = coreImage.class("UnityEngine.Renderer");
    const ResourcesClass     = coreImage.class("UnityEngine.Resources");
    const CanvasClass        = uiModImage.class("UnityEngine.Canvas");
    const TextClass          = uiImage.class("UnityEngine.UI.Text");
    const FontClass          = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");
    const TransformClass     = coreImage.class("UnityEngine.Transform");

    let RigidbodyClass = null;
    if (physImage) try { RigidbodyClass = physImage.class("UnityEngine.Rigidbody"); } catch (_) {}

    const PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController");
    const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");
    const XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager");

    // ---- state ----
    globalThis.orbit = globalThis.orbit || {
        tickCount: 0,
        hookInstalled: false,
        menuInited: false,
        menuGO: null,
        menuText: null,
        buildFailed: false,
        buildFailReason: null,

        cursor: 0,
        currentTab: "main",

        joyDeadzone: 0.45,
        joyCooldown: 0,
        joyCooldownMax: 14,
        selectPressed: false,
        selectWas: false,

        platformsOn: false,
        flyOn: false,
        itemGunOn: false,

        leftPlat: null,
        rightPlat: null,
        savedGravityScale: null,

        lastLog: 0,
        lastMenuText: "",
        inputReady: false,
        inputError: null,
    };

    function log(msg) { console.log("[Orbit] " + msg); }

    // ---- singleton helpers ----
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

    function headTransform() {
        const inst = playerInst();
        if (!inst) return null;
        try { return inst.field("headFollower").value; } catch (_) { return null; }
    }

    function handTransform(side) {
        const inst = playerInst();
        if (!inst) return null;
        try {
            const f = (side === 0) ? "_handTransformLeft" : "_handTransformRight";
            const v = inst.field(f).value;
            if (v && !v.handle.isNull()) return v;
        } catch (_) {}
        return null;
    }

    function getTransformPosition(tf) {
        if (!tf || tf.handle.isNull()) return null;
        try {
            const pos = tf.method("get_position").invoke();
            try {
                const u = pos.unbox();
                return { x: u.field("x").value, y: u.field("y").value, z: u.field("z").value };
            } catch (_) {
                return { x: pos.field("x").value, y: pos.field("y").value, z: pos.field("z").value };
            }
        } catch (_) {}
        return null;
    }

    function getTransformForward(tf) {
        if (!tf || tf.handle.isNull()) return null;
        try {
            const fwd = tf.method("get_forward").invoke();
            try {
                const u = fwd.unbox();
                return { x: u.field("x").value, y: u.field("y").value, z: u.field("z").value };
            } catch (_) {
                return { x: fwd.field("x").value, y: fwd.field("y").value, z: fwd.field("z").value };
            }
        } catch (_) {}
        return null;
    }

    // ---- XR input ----
    function readJoystick(hand) {
        try {
            const r = XRInputManagerClass.method("GetJoystickValue").invoke(hand);
            if (!r) return null;
            try {
                const u = r.unbox();
                return { x: u.field("x").value, y: u.field("y").value };
            } catch (_) {
                return { x: r.field("x").value, y: r.field("y").value };
            }
        } catch (e) {
            if (!orbit.inputReady && orbit.tickCount < 10) {
                orbit.inputError = "joy: " + e;
            }
            return null;
        }
    }

    function readTrigger(hand) {
        try { return !!XRInputManagerClass.method("GetTriggerButtonValue").invoke(hand); }
        catch (_) { return false; }
    }

    function readGrip(hand) {
        try { return !!XRInputManagerClass.method("AnyGrabInputPressed", 1).invoke(hand); }
        catch (_) { return false; }
    }

    function readSelect(hand) {
        // Try B button (GetButtonDown with secondaryButton enum = 1)
        try {
            const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 1);
            orbit.inputReady = true;
            return !!v;
        } catch (_) {}
        // Fallback: try trigger
        try {
            const v = readTrigger(hand);
            orbit.inputReady = true;
            return v;
        } catch (_) {}
        return false;
    }

    // ---- menu structure ----
    function getMenuItems() {
        switch (orbit.currentTab) {
            case "main":
                return [
                    { label: "Movement", type: "tab", target: "movement" },
                    { label: "Items", type: "tab", target: "items" },
                ];
            case "movement":
                return [
                    { label: "< Back", type: "back" },
                    { label: "Platforms", type: "toggle", key: "platformsOn" },
                    { label: "Fly", type: "toggle", key: "flyOn" },
                ];
            case "items":
                return [
                    { label: "< Back", type: "back" },
                    { label: "Random Item Gun", type: "toggle", key: "itemGunOn" },
                ];
            default:
                return [];
        }
    }

    function renderMenuText() {
        const items = getMenuItems();
        const tabLabel = orbit.currentTab === "main"
            ? "" : " > " + orbit.currentTab.charAt(0).toUpperCase() + orbit.currentTab.slice(1);
        const lines = [
            "<color=#bb88ff>Orbit Menu V4" + tabLabel + "</color>",
            "",
        ];

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const arrow = (i === orbit.cursor) ? "<color=#ffcc00>▶</color> " : "   ";
            let text = it.label;
            if (it.type === "toggle") {
                text += orbit[it.key]
                    ? " <color=#00ff00>[ON]</color>"
                    : " <color=#ff4444>[OFF]</color>";
            } else if (it.type === "tab") {
                text += " ▸";
            }
            lines.push(arrow + text);
        }

        lines.push("");
        lines.push("<color=#888888>Joy=nav  B=select</color>");
        return lines.join("\n");
    }

    // ---- input processing ----
    function processInput() {
        // Read joystick from both hands, use whichever has more deflection
        const jR = readJoystick(1);
        const jL = readJoystick(0);
        let joyY = 0;
        if (jR) joyY = jR.y;
        if (jL && Math.abs(jL.y) > Math.abs(joyY)) joyY = jL.y;

        const items = getMenuItems();

        // Cursor movement with cooldown
        if (orbit.joyCooldown > 0) {
            orbit.joyCooldown--;
        } else {
            if (joyY < -orbit.joyDeadzone && orbit.cursor < items.length - 1) {
                orbit.cursor++;
                orbit.joyCooldown = orbit.joyCooldownMax;
            } else if (joyY > orbit.joyDeadzone && orbit.cursor > 0) {
                orbit.cursor--;
                orbit.joyCooldown = orbit.joyCooldownMax;
            }
        }

        // B button edge detection (right hand)
        const selNow = readSelect(1);
        const justPressed = selNow && !orbit.selectWas;
        orbit.selectWas = selNow;

        if (justPressed && orbit.cursor < items.length) {
            const item = items[orbit.cursor];
            if (item.type === "tab") {
                orbit.currentTab = item.target;
                orbit.cursor = 0;
                log("tab -> " + item.target);
            } else if (item.type === "back") {
                orbit.currentTab = "main";
                orbit.cursor = 0;
                log("tab -> main");
            } else if (item.type === "toggle") {
                orbit[item.key] = !orbit[item.key];
                log(item.key + " = " + orbit[item.key]);
                onToggle(item.key, orbit[item.key]);
            }
        }
    }

    // ---- mod toggle handler ----
    function onToggle(key, on) {
        if (key === "flyOn") toggleFly(on);
        if (key === "platformsOn" && !on) {
            destroyPlat("left");
            destroyPlat("right");
        }
    }

    // ---- FLY ----
    function toggleFly(on) {
        const gl = gorillaInst();
        if (!gl) { log("fly: no GorillaLocomotion"); return; }
        try {
            if (on) {
                orbit.savedGravityScale = gl.method("get_gravityScale").invoke();
                gl.method("set_gravityScale").invoke(0.0);
                log("fly ON — gravity off");
            } else {
                const restore = orbit.savedGravityScale != null ? orbit.savedGravityScale : 1.0;
                gl.method("set_gravityScale").invoke(restore);
                orbit.savedGravityScale = null;
                log("fly OFF — gravity restored");
            }
        } catch (e) { log("toggleFly err: " + e); }
    }

    function tickFly() {
        if (!orbit.flyOn) return;
        const gl = gorillaInst();
        if (!gl) return;
        try {
            // Keep gravity zeroed every frame in case the game resets it
            try { gl.method("set_gravityScale").invoke(0.0); } catch (_) {}

            const rb = gl.method("get_playerRigidbody").invoke();
            if (!rb || rb.handle.isNull()) return;

            const jR = readJoystick(1);
            if (!jR) return;

            const head = headTransform();
            if (!head) return;
            const fwd = getTransformForward(head);
            if (!fwd) { return; }

            const speed = 7.0;
            const y = jR.y;

            if (Math.abs(y) > 0.25) {
                rb.method("set_velocity").invoke([
                    fwd.x * y * speed,
                    fwd.y * y * speed,
                    fwd.z * y * speed,
                ]);
            } else {
                rb.method("set_velocity").invoke([0, 0, 0]);
            }
        } catch (_) {}
    }

    // ---- PLATFORMS ----
    function ensurePlat(side) {
        const key = (side === 0) ? "leftPlat" : "rightPlat";
        if (orbit[key] && !orbit[key].handle.isNull()) {
            movePlat(side);
            return;
        }
        try {
            const p = GameObjectClass.method("CreatePrimitive").invoke(3);
            p.method("set_name").invoke(Il2Cpp.string("[Orbit Plat]"));
            p.method("get_transform").invoke().method("set_localScale").invoke([0.35, 0.025, 0.35]);
            ObjectClass.method("DontDestroyOnLoad").invoke(p);
            orbit[key] = p;
            movePlat(side);
            log("platform spawned (" + (side === 0 ? "L" : "R") + ")");
        } catch (e) { log("ensurePlat err: " + e); }
    }

    function movePlat(side) {
        const key = (side === 0) ? "leftPlat" : "rightPlat";
        const p = orbit[key];
        if (!p || p.handle.isNull()) return;
        const pos = getTransformPosition(handTransform(side));
        if (!pos) return;
        try {
            p.method("get_transform").invoke().method("set_position").invoke([pos.x, pos.y - 0.15, pos.z]);
        } catch (_) {}
    }

    function destroyPlat(side) {
        const key = (side === "left" || side === 0) ? "leftPlat" : "rightPlat";
        if (!orbit[key] || orbit[key].handle.isNull()) { orbit[key] = null; return; }
        try { ObjectClass.method("Destroy").invoke(orbit[key]); } catch (_) {}
        orbit[key] = null;
    }

    function tickPlatforms() {
        if (!orbit.platformsOn) return;
        const gripL = readGrip(0);
        const gripR = readGrip(1);
        if (gripL) ensurePlat(0); else destroyPlat(0);
        if (gripR) ensurePlat(1); else destroyPlat(1);
    }

    // ---- RANDOM ITEM GUN (placeholder — spawns cubes for now) ----
    function tickItemGun() {
        if (!orbit.itemGunOn) return;
        // TODO: hook into AppPrefabPool to spawn real items
        // For now shows a beam line from the left hand (visual only)
    }

    // ---- menu build (same proven V3.0 pattern) ----
    function initMenu() {
        if (orbit.menuInited || orbit.buildFailed) return;
        try {
            let font = null;
            try {
                const fonts = ResourcesClass.method("FindObjectsOfTypeAll", 1).invoke(FontClass.type);
                for (let i = 0; i < fonts.length; i++) {
                    try {
                        const fname = FontClass.method("get_name").on(fonts.get(i)).invoke().toString();
                        if (fname === "Utopium") { font = fonts.get(i); break; }
                    } catch (_) {}
                }
            } catch (_) {}
            if (!font) {
                try {
                    font = ResourcesClass.method("GetBuiltinResource", 1)
                        .inflate(FontClass).invoke(Il2Cpp.string("Arial.ttf"));
                } catch (_) {}
            }

            const head = headTransform();
            if (!head) { log("initMenu: no head yet"); return; }

            log("building menu...");

            const menuGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try { menuGO.method("GetComponent", 1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch (_) {}
            menuGO.method("get_transform").invoke().method("SetParent", 2).invoke(head, false);
            menuGO.method("get_transform").invoke().method("set_localPosition").invoke([-0.15, 0, 0.45]);
            menuGO.method("get_transform").invoke().method("set_localRotation").invoke([0, 0, 0, 1]);
            menuGO.method("get_transform").invoke().method("set_localScale").invoke([1e-3, 1e-3, 1e-3]);

            const canvas = menuGO.method("AddComponent", 1).inflate(CanvasClass).invoke();
            canvas.method("set_renderMode").invoke(2);

            const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try { textGO.method("GetComponent", 1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch (_) {}
            textGO.method("get_transform").invoke().method("SetParent", 2).invoke(menuGO.method("get_transform").invoke(), false);

            const menuText = textGO.method("AddComponent", 1).inflate(TextClass).invoke();
            if (font) menuText.method("set_font").invoke(font);
            menuText.method("set_supportRichText").invoke(true);
            menuText.method("set_fontSize").invoke(14);
            menuText.method("set_alignment").invoke(0);
            menuText.method("set_resizeTextForBestFit").invoke(false);
            menuText.method("set_fontStyle").invoke(1);

            try {
                const rt = textGO.method("GetComponent", 1).inflate(RectTransformClass).invoke();
                if (rt && !rt.handle.isNull()) {
                    rt.method("set_anchorMin").invoke([0, 1]);
                    rt.method("set_anchorMax").invoke([0, 1]);
                    rt.method("set_pivot").invoke([0, 1]);
                    rt.method("set_anchoredPosition").invoke([0, 0]);
                    rt.method("set_sizeDelta").invoke([400, 600]);
                }
            } catch (_) {}

            ObjectClass.method("DontDestroyOnLoad").invoke(menuGO);

            orbit.menuGO = menuGO;
            orbit.menuText = menuText;
            orbit.menuInited = true;
            log("MENU BUILT! menuGO=" + menuGO.handle.toString());

            setMenuText(renderMenuText());
        } catch (e) {
            orbit.buildFailed = true;
            orbit.buildFailReason = String(e && (e.stack || e.message || e));
            log("BUILD FAILED: " + orbit.buildFailReason);
        }
    }

    function setMenuText(s) {
        if (!orbit.menuText) return;
        if (s === orbit.lastMenuText) return;
        orbit.lastMenuText = s;
        try {
            orbit.menuText.method("set_text").invoke(Il2Cpp.string(s));
        } catch (e) {
            log("setMenuText died: " + e);
            orbit.menuGO = null;
            orbit.menuText = null;
            orbit.menuInited = false;
        }
    }

    // ---- tick ----
    function onTick() {
        orbit.tickCount++;

        if (!orbit.menuInited && !orbit.buildFailed) {
            initMenu();
        }

        if (orbit.menuInited) {
            processInput();
            tickFly();
            tickPlatforms();
            tickItemGun();
            setMenuText(renderMenuText());
        }

        if (orbit.tickCount - orbit.lastLog >= 300) {
            orbit.lastLog = orbit.tickCount;
            log("tick=" + orbit.tickCount +
                " inited=" + orbit.menuInited +
                " tab=" + orbit.currentTab +
                " fly=" + orbit.flyOn +
                " plat=" + orbit.platformsOn +
                " gun=" + orbit.itemGunOn +
                (orbit.inputError ? " inputErr=" + orbit.inputError : ""));
        }
    }

    // ---- hook ----
    function installHook() {
        if (orbit.hookInstalled) return;
        let target = GorillaLocomotionClass.tryMethod("OnUpdate")
                  || GorillaLocomotionClass.tryMethod("FixedUpdate");
        if (!target) { log("ERROR: no OnUpdate/FixedUpdate"); return; }
        Interceptor.attach(target.virtualAddress, {
            onEnter: function () { try { onTick(); } catch (_) {} }
        });
        orbit.hookInstalled = true;
        log("hook installed on GorillaLocomotion." + target.name);
    }
    installHook();

    log("===== Orbit Menu V4.0 READY =====");
});
