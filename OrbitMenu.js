// ====================================================================
//  Orbit Menu V2.1 — Animal Company
//  Uses TextMeshPro 3D (like Juelz). NO Canvas. Anchored to Camera.main.
//  Load: bridge -> Frida-Map -> this file.
// ====================================================================

(function () {
    "use strict";

    const _u = {
        GameObject: null, Transform: null, Vector3: null, Color: null,
        Camera: null, Object: null,
        MeshRenderer: null, MeshFilter: null,
    };
    const _tmp = {
        TextMeshPro: null,
    };
    const _ac = {
        PlayerController: null,
        GorillaLocomotion: null,
    };

    globalThis.orbit = globalThis.orbit || {
        tickCount: 0,
        hookInstalled: false,
        visible: false,
        tmpHandle: null,        // the TextMeshPro game object
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
            _u.GameObject   = core.class("UnityEngine.GameObject");
            _u.Transform    = core.class("UnityEngine.Transform");
            _u.Vector3      = core.class("UnityEngine.Vector3");
            _u.Color        = core.class("UnityEngine.Color");
            _u.Object       = core.class("UnityEngine.Object");
            _u.Camera       = core.class("UnityEngine.Camera");
            _u.MeshRenderer = core.tryClass("UnityEngine.MeshRenderer");
            _u.MeshFilter   = core.tryClass("UnityEngine.MeshFilter");

            // TextMeshPro lives in Unity.TextMeshPro assembly
            const tmpAsm = Il2Cpp.domain.tryAssembly("Unity.TextMeshPro");
            if (tmpAsm) {
                _tmp.TextMeshPro = tmpAsm.image.tryClass("TMPro.TextMeshPro");
            }

            const acAsm = Il2Cpp.domain.tryAssembly("AnimalCompany");
            if (acAsm) {
                _ac.PlayerController  = acAsm.image.tryClass("AnimalCompany.PlayerController");
                _ac.GorillaLocomotion = acAsm.image.tryClass("AnimalCompany.GorillaLocomotion");
            }
            log("classes: GO=" + !!_u.GameObject + " Cam=" + !!_u.Camera +
                " TMP=" + !!_tmp.TextMeshPro + " PC=" + !!_ac.PlayerController +
                " GL=" + !!_ac.GorillaLocomotion);
            return true;
        } catch (e) { log("ensureClasses err: " + e); return false; }
    }

    function mkVec3(x,y,z) { const v=_u.Vector3.alloc(); v.field("x").value=x; v.field("y").value=y; v.field("z").value=z; return v.unbox(); }
    function mkColor(r,g,b,a){ const c=_u.Color.alloc(); c.field("r").value=r; c.field("g").value=g; c.field("b").value=b; c.field("a").value=a==null?1:a; return c.unbox(); }

    function getCameraTransform() {
        // First try Camera.main (Juelz's approach)
        try {
            const cam = _u.Camera.method("get_main").invoke();
            if (cam && !cam.handle.isNull()) return cam.method("get_transform").invoke();
        } catch (_) {}
        // Fallback: PlayerController._cameraTransform
        if (_ac.PlayerController) {
            try {
                const p = _ac.PlayerController.method("get_instance").invoke();
                if (p && !p.handle.isNull()) {
                    const ct = p.tryField("_cameraTransform");
                    if (ct && ct.value && !ct.value.handle.isNull()) return ct.value;
                }
            } catch (_) {}
        }
        return null;
    }

    function rewrap(handleStr, cls) {
        try { return new Il2Cpp.Object({ handle: ptr(handleStr), klass: cls || _u.GameObject }); }
        catch (_) { return null; }
    }

    function newGameObject(name) {
        const go = _u.GameObject.new();
        try { go.method("set_name").invoke(Il2Cpp.string(name)); } catch (_) {}
        return go;
    }

    function buildMenu() {
        if (orbit.tmpHandle || orbit.buildFailed) return;
        log("building menu (attempt 1)...");

        function stage(label, fn) {
            try { log("  step: " + label); return fn(); }
            catch (e) { throw new Error("at '" + label + "': " + (e && (e.message || e))); }
        }

        try {
            ensureClasses();
            if (!_tmp.TextMeshPro) throw new Error("TMPro.TextMeshPro not found in Unity.TextMeshPro assembly");

            const go = stage("new GameObject(OrbitMenu)", () => newGameObject("OrbitMenu"));
            const tmp = stage("AddComponent<TMPro.TextMeshPro>", () => {
                return go.method("AddComponent", 1).invoke(_tmp.TextMeshPro.type.object);
            });
            if (!tmp || tmp.handle.isNull()) throw new Error("AddComponent<TextMeshPro> returned null");

            stage("set_text", () => tmp.method("set_text").invoke(Il2Cpp.string(renderMenuText())));
            stage("set_color", () => tmp.method("set_color").invoke(mkColor(1, 1, 1, 1)));
            stage("set_fontSize", () => tmp.method("set_fontSize").invoke(0.5));
            stage("set_alignment(Center)", () => {
                try { tmp.method("set_alignment").invoke(514); } catch (_) {}  // TextAlignmentOptions.Center == 514
            });

            // Position 0.7m in front of camera
            const camT = stage("get camera transform", getCameraTransform);
            if (camT) {
                stage("parent to camera", () => {
                    go.method("get_transform").invoke()
                      .method("SetParent", 1).invoke(camT);
                });
                stage("localPosition (0,0,0.7)", () => {
                    go.method("get_transform").invoke().method("set_localPosition").invoke(mkVec3(0, 0, 0.7));
                });
                stage("localRotation reset", () => {
                    const Quat = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image.class("UnityEngine.Quaternion");
                    const q = Quat.alloc();
                    q.field("x").value=0; q.field("y").value=0; q.field("z").value=0; q.field("w").value=1;
                    go.method("get_transform").invoke().method("set_localRotation").invoke(q.unbox());
                });
                stage("localScale", () => {
                    go.method("get_transform").invoke().method("set_localScale").invoke(mkVec3(1, 1, 1));
                });
            }

            orbit.tmpHandle = go.handle.toString();
            orbit.visible = true;
            log("MENU BUILT! tmp=" + orbit.tmpHandle);
        } catch (e) {
            orbit.buildFailed = true;
            orbit.buildFailReason = String(e && (e.stack || e.message || e));
            log("BUILD FAILED (giving up): " + orbit.buildFailReason);
        }
    }

    function renderMenuText() {
        const lines = ["<color=#bb88ff>testing</color>", ""];
        for (let i = 0; i < orbit.buttonCount; i++) {
            const arrow = (i === orbit.cursor) ? "<color=#ffcc00>></color> " : "  ";
            lines.push(arrow + "[ Button " + (i + 1) + " ]");
        }
        return lines.join("\n");
    }

    function refreshText() {
        if (!orbit.tmpHandle) return;
        try {
            const go = rewrap(orbit.tmpHandle, _u.GameObject);
            if (!go) return;
            const tmp = go.method("GetComponent", 1).invoke(_tmp.TextMeshPro.type.object);
            if (tmp && !tmp.handle.isNull()) {
                tmp.method("set_text").invoke(Il2Cpp.string(renderMenuText()));
            }
        } catch (_) {}
    }

    function onTick() {
        orbit.tickCount++;
        if (!orbit.tmpHandle && !orbit.buildFailed) { buildMenu(); return; }
        if (orbit.tickCount - orbit.lastLog >= 300) {
            orbit.lastLog = orbit.tickCount;
            log("tick " + orbit.tickCount + " visible=" + orbit.visible +
                " built=" + !!orbit.tmpHandle + " failed=" + orbit.buildFailed);
        }
    }

    function installHook() {
        if (orbit.hookInstalled) return;
        if (!_ac.GorillaLocomotion) { log("ERROR: GorillaLocomotion missing"); return; }
        let target = _ac.GorillaLocomotion.tryMethod("OnUpdate") || _ac.GorillaLocomotion.tryMethod("FixedUpdate");
        if (!target) { log("ERROR: no OnUpdate/FixedUpdate"); return; }
        Interceptor.attach(target.virtualAddress, {
            onEnter: function () { try { onTick(); } catch (_) {} }
        });
        orbit.hookInstalled = true;
        log("hook installed on " + target.name);
    }

    log("===== Orbit Menu V2.1 LOADING =====");
    Il2Cpp.perform(function () {
        try {
            ensureClasses();
            installHook();
            log("===== Orbit Menu V2.1 READY =====");
        } catch (e) { log("bootstrap err: " + e); }
    });
})();
