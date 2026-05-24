// ====================================================================
//  Orbit Menu - Animal Company
//  Lunar-style hand GUI shell. Y toggles the panel, right hand points, B selects.
// ====================================================================

(function () {
    "use strict";

    const VERSION = "4.4";
    const LOG_TICKS = 300;
    const PHOTON_SCAN_TICKS = 120;
    const INPUT_REPEAT_TICKS = 14;
    const MENU_DISTANCE = 0.78;
    const MENU_DOWN = 0.04;

    const U = {};
    const AC = {};
    const Photon = { resolved: false, PhotonNetworkClass: null, lastResolveTick: -999999 };

    function log(msg) { console.log("[Orbit] " + msg); }
    function safeString(value) {
        try { return String(value && (value.stack || value.message || value)); }
        catch (_) { return "unknown error"; }
    }

    Il2Cpp.perform(function () {
        log("===== Orbit Menu V" + VERSION + " LOADING =====");

        const core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
        const textModule = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;
        const animal = Il2Cpp.domain.assembly("AnimalCompany").image;
        const inputLegacy = Il2Cpp.domain.tryAssembly("UnityEngine.InputLegacyModule");

        U.GameObject = core.class("UnityEngine.GameObject");
        U.Object = core.class("UnityEngine.Object");
        U.Renderer = core.class("UnityEngine.Renderer");
        U.Material = core.class("UnityEngine.Material");
        U.Shader = core.class("UnityEngine.Shader");
        U.Vector3 = core.class("UnityEngine.Vector3");
        U.Color = core.class("UnityEngine.Color");
        U.Quaternion = core.class("UnityEngine.Quaternion");
        U.Camera = core.class("UnityEngine.Camera");
        U.TextMesh = textModule.tryClass("UnityEngine.TextMesh");
        U.Input = inputLegacy ? inputLegacy.image.tryClass("UnityEngine.Input") : core.tryClass("UnityEngine.Input");

        AC.PlayerController = animal.class("AnimalCompany.PlayerController");
        AC.GorillaLocomotion = animal.class("AnimalCompany.GorillaLocomotion");

        const tabs = ["Status", "Movement", "Visuals", "Player", "Settings"];

        globalThis.orbit = globalThis.orbit || {};
        const orbit = globalThis.orbit;
        const previousVersion = orbit.version || "";
        if (previousVersion !== VERSION) {
            try { if (orbit.root) U.Object.method("Destroy", 1).invoke(orbit.root); } catch (_) {}
            try {
                if (orbit.tmpHandle) {
                    const oldTmp = new Il2Cpp.Object({ handle: ptr(orbit.tmpHandle), klass: U.GameObject });
                    U.Object.method("Destroy", 1).invoke(oldTmp);
                }
            } catch (_) {}
            orbit.hookInstalled = false;
            orbit.hookVersion = "";
        }

        Object.assign(orbit, {
            version: VERSION,
            tickCount: orbit.tickCount || 0,
            hookInstalled: orbit.hookVersion === VERSION,
            hookVersion: orbit.hookVersion || "",
            root: null,
            rows: [],
            labels: [],
            pointer: null,
            visible: true,
            cursor: 0,
            page: "main",
            lastToggleDown: false,
            lastSelectDown: false,
            lastTouchTick: -999999,
            lastMoveTick: -999999,
            lastRenderKey: "",
            photonStatus: "Photon: waiting",
            photonPlayerNames: [],
            lastPhotonScan: -999999,
            lastLog: 0,
            lastVisiblePosition: "",
            sharedMaterial: null,
        });

        function vec3(x, y, z) {
            const v = U.Vector3.alloc();
            v.field("x").value = x;
            v.field("y").value = y;
            v.field("z").value = z;
            return v.unbox();
        }

        function color(r, g, b, a) {
            const c = U.Color.alloc();
            c.field("r").value = r;
            c.field("g").value = g;
            c.field("b").value = b;
            c.field("a").value = a == null ? 1 : a;
            return c.unbox();
        }

        function euler(x, y, z) {
            try { return U.Quaternion.method("Euler", 3).invoke(x, y, z); }
            catch (_) { return null; }
        }

        function primitive(type, name) {
            const go = U.GameObject.method("CreatePrimitive").invoke(type);
            try { go.method("set_name").invoke(Il2Cpp.string(name)); } catch (_) {}
            return go;
        }

        function setParent(child, parent) {
            child.method("get_transform").invoke()
                .method("SetParent", 2)
                .invoke(parent.method("get_transform").invoke(), false);
        }

        function setLocal(go, pos, scale, rot) {
            const t = go.method("get_transform").invoke();
            if (pos) t.method("set_localPosition").invoke(pos);
            if (scale) t.method("set_localScale").invoke(scale);
            if (rot) t.method("set_localRotation").invoke(rot);
        }

        function renderer(go) {
            try { return go.method("GetComponent", 1).inflate(U.Renderer).invoke(); }
            catch (_) { return null; }
        }

        function setColor(go, col) {
            try {
                const r = renderer(go);
                if (!r || r.handle.isNull()) return;
                const mat = r.method("get_material").invoke();
                const shaderNames = [
                    "Universal Render Pipeline/Lit",
                    "Universal Render Pipeline/Unlit",
                    "Hidden/Internal-Colored",
                    "GUI/Text Shader",
                    "Unlit/Color",
                    "Legacy Shaders/Transparent/Diffuse",
                    "Standard",
                    "Sprites/Default",
                ];
                for (let i = 0; i < shaderNames.length; i++) {
                    try {
                        const shader = U.Shader.method("Find").invoke(Il2Cpp.string(shaderNames[i]));
                        if (shader && !shader.handle.isNull()) {
                            mat.method("set_shader").invoke(shader);
                            break;
                        }
                    } catch (_) {}
                }
                mat.method("set_color").invoke(col);
            } catch (_) {}
        }

        function setActive(go, active) {
            try { go.method("SetActive").invoke(active); } catch (_) {}
        }

        function addText(parent, text, x, y, size, col) {
            if (!U.TextMesh) return null;
            const go = U.GameObject.new();
            try { go.method("set_name").invoke(Il2Cpp.string("[Orbit Label]")); } catch (_) {}
            setParent(go, parent);
            const tm = go.method("AddComponent", 1).invoke(U.TextMesh.type.object);
            try { tm.method("set_text").invoke(Il2Cpp.string(text)); } catch (_) {}
            try { tm.method("set_fontSize").invoke(size); } catch (_) {}
            try { tm.method("set_color").invoke(col); } catch (_) {}
            try { tm.method("set_anchor").invoke(3); } catch (_) {}
            try { tm.method("set_alignment").invoke(0); } catch (_) {}
            setLocal(go, vec3(x, y, -0.018), vec3(0.009, 0.009, 0.009), euler(0, 180, 0));
            orbit.labels.push({ go: go, text: tm });
            return tm;
        }

        function inputAxis(name) {
            if (!U.Input) return 0;
            try { return Number(U.Input.method("GetAxis", 1).invoke(Il2Cpp.string(name))) || 0; }
            catch (_) { return 0; }
        }

        function inputButton(name) {
            if (!U.Input) return false;
            try { return U.Input.method("GetButton", 1).invoke(Il2Cpp.string(name)) === true; }
            catch (_) { return false; }
        }

        function inputKey(keyCode) {
            if (!U.Input) return false;
            try { return U.Input.method("GetKey", 1).invoke(keyCode) === true; }
            catch (_) { return false; }
        }

        function leftStickY() {
            const names = ["Oculus_CrossPlatform_PrimaryThumbstickVertical", "PrimaryThumbstickVertical", "LeftStickY", "LeftVertical", "Vertical"];
            for (let i = 0; i < names.length; i++) {
                const value = inputAxis(names[i]);
                if (Math.abs(value) > 0.2) return value;
            }
            return 0;
        }

        function yButtonDown() {
            return inputKey(333) ||
                inputButton("ButtonY") ||
                inputButton("YButton") ||
                inputButton("Oculus_CrossPlatform_SecondaryButtonLeft") ||
                inputButton("Oculus_CrossPlatform_LeftSecondaryButton");
        }

        function bButtonDown() {
            return inputKey(331) ||
                inputButton("ButtonB") ||
                inputButton("BButton") ||
                inputButton("Oculus_CrossPlatform_SecondaryButtonRight") ||
                inputButton("Oculus_CrossPlatform_RightSecondaryButton");
        }

        function getPlayer() {
            try {
                const value = AC.PlayerController.method("get_instance").invoke();
                if (value && !value.handle.isNull()) return value;
            } catch (_) {}
            return null;
        }

        function fieldObject(obj, name) {
            try {
                const f = obj.tryField ? obj.tryField(name) : obj.field(name);
                if (!f) return null;
                const v = f.value;
                if (!v || v.handle.isNull()) return null;
                return v;
            } catch (_) { return null; }
        }

        function getHeadTransform() {
            const player = getPlayer();
            const playerHead = player ? fieldObject(player, "headFollower") ||
                fieldObject(player, "_headTransform") ||
                fieldObject(player, "_cameraTransform") ||
                fieldObject(player, "cameraTransform") : null;
            if (playerHead) return playerHead;

            try {
                const cam = U.Camera.method("get_main").invoke();
                if (cam && !cam.handle.isNull()) return cam.method("get_transform").invoke();
            } catch (_) {}
            return null;
        }

        function getMenuHandTransform() {
            const player = getPlayer();
            if (!player) return null;
            return fieldObject(player, "handTransformLeft") ||
                fieldObject(player, "_handTransformLeft") ||
                fieldObject(player, "leftHandController") ||
                fieldObject(player, "_leftHandController") ||
                fieldObject(player, "handTransformRight") ||
                fieldObject(player, "_handTransformRight");
        }

        function getPointerHandTransform() {
            const player = getPlayer();
            if (!player) return null;
            return fieldObject(player, "handTransformRight") ||
                fieldObject(player, "_handTransformRight") ||
                fieldObject(player, "rightHandController") ||
                fieldObject(player, "_rightHandController");
        }

        function callMethod(target, methodName) {
            try {
                const method = target.tryMethod ? target.tryMethod(methodName) : target.method(methodName);
                return method ? method.invoke() : null;
            } catch (_) { return null; }
        }

        function readField(target, fieldName) {
            try {
                const field = target.tryField ? target.tryField(fieldName) : target.field(fieldName);
                return field ? field.value : null;
            } catch (_) { return null; }
        }

        function jsString(value) {
            if (value == null) return "";
            try { if (value.handle && value.handle.isNull()) return ""; } catch (_) {}
            try { return value.toString(); } catch (_) { return String(value); }
        }

        function tryClass(assemblyNames, className) {
            for (let i = 0; i < assemblyNames.length; i++) {
                try {
                    const assembly = Il2Cpp.domain.tryAssembly(assemblyNames[i]);
                    if (!assembly) continue;
                    const klass = assembly.image.tryClass(className);
                    if (klass) return klass;
                } catch (_) {}
            }
            return null;
        }

        function resolvePhoton() {
            if (Photon.resolved) return true;
            if (orbit.tickCount - Photon.lastResolveTick < PHOTON_SCAN_TICKS) return false;
            Photon.lastResolveTick = orbit.tickCount;
            Photon.PhotonNetworkClass = tryClass(["PhotonUnityNetworking", "PhotonRealtime", "Assembly-CSharp", "AnimalCompany"], "Photon.Pun.PhotonNetwork");
            Photon.resolved = !!Photon.PhotonNetworkClass;
            if (Photon.resolved) log("PhotonNetwork class resolved");
            return Photon.resolved;
        }

        function refreshPhotonPlayers() {
            if (orbit.tickCount - orbit.lastPhotonScan < PHOTON_SCAN_TICKS) return;
            orbit.lastPhotonScan = orbit.tickCount;
            if (!resolvePhoton()) {
                orbit.photonStatus = "Photon: resolving";
                orbit.photonPlayerNames = [];
                return;
            }
            try {
                if (callMethod(Photon.PhotonNetworkClass, "get_InRoom") === false) {
                    orbit.photonStatus = "Photon: not in room";
                    orbit.photonPlayerNames = [];
                    return;
                }
                const players = callMethod(Photon.PhotonNetworkClass, "get_PlayerList");
                if (!players || typeof players.length !== "number") {
                    orbit.photonStatus = "Photon: player list unavailable";
                    orbit.photonPlayerNames = [];
                    return;
                }
                const names = [];
                const count = Math.min(players.length, 10);
                for (let i = 0; i < count; i++) {
                    const player = players.get(i);
                    let name = jsString(callMethod(player, "get_NickName") || readField(player, "NickName") || callMethod(player, "get_UserId")).trim();
                    if (!name) name = "Player " + (i + 1);
                    if (name.length > 18) name = name.slice(0, 15) + "...";
                    names.push(name);
                }
                orbit.photonPlayerNames = names;
                orbit.photonStatus = names.length ? "Photon Players (" + names.length + ")" : "Photon: no players found";
            } catch (e) {
                orbit.photonStatus = "Photon: read failed";
                orbit.photonPlayerNames = [];
                log("Photon scan failed: " + safeString(e));
            }
        }

        function currentItems() {
            if (orbit.page === "main") return tabs.map(function (name) { return { label: name, type: "tab", target: name.toLowerCase(), locked: false }; });
            if (orbit.page === "movement") return [
                { label: "Fly", type: "locked", locked: true },
                { label: "Platforms", type: "locked", locked: true },
                { label: "Back", type: "back", locked: false },
            ];
            return [{ label: "Back", type: "back", locked: false }];
        }

        function clampCursor() {
            const items = currentItems();
            if (orbit.cursor < 0) orbit.cursor = items.length - 1;
            if (orbit.cursor >= items.length) orbit.cursor = 0;
        }

        function selectCurrent() {
            const item = currentItems()[orbit.cursor];
            if (!item) return;
            if (item.type === "tab") {
                orbit.page = item.target;
                orbit.cursor = 0;
            } else if (item.type === "back") {
                orbit.page = "main";
                orbit.cursor = 0;
            } else if (item.type === "locked") {
                log(item.label + " is disabled in multiplayer builds.");
            }
            rebuildRows();
        }

        function destroyRows() {
            const all = orbit.rows.concat(orbit.labels.map(function (l) { return l.go; }));
            for (let i = 0; i < all.length; i++) {
                try { U.Object.method("Destroy", 1).invoke(all[i]); } catch (_) {}
            }
            orbit.rows = [];
            orbit.labels = [];
        }

        function rowColor(item, selected) {
            if (item.type === "back") return selected ? color(1, 0.12, 0.12, 1) : color(0.55, 0.02, 0.02, 1);
            if (item.locked) return selected ? color(0.38, 0.38, 0.38, 1) : color(0.18, 0.18, 0.18, 1);
            return selected ? color(0.95, 0.72, 0.08, 1) : color(0.08, 0.09, 0.12, 1);
        }

        function rebuildRows() {
            if (!orbit.root) return;
            destroyRows();
            refreshPhotonPlayers();

            addText(orbit.root, "ORBIT V" + VERSION, -0.145, 0.105, 28, color(0.74, 0.53, 1, 1));
            addText(orbit.root, orbit.page === "main" ? "LUNAR STYLE TABS" : orbit.page.toUpperCase(), -0.145, 0.078, 17, color(0.65, 0.65, 0.7, 1));
            const items = currentItems();
            clampCursor();

            const startY = 0.035;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const y = startY - i * 0.042;
                addText(orbit.root, (i === orbit.cursor ? "> " : "  ") + "[ " + item.label + " ]" + (item.locked ? "  locked" : ""), -0.145, y - 0.01, 22, item.type === "back" ? color(1, 0.2, 0.2, 1) : (i === orbit.cursor ? color(1, 0.84, 0.1, 1) : color(1, 1, 1, 1)));
            }

            addText(orbit.root, orbit.photonStatus, -0.145, -0.13, 14, color(0.5, 0.82, 1, 1));
            for (let i = 0; i < Math.min(orbit.photonPlayerNames.length, 3); i++) {
                addText(orbit.root, "- " + orbit.photonPlayerNames[i], -0.145, -0.155 - i * 0.022, 13, color(0.85, 0.92, 1, 1));
            }
        }

        function buildMenu() {
            if (orbit.root) return;

            const root = U.GameObject.new();
            root.method("set_name").invoke(Il2Cpp.string("[Orbit Cube Menu]"));

            const panel = primitive(5, "[Orbit GUI Panel]");
            setParent(panel, root);
            setLocal(panel, vec3(0, 0, 0), vec3(0.34, 0.255, 1), euler(0, 180, 0));
            setColor(panel, color(0.012, 0.012, 0.018, 1));

            const borderColor = color(0.44, 0.2, 1, 1);
            const top = primitive(5, "[Orbit Border Top]");
            setParent(top, root);
            setLocal(top, vec3(0, 0.132, -0.006), vec3(0.36, 0.012, 1), euler(0, 180, 0));
            setColor(top, borderColor);

            const bottom = primitive(5, "[Orbit Border Bottom]");
            setParent(bottom, root);
            setLocal(bottom, vec3(0, -0.132, -0.006), vec3(0.36, 0.012, 1), euler(0, 180, 0));
            setColor(bottom, borderColor);

            const left = primitive(5, "[Orbit Border Left]");
            setParent(left, root);
            setLocal(left, vec3(-0.18, 0, -0.006), vec3(0.012, 0.255, 1), euler(0, 180, 0));
            setColor(left, borderColor);

            const right = primitive(5, "[Orbit Border Right]");
            setParent(right, root);
            setLocal(right, vec3(0.18, 0, -0.006), vec3(0.012, 0.255, 1), euler(0, 180, 0));
            setColor(right, borderColor);

            orbit.root = root;
            rebuildRows();
            setActive(root, orbit.visible);
            log("cube menu built: " + root.handle.toString());
        }

        function buildPointer() {
            if (orbit.pointer) return;
            const pointer = primitive(0, "[Orbit Finger Selector]");
            setLocal(pointer, vec3(0, 0, 0), vec3(0.018, 0.018, 0.018), null);
            setColor(pointer, color(0.05, 0.85, 1, 1));
            orbit.pointer = pointer;
            log("finger selector built: " + pointer.handle.toString());
        }

        function placeMenu() {
            if (!orbit.root) return;
            const hand = getMenuHandTransform();
            const fallbackHead = hand ? null : getHeadTransform();
            const anchor = hand || fallbackHead;
            if (!anchor) return;
            try {
                const t = orbit.root.method("get_transform").invoke();
                if (hand) {
                    t.method("set_position").invoke(hand.method("get_position").invoke());
                    try {
                        const q = hand.method("get_rotation").invoke();
                        const e = q.method("get_eulerAngles").invoke();
                        const ex = e.field("x").value;
                        const ey = e.field("y").value;
                        const ez = e.field("z").value;
                        t.method("set_rotation").invoke(euler(ex, ey, ez));
                    } catch (_) {
                        try { t.method("set_rotation").invoke(hand.method("get_rotation").invoke()); } catch (_) {}
                    }
                    orbit.lastVisiblePosition = "hand";
                    return;
                }

                const hp = fallbackHead.method("get_position").invoke();
                const hf = fallbackHead.method("get_forward").invoke();
                const x = hp.field("x").value + hf.field("x").value * MENU_DISTANCE;
                const y = hp.field("y").value + hf.field("y").value * MENU_DISTANCE - MENU_DOWN;
                const z = hp.field("z").value + hf.field("z").value * MENU_DISTANCE;
                t.method("set_position").invoke(vec3(x, y, z));
                try { t.method("set_rotation").invoke(fallbackHead.method("get_rotation").invoke()); } catch (_) {}
                orbit.lastVisiblePosition = x.toFixed(2) + "," + y.toFixed(2) + "," + z.toFixed(2);
            } catch (e) {
                log("placeMenu failed: " + safeString(e));
            }
        }

        function placePointer() {
            if (!orbit.pointer) return;
            const hand = getPointerHandTransform();
            if (!hand) return;
            try {
                const hp = hand.method("get_position").invoke();
                const hf = hand.method("get_forward").invoke();
                const hu = hand.method("get_up").invoke();
                const x = hp.field("x").value + hf.field("x").value * 0.08 + hu.field("x").value * 0.035;
                const y = hp.field("y").value + hf.field("y").value * 0.08 + hu.field("y").value * 0.035;
                const z = hp.field("z").value + hf.field("z").value * 0.08 + hu.field("z").value * 0.035;
                const t = orbit.pointer.method("get_transform").invoke();
                t.method("set_position").invoke(vec3(x, y, z));
            } catch (e) {
                log("placePointer failed: " + safeString(e));
            }
        }

        function updatePointerHover() {
            if (!orbit.visible || !orbit.root || !orbit.pointer) return;
            try {
                const rootT = orbit.root.method("get_transform").invoke();
                const pointerPos = orbit.pointer.method("get_transform").invoke().method("get_position").invoke();
                const local = rootT.method("InverseTransformPoint", 1).invoke(pointerPos);
                const px = local.field("x").value;
                const py = local.field("y").value;
                const pz = local.field("z").value;
                if (px < -0.19 || px > 0.19 || py < -0.13 || py > 0.08) return;

                const items = currentItems();
                const startY = 0.035;
                let best = orbit.cursor;
                let bestDist = 999;
                for (let i = 0; i < items.length; i++) {
                    const rowY = startY - i * 0.042;
                    const d = Math.abs(py - rowY);
                    if (d < bestDist) {
                        best = i;
                        bestDist = d;
                    }
                }
                if (bestDist < 0.032 && best !== orbit.cursor) {
                    orbit.cursor = best;
                    rebuildRows();
                }
                if (bestDist < 0.032 && Math.abs(pz) < 0.055 && orbit.tickCount - orbit.lastTouchTick > 22) {
                    orbit.lastTouchTick = orbit.tickCount;
                    selectCurrent();
                }
            } catch (_) {}
        }

        function updateInput() {
            const toggleDown = yButtonDown();
            if (toggleDown && !orbit.lastToggleDown) {
                orbit.visible = !orbit.visible;
                if (orbit.root) setActive(orbit.root, orbit.visible);
                if (orbit.visible) rebuildRows();
                log("cube menu " + (orbit.visible ? "opened" : "closed"));
            }
            orbit.lastToggleDown = toggleDown;

            if (!orbit.visible) {
                orbit.lastSelectDown = false;
                return;
            }

            const y = leftStickY();
            if (Math.abs(y) > 0.55 && orbit.tickCount - orbit.lastMoveTick >= INPUT_REPEAT_TICKS) {
                orbit.cursor += y > 0 ? -1 : 1;
                clampCursor();
                orbit.lastMoveTick = orbit.tickCount;
                rebuildRows();
            }

            const selectDown = bButtonDown();
            if (selectDown && !orbit.lastSelectDown) selectCurrent();
            orbit.lastSelectDown = selectDown;
        }

        function onTick() {
            orbit.tickCount++;
            try {
                buildMenu();
                buildPointer();
                updateInput();
                placePointer();
                if (orbit.visible) {
                    placeMenu();
                    updatePointerHover();
                }
            } catch (e) {
                log("menu tick failed: " + safeString(e));
            }

            if (orbit.tickCount - orbit.lastLog >= LOG_TICKS) {
                orbit.lastLog = orbit.tickCount;
                log("tick " + orbit.tickCount +
                    " cube=true visible=" + orbit.visible +
                    " page=" + orbit.page +
                    " pos=" + orbit.lastVisiblePosition);
            }
        }

        function installHook() {
            if (orbit.hookInstalled && orbit.hookVersion === VERSION) return;
            const target = AC.GorillaLocomotion.tryMethod("OnUpdate") || AC.GorillaLocomotion.tryMethod("FixedUpdate");
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
            orbit.hookVersion = VERSION;
            log("hook installed on GorillaLocomotion." + target.name);
        }

        installHook();
        log("===== Orbit Menu V" + VERSION + " READY =====");
    });
})();
