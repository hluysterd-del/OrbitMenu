// ====================================================================
//  Orbit Menu V3.0 — Animal Company
//  Built using the EXACT pattern from Juelz's deobfuscated XeraCompany.
//  Canvas + UI.Text on an invisible Quad holder parented to head.
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V3.0 LOADING =====");

    const acImage   = Il2Cpp.domain.assembly("AnimalCompany").image;
    const coreImage = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const uiModImage = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
    const uiImage   = Il2Cpp.domain.assembly("UnityEngine.UI").image;
    const textImage = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

    const GameObjectClass = coreImage.class("UnityEngine.GameObject");
    const ObjectClass     = coreImage.class("UnityEngine.Object");
    const RendererClass   = coreImage.class("UnityEngine.Renderer");
    const ResourcesClass  = coreImage.class("UnityEngine.Resources");
    const CanvasClass     = uiModImage.class("UnityEngine.Canvas");
    const TextClass       = uiImage.class("UnityEngine.UI.Text");
    const FontClass       = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");

    const PlayerControllerClass = acImage.class("AnimalCompany.PlayerController");
    const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");

    // ---- state ----
    globalThis.orbit = globalThis.orbit || {
        tickCount: 0,
        hookInstalled: false,
        menuInited: false,
        menuGO: null,
        menuText: null,
        cursor: 0,
        buttonCount: 5,
        lastLog: 0,
        lastMenuText: "",
        buildFailed: false,
        buildFailReason: null,
    };

    function log(msg) { console.log("[Orbit] " + msg); }

    // ---- helpers ----
    function playerInst() {
        try {
            const v = PlayerControllerClass.method("get_instance").invoke();
            if (v && !v.handle.isNull()) return v;
        } catch (_) {}
        return null;
    }
    function headTransform() {
        const inst = playerInst();
        if (!inst) return null;
        try { return inst.field("headFollower").value; } catch (_) { return null; }
    }

    // ---- build menu (Juelz pattern, exactly) ----
    function initMenu() {
        if (orbit.menuInited || orbit.buildFailed) return;

        try {
            // Find a font
            let font = null;
            try {
                const fonts = ResourcesClass.method("FindObjectsOfTypeAll", 1).invoke(FontClass.type);
                for (let i = 0; i < fonts.length; i++) {
                    const f = fonts.get(i);
                    try {
                        const fname = FontClass.method("get_name").on(f).invoke().toString();
                        if (fname === "Utopium") { font = f; break; }
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
            if (!head) { log("initMenu: no head transform yet, retrying"); return; }

            log("building menu...");

            // Holder quad — invisible
            const menuGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try { menuGO.method("GetComponent", 1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch (_) {}
            menuGO.method("get_transform").invoke().method("SetParent", 2).invoke(head, false);
            menuGO.method("get_transform").invoke().method("set_localPosition").invoke([-0.15, 0, 0.45]);
            menuGO.method("get_transform").invoke().method("set_localRotation").invoke([0, 0, 0, 1]);
            menuGO.method("get_transform").invoke().method("set_localScale").invoke([1e-3, 1e-3, 1e-3]);

            // Canvas component on menuGO
            const canvas = menuGO.method("AddComponent", 1).inflate(CanvasClass).invoke();
            canvas.method("set_renderMode").invoke(2); // WorldSpace

            // Text holder quad — invisible
            const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try { textGO.method("GetComponent", 1).inflate(RendererClass).invoke().method("set_enabled").invoke(false); } catch (_) {}
            textGO.method("get_transform").invoke().method("SetParent", 2).invoke(menuGO.method("get_transform").invoke(), false);

            // UI.Text on the text holder
            const menuText = textGO.method("AddComponent", 1).inflate(TextClass).invoke();
            if (font) menuText.method("set_font").invoke(font);
            menuText.method("set_supportRichText").invoke(true);
            menuText.method("set_fontSize").invoke(14);
            menuText.method("set_alignment").invoke(0);  // UpperLeft
            menuText.method("set_resizeTextForBestFit").invoke(false);
            menuText.method("set_fontStyle").invoke(1);  // Bold

            // RectTransform anchored top-left
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

    function renderMenuText() {
        const lines = ["<color=#bb88ff>Orbit Menu V1 — testing</color>", ""];
        for (let i = 0; i < orbit.buttonCount; i++) {
            const arrow = (i === orbit.cursor) ? "<color=#ffcc00>▶</color> " : "   ";
            lines.push(arrow + "[ Button " + (i + 1) + " ]");
        }
        return lines.join("\n");
    }

    function onTick() {
        orbit.tickCount++;
        if (!orbit.menuInited && !orbit.buildFailed) {
            initMenu();
        } else if (orbit.menuInited) {
            setMenuText(renderMenuText());
        }
        if (orbit.tickCount - orbit.lastLog >= 300) {
            orbit.lastLog = orbit.tickCount;
            log("tick " + orbit.tickCount + " inited=" + orbit.menuInited +
                " failed=" + orbit.buildFailed + " cursor=" + orbit.cursor);
        }
    }

    // ---- install tick hook ----
    function installHook() {
        if (orbit.hookInstalled) return;
        let target = GorillaLocomotionClass.tryMethod("OnUpdate") || GorillaLocomotionClass.tryMethod("FixedUpdate");
        if (!target) { log("ERROR: no OnUpdate/FixedUpdate"); return; }
        Interceptor.attach(target.virtualAddress, {
            onEnter: function () { try { onTick(); } catch (_) {} }
        });
        orbit.hookInstalled = true;
        log("hook installed on GorillaLocomotion." + target.name);
    }
    installHook();

    log("===== Orbit Menu V3.0 READY =====");
});
