// ====================================================================
//  Orbit Menu V6.5 — Animal Company
//  Real prefab discovery (machines, objects, etc.), prefab orbit, OP.
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.5 LOADING =====");

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

        // prefab orbit
        prefabOrbitOn: false,
        prefabOrbitIdx: -1,
        prefabOrbitObjs: [],
        prefabOrbitAngle: 0,

        // runtime discovery
        prefabEntries: null,    // [{name,go}] — real game prefabs (machines etc.)
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
    function trigger(hand) { try { return readBool(XRInputManagerClass.method("GetTriggerButtonValue").invoke(hand)); } catch(_){return false;} }
    function grip(hand) { try { return readBool(XRInputManagerClass.method("AnyGrabInputPressed",1).invoke(hand)); } catch(_){return false;} }
    function bBtn(hand) {
        try { if(readBool(XRInputManagerClass.method("GetButtonDown").invoke(hand,1))) return true; } catch(_){}
        try { if(readBool(XRInputManagerClass.method("GetButtonDown").invoke(hand,0))) return true; } catch(_){}
        return false;
    }

    // ================================================================
    //  RUNTIME PREFAB DISCOVERY  (actual GameObjects — machines etc.)
    // ================================================================
    function discoverGamePrefabs() {
        if (O.prefabDiscovered) return;
        O.prefabDiscovered = true;

        try {
            const all = ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(GameObjectClass.type);
            if (!all) { log("FindObjectsOfTypeAll(GO) returned null"); return; }

            log("Scanning " + all.length + " GameObjects for prefabs...");

            const prefabs = [];
            const rootObjs = [];
            const seen = {};
            let sceneCheckOk = false;

            for (let i = 0; i < all.length; i++) {
                try {
                    const go = all.get(i);
                    if (!go || go.handle.isNull()) continue;

                    // Get name
                    let name = "";
                    try { name = go.method("get_name").invoke().toString(); } catch(_) { continue; }
                    if (!name || name.length < 2) continue;
                    if (name.startsWith("[Orbit")) continue;
                    if (seen[name]) continue;

                    // Root objects only (no parent transform)
                    let isRoot = false;
                    try {
                        const parent = go.method("get_transform").invoke().method("get_parent").invoke();
                        isRoot = !parent || parent.handle.isNull();
                    } catch(_) { isRoot = true; }
                    if (!isRoot) continue;

                    seen[name] = true;
                    const entry = { name: name, go: go };

                    // Check if this is a prefab asset (not in any loaded scene)
                    // Prefabs have an empty scene name or buildIndex == -1
                    let isPrefab = false;
                    try {
                        const scene = go.method("get_scene").invoke();
                        let sn = "";
                        try { sn = scene.method("get_name").invoke().toString(); } catch(_) {}
                        if (typeof sn === "string") {
                            sceneCheckOk = true;
                            isPrefab = (sn.length === 0);
                        }
                    } catch(_) {}

                    if (isPrefab) prefabs.push(entry);
                    rootObjs.push(entry);
                } catch(_) {}
            }

            let result;
            if (prefabs.length > 5) {
                result = prefabs;
                log("Found " + prefabs.length + " prefab assets (scene check OK)");
            } else if (sceneCheckOk && prefabs.length > 0) {
                result = prefabs;
                log("Found " + prefabs.length + " prefab assets");
            } else {
                // Scene check didn't work or found too few — show all root objects
                result = rootObjs;
                log("Scene check " + (sceneCheckOk ? "found only " + prefabs.length : "unavailable") +
                    " — showing all " + rootObjs.length + " root objects");
            }

            result.sort((a, b) => a.name.localeCompare(b.name));

            if (result.length > 0) {
                O.prefabEntries = result;
                log("Prefab list: " + result.length + " entries");
                // Log first 20 for debugging
                const preview = result.slice(0, 20).map(e => e.name).join(", ");
                log("First 20: " + preview);
            } else {
                log("WARNING: No prefabs found at all");
            }
        } catch(e) { log("discoverGamePrefabs err: " + e); }
    }

    // ================================================================
    //  ITEM DISCOVERY  (GrabbableItemPrefab IDs — for item gun only)
    // ================================================================
    const FALLBACK_ITEMS = [
        "item_dynamite","item_grenade","item_rpg","item_shotgun","item_revolver",
        "item_flamethrower","item_demon_sword","item_great_sword","item_crossbow",
        "item_jetpack","item_hookshot","item_teleport_gun","item_flashlight",
        "item_pickaxe","item_drill","item_zipline_gun","item_boombox","item_balloon",
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
    function getPrefabEntries() { return O.prefabEntries || []; }

    // ================================================================
    //  SPAWN — items via PrefabGenerator, prefabs via Instantiate
    // ================================================================
    function spawnItemAt(itemId, x, y, z) {
        if (!PrefabGeneratorClass) return null;
        try {
            return PrefabGeneratorClass.method("SpawnItem",4).invoke(
                Il2Cpp.string(itemId), [x,y,z], [0,0,0,1], NULL
            );
        } catch(e) { log("spawnItem4: "+e); }
        try {
            return PrefabGeneratorClass.method("SpawnItem",3).invoke(
                Il2Cpp.string(itemId), [x,y,z], [0,0,0,1]
            );
        } catch(e) { log("spawnItem3: "+e); }
        return null;
    }

    function spawnPrefabAt(prefabGO, x, y, z) {
        // Clone a real prefab via Object.Instantiate
        try {
            const clone = ObjectClass.method("Instantiate",1).invoke(prefabGO);
            if (!clone || clone.handle.isNull()) { log("Instantiate returned null"); return null; }
            try {
                clone.method("get_transform").invoke().method("set_position").invoke([x,y,z]);
            } catch(e2) { log("set_position after Instantiate: "+e2); }
            return clone;
        } catch(e) { log("Instantiate err: "+e); }
        // Fallback: try Instantiate with 3 params (obj, pos, rot)
        try {
            const clone = ObjectClass.method("Instantiate",3).invoke(prefabGO, [x,y,z], [0,0,0,1]);
            if (clone && !clone.handle.isNull()) return clone;
        } catch(e2) { log("Instantiate3 err: "+e2); }
        return null;
    }

    function spawnItemInFront(itemId) {
        const head = headTf();
        const pos = readPos(head);
        const fwd = readFwd(head);
        if (!pos || !fwd) { flashAction("no head"); return; }
        const sx = pos.x + fwd.x*2, sy = pos.y + fwd.y*2, sz = pos.z + fwd.z*2;
        const obj = spawnItemAt(itemId, sx, sy, sz);
        if (obj) flashAction("Spawned " + itemId.replace("item_",""));
        else flashAction("spawn failed");
    }

    function spawnPrefabInFront(entry) {
        const head = headTf();
        const pos = readPos(head);
        const fwd = readFwd(head);
        if (!pos || !fwd) { flashAction("no head"); return; }
        const sx = pos.x + fwd.x*3, sy = pos.y, sz = pos.z + fwd.z*3;
        const obj = spawnPrefabAt(entry.go, sx, sy, sz);
        if (obj) flashAction("Spawned " + entry.name);
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
    //  PREFAB ORBIT — spawn 5 of a real prefab, orbit around player
    // ================================================================
    function startPrefabOrbit(entry) {
        stopPrefabOrbit();
        O.prefabOrbitIdx = entry.name;
        const pos = readPos(headTf());
        if (!pos) { flashAction("no head"); return false; }

        const spawned = [];
        for (let i = 0; i < 5; i++) {
            const angle = (2 * Math.PI / 5) * i;
            const sx = pos.x + Math.cos(angle) * 3;
            const sz = pos.z + Math.sin(angle) * 3;
            const obj = spawnPrefabAt(entry.go, sx, pos.y + 0.5, sz);
            if (obj && !obj.handle.isNull()) {
                try { ObjectClass.method("DontDestroyOnLoad").invoke(obj); } catch(_){}
                spawned.push(obj);
            }
        }
        if (spawned.length === 0) {
            flashAction("orbit spawn failed");
            return false;
        }
        O.prefabOrbitObjs = spawned;
        O.prefabOrbitOn = true;
        O.prefabOrbitAngle = 0;
        flashAction(spawned.length + "x " + entry.name + " orbiting!");
        log("Prefab orbit ON: " + spawned.length + "x " + entry.name);
        return true;
    }

    function stopPrefabOrbit() {
        for (const obj of O.prefabOrbitObjs) {
            try { ObjectClass.method("Destroy").invoke(obj); } catch(_){}
        }
        O.prefabOrbitObjs = [];
        O.prefabOrbitOn = false;
        O.prefabOrbitIdx = -1;
    }

    function tickPrefabOrbit() {
        if (!O.prefabOrbitOn || O.prefabOrbitObjs.length === 0) return;
        O.prefabOrbitAngle += 0.04;
        if (O.prefabOrbitAngle > 6.2831853) O.prefabOrbitAngle -= 6.2831853;

        const myPos = readPos(headTf());
        if (!myPos) return;

        const radius = 2.5;
        const step = (2 * Math.PI) / O.prefabOrbitObjs.length;
        const alive = [];
        for (let i = 0; i < O.prefabOrbitObjs.length; i++) {
            const obj = O.prefabOrbitObjs[i];
            try {
                if (!obj || obj.handle.isNull()) continue;
                const angle = O.prefabOrbitAngle + step * i;
                const ox = myPos.x + Math.cos(angle) * radius;
                const oz = myPos.z + Math.sin(angle) * radius;
                const oy = myPos.y + 0.5;
                obj.method("get_transform").invoke().method("set_position").invoke([ox, oy, oz]);
                alive.push(obj);
            } catch(_){}
        }
        O.prefabOrbitObjs = alive;
        if (alive.length === 0) { O.prefabOrbitOn = false; log("prefab orbit: all objects lost"); }
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
        const list = getPrefabEntries();
        if (list.length === 0) return [{l:"< Back", t:"back"}, {l:"<color=#ff4444>No prefabs found</color>", t:"act", fn:()=>{
            O.prefabDiscovered = false; discoverGamePrefabs();
            flashAction("Rescanning...");
        }}];

        const totalPages = Math.ceil(list.length / PER_PAGE);
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

        for (let i = start; i < end; i++) {
            const entry = list[i];
            its.push({l:entry.name, t:"act", fn:()=>spawnPrefabInFront(entry)});
        }
        if (page > 0) its.push({l:"◀ Prev Page", t:"act", fn:()=>{O.prefabPage--;O.cursor=2;}});
        if (end < list.length) its.push({l:"Next Page ▶", t:"act", fn:()=>{O.prefabPage++;O.cursor=2;}});
        return its;
    }

    function buildOrbitPickPage() {
        const list = getPrefabEntries();
        if (list.length === 0) return [{l:"< Back", t:"act", fn:()=>{O.tab="prefabs";O.cursor=0;}}];

        const totalPages = Math.ceil(list.length / PER_PAGE);
        const page = Math.min(O.prefabPage, totalPages - 1);
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, list.length);

        const its = [{l:"< Back", t:"act", fn:()=>{O.tab="prefabs";O.cursor=0;O.prefabPage=0;}}];
        for (let i = start; i < end; i++) {
            const entry = list[i];
            its.push({l:entry.name, t:"act", fn:()=>{
                if (startPrefabOrbit(entry)) { O.tab = "prefabs"; O.cursor = 0; O.prefabPage = 0; }
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
            const list = getPrefabEntries();
            const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
            const src = O.prefabEntries ? "runtime" : "none";
            L.push("<color=#aaaaaa>Page "+(O.prefabPage+1)+"/"+totalPages+" ("+list.length+" "+src+")</color>");
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
        if (O.prefabOrbitOn) L.push("<color=#55ccff>Orbiting: "+O.prefabOrbitIdx+" x"+O.prefabOrbitObjs.length+"</color>");
        L.push("<color=#888888>Stick↕ nav  B/Trigger=select</color>");
        return L.join("\n");
    }

    // ================================================================
    //  INPUT
    // ================================================================
    function processInput() {
        const yR=joyY(1), yL=joyY(0);
        const y = Math.abs(yR)>Math.abs(yL) ? yR : yL;
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
            if(on){const n=getOtherPlayers().length;log("Orbit All ON - "+n+" other players");if(n===0)flashAction("no other players!");}
            else log("Orbit All OFF");
        }
        if (k==="itemGunOn") { log("Item Gun "+(on?"ON":"OFF")); O.gunCd=0; }
        if (k==="prefabOrbitOn" && !on) { stopPrefabOrbit(); log("Prefab Orbit OFF"); }
    }

    // ---- FLY ----
    function toggleFly(on) {
        const gl=gorillaInst(); if(!gl)return;
        try{if(on){O.savedGrav=gl.method("get_gravityScale").invoke();gl.method("set_gravityScale").invoke(0.0);log("fly ON");}
        else{gl.method("set_gravityScale").invoke(O.savedGrav!=null?O.savedGrav:1.0);O.savedGrav=null;log("fly OFF");}}catch(e){log("fly: "+e);}
    }
    function tickFly() {
        if(!O.flyOn)return; const gl=gorillaInst(); if(!gl)return;
        try{gl.method("set_gravityScale").invoke(0.0);}catch(_){}
        try{const rb=gl.method("get_playerRigidbody").invoke();if(!rb||rb.handle.isNull())return;
            const y=joyY(1);const fwd=readFwd(headTf());if(!fwd)return;const sp=7;
            if(Math.abs(y)>0.25)rb.method("set_velocity").invoke([fwd.x*y*sp,fwd.y*y*sp,fwd.z*y*sp]);
            else rb.method("set_velocity").invoke([0,0,0]);
        }catch(_){}
    }

    // ---- PLATFORMS ----
    function ensurePlat(s) {
        const k=s===0?"platL":"platR";
        if(O[k]&&!O[k].handle.isNull()){movePlat(s);return;}
        try{const p=GameObjectClass.method("CreatePrimitive").invoke(3);p.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
            p.method("get_transform").invoke().method("set_localScale").invoke([0.35,0.025,0.35]);
            ObjectClass.method("DontDestroyOnLoad").invoke(p);O[k]=p;movePlat(s);}catch(e){log("plat: "+e);}
    }
    function movePlat(s) {
        const k=s===0?"platL":"platR";const p=O[k];if(!p)return;
        const pos=readPos(handTf(s));if(!pos)return;
        try{p.method("get_transform").invoke().method("set_position").invoke([pos.x,pos.y-0.15,pos.z]);}catch(_){}
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

    // ---- ITEM GUN ----
    function tickItemGun() {
        if(!O.itemGunOn)return;if(O.gunCd>0){O.gunCd--;return;}if(!trigger(1))return;
        O.gunCd=30;
        const ids=getItemList();
        spawnItemInFront(ids[Math.floor(Math.random()*ids.length)]);
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

            // Discover real prefabs + items after menu builds (game is loaded)
            discoverGamePrefabs();
            discoverItems();

            log("MENU BUILT — prefabs=" + getPrefabEntries().length + " items=" + getItemList().length);
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
            processInput(); tickFly(); tickPlat(); tickOrbitAll(); tickPrefabOrbit(); tickItemGun();
            setText(render());
        }
        if(O.tick-O.lastLog>=300){O.lastLog=O.tick;
            log("t="+O.tick+" tab="+O.tab+" fly="+O.flyOn+" plat="+O.platformsOn+
                " orb="+O.orbitAllOn+" pOrb="+O.prefabOrbitOn+" gun="+O.itemGunOn+
                " prefabs="+getPrefabEntries().length);
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
    log("===== Orbit Menu V6.5 READY =====");
});
