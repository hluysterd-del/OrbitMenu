// ====================================================================
//  Orbit - Animal Company
//  Camera-attached controller menu with Orbit branding.
// ====================================================================

(function () {
    "use strict";

    const VERSION = "5.1";
    const LOG_TICKS = 300;
    const INPUT_REPEAT_TICKS = 12;
    const PHOTON_SCAN_TICKS = 120;

    const U = {};
    const AC = {};
    const TMP = {};
    const Photon = { resolved: false, PhotonNetworkClass: null, lastResolveTick: -999999 };

    function log(msg) { console.log("[Orbit] " + msg); }
    function safeString(value) {
        try { return String(value && (value.stack || value.message || value)); }
        catch (_) { return "unknown error"; }
    }

    Il2Cpp.perform(function () {
        log("===== Orbit Menu V" + VERSION + " LOADING =====");

        const core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
        const animal = Il2Cpp.domain.assembly("AnimalCompany").image;
        const inputLegacy = Il2Cpp.domain.tryAssembly("UnityEngine.InputLegacyModule");
        const tmpAsm = Il2Cpp.domain.tryAssembly("Unity.TextMeshPro");

        U.GameObject = core.class("UnityEngine.GameObject");
        U.Object = core.class("UnityEngine.Object");
        U.Camera = core.class("UnityEngine.Camera");
        U.Transform = core.class("UnityEngine.Transform");
        U.Vector3 = core.class("UnityEngine.Vector3");
        U.Quaternion = core.class("UnityEngine.Quaternion");
        U.Color = core.class("UnityEngine.Color");
        U.Input = inputLegacy ? inputLegacy.image.tryClass("UnityEngine.Input") : core.tryClass("UnityEngine.Input");

        AC.GorillaLocomotion = animal.class("AnimalCompany.GorillaLocomotion");
        AC.PlayerController = animal.class("AnimalCompany.PlayerController");
        TMP.TextMeshPro = tmpAsm ? tmpAsm.image.tryClass("TMPro.TextMeshPro") : null;

        globalThis.orbit = globalThis.orbit || {};
        const orbit = globalThis.orbit;
        if (orbit.version && orbit.version !== VERSION) {
            try {
                if (orbit.rootHandle) {
                    const oldRoot = new Il2Cpp.Object({ handle: ptr(orbit.rootHandle), klass: U.GameObject });
                    U.Object.method("Destroy", 1).invoke(oldRoot);
                }
            } catch (_) {}
            orbit.hookInstalled = false;
            orbit.hookVersion = "";
        }

        Object.assign(orbit, {
            version: VERSION,
            hookInstalled: orbit.hookVersion === VERSION,
            hookVersion: orbit.hookVersion || "",
            tickCount: orbit.tickCount || 0,
            rootHandle: null,
            textHandle: null,
            visible: true,
            page: "main",
            cursor: 0,
            toggles: orbit.toggles || {},
            lastText: "",
            lastMoveTick: -999999,
            lastToggleDown: false,
            lastSelectDown: false,
            lastControlHeld: false,
            lastLog: 0,
            photonStatus: "Photon: resolving",
            photonPlayerNames: [],
            lastPhotonScan: -999999,
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

        function identity() {
            try { return U.Quaternion.method("get_identity").invoke(); }
            catch (_) { return [0, 0, 0, 1]; }
        }

        function rootObject() {
            if (!orbit.rootHandle) return null;
            try { return new Il2Cpp.Object({ handle: ptr(orbit.rootHandle), klass: U.GameObject }); }
            catch (_) { return null; }
        }

        function textObject() {
            if (!orbit.textHandle) return null;
            try { return new Il2Cpp.Object({ handle: ptr(orbit.textHandle), klass: U.GameObject }); }
            catch (_) { return null; }
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

        function anyButton(names) {
            for (let i = 0; i < names.length; i++) if (inputButton(names[i])) return true;
            return false;
        }

        function axisFrom(names) {
            for (let i = 0; i < names.length; i++) {
                const value = inputAxis(names[i]);
                if (Math.abs(value) > 0.2) return value;
            }
            return 0;
        }

        function rightStickY() {
            return axisFrom([
                "Oculus_CrossPlatform_SecondaryThumbstickVertical",
                "Oculus_CrossPlatform_RightThumbstickVertical",
                "SecondaryThumbstickVertical",
                "RightThumbstickVertical",
                "RightStickY",
                "RightVertical",
                "Joystick2Axis4",
            ]);
        }

        function leftStickPressed() {
            return inputKey(338) ||
                anyButton([
                    "Oculus_CrossPlatform_PrimaryThumbstick",
                    "Oculus_CrossPlatform_PrimaryThumbstickClick",
                    "Oculus_CrossPlatform_LeftThumbstick",
                    "PrimaryThumbstick",
                    "PrimaryThumbstickClick",
                    "LeftThumbstick",
                    "LeftStickPress",
                    "LeftStickClick",
                ]);
        }

        function yButtonDown() {
            return inputKey(333) ||
                anyButton(["ButtonY", "YButton", "Oculus_CrossPlatform_SecondaryButtonLeft", "Oculus_CrossPlatform_LeftSecondaryButton"]);
        }

        function bButtonDown() {
            return inputKey(331) ||
                anyButton(["ButtonB", "BButton", "Oculus_CrossPlatform_SecondaryButtonRight", "Oculus_CrossPlatform_RightSecondaryButton"]);
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
                for (let i = 0; i < Math.min(players.length, 8); i++) {
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
            }
        }

        function item(label, type, id, target) {
            return { label: label, type: type, id: id || "", target: target || "" };
        }

        function currentItems() {
            if (orbit.page === "main") {
                return [
                    item("Status", "tab", "", "status"),
                    item("Movement", "tab", "", "movement"),
                    item("Visuals", "tab", "", "visuals"),
                    item("Player", "tab", "", "player"),
                    item("Settings", "tab", "", "settings"),
                ];
            }
            if (orbit.page === "status") {
                return [
                    item("Lobby Players", "placeholder", "status_players"),
                    item("Back", "back"),
                ];
            }
            if (orbit.page === "movement") {
                return [
                    item("Fly", "placeholder", "movement_fly"),
                    item("Platforms", "placeholder", "movement_platforms"),
                    item("Back", "back"),
                ];
            }
            if (orbit.page === "visuals") {
                return [
                    item("Name Tags", "placeholder", "visuals_names"),
                    item("Beacons", "placeholder", "visuals_beacons"),
                    item("Back", "back"),
                ];
            }
            if (orbit.page === "player") {
                return [
                    item("Player Info", "placeholder", "player_info"),
                    item("Color Preview", "placeholder", "player_color"),
                    item("Back", "back"),
                ];
            }
            if (orbit.page === "settings") {
                return [
                    item("Compact Text", "placeholder", "settings_compact"),
                    item("Back", "back"),
                ];
            }
            return [item("Back", "back")];
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
                log("opened " + item.label);
            } else if (item.type === "back") {
                orbit.page = "main";
                orbit.cursor = 0;
                log("back to main");
            } else if (item.type === "placeholder") {
                orbit.toggles[item.id] = !orbit.toggles[item.id];
                log(item.label + " placeholder " + (orbit.toggles[item.id] ? "enabled" : "disabled"));
            }
            orbit.lastText = "";
        }

        function renderText() {
            refreshPhotonPlayers();
            clampCursor();
            if (!orbit.visible) return "";

            const lines = [
                "<color=#bb88ff><b>Orbit</b></color>",
                orbit.page === "main" ? "<color=#888888>Menu</color>" : "<color=#888888>" + orbit.page + "</color>",
                "",
            ];
            const items = currentItems();
            for (let i = 0; i < items.length; i++) {
                const entry = items[i];
                const isSelected = i === orbit.cursor;
                const enabled = entry.type === "placeholder" && !!orbit.toggles[entry.id];
                const colorTag = entry.type === "back" ? "#ff4444" : (isSelected ? "#ffcc00" : "#ffffff");
                const arrow = isSelected ? "<color=#ffcc00>></color> " : "  ";
                let suffix = "";
                if (entry.type === "placeholder") {
                    suffix = enabled ? " <color=#55ff99>ON</color>" : " <color=#777777>OFF</color>";
                }
                lines.push(arrow + "<color=" + colorTag + ">[ " + entry.label + " ]</color>" + suffix);
            }
            lines.push("");
            lines.push("<color=#88ccff>" + orbit.photonStatus + "</color>");
            for (let i = 0; i < Math.min(orbit.photonPlayerNames.length, 4); i++) {
                lines.push("  - " + orbit.photonPlayerNames[i]);
            }
            return lines.join("\n");
        }

        function updateInput() {
            const toggleDown = yButtonDown();
            if (toggleDown && !orbit.lastToggleDown) {
                orbit.visible = !orbit.visible;
                orbit.lastText = "";
                log("menu " + (orbit.visible ? "opened" : "closed"));
            }
            orbit.lastToggleDown = toggleDown;

            if (!orbit.visible) {
                orbit.lastSelectDown = false;
                orbit.lastControlHeld = false;
                return;
            }

            const controlHeld = leftStickPressed();
            if (controlHeld !== orbit.lastControlHeld) {
                orbit.lastText = "";
                orbit.lastControlHeld = controlHeld;
            }
            if (!controlHeld) {
                orbit.lastSelectDown = false;
                return;
            }

            const y = rightStickY();
            if (Math.abs(y) > 0.55 && orbit.tickCount - orbit.lastMoveTick >= INPUT_REPEAT_TICKS) {
                orbit.cursor += y > 0 ? -1 : 1;
                clampCursor();
                orbit.lastMoveTick = orbit.tickCount;
                orbit.lastText = "";
            }

            const selectDown = bButtonDown();
            if (selectDown && !orbit.lastSelectDown) selectCurrent();
            orbit.lastSelectDown = selectDown;
        }

        function buildMenu() {
            if (orbit.rootHandle) return;
            if (!TMP.TextMeshPro) throw new Error("TMPro.TextMeshPro not found");

            const go = U.GameObject.new();
            go.method("set_name").invoke(Il2Cpp.string("[Orbit Camera Menu]"));
            const tmp = go.method("AddComponent", 1).invoke(TMP.TextMeshPro.type.object);
            if (!tmp || tmp.handle.isNull()) throw new Error("AddComponent<TextMeshPro> returned null");

            tmp.method("set_text").invoke(Il2Cpp.string(renderText()));
            tmp.method("set_color").invoke(color(1, 1, 1, 1));
            tmp.method("set_fontSize").invoke(2.85);
            try { tmp.method("set_alignment").invoke(514); } catch (_) {}

            const cam = U.Camera.method("get_main").invoke();
            if (!cam || cam.handle.isNull()) throw new Error("Camera.main not found");
            const camTransform = cam.method("get_transform").invoke();
            const t = go.method("get_transform").invoke();
            t.method("SetParent", 2).invoke(camTransform, false);
            t.method("set_localPosition").invoke(vec3(-0.24, 0.05, 0.72));
            t.method("set_localRotation").invoke(identity());
            t.method("set_localScale").invoke(vec3(0.045, 0.045, 0.045));

            U.Object.method("DontDestroyOnLoad").invoke(go);
            orbit.rootHandle = go.handle.toString();
            orbit.textHandle = go.handle.toString();
            log("camera menu built: " + orbit.rootHandle);
        }

        function updateText() {
            const go = textObject();
            if (!go) return;
            const next = renderText();
            if (next === orbit.lastText) return;
            orbit.lastText = next;
            const tmp = go.method("GetComponent", 1).invoke(TMP.TextMeshPro.type.object);
            tmp.method("set_text").invoke(Il2Cpp.string(next));
        }

        function onTick() {
            orbit.tickCount++;
            try {
                if (!orbit.rootHandle) buildMenu();
                updateInput();
                updateText();
            } catch (e) {
                log("menu tick failed: " + safeString(e));
            }
            if (orbit.tickCount - orbit.lastLog >= LOG_TICKS) {
                orbit.lastLog = orbit.tickCount;
                log("tick " + orbit.tickCount + " camera=true visible=" + orbit.visible + " page=" + orbit.page + " cursor=" + orbit.cursor + " controlHeld=" + orbit.lastControlHeld);
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

