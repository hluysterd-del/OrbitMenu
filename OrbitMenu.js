// ====================================================================
//  Orbit Menu V6.4 — Animal Company
//  Runtime prefab discovery, prefab orbit, OP features.
// ====================================================================

Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.4 LOADING =====");

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
        prefabOrbitId: "",
        prefabOrbitObjs: [],
        prefabOrbitAngle: 0,

        // runtime prefab list
        prefabList: null,       // discovered at runtime
        prefabDiscovered: false,

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
    //  RUNTIME PREFAB DISCOVERY
    // ================================================================
    function discoverPrefabs() {
        if (O.prefabDiscovered) return;
        O.prefabDiscovered = true;
        if (!GrabbableItemPrefabClass) { log("GrabbableItemPrefab class not found"); return; }
        try {
            const all = ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(GrabbableItemPrefabClass.type);
            if (!all) { log("FindObjectsOfTypeAll returned null"); return; }
            const ids = [];
            const seen = {};
            for (let i = 0; i < all.length; i++) {
                try {
                    const obj = all.get(i);
                    if (!obj || obj.handle.isNull()) continue;
                    const raw = obj.method("get_itemID").invoke();
                    if (!raw) continue;
                    const id = raw.toString();
                    if (id && id.length > 0 && !seen[id]) {
                        seen[id] = true;
                        ids.push(id);
                    }
                } catch(_){}
            }
            ids.sort();
            if (ids.length > 0) {
                O.prefabList = ids;
                log("Discovered " + ids.length + " prefabs at runtime");
            } else {
                log("Discovery found 0 IDs, using fallback list");
            }
        } catch(e) { log("discoverPrefabs err: " + e); }
    }

    // Fallback list if runtime discovery fails
    const FALLBACK_PREFABS = [
        "item_dynamite","item_grenade","item_rpg","item_rpg_ammo",
        "item_shotgun","item_revolver","item_flamethrower",
        "item_demon_sword","item_great_sword","item_hookshot_sword",
        "item_crossbow","item_pistol_dragon","item_grenade_launcher",
        "item_lance","item_baseball_bat","item_crowbar","item_hatchet",
        "item_viking_hammer","item_radiation_gun","item_heart_gun",
        "item_flaregun","item_alphablade","item_cluster_grenade",
        "item_jetpack","item_hookshot","item_teleport_gun",
        "item_flashlight","item_flashlight_mega","item_broom",
        "item_pickaxe","item_drill","item_zipline_gun",
        "item_pogostick","item_portable_teleporter","item_hoverpad",
        "item_boomerang","item_guided_boomerang","item_friend_launcher",
        "item_moneygun","item_scanner","item_megaphone",
        "item_landmine","item_sticky_dynamite","item_impulse_grenade",
        "item_flashbang","item_broccoli_grenade","item_tripwire_explosive",
        "item_pumpkin_bomb","item_timebomb","item_stinky_cheese",
        "item_anti_gravity_grenade","item_dynamite_cube",
        "item_goldbar","item_goldcoin","item_ruby",
        "item_diamond_jade_koi","item_trophy","item_rare_card",
        "item_ceo_plaque","item_stellarsword_gold","item_ore_gold_l",
        "item_boombox","item_ukulele","item_balloon",
        "item_whoopie","item_glowstick","item_rubberducky",
        "item_metal_ball","item_snowball","item_trampoline",
        "item_apple","item_banana","item_burrito",
        "item_popcorn","item_turkey_leg","item_hot_cocoa",
    ];

    function getPrefabList() {
        return O.prefabList || FALLBACK_PREFABS;
    }

    // ================================================================
    //  SPAWN PREFAB
    // ================================================================
    function spawnPrefabAt(itemId, x, y, z) {
        if (!PrefabGeneratorClass) return null;
        // Try 4-param: SpawnItem(string, Vector3, Quaternion, Transform)
        try {
            const obj = PrefabGeneratorClass.method("SpawnItem",4).invoke(
                Il2Cpp.string(itemId), [x,y,z], [0,0,0,1], NULL
            );
            return obj;
        } catch(e) { log("spawn4: "+e); }
        // Try 3-param
        try {
            const obj = PrefabGeneratorClass.method("SpawnItem",3).invoke(
                Il2Cpp.string(itemId), [x,y,z], [0,0,0,1]
            );
            return obj;
        } catch(e) { log("spawn3: "+e); }
        return null;
    }

    function spawnInFront(itemId) {
        const head = headTf();
        const pos = readPos(head);
        const fwd = readFwd(head);
        if (!pos || !fwd) { flashAction("no head"); return; }
        const sx = pos.x + fwd.x*2, sy = pos.y + fwd.y*2, sz = pos.z + fwd.z*2;
        const obj = spawnPrefabAt(itemId, sx, sy, sz);
        if (obj) flashAction("Spawned " + itemId.replace("item_",""));
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
    //  PREFAB ORBIT — spawn 5 of a prefab, orbit around player
    // ================================================================
    function startPrefabOrbit(itemId) {
        stopPrefabOrbit();
        O.prefabOrbitId = itemId;
        const pos = readPos(headTf());
        if (!pos) { flashAction("no head"); return false; }

        const spawned = [];
        for (let i = 0; i < 5; i++) {
            const angle = (2 * Math.PI / 5) * i;
            const sx = pos.x + Math.cos(angle) * 3;
            const sz = pos.z + Math.sin(angle) * 3;
            const obj = spawnPrefabAt(itemId, sx, pos.y + 0.5, sz);
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
        flashAction(spawned.length + "x " + itemId.replace("item_","") + " orbiting!");
        log("Prefab orbit ON: " + spawned.length + "x " + itemId);
        return true;
    }

    function stopPrefabOrbit() {
        for (const obj of O.prefabOrbitObjs) {
            try { ObjectClass.method("Destroy").invoke(obj); } catch(_){}
        }
        O.prefabOrbitObjs = [];
        O.prefabOrbitOn = false;
        O.prefabOrbitId = "";
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
        if (alive.length === 0) { O.prefabOrbitOn = false; log("prefab orbit: all items lost"); }
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
        const list = getPrefabList();
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
            const id = list[i];
            const display = id.replace("item_","");
            its.push({l:display, t:"act", fn:()=>spawnInFront(id)});
        }
        if (page > 0) its.push({l:"◀ Prev Page", t:"act", fn:()=>{O.prefabPage--;O.cursor=2;}});
        if (end < list.length) its.push({l:"Next Page ▶", t:"act", fn:()=>{O.prefabPage++;O.cursor=2;}});
        return its;
    }

    function buildOrbitPickPage() {
        const list = getPrefabList();
        const totalPages = Math.ceil(list.length / PER_PAGE);
        const page = Math.min(O.prefabPage, totalPages - 1);
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, list.length);

        const its = [{l:"< Back", t:"act", fn:()=>{O.tab="prefabs";O.cursor=0;O.prefabPage=0;}}];
        for (let i = start; i < end; i++) {
            const id = list[i];
            const display = id.replace("item_","");
            its.push({l:display, t:"act", fn:()=>{
                if (startPrefabOrbit(id)) { O.tab = "prefabs"; O.cursor = 0; O.prefabPage = 0; }
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
        const list = getPrefabList();
        const totalPages = Math.ceil(list.length / PER_PAGE);
        const L = ["<color=#bb88ff>Orbit Menu" + tabTitle() + "</color>"];

        if (O.tab === "prefabs" || O.tab === "prefab_orbit_pick") {
            const src = O.prefabList ? "runtime" : "fallback";
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
        if (O.prefabOrbitOn) L.push("<color=#55ccff>Orbiting: "+O.prefabOrbitId.replace("item_","")+" x"+O.prefabOrbitObjs.length+"</color>");
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
            if(on){const n=getOtherPlayers().length;log("Orbit All ON — "+n+" other players");if(n===0)flashAction("no other players!");}
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
        const ids=getPrefabList();
        spawnInFront(ids[Math.floor(Math.random()*ids.length)]);
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

            // Discover prefabs after menu builds (game is loaded)
            discoverPrefabs();

            log("MENU BUILT — prefabs="+getPrefabList().length+" ("+( O.prefabList?"runtime":"fallback")+")");
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
                " orb="+O.orbitAllOn+" pOrb="+O.prefabOrbitOn+" gun="+O.itemGunOn);
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
    log("===== Orbit Menu V6.4 READY =====");
});
