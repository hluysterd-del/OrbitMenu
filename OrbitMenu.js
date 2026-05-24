// ====================================================================
//  Orbit Menu V7.0 — Animal Company
//  Physical 3D hand menu (cube buttons on left hand, pointer on right)
//  Based on ii's Stupid Template menu system
// ====================================================================

console.log("[Orbit] Script loaded, waiting 5s for game...");
setTimeout(() => {
console.log("[Orbit] Timer fired, calling Il2Cpp.perform...");
Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V7.0 LOADING =====");

    // ---- Assemblies ----
    let acImage, coreImage, physImage, uiModImage, uiImage, textImage;
    try { acImage     = Il2Cpp.domain.assembly("AnimalCompany").image; console.log("[Orbit] ✓ AnimalCompany"); } catch(e){ console.log("[Orbit] ✗ AnimalCompany: "+e); throw e; }
    try { coreImage   = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image; console.log("[Orbit] ✓ CoreModule"); } catch(e){ console.log("[Orbit] ✗ CoreModule: "+e); throw e; }
    try { physImage   = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image; } catch(e){ console.log("[Orbit] ✗ PhysicsModule: "+e); throw e; }
    try { uiModImage  = Il2Cpp.domain.assembly("UnityEngine.UIModule").image; } catch(e){ console.log("[Orbit] ✗ UIModule: "+e); throw e; }
    try { uiImage     = Il2Cpp.domain.assembly("UnityEngine.UI").image; } catch(e){ console.log("[Orbit] ✗ UI: "+e); throw e; }
    try { textImage   = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image; } catch(e){ console.log("[Orbit] ✗ TextRendering: "+e); throw e; }
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
    const MaterialClass   = coreImage.class("UnityEngine.Material");
    const ShaderClass     = coreImage.class("UnityEngine.Shader");
    const ResourcesClass  = coreImage.class("UnityEngine.Resources");
    const CameraClass     = coreImage.class("UnityEngine.Camera");
    const CanvasClass     = uiModImage.class("UnityEngine.Canvas");
    const CanvasScalerClass = uiImage.class("UnityEngine.UI.CanvasScaler");
    const TextClass       = uiImage.class("UnityEngine.UI.Text");
    const FontClass       = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");
    const ColliderClass   = physImage.class("UnityEngine.Collider");
    const BoxColliderClass = physImage.class("UnityEngine.BoxCollider");
    const SphereColliderClass = physImage.class("UnityEngine.SphereCollider");
    const RigidbodyClass  = physImage.class("UnityEngine.Rigidbody");
    const PhysicsClass    = physImage.class("UnityEngine.Physics");

    let LineRendererClass = null;
    try { LineRendererClass = coreImage.class("UnityEngine.LineRenderer"); } catch(_){}

    // ---- AC Classes ----
    let PlayerControllerClass, GorillaLocomotionClass, XRInputManagerClass, NetPlayerClass;
    try { PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController"); } catch(e){ console.log("[Orbit] ✗ PlayerController: "+e); throw e; }
    try { GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion"); } catch(e){ console.log("[Orbit] ✗ GorillaLocomotion: "+e); throw e; }
    try { XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager"); } catch(e){ console.log("[Orbit] ✗ XRInputManager: "+e); throw e; }
    try { NetPlayerClass         = acImage.class("AnimalCompany.NetPlayer"); } catch(e){ console.log("[Orbit] ✗ NetPlayer: "+e); throw e; }
    console.log("[Orbit] ✓ All AC classes loaded");

    let PrefabGenClass = null;
    try { PrefabGenClass = acImage.class("AnimalCompany.PrefabGenerator"); } catch(_){}

    // ---- Shaders ----
    let UberShader = null;
    try { UberShader = ShaderClass.method("Find").invoke(Il2Cpp.string("Universal Render Pipeline/Unlit")); } catch(_){}
    if (!UberShader) try { UberShader = ShaderClass.method("Find").invoke(Il2Cpp.string("UI/Default")); } catch(_){}
    if (!UberShader) try { UberShader = ShaderClass.method("Find").invoke(Il2Cpp.string("GUI/Text Shader")); } catch(_){}
    let TextShader = null;
    try { TextShader = ShaderClass.method("Find").invoke(Il2Cpp.string("GUI/Text Shader")); } catch(_){}
    if (!TextShader) try { TextShader = ShaderClass.method("Find").invoke(Il2Cpp.string("UI/Default")); } catch(_){}

    // ================================================================
    //  ITEM / PREFAB / MOB LISTS
    // ================================================================
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
    const MOB_IDS = [
        "AnglerController","AnglerMadController","ArmstrongController",
        "BansheeController","BombController","BomberController",
        "ChickenController","EvilEyeController","FakeGorillaController",
        "GiantController","NextBotController","PhantomController","SpiderController",
    ];
    const TELEPORT_LOCS = {
        "Lake":[-213.170,56.764,-15.242], "Moon":[1021.538,980.105,1054.145],
        "Sewers":[88.541,-103.024,140.867], "Spawn":[-397.684,2.135,-399.209],
        "Water Tower":[49.446,50.186,-33.340],
    };

    // ================================================================
    //  MENU BUTTON DEFINITIONS
    // ================================================================
    const BUTTONS_PER_PAGE = 7;

    // Button format: {text, toggle (bool), key (state key), action (fn), cat (go to category)}
    function getButtons(cat) {
        switch(cat) {
        case 0: return [ // Main
            {text:"Movement", cat:1},
            {text:"Items / Spawning", cat:2},
            {text:"Gun Mods", cat:3},
            {text:"Player Mods", cat:4},
            {text:"Overpowered", cat:5},
            {text:"Prefabs", cat:6},
            {text:"Mobs", cat:7},
        ];
        case 1: return [ // Movement
            {text:"< Back", cat:0},
            {text:"Fly (B=forward)", toggle:true, key:"flyOn"},
            {text:"Platforms (grip)", toggle:true, key:"platformsOn"},
            {text:"Long Arms", toggle:true, key:"longArmsOn"},
            ...Object.entries(TELEPORT_LOCS).map(([n,p])=>({text:"TP: "+n, action:()=>{try{NetPlayerClass.method("get_localPlayer").invoke().method("RPC_Teleport").invoke(p);flash("TP "+n);}catch(_){flash("tp err");}}})),
        ];
        case 2: return buildItemPage(ALL_ITEMS, "item", id=>id.replace("item_",""));
        case 3: return [ // Gun
            {text:"< Back", cat:0},
            {text:"Item Gun (trigger)", toggle:true, key:"itemGunOn"},
            {text:"Item Orbit (5x RPG)", toggle:true, key:"itemOrbitOn"},
        ];
        case 4: return [ // Player
            {text:"< Back", cat:0},
            {text:"Invincible", toggle:true, key:"invincibleOn"},
            {text:"Invisible", toggle:true, key:"invisibleOn"},
            {text:"No Red Watch", toggle:true, key:"noRedWatchOn"},
        ];
        case 5: return [ // OP
            {text:"< Back", cat:0},
            {text:"Orbit All", toggle:true, key:"orbitAllOn"},
            {text:"TP All to Me", action:actTpAll},
            {text:"Yeet All", action:actYeetAll},
            {text:"Stink All", action:actStinkAll},
            {text:"Color All", action:actColorAll},
            {text:"Fling All", action:actFlingAll},
            {text:"Void All", action:actVoidAll},
            {text:"Money All $99999", action:actMoneyAll},
            {text:"Stun All 30s", action:actStunAll},
        ];
        case 6: return buildItemPage(PREFAB_NAMES, "prefab");
        case 7: return buildItemPage(MOB_IDS, "mob");
        default: return [];
        }
    }
    function buildItemPage(list, type, fmt) {
        const tp = Math.ceil(list.length / BUTTONS_PER_PAGE);
        const pg = Math.min(O.page, tp - 1);
        const s = pg * BUTTONS_PER_PAGE, e = Math.min(s + BUTTONS_PER_PAGE, list.length);
        const its = [{text:"< Back", cat:0}];
        for (let i = s; i < e; i++) {
            const id = list[i];
            its.push({text: fmt ? fmt(id) : id, action: (function(x){ return function(){ spawnInFront(type, x); }; })(id)});
        }
        if (pg > 0) its.push({text:"< Prev Page", action:()=>{O.page--; rebuildMenu();}});
        if (e < list.length) its.push({text:"Next Page >", action:()=>{O.page++; rebuildMenu();}});
        return its;
    }

    // ================================================================
    //  STATE
    // ================================================================
    globalThis.orbit = {
        tick: 0, hookInstalled: false,
        // Menu state
        menuOpen: false, menu: null, menuBG: null, canvasGO: null,
        pointer: null, pointerCollider: null,
        category: 0, page: 0,
        btnGOs: [], btnTexts: [], btnColliders: [],
        pressCooldown: 0,
        // Feature toggles
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
        // Misc
        actionMsg: "", actionTick: 0,
        lastLog: 0, deltaTime: 0, lastTime: 0,
    };
    const O = globalThis.orbit;
    function log(m) { console.log("[Orbit] " + m); }
    function flash(msg) { O.actionMsg = msg; O.actionTick = O.tick; log(msg); }

    // ================================================================
    //  HELPERS
    // ================================================================
    function getTransform(obj) { return obj.method("get_transform").invoke(); }
    function getComponent(obj, cls) { return obj.method("GetComponent",1).inflate(cls).invoke(); }
    function addComponent(obj, cls) { return obj.method("AddComponent",1).inflate(cls).invoke(); }
    function destroySafe(obj) { if(obj) try{ObjectClass.method("Destroy",1).invoke(obj);}catch(_){} }
    function setColor(renderer, r, g, b, a) {
        try { const mat = renderer.method("get_material").invoke();
            if (TextShader) mat.method("set_shader").invoke(TextShader);
            mat.method("set_color").invoke([r, g, b, a||1]); } catch(_){}
    }

    function playerInst() {
        try { const v=PlayerControllerClass.method("get_instance").invoke(); if(v&&!v.handle.isNull()) return v; } catch(_){} return null;
    }
    function gorillaInst() {
        try { const v=GorillaLocomotionClass.field("<Instance>k__BackingField").value; if(v&&!v.handle.isNull()) return v; } catch(_){}
        try { const v=GorillaLocomotionClass.method("get_Instance").invoke(); if(v&&!v.handle.isNull()) return v; } catch(_){} return null;
    }
    function headTf() {
        const p=playerInst(); if(!p) return null;
        try { const h=p.method("get_head").invoke(); if(h&&!h.handle.isNull()) return h; } catch(_){}
        for (const n of ["_headTransform","_cameraTransform","headFollower"]) {
            try { const v=p.field(n).value; if(v&&!v.handle.isNull()) return v; } catch(_){}
        }
        return null;
    }
    function handTf(side) {
        const gl=gorillaInst(); if(!gl) return null;
        try { const f=gl.field(side===0?"leftHandTransform":"rightHandTransform").value; if(f&&!f.handle.isNull()) return f; } catch(_){}
        const p=playerInst(); if(!p) return null;
        try { const v=p.field(side===0?"_handTransformLeft":"_handTransformRight").value; if(v&&!v.handle.isNull()) return v; } catch(_){} return null;
    }
    function readPos(tf) {
        if(!tf) return null;
        try { const v=tf.method("get_position").invoke();
            try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
        } catch(_){} return null;
    }
    function readFwd(tf) {
        if(!tf) return null;
        try { const v=tf.method("get_forward").invoke();
            try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
        } catch(_){} return null;
    }
    function dist3(a, b) {
        const dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z;
        return Math.sqrt(dx*dx+dy*dy+dz*dz);
    }

    // ================================================================
    //  XR INPUT
    // ================================================================
    function joyY(hand) {
        try { const r=XRInputManagerClass.method("GetJoystickValue").invoke(hand); if(!r) return 0;
            try { return r.unbox().field("y").value; } catch(_){} return r.field("y").value;
        } catch(_){return 0;}
    }
    function trigger(hand) { try { return XRInputManagerClass.method("GetTriggerButtonValue").invoke(hand) ? true : false; } catch(_){return false;} }
    function grip(hand) { try { return XRInputManagerClass.method("AnyGrabInputPressed",1).invoke(hand) ? true : false; } catch(_){return false;} }
    function secondaryBtn(hand) {
        // Y button (left=0) or B button (right=1)
        try { const v = XRInputManagerClass.method("GetSecondaryButton").invoke(hand); if (v === true || v === 1) return true; try { if (v.unbox && v.unbox()) return true; } catch(_){} } catch(_){}
        try { const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 1); if (v === true || v === 1) return true; try { if (v.unbox && v.unbox()) return true; } catch(_){} } catch(_){}
        return false;
    }
    function primaryBtn(hand) {
        try { const v = XRInputManagerClass.method("GetPrimaryButton").invoke(hand); if (v === true || v === 1) return true; try { if (v.unbox && v.unbox()) return true; } catch(_){} } catch(_){}
        try { const v = XRInputManagerClass.method("GetButtonDown").invoke(hand, 0); if (v === true || v === 1) return true; try { if (v.unbox && v.unbox()) return true; } catch(_){} } catch(_){}
        return false;
    }

    // ================================================================
    //  PLAYER ITERATION
    // ================================================================
    function getOtherPlayers() {
        const others = [];
        try {
            const localP = NetPlayerClass.method("get_localPlayer").invoke();
            const localH = localP ? localP.handle.toString() : "";
            let arr = null;
            try { arr = ObjectClass.method("FindObjectsByType",1).inflate(NetPlayerClass).invoke(0); } catch(_){}
            if (!arr) try { arr = ObjectClass.method("FindObjectsOfType",1).invoke(NetPlayerClass.type); } catch(_){}
            if (!arr) return others;
            for (let i=0;i<arr.length;i++) {
                try { const np=arr.get(i); if(!np||np.handle.isNull()) continue;
                    if(localH&&np.handle.toString()===localH) continue; others.push(np); } catch(_){}
            }
        } catch(_){}
        return others;
    }
    function forEachOtherPlayer(fn) { let n=0; for(const np of getOtherPlayers()){try{fn(np);n++;}catch(_){}} return n; }

    // ================================================================
    //  SPAWNING
    // ================================================================
    function spawnItem(itemID, pos, rot) {
        if (!PrefabGenClass) return null;
        const full = itemID.startsWith("item_prefab/") ? itemID : "item_prefab/" + itemID;
        try { const r=PrefabGenClass.method("SpawnItem",4).invoke(Il2Cpp.string(full),pos,rot,ptr(0)); if(r&&!r.handle.isNull()) return r; } catch(_){}
        try { const r=PrefabGenClass.method("SpawnItem",4).invoke(Il2Cpp.string(itemID),pos,rot,ptr(0)); if(r&&!r.handle.isNull()) return r; } catch(_){}
        return null;
    }
    function spawnNetworkPrefab(prefabName, pos, rot) {
        if (!PrefabGenClass) return null;
        try {
            const inst = PrefabGenClass.field("_instance").value;
            if (!inst || inst.handle.isNull()) return null;
            const runner = inst.method("get_runner").invoke();
            if (!runner || runner.handle.isNull()) return null;
            const sources = runner.field("_config").value.field("PrefabTable").value.field("_sources").value;
            const count = sources.method("get_Count").invoke();
            for (let i=0;i<count;i++) {
                try {
                    const source = sources.method("get_Item").invoke(i);
                    const desc = source.method("get_Description").invoke().toString();
                    if (!desc.includes(prefabName)) continue;
                    const no = source.method("WaitForResult").invoke();
                    if (!no || no.handle.isNull()) continue;
                    let spawnMethod = null;
                    for (const m of runner.method("Spawn").overloads()) {
                        if (m.parameterCount!==6||m.isGeneric) continue;
                        if (m.parameters[0].type.name.includes("NetworkObject")&&m.parameters[1].type.name.startsWith("System.Nullable")) { spawnMethod=m; break; }
                    }
                    if (!spawnMethod) return null;
                    const mz=(type)=>{if(type.class.isEnum||type.isPrimitive)return 0;if(!type.class.isValueType)return ptr(0);const f=type.class.fields.filter(f=>!f.isStatic);return f.length===0?0:f.map(fi=>mz(fi.type));};
                    const bn=(nt,hv,val)=>{const f=nt.class.fields.filter(f=>!f.isStatic);return f.map(fi=>{const ln=fi.name.toLowerCase();if(ln.includes("hasvalue"))return hv?1:0;if(ln==="value")return hv?val:mz(fi.type);return mz(fi.type);});};
                    return spawnMethod.bind(runner).invoke(no,bn(spawnMethod.parameters[1].type,true,pos),bn(spawnMethod.parameters[2].type,true,rot),bn(spawnMethod.parameters[3].type,false,mz(spawnMethod.parameters[3].type)),spawnMethod.parameters[4].type.class.isValueType?mz(spawnMethod.parameters[4].type):ptr(0),0);
                } catch(_){}
            }
        } catch(e){log("spawnNetPrefab: "+e);} return null;
    }
    function spawnMob(mobID, pos, rot) {
        if (!PrefabGenClass) return null;
        try { return PrefabGenClass.method("SpawnItem",4).invoke(Il2Cpp.string("mob_prefab/"+mobID),pos,rot,ptr(0)); } catch(_){} return null;
    }
    function spawnInFront(type, id) {
        const head=headTf(), pos=readPos(head), fwd=readFwd(head);
        if (!pos||!fwd) { flash("no head"); return null; }
        const sp=[pos.x+fwd.x*3,pos.y+fwd.y*3,pos.z+fwd.z*3], rot=[0,0,0,1];
        let r=null;
        if(type==="item") r=spawnItem(id,sp,rot);
        else if(type==="prefab") r=spawnNetworkPrefab(id,sp,rot);
        else if(type==="mob") r=spawnMob(id,sp,rot);
        flash(r ? "Spawned: "+id : "Failed: "+id);
        return r;
    }

    // ================================================================
    //  OP ACTIONS
    // ================================================================
    function actTpAll() { const p=readPos(headTf()); if(!p){flash("no head");return;} let n=forEachOtherPlayer(np=>{try{np.method("RPC_Teleport").invoke([p.x,p.y,p.z]);}catch(_){try{np.method("RPC_Teleport",1).invoke([p.x,p.y,p.z]);}catch(_2){}}}); flash("TP'd "+n); }
    function actYeetAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_AddForce",1).invoke([0,80,0]);}catch(_){try{np.method("RPC_AddForce").invoke([0,80,0]);}catch(_2){}}}); flash("Yeeted "+n); }
    function actStinkAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_TagAsStinky",0).invoke();}catch(_){try{np.method("RPC_TagAsStinky").invoke();}catch(_2){}}}); flash("Stinked "+n); }
    function actColorAll() { let n=forEachOtherPlayer(np=>{const h=Math.random()*360;try{np.method("RPC_SetColorHSV",4).invoke(h,1,1,1);}catch(_){try{np.method("RPC_SetColorHSV").invoke(h,1,1,1);}catch(_2){}}}); flash("Colored "+n); }
    function actFlingAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_AddForce",1).invoke([0,120,0]);}catch(_){}}); flash("Flung "+n); }
    function actVoidAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_Teleport",1).invoke([0,-500,0]);}catch(_){try{np.method("RPC_Teleport").invoke([0,-500,0]);}catch(_2){}}}); flash("Voided "+n); }
    function actMoneyAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_AddPlayerMoney",1).invoke(99999);}catch(_){}}); flash("$99999 to "+n); }
    function actStunAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_Stun",1).invoke(30.0);}catch(_){}}); flash("Stunned "+n); }

    function toggleInvincible(on) {
        try { const lp=NetPlayerClass.method("get_localPlayer").invoke(), pc=playerInst();
            if(on){try{lp.method("set_maxHealth").invoke(999999999);}catch(_){}try{lp.method("set_healthGained").invoke(999999999);}catch(_){}try{pc.method("SubtractPlayerHealth").invoke(-333333);}catch(_){}try{pc.method("set_healthHealed").invoke(999999999);}catch(_){}}
            else{try{lp.method("set_maxHealth").invoke(125);}catch(_){}try{lp.method("set_healthGained").invoke(125);}catch(_){}try{pc.method("set_healthHealed").invoke(125);}catch(_){}}
            flash(on?"INVINCIBLE":"invincible off");
        } catch(e){log("invincible: "+e);}
    }
    function toggleInvisible(on) {
        try { const pc=playerInst(),view=pc.method("get_playerView").invoke(),cam=view.field("_cameraTransform").value;
            if(on) cam.method("set_position").invoke([0,-99999,0]);
            else { const hp=readPos(headTf()); if(hp) cam.method("set_position").invoke([hp.x,hp.y,hp.z]); }
            flash(on?"INVISIBLE":"invisible off");
        } catch(e){log("invisible: "+e);}
    }
    function toggleNoRedWatch(on) { try{NetPlayerClass.method("get_localPlayer").invoke().method("set_isWanted").invoke(false);}catch(_){} flash(on?"No Red Watch":"cleared"); }
    function toggleLongArms(on) { try{const gl=gorillaInst();getTransform(gl).method("set_localScale").invoke(on?[1.5,1.5,1.5]:[1,1,1]);flash(on?"LONG ARMS":"normal arms");}catch(e){log("longarms: "+e);} }

    // ================================================================
    //  FLY — B button = fly forward
    // ================================================================
    function toggleFly(on) {
        const gl=gorillaInst(); if(!gl) return;
        try { const rb=getComponent(gl,RigidbodyClass);
            if(on){try{O.savedGravity=rb.method("get_useGravity").invoke();}catch(_){O.savedGravity=true;} rb.method("set_useGravity").invoke(false);try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}} flash("FLY ON — hold B");}
            else{rb.method("set_useGravity").invoke(O.savedGravity!=null?O.savedGravity:true);try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}} flash("fly off");}
        } catch(e){log("fly: "+e);}
    }
    function tickFly() {
        if(!O.flyOn) return;
        const gl=gorillaInst(); if(!gl) return;
        try { const rb=getComponent(gl,RigidbodyClass),tf=getTransform(gl);
            try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}}
            try{rb.method("set_angularVelocity").invoke([0,0,0]);}catch(_){}
            const bHeld=primaryBtn(1)||(trigger(0)&&trigger(1));
            if(bHeld){const fwd=readFwd(headTf());if(!fwd)return;const sp=25,dt=O.deltaTime||0.016,step=sp*dt;
                const cur=tf.method("get_position").invoke();tf.method("set_position").invoke(Vector3Class.method("op_Addition",2).invoke(cur,[fwd.x*step,fwd.y*step,fwd.z*step]));}
        } catch(_){}
    }

    // ================================================================
    //  PLATFORMS
    // ================================================================
    function createPlatCube(color) {
        const obj=GameObjectClass.method("CreatePrimitive").invoke(3); // Cube
        obj.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
        getTransform(obj).method("set_localScale").invoke([0.4, 0.05, 0.4]);
        try { const r=getComponent(obj,RendererClass); setColor(r, color[0],color[1],color[2],color[3]); } catch(_){}
        try { const c=getComponent(obj,BoxColliderClass); c.method("set_isTrigger").invoke(false); } catch(_){}
        return obj;
    }
    function tickPlatforms() {
        if(!O.platformsOn) return;
        if(grip(1)){if(!O.platRLatched||!O.platR){if(O.platR)destroySafe(O.platR);O.platR=createPlatCube([0.6,0.2,0.8,1]);O.platRLatched=true;const h=handTf(1);if(h){const t=getTransform(O.platR);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
        else if(O.platR){destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
        if(grip(0)){if(!O.platLLatched||!O.platL){if(O.platL)destroySafe(O.platL);O.platL=createPlatCube([0.6,0.2,0.8,1]);O.platLLatched=true;const h=handTf(0);if(h){const t=getTransform(O.platL);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
        else if(O.platL){destroySafe(O.platL);O.platL=null;O.platLLatched=false;}
    }

    // ================================================================
    //  GUN — purple beam + endpoint
    // ================================================================
    function tickGun() {
        if(!O.itemGunOn){hideGun();return;}
        const rH=handTf(1);if(!rH){hideGun();return;}
        const sP=readPos(rH),fwd=readFwd(rH);if(!sP||!fwd){hideGun();return;}
        const md=15,endPos=[sP.x+fwd.x*md,sP.y+fwd.y*md,sP.z+fwd.z*md];
        // Create line renderer
        if(!O.gunLine||O.gunLine.handle.isNull()){if(LineRendererClass){try{const lo=GameObjectClass.method("CreatePrimitive").invoke(0);lo.method("set_name").invoke(Il2Cpp.string("[OGunLine]"));try{getComponent(lo,RendererClass).method("set_enabled").invoke(false);}catch(_){}try{getComponent(lo,ColliderClass).method("set_enabled").invoke(false);}catch(_){}O.gunLine=addComponent(lo,LineRendererClass);ObjectClass.method("DontDestroyOnLoad").invoke(lo);}catch(e){log("gunLine: "+e);}}}
        // Create pointer sphere
        if(!O.gunPointer||O.gunPointer.handle.isNull()){try{O.gunPointer=GameObjectClass.method("CreatePrimitive").invoke(0);O.gunPointer.method("set_name").invoke(Il2Cpp.string("[OGunPtr]"));getTransform(O.gunPointer).method("set_localScale").invoke([0.15,0.15,0.15]);try{getComponent(O.gunPointer,ColliderClass).method("set_enabled").invoke(false);}catch(_){}try{setColor(getComponent(O.gunPointer,RendererClass),0.7,0,1,0.9);}catch(_){}ObjectClass.method("DontDestroyOnLoad").invoke(O.gunPointer);}catch(e){log("gunPtr: "+e);}}
        if(O.gunPointer){O.gunPointer.method("SetActive").invoke(true);getTransform(O.gunPointer).method("set_position").invoke(endPos);}
        if(O.gunLine){try{O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(true);const lm=O.gunLine.method("get_material").invoke();if(TextShader)lm.method("set_shader").invoke(TextShader);O.gunLine.method("set_startColor").invoke([0.5,0,0.8,0.8]);O.gunLine.method("set_endColor").invoke([0.7,0,1,0.6]);O.gunLine.method("set_startWidth").invoke(0.02);O.gunLine.method("set_endWidth").invoke(0.02);O.gunLine.method("set_positionCount").invoke(2);O.gunLine.method("set_useWorldSpace").invoke(true);O.gunLine.method("SetPosition").invoke(0,[sP.x,sP.y,sP.z]);O.gunLine.method("SetPosition").invoke(1,endPos);}catch(_){}}
        if(O.gunCd>0){O.gunCd--;return;}
        if(!trigger(1))return;O.gunCd=25;
        const id=ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)];
        const obj=spawnItem(id,endPos,[0,0,0,1]);
        if(obj)flash("Shot: "+id.replace("item_",""));
    }
    function hideGun() {
        if(O.gunPointer)try{O.gunPointer.method("SetActive").invoke(false);}catch(_){}
        if(O.gunLine)try{O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(false);}catch(_){}
    }

    // ================================================================
    //  ORBIT ALL + ITEM ORBIT
    // ================================================================
    function tickOrbitAll() {
        if(!O.orbitAllOn)return;O.orbitAngle+=0.033;if(O.orbitAngle>6.28)O.orbitAngle-=6.28;
        const mp=readPos(headTf());if(!mp)return;const ot=getOtherPlayers();if(!ot.length)return;
        const r=4,st=(2*Math.PI)/ot.length;
        for(let i=0;i<ot.length;i++){const a=O.orbitAngle+st*i;try{ot[i].method("RPC_Teleport").invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);}catch(_){try{ot[i].method("RPC_Teleport",1).invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);}catch(_2){}}}
    }
    function startItemOrbit() {
        stopItemOrbit();const p=readPos(headTf());if(!p){flash("no head");return;}
        const sp=[];for(let i=0;i<5;i++){const a=(2*Math.PI/5)*i;const o=spawnItem("item_rpg_ammo",[p.x+Math.cos(a)*2.5,p.y+0.5,p.z+Math.sin(a)*2.5],[0,0,0,1]);if(o&&!o.handle.isNull()){try{ObjectClass.method("DontDestroyOnLoad").invoke(o);}catch(_){}sp.push(o);}}
        if(!sp.length){flash("orbit failed");return;}O.itemOrbitObjs=sp;O.itemOrbitOn=true;O.itemOrbitAngle=0;flash(sp.length+"x RPG orbiting!");
    }
    function stopItemOrbit() { for(const o of O.itemOrbitObjs)destroySafe(o);O.itemOrbitObjs=[];O.itemOrbitOn=false; }
    function tickItemOrbit() {
        if(!O.itemOrbitOn||!O.itemOrbitObjs.length)return;O.itemOrbitAngle+=0.04;if(O.itemOrbitAngle>6.28)O.itemOrbitAngle-=6.28;
        const mp=readPos(headTf());if(!mp)return;const r=2.5,st=(2*Math.PI)/O.itemOrbitObjs.length,alive=[];
        for(let i=0;i<O.itemOrbitObjs.length;i++){const o=O.itemOrbitObjs[i];try{if(!o||o.handle.isNull())continue;const a=O.itemOrbitAngle+st*i;getTransform(o).method("set_position").invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);alive.push(o);}catch(_){}}
        O.itemOrbitObjs=alive;if(!alive.length)O.itemOrbitOn=false;
    }

    // ================================================================
    //  PHYSICAL MENU — 3D cubes on left hand
    // ================================================================
    // Menu dimensions (matching template: holder scale 0.1, 0.3, 0.3825)
    const MENU_SCALE = [0.1, 0.3, 0.3825];
    const BG_LOCAL_SCALE = [0.1, 1, 1]; // relative to holder
    const BG_LOCAL_POS = [0.05, 0, 0];
    const BTN_SCALE = [0.09, 0.9, 0.08]; // relative to holder
    const BTN_START_Z = 0.28; // local Z start for first button
    const BTN_SPACING = 0.1; // spacing per button in local Z

    // Rainbow color cycling
    let hueAngle = 0;
    function hslToRgb(h, s, l) {
        h = h % 360; const c = (1 - Math.abs(2*l-1)) * s;
        const x = c * (1 - Math.abs((h/60)%2 - 1));
        const m = l - c/2;
        let r=0,g=0,b=0;
        if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}
        else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
        return [r+m, g+m, b+m];
    }
    function rainbowColor() {
        return hslToRgb(hueAngle, 1, 0.5);
    }

    function createMenu() {
        log("Creating physical menu...");
        const lh = handTf(0);
        if (!lh) { log("no left hand"); return; }

        // ---- Menu Holder (invisible parent cube) ----
        const holder = GameObjectClass.method("CreatePrimitive").invoke(3);
        holder.method("set_name").invoke(Il2Cpp.string("[OrbitMenu]"));
        try { destroySafe(getComponent(holder, RigidbodyClass)); } catch(_){}
        try { getComponent(holder, BoxColliderClass).method("set_enabled").invoke(false); } catch(_){}
        try { getComponent(holder, RendererClass).method("set_enabled").invoke(false); } catch(_){}
        getTransform(holder).method("set_localScale").invoke(MENU_SCALE);
        O.menu = holder;

        // ---- Background panel (visible, purple/rainbow) ----
        const bg = GameObjectClass.method("CreatePrimitive").invoke(3);
        bg.method("set_name").invoke(Il2Cpp.string("[OrbitMenuBG]"));
        try { destroySafe(getComponent(bg, RigidbodyClass)); } catch(_){}
        try { getComponent(bg, BoxColliderClass).method("set_enabled").invoke(false); } catch(_){}
        const bgTf = getTransform(bg);
        bgTf.method("SetParent",2).invoke(getTransform(holder), false);
        bgTf.method("set_localPosition").invoke(BG_LOCAL_POS);
        bgTf.method("set_localRotation").invoke([0,0,0,1]);
        bgTf.method("set_localScale").invoke(BG_LOCAL_SCALE);
        const rc = rainbowColor();
        try { setColor(getComponent(bg, RendererClass), rc[0], rc[1], rc[2], 1); } catch(_){}
        O.menuBG = bg;

        // ---- Canvas for text ----
        const cvGO = GameObjectClass.method("CreatePrimitive").invoke(3);
        cvGO.method("set_name").invoke(Il2Cpp.string("[OrbitCanvas]"));
        try { getComponent(cvGO, RendererClass).method("set_enabled").invoke(false); } catch(_){}
        try { getComponent(cvGO, BoxColliderClass).method("set_enabled").invoke(false); } catch(_){}
        const cvTf = getTransform(cvGO);
        cvTf.method("SetParent",2).invoke(getTransform(holder), false);
        const canvas = addComponent(cvGO, CanvasClass);
        canvas.method("set_renderMode").invoke(2); // WorldSpace
        try { const cs = addComponent(cvGO, CanvasScalerClass); cs.method("set_dynamicPixelsPerUnit").invoke(1000); } catch(_){}
        O.canvasGO = cvGO;

        // ---- Title text ----
        let catName = ["Orbit Menu","Movement","Items","Gun Mods","Player","Overpowered","Prefabs","Mobs"][O.category] || "Orbit Menu";
        const pageStr = O.category >= 2 ? " [" + (O.page+1) + "]" : "";
        createMenuText(cvGO, catName + pageStr, [0.06, 0, 0.175], [0.28, 0.05], [1,1,1,1]);

        // ---- Action message ----
        if (O.actionMsg && (O.tick - O.actionTick) < 180) {
            createMenuText(cvGO, O.actionMsg, [0.06, 0, -0.185], [0.28, 0.03], [0, 1, 0.67, 1]);
        }

        // ---- Mod Buttons ----
        const btns = getButtons(O.category);
        const pageStart = 0; // paging handled inside getButtons for item lists
        const visibleBtns = btns.slice(0, BUTTONS_PER_PAGE + 3); // allow a few extra for nav
        O.btnGOs = [];
        O.btnTexts = [];

        for (let i = 0; i < visibleBtns.length; i++) {
            createButton(holder, cvGO, i, visibleBtns[i]);
        }

        // ---- Page nav buttons (< >) ----
        // Left arrow (previous page) — only on main categories with sub-pages
        const arrowBtnScale = [0.09, 0.2, 0.9];
        // < button
        const prevGO = GameObjectClass.method("CreatePrimitive").invoke(3);
        prevGO.method("set_name").invoke(Il2Cpp.string("[OPrev]"));
        try { destroySafe(getComponent(prevGO, RigidbodyClass)); } catch(_){}
        try { getComponent(prevGO, BoxColliderClass).method("set_isTrigger").invoke(true); } catch(_){}
        const prevTf = getTransform(prevGO);
        prevTf.method("SetParent",2).invoke(getTransform(holder), false);
        prevTf.method("set_localPosition").invoke([0.56, 0.65, 0]);
        prevTf.method("set_localRotation").invoke([0,0,0,1]);
        prevTf.method("set_localScale").invoke(arrowBtnScale);
        try { setColor(getComponent(prevGO, RendererClass), 0.15, 0.15, 0.15, 1); } catch(_){}
        prevGO._orbitAction = "prevPage";
        O.btnGOs.push({go: prevGO, action: "prevPage"});
        createMenuText(cvGO, "<", [0.064, 0.195, 0], [0.2, 0.03], [1,1,1,1]);

        // > button
        const nextGO = GameObjectClass.method("CreatePrimitive").invoke(3);
        nextGO.method("set_name").invoke(Il2Cpp.string("[ONext]"));
        try { destroySafe(getComponent(nextGO, RigidbodyClass)); } catch(_){}
        try { getComponent(nextGO, BoxColliderClass).method("set_isTrigger").invoke(true); } catch(_){}
        const nextTf = getTransform(nextGO);
        nextTf.method("SetParent",2).invoke(getTransform(holder), false);
        nextTf.method("set_localPosition").invoke([0.56, -0.65, 0]);
        nextTf.method("set_localRotation").invoke([0,0,0,1]);
        nextTf.method("set_localScale").invoke(arrowBtnScale);
        try { setColor(getComponent(nextGO, RendererClass), 0.15, 0.15, 0.15, 1); } catch(_){}
        O.btnGOs.push({go: nextGO, action: "nextPage"});
        createMenuText(cvGO, ">", [0.064, -0.195, 0], [0.2, 0.03], [1,1,1,1]);

        // Position the menu on the left hand
        recenterMenu();
        log("Menu created with " + visibleBtns.length + " buttons");
    }

    function createButton(holder, cvGO, index, btnInfo) {
        const go = GameObjectClass.method("CreatePrimitive").invoke(3);
        go.method("set_name").invoke(Il2Cpp.string("[OBtn_"+index+"]"));
        try { destroySafe(getComponent(go, RigidbodyClass)); } catch(_){}
        try { getComponent(go, BoxColliderClass).method("set_isTrigger").invoke(true); } catch(_){}

        const tf = getTransform(go);
        tf.method("SetParent",2).invoke(getTransform(holder), false);
        tf.method("set_localPosition").invoke([0.56, 0, BTN_START_Z - index * BTN_SPACING]);
        tf.method("set_localRotation").invoke([0,0,0,1]);
        tf.method("set_localScale").invoke(BTN_SCALE);

        // Color: enabled toggles = rainbow, disabled = dark
        const isOn = btnInfo.toggle && O[btnInfo.key];
        if (isOn) {
            const rc = rainbowColor();
            try { setColor(getComponent(go, RendererClass), rc[0], rc[1], rc[2], 1); } catch(_){}
        } else {
            try { setColor(getComponent(go, RendererClass), 0.1, 0.1, 0.1, 1); } catch(_){}
        }

        // Text label
        let label = btnInfo.text;
        if (btnInfo.toggle) label += O[btnInfo.key] ? " [ON]" : "";
        const textZ = 0.111 - index * (BTN_SPACING / 2.6);
        createMenuText(cvGO, label, [0.064, 0, textZ], [0.2, 0.03], [1, 1, 1, 1]);

        O.btnGOs.push({go, info: btnInfo, index});
    }

    function createMenuText(cvGO, text, pos, size, color) {
        const tgo = GameObjectClass.method("CreatePrimitive").invoke(3);
        tgo.method("set_name").invoke(Il2Cpp.string("[OTxt]"));
        try { getComponent(tgo, RendererClass).method("set_enabled").invoke(false); } catch(_){}
        try { getComponent(tgo, BoxColliderClass).method("set_enabled").invoke(false); } catch(_){}
        getTransform(tgo).method("SetParent",2).invoke(getTransform(cvGO), false);

        const txt = addComponent(tgo, TextClass);
        try {
            // Try to find a font
            let font = null;
            try { font = ResourcesClass.method("GetBuiltinResource",2).invoke(FontClass.type.object, Il2Cpp.string("Arial.ttf")); } catch(_){}
            if (font && !font.handle.isNull()) txt.method("set_font").invoke(font);
        } catch(_){}
        txt.method("set_text").invoke(Il2Cpp.string(text));
        txt.method("set_fontSize").invoke(1);
        txt.method("set_color").invoke(color);
        txt.method("set_alignment").invoke(4); // MiddleCenter
        txt.method("set_fontStyle").invoke(1); // Bold
        txt.method("set_supportRichText").invoke(true);
        txt.method("set_resizeTextForBestFit").invoke(true);
        try { txt.method("set_resizeTextMinSize").invoke(0); } catch(_){}

        const rt = getComponent(tgo, RectTransformClass);
        rt.method("set_anchorMin").invoke([0.5, 0.5]);
        rt.method("set_anchorMax").invoke([0.5, 0.5]);
        rt.method("set_pivot").invoke([0.5, 0.5]);
        rt.method("set_sizeDelta").invoke(size);
        rt.method("set_localPosition").invoke(pos);
        rt.method("set_rotation").invoke(QuaternionClass.method("Euler",3).invoke(180, 90, 90));

        O.btnTexts.push(tgo);
    }

    function recenterMenu() {
        if (!O.menu) return;
        const lh = handTf(0);
        if (!lh) return;
        const menuTf = getTransform(O.menu);
        menuTf.method("set_position").invoke(lh.method("get_position").invoke());
        menuTf.method("set_rotation").invoke(lh.method("get_rotation").invoke());
    }

    function destroyMenu() {
        if (O.menu) {
            // Add rigidbody for throw effect, then destroy after 2 sec
            try {
                const rb = addComponent(O.menu, RigidbodyClass);
                // Give it some velocity from the hand
                try { rb.method("set_linearVelocity").invoke([0, 2, 0]); } catch(_){
                    try { rb.method("set_velocity").invoke([0, 2, 0]); } catch(_2){}
                }
                // Schedule destroy
                ObjectClass.method("Destroy",2).invoke(O.menu, 2.0);
            } catch(_) {
                destroySafe(O.menu);
            }
            O.menu = null;
            O.menuBG = null;
            O.canvasGO = null;
            O.btnGOs = [];
            O.btnTexts = [];
        }
        if (O.pointer) {
            destroySafe(O.pointer);
            O.pointer = null;
        }
    }

    function rebuildMenu() {
        if (O.menu) {
            destroySafe(O.menu);
            O.menu = null; O.menuBG = null; O.canvasGO = null;
            O.btnGOs = []; O.btnTexts = [];
        }
        createMenu();
        createPointer();
    }

    // ---- Pointer (sphere on right hand) ----
    function createPointer() {
        if (O.pointer) return;
        const rh = handTf(1);
        if (!rh) return;
        const ptr = GameObjectClass.method("CreatePrimitive").invoke(0); // Sphere
        ptr.method("set_name").invoke(Il2Cpp.string("[OrbitPointer]"));
        const ptf = getTransform(ptr);
        ptf.method("SetParent",2).invoke(rh, false);
        ptf.method("set_localPosition").invoke([0, -0.1, 0]);
        ptf.method("set_localScale").invoke([0.01, 0.01, 0.01]);
        const rc = rainbowColor();
        try { setColor(getComponent(ptr, RendererClass), rc[0], rc[1], rc[2], 1); } catch(_){}
        O.pointer = ptr;
        log("Pointer created on right hand");
    }

    // ================================================================
    //  COLLISION DETECTION (manual distance check)
    // ================================================================
    function checkButtonPress() {
        if (!O.menu || !O.pointer || O.pressCooldown > 0) { O.pressCooldown--; return; }

        // Get pointer world position
        const ptrPos = readPos(getTransform(O.pointer));
        if (!ptrPos) return;

        // Check each button GO
        for (const btn of O.btnGOs) {
            if (!btn.go) continue;
            const btnPos = readPos(getTransform(btn.go));
            if (!btnPos) continue;

            const d = dist3(ptrPos, btnPos);
            // Collision threshold — buttons are small cubes
            if (d < 0.035) {
                O.pressCooldown = 15; // cooldown frames

                if (btn.action === "prevPage") {
                    O.page = Math.max(0, O.page - 1);
                    rebuildMenu();
                    return;
                }
                if (btn.action === "nextPage") {
                    O.page++;
                    rebuildMenu();
                    return;
                }

                const info = btn.info;
                if (!info) continue;

                if (info.cat !== undefined) {
                    // Navigate to category
                    O.category = info.cat;
                    O.page = 0;
                    rebuildMenu();
                    flash(info.text);
                    return;
                }
                if (info.toggle) {
                    O[info.key] = !O[info.key];
                    onToggle(info.key, O[info.key]);
                    rebuildMenu();
                    return;
                }
                if (info.action) {
                    try { info.action(); } catch(e) { flash("err: " + e.message); }
                    rebuildMenu();
                    return;
                }
            }
        }
    }

    function onToggle(k, on) {
        if(k==="flyOn") toggleFly(on);
        if(k==="platformsOn"&&!on){destroySafe(O.platL);O.platL=null;O.platLLatched=false;destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
        if(k==="itemGunOn"){O.gunCd=0;if(!on)hideGun();}
        if(k==="itemOrbitOn"){if(on)startItemOrbit();else stopItemOrbit();}
        if(k==="invincibleOn") toggleInvincible(on);
        if(k==="invisibleOn") toggleInvisible(on);
        if(k==="noRedWatchOn") toggleNoRedWatch(on);
        if(k==="longArmsOn") toggleLongArms(on);
        if(k==="orbitAllOn") flash(on?"Orbit All ON":"Orbit All OFF");
    }

    // ================================================================
    //  MENU OPEN/CLOSE LOGIC
    // ================================================================
    let wasOpenBtn = false;
    function tickMenuInput() {
        // Hold Y (left secondary) to show menu
        const openBtn = secondaryBtn(0);

        if (!O.menuOpen) {
            if (openBtn && !wasOpenBtn) {
                O.menuOpen = true;
                createMenu();
                createPointer();
            }
        } else {
            if (openBtn) {
                // Still holding — recenter menu to hand
                recenterMenu();
                // Update rainbow color
                hueAngle = (hueAngle + 1) % 360;
                if (O.menuBG) {
                    const rc = rainbowColor();
                    try { setColor(getComponent(O.menuBG, RendererClass), rc[0], rc[1], rc[2], 1); } catch(_){}
                }
                if (O.pointer) {
                    const rc = rainbowColor();
                    try { setColor(getComponent(O.pointer, RendererClass), rc[0], rc[1], rc[2], 1); } catch(_){}
                }
                // Check button presses
                checkButtonPress();
            } else {
                // Released — throw menu away
                O.menuOpen = false;
                destroyMenu();
            }
        }
        wasOpenBtn = openBtn;
    }

    // ================================================================
    //  TICK
    // ================================================================
    function onTick() {
        O.tick++;
        try{const t=TimeClass.method("get_time").invoke();O.deltaTime=t-O.lastTime;O.lastTime=t;if(O.deltaTime>0.1)O.deltaTime=0.016;}catch(_){O.deltaTime=0.016;}

        // Menu input
        tickMenuInput();

        // Active mods
        tickFly();
        tickPlatforms();
        tickOrbitAll();
        tickItemOrbit();
        tickGun();
        if(O.noRedWatchOn && O.tick%60===0) toggleNoRedWatch(true);

        // Debug log every 5 sec
        if(O.tick-O.lastLog>=300){O.lastLog=O.tick;log("t="+O.tick+" fly="+O.flyOn+" plat="+O.platformsOn+" gun="+O.itemGunOn+" menu="+O.menuOpen);}
    }

    // ================================================================
    //  HOOK
    // ================================================================
    if(!O.hookInstalled){
        let tgt=null;
        try { tgt=GorillaLocomotionClass.method("OnUpdate"); } catch(_){}
        if(!tgt) try { tgt=GorillaLocomotionClass.method("FixedUpdate"); } catch(_){}
        if(!tgt) try { tgt=GorillaLocomotionClass.method("Update"); } catch(_){}
        if(!tgt) try { tgt=GorillaLocomotionClass.method("LateUpdate"); } catch(_){}
        if(!tgt){log("ERROR: no update method found on GorillaLocomotion");}
        else{Interceptor.attach(tgt.virtualAddress,{onEnter(){try{onTick();}catch(e){if(O.tick%600===0)log("tick err: "+e);}}});O.hookInstalled=true;log("hook on GorillaLocomotion."+tgt.name);}
    }
    log("===== Orbit Menu V7.0 READY =====");
    log("Hold Y (left hand) to open menu. Touch buttons with right hand pointer.");
});
}, 5000);
