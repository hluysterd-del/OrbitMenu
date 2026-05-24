// ====================================================================
//  Orbit Menu V2.0 — Animal Company
//  Camera-attached text overlay + XR controller input readout.
//  Load order: frida-il2cpp-bridge.js, Frida-Map.js, OrbitMenu.js
// ====================================================================

(function () {
    "use strict";

    const _u = {
        GameObject: null, Transform: null, RectTransform: null,
        Vector3: null, Vector2: null, Color: null,
        Canvas: null, Text: null, Image: null, CanvasScaler: null,
        Camera: null, Object: null,
        RenderMode: { ScreenSpaceOverlay: 0, ScreenSpaceCamera: 1, WorldSpace: 2 },
    };
    const _ac = {
        PlayerController: null,
        GorillaLocomotion: null,
        XRInputManager: null,
        XRHandSide: { Left: 0, Right: 1 },  // common AC enum
    };

    globalThis.orbit = globalThis.orbit || {
        tickCount: 0,
        hookInstalled: false,
        visible: false,
        rootHandle: null,
        textHandle: null,
        cursor: 0,
        buttonCount: 5,
        buildFailed: false,
        buildFailReason: null,
        lastLog: 0,
    };

    function log(msg) { console.log("[Orbit] " + msg); }

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
            _u.Camera        = core.tryClass("UnityEngine.Camera");
            _u.Canvas        = core.tryClass("UnityEngine.Canvas");

            if (!_u.Canvas) {
                const uimod = Il2Cpp.domain.tryAssembly("UnityEngine.UIModule");
                if (uimod) _u.Canvas = uimod.image.tryClass("UnityEngine.Canvas");
            }
            const uiAsm = Il2Cpp.domain.tryAssembly("UnityEngine.UI");
            if (uiAsm) {
                _u.Text  = uiAsm.image.tryClass("UnityEngine.UI.Text");
                _u.Image = uiAsm.image.tryClass("UnityEngine.UI.Image");
                _u.CanvasScaler = uiAsm.image.tryClass("UnityEngine.UI.CanvasScaler");
            }
            const acAsm = Il2Cpp.domain.tryAssembly("AnimalCompany");
            if (acAsm) {
                _ac.PlayerController  = acAsm.image.tryClass("AnimalCompany.PlayerController");
                _ac.GorillaLocomotion = acAsm.image.tryClass("AnimalCompany.GorillaLocomotion");
                _ac.XRInputManager    = acAsm.image.tryClass("AnimalCompany.XRInputManager");
            }
            log("classes: GO=" + !!_u.GameObject + " Cam=" + !!_u.Camera +
                " Canvas=" + !!_u.Canvas + " Text=" + !!_u.Text +
                " Image=" + !!_u.Image + " PC=" + !!_ac.PlayerController +
                " GL=" + !!_ac.GorillaLocomotion + " XR=" + !!_ac.XRInputManager);
            return true;
        } catch (e) { log("ensureClasses err: " + e); return false; }
    }

    // ---- Value-type constructors (UNBOX before passing) -------------------
    function mkVec3(x, y, z) { const v = _u.Vector3.alloc(); v.field("x").value = x; v.field("y").value = y; v.field("z").value = z; return v.unbox(); }
    function mkVec2(x, y)    { const v = _u.Vector2.alloc(); v.field("x").value = x; v.field("y").value = y; return v.unbox(); }
    function mkColor(r,g,b,a){ const c = _u.Color.alloc();   c.field("r").value = r; c.field("g").value = g; c.field("b").value = b; c.field("a").value = a==null?1:a; return c.unbox(); }

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
    function addComponent(go, cls) {
        try { return go.method("AddComponent", 1).invoke(cls.type.object); }
        catch (e) { log("addComponent " + cls.name + " err: " + e); return null; }
    }
    function newGameObject(name) {
        const go = _u.GameObject.new();
        try { go.method("set_name").invoke(Il2Cpp.string(name)); } catch (_) {}
        return go;
    }
    function rewrap(handleStr, cls) {
        try { return new Il2Cpp.Object({ handle: ptr(handleStr), klass: cls || _u.GameObject }); }
        catch (_) { return null; }
    }

    // Get the camera Transform via PlayerController, or Camera.main fallback.
    function getCameraTransform() {
        const p = getPlayer();
        if (p) {
            const t = getField(p, "_cameraTransform") || getField(p, "_headTransform");
            if (t) return t;
        }
        if (_u.Camera) {
            try {
                const m = _u.Camera.tryMethod("get_main");
                if (m) {
                    const cam = m.invoke();
                    if (cam && !cam.handle.isNull()) {
                        return cam.method("get_transform").invoke();
                    }
                }
            } catch (_) {}
        }
        return null;
    }

    // ---- Build menu (single attempt, fail-once guard) ---------------------
    function buildMenu() {
        if (orbit.rootHandle || orbit.buildFailed) return;
        log("building menu...");

        function stage(label, fn) {
            try { log("  step: " + label); return fn(); }
            catch (e) { throw new Error("at '" + label + "': " + (e && (e.message || e))); }
        }

        try {
            ensureClasses();

            const camT = stage("get camera transform", getCameraTransform);
            if (!camT) throw new Error("camera Transform not available (in main menu?)");

            // Canvas as child of camera transform — auto-follows, auto-faces.
            const canvasGO = stage("new GameObject(canvas)", () => newGameObject("OrbitCanvas"));
            stage("canvas.SetParent(camera)", () => {
                canvasGO.method("get_transform").invoke()
                        .method("SetParent", 1).invoke(camT);
            });
            // Local position 0.5m in front of camera (camera looks down +Z in Unity)
            stage("canvas.localPosition(0,0,0.5)", () => {
                canvasGO.method("get_transform").invoke().method("set_localPosition").invoke(mkVec3(0, 0, 0.5));
            });
            stage("canvas.localRotation reset", () => {
                // Identity rotation — text faces same way as camera looks
                const Quat = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image.class("UnityEngine.Quaternion");
                const q = Quat.alloc();
                q.field("x").value = 0; q.field("y").value = 0; q.field("z").value = 0; q.field("w").value = 1;
                canvasGO.method("get_transform").invoke().method("set_localRotation").invoke(q.unbox());
            });
            const canvas = stage("AddComponent<Canvas>", () => addComponent(canvasGO, _u.Canvas));
            stage("canvas.set_renderMode(WorldSpace)", () => canvas.method("set_renderMode").invoke(_u.RenderMode.WorldSpace));
            if (_u.CanvasScaler) stage("AddComponent<CanvasScaler>", () => addComponent(canvasGO, _u.CanvasScaler));
            stage("canvas.localScale(0.001)", () => {
                canvasGO.method("get_transform").invoke().method("set_localScale").invoke(mkVec3(0.001, 0.001, 0.001));
            });

            // Background image (solid purple panel)
            if (_u.Image) {
                const bgGO = stage("new GameObject(bg)", () => newGameObject("OrbitBG"));
                stage("bg.SetParent(canvas)", () => bgGO.method("get_transform").invoke().method("SetParent", 1).invoke(canvasGO.method("get_transform").invoke()));
                stage("bg.localPosition", () => bgGO.method("get_transform").invoke().method("set_localPosition").invoke(mkVec3(0, 0, 0)));
                const img = stage("AddComponent<Image>", () => addComponent(bgGO, _u.Image));
                if (img && !img.handle.isNull()) {
                    stage("img.set_color(purple)", () => img.method("set_color").invoke(mkColor(0.25, 0.05, 0.45, 0.92)));
                }
                try {
                    const rt = bgGO.method("GetComponent", 1).inflate(_u.RectTransform).invoke();
                    if (rt && !rt.handle.isNull()) rt.method("set_sizeDelta").invoke(mkVec2(500, 400));
                } catch (e) { log("  bg rect err: " + e); }
            }

            // Text overlay
            const textGO = stage("new GameObject(text)", () => newGameObject("OrbitText"));
            stage("text.SetParent(canvas)", () => textGO.method("get_transform").invoke().method("SetParent", 1).invoke(canvasGO.method("get_transform").invoke()));
            stage("text.localPosition", () => textGO.method("get_transform").invoke().method("set_localPosition").invoke(mkVec3(0, 0, -0.01)));
            const text = stage("AddComponent<Text>", () => addComponent(textGO, _u.Text));
            stage("text.set_text", () => text.method("set_text").invoke(Il2Cpp.string(renderMenuText())));
            stage("text.set_color", () => text.method("set_color").invoke(mkColor(1, 1, 1, 1)));
            stage("text.set_fontSize", () => text.method("set_fontSize").invoke(36));
            stage("text.set_alignment", () => text.method("set_alignment").invoke(4));   // MiddleCenter
            try {
                const rt = textGO.method("GetComponent", 1).inflate(_u.RectTransform).invoke();
                if (rt && !rt.handle.isNull()) rt.method("set_sizeDelta").invoke(mkVec2(480, 380));
            } catch (e) { log("  text rect err: " + e); }

            orbit.rootHandle = canvasGO.handle.toString();
            orbit.textHandle = textGO.handle.toString();
            orbit.visible = true;
            log("MENU BUILT! root=" + orbit.rootHandle);
        } catch (e) {
            orbit.buildFailed = true;
            orbit.buildFailReason = String(e && (e.stack || e.message || e));
            log("BUILD FAILED (giving up): " + orbit.buildFailReason);
        }
    }

    function renderMenuText() {
        const lines = ["testing", ""];
        for (let i = 0; i < orbit.buttonCount; i++) {
            const arrow = (i === orbit.cursor) ? "> " : "  ";
            lines.push(arrow + "[ Button " + (i + 1) + " ]");
        }
        return lines.join("\n");
    }

    function refreshText() {
        if (!orbit.textHandle) return;
        try {
            const t = rewrap(orbit.textHandle, _u.Text);
            if (t) t.method("set_text").invoke(Il2Cpp.string(renderMenuText()));
        } catch (_) {}
    }

    // ---- XR input ---------------------------------------------------------
    function readXR() {
        const out = { lJoyY: 0, rJoyY: 0, lTrig: false, rTrig: false, lGrip: false };
        if (!_ac.XRInputManager) return out;
        try {
            const GetJoystick = _ac.XRInputManager.tryMethod("GetJoystickValue");
            const GetTrigger  = _ac.XRInputManager.tryMethod("GetTriggerButtonValue");
            if (GetJoystick) {
                const ljv = GetJoystick.invoke(0); // 0 = Left
                if (ljv) out.lJoyY = ljv.field("y").value;
                const rjv = GetJoystick.invoke(1);
                if (rjv) out.rJoyY = rjv.field("y").value;
            }
            if (GetTrigger) {
                out.lTrig = !!GetTrigger.invoke(0);
                out.rTrig = !!GetTrigger.invoke(1);
            }
        } catch (e) {
            // Don't log every tick; just track once
        }
        return out;
    }

    let lastCursorMoveTick = 0;
    function handleInput() {
        const xr = readXR();
        // Joystick cursor navigation with cooldown so it doesn't sprint
        const now = orbit.tickCount;
        if (now - lastCursorMoveTick > 15) {
            if (xr.lJoyY > 0.5 || xr.rJoyY > 0.5) {
                orbit.cursor = (orbit.cursor - 1 + orbit.buttonCount) % orbit.buttonCount;
                lastCursorMoveTick = now;
                refreshText();
            } else if (xr.lJoyY < -0.5 || xr.rJoyY < -0.5) {
                orbit.cursor = (orbit.cursor + 1) % orbit.buttonCount;
                lastCursorMoveTick = now;
                refreshText();
            }
        }
        return xr;
    }

    function onTick() {
        orbit.tickCount++;
        if (!orbit.rootHandle && !orbit.buildFailed) { buildMenu(); return; }
        if (orbit.rootHandle) {
            const xr = handleInput();
            if (orbit.tickCount - orbit.lastLog >= 300) {
                orbit.lastLog = orbit.tickCount;
                log("tick " + orbit.tickCount + " cursor=" + orbit.cursor +
                    " XR{lY=" + xr.lJoyY.toFixed(2) + " rY=" + xr.rJoyY.toFixed(2) +
                    " lT=" + xr.lTrig + " rT=" + xr.rTrig + "}");
            }
        }
    }

    function installHook() {
        if (orbit.hookInstalled) return;
        if (!_ac.GorillaLocomotion) { log("ERROR: GorillaLocomotion class missing"); return; }
        let target = _ac.GorillaLocomotion.tryMethod("OnUpdate") || _ac.GorillaLocomotion.tryMethod("FixedUpdate");
        if (!target) { log("ERROR: no OnUpdate/FixedUpdate"); return; }
        Interceptor.attach(target.virtualAddress, {
            onEnter: function () { try { onTick(); } catch (_) {} }
        });
        orbit.hookInstalled = true;
        log("hook installed on " + target.name);
    }

    log("===== Orbit Menu V2.0 LOADING =====");
    Il2Cpp.perform(function () {
        try {
            ensureClasses();
            installHook();
            log("===== Orbit Menu V2.0 READY =====");
        } catch (e) {
            log("bootstrap err: " + (e && e.stack || e));
        }
    });
})();
