// ====================================================================
//  Orbit Menu V1 — Animal Company
//  Standalone Frida agent. Load order:
//      1. frida-il2cpp-bridge.js   (Il2Cpp namespace)
//      2. Frida-Map.js             (resolver -> Il2Cpp.$config.exports)
//      3. OrbitMenu.js             (this file)
//  Auto-starts on load. No RPC needed.
// ====================================================================

(function () {
    "use strict";

    // ---- Cached class refs (lazy) ------------------------------------------
    const _u = {
        GameObject: null, Transform: null, Vector3: null, Color: null,
        Canvas: null, Text: null, Renderer: null, Material: null, Object: null,
        PrimitiveType: { Sphere: 0, Capsule: 1, Cylinder: 2, Cube: 3, Plane: 4, Quad: 5 },
        RenderMode: { ScreenSpaceOverlay: 0, ScreenSpaceCamera: 1, WorldSpace: 2 },
    };
    const _ac = {
        PlayerController: null,
        GorillaLocomotion: null,
    };

    // ---- Persistent state across script reloads ---------------------------
    globalThis.orbit = globalThis.orbit || {
        tickCount: 0,
        hookInstalled: false,
        visible: false,
        rootHandle: null,
        bgHandle: null,
        currentCategory: 0,
        cursor: 0,
        lastLog: 0,
    };

    function log(msg) {
        console.log("[Orbit] " + msg);
    }

    // ---- Class resolution -------------------------------------------------
    function ensureClasses() {
        if (_u.GameObject) return true;
        try {
            const core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
            _u.GameObject = core.class("UnityEngine.GameObject");
            _u.Transform  = core.class("UnityEngine.Transform");
            _u.Vector3    = core.class("UnityEngine.Vector3");
            _u.Color      = core.class("UnityEngine.Color");
            _u.Renderer   = core.class("UnityEngine.Renderer");
            _u.Material   = core.class("UnityEngine.Material");
            _u.Object     = core.class("UnityEngine.Object");
            _u.Canvas     = core.tryClass("UnityEngine.Canvas");

            if (!_u.Canvas) {
                const uimod = Il2Cpp.domain.tryAssembly("UnityEngine.UIModule");
                if (uimod) _u.Canvas = uimod.image.tryClass("UnityEngine.Canvas");
            }
            const uiAsm = Il2Cpp.domain.tryAssembly("UnityEngine.UI");
            if (uiAsm) _u.Text = uiAsm.image.tryClass("UnityEngine.UI.Text");

            const acAsm = Il2Cpp.domain.tryAssembly("AnimalCompany");
            if (acAsm) {
                _ac.PlayerController  = acAsm.image.tryClass("AnimalCompany.PlayerController");
                _ac.GorillaLocomotion = acAsm.image.tryClass("AnimalCompany.GorillaLocomotion");
            }
            log("classes resolved (GO=" + !!_u.GameObject + " Canvas=" + !!_u.Canvas +
                " Text=" + !!_u.Text + " PC=" + !!_ac.PlayerController +
                " GL=" + !!_ac.GorillaLocomotion + ")");
            return true;
        } catch (e) {
            log("ensureClasses err: " + (e && e.stack || e));
            return false;
        }
    }

    // ---- Helpers ----------------------------------------------------------
    function mkVec3(x, y, z) {
        const v = _u.Vector3.alloc();
        v.field("x").value = x; v.field("y").value = y; v.field("z").value = z;
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

    // ---- Build the menu GameObjects --------------------------------------
    function buildMenu() {
        if (orbit.rootHandle) return;
        log("building menu objects...");

        const root = _u.GameObject.method("CreatePrimitive").invoke(_u.PrimitiveType.Cube);
        root.method("set_name").invoke(Il2Cpp.string("OrbitRoot"));
        try {
            const r = root.method("GetComponent", 1).inflate(_u.Renderer).invoke();
            if (r && !r.handle.isNull()) _u.Object.method("Destroy", 1).invoke(r);
        } catch (_) {}
        root.method("get_transform").invoke().method("set_localScale").invoke(mkVec3(0.001, 0.001, 0.001));

        const bg = _u.GameObject.method("CreatePrimitive").invoke(_u.PrimitiveType.Cube);
        bg.method("set_name").invoke(Il2Cpp.string("OrbitBG"));
        const bgT = bg.method("get_transform").invoke();
        bgT.method("SetParent", 1).invoke(root.method("get_transform").invoke());
        bgT.method("set_localPosition").invoke(mkVec3(0, 0, 0));
        bgT.method("set_localScale").invoke(mkVec3(0.3, 0.4, 0.005));

        try {
            const r = bg.method("GetComponent", 1).inflate(_u.Renderer).invoke();
            if (r && !r.handle.isNull()) {
                const mat = r.method("get_material").invoke();
                mat.method("set_color", 1).invoke(mkColor(0.35, 0.1, 0.55, 1));
            }
        } catch (e) { log("bg color err: " + e); }

        orbit.rootHandle = root.handle.toString();
        orbit.bgHandle   = bg.handle.toString();
        orbit.visible    = true;
        log("menu objects built. root=" + orbit.rootHandle);
    }

    // ---- Position update each tick ---------------------------------------
    function repositionMenu() {
        if (!orbit.rootHandle) return;
        const player = getPlayer();
        if (!player) return;
        const head = getField(player, "_headTransform") || getField(player, "_cameraTransform");
        if (!head) return;

        try {
            const root = rewrap(orbit.rootHandle, _u.GameObject);
            if (!root) return;
            const headPos = head.method("get_position").invoke();
            const headFwd = head.method("get_forward").invoke();
            const px = headPos.field("x").value + headFwd.field("x").value * 0.6;
            const py = headPos.field("y").value + headFwd.field("y").value * 0.6;
            const pz = headPos.field("z").value + headFwd.field("z").value * 0.6;
            root.method("get_transform").invoke().method("set_position").invoke(mkVec3(px, py, pz));
        } catch (_) { /* swallow per-tick errors */ }
    }

    // ---- Tick callback (runs on main thread, inside hook) ----------------
    function onTick() {
        orbit.tickCount++;
        if (!orbit.rootHandle) {
            try { ensureClasses(); buildMenu(); } catch (e) { log("buildMenu err: " + e); }
        } else {
            try { repositionMenu(); } catch (_) {}
        }
        if (orbit.tickCount - orbit.lastLog >= 300) {
            orbit.lastLog = orbit.tickCount;
            log("tick " + orbit.tickCount + " cat=" + orbit.currentCategory +
                " cursor=" + orbit.cursor + " visible=" + orbit.visible);
        }
    }

    // ---- Install hook on GorillaLocomotion.OnUpdate ----------------------
    function installHook() {
        if (orbit.hookInstalled) return;
        if (!_ac.GorillaLocomotion) {
            log("ERROR: GorillaLocomotion class not loaded");
            return;
        }
        let target = _ac.GorillaLocomotion.tryMethod("OnUpdate");
        let name = "OnUpdate";
        if (!target) { target = _ac.GorillaLocomotion.tryMethod("FixedUpdate"); name = "FixedUpdate"; }
        if (!target) { log("ERROR: no OnUpdate/FixedUpdate on GorillaLocomotion"); return; }

        Interceptor.attach(target.virtualAddress, {
            onEnter: function () { try { onTick(); } catch (_) {} }
        });
        orbit.hookInstalled = true;
        log("hook installed on GorillaLocomotion." + name);
    }

    // ---- Bootstrap -------------------------------------------------------
    log("===== Orbit Menu V1 LOADING =====");
    Il2Cpp.perform(function () {
        try {
            ensureClasses();
            installHook();
            log("===== Orbit Menu V1 READY =====");
            log("Waiting for first frame tick to build menu in-game...");
        } catch (e) {
            log("bootstrap err: " + (e && e.stack || e));
        }
    });
})();
