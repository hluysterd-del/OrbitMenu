// ====================================================================
//  Orbit Menu - Animal Company
//  Visibility-first world-space Canvas + UI.Text panel.
// ====================================================================

(function () {
    "use strict";

    const VERSION = "3.4";
    const LOG_TICKS = 300;
    const PHOTON_SCAN_TICKS = 120;
    const INPUT_REPEAT_TICKS = 14;
    const MENU_DISTANCE = 0.95;
    const MENU_DOWN = 0.04;
    const MENU_SCALE = 0.00072;

    const U = {};
    const AC = {};
    const Photon = {
        resolved: false,
        PhotonNetworkClass: null,
        lastResolveTick: -999999,
    };

    function log(msg) { console.log("[Orbit] " + msg); }
    function safeString(value) {
        try { return String(value && (value.stack || value.message || value)); }
        catch (_) { return "unknown error"; }
    }

    Il2Cpp.perform(function () {
        log("===== Orbit Menu V" + VERSION + " LOADING =====");

        const core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
        const uiModule = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
        const ui = Il2Cpp.domain.assembly("UnityEngine.UI").image;
        const text = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;
        const animal = Il2Cpp.domain.assembly("AnimalCompany").image;

        U.GameObject = core.class("UnityEngine.GameObject");
        U.Object = core.class("UnityEngine.Object");
        U.Transform = core.class("UnityEngine.Transform");
        U.RectTransform = core.class("UnityEngine.RectTransform");
        U.Vector2 = core.class("UnityEngine.Vector2");
        U.Vector3 = core.class("UnityEngine.Vector3");
        U.Color = core.class("UnityEngine.Color");
        U.Canvas = uiModule.class("UnityEngine.Canvas");
        U.Text = ui.class("UnityEngine.UI.Text");
        U.CanvasScaler = ui.tryClass("UnityEngine.UI.CanvasScaler");
        U.GraphicRaycaster = ui.tryClass("UnityEngine.UI.GraphicRaycaster");
        U.Font = text.class("UnityEngine.Font");
        try {
            const inputLegacy = Il2Cpp.domain.tryAssembly("UnityEngine.InputLegacyModule");
            U.Input = inputLegacy ? inputLegacy.image.tryClass("UnityEngine.Input") : core.tryClass("UnityEngine.Input");
        } catch (_) {
            U.Input = null;
        }
        AC.PlayerController = animal.class("AnimalCompany.PlayerController");
        AC.GorillaLocomotion = animal.class("AnimalCompany.GorillaLocomotion");

        globalThis.orbit = Object.assign({
            version: VERSION,
            tickCount: 0,
            hookInstalled: false,
            menuInited: false,
            root: null,
            text: null,
            cursor: 0,
            page: "main",
            menuHeld: false,
            lastMoveTick: -999999,
            lastSelectDown: false,
            lastMenuHeld: false,
            buttonLabels: ["Status", "Movement", "Visuals", "Player", "Settings"],
            photonPlayerNames: [],
            photonStatus: "Photon: waiting",
            lastPhotonScan: -999999,
            lastLog: 0,
            lastText: "",
            lastVisiblePosition: "",
        }, globalThis.orbit || {});

        const orbit = globalThis.orbit;
        orbit.version = VERSION;
        if (!Array.isArray(orbit.buttonLabels) || orbit.buttonLabels.length === 0) {
            orbit.buttonLabels = ["Status", "Movement", "Visuals", "Player", "Settings"];
        }
        if (!Array.isArray(orbit.photonPlayerNames)) orbit.photonPlayerNames = [];
        if (typeof orbit.page !== "string") orbit.page = "main";

        function vec2(x, y) {
            const v = U.Vector2.alloc();
            v.field("x").value = x;
            v.field("y").value = y;
            return v.unbox();
        }

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

        function newGameObject(name) {
            const go = U.GameObject.new();
            try { go.method("set_name").invoke(Il2Cpp.string(name)); } catch (_) {}
            return go;
        }

        function addComponent(go, klass) {
            try { return go.method("AddComponent", 1).invoke(klass.type.object); }
            catch (e) {
                log("AddComponent<" + klass.name + "> failed: " + safeString(e));
                return null;
            }
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
                const field = obj.tryField ? obj.tryField(name) : obj.field(name);
                if (!field) return null;
                const value = field.value;
                if (!value || value.handle.isNull()) return null;
                return value;
            } catch (_) {
                return null;
            }
        }

        function getHeadTransform() {
            const player = getPlayer();
            if (!player) return null;
            return fieldObject(player, "headFollower") ||
                fieldObject(player, "_headTransform") ||
                fieldObject(player, "_cameraTransform") ||
                fieldObject(player, "cameraTransform");
        }

        function getFont() {
            try {
                const fonts = U.Resources && U.Resources.method("FindObjectsOfTypeAll", 1).invoke(U.Font.type);
                if (fonts) {
                    for (let i = 0; i < fonts.length; i++) {
                        const font = fonts.get(i);
                        const name = U.Font.method("get_name").on(font).invoke().toString();
                        if (name === "Utopium") return font;
                    }
                }
            } catch (_) {}
            try {
                const resources = core.class("UnityEngine.Resources");
                return resources.method("GetBuiltinResource", 1).inflate(U.Font).invoke(Il2Cpp.string("Arial.ttf"));
            } catch (_) {
                return null;
            }
        }

        function callMethod(target, methodName) {
            try {
                const method = target.tryMethod ? target.tryMethod(methodName) : target.method(methodName);
                return method ? method.invoke() : null;
            } catch (_) {
                return null;
            }
        }

        function readField(target, fieldName) {
            try {
                const field = target.tryField ? target.tryField(fieldName) : target.field(fieldName);
                return field ? field.value : null;
            } catch (_) {
                return null;
            }
        }

        function inputAxis(name) {
            if (!U.Input) return 0;
            try {
                const value = U.Input.method("GetAxis", 1).invoke(Il2Cpp.string(name));
                return Number(value) || 0;
            } catch (_) {
                return 0;
            }
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
            for (let i = 0; i < names.length; i++) {
                if (inputButton(names[i])) return true;
            }
            return false;
        }

        function leftStickY() {
            const names = [
                "Oculus_CrossPlatform_PrimaryThumbstickVertical",
                "PrimaryThumbstickVertical",
                "LeftStickY",
                "LeftVertical",
                "Vertical",
            ];
            for (let i = 0; i < names.length; i++) {
                const value = inputAxis(names[i]);
                if (Math.abs(value) > 0.2) return value;
            }
            return 0;
        }

        function rightStickHeldDown() {
            const axisNames = [
                "Oculus_CrossPlatform_SecondaryThumbstickVertical",
                "SecondaryThumbstickVertical",
                "RightStickY",
                "RightVertical",
            ];
            for (let i = 0; i < axisNames.length; i++) {
                if (inputAxis(axisNames[i]) < -0.55) return true;
            }
            return anyButton(["Oculus_CrossPlatform_SecondaryThumbstick", "SecondaryThumbstick"]) ||
                inputKey(339);
        }

        function bButtonDown() {
            return anyButton(["Oculus_CrossPlatform_SecondaryButton", "SecondaryButton", "ButtonB"]) ||
                inputKey(331);
        }

        function currentItems() {
            if (orbit.page === "main") {
                return orbit.buttonLabels.map(function (name) {
                    return { label: name, type: "tab", target: name.toLowerCase(), color: "#ffffff" };
                });
            }
            if (orbit.page === "movement") {
                return [
                    { label: "Fly", type: "locked", color: "#888888" },
                    { label: "Platforms", type: "locked", color: "#888888" },
                    { label: "Back", type: "back", color: "#ff4444" },
                ];
            }
            return [
                { label: "Back", type: "back", color: "#ff4444" },
            ];
        }

        function clampCursor() {
            const items = currentItems();
            if (orbit.cursor < 0) orbit.cursor = items.length - 1;
            if (orbit.cursor >= items.length) orbit.cursor = 0;
        }

        function selectCurrentItem() {
            const items = currentItems();
            const item = items[orbit.cursor];
            if (!item) return;
            if (item.type === "back") {
                orbit.page = "main";
                orbit.cursor = 0;
            } else if (item.type === "tab") {
                orbit.page = item.target;
                orbit.cursor = 0;
            } else if (item.type === "locked") {
                log(item.label + " is disabled in multiplayer builds.");
            }
            orbit.lastText = "";
        }

        function updateMenuInput() {
            orbit.menuHeld = rightStickHeldDown();
            if (!orbit.menuHeld) {
                orbit.lastMenuHeld = false;
                orbit.lastSelectDown = false;
                return;
            }

            if (!orbit.lastMenuHeld) {
                orbit.lastText = "";
                orbit.lastMoveTick = -999999;
            }
            orbit.lastMenuHeld = true;

            const y = leftStickY();
            if (Math.abs(y) > 0.55 && orbit.tickCount - orbit.lastMoveTick >= INPUT_REPEAT_TICKS) {
                orbit.cursor += y > 0 ? -1 : 1;
                clampCursor();
                orbit.lastMoveTick = orbit.tickCount;
                orbit.lastText = "";
            }

            const selectDown = bButtonDown();
            if (selectDown && !orbit.lastSelectDown) selectCurrentItem();
            orbit.lastSelectDown = selectDown;
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
            Photon.PhotonNetworkClass = tryClass([
                "PhotonUnityNetworking",
                "PhotonRealtime",
                "Assembly-CSharp",
                "AnimalCompany",
            ], "Photon.Pun.PhotonNetwork");
            Photon.resolved = !!Photon.PhotonNetworkClass;
            if (Photon.resolved) log("PhotonNetwork class resolved");
            return Photon.resolved;
        }

        function readPlayerName(player, index) {
            const methodNames = ["get_NickName", "get_UserId"];
            const fieldNames = ["NickName", "nickName", "UserId", "userId"];
            for (let i = 0; i < methodNames.length; i++) {
                const value = jsString(callMethod(player, methodNames[i])).trim();
                if (value) return value;
            }
            for (let i = 0; i < fieldNames.length; i++) {
                const value = jsString(readField(player, fieldNames[i])).trim();
                if (value) return value;
            }
            const actor = callMethod(player, "get_ActorNumber") || readField(player, "ActorNumber") || readField(player, "actorNumber");
            return actor != null ? "Player " + actor : "Player " + (index + 1);
        }

        function readPlayerIsLocal(player) {
            return callMethod(player, "get_IsLocal") === true || readField(player, "IsLocal") === true || readField(player, "isLocal") === true;
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
                const count = Math.min(players.length, 16);
                for (let i = 0; i < count; i++) {
                    const player = players.get(i);
                    if (!player) continue;
                    let name = readPlayerName(player, i);
                    if (name.length > 24) name = name.slice(0, 21) + "...";
                    names.push(name + (readPlayerIsLocal(player) ? " (you)" : ""));
                }
                orbit.photonPlayerNames = names;
                orbit.photonStatus = names.length ? "Photon Players (" + names.length + ")" : "Photon: no players found";
            } catch (e) {
                orbit.photonStatus = "Photon: read failed";
                orbit.photonPlayerNames = [];
                log("Photon scan failed: " + safeString(e));
            }
        }

        function renderMenuText() {
            refreshPhotonPlayers();
            const lines = [
                "<color=#bb88ff>Orbit Menu V" + VERSION + "</color>",
                orbit.page === "main" ? "<color=#888888>tabs</color>" : "<color=#888888>" + orbit.page + "</color>",
                "",
            ];

            const items = currentItems();
            clampCursor();
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const cursor = i === orbit.cursor ? "<color=#ffcc00>></color> " : "  ";
                lines.push(cursor + "<color=" + item.color + ">[ " + item.label + " ]</color>");
                if (item.type === "locked") lines.push("    <color=#777777>disabled</color>");
            }

            lines.push("");
            lines.push("<color=#88ccff>" + orbit.photonStatus + "</color>");
            if (orbit.photonPlayerNames.length) {
                for (let i = 0; i < orbit.photonPlayerNames.length; i++) lines.push("  - " + orbit.photonPlayerNames[i]);
            } else {
                lines.push("  waiting...");
            }
            return lines.join("\n");
        }

        function updateText() {
            if (!orbit.text) return;
            const next = orbit.menuHeld ? renderMenuText() : "";
            if (next === orbit.lastText) return;
            orbit.lastText = next;
            orbit.text.method("set_text").invoke(Il2Cpp.string(next));
        }

        function buildMenu() {
            if (orbit.menuInited) return;

            const root = newGameObject("[Orbit Root]");
            const canvasGO = newGameObject("[Orbit Canvas]");
            canvasGO.method("get_transform").invoke().method("SetParent", 2).invoke(root.method("get_transform").invoke(), false);

            const canvas = addComponent(canvasGO, U.Canvas);
            if (!canvas || canvas.handle.isNull()) throw new Error("Canvas component returned null");
            canvas.method("set_renderMode").invoke(2);
            if (U.CanvasScaler) addComponent(canvasGO, U.CanvasScaler);
            if (U.GraphicRaycaster) addComponent(canvasGO, U.GraphicRaycaster);

            const textGO = newGameObject("[Orbit Text]");
            textGO.method("get_transform").invoke().method("SetParent", 2).invoke(canvasGO.method("get_transform").invoke(), false);

            const label = addComponent(textGO, U.Text);
            if (!label || label.handle.isNull()) throw new Error("Text component returned null");

            const font = getFont();
            if (font) label.method("set_font").invoke(font);
            label.method("set_supportRichText").invoke(true);
            label.method("set_text").invoke(Il2Cpp.string(renderMenuText()));
            label.method("set_color").invoke(color(1, 1, 1, 1));
            label.method("set_fontSize").invoke(24);
            label.method("set_alignment").invoke(0);
            label.method("set_resizeTextForBestFit").invoke(false);
            label.method("set_fontStyle").invoke(1);

            try {
                const rect = textGO.method("GetComponent", 1).inflate(U.RectTransform).invoke();
                if (rect && !rect.handle.isNull()) {
                    rect.method("set_anchorMin").invoke(vec2(0, 1));
                    rect.method("set_anchorMax").invoke(vec2(0, 1));
                    rect.method("set_pivot").invoke(vec2(0, 1));
                    rect.method("set_anchoredPosition").invoke(vec2(-250, 145));
                    rect.method("set_sizeDelta").invoke(vec2(620, 440));
                }
            } catch (e) { log("RectTransform setup skipped: " + safeString(e)); }

            root.method("get_transform").invoke().method("set_localScale").invoke(vec3(MENU_SCALE, MENU_SCALE, MENU_SCALE));
            U.Object.method("DontDestroyOnLoad").invoke(root);

            orbit.root = root;
            orbit.text = label;
            orbit.menuInited = true;
            log("menu built: " + root.handle.toString());
        }

        function placeMenu() {
            if (!orbit.root) return;
            const head = getHeadTransform();
            if (!head) return;

            try {
                const hp = head.method("get_position").invoke();
                const hf = head.method("get_forward").invoke();
                const rootTransform = orbit.root.method("get_transform").invoke();

                const x = hp.field("x").value + hf.field("x").value * MENU_DISTANCE;
                const y = hp.field("y").value + hf.field("y").value * MENU_DISTANCE - MENU_DOWN;
                const z = hp.field("z").value + hf.field("z").value * MENU_DISTANCE;
                rootTransform.method("set_position").invoke(vec3(x, y, z));

                try { rootTransform.method("set_rotation").invoke(head.method("get_rotation").invoke()); } catch (_) {}
                orbit.lastVisiblePosition = x.toFixed(2) + "," + y.toFixed(2) + "," + z.toFixed(2);
            } catch (e) {
                log("placeMenu failed: " + safeString(e));
            }
        }

        function onTick() {
            orbit.tickCount++;
            try {
                if (!orbit.menuInited) buildMenu();
                placeMenu();
                updateMenuInput();
                updateText();
            } catch (e) {
                log("menu tick failed: " + safeString(e));
            }

            if (orbit.tickCount - orbit.lastLog >= LOG_TICKS) {
                orbit.lastLog = orbit.tickCount;
                log("tick " + orbit.tickCount +
                    " inited=" + orbit.menuInited +
                    " pos=" + orbit.lastVisiblePosition +
                    " held=" + orbit.menuHeld +
                    " page=" + orbit.page +
                    " players=" + orbit.photonPlayerNames.length);
            }
        }

        function installHook() {
            if (orbit.hookInstalled) return;
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
            log("hook installed on GorillaLocomotion." + target.name);
        }

        installHook();
        log("===== Orbit Menu V" + VERSION + " READY =====");
    });
})();
