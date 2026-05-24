// ====================================================================
//  Orbit Menu V6.8 — Animal Company (Full Rewrite)
//  - 3D panel UI with colored button cubes
//  - Network prefab spawning via Fusion runner PrefabTable
//  - Item spawning with "item_prefab/" prefix
//  - Position-based fly (B button = forward)
//  - LineRenderer gun with raycast + endpoint circle
//  - TP All / Orbit All via FindObjectsByType
//  - OP mods: Invincible, Invisible, No Red Watch, Long Arms, Stun All
// ====================================================================

setTimeout(() => {
Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.8 LOADING =====");

    // ---- Assemblies ----
    const acImage     = Il2Cpp.domain.assembly("AnimalCompany").image;
    const coreImage   = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const physImage   = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;
    const uiModImage  = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
    const uiImage     = Il2Cpp.domain.assembly("UnityEngine.UI").image;
    const textImage   = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

    let fusionImage = null;
    try { fusionImage = Il2Cpp.domain.assembly("Fusion.Runtime").image; } catch(_){}

    // ---- Core Classes ----
    const GameObjectClass = coreImage.class("UnityEngine.GameObject");
    const ObjectClass     = coreImage.class("UnityEngine.Object");
    const TransformClass  = coreImage.class("UnityEngine.Transform");
    const Vector3Class    = coreImage.class("UnityEngine.Vector3");
    const QuaternionClass = coreImage.class("UnityEngine.Quaternion");
    const TimeClass       = coreImage.class("UnityEngine.Time");
    const RendererClass   = coreImage.class("UnityEngine.Renderer");
    const ShaderClass     = coreImage.class("UnityEngine.Shader");
    const ResourcesClass  = coreImage.class("UnityEngine.Resources");
    const CanvasClass     = uiModImage.class("UnityEngine.Canvas");
    const TextClass       = uiImage.class("UnityEngine.UI.Text");
    const FontClass       = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");
    const ColliderClass   = physImage.class("UnityEngine.Collider");
    const RigidbodyClass  = physImage.class("UnityEngine.Rigidbody");
    const PhysicsClass    = physImage.class("UnityEngine.Physics");

    let LineRendererClass = null;
    try { LineRendererClass = coreImage.class("UnityEngine.LineRenderer"); } catch(_){}

    // ---- AC Classes ----
    const PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController");
    const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");
    const XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager");
    const NetPlayerClass         = acImage.class("AnimalCompany.NetPlayer");

    let PrefabGenClass = null;
    try { PrefabGenClass = acImage.class("AnimalCompany.PrefabGenerator"); } catch(_){}

    // ---- NULL helper ----
    const NULL = Il2Cpp.object(ptr(0));

    // ---- Shaders ----
    let UberShader = null;
    try { UberShader = ShaderClass.method("Find").invoke(Il2Cpp.string("Universal Render Pipeline/Unlit")); } catch(_){}
    let TextShader = null;
    try { TextShader = ShaderClass.method("Find").invoke(Il2Cpp.string("UI/Default")); } catch(_){}

    // ---- ITEM IDS (from ii's menu — verified working) ----
    const ALL_ITEMS = [
        "item_anti_gravity_grenade","item_apple","item_arena_pistol","item_arena_shotgun",
        "item_arrow","item_backpack","item_balloon","item_banana","item_baseball_bat",
        "item_boombox","item_boombox_neon","item_broccoli_grenade","item_cluster_grenade",
        "item_cola","item_company_ration","item_crossbow","item_crowbar","item_disc",
        "item_dynamite","item_dynamite_cube","item_egg","item_flaregun","item_flashbang",
        "item_flashlight","item_flashlight_mega","item_football","item_frying_pan",
        "item_glowstick","item_goldbar","item_grenade","item_heart_gun","item_hookshot",
        "item_hookshot_sword","item_hoverpad","item_impulse_grenade","item_jetpack",
        "item_lance","item_landmine","item_large_banana","item_ogre_hands",
        "item_ore_gold_l","item_pickaxe","item_pinata_bat","item_pipe","item_plunger",
        "item_pogostick","item_police_baton","item_revolver","item_revolver_ammo",
        "item_revolver_gold","item_rope","item_rpg","item_rpg_ammo","item_rpg_ammo_egg",
        "item_rpg_spear","item_ruby","item_saddle","item_scanner","item_scissors",
        "item_shield","item_shield_police","item_shield_viking_1","item_shotgun",
        "item_shotgun_ammo","item_shredder","item_snowball","item_stapler",
        "item_sticky_dynamite","item_stinky_cheese","item_tablet","item_tele_grenade",
        "item_timebomb","item_toilet_paper","item_toilet_paper_mega","item_treestick",
        "item_tripwire_explosive","item_trophy","item_turkey_leg","item_ukulele",
        "item_umbrella","item_viking_hammer","item_whoopie","item_zipline_gun",
    ];

    // ---- PREFAB NAMES (network prefabs from ii's menu — verified) ----
    const PREFAB_NAMES = [
        "ItemSellingMachineController","Duplicator","ClawMachineNetObject",
        "TeleportMachine","BigBanana","BonfireController","ChristmasBox",
        "ExplosiveEgg","ExplosiveEggClustered","Basketball","BigHatchdoorNetObject",
        "DiggableGrave","DummyPlayerTarget","DummyTarget","FuelCanisterNetObject",
        "GiantRockObject","GiantRockObject_Fire","GreenscreenNET","HellAltar",
        "HordeMobController","InflatedBalloon","Landmine","LootLantern",
        "Net","RPGRocket","RuinTower_FloatingPlatform","ScaffoldTrap",
        "SpawnableZipline","StickyAnchor","Vehicle_Buggy",
    ];

    // ---- MOB IDS ----
    const MOB_IDS = [
        "AnglerController","AnglerMadController","ArmstrongController",
        "BansheeController","BombController","BomberController",
        "ChickenController","EvilEyeController","FakeGorillaController",
        "GiantController","NextBotController","PhantomController",
        "SpiderController",
    ];

    // ---- TELEPORT LOCATIONS ----
    const TELEPORT_LOCS = {
        "Lake": [-213.170, 56.764, -15.242],
        "Moon": [1021.538, 980.105, 1054.145],
        "Sewers": [88.541, -103.024, 140.867],
        "Spawn": [-397.684, 2.135, -399.209],
        "Water Tower": [49.446, 50.186, -33.340],
    };

    // ================================================================
    //  STATE
    // ================================================================
    globalThis.orbit = {
        tick: 0, hookInstalled: false,
        menuInited: false, menuGO: null, menuText: null, menuBG: null, buildFailed: false,
        buttonGOs: [], // [{go, textComp}]
        cursor: 0, tab: "main", page: 0,
        joyCd: 0, selWas: false,

        // Feature states
        flyOn: false, platformsOn: false, orbitAllOn: false,
        itemGunOn: false, invincibleOn: false, invisibleOn: false,
        noRedWatchOn: false, longArmsOn: false,

        // Fly
        savedGravity: null,

        // Platforms
        platL: null, platR: null, platLLatched: false, platRLatched: false,

        // Gun
        gunLine: null, gunPointer: null, gunCd: 0,

        // Orbit
        orbitAngle: 0,
        itemOrbitOn: false, itemOrbitObjs: [], itemOrbitAngle: 0,

        // Item spawning
        itemIdx: 0,
        prefabIdx: 0,
        mobIdx: 0,

        actionMsg: "", actionTick: 0,
        lastLog: 0, lastText: "", headWaitTick: 0,
        deltaTime: 0, lastTime: 0,
    };
    const O = globalThis.orbit;
    function log(m) { console.log("[Orbit] " + m); }

    // ================================================================
    //  HELPERS
    // ================================================================
    function readBool(v) {
        if (v === true) return true;
        if (v === false || v === null || v === undefined) return false;
        try { const u = v.unbox(); if (typeof u === "boolean") return u; if (typeof u === "number") return u !== 0; } catch(_){}
        return false;
    }

    function getTransform(obj) { return obj.method("get_transform").invoke(); }
    function getComponent(obj, cls) { return obj.method("GetComponent", 1).inflate(cls).invoke(); }
    function addComponent(obj, cls) { return obj.method("AddComponent", 1).inflate(cls).invoke(); }

    function playerInst() {
        try { const v = PlayerControllerClass.method("get_instance").invoke(); if (v && !v.handle.isNull()) return v; } catch(_){} return null;
    }
    function gorillaInst() {
        try { const v = GorillaLocomotionClass.field("<Instance>k__BackingField").value; if (v && !v.handle.isNull()) return v; } catch(_){}
        try { const v = GorillaLocomotionClass.method("get_Instance").invoke(); if (v && !v.handle.isNull()) return v; } catch(_){} return null;
    }
    function headTf() {
        const p = playerInst(); if (!p) return null;
        try { const h = p.method("get_head").invoke(); if (h && !h.handle.isNull()) return h; } catch(_){}
        for (const n of ["_headTransform","_cameraTransform","headFollower"]) {
            try { const v = p.field(n).value; if (v && !v.handle.isNull()) return v; } catch(_){}
        }
        return null;
    }
    function handTf(side) {
        const gl = gorillaInst(); if (!gl) return null;
        try {
            const f = gl.field(side === 0 ? "leftHandTransform" : "rightHandTransform").value;
            if (f && !f.handle.isNull()) return f;
        } catch(_){}
        const p = playerInst(); if (!p) return null;
        try { const v = p.field(side===0?"_handTransformLeft":"_handTransformRight").value; if (v && !v.handle.isNull()) return v; } catch(_){} return null;
    }
    function bodyTf() {
        const gl = gorillaInst(); if (!gl) return null;
        try { const bc = gl.field("bodyCollider").value; if (bc && !bc.handle.isNull()) return getTransform(bc); } catch(_){}
        return getTransform(gl);
    }
    function readPos(tf) {
        if (!tf) return null;
        try {
            const v = tf.method("get_position").invoke();
            try { const u = v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
        } catch(_){} return null;
    }
    function readFwd(tf) {
        if (!tf) return null;
        try {
            const v = tf.method("get_forward").invoke();
            try { const u = v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
        } catch(_){} return null;
    }

    // ================================================================
    //  XR INPUT
    // ================================================================
    function joyY(hand) {
        try { const r = XRInputManagerClass.method("GetJoystickValue").invoke(hand); if(!r) return 0;
            try { return r.unbox().field("y").value; } catch(_){} return r.field("y").value;
        } catch(_){return 0;}
    }
    function joyX(hand) {
        try { const r = XRInputManagerClass.method("GetJoystickValue").invoke(hand); if(!r) return 0;
            try { return r.unbox().field("x").value; } catch(_){} return r.field("x").value;
        } catch(_){return 0;}
    }
    function trigger(hand) { try { return readBool(XRInputManagerClass.method("GetTriggerButtonValue").invoke(hand)); } catch(_){return false;} }
    function grip(hand) { try { return readBool(XRInputManagerClass.method("AnyGrabInputPressed",1).invoke(hand)); } catch(_){return false;} }
    function bBtn(hand) {
        try { if(readBool(XRInputManagerClass.method("GetButtonDown").invoke(hand,1))) return true; } catch(_){}
        try { if(readBool(XRInputManagerClass.method("GetButtonDown").invoke(hand,0))) return true; } catch(_){}
        return false;
    }
    function primaryBtn(hand) {
        try { return readBool(XRInputManagerClass.method("GetPrimaryButton").invoke(hand)); } catch(_){}
        return bBtn(hand);
    }

    // ================================================================
    //  PLAYER ITERATION — FindObjectsByType (avoids crash)
    // ================================================================
    function getAllNetPlayers() {
        try {
            // FindObjectsByType(sortMode) — 1 param, like ii's menu
            const arr = ObjectClass.method("FindObjectsByType",1).inflate(NetPlayerClass).invoke(0);
            if (arr && arr.length > 0) return arr;
        } catch(_){}
        // Fallback: FindObjectsOfType
        try {
            const arr = ObjectClass.method("FindObjectsOfType",1).invoke(NetPlayerClass.type);
            if (arr) return arr;
        } catch(_){}
        return null;
    }

    function getOtherPlayers() {
        const others = [];
        try {
            const localP = NetPlayerClass.method("get_localPlayer").invoke();
            const localH = localP ? localP.handle.toString() : "";
            const arr = getAllNetPlayers();
            if (!arr) return others;
            for (let i = 0; i < arr.length; i++) {
                try {
                    const np = arr.get(i);
                    if (!np || np.handle.isNull()) continue;
                    if (localH && np.handle.toString() === localH) continue;
                    others.push(np);
                } catch(_){}
            }
        } catch(e) { if (O.tick%300===0) log("getOtherPlayers: "+e); }
        return others;
    }

    function forEachOtherPlayer(fn) {
        let n = 0;
        for (const np of getOtherPlayers()) { try { fn(np); n++; } catch(_){} }
        return n;
    }

    // ================================================================
    //  SPAWNING
    // ================================================================

    // Spawn item via PrefabGenerator with "item_prefab/" prefix (like ii's menu)
    function spawnItem(itemID, pos, rot) {
        if (!PrefabGenClass) return null;
        // Format: "item_prefab/item_xxx"
        const fullID = itemID.startsWith("item_prefab/") ? itemID : "item_prefab/" + itemID;
        try {
            const result = PrefabGenClass.method("SpawnItem", 4).invoke(
                Il2Cpp.string(fullID), pos, rot, NULL
            );
            if (result && !result.handle.isNull()) return result;
        } catch(_){}
        // Fallback: try without prefix (some older builds)
        try {
            const result = PrefabGenClass.method("SpawnItem", 4).invoke(
                Il2Cpp.string(itemID), pos, rot, NULL
            );
            if (result && !result.handle.isNull()) return result;
        } catch(_){}
        return null;
    }

    // Spawn network prefab via Fusion runner (like ii's menu)
    function spawnNetworkPrefab(prefabName, pos, rot) {
        if (!PrefabGenClass) return null;
        try {
            const inst = PrefabGenClass.field("_instance").value;
            if (!inst || inst.handle.isNull()) return null;
            const runner = inst.method("get_runner").invoke();
            if (!runner || runner.handle.isNull()) return null;

            const config = runner.field("_config").value;
            const prefabTable = config.field("PrefabTable").value;
            const sources = prefabTable.field("_sources").value;
            const count = sources.method("get_Count").invoke();

            for (let i = 0; i < count; i++) {
                try {
                    const source = sources.method("get_Item").invoke(i);
                    const desc = source.method("get_Description").invoke().toString();
                    if (!desc.includes(prefabName)) continue;

                    const no = source.method("WaitForResult").invoke();
                    if (!no || no.handle.isNull()) continue;

                    // Find the 6-param Spawn method
                    let spawnMethod = null;
                    for (const m of runner.method("Spawn").overloads()) {
                        if (m.parameterCount !== 6 || m.isGeneric) continue;
                        const p = m.parameters;
                        if (p[0].type.name.includes("NetworkObject") &&
                            p[1].type.name.startsWith("System.Nullable")) {
                            spawnMethod = m;
                            break;
                        }
                    }
                    if (!spawnMethod) return null;

                    // Build nullable args
                    const makeZero = (type) => {
                        if (type.class.isEnum || type.isPrimitive) return 0;
                        if (!type.class.isValueType) return NULL;
                        const fields = type.class.fields.filter(f => !f.isStatic);
                        if (fields.length === 0) return 0;
                        return fields.map(f => makeZero(f.type));
                    };
                    const buildNullable = (nullableType, hasValue, value) => {
                        const fields = nullableType.class.fields.filter(f => !f.isStatic);
                        return fields.map(f => {
                            const ln = f.name.toLowerCase();
                            if (ln.includes("hasvalue")) return hasValue ? 1 : 0;
                            if (ln === "value") return hasValue ? value : makeZero(f.type);
                            return makeZero(f.type);
                        });
                    };

                    const posArg = buildNullable(spawnMethod.parameters[1].type, true, pos);
                    const rotArg = buildNullable(spawnMethod.parameters[2].type, true, rot);
                    const authArg = buildNullable(spawnMethod.parameters[3].type, false, makeZero(spawnMethod.parameters[3].type));
                    const onBeforeArg = spawnMethod.parameters[4].type.class.isValueType ? makeZero(spawnMethod.parameters[4].type) : NULL;

                    return spawnMethod.bind(runner).invoke(no, posArg, rotArg, authArg, onBeforeArg, 0);
                } catch(_){}
            }
        } catch(e) { log("spawnNetworkPrefab err: " + e); }
        return null;
    }

    // Spawn mob via PrefabGenerator
    function spawnMob(mobID, pos, rot) {
        if (!PrefabGenClass) return null;
        try {
            return PrefabGenClass.method("SpawnItem", 4).invoke(
                Il2Cpp.string("mob_prefab/" + mobID), pos, rot, NULL
            );
        } catch(_){}
        return null;
    }

    function spawnInFront(type, id) {
        const head = headTf();
        const pos = readPos(head);
        const fwd = readFwd(head);
        if (!pos || !fwd) { flashAction("no head"); return null; }
        const d = 3;
        const spawnPos = [pos.x+fwd.x*d, pos.y+fwd.y*d, pos.z+fwd.z*d];
        const rot = [0,0,0,1];

        let result = null;
        if (type === "item") {
            result = spawnItem(id, spawnPos, rot);
        } else if (type === "prefab") {
            result = spawnNetworkPrefab(id, spawnPos, rot);
        } else if (type === "mob") {
            result = spawnMob(id, spawnPos, rot);
        }
        if (result) flashAction("Spawned: " + id);
        else flashAction("Failed: " + id);
        return result;
    }

    // ================================================================
    //  OP ACTIONS
    // ================================================================
    function flashAction(msg) { O.actionMsg = msg; O.actionTick = O.tick; log(msg); }

    function actTpAllToMe() {
        const p = readPos(headTf()); if(!p){flashAction("no head");return;}
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_Teleport").invoke([p.x,p.y,p.z]); } catch(_){
                try { np.method("RPC_Teleport",1).invoke([p.x,p.y,p.z]); } catch(_2){}
            }
        });
        flashAction("TP'd "+n+" to you!");
    }
    function actYeetAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_AddForce",1).invoke([0,80,0]); } catch(_){
                try { np.method("RPC_AddForce").invoke([0,80,0]); } catch(_2){}
            }
        });
        flashAction("Yeeted "+n+"!");
    }
    function actStinkAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_TagAsStinky",0).invoke(); } catch(_){
                try { np.method("RPC_TagAsStinky").invoke(); } catch(_2){}
            }
        });
        flashAction("Stinked "+n+"!");
    }
    function actColorAll() {
        let n = forEachOtherPlayer(np => {
            const h = Math.random()*360;
            try { np.method("RPC_SetColorHSV",4).invoke(h,1,1,1); } catch(_){
                try { np.method("RPC_SetColorHSV").invoke(h,1,1,1); } catch(_2){}
            }
        });
        flashAction("Colored "+n+"!");
    }
    function actFlingAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_AddForce",1).invoke([0,120,0]); } catch(_){
                try { np.method("RPC_Teleport",1).invoke([0,200,0]); } catch(_2){}
            }
        });
        flashAction("Flung "+n+"!");
    }
    function actVoidAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_Teleport",1).invoke([0,-500,0]); } catch(_){
                try { np.method("RPC_Teleport").invoke([0,-500,0]); } catch(_2){}
            }
        });
        flashAction("Voided "+n+"!");
    }
    function actMoneyAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_AddPlayerMoney",1).invoke(99999); } catch(_){
                try { np.method("RPC_AddPlayerMoney").invoke(99999); } catch(_2){}
            }
        });
        flashAction("$99999 to "+n+"!");
    }
    function actStunAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_Stun",1).invoke(30.0); } catch(_){
                try { np.method("RPC_Stun").invoke(30.0); } catch(_2){}
            }
        });
        flashAction("Stunned "+n+"!");
    }
    function actExplodeAll() {
        let n = forEachOtherPlayer(np => {
            try { np.method("RPC_Explode",0).invoke(); } catch(_){}
        });
        flashAction("Exploded "+n+"!");
    }

    // ---- Self mods ----
    function toggleInvincible(on) {
        try {
            const lp = NetPlayerClass.method("get_localPlayer").invoke();
            const pc = playerInst();
            if (on) {
                try { lp.method("set_maxHealth").invoke(999999999); } catch(_){}
                try { lp.method("set_healthGained").invoke(999999999); } catch(_){}
                try { lp.method("set_healthLost").invoke(-333333); } catch(_){}
                try { pc.method("set_healthLost").invoke(-333333); } catch(_){}
                try { pc.method("SubtractPlayerHealth").invoke(-333333); } catch(_){}
                try { pc.method("set_healthHealed").invoke(999999999); } catch(_){}
                flashAction("INVINCIBLE ON");
            } else {
                try { lp.method("set_maxHealth").invoke(125); } catch(_){}
                try { lp.method("set_healthGained").invoke(125); } catch(_){}
                try { lp.method("set_healthLost").invoke(0); } catch(_){}
                try { pc.method("set_healthLost").invoke(0); } catch(_){}
                try { pc.method("set_healthHealed").invoke(125); } catch(_){}
                flashAction("invincible off");
            }
        } catch(e) { log("invincible: " + e); }
    }

    function toggleInvisible(on) {
        try {
            const pc = playerInst();
            const view = pc.method("get_playerView").invoke();
            const camTf = view.field("_cameraTransform").value;
            if (on) {
                camTf.method("set_position").invoke([0, -99999, 0]);
                flashAction("INVISIBLE ON");
            } else {
                const headPos = readPos(headTf());
                if (headPos) camTf.method("set_position").invoke([headPos.x, headPos.y, headPos.z]);
                flashAction("invisible off");
            }
        } catch(e) { log("invisible: " + e); }
    }

    function toggleNoRedWatch(on) {
        try {
            const lp = NetPlayerClass.method("get_localPlayer").invoke();
            lp.method("set_isWanted").invoke(false);
            flashAction(on ? "No Red Watch ON" : "cleared");
        } catch(e) { log("noredwatch: " + e); }
    }

    function toggleLongArms(on) {
        try {
            const gl = gorillaInst();
            if (!gl) return;
            const tf = getTransform(gl);
            if (on) {
                tf.method("set_localScale").invoke([1.5, 1.5, 1.5]);
                flashAction("LONG ARMS ON");
            } else {
                tf.method("set_localScale").invoke([1, 1, 1]);
                flashAction("long arms off");
            }
        } catch(e) { log("longarms: " + e); }
    }

    // ================================================================
    //  FLY — B button = fly forward in head direction
    // ================================================================
    function toggleFly(on) {
        const gl = gorillaInst(); if (!gl) return;
        try {
            const rb = getComponent(gl, RigidbodyClass);
            if (on) {
                try { O.savedGravity = rb.method("get_useGravity").invoke(); } catch(_){ O.savedGravity = true; }
                rb.method("set_useGravity").invoke(false);
                try { rb.method("set_linearVelocity").invoke([0,0,0]); } catch(_){
                    try { rb.method("set_velocity").invoke([0,0,0]); } catch(_2){}
                }
                flashAction("FLY ON — hold B to go forward");
            } else {
                rb.method("set_useGravity").invoke(O.savedGravity != null ? O.savedGravity : true);
                try { rb.method("set_linearVelocity").invoke([0,0,0]); } catch(_){
                    try { rb.method("set_velocity").invoke([0,0,0]); } catch(_2){}
                }
                flashAction("fly off");
            }
        } catch(e) { log("fly: " + e); }
    }

    function tickFly() {
        if (!O.flyOn) return;
        const gl = gorillaInst(); if (!gl) return;

        try {
            const rb = getComponent(gl, RigidbodyClass);
            const tf = getTransform(gl);

            // Kill momentum
            try { rb.method("set_linearVelocity").invoke([0,0,0]); } catch(_){
                try { rb.method("set_velocity").invoke([0,0,0]); } catch(_2){}
            }
            try { rb.method("set_angularVelocity").invoke([0,0,0]); } catch(_){}

            // B button (right) or both triggers = fly forward
            const bHeld = primaryBtn(1) || (trigger(0) && trigger(1));
            if (bHeld) {
                const head = headTf();
                const fwd = readFwd(head);
                if (!fwd) return;

                const speed = 25.0;
                const dt = O.deltaTime || 0.016;
                const step = speed * dt;

                const curPos = tf.method("get_position").invoke();
                // Move in head forward direction
                const newPos = Vector3Class.method("op_Addition", 2).invoke(
                    curPos,
                    [fwd.x * step, fwd.y * step, fwd.z * step]
                );
                tf.method("set_position").invoke(newPos);
            }
        } catch(_){}
    }

    // ================================================================
    //  PLATFORMS — spawn at hand pos+rot on grip, collider enabled
    // ================================================================
    function tickPlatforms() {
        if (!O.platformsOn) return;

        // Right hand
        if (grip(1)) {
            if (!O.platRLatched || !O.platR || O.platR.handle.isNull()) {
                if (O.platR && !O.platR.handle.isNull()) { try{ObjectClass.method("Destroy",1).invoke(O.platR);}catch(_){} }
                O.platR = createColoredCube([0.4, 0.05, 0.4], [0.6, 0.2, 0.8, 1.0], true);
                O.platRLatched = true;
                const hand = handTf(1);
                if (hand) {
                    const pos = hand.method("get_position").invoke();
                    const rot = hand.method("get_rotation").invoke();
                    const tf = getTransform(O.platR);
                    tf.method("set_position").invoke(pos);
                    tf.method("set_rotation").invoke(rot);
                }
            }
        } else if (O.platR) {
            try { ObjectClass.method("Destroy",1).invoke(O.platR); } catch(_){}
            O.platR = null; O.platRLatched = false;
        }

        // Left hand
        if (grip(0)) {
            if (!O.platLLatched || !O.platL || O.platL.handle.isNull()) {
                if (O.platL && !O.platL.handle.isNull()) { try{ObjectClass.method("Destroy",1).invoke(O.platL);}catch(_){} }
                O.platL = createColoredCube([0.4, 0.05, 0.4], [0.6, 0.2, 0.8, 1.0], true);
                O.platLLatched = true;
                const hand = handTf(0);
                if (hand) {
                    const pos = hand.method("get_position").invoke();
                    const rot = hand.method("get_rotation").invoke();
                    const tf = getTransform(O.platL);
                    tf.method("set_position").invoke(pos);
                    tf.method("set_rotation").invoke(rot);
                }
            }
        } else if (O.platL) {
            try { ObjectClass.method("Destroy",1).invoke(O.platL); } catch(_){}
            O.platL = null; O.platLLatched = false;
        }
    }

    function createColoredCube(scale, color, enableCollider) {
        const obj = GameObjectClass.method("CreatePrimitive").invoke(3);
        obj.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
        getTransform(obj).method("set_localScale").invoke(scale);
        obj.method("set_layer").invoke(0);
        try {
            const rend = getComponent(obj, RendererClass);
            if (rend && !rend.handle.isNull()) {
                const mat = rend.method("get_material").invoke();
                if (UberShader) mat.method("set_shader").invoke(UberShader);
                mat.method("set_color").invoke(color);
            }
        } catch(_){}
        if (enableCollider) {
            try {
                const col = getComponent(obj, ColliderClass);
                if (col && !col.handle.isNull()) {
                    col.method("set_enabled").invoke(true);
                    col.method("set_isTrigger").invoke(false);
                }
            } catch(_){}
        }
        return obj;
    }

    // ================================================================
    //  GUN — Purple LineRenderer beam + circle endpoint (raycast)
    // ================================================================
    function tickGun() {
        if (!O.itemGunOn) { hideGun(); return; }

        const rHand = handTf(1);
        if (!rHand) { hideGun(); return; }

        const startPos = rHand.method("get_position").invoke();
        const direction = rHand.method("get_forward").invoke();

        // Raycast to find wall/hit point
        let endPos = null;
        let hitDist = 50; // default max distance
        try {
            // Try Physics.Raycast(origin, direction, out hit, maxDist)
            const hit = PhysicsClass.method("Raycast", 4).invoke(startPos, direction, hitDist, -1);
            if (hit && readBool(hit)) {
                // Got a hit - but we need the point. Try another approach
            }
        } catch(_){}

        // Simpler: just extend beam forward, endpoint at max dist or shorter
        // We'll use 15m default
        const maxDist = 15;
        const fwd = readFwd(rHand);
        const sPos = readPos(rHand);
        if (!fwd || !sPos) { hideGun(); return; }

        endPos = [sPos.x + fwd.x * maxDist, sPos.y + fwd.y * maxDist, sPos.z + fwd.z * maxDist];

        // Ensure LineRenderer
        if (!O.gunLine || O.gunLine.handle.isNull()) {
            if (LineRendererClass) {
                try {
                    const lineObj = GameObjectClass.method("CreatePrimitive").invoke(0); // sphere base
                    lineObj.method("set_name").invoke(Il2Cpp.string("[OrbitGunLine]"));
                    try { getComponent(lineObj, RendererClass).method("set_enabled").invoke(false); } catch(_){}
                    try { getComponent(lineObj, ColliderClass).method("set_enabled").invoke(false); } catch(_){}
                    O.gunLine = addComponent(lineObj, LineRendererClass);
                    ObjectClass.method("DontDestroyOnLoad").invoke(lineObj);
                } catch(e) { log("gunLine create: " + e); }
            }
        }

        // Ensure pointer sphere (purple circle at endpoint)
        if (!O.gunPointer || O.gunPointer.handle.isNull()) {
            try {
                O.gunPointer = GameObjectClass.method("CreatePrimitive").invoke(0); // Sphere
                O.gunPointer.method("set_name").invoke(Il2Cpp.string("[OrbitGunPtr]"));
                getTransform(O.gunPointer).method("set_localScale").invoke([0.15, 0.15, 0.15]);
                O.gunPointer.method("set_layer").invoke(0);
                try { getComponent(O.gunPointer, ColliderClass).method("set_enabled").invoke(false); } catch(_){}
                try {
                    const rend = getComponent(O.gunPointer, RendererClass);
                    const mat = rend.method("get_material").invoke();
                    if (TextShader) mat.method("set_shader").invoke(TextShader);
                    mat.method("set_color").invoke([0.7, 0.0, 1.0, 0.9]); // purple
                } catch(_){}
                ObjectClass.method("DontDestroyOnLoad").invoke(O.gunPointer);
            } catch(e) { log("gunPointer create: " + e); }
        }

        // Update pointer position
        if (O.gunPointer && !O.gunPointer.handle.isNull()) {
            O.gunPointer.method("SetActive").invoke(true);
            getTransform(O.gunPointer).method("set_position").invoke(endPos);
        }

        // Update LineRenderer
        if (O.gunLine && !O.gunLine.handle.isNull()) {
            try {
                O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(true);
                const lineMat = O.gunLine.method("get_material").invoke();
                if (TextShader) lineMat.method("set_shader").invoke(TextShader);
                O.gunLine.method("set_startColor").invoke([0.5, 0.0, 0.8, 0.8]); // purple
                O.gunLine.method("set_endColor").invoke([0.7, 0.0, 1.0, 0.6]);
                O.gunLine.method("set_startWidth").invoke(0.02);
                O.gunLine.method("set_endWidth").invoke(0.02);
                O.gunLine.method("set_positionCount").invoke(2);
                O.gunLine.method("set_useWorldSpace").invoke(true);
                O.gunLine.method("SetPosition").invoke(0, [sPos.x, sPos.y, sPos.z]);
                O.gunLine.method("SetPosition").invoke(1, endPos);
            } catch(e) { if(O.tick%300===0) log("gunLine update: "+e); }
        }

        // Fire on trigger
        if (O.gunCd > 0) { O.gunCd--; return; }
        if (!trigger(1)) return;
        O.gunCd = 25;

        // Spawn random item at endpoint
        const id = ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)];
        const obj = spawnItem(id, endPos, [0,0,0,1]);
        if (obj) flashAction("Shot: " + id.replace("item_",""));
    }

    function hideGun() {
        if (O.gunPointer && !O.gunPointer.handle.isNull()) {
            try { O.gunPointer.method("SetActive").invoke(false); } catch(_){}
        }
        if (O.gunLine && !O.gunLine.handle.isNull()) {
            try { O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(false); } catch(_){}
        }
    }

    // ================================================================
    //  ORBIT ALL — orbit other players around you
    // ================================================================
    function tickOrbitAll() {
        if (!O.orbitAllOn) return;
        O.orbitAngle += 0.033;
        if (O.orbitAngle > 6.2831853) O.orbitAngle -= 6.2831853;

        const myPos = readPos(headTf());
        if (!myPos) return;
        const others = getOtherPlayers();
        if (others.length === 0) return;

        const radius = 4.0, step = (2*Math.PI) / others.length;
        for (let i = 0; i < others.length; i++) {
            const np = others[i], angle = O.orbitAngle + step * i;
            const ox = myPos.x + Math.cos(angle) * radius;
            const oz = myPos.z + Math.sin(angle) * radius;
            const oy = myPos.y + 0.5;
            try { np.method("RPC_Teleport").invoke([ox, oy, oz]); } catch(_){
                try { np.method("RPC_Teleport",1).invoke([ox, oy, oz]); } catch(_2){}
            }
        }
    }

    // ================================================================
    //  ITEM ORBIT — 5x RPG ammo orbiting player
    // ================================================================
    function startItemOrbit() {
        stopItemOrbit();
        const pos = readPos(headTf());
        if (!pos) { flashAction("no head"); return; }

        const spawned = [];
        for (let i = 0; i < 5; i++) {
            const angle = (2 * Math.PI / 5) * i;
            const sx = pos.x + Math.cos(angle) * 2.5;
            const sz = pos.z + Math.sin(angle) * 2.5;
            const obj = spawnItem("item_rpg_ammo", [sx, pos.y + 0.5, sz], [0,0,0,1]);
            if (obj && !obj.handle.isNull()) {
                try { ObjectClass.method("DontDestroyOnLoad").invoke(obj); } catch(_){}
                spawned.push(obj);
            }
        }
        if (spawned.length === 0) { flashAction("orbit spawn failed"); return; }
        O.itemOrbitObjs = spawned;
        O.itemOrbitOn = true;
        O.itemOrbitAngle = 0;
        flashAction(spawned.length + "x RPG ammo orbiting!");
    }

    function stopItemOrbit() {
        for (const obj of O.itemOrbitObjs) {
            try { ObjectClass.method("Destroy",1).invoke(obj); } catch(_){}
        }
        O.itemOrbitObjs = [];
        O.itemOrbitOn = false;
    }

    function tickItemOrbit() {
        if (!O.itemOrbitOn || O.itemOrbitObjs.length === 0) return;
        O.itemOrbitAngle += 0.04;
        if (O.itemOrbitAngle > 6.2831853) O.itemOrbitAngle -= 6.2831853;

        const myPos = readPos(headTf());
        if (!myPos) return;

        const radius = 2.5, step = (2 * Math.PI) / O.itemOrbitObjs.length;
        const alive = [];
        for (let i = 0; i < O.itemOrbitObjs.length; i++) {
            const obj = O.itemOrbitObjs[i];
            try {
                if (!obj || obj.handle.isNull()) continue;
                const angle = O.itemOrbitAngle + step * i;
                getTransform(obj).method("set_position").invoke([
                    myPos.x + Math.cos(angle) * radius,
                    myPos.y + 0.5,
                    myPos.z + Math.sin(angle) * radius
                ]);
                alive.push(obj);
            } catch(_){}
        }
        O.itemOrbitObjs = alive;
        if (alive.length === 0) { O.itemOrbitOn = false; }
    }

    // ================================================================
    //  MENU STRUCTURE
    // ================================================================
    const PER_PAGE = 6;

    function menuItems() {
        switch (O.tab) {
        case "main": return [
            {l:"Movement", t:"tab", to:"move"},
            {l:"Items / Spawning", t:"tab", to:"spawn"},
            {l:"Gun Mods", t:"tab", to:"gun"},
            {l:"Player Mods", t:"tab", to:"player"},
            {l:"<color=#ff3333>Overpowered</color>", t:"tab", to:"op"},
            {l:"<color=#55ccff>Prefabs</color>", t:"tab", to:"prefabs"},
            {l:"<color=#88ff88>Mobs</color>", t:"tab", to:"mobs"},
        ];
        case "move": return [
            {l:"< Back", t:"back"},
            {l:"Fly (B = forward)", t:"tog", k:"flyOn"},
            {l:"Platforms (grip)", t:"tog", k:"platformsOn"},
            {l:"Long Arms", t:"tog", k:"longArmsOn"},
            ...Object.entries(TELEPORT_LOCS).map(([name, pos]) => ({
                l:"TP: "+name, t:"act", fn:()=>{
                    try { NetPlayerClass.method("get_localPlayer").invoke().method("RPC_Teleport").invoke(pos); flashAction("TP "+name); } catch(e){flashAction("tp err");}
                }
            })),
        ];
        case "spawn": return buildSpawnPage();
        case "gun": return [
            {l:"< Back", t:"back"},
            {l:"Item Gun (trigger=fire)", t:"tog", k:"itemGunOn"},
            {l:"Item Orbit (5x RPG)", t:"tog", k:"itemOrbitOn"},
        ];
        case "player": return [
            {l:"< Back", t:"back"},
            {l:"Invincible", t:"tog", k:"invincibleOn"},
            {l:"Invisible", t:"tog", k:"invisibleOn"},
            {l:"No Red Watch", t:"tog", k:"noRedWatchOn"},
        ];
        case "op": return [
            {l:"< Back", t:"back"},
            {l:"Orbit All", t:"tog", k:"orbitAllOn"},
            {l:"TP All to Me", t:"act", fn:actTpAllToMe},
            {l:"Yeet All", t:"act", fn:actYeetAll},
            {l:"Stink All", t:"act", fn:actStinkAll},
            {l:"Color All", t:"act", fn:actColorAll},
            {l:"Fling All", t:"act", fn:actFlingAll},
            {l:"Void All", t:"act", fn:actVoidAll},
            {l:"Money All ($99999)", t:"act", fn:actMoneyAll},
            {l:"Stun All (30s)", t:"act", fn:actStunAll},
            {l:"Explode All", t:"act", fn:actExplodeAll},
        ];
        case "prefabs": return buildPrefabListPage(PREFAB_NAMES, "prefab");
        case "mobs": return buildPrefabListPage(MOB_IDS, "mob");
        default: return [];
        }
    }

    function buildSpawnPage() {
        const list = ALL_ITEMS;
        const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
        const page = Math.min(O.page, totalPages - 1);
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, list.length);

        const its = [{l:"< Back", t:"back"}];
        for (let i = start; i < end; i++) {
            const id = list[i];
            its.push({l:id.replace("item_",""), t:"act", fn:(function(x){return function(){spawnInFront("item",x);};})(id)});
        }
        if (page > 0) its.push({l:"◀ Prev", t:"act", fn:()=>{O.page--;O.cursor=1;}});
        if (end < list.length) its.push({l:"Next ▶", t:"act", fn:()=>{O.page++;O.cursor=1;}});
        its.push({l:"<color=#aaa>Page "+(page+1)+"/"+totalPages+"</color>", t:"act", fn:()=>{}});
        return its;
    }

    function buildPrefabListPage(list, type) {
        const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
        const page = Math.min(O.page, totalPages - 1);
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, list.length);

        const its = [{l:"< Back", t:"back"}];
        for (let i = start; i < end; i++) {
            const name = list[i];
            its.push({l:name, t:"act", fn:(function(n){return function(){spawnInFront(type,n);};})(name)});
        }
        if (page > 0) its.push({l:"◀ Prev", t:"act", fn:()=>{O.page--;O.cursor=1;}});
        if (end < list.length) its.push({l:"Next ▶", t:"act", fn:()=>{O.page++;O.cursor=1;}});
        its.push({l:"<color=#aaa>Page "+(page+1)+"/"+totalPages+"</color>", t:"act", fn:()=>{}});
        return its;
    }

    // ================================================================
    //  MENU RENDERING (text-based for now — reliable in VR)
    // ================================================================
    function tabTitle() {
        switch(O.tab) {
        case "move": return " > Movement";
        case "spawn": return " > Items";
        case "gun": return " > Gun";
        case "player": return " > Player";
        case "op": return " > <color=#ff3333>OP</color>";
        case "prefabs": return " > <color=#55ccff>Prefabs</color>";
        case "mobs": return " > <color=#88ff88>Mobs</color>";
        default: return "";
        }
    }

    function render() {
        const its = menuItems();
        const L = ["<b><color=#bb88ff>Orbit Menu V6.8" + tabTitle() + "</color></b>"];
        L.push("");

        for (let i = 0; i < its.length; i++) {
            const it = its[i];
            const cur = (i === O.cursor) ? "<color=#ffcc00>▶</color> " : "   ";
            let txt = it.l;
            if (it.t === "tog") {
                txt += O[it.k] ? " <color=#00ff00>[ON]</color>" : " <color=#ff4444>[OFF]</color>";
            } else if (it.t === "tab") {
                txt += " ▸";
            }
            L.push(cur + txt);
        }
        L.push("");
        if (O.actionMsg && (O.tick - O.actionTick) < 180) L.push("<color=#00ffaa>" + O.actionMsg + "</color>");
        if (O.itemOrbitOn) L.push("<color=#ffcc00>⚡ Item Orbit x" + O.itemOrbitObjs.length + "</color>");
        if (O.flyOn) L.push("<color=#88ccff>✈ Fly ON — hold B</color>");
        L.push("<size=9><color=#666>R-Stick=nav  B/Trigger=select  L-Stick=unused</color></size>");
        return L.join("\n");
    }

    // ================================================================
    //  INPUT
    // ================================================================
    function processInput() {
        const y = joyY(1);
        const its = menuItems();
        if (O.joyCd > 0) O.joyCd--;
        else {
            if (y < -0.55 && O.cursor < its.length-1) { O.cursor++; O.joyCd=18; }
            else if (y > 0.55 && O.cursor > 0)        { O.cursor--; O.joyCd=18; }
        }
        const selNow = bBtn(1) || trigger(1);
        const press = selNow && !O.selWas;
        O.selWas = selNow;
        if (press && O.cursor < its.length) {
            const it = its[O.cursor];
            if (it.t==="tab")      { O.tab=it.to; O.cursor=0; O.page=0; }
            else if (it.t==="back"){ O.tab="main"; O.cursor=0; O.page=0; }
            else if (it.t==="tog") { O[it.k]=!O[it.k]; onToggle(it.k,O[it.k]); }
            else if (it.t==="act") { try{it.fn();}catch(e){flashAction("err: "+e.message);} }
        }
    }

    // ================================================================
    //  TOGGLE HANDLERS
    // ================================================================
    function onToggle(k, on) {
        if (k==="flyOn") toggleFly(on);
        if (k==="platformsOn" && !on) {
            if(O.platL){try{ObjectClass.method("Destroy",1).invoke(O.platL);}catch(_){}} O.platL=null;O.platLLatched=false;
            if(O.platR){try{ObjectClass.method("Destroy",1).invoke(O.platR);}catch(_){}} O.platR=null;O.platRLatched=false;
        }
        if (k==="itemGunOn") { O.gunCd=0; if(!on) hideGun(); log("Item Gun "+(on?"ON":"OFF")); }
        if (k==="itemOrbitOn") { if(on) startItemOrbit(); else stopItemOrbit(); }
        if (k==="invincibleOn") toggleInvincible(on);
        if (k==="invisibleOn") toggleInvisible(on);
        if (k==="noRedWatchOn") toggleNoRedWatch(on);
        if (k==="longArmsOn") toggleLongArms(on);
        if (k==="orbitAllOn") {
            if(on) flashAction("Orbit All ON - " + getOtherPlayers().length + " others");
            else flashAction("Orbit All OFF");
        }
    }

    // ================================================================
    //  MENU BUILD
    // ================================================================
    function initMenu() {
        if (O.menuInited || O.buildFailed) return;
        try {
            const head = headTf();
            if (!head) { if(O.tick-O.headWaitTick>=300){O.headWaitTick=O.tick;log("waiting for head...");} return; }

            let font = null;
            try {
                const fonts = ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(FontClass.type);
                for(let i=0;i<fonts.length;i++){try{if(fonts.get(i).method("get_name").invoke().toString()==="Utopium"){font=fonts.get(i);break;}}catch(_){}}
            } catch(_){}
            if (!font) try { font = ResourcesClass.method("GetBuiltinResource",2).invoke(FontClass.type.object, Il2Cpp.string("Arial.ttf")); } catch(_){}

            log("building menu...");
            const menuGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try { getComponent(menuGO, RendererClass).method("set_enabled").invoke(false); } catch(_){}
            try { getComponent(menuGO, ColliderClass).method("set_enabled").invoke(false); } catch(_){}
            getTransform(menuGO).method("SetParent",2).invoke(head, false);
            getTransform(menuGO).method("set_localPosition").invoke([-0.15, 0, 0.45]);
            getTransform(menuGO).method("set_localRotation").invoke([0,0,0,1]);
            getTransform(menuGO).method("set_localScale").invoke([1e-3,1e-3,1e-3]);

            const canvas = addComponent(menuGO, CanvasClass);
            canvas.method("set_renderMode").invoke(2);

            const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try { getComponent(textGO, RendererClass).method("set_enabled").invoke(false); } catch(_){}
            try { getComponent(textGO, ColliderClass).method("set_enabled").invoke(false); } catch(_){}
            getTransform(textGO).method("SetParent",2).invoke(getTransform(menuGO), false);

            const menuText = addComponent(textGO, TextClass);
            if (font) menuText.method("set_font").invoke(font);
            menuText.method("set_supportRichText").invoke(true);
            menuText.method("set_fontSize").invoke(14);
            menuText.method("set_alignment").invoke(0);
            menuText.method("set_resizeTextForBestFit").invoke(false);
            menuText.method("set_fontStyle").invoke(1);
            try {
                const rt = getComponent(textGO, RectTransformClass);
                if (rt && !rt.handle.isNull()) {
                    rt.method("set_anchorMin").invoke([0,1]);
                    rt.method("set_anchorMax").invoke([0,1]);
                    rt.method("set_pivot").invoke([0,1]);
                    rt.method("set_anchoredPosition").invoke([0,0]);
                    rt.method("set_sizeDelta").invoke([400,800]);
                }
            } catch(_){}

            ObjectClass.method("DontDestroyOnLoad").invoke(menuGO);
            O.menuGO = menuGO;
            O.menuText = menuText;
            O.menuInited = true;

            log("MENU BUILT — " + ALL_ITEMS.length + " items, " + PREFAB_NAMES.length + " prefabs, " + MOB_IDS.length + " mobs");
            setText(render());
        } catch(e) { O.buildFailed=true; log("BUILD FAILED: "+(e.stack||e.message||e)); }
    }

    function setText(s) {
        if (!O.menuText || s === O.lastText) return; O.lastText = s;
        try { O.menuText.method("set_text").invoke(Il2Cpp.string(s)); }
        catch(e) { log("setText: "+e); O.menuGO=null; O.menuText=null; O.menuInited=false; }
    }

    // ================================================================
    //  TICK
    // ================================================================
    function onTick() {
        O.tick++;

        // DeltaTime
        try {
            const t = TimeClass.method("get_time").invoke();
            O.deltaTime = t - O.lastTime;
            O.lastTime = t;
            if (O.deltaTime > 0.1) O.deltaTime = 0.016;
        } catch(_){ O.deltaTime = 0.016; }

        if (!O.menuInited && !O.buildFailed) initMenu();
        if (O.menuInited) {
            processInput();
            tickFly();
            tickPlatforms();
            tickOrbitAll();
            tickItemOrbit();
            tickGun();
            if (O.noRedWatchOn && O.tick % 60 === 0) toggleNoRedWatch(true);
            setText(render());
        }
        if (O.tick - O.lastLog >= 300) {
            O.lastLog = O.tick;
            log("t=" + O.tick + " fly=" + O.flyOn + " plat=" + O.platformsOn +
                " gun=" + O.itemGunOn + " orb=" + O.orbitAllOn + " iOrb=" + O.itemOrbitOn);
        }
    }

    // ================================================================
    //  HOOK
    // ================================================================
    if (!O.hookInstalled) {
        const tgt = GorillaLocomotionClass.tryMethod("OnUpdate") || GorillaLocomotionClass.tryMethod("FixedUpdate");
        if (!tgt) log("ERROR: no update method");
        else {
            Interceptor.attach(tgt.virtualAddress, { onEnter() { try { onTick(); } catch(_){} } });
            O.hookInstalled = true;
            log("hook on GorillaLocomotion." + tgt.name);
        }
    }
    log("===== Orbit Menu V6.8 READY =====");
});
}, 5000); // 5s delay for game to stabilize (like ii's menu)
