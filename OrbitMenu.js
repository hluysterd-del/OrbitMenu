// ====================================================================
//  Orbit Menu V1.1 — Animal Company
//  Standalone Frida agent. Load order:
//      1. frida-il2cpp-bridge.js   (Il2Cpp namespace)
//      2. Frida-Map.js             (resolver -> Il2Cpp.$config.exports)
//      3. OrbitMenu.js             (this file)
// ====================================================================

(function () {
    "use strict";

    const _u = {
        GameObject: null, Transform: null, RectTransform: null,
        Vector3: null, Vector2: null, Color: null,
        Canvas: null, Text: null, CanvasScaler: null, GraphicRaycaster: null,
        Object: null, RenderMode: { ScreenSpaceOverlay: 0, ScreenSpaceCamera: 1, WorldSpace: 2 },
    };
    const _ac = {
        PlayerController: null,
        GorillaLocomotion: null,
    };

    globalThis.orbit = globalThis.orbit || {
        tickCount: 0,
        hookInstalled: false,
        visible: false,
        rootHandle: null,
        canvasHandle: null,
        textHandle: null,
        buildAttempts: 0,
        buildFailed: false,        // permanent give-up flag
        buildFailReason: null,
        lastLog: 0,
        currentCategory: 0,
        cursor: 0,
    };

    function log(msg) { console.log("[Orbit] " + msg); }

    // ---- Class resolution -------------------------------------------------
    function ensureClasses() {
        if (_u.GameObject) return true;
        try {
            const core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
            _u.GameObject    = core.class("UnityEngine.GameObject");
            _u.Transform     = core.class("UnityEngine.Transform");
            _u.RectTransform = core.class("UnityEngine.RectTransform");
            _u.Vector3       = core.class("UnityEngine.Vector3");
            _u.Vector2       = core.class("UnityEngine.Vector2");
            _u.Color         = core.class("UnityEngine.Color");
            _u.Object        = core.class("UnityEngine.Object");
            _u.Canvas        = core.tryClass("UnityEngine.Canvas");

            if (!_u.Canvas) {
                const uimod = Il2Cpp.domain.tryAssembly("UnityEngine.UIModule");
                if (uimod) _u.Canvas = uimod.image.tryClass("UnityEngine.Canvas");
            }
            const uiAsm = Il2Cpp.domain.tryAssembly("UnityEngine.UI");
            if (uiAsm) {
                _u.Text = uiAsm.image.tryClass("UnityEngine.UI.Text");
                _u.CanvasScaler = uiAsm.image.tryClass("UnityEngine.UI.CanvasScaler");
                _u.GraphicRaycaster = uiAsm.image.tryClass("UnityEngine.UI.GraphicRaycaster");
            }
            const acAsm = Il2Cpp.domain.tryAssembly("AnimalCompany");
            if (acAsm) {
                _ac.PlayerController  = acAsm.image.tryClass("AnimalCompany.PlayerController");
                _ac.GorillaLocomotion = acAsm.image.tryClass("AnimalCompany.GorillaLocomotion");
            }
            log("classes: GO=" + !!_u.GameObject + " Canvas=" + !!_u.Canvas +
                " Text=" + !!_u.Text + " PC=" + !!_ac.PlayerController +
                " GL=" + !!_ac.GorillaLocomotion);
            return true;
        } catch (e) {
            log("ensureClasses err: " + (e && e.stack || e));
            return false;
        }
    }

    function mkVec3(x, y, z) {
        const v = _u.Vector3.alloc();
        v.field("x").value = x; v.field("y").value = y; v.field("z").value = z;
        return v;
    }
    function mkVec2(x, y) {
        const v = _u.Vector2.alloc();
        v.field("x").value = x; v.field("y").value = y;
        return v;
    }
    function mkColor(r, g, b, a) {
        const c = _u.Color.alloc();
        c.field("r").value = r; c.field("g").value = g; c.field("b").value = b;
        c.field("a").value = a == null ? 1 : a;
        return c;
    }

    function getPlayer() {
        if (!_ac.PlayerController) return null;
        try {
            const m = _ac.PlayerController.tryMethod("get_instance");
            if (!m) return null;
            const v = m.invoke();
            return (v == null || v.handle.isNull()) ? null : v;
        } catch (_) { return null; }
    }
    function getField(obj, name) {
        try {
            const f = obj.tryField(name);
            if (!f) return null;
            const v = f.value;
            return (v == null || v.handle.isNull()) ? null : v;
        } catch (_) { return null; }
    }
    function rewrap(handleStr, cls) {
        try { return new Il2Cpp.Object({ handle: ptr(handleStr), klass: cls || _u.GameObject }); }
        catch (_) { return null; }
    }

    // ---- Create an empty GameObject (avoid CreatePrimitive enum issue + .ctor invokeRaw)
    function newGameObject(name) {
        // klass.new() calls the parameterless ctor — much safer than invokeRaw on .ctor(string)
        const go = _u.GameObject.new();
        try { go.method("set_name").invoke(Il2Cpp.string(name)); } catch (_) {}
        return go;
    }

    // ---- Add a component by type ------------------------------------------
    function addComponent(gameObject, cls) {
        // AddComponent(Type) is an INSTANCE method — invoke on the GameObject instance, not the class.
        try {
            return gameObject.method("AddComponent", 1).invoke(cls.type.object);
        } catch (e) {
            log("addComponent " + cls.name + " err: " + e);
            return null;
        }
    }

    // ---- Build the menu (try once, give up on failure) -------------------
    function buildMenu() {
        if (orbit.rootHandle) return;
        if (orbit.buildFailed) return;

        orbit.buildAttempts++;
        if (orbit.buildAttempts > 1) {
            // already tried; quit retrying
            return;
        }
        log("building menu (attempt 1)...");

        // Stage-by-stage wrapper so we know exactly which call breaks.
        function stage(label, fn) {
            try {
                log("  step: " + label);
                return fn();
            } catch (e) {
                throw new Error("at step '" + label + "': " + (e && (e.message || e)));
            }
        }

        try {
            ensureClasses();

            const root = stage("new GameObject(root)", () => newGameObject("OrbitRoot"));
            const canvasGO = stage("new GameObject(canvas)", () => newGameObject("OrbitCanvas"));
            stage("canvas.SetParent(root)", () => {
                canvasGO.method("get_transform").invoke()
                        .method("SetParent", 1).invoke(root.method("get_transform").invoke());
            });
            const canvas = stage("AddComponent<Canvas>", () => addComponent(canvasGO, _u.Canvas));
            if (!canvas || canvas.handle.isNull()) throw new Error("AddComponent<Canvas> returned null");
            stage("canvas.set_renderMode(WorldSpace)", () => {
                canvas.method("set_renderMode").invoke(_u.RenderMode.WorldSpace);
            });
            if (_u.CanvasScaler) stage("AddComponent<CanvasScaler>", () => addComponent(canvasGO, _u.CanvasScaler));
            stage("canvas.localScale(0.001)", () => {
                canvasGO.method("get_transform").invoke().method("set_localScale").invoke(mkVec3(0.001, 0.001, 0.001));
            });

            const textGO = stage("new GameObject(text)", () => newGameObject("OrbitText"));
            stage("text.SetParent(canvas)", () => {
                textGO.method("get_transform").invoke()
                      .method("SetParent", 1).invoke(canvasGO.method("get_transform").invoke());
            });
            const text = stage("AddComponent<Text>", () => addComponent(textGO, _u.Text));
            if (!text || text.handle.isNull()) throw new Error("AddComponent<Text> returned null");

            stage("text.set_text", () => text.method("set_text").invoke(Il2Cpp.string(renderMenuText())));
            stage("text.set_color", () => text.method("set_color").invoke(mkColor(0.9, 0.7, 1.0, 1.0)));
            stage("text.set_fontSize", () => text.method("set_fontSize").invoke(40));
            stage("text.set_alignment", () => text.method("set_alignment").invoke(4));

            try {
                const rect = textGO.method("GetComponent", 1).inflate(_u.RectTransform).invoke();
                if (rect && !rect.handle.isNull()) {
                    rect.method("set_sizeDelta").invoke(mkVec2(800, 400));
                }
            } catch (e) { log("  rect sizeDelta skipped: " + e); }

            orbit.rootHandle   = root.handle.toString();
            orbit.canvasHandle = canvasGO.handle.toString();
            orbit.textHandle   = textGO.handle.toString();
            orbit.visible      = true;
            log("menu built! root=" + orbit.rootHandle);
        } catch (e) {
            orbit.buildFailed = true;
            orbit.buildFailReason = String(e && (e.stack || e.message || e));
            log("BUILD FAILED (giving up): " + orbit.buildFailReason);
        }
    }

    function renderMenuText() {
        const cats = ["Prefab", "Spawner", "Movement", "Safety"];
        const out = ["=== Orbit Menu V1 ==="];
        for (let i = 0; i < cats.length; i++) {
            out.push((i === orbit.currentCategory ? "> " : "  ") + cats[i]);
        }
        return out.join("\n");
    }

    function repositionMenu() {
        if (!orbit.rootHandle) return;
        const player = getPlayer();
        if (!player) return;
        const head = getField(player, "_headTransform") || getField(player, "_cameraTransform");
        if (!head) return;
        try {
            const root = rewrap(orbit.rootHandle, _u.GameObject);
            if (!root) return;
            const hp = head.method("get_position").invoke();
            const hf = head.method("get_forward").invoke();
            const px = hp.field("x").value + hf.field("x").value * 0.6;
            const py = hp.field("y").value + hf.field("y").value * 0.6;
            const pz = hp.field("z").value + hf.field("z").value * 0.6;
            root.method("get_transform").invoke().method("set_position").invoke(mkVec3(px, py, pz));
        } catch (_) {}
    }

    function onTick() {
        orbit.tickCount++;
        if (!orbit.rootHandle && !orbit.buildFailed) {
            buildMenu();
        } else if (orbit.rootHandle) {
            repositionMenu();
        }
        if (orbit.tickCount - orbit.lastLog >= 300) {
            orbit.lastLog = orbit.tickCount;
            log("tick " + orbit.tickCount + " visible=" + orbit.visible +
                " built=" + !!orbit.rootHandle + " failed=" + orbit.buildFailed);
        }
    }

    function installHook() {
        if (orbit.hookInstalled) return;
        if (!_ac.GorillaLocomotion) { log("ERROR: GorillaLocomotion class not loaded"); return; }
        let target = _ac.GorillaLocomotion.tryMethod("OnUpdate");
        let name = "OnUpdate";
        if (!target) { target = _ac.GorillaLocomotion.tryMethod("FixedUpdate"); name = "FixedUpdate"; }
        if (!target) { log("ERROR: no OnUpdate/FixedUpdate"); return; }

        Interceptor.attach(target.virtualAddress, {
            onEnter: function () { try { onTick(); } catch (_) {} }
        });
        orbit.hookInstalled = true;
        log("hook installed on GorillaLocomotion." + name);
    }

    log("===== Orbit Menu V1.1 LOADING =====");
    Il2Cpp.perform(function () {
        try {
            ensureClasses();
            installHook();
            log("===== Orbit Menu V1.1 READY =====");
        } catch (e) {
            log("bootstrap err: " + (e && e.stack || e));
        }
    });
})();
