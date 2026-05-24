// ====================================================================
//  Orbit Menu V6.6 — Animal Company
//  Fixes: prefab scan by GO names, pink platforms, joystick fly,
//         item gun reticle, item orbit (RPG ammo).
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.6 LOADING =====");

    const acImage    = Il2Cpp.domain.assembly("AnimalCompany").image;
    const coreImage  = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const uiModImage = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
    const uiImage    = Il2Cpp.domain.assembly("UnityEngine.UI").image;
    const textImage  = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

    const GameObjectClass    = coreImage.class("UnityEngine.GameObject");
    const ObjectClass        = coreImage.class("UnityEngine.Object");
    const RendererClass      = coreImage.class("UnityEngine.Renderer");
    const ResourcesClass     = coreImage.class("UnityEngine.Resources");
    const CanvasClass        = uiModImage.class("UnityEngine.Canvas");
    const TextClass          = uiImage.class("UnityEngine.UI.Text");
    const FontClass          = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");

    const PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController");
    const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");
    const XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager");
    const NetPlayerClass         = acImage.class("AnimalCompany.NetPlayer");

    let PrefabGeneratorClass = null;
    try { PrefabGeneratorClass = acImage.class("AnimalCompany.PrefabGenerator"); } catch(_) {}
    let GrabbableItemPrefabClass = null;
    try { GrabbableItemPrefabClass = acImage.class("AnimalCompany.GrabbableItemPrefab"); } catch(_) {}

    // ---- state ----
    globalThis.orbit = {
        tick: 0, hookInstalled: false,
        menuInited: false, menuGO: null, menuText: null, buildFailed: false,
        cursor: 0, tab: "main", prefabPage: 0,
        joyCd: 0, selWas: false,

        platformsOn: false, flyOn: false, orbitAllOn: false, itemGunOn: false,
        platL: null, platR: null, savedGrav: null,
        orbitAngle: 0, gunCd: 0,
        reticle: null,

        // item orbit (RPG ammo)
        itemOrbitOn: false,
        itemOrbitObjs: [],
        itemOrbitAngle: 0,

        // prefab orbit
        prefabOrbitOn: false,
        prefabOrbitName: "",
        prefabOrbitObjs: [],
        prefabOrbitAngle: 0,

        // runtime discovery
        prefabNames: null,      // [string] — GO names for prefab tab
        prefabDiscovered: false,
        itemList: null,         // [string] — item IDs for item gun
        itemsDiscovered: false,

        actionMsg: "", actionTick: 0,
        lastLog: 0, lastText: "", headWaitTick: 0,
    };
    const O = globalThis.orbit;
    function log(m) { console.log("[Orbit] " + m); }

    // ================================================================
    //  SAFE VALUE HELPERS
    // ================================================================
    function readBool(v) {
        if (v === true) return true;
        if (v === false || v === null || v === undefined) return false;
        try { const u = v.unbox(); if (typeof u === "boolean") return u; if (typeof u === "number") return u !== 0; } catch(_){}
        return false;
    }
    function readInt(v) {
        if (typeof v === "number") return v;
        try { const u = v.unbox(); if (typeof u === "number") return u; } catch(_){}
        const n = parseInt(String(v), 10); return isNaN(n) ? 0 : n;
    }

    // ================================================================
    //  SINGLETONS & TRANSFORMS
    // ================================================================
    function playerInst() {
        try { const v = PlayerControllerClass.method("get_instance").invoke(); if (v && !v.handle.isNull()) return v; } catch(_){} return null;
    }
    function gorillaInst() {
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
        const p = playerInst(); if (!p) return null;
        try { const v = p.field(side===0?"_handTransformLeft":"_handTransformRight").value; if (v && !v.handle.isNull()) return v; } catch(_){} return null;
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
    //  PLAYER ITERATION — FindObjectsOfType (array, not HashSet)
    // ================================================================
    function getOtherPlayers() {
        const others = [];
        try {
            const localP = NetPlayerClass.method("get_localPlayer").invoke();
            const localH = localP ? localP.handle.toString() : "";
            let arr = null;
            try { arr = ObjectClass.method("FindObjectsOfType",1).invoke(NetPlayerClass.type); } catch(_){}
            if (!arr) try { arr = ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(NetPlayerClass.type); } catch(_){}
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
        for (const np of getOtherPlayers()) { try { fn(np); n++; } catch(e) { if(O.tick%300===0) log("forEach: "+e); } }
        return n;
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

    // ================================================================
    //  PREFAB DISCOVERY — scan GameObject names (like ACCompanion)
    // ================================================================
    const KNOWN_PREFABS = [
        "BigBanana","BonfireController","ClawMachineNetObject","Duplicator",
        "ExplosiveEgg","FishingRod","GhostLightController","GiftBoxItem",
        "GoldenNut","GravitySwitcher","LaunchPad","MoneyBag","NutCannon",
        "PaintBucket","RadioItem","RocketLauncher","SellMachine","Shield",
        "Skateboard","Snowball","SpeedBoots","Trampoline","Umbrella",
        "WaterBalloon","Wrench","BoomBox","Flashlight","Magnet",
        "Parachute","Jetpack","GrappleHook","FreezeRay","ShrinkRay",
        "GrowthRay","PortalGun","TNT","Dynamite","Firework",
        "AnglerController","BlobfishController","CrabController",
        "FrogController","SpiderController","BatController",
        "SnakeController","BeeController","SlimeController",
        "GhostController","RatController","WolfController",
        "CarController","DoorController","LightController",
        "FogController","ArenaGameManager","ItemSelling",
        "AutoReloadGun",
    ];

    // Names to skip (internal/boring objects)
    function isBoringName(n) {
        if (!n || n.length < 2) return true;
        if (n.startsWith("[Orbit")) return true;
        if (n.startsWith("__")) return true;
        const low = n.toLowerCase();
        if (low === "main camera" || low === "directional light") return true;
        if (low === "eventsystem" || low === "postprocessvolume") return true;
        if (low.startsWith("ui_") || low.startsWith("fx_")) return true;
        return false;
    }

    function discoverGamePrefabs() {
        if (O.prefabDiscovered) return;
        O.prefabDiscovered = true;

        const names = {};

        // Approach 1: FindObjectsOfType(GameObject) — active scene objects
        try {
            const arr = ObjectClass.method("FindObjectsOfType",1).invoke(GameObjectClass.type);
            if (arr) {
                const lim = Math.min(arr.length, 500);
                log("Scan1: " + arr.length + " active GOs (reading " + lim + ")");
                for (let i = 0; i < lim; i++) {
                    try {
                        const go = arr.get(i);
                        if (!go || go.handle.isNull()) continue;
                        const n = go.method("get_name").invoke().toString();
                        if (!isBoringName(n)) names[n] = true;
                    } catch(_){}
                }
            }
        } catch(e) { log("scan1 err: "+e); }

        // Approach 2: FindObjectsOfTypeAll(GameObject) — ALL loaded including prefab assets
        try {
            const arr = ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(GameObjectClass.type);
            if (arr) {
                const lim = Math.min(arr.length, 500);
                log("Scan2: " + arr.length + " total GOs (reading " + lim + ")");
                for (let i = 0; i < lim; i++) {
                    try {
                        const go = arr.get(i);
                        if (!go || go.handle.isNull()) continue;
                        const n = go.method("get_name").invoke().toString();
                        if (!isBoringName(n)) names[n] = true;
                    } catch(_){}
                }
            }
        } catch(e) { log("scan2 err: "+e); }

        // Approach 3: Known prefab names (guaranteed useful)
        for (const n of KNOWN_PREFABS) names[n] = true;

        const sorted = Object.keys(names).sort();
        O.prefabNames = sorted;
        log("Prefab scan done: " + sorted.length + " unique names");
        log("First 20: " + sorted.slice(0,20).join(", "));
    }

    // ================================================================
    //  ITEM DISCOVERY (GrabbableItemPrefab IDs — for item gun)
    // ================================================================
    const FALLBACK_ITEMS = [
        "item_dynamite","item_grenade","item_rpg","item_rpg_ammo",
        "item_shotgun","item_revolver","item_flamethrower",
        "item_demon_sword","item_great_sword","item_crossbow",
        "item_jetpack","item_hookshot","item_teleport_gun",
        "item_flashlight","item_pickaxe","item_drill",
        "item_zipline_gun","item_boombox","item_balloon",
    ];

    function discoverItems() {
        if (O.itemsDiscovered) return;
        O.itemsDiscovered = true;
        if (!GrabbableItemPrefabClass) return;
        try {
            const all = ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(GrabbableItemPrefabClass.type);
            if (!all) return;
            const ids = [], seen = {};
            for (let i = 0; i < all.length; i++) {
                try {
                    const obj = all.get(i);
                    if (!obj || obj.handle.isNull()) continue;
                    const raw = obj.method("get_itemID").invoke();
                    if (!raw) continue;
                    const id = raw.toString();
                    if (id && id.length > 0 && !seen[id]) { seen[id] = true; ids.push(id); }
                } catch(_) {}
            }
            ids.sort();
            if (ids.length > 0) { O.itemList = ids; log("Discovered " + ids.length + " item IDs"); }
        } catch(e) { log("discoverItems err: " + e); }
    }

    function getItemList() { return O.itemList || FALLBACK_ITEMS; }
    function getPrefabNames() { return O.prefabNames || KNOWN_PREFABS; }

    // ================================================================
    //  SPAWN — all via PrefabGenerator.SpawnItem (name string)
    // ================================================================
    function spawnByName(name, x, y, z) {
        if (!PrefabGeneratorClass) return null;
        const s = Il2Cpp.string(name);

        // Try static SpawnItem(string, Vec3, Quat, Transform)
        try {
            const obj = PrefabGeneratorClass.method("SpawnItem",4).invoke(s, [x,y,z], [0,0,0,1], NULL);
            if (obj && !obj.handle.isNull()) return obj;
        } catch(_) {}

        // Try on instance
        try {
            const pg = ObjectClass.method("FindObjectOfType",1).invoke(PrefabGeneratorClass.type);
            if (pg && !pg.handle.isNull()) {
                const obj = PrefabGeneratorClass.method("SpawnItem",4).on(pg).invoke(s, [x,y,z], [0,0,0,1], NULL);
                if (obj && !obj.handle.isNull()) return obj;
            }
        } catch(_) {}

        // Try SpawnItem with fewer params
        try { return PrefabGeneratorClass.method("SpawnItem",1).invoke(s); } catch(_) {}

        // Try GeneratePrefab
        try { PrefabGeneratorClass.method("GeneratePrefab",4).invoke(s, [x,y,z], [0,0,0,1], false); return true; } catch(_) {}

        return null;
    }

    function spawnInFront(name) {
        const head = headTf();
        const pos = readPos(head);
        const fwd = readFwd(head);
        if (!pos || !fwd) { flashAction("no head"); return; }
        const d = 3;
        const obj = spawnByName(name, pos.x+fwd.x*d, pos.y+fwd.y*d, pos.z+fwd.z*d);
        if (obj) flashAction("Spawned " + name);
        else flashAction("spawn failed");
    }

    // ================================================================
    //  OP ACTIONS
    // ================================================================
    function flashAction(msg) { O.actionMsg = msg; O.actionTick = O.tick; log(msg); }

    function actTpAllToMe() {
        const p = readPos(headTf()); if(!p){flashAction("no head");return;}
        let n=0; forEachOtherPlayer(np => {
            try{np.method("RPC_Teleport",1).invoke([p.x,p.y,p.z]);n++;return;}catch(_){}
            try{const tf=np.method("get_transform").invoke();if(tf&&!tf.handle.isNull()){tf.method("set_position").invoke([p.x,p.y,p.z]);n++;}}catch(_){}
        }); flashAction("TP'd "+n+" to you!");
    }
    function actYeetAll() {
        let n=0; forEachOtherPlayer(np=>{try{np.method("RPC_AddForce",1).invoke([0,50,0]);n++;}catch(_){}}); flashAction("Yeeted "+n+"!");
    }
    function actStinkAll() {
        let n=0; forEachOtherPlayer(np=>{try{np.method("RPC_TagAsStinky",0).invoke();n++;}catch(_){}}); flashAction("Stinked "+n+"!");
    }
    function actColorAll() {
        let n=0; forEachOtherPlayer(np=>{const h=Math.random()*360;
            try{np.method("RPC_SetColorHSV",4).invoke(h,1,1,1);n++;}catch(_){try{np.method("RPC_SetColorHSV",3).invoke(h,1,1);n++;}catch(_2){}}
        }); flashAction("Colored "+n+"!");
    }
    function actFlingAll() {
        let n=0; forEachOtherPlayer(np=>{
            try{np.method("RPC_AddForce",1).invoke([0,80,0]);n++;}catch(_){try{np.method("RPC_Teleport",1).invoke([0,100,0]);n++;}catch(_2){}}
        }); flashAction("Flung "+n+"!");
    }
    function actVoidAll() {
        let n=0; forEachOtherPlayer(np=>{
            try{np.method("RPC_Teleport",1).invoke([0,-500,0]);n++;}catch(_){try{const tf=np.method("get_transform").invoke();if(tf&&!tf.handle.isNull()){tf.method("set_position").invoke([0,-500,0]);n++;}}catch(_2){}}
        }); flashAction("Voided "+n+"!");
    }
    function actMoneyAll() {
        let n=0; forEachOtherPlayer(np=>{try{np.method("RPC_AddPlayerMoney",1).invoke(99999);n++;}catch(_){}}); flashAction("$99999 to "+n+"!");
    }

    // ================================================================
    //  ITEM ORBIT — 5x RPG ammo orbiting around player
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
            const obj = spawnByName("item_rpg_ammo", sx, pos.y + 0.5, sz);
            if (obj && obj !== true && !obj.handle.isNull()) {
                try { ObjectClass.method("DontDestroyOnLoad").invoke(obj); } catch(_){}
                spawned.push(obj);
            }
        }
        if (spawned.length === 0) { flashAction("item orbit spawn failed"); return; }
        O.itemOrbitObjs = spawned;
        O.itemOrbitOn = true;
        O.itemOrbitAngle = 0;
        flashAction(spawned.length + "x RPG ammo orbiting!");
        log("Item orbit ON: " + spawned.length + " objects");
    }

    function stopItemOrbit() {
        for (const obj of O.itemOrbitObjs) {
            try { ObjectClass.method("Destroy").invoke(obj); } catch(_){}
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
                obj.method("get_transform").invoke().method("set_position").invoke([
                    myPos.x + Math.cos(angle) * radius,
                    myPos.y + 0.5,
                    myPos.z + Math.sin(angle) * radius
                ]);
                alive.push(obj);
            } catch(_){}
        }
        O.itemOrbitObjs = alive;
        if (alive.length === 0) { O.itemOrbitOn = false; log("item orbit: all lost"); }
    }

    // ================================================================
    //  PREFAB ORBIT — spawn 5 of any prefab, orbit around player
    // ================================================================
    function startPrefabOrbit(name) {
        stopPrefabOrbit();
        O.prefabOrbitName = name;
        const pos = readPos(headTf());
        if (!pos) { flashAction("no head"); return false; }

        const spawned = [];
        for (let i = 0; i < 5; i++) {
            const angle = (2 * Math.PI / 5) * i;
            const sx = pos.x + Math.cos(angle) * 3;
            const sz = pos.z + Math.sin(angle) * 3;
            const obj = spawnByName(name, sx, pos.y + 0.5, sz);
            if (obj && obj !== true && !obj.handle.isNull()) {
                try { ObjectClass.method("DontDestroyOnLoad").invoke(obj); } catch(_){}
                spawned.push(obj);
            }
        }
        if (spawned.length === 0) { flashAction("orbit spawn failed"); return false; }
        O.prefabOrbitObjs = spawned;
        O.prefabOrbitOn = true;
        O.prefabOrbitAngle = 0;
        flashAction(spawned.length + "x " + name + " orbiting!");
        return true;
    }

    function stopPrefabOrbit() {
        for (const obj of O.prefabOrbitObjs) {
            try { ObjectClass.method("Destroy").invoke(obj); } catch(_){}
        }
        O.prefabOrbitObjs = [];
        O.prefabOrbitOn = false;
        O.prefabOrbitName = "";
    }

    function tickPrefabOrbit() {
        if (!O.prefabOrbitOn || O.prefabOrbitObjs.length === 0) return;
        O.prefabOrbitAngle += 0.04;
        if (O.prefabOrbitAngle > 6.2831853) O.prefabOrbitAngle -= 6.2831853;

        const myPos = readPos(headTf());
        if (!myPos) return;

        const radius = 2.5, step = (2 * Math.PI) / O.prefabOrbitObjs.length;
        const alive = [];
        for (let i = 0; i < O.prefabOrbitObjs.length; i++) {
            const obj = O.prefabOrbitObjs[i];
            try {
                if (!obj || obj.handle.isNull()) continue;
                const angle = O.prefabOrbitAngle + step * i;
                obj.method("get_transform").invoke().method("set_position").invoke([
                    myPos.x + Math.cos(angle) * radius,
                    myPos.y + 0.5,
                    myPos.z + Math.sin(angle) * radius
                ]);
                alive.push(obj);
            } catch(_){}
        }
        O.prefabOrbitObjs = alive;
        if (alive.length === 0) { O.prefabOrbitOn = false; }
    }

    // ================================================================
    //  MENU STRUCTURE
    // ================================================================
    const PER_PAGE = 5;

    function items() {
        switch (O.tab) {
        case "main": return [
            {l:"Movement",  t:"tab", to:"move"},
            {l:"Items",     t:"tab", to:"items"},
            {l:"<color=#ff3333>Overpowered</color>", t:"tab", to:"op"},
            {l:"<color=#55ccff>Prefabs</color>", t:"tab", to:"prefabs"},
        ];
        case "move": return [
            {l:"< Back", t:"back"},
            {l:"Platforms", t:"tog", k:"platformsOn"},
            {l:"Fly", t:"tog", k:"flyOn"},
        ];
        case "items": return [
            {l:"< Back", t:"back"},
            {l:"Random Item Gun", t:"tog", k:"itemGunOn"},
            {l:"Item Orbit", t:"tog", k:"itemOrbitOn"},
        ];
        case "op": return [
            {l:"< Back",       t:"back"},
            {l:"Orbit All",    t:"tog", k:"orbitAllOn"},
            {l:"TP All to Me", t:"act", fn:actTpAllToMe},
            {l:"Yeet All",     t:"act", fn:actYeetAll},
            {l:"Stink All",    t:"act", fn:actStinkAll},
            {l:"Color All",    t:"act", fn:actColorAll},
            {l:"Fling All Up", t:"act", fn:actFlingAll},
            {l:"Void All",     t:"act", fn:actVoidAll},
            {l:"Money All",    t:"act", fn:actMoneyAll},
        ];
        case "prefabs": return buildPrefabPage();
        case "prefab_orbit_pick": return buildOrbitPickPage();
        default: return [];
        }
    }

    function buildPrefabPage() {
        const list = getPrefabNames();
        const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
        const page = Math.min(O.prefabPage, totalPages - 1);
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, list.length);

        const its = [{l:"< Back", t:"back"}];

        // Prefab Orbit toggle / pick
        if (O.prefabOrbitOn) {
            its.push({l:"Prefab Orbit", t:"tog", k:"prefabOrbitOn"});
        } else {
            its.push({l:"Prefab Orbit ▸", t:"tab", to:"prefab_orbit_pick"});
        }

        // Rescan button
        its.push({l:"<color=#aaaaaa>Rescan</color>", t:"act", fn:()=>{
            O.prefabDiscovered=false; discoverGamePrefabs(); flashAction("Rescanned!");
        }});

        for (let i = start; i < end; i++) {
            const name = list[i];
            its.push({l:name, t:"act", fn:()=>spawnInFront(name)});
        }
        if (page > 0) its.push({l:"◀ Prev Page", t:"act", fn:()=>{O.prefabPage--;O.cursor=3;}});
        if (end < list.length) its.push({l:"Next Page ▶", t:"act", fn:()=>{O.prefabPage++;O.cursor=3;}});
        return its;
    }

    function buildOrbitPickPage() {
        const list = getPrefabNames();
        const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
        const page = Math.min(O.prefabPage, totalPages - 1);
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, list.length);

        const its = [{l:"< Back", t:"act", fn:()=>{O.tab="prefabs";O.cursor=0;O.prefabPage=0;}}];
        for (let i = start; i < end; i++) {
            const name = list[i];
            its.push({l:name, t:"act", fn:()=>{
                if (startPrefabOrbit(name)) { O.tab = "prefabs"; O.cursor = 0; O.prefabPage = 0; }
            }});
        }
        if (page > 0) its.push({l:"◀ Prev", t:"act", fn:()=>{O.prefabPage--;O.cursor=1;}});
        if (end < list.length) its.push({l:"Next ▶", t:"act", fn:()=>{O.prefabPage++;O.cursor=1;}});
        return its;
    }

    function tabTitle() {
        switch(O.tab) {
        case "move":    return " > Movement";
        case "items":   return " > Items";
        case "op":      return " > <color=#ff3333>OP</color>";
        case "prefabs": return " > <color=#55ccff>Prefabs</color>";
        case "prefab_orbit_pick": return " > <color=#55ccff>Orbit Pick</color>";
        default:        return "";
        }
    }

    function render() {
        const its = items();
        const L = ["<color=#bb88ff>Orbit Menu" + tabTitle() + "</color>"];

        if (O.tab === "prefabs" || O.tab === "prefab_orbit_pick") {
            const list = getPrefabNames();
            const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
            L.push("<color=#aaaaaa>Page "+(O.prefabPage+1)+"/"+totalPages+" ("+list.length+" prefabs)</color>");
        }
        L.push("");

        for (let i = 0; i < its.length; i++) {
            const it = its[i];
            const cur = (i===O.cursor) ? "<color=#ffcc00>▶</color> " : "   ";
            let txt = it.l;
            if (it.t === "tog") {
                txt += O[it.k] ? " <color=#00ff00>[ON]</color>" : " <color=#ff4444>[OFF]</color>";
            } else if (it.t === "tab") {
                txt += " ▸";
            } else if (it.t === "act" && O.tab === "op") {
                txt = "<color=#ffaa44>" + txt + "</color>";
            }
            L.push(cur + txt);
        }
        L.push("");
        if (O.actionMsg && (O.tick - O.actionTick) < 180) L.push("<color=#00ffaa>"+O.actionMsg+"</color>");
        if (O.prefabOrbitOn) L.push("<color=#55ccff>P-Orbit: "+O.prefabOrbitName+" x"+O.prefabOrbitObjs.length+"</color>");
        if (O.itemOrbitOn) L.push("<color=#ffcc00>I-Orbit: RPG ammo x"+O.itemOrbitObjs.length+"</color>");
        L.push("<color=#888888>L-Stick=fly  R-Stick=nav  B/Trigger=sel</color>");
        return L.join("\n");
    }

    // ================================================================
    //  INPUT
    // ================================================================
    function processInput() {
        const yR=joyY(1), yL=joyY(0);
        // Right stick for menu nav only
        const y = yR;
        const its = items();
        if (O.joyCd > 0) O.joyCd--;
        else {
            if (y < -0.55 && O.cursor < its.length-1) { O.cursor++; O.joyCd=20; }
            else if (y > 0.55 && O.cursor > 0)        { O.cursor--; O.joyCd=20; }
        }
        const selNow = bBtn(1) || trigger(1);
        const press = selNow && !O.selWas;
        O.selWas = selNow;
        if (press && O.cursor < its.length) {
            const it = its[O.cursor];
            log("SELECT: "+it.l+" type="+it.t);
            if (it.t==="tab")      { O.tab=it.to; O.cursor=0; if(it.to==="prefabs"||it.to==="prefab_orbit_pick") O.prefabPage=0; }
            else if (it.t==="back"){ O.tab="main"; O.cursor=0; }
            else if (it.t==="tog") {
                O[it.k]=!O[it.k]; log(it.k+"="+O[it.k]); onToggle(it.k,O[it.k]);
            }
            else if (it.t==="act") { try{it.fn();}catch(e){flashAction("err: "+(e.message||e));} }
        }
    }

    // ================================================================
    //  TOGGLE HANDLERS
    // ================================================================
    function onToggle(k, on) {
        if (k==="flyOn") toggleFly(on);
        if (k==="platformsOn"&&!on) { killPlat(0);killPlat(1); }
        if (k==="orbitAllOn") {
            if(on){const n=getOtherPlayers().length;log("Orbit All ON - "+n+" others");if(n===0)flashAction("no other players!");}
            else log("Orbit All OFF");
        }
        if (k==="itemGunOn") {
            log("Item Gun "+(on?"ON":"OFF")); O.gunCd=0;
            if (!on) hideReticle();
        }
        if (k==="itemOrbitOn") {
            if (on) startItemOrbit();
            else { stopItemOrbit(); log("Item Orbit OFF"); }
        }
        if (k==="prefabOrbitOn" && !on) { stopPrefabOrbit(); log("Prefab Orbit OFF"); }
    }

    // ---- FLY (left joystick = move, head direction = forward) ----
    function toggleFly(on) {
        const gl=gorillaInst(); if(!gl)return;
        try{if(on){O.savedGrav=gl.method("get_gravityScale").invoke();gl.method("set_gravityScale").invoke(0.0);log("fly ON");}
        else{gl.method("set_gravityScale").invoke(O.savedGrav!=null?O.savedGrav:1.0);O.savedGrav=null;log("fly OFF");}}catch(e){log("fly: "+e);}
    }
    function tickFly() {
        if(!O.flyOn)return;
        const gl=gorillaInst(); if(!gl)return;
        try{gl.method("set_gravityScale").invoke(0.0);}catch(_){}
        try{
            const rb=gl.method("get_playerRigidbody").invoke();
            if(!rb||rb.handle.isNull())return;

            // LEFT joystick for movement
            const lx=joyX(0), ly=joyY(0);
            if(Math.abs(lx)<0.15 && Math.abs(ly)<0.15){
                try{rb.method("set_velocity").invoke([0,0,0]);}catch(_){}
                return;
            }

            const head=headTf();
            const fwd=readFwd(head); if(!fwd) return;

            // Horizontal forward direction (flatten Y for ground-relative)
            const hLen=Math.sqrt(fwd.x*fwd.x+fwd.z*fwd.z)||0.001;
            const hfx=fwd.x/hLen, hfz=fwd.z/hLen;
            // Right vector (perpendicular to forward on XZ plane)
            const rx=hfz, rz=-hfx;

            const sp=8;
            const vx=(hfx*ly + rx*lx)*sp;
            const vy=fwd.y*ly*sp;   // vertical from head pitch
            const vz=(hfz*ly + rz*lx)*sp;

            rb.method("set_velocity").invoke([vx,vy,vz]);
        }catch(_){}
    }

    // ---- PLATFORMS (pink, both eyes, stable position) ----
    function ensurePlat(s) {
        const k=s===0?"platL":"platR";
        if(O[k]&&!O[k].handle.isNull()){movePlat(s);return;}
        try{
            const p=GameObjectClass.method("CreatePrimitive").invoke(3); // Cube
            p.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
            p.method("get_transform").invoke().method("set_localScale").invoke([0.4,0.035,0.4]);
            p.method("set_layer").invoke(0); // default layer = both eyes

            // Set pink color
            try{
                const rend=p.method("GetComponent",1).inflate(RendererClass).invoke();
                if(rend&&!rend.handle.isNull()){
                    const mat=rend.method("get_material").invoke();
                    if(mat&&!mat.handle.isNull()){
                        mat.method("set_color").invoke([1.0,0.4,0.7,1.0]); // pink
                    }
                }
            }catch(e2){log("plat color: "+e2);}

            ObjectClass.method("DontDestroyOnLoad").invoke(p);
            O[k]=p;
            movePlat(s);
        }catch(e){log("plat: "+e);}
    }
    function movePlat(s) {
        const k=s===0?"platL":"platR";const p=O[k];if(!p)return;
        const pos=readPos(handTf(s));if(!pos)return;
        // Place just below the hand
        try{p.method("get_transform").invoke().method("set_position").invoke([pos.x,pos.y-0.12,pos.z]);}catch(_){}
    }
    function killPlat(s) { const k=s===0?"platL":"platR"; if(!O[k])return; try{ObjectClass.method("Destroy").invoke(O[k]);}catch(_){} O[k]=null; }
    function tickPlat() {
        if(!O.platformsOn)return;
        if(grip(0))ensurePlat(0);else killPlat(0);
        if(grip(1))ensurePlat(1);else killPlat(1);
    }

    // ---- ORBIT ALL ----
    function tickOrbitAll() {
        if(!O.orbitAllOn)return;
        O.orbitAngle+=0.033;if(O.orbitAngle>6.2831853)O.orbitAngle-=6.2831853;
        try{
            const myPos=readPos(headTf());if(!myPos)return;
            const others=getOtherPlayers();
            if(others.length===0){if(O.tick%300===0)log("orbitAll: 0 others");return;}
            const radius=3.8,step=(2*Math.PI)/others.length;
            for(let i=0;i<others.length;i++){
                const np=others[i],angle=O.orbitAngle+step*i;
                const ox=myPos.x+Math.cos(angle)*radius,oz=myPos.z+Math.sin(angle)*radius,oy=myPos.y+0.5;
                let ok=false;
                if(!ok)try{np.method("RPC_Teleport",1).invoke([ox,oy,oz]);ok=true;}catch(_){}
                if(!ok)try{const r=np.field("avatarRoot").value;if(r&&!r.handle.isNull()){r.method("set_position").invoke([ox,oy,oz]);ok=true;}}catch(_){}
                if(!ok)try{const tf=np.method("get_transform").invoke();if(tf&&!tf.handle.isNull())tf.method("set_position").invoke([ox,oy,oz]);}catch(_){}
            }
        }catch(e){if(O.tick%300===0)log("orbitAll: "+e);}
    }

    // ---- ITEM GUN + RED RETICLE ----
    function ensureReticle() {
        if(O.reticle&&!O.reticle.handle.isNull())return;
        try{
            const r=GameObjectClass.method("CreatePrimitive").invoke(1); // Sphere
            r.method("set_name").invoke(Il2Cpp.string("[OrbitReticle]"));
            r.method("get_transform").invoke().method("set_localScale").invoke([0.12,0.01,0.12]); // flat disc
            r.method("set_layer").invoke(0);
            // Red color
            try{
                const rend=r.method("GetComponent",1).inflate(RendererClass).invoke();
                if(rend&&!rend.handle.isNull()){
                    const mat=rend.method("get_material").invoke();
                    if(mat&&!mat.handle.isNull()) mat.method("set_color").invoke([1.0,0.0,0.0,0.9]);
                }
            }catch(_){}
            ObjectClass.method("DontDestroyOnLoad").invoke(r);
            O.reticle=r;
        }catch(e){log("reticle: "+e);}
    }
    function hideReticle() {
        if(!O.reticle)return;
        try{O.reticle.method("SetActive").invoke(false);}catch(_){}
    }
    function tickReticle() {
        if(!O.itemGunOn){hideReticle();return;}
        ensureReticle();
        if(!O.reticle)return;
        const hand=handTf(1); // right hand
        if(!hand){hideReticle();return;}
        const pos=readPos(hand),fwd=readFwd(hand);
        if(!pos||!fwd){hideReticle();return;}
        const d=3;
        try{
            O.reticle.method("SetActive").invoke(true);
            O.reticle.method("get_transform").invoke().method("set_position").invoke([
                pos.x+fwd.x*d, pos.y+fwd.y*d, pos.z+fwd.z*d
            ]);
        }catch(_){}
    }
    function tickItemGun() {
        if(!O.itemGunOn)return;
        tickReticle();
        if(O.gunCd>0){O.gunCd--;return;}
        if(!trigger(1))return;
        O.gunCd=30;
        // Spawn at reticle position (hand forward * 3m)
        const hand=handTf(1);
        const pos=readPos(hand),fwd=readFwd(hand);
        if(!pos||!fwd)return;
        const d=3;
        const ids=getItemList();
        const id=ids[Math.floor(Math.random()*ids.length)];
        const obj=spawnByName(id, pos.x+fwd.x*d, pos.y+fwd.y*d, pos.z+fwd.z*d);
        if(obj) flashAction("Shot: "+id.replace("item_",""));
    }

    // ================================================================
    //  MENU BUILD
    // ================================================================
    function initMenu() {
        if(O.menuInited||O.buildFailed)return;
        try{
            let font=null;
            try{const fonts=ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(FontClass.type);
                for(let i=0;i<fonts.length;i++){try{if(FontClass.method("get_name").on(fonts.get(i)).invoke().toString()==="Utopium"){font=fonts.get(i);break;}}catch(_){}}
            }catch(_){}
            if(!font)try{font=ResourcesClass.method("GetBuiltinResource",1).inflate(FontClass).invoke(Il2Cpp.string("Arial.ttf"));}catch(_){}

            const head=headTf();
            if(!head){if(O.tick-O.headWaitTick>=300){O.headWaitTick=O.tick;log("waiting for head...");}return;}

            log("building menu...");
            const menuGO=GameObjectClass.method("CreatePrimitive").invoke(3);
            menuGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try{menuGO.method("GetComponent",1).inflate(RendererClass).invoke().method("set_enabled").invoke(false);}catch(_){}
            menuGO.method("get_transform").invoke().method("SetParent",2).invoke(head,false);
            menuGO.method("get_transform").invoke().method("set_localPosition").invoke([-0.15,0,0.45]);
            menuGO.method("get_transform").invoke().method("set_localRotation").invoke([0,0,0,1]);
            menuGO.method("get_transform").invoke().method("set_localScale").invoke([1e-3,1e-3,1e-3]);
            const canvas=menuGO.method("AddComponent",1).inflate(CanvasClass).invoke();
            canvas.method("set_renderMode").invoke(2);

            const textGO=GameObjectClass.method("CreatePrimitive").invoke(3);
            textGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try{textGO.method("GetComponent",1).inflate(RendererClass).invoke().method("set_enabled").invoke(false);}catch(_){}
            textGO.method("get_transform").invoke().method("SetParent",2).invoke(menuGO.method("get_transform").invoke(),false);

            const menuText=textGO.method("AddComponent",1).inflate(TextClass).invoke();
            if(font)menuText.method("set_font").invoke(font);
            menuText.method("set_supportRichText").invoke(true);
            menuText.method("set_fontSize").invoke(14);
            menuText.method("set_alignment").invoke(0);
            menuText.method("set_resizeTextForBestFit").invoke(false);
            menuText.method("set_fontStyle").invoke(1);
            try{const rt=textGO.method("GetComponent",1).inflate(RectTransformClass).invoke();
                if(rt&&!rt.handle.isNull()){rt.method("set_anchorMin").invoke([0,1]);rt.method("set_anchorMax").invoke([0,1]);
                    rt.method("set_pivot").invoke([0,1]);rt.method("set_anchoredPosition").invoke([0,0]);rt.method("set_sizeDelta").invoke([400,800]);}}catch(_){}

            ObjectClass.method("DontDestroyOnLoad").invoke(menuGO);
            O.menuGO=menuGO;O.menuText=menuText;O.menuInited=true;

            // Discover prefabs + items after menu builds (game is loaded)
            discoverGamePrefabs();
            discoverItems();

            log("MENU BUILT — prefabs=" + getPrefabNames().length + " items=" + getItemList().length);
            setText(render());
        }catch(e){O.buildFailed=true;log("BUILD FAILED: "+(e.stack||e.message||e));}
    }

    function setText(s) {
        if(!O.menuText||s===O.lastText)return; O.lastText=s;
        try{O.menuText.method("set_text").invoke(Il2Cpp.string(s));}
        catch(e){log("setText: "+e);O.menuGO=null;O.menuText=null;O.menuInited=false;}
    }

    // ================================================================
    //  TICK
    // ================================================================
    function onTick() {
        O.tick++;
        if(!O.menuInited&&!O.buildFailed)initMenu();
        if(O.menuInited){
            processInput(); tickFly(); tickPlat(); tickOrbitAll();
            tickPrefabOrbit(); tickItemOrbit(); tickItemGun();
            setText(render());
        }
        if(O.tick-O.lastLog>=300){O.lastLog=O.tick;
            log("t="+O.tick+" tab="+O.tab+" fly="+O.flyOn+" plat="+O.platformsOn+
                " orb="+O.orbitAllOn+" iOrb="+O.itemOrbitOn+" pOrb="+O.prefabOrbitOn+
                " gun="+O.itemGunOn+" prefabs="+getPrefabNames().length);
        }
    }

    // ================================================================
    //  HOOK
    // ================================================================
    if(!O.hookInstalled){
        const tgt=GorillaLocomotionClass.tryMethod("OnUpdate")||GorillaLocomotionClass.tryMethod("FixedUpdate");
        if(!tgt)log("ERROR: no update method");
        else{Interceptor.attach(tgt.virtualAddress,{onEnter(){try{onTick();}catch(_){}}});O.hookInstalled=true;log("hook on GorillaLocomotion."+tgt.name);}
    }
    log("===== Orbit Menu V6.6 READY =====");
});
