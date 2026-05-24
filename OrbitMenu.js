// ====================================================================
//  Orbit Menu - Animal Company
//  World-space Canvas + UI.Text panel parented to the player's head.
// ====================================================================

(function () {
    "use strict";

    const VERSION = "3.1";
    const RETRY_TICKS = 300;
    const MENU_LOCAL_POSITION = [-0.15, 0, 0.45];
    const MENU_LOCAL_ROTATION = [0, 0, 0, 1];
    const MENU_LOCAL_SCALE = [1e-3, 1e-3, 1e-3];
    const TEXT_RECT_SIZE = [400, 600];

    function safeString(value) {
        try { return String(value && (value.stack || value.message || value)); }
        catch (_) { return "unknown error"; }
    }

    function log(msg) { console.log("[Orbit] " + msg); }

    Il2Cpp.perform(() => {
        log("===== Orbit Menu V" + VERSION + " LOADING =====");

        const acImage = Il2Cpp.domain.assembly("AnimalCompany").image;
        const coreImage = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
        const uiModImage = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
        const uiImage = Il2Cpp.domain.assembly("UnityEngine.UI").image;
        const textImage = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

        const GameObjectClass = coreImage.class("UnityEngine.GameObject");
        const ObjectClass = coreImage.class("UnityEngine.Object");
        const RendererClass = coreImage.class("UnityEngine.Renderer");
        const ResourcesClass = coreImage.class("UnityEngine.Resources");
        const CanvasClass = uiModImage.class("UnityEngine.Canvas");
        const TextClass = uiImage.class("UnityEngine.UI.Text");
        const FontClass = textImage.class("UnityEngine.Font");
        const RectTransformClass = coreImage.class("UnityEngine.RectTransform");

        const PlayerControllerClass = acImage.class("AnimalCompany.PlayerController");
        const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");

        globalThis.orbit = Object.assign({
            version: VERSION,
            tickCount: 0,
            hookInstalled: false,
            menuInited: false,
            menuGO: null,
            menuText: null,
            cursor: 0,
            buttonLabels: ["Status", "Movement", "Visuals", "Player", "Settings"],
            lastLog: 0,
            lastHeadLog: 0,
            lastMenuText: "",
            buildFailed: false,
            buildFailReason: null,
            nextBuildAttemptTick: 0,
        }, globalThis.orbit || {});

        const orbit = globalThis.orbit;
        orbit.version = VERSION;
        if (!Array.isArray(orbit.buttonLabels) || orbit.buttonLabels.length === 0) {
            orbit.buttonLabels = ["Status", "Movement", "Visuals", "Player", "Settings"];
        }

        function playerInst() {
            try {
                const value = PlayerControllerClass.method("get_instance").invoke();
                if (value && !value.handle.isNull()) return value;
            } catch (_) {}
            return null;
        }

        function headTransform() {
            const inst = playerInst();
            if (!inst) return null;
            try { return inst.field("headFollower").value; }
            catch (_) { return null; }
        }

        function findFont() {
            try {
                const fonts = ResourcesClass.method("FindObjectsOfTypeAll", 1).invoke(FontClass.type);
                for (let i = 0; i < fonts.length; i++) {
                    const font = fonts.get(i);
                    try {
                        const name = FontClass.method("get_name").on(font).invoke().toString();
                        if (name === "Utopium") return font;
                    } catch (_) {}
                }
            } catch (_) {}

            try {
                return ResourcesClass.method("GetBuiltinResource", 1)
                    .inflate(FontClass)
                    .invoke(Il2Cpp.string("Arial.ttf"));
            } catch (_) {
                return null;
            }
        }

        function clearMenuRefs() {
            orbit.menuGO = null;
            orbit.menuText = null;
            orbit.menuInited = false;
            orbit.lastMenuText = "";
        }

        function markBuildFailed(error) {
            orbit.buildFailed = true;
            orbit.buildFailReason = safeString(error);
            orbit.nextBuildAttemptTick = orbit.tickCount + RETRY_TICKS;
            log("build failed: " + orbit.buildFailReason);
            log("will retry in about " + RETRY_TICKS + " ticks");
        }

        function initMenu() {
            if (orbit.menuInited || orbit.buildFailed) return;

            try {
                const head = headTransform();
                if (!head) {
                    if (orbit.tickCount - orbit.lastHeadLog >= RETRY_TICKS) {
                        orbit.lastHeadLog = orbit.tickCount;
                        log("waiting for player head transform...");
                    }
                    return;
                }

                log("building menu...");

                const font = findFont();
                const menuGO = GameObjectClass.method("CreatePrimitive").invoke(3);
                menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));

                try {
                    menuGO.method("GetComponent", 1)
                        .inflate(RendererClass)
                        .invoke()
                        .method("set_enabled")
                        .invoke(false);
                } catch (_) {}

                const menuTransform = menuGO.method("get_transform").invoke();
                menuTransform.method("SetParent", 2).invoke(head, false);
                menuTransform.method("set_localPosition").invoke(MENU_LOCAL_POSITION);
                menuTransform.method("set_localRotation").invoke(MENU_LOCAL_ROTATION);
                menuTransform.method("set_localScale").invoke(MENU_LOCAL_SCALE);

                const canvas = menuGO.method("AddComponent", 1).inflate(CanvasClass).invoke();
                canvas.method("set_renderMode").invoke(2);

                const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
                textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));

                try {
                    textGO.method("GetComponent", 1)
                        .inflate(RendererClass)
                        .invoke()
                        .method("set_enabled")
                        .invoke(false);
                } catch (_) {}

                textGO.method("get_transform").invoke().method("SetParent", 2).invoke(menuTransform, false);

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
                        rt.method("set_sizeDelta").invoke(TEXT_RECT_SIZE);
                    }
                } catch (_) {}

                ObjectClass.method("DontDestroyOnLoad").invoke(menuGO);

                orbit.menuGO = menuGO;
                orbit.menuText = menuText;
                orbit.menuInited = true;
                orbit.buildFailed = false;
                orbit.buildFailReason = null;

                log("menu built: " + menuGO.handle.toString());
                setMenuText(renderMenuText());
            } catch (e) {
                clearMenuRefs();
                markBuildFailed(e);
            }
        }

        function setMenuText(text) {
            if (!orbit.menuText || text === orbit.lastMenuText) return;

            try {
                orbit.menuText.method("set_text").invoke(Il2Cpp.string(text));
                orbit.lastMenuText = text;
            } catch (e) {
                log("set_text failed: " + safeString(e));
                clearMenuRefs();
            }
        }

        function renderMenuText() {
            const lines = [
                "<color=#bb88ff>Orbit Menu V" + VERSION + "</color>",
                "<color=#888888>panel online</color>",
                "",
            ];

            for (let i = 0; i < orbit.buttonLabels.length; i++) {
                const cursor = (i === orbit.cursor) ? "<color=#ffcc00>></color> " : "  ";
                lines.push(cursor + "[ " + orbit.buttonLabels[i] + " ]");
            }
            return lines.join("\n");
        }

        function onTick() {
            orbit.tickCount++;

            if (orbit.buildFailed && orbit.tickCount >= orbit.nextBuildAttemptTick) {
                orbit.buildFailed = false;
                orbit.buildFailReason = null;
            }

            if (!orbit.menuInited && !orbit.buildFailed) {
                initMenu();
            } else if (orbit.menuInited) {
                setMenuText(renderMenuText());
            }

            if (orbit.tickCount - orbit.lastLog >= RETRY_TICKS) {
                orbit.lastLog = orbit.tickCount;
                log("tick " + orbit.tickCount +
                    " inited=" + orbit.menuInited +
                    " failed=" + orbit.buildFailed +
                    " cursor=" + orbit.cursor);
            }
        }

        function installHook() {
            if (orbit.hookInstalled) return;

            const target = GorillaLocomotionClass.tryMethod("OnUpdate") ||
                GorillaLocomotionClass.tryMethod("FixedUpdate");

            if (!target) {
                log("error: no GorillaLocomotion OnUpdate/FixedUpdate method found");
                return;
            }

            Interceptor.attach(target.virtualAddress, {
                onEnter: function () {
                    try { onTick(); }
                    catch (e) { log("tick failed: " + safeString(e)); }
                },
            });

            orbit.hookInstalled = true;
            log("hook installed on GorillaLocomotion." + target.name);
        }

        installHook();
        log("===== Orbit Menu V" + VERSION + " READY =====");
    });
})();
