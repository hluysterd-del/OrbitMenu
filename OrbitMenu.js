// ====================================================================
//  Orbit Menu V6.9 — Animal Company
//  - Screen-space "O" button → mouse-driven menu overlay
//  - "PC" button → third-person camera + WASD + mouse look
//  - Network prefab spawning via Fusion runner PrefabTable
//  - Item spawning with "item_prefab/" prefix
//  - Position-based fly (B button = forward)
//  - Purple LineRenderer gun beam + endpoint
//  - OP mods from ii's menu reference
// ====================================================================

setTimeout(() => {
Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V6.9 LOADING =====");

    // ---- Assemblies ----
    const acImage     = Il2Cpp.domain.assembly("AnimalCompany").image;
    const coreImage   = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const physImage   = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;
    const uiModImage  = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
    const uiImage     = Il2Cpp.domain.assembly("UnityEngine.UI").image;
    const textImage   = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;

    let inputImage = null;
    try { inputImage = Il2Cpp.domain.assembly("UnityEngine.InputLegacyModule").image; } catch(_){}
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
    const CameraClass     = coreImage.class("UnityEngine.Camera");
    const ScreenClass     = coreImage.class("UnityEngine.Screen");
    const CanvasClass     = uiModImage.class("UnityEngine.Canvas");
    const TextClass       = uiImage.class("UnityEngine.UI.Text");
    const ImageClass      = uiImage.class("UnityEngine.UI.Image");
    const FontClass       = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");
    const ColliderClass   = physImage.class("UnityEngine.Collider");
    const RigidbodyClass  = physImage.class("UnityEngine.Rigidbody");
    const PhysicsClass    = physImage.class("UnityEngine.Physics");

    let LineRendererClass = null;
    try { LineRendererClass = coreImage.class("UnityEngine.LineRenderer"); } catch(_){}

    // ---- Input Class (legacy) ----
    let InputClass = null;
    if (inputImage) {
        try { InputClass = inputImage.class("UnityEngine.Input"); } catch(_){}
    }
    if (!InputClass) {
        try { InputClass = coreImage.class("UnityEngine.Input"); } catch(_){}
    }

    let CursorClass = null;
    try { CursorClass = coreImage.class("UnityEngine.Cursor"); } catch(_){}

    // ---- AC Classes ----
    const PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController");
    const GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");
    const XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager");
    const NetPlayerClass         = acImage.class("AnimalCompany.NetPlayer");

    let PrefabGenClass = null;
    try { PrefabGenClass = acImage.class("AnimalCompany.PrefabGenerator"); } catch(_){}

    // ---- NULL + shaders ----
    const NULL = Il2Cpp.object(ptr(0));
    let UberShader = null;
    try { UberShader = ShaderClass.method("Find").invoke(Il2Cpp.string("Universal Render Pipeline/Unlit")); } catch(_){}
    let TextShader = null;
    try { TextShader = ShaderClass.method("Find").invoke(Il2Cpp.string("UI/Default")); } catch(_){}

    // ---- ITEM / PREFAB / MOB LISTS ----
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
    //  STATE
    // ================================================================
    globalThis.orbit = {
        tick: 0, hookInstalled: false,
        menuInited: false, menuGO: null, menuText: null, buildFailed: false,
        cursor: 0, tab: "main", page: 0,
        joyCd: 0, selWas: false,

        // Features
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

        // Screen overlay
        screenInited: false,
        screenCanvas: null,
        oButton: null, oButtonText: null,
        pcButton: null, pcButtonText: null,
        screenMenuOpen: false,
        screenMenuGO: null, screenMenuTexts: [], screenMenuBGs: [],
        screenCursor: 0,
        lastMouseDown: false,

        // PC mode
        pcModeOn: false,
        pcCam: null, pcCamGO: null,
        pcYaw: 0, pcPitch: 0,
        pcCamDist: 5,
        lastMouseX: 0, lastMouseY: 0,

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
    function getComponent(obj, cls) { return obj.method("GetComponent",1).inflate(cls).invoke(); }
    function addComponent(obj, cls) { return obj.method("AddComponent",1).inflate(cls).invoke(); }
    function destroySafe(obj) { if(obj) try{ObjectClass.method("Destroy",1).invoke(obj);}catch(_){} }

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
        try {
            const v=tf.method("get_position").invoke();
            try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
        } catch(_){} return null;
    }
    function readFwd(tf) {
        if(!tf) return null;
        try {
            const v=tf.method("get_forward").invoke();
            try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
        } catch(_){} return null;
    }

    // ================================================================
    //  KEYBOARD / MOUSE INPUT (legacy Input API)
    // ================================================================
    function getKey(keyCode) {
        if (!InputClass) return false;
        try { return readBool(InputClass.method("GetKey",1).invoke(keyCode)); } catch(_){return false;}
    }
    function getKeyDown(keyCode) {
        if (!InputClass) return false;
        try { return readBool(InputClass.method("GetKeyDown",1).invoke(keyCode)); } catch(_){return false;}
    }
    function getMouseBtn(btn) {
        if (!InputClass) return false;
        try { return readBool(InputClass.method("GetMouseButton",1).invoke(btn)); } catch(_){return false;}
    }
    function getMouseBtnDown(btn) {
        if (!InputClass) return false;
        try { return readBool(InputClass.method("GetMouseButtonDown",1).invoke(btn)); } catch(_){return false;}
    }
    function getMousePos() {
        if (!InputClass) return {x:0,y:0};
        try {
            const v = InputClass.method("get_mousePosition").invoke();
            try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value}; } catch(_){}
            return {x:v.field("x").value,y:v.field("y").value};
        } catch(_){return {x:0,y:0};}
    }
    function getMouseDelta() {
        if (!InputClass) return {x:0,y:0};
        try {
            const ax = InputClass.method("GetAxis",1).invoke(Il2Cpp.string("Mouse X"));
            const ay = InputClass.method("GetAxis",1).invoke(Il2Cpp.string("Mouse Y"));
            return {x: typeof ax === "number" ? ax : 0, y: typeof ay === "number" ? ay : 0};
        } catch(_){return {x:0,y:0};}
    }
    function getScreenSize() {
        try { return { w: ScreenClass.method("get_width").invoke(), h: ScreenClass.method("get_height").invoke() }; } catch(_){}
        return {w:1920,h:1080};
    }

    // KeyCode enum: W=119, A=97, S=115, D=100, Space=32, LeftShift=304, Escape=27
    const KC_W=119, KC_A=97, KC_S=115, KC_D=100, KC_SPACE=32, KC_LSHIFT=304, KC_ESC=27;

    // ================================================================
    //  XR INPUT
    // ================================================================
    function joyY(hand) {
        try { const r=XRInputManagerClass.method("GetJoystickValue").invoke(hand); if(!r) return 0;
            try { return r.unbox().field("y").value; } catch(_){} return r.field("y").value;
        } catch(_){return 0;}
    }
    function joyX(hand) {
        try { const r=XRInputManagerClass.method("GetJoystickValue").invoke(hand); if(!r) return 0;
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
        try { const r=PrefabGenClass.method("SpawnItem",4).invoke(Il2Cpp.string(full),pos,rot,NULL); if(r&&!r.handle.isNull()) return r; } catch(_){}
        try { const r=PrefabGenClass.method("SpawnItem",4).invoke(Il2Cpp.string(itemID),pos,rot,NULL); if(r&&!r.handle.isNull()) return r; } catch(_){}
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
                    const mz=(type)=>{if(type.class.isEnum||type.isPrimitive)return 0;if(!type.class.isValueType)return NULL;const f=type.class.fields.filter(f=>!f.isStatic);return f.length===0?0:f.map(fi=>mz(fi.type));};
                    const bn=(nt,hv,val)=>{const f=nt.class.fields.filter(f=>!f.isStatic);return f.map(fi=>{const ln=fi.name.toLowerCase();if(ln.includes("hasvalue"))return hv?1:0;if(ln==="value")return hv?val:mz(fi.type);return mz(fi.type);});};
                    return spawnMethod.bind(runner).invoke(no,bn(spawnMethod.parameters[1].type,true,pos),bn(spawnMethod.parameters[2].type,true,rot),bn(spawnMethod.parameters[3].type,false,mz(spawnMethod.parameters[3].type)),spawnMethod.parameters[4].type.class.isValueType?mz(spawnMethod.parameters[4].type):NULL,0);
                } catch(_){}
            }
        } catch(e){log("spawnNetPrefab: "+e);} return null;
    }
    function spawnMob(mobID, pos, rot) {
        if (!PrefabGenClass) return null;
        try { return PrefabGenClass.method("SpawnItem",4).invoke(Il2Cpp.string("mob_prefab/"+mobID),pos,rot,NULL); } catch(_){} return null;
    }
    function spawnInFront(type, id) {
        const head=headTf(), pos=readPos(head), fwd=readFwd(head);
        if (!pos||!fwd) { flashAction("no head"); return null; }
        const sp=[pos.x+fwd.x*3,pos.y+fwd.y*3,pos.z+fwd.z*3], rot=[0,0,0,1];
        let r=null;
        if(type==="item") r=spawnItem(id,sp,rot);
        else if(type==="prefab") r=spawnNetworkPrefab(id,sp,rot);
        else if(type==="mob") r=spawnMob(id,sp,rot);
        flashAction(r ? "Spawned: "+id : "Failed: "+id);
        return r;
    }

    // ================================================================
    //  OP ACTIONS
    // ================================================================
    function flashAction(msg) { O.actionMsg=msg; O.actionTick=O.tick; log(msg); }
    function actTpAll() { const p=readPos(headTf()); if(!p){flashAction("no head");return;} let n=forEachOtherPlayer(np=>{try{np.method("RPC_Teleport").invoke([p.x,p.y,p.z]);}catch(_){try{np.method("RPC_Teleport",1).invoke([p.x,p.y,p.z]);}catch(_2){}}}); flashAction("TP'd "+n); }
    function actYeetAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_AddForce",1).invoke([0,80,0]);}catch(_){try{np.method("RPC_AddForce").invoke([0,80,0]);}catch(_2){}}}); flashAction("Yeeted "+n); }
    function actStinkAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_TagAsStinky",0).invoke();}catch(_){try{np.method("RPC_TagAsStinky").invoke();}catch(_2){}}}); flashAction("Stinked "+n); }
    function actColorAll() { let n=forEachOtherPlayer(np=>{const h=Math.random()*360;try{np.method("RPC_SetColorHSV",4).invoke(h,1,1,1);}catch(_){try{np.method("RPC_SetColorHSV").invoke(h,1,1,1);}catch(_2){}}}); flashAction("Colored "+n); }
    function actFlingAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_AddForce",1).invoke([0,120,0]);}catch(_){}}); flashAction("Flung "+n); }
    function actVoidAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_Teleport",1).invoke([0,-500,0]);}catch(_){try{np.method("RPC_Teleport").invoke([0,-500,0]);}catch(_2){}}}); flashAction("Voided "+n); }
    function actMoneyAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_AddPlayerMoney",1).invoke(99999);}catch(_){}}); flashAction("$99999 to "+n); }
    function actStunAll() { let n=forEachOtherPlayer(np=>{try{np.method("RPC_Stun",1).invoke(30.0);}catch(_){}}); flashAction("Stunned "+n); }

    function toggleInvincible(on) {
        try { const lp=NetPlayerClass.method("get_localPlayer").invoke(), pc=playerInst();
            if(on){try{lp.method("set_maxHealth").invoke(999999999);}catch(_){}try{lp.method("set_healthGained").invoke(999999999);}catch(_){}try{pc.method("SubtractPlayerHealth").invoke(-333333);}catch(_){}try{pc.method("set_healthHealed").invoke(999999999);}catch(_){}}
            else{try{lp.method("set_maxHealth").invoke(125);}catch(_){}try{lp.method("set_healthGained").invoke(125);}catch(_){}try{pc.method("set_healthHealed").invoke(125);}catch(_){}}
            flashAction(on?"INVINCIBLE":"invincible off");
        } catch(e){log("invincible: "+e);}
    }
    function toggleInvisible(on) {
        try { const pc=playerInst(),view=pc.method("get_playerView").invoke(),cam=view.field("_cameraTransform").value;
            if(on) cam.method("set_position").invoke([0,-99999,0]);
            else { const hp=readPos(headTf()); if(hp) cam.method("set_position").invoke([hp.x,hp.y,hp.z]); }
            flashAction(on?"INVISIBLE":"invisible off");
        } catch(e){log("invisible: "+e);}
    }
    function toggleNoRedWatch(on) { try{NetPlayerClass.method("get_localPlayer").invoke().method("set_isWanted").invoke(false);}catch(_){} flashAction(on?"No Red Watch":"cleared"); }
    function toggleLongArms(on) { try{const gl=gorillaInst();getTransform(gl).method("set_localScale").invoke(on?[1.5,1.5,1.5]:[1,1,1]);flashAction(on?"LONG ARMS":"normal arms");}catch(e){log("longarms: "+e);} }

    // ================================================================
    //  FLY — B button = fly forward in head direction
    // ================================================================
    function toggleFly(on) {
        const gl=gorillaInst(); if(!gl) return;
        try { const rb=getComponent(gl,RigidbodyClass);
            if(on){try{O.savedGravity=rb.method("get_useGravity").invoke();}catch(_){O.savedGravity=true;} rb.method("set_useGravity").invoke(false);try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}} flashAction("FLY ON — hold B");}
            else{rb.method("set_useGravity").invoke(O.savedGravity!=null?O.savedGravity:true);try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}} flashAction("fly off");}
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
    function createPlatCube(scale,color) {
        const obj=GameObjectClass.method("CreatePrimitive").invoke(3);
        obj.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
        getTransform(obj).method("set_localScale").invoke(scale);
        obj.method("set_layer").invoke(0);
        try{const r=getComponent(obj,RendererClass),m=r.method("get_material").invoke();if(UberShader)m.method("set_shader").invoke(UberShader);m.method("set_color").invoke(color);}catch(_){}
        try{const c=getComponent(obj,ColliderClass);c.method("set_enabled").invoke(true);c.method("set_isTrigger").invoke(false);}catch(_){}
        return obj;
    }
    function tickPlatforms() {
        if(!O.platformsOn) return;
        if(grip(1)){if(!O.platRLatched||!O.platR||O.platR.handle.isNull()){if(O.platR)destroySafe(O.platR);O.platR=createPlatCube([0.4,0.05,0.4],[0.6,0.2,0.8,1]);O.platRLatched=true;const h=handTf(1);if(h){const t=getTransform(O.platR);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
        else if(O.platR){destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
        if(grip(0)){if(!O.platLLatched||!O.platL||O.platL.handle.isNull()){if(O.platL)destroySafe(O.platL);O.platL=createPlatCube([0.4,0.05,0.4],[0.6,0.2,0.8,1]);O.platLLatched=true;const h=handTf(0);if(h){const t=getTransform(O.platL);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
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
        if(!O.gunLine||O.gunLine.handle.isNull()){if(LineRendererClass){try{const lo=GameObjectClass.method("CreatePrimitive").invoke(0);lo.method("set_name").invoke(Il2Cpp.string("[OGunLine]"));try{getComponent(lo,RendererClass).method("set_enabled").invoke(false);}catch(_){}try{getComponent(lo,ColliderClass).method("set_enabled").invoke(false);}catch(_){}O.gunLine=addComponent(lo,LineRendererClass);ObjectClass.method("DontDestroyOnLoad").invoke(lo);}catch(e){log("gunLine: "+e);}}}
        if(!O.gunPointer||O.gunPointer.handle.isNull()){try{O.gunPointer=GameObjectClass.method("CreatePrimitive").invoke(0);O.gunPointer.method("set_name").invoke(Il2Cpp.string("[OGunPtr]"));getTransform(O.gunPointer).method("set_localScale").invoke([0.15,0.15,0.15]);try{getComponent(O.gunPointer,ColliderClass).method("set_enabled").invoke(false);}catch(_){}try{const r=getComponent(O.gunPointer,RendererClass),m=r.method("get_material").invoke();if(TextShader)m.method("set_shader").invoke(TextShader);m.method("set_color").invoke([0.7,0,1,0.9]);}catch(_){}ObjectClass.method("DontDestroyOnLoad").invoke(O.gunPointer);}catch(e){log("gunPtr: "+e);}}
        if(O.gunPointer){O.gunPointer.method("SetActive").invoke(true);getTransform(O.gunPointer).method("set_position").invoke(endPos);}
        if(O.gunLine){try{O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(true);const lm=O.gunLine.method("get_material").invoke();if(TextShader)lm.method("set_shader").invoke(TextShader);O.gunLine.method("set_startColor").invoke([0.5,0,0.8,0.8]);O.gunLine.method("set_endColor").invoke([0.7,0,1,0.6]);O.gunLine.method("set_startWidth").invoke(0.02);O.gunLine.method("set_endWidth").invoke(0.02);O.gunLine.method("set_positionCount").invoke(2);O.gunLine.method("set_useWorldSpace").invoke(true);O.gunLine.method("SetPosition").invoke(0,[sP.x,sP.y,sP.z]);O.gunLine.method("SetPosition").invoke(1,endPos);}catch(_){}}
        if(O.gunCd>0){O.gunCd--;return;}
        if(!trigger(1))return;O.gunCd=25;
        const id=ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)];
        const obj=spawnItem(id,endPos,[0,0,0,1]);
        if(obj)flashAction("Shot: "+id.replace("item_",""));
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
        stopItemOrbit();const p=readPos(headTf());if(!p){flashAction("no head");return;}
        const sp=[];for(let i=0;i<5;i++){const a=(2*Math.PI/5)*i;const o=spawnItem("item_rpg_ammo",[p.x+Math.cos(a)*2.5,p.y+0.5,p.z+Math.sin(a)*2.5],[0,0,0,1]);if(o&&!o.handle.isNull()){try{ObjectClass.method("DontDestroyOnLoad").invoke(o);}catch(_){}sp.push(o);}}
        if(!sp.length){flashAction("orbit failed");return;}O.itemOrbitObjs=sp;O.itemOrbitOn=true;O.itemOrbitAngle=0;flashAction(sp.length+"x RPG orbiting!");
    }
    function stopItemOrbit() { for(const o of O.itemOrbitObjs)destroySafe(o);O.itemOrbitObjs=[];O.itemOrbitOn=false; }
    function tickItemOrbit() {
        if(!O.itemOrbitOn||!O.itemOrbitObjs.length)return;O.itemOrbitAngle+=0.04;if(O.itemOrbitAngle>6.28)O.itemOrbitAngle-=6.28;
        const mp=readPos(headTf());if(!mp)return;const r=2.5,st=(2*Math.PI)/O.itemOrbitObjs.length,alive=[];
        for(let i=0;i<O.itemOrbitObjs.length;i++){const o=O.itemOrbitObjs[i];try{if(!o||o.handle.isNull())continue;const a=O.itemOrbitAngle+st*i;getTransform(o).method("set_position").invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);alive.push(o);}catch(_){}}
        O.itemOrbitObjs=alive;if(!alive.length)O.itemOrbitOn=false;
    }

    // ================================================================
    //  MENU ITEMS
    // ================================================================
    const PER_PAGE = 6;
    function menuItems() {
        switch(O.tab) {
        case "main": return [
            {l:"Movement",t:"tab",to:"move"},{l:"Items / Spawning",t:"tab",to:"spawn"},
            {l:"Gun Mods",t:"tab",to:"gun"},{l:"Player Mods",t:"tab",to:"player"},
            {l:"<color=#ff3333>Overpowered</color>",t:"tab",to:"op"},
            {l:"<color=#55ccff>Prefabs</color>",t:"tab",to:"prefabs"},
            {l:"<color=#88ff88>Mobs</color>",t:"tab",to:"mobs"},
        ];
        case "move": return [{l:"< Back",t:"back"},{l:"Fly (B=forward)",t:"tog",k:"flyOn"},{l:"Platforms (grip)",t:"tog",k:"platformsOn"},{l:"Long Arms",t:"tog",k:"longArmsOn"},
            ...Object.entries(TELEPORT_LOCS).map(([n,p])=>({l:"TP: "+n,t:"act",fn:()=>{try{NetPlayerClass.method("get_localPlayer").invoke().method("RPC_Teleport").invoke(p);flashAction("TP "+n);}catch(_){flashAction("tp err");}}}))];
        case "spawn": return buildListPage(ALL_ITEMS,"item",id=>id.replace("item_",""));
        case "gun": return [{l:"< Back",t:"back"},{l:"Item Gun (trigger)",t:"tog",k:"itemGunOn"},{l:"Item Orbit (5x RPG)",t:"tog",k:"itemOrbitOn"}];
        case "player": return [{l:"< Back",t:"back"},{l:"Invincible",t:"tog",k:"invincibleOn"},{l:"Invisible",t:"tog",k:"invisibleOn"},{l:"No Red Watch",t:"tog",k:"noRedWatchOn"}];
        case "op": return [{l:"< Back",t:"back"},{l:"Orbit All",t:"tog",k:"orbitAllOn"},
            {l:"TP All to Me",t:"act",fn:actTpAll},{l:"Yeet All",t:"act",fn:actYeetAll},{l:"Stink All",t:"act",fn:actStinkAll},
            {l:"Color All",t:"act",fn:actColorAll},{l:"Fling All",t:"act",fn:actFlingAll},{l:"Void All",t:"act",fn:actVoidAll},
            {l:"Money All ($99999)",t:"act",fn:actMoneyAll},{l:"Stun All (30s)",t:"act",fn:actStunAll}];
        case "prefabs": return buildListPage(PREFAB_NAMES,"prefab");
        case "mobs": return buildListPage(MOB_IDS,"mob");
        default: return [];
        }
    }
    function buildListPage(list,type,fmt) {
        const tp=Math.max(1,Math.ceil(list.length/PER_PAGE)),pg=Math.min(O.page,tp-1),s=pg*PER_PAGE,e=Math.min(s+PER_PAGE,list.length);
        const its=[{l:"< Back",t:"back"}];
        for(let i=s;i<e;i++){const id=list[i];its.push({l:fmt?fmt(id):id,t:"act",fn:(function(x){return function(){spawnInFront(type,x);};})(id)});}
        if(pg>0)its.push({l:"◀ Prev",t:"act",fn:()=>{O.page--;O.cursor=1;}});
        if(e<list.length)its.push({l:"Next ▶",t:"act",fn:()=>{O.page++;O.cursor=1;}});
        return its;
    }

    // ================================================================
    //  VR TEXT MENU (head-tracked)
    // ================================================================
    function renderVRText() {
        const its=menuItems();
        const L=["<b><color=#bb88ff>Orbit Menu V6.9"+tabTitle()+"</color></b>",""];
        for(let i=0;i<its.length;i++){const it=its[i];const c=(i===O.cursor)?"<color=#ffcc00>▶</color> ":"   ";let t=it.l;
            if(it.t==="tog") t+=O[it.k]?" <color=#00ff00>[ON]</color>":" <color=#ff4444>[OFF]</color>";
            else if(it.t==="tab") t+=" ▸";
            L.push(c+t);}
        L.push("");
        if(O.actionMsg&&(O.tick-O.actionTick)<180) L.push("<color=#00ffaa>"+O.actionMsg+"</color>");
        if(O.flyOn) L.push("<color=#88ccff>✈ Fly ON</color>");
        L.push("<size=9><color=#666>R-Stick=nav  B/Trigger=sel</color></size>");
        return L.join("\n");
    }
    function tabTitle() {
        const m={"move":" > Move","spawn":" > Items","gun":" > Gun","player":" > Player","op":" > <color=#ff3333>OP</color>","prefabs":" > <color=#55ccff>Prefabs</color>","mobs":" > <color=#88ff88>Mobs</color>"};
        return m[O.tab]||"";
    }

    // ================================================================
    //  VR INPUT
    // ================================================================
    function processVRInput() {
        const y=joyY(1),its=menuItems();
        if(O.joyCd>0)O.joyCd--;
        else{if(y<-0.55&&O.cursor<its.length-1){O.cursor++;O.joyCd=18;}else if(y>0.55&&O.cursor>0){O.cursor--;O.joyCd=18;}}
        const selNow=bBtn(1)||trigger(1),press=selNow&&!O.selWas;O.selWas=selNow;
        if(press&&O.cursor<its.length) activateItem(its[O.cursor]);
    }
    function activateItem(it) {
        if(it.t==="tab"){O.tab=it.to;O.cursor=0;O.page=0;}
        else if(it.t==="back"){O.tab="main";O.cursor=0;O.page=0;}
        else if(it.t==="tog"){O[it.k]=!O[it.k];onToggle(it.k,O[it.k]);}
        else if(it.t==="act"){try{it.fn();}catch(e){flashAction("err: "+e.message);}}
    }
    function onToggle(k,on) {
        if(k==="flyOn")toggleFly(on);
        if(k==="platformsOn"&&!on){destroySafe(O.platL);O.platL=null;O.platLLatched=false;destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
        if(k==="itemGunOn"){O.gunCd=0;if(!on)hideGun();}
        if(k==="itemOrbitOn"){if(on)startItemOrbit();else stopItemOrbit();}
        if(k==="invincibleOn")toggleInvincible(on);
        if(k==="invisibleOn")toggleInvisible(on);
        if(k==="noRedWatchOn")toggleNoRedWatch(on);
        if(k==="longArmsOn")toggleLongArms(on);
        if(k==="orbitAllOn")flashAction(on?"Orbit All ON":"Orbit All OFF");
    }

    // ================================================================
    //  SCREEN OVERLAY — "O" button + "PC" button + mouse menu
    // ================================================================
    function initScreenOverlay() {
        if (O.screenInited) return;
        try {
            // Create ScreenSpace Overlay canvas
            const canvasGO = new Il2Cpp.Object(GameObjectClass.method(".ctor",1).invoke(Il2Cpp.string("[OrbitScreenCanvas]")));
            // Actually use CreatePrimitive workaround then strip
            const cGO = GameObjectClass.method(".ctor",1);
        } catch(_){}

        // Simpler approach: create a regular GO, add Canvas
        try {
            const cGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            cGO.method("set_name").invoke(Il2Cpp.string("[OrbitScreen]"));
            try{getComponent(cGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
            try{getComponent(cGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}

            const canvas = addComponent(cGO, CanvasClass);
            canvas.method("set_renderMode").invoke(0); // ScreenSpaceOverlay
            canvas.method("set_sortingOrder").invoke(999);

            ObjectClass.method("DontDestroyOnLoad").invoke(cGO);
            O.screenCanvas = cGO;

            // ---- "O" Button (bottom-left corner) ----
            const oBtn = makeScreenButton(cGO, "O", 60, 60, 40, 40, [0.45,0.2,0.7,0.85], 24);
            O.oButton = oBtn.go;

            // ---- "PC" Button (top-left) ----
            const pcBtn = makeScreenButton(cGO, "PC", 60, 35, 40, -40, [0.3,0.3,0.3,0.85], 18);
            O.pcButton = pcBtn.go;

            O.screenInited = true;
            log("Screen overlay initialized (O + PC buttons)");
        } catch(e) { log("Screen overlay err: " + e); }
    }

    function makeScreenButton(parent, label, w, h, posX, posY, color, fontSize) {
        // Create a child GO with Image + Text
        const go = GameObjectClass.method("CreatePrimitive").invoke(3);
        go.method("set_name").invoke(Il2Cpp.string("[OBtn_"+label+"]"));
        try{getComponent(go,RendererClass).method("set_enabled").invoke(false);}catch(_){}
        try{getComponent(go,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
        getTransform(go).method("SetParent",2).invoke(getTransform(parent), false);

        // Add Image component for background
        const img = addComponent(go, ImageClass);
        img.method("set_color").invoke(color);

        // Position via RectTransform
        const rt = getComponent(go, RectTransformClass);
        rt.method("set_anchorMin").invoke([0,0]); // bottom-left anchor for O
        rt.method("set_anchorMax").invoke([0,0]);
        rt.method("set_pivot").invoke([0.5,0.5]);
        rt.method("set_anchoredPosition").invoke([posX, posY]);
        rt.method("set_sizeDelta").invoke([w, h]);

        // Add Text child
        const textGO = GameObjectClass.method("CreatePrimitive").invoke(3);
        textGO.method("set_name").invoke(Il2Cpp.string("[OBtnTxt_"+label+"]"));
        try{getComponent(textGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
        try{getComponent(textGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
        getTransform(textGO).method("SetParent",2).invoke(getTransform(go), false);

        const txt = addComponent(textGO, TextClass);
        txt.method("set_text").invoke(Il2Cpp.string(label));
        txt.method("set_fontSize").invoke(fontSize);
        txt.method("set_color").invoke([1,1,1,1]);
        txt.method("set_alignment").invoke(4); // MiddleCenter
        txt.method("set_fontStyle").invoke(1); // Bold
        txt.method("set_resizeTextForBestFit").invoke(false);

        const trt = getComponent(textGO, RectTransformClass);
        trt.method("set_anchorMin").invoke([0,0]);
        trt.method("set_anchorMax").invoke([1,1]);
        trt.method("set_pivot").invoke([0.5,0.5]);
        trt.method("set_anchoredPosition").invoke([0,0]);
        trt.method("set_sizeDelta").invoke([0,0]);

        return {go, img, txt, rt, w, h, posX, posY};
    }

    // ================================================================
    //  SCREEN MENU (opened by "O" button)
    // ================================================================
    function buildScreenMenu() {
        // Destroy old screen menu items
        destroyScreenMenu();

        const its = menuItems();
        const scr = getScreenSize();
        const menuW = 350, menuH = its.length * 45 + 80;
        const menuX = scr.w / 2, menuY = scr.h / 2;

        // Background panel
        const bgGO = GameObjectClass.method("CreatePrimitive").invoke(3);
        bgGO.method("set_name").invoke(Il2Cpp.string("[OMenuBG]"));
        try{getComponent(bgGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
        try{getComponent(bgGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
        getTransform(bgGO).method("SetParent",2).invoke(getTransform(O.screenCanvas), false);
        const bgImg = addComponent(bgGO, ImageClass);
        bgImg.method("set_color").invoke([0.1, 0.05, 0.15, 0.92]);
        const bgRT = getComponent(bgGO, RectTransformClass);
        bgRT.method("set_anchorMin").invoke([0.5,0.5]);
        bgRT.method("set_anchorMax").invoke([0.5,0.5]);
        bgRT.method("set_pivot").invoke([0.5,0.5]);
        bgRT.method("set_anchoredPosition").invoke([0, 0]);
        bgRT.method("set_sizeDelta").invoke([menuW, menuH]);
        O.screenMenuGO = bgGO;

        // Title
        addScreenText(bgGO, "Orbit Menu V6.9" + tabTitle(), 0, menuH/2 - 25, menuW - 20, 35, 20, [0.73,0.53,1,1]);

        // Buttons
        O.screenMenuBGs = [];
        O.screenMenuTexts = [];
        for (let i = 0; i < its.length; i++) {
            const it = its[i];
            const yOff = menuH/2 - 65 - i * 42;
            const isSelected = (i === O.screenCursor);

            // Button BG
            const btnGO = GameObjectClass.method("CreatePrimitive").invoke(3);
            btnGO.method("set_name").invoke(Il2Cpp.string("[OMenuBtn"+i+"]"));
            try{getComponent(btnGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
            try{getComponent(btnGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
            getTransform(btnGO).method("SetParent",2).invoke(getTransform(bgGO), false);
            const btnImg = addComponent(btnGO, ImageClass);
            btnImg.method("set_color").invoke(isSelected ? [0.45, 0.2, 0.7, 0.9] : [0.2, 0.1, 0.3, 0.7]);
            const btnRT = getComponent(btnGO, RectTransformClass);
            btnRT.method("set_anchorMin").invoke([0.5,0.5]);
            btnRT.method("set_anchorMax").invoke([0.5,0.5]);
            btnRT.method("set_pivot").invoke([0.5,0.5]);
            btnRT.method("set_anchoredPosition").invoke([0, yOff]);
            btnRT.method("set_sizeDelta").invoke([menuW - 20, 38]);

            // Button text
            let label = it.l;
            if (it.t === "tog") label += O[it.k] ? " [ON]" : " [OFF]";
            else if (it.t === "tab") label += " ▸";
            const txtColor = isSelected ? [1, 0.85, 0, 1] : [0.9, 0.9, 0.9, 1];
            addScreenText(btnGO, (isSelected ? "▶ " : "") + label.replace(/<[^>]+>/g,""), 0, 0, menuW - 30, 35, 16, txtColor);

            O.screenMenuBGs.push({go:btnGO, rt:btnRT, yOff, idx:i});
        }

        // Action message
        if (O.actionMsg && (O.tick - O.actionTick) < 180) {
            addScreenText(bgGO, O.actionMsg, 0, -menuH/2 + 20, menuW - 20, 25, 12, [0, 1, 0.67, 1]);
        }
    }

    function addScreenText(parent, text, x, y, w, h, size, color) {
        const tgo = GameObjectClass.method("CreatePrimitive").invoke(3);
        tgo.method("set_name").invoke(Il2Cpp.string("[OTxt]"));
        try{getComponent(tgo,RendererClass).method("set_enabled").invoke(false);}catch(_){}
        try{getComponent(tgo,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
        getTransform(tgo).method("SetParent",2).invoke(getTransform(parent), false);
        const txt = addComponent(tgo, TextClass);
        txt.method("set_text").invoke(Il2Cpp.string(text));
        txt.method("set_fontSize").invoke(size);
        txt.method("set_color").invoke(color);
        txt.method("set_alignment").invoke(4);
        txt.method("set_fontStyle").invoke(1);
        txt.method("set_supportRichText").invoke(false);
        const rt = getComponent(tgo, RectTransformClass);
        rt.method("set_anchorMin").invoke([0.5,0.5]);
        rt.method("set_anchorMax").invoke([0.5,0.5]);
        rt.method("set_pivot").invoke([0.5,0.5]);
        rt.method("set_anchoredPosition").invoke([x, y]);
        rt.method("set_sizeDelta").invoke([w, h]);
        O.screenMenuTexts.push(tgo);
        return txt;
    }

    function destroyScreenMenu() {
        if (O.screenMenuGO) { destroySafe(O.screenMenuGO); O.screenMenuGO = null; }
        O.screenMenuBGs = [];
        O.screenMenuTexts = [];
    }

    // ================================================================
    //  SCREEN MOUSE INPUT
    // ================================================================
    function tickScreenInput() {
        if (!O.screenInited || !InputClass) return;

        const mouseDown = getMouseBtnDown(0);
        const mousePos = getMousePos();
        const scr = getScreenSize();

        // Check if clicking "O" button (bottom-left, ~40,40 center, 60x60)
        if (mouseDown) {
            // O button region: x 10-70, y 10-70 (bottom-left)
            if (mousePos.x >= 10 && mousePos.x <= 70 && mousePos.y >= 10 && mousePos.y <= 70) {
                O.screenMenuOpen = !O.screenMenuOpen;
                O.screenCursor = 0;
                if (O.screenMenuOpen) {
                    buildScreenMenu();
                    log("Screen menu OPENED");
                } else {
                    destroyScreenMenu();
                    log("Screen menu CLOSED");
                }
                return;
            }

            // PC button region: x 10-70, y from top (scr.h - 10 - 35 to scr.h - 10)
            if (mousePos.x >= 10 && mousePos.x <= 70 && mousePos.y >= scr.h - 60 && mousePos.y <= scr.h - 10) {
                O.pcModeOn = !O.pcModeOn;
                togglePCMode(O.pcModeOn);
                return;
            }

            // If screen menu is open, check button clicks
            if (O.screenMenuOpen) {
                const its = menuItems();
                const menuW = 350, menuH = its.length * 45 + 80;
                const menuCX = scr.w / 2, menuCY = scr.h / 2;

                for (let i = 0; i < its.length; i++) {
                    const yOff = menuH/2 - 65 - i * 42;
                    // Button center in screen coords: (menuCX, menuCY + yOff)
                    const btnScrY = menuCY + yOff;
                    const btnScrX = menuCX;

                    if (Math.abs(mousePos.x - btnScrX) < (menuW - 20)/2 &&
                        Math.abs(mousePos.y - btnScrY) < 19) {
                        O.screenCursor = i;
                        activateItem(its[i]);
                        // Rebuild menu after action
                        if (O.screenMenuOpen) buildScreenMenu();
                        return;
                    }
                }
            }
        }

        // Update hover state with mouse position
        if (O.screenMenuOpen) {
            const its = menuItems();
            const menuH = its.length * 45 + 80;
            const menuCY = scr.h / 2;

            for (let i = 0; i < its.length; i++) {
                const yOff = menuH/2 - 65 - i * 42;
                const btnScrY = menuCY + yOff;
                if (Math.abs(mousePos.y - btnScrY) < 19 && Math.abs(mousePos.x - scr.w/2) < 165) {
                    if (O.screenCursor !== i) {
                        O.screenCursor = i;
                        buildScreenMenu(); // rebuild to highlight
                    }
                    break;
                }
            }
        }
    }

    // ================================================================
    //  PC MODE — Third-Person Camera + WASD + Mouse Look
    // ================================================================
    function togglePCMode(on) {
        if (on) {
            log("PC MODE ON — WASD to move, mouse to look");
            flashAction("PC Mode ON");

            // Get head position for initial camera placement
            const hp = readPos(headTf());
            if (!hp) { O.pcModeOn = false; flashAction("no head for PC cam"); return; }

            // Create a camera GO if needed
            if (!O.pcCamGO || O.pcCamGO.handle.isNull()) {
                try {
                    O.pcCamGO = GameObjectClass.method("CreatePrimitive").invoke(3);
                    O.pcCamGO.method("set_name").invoke(Il2Cpp.string("[OrbitPCCam]"));
                    try{getComponent(O.pcCamGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
                    try{getComponent(O.pcCamGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
                    O.pcCam = addComponent(O.pcCamGO, CameraClass);
                    O.pcCam.method("set_depth").invoke(100.0); // render on top
                    O.pcCam.method("set_fieldOfView").invoke(75.0);
                    O.pcCam.method("set_nearClipPlane").invoke(0.1);
                    O.pcCam.method("set_farClipPlane").invoke(1000.0);
                    ObjectClass.method("DontDestroyOnLoad").invoke(O.pcCamGO);
                } catch(e) { log("PC cam create: " + e); O.pcModeOn = false; return; }
            }

            // Enable the PC camera
            O.pcCamGO.method("SetActive").invoke(true);
            O.pcYaw = 0;
            O.pcPitch = 15;
            O.pcCamDist = 5;

            // Unlock cursor for mouse look
            try { if(CursorClass) { CursorClass.method("set_lockState").invoke(2); CursorClass.method("set_visible").invoke(false); } } catch(_){}

            // Update PC button text
            try { if(O.pcButton) { /* update color */ } } catch(_){}
        } else {
            log("PC MODE OFF");
            flashAction("PC Mode OFF");

            // Disable PC camera
            if (O.pcCamGO) {
                try { O.pcCamGO.method("SetActive").invoke(false); } catch(_){}
            }

            // Unlock cursor
            try { if(CursorClass) { CursorClass.method("set_lockState").invoke(0); CursorClass.method("set_visible").invoke(true); } } catch(_){}
        }
    }

    function tickPCMode() {
        if (!O.pcModeOn || !O.pcCamGO || O.pcCamGO.handle.isNull()) return;

        const dt = O.deltaTime || 0.016;
        const gl = gorillaInst();
        const playerTf = gl ? getTransform(gl) : null;
        const hp = readPos(headTf());
        if (!hp || !playerTf) return;

        // ---- Mouse Look ----
        const md = getMouseDelta();
        O.pcYaw += md.x * 3.0;
        O.pcPitch -= md.y * 2.0;
        O.pcPitch = Math.max(-80, Math.min(80, O.pcPitch));

        // ---- Camera Position (orbit around player) ----
        const yawRad = O.pcYaw * Math.PI / 180;
        const pitchRad = O.pcPitch * Math.PI / 180;
        const camX = hp.x - Math.sin(yawRad) * Math.cos(pitchRad) * O.pcCamDist;
        const camY = hp.y + Math.sin(pitchRad) * O.pcCamDist + 1.5;
        const camZ = hp.z - Math.cos(yawRad) * Math.cos(pitchRad) * O.pcCamDist;

        const camTf = getTransform(O.pcCamGO);
        camTf.method("set_position").invoke([camX, camY, camZ]);

        // Look at player head
        try {
            camTf.method("LookAt",1).invoke([hp.x, hp.y + 1.0, hp.z]);
        } catch(_) {
            // Manual rotation fallback
            const rot = QuaternionClass.method("Euler",3).invoke(-O.pcPitch, O.pcYaw, 0);
            camTf.method("set_rotation").invoke(rot);
        }

        // ---- WASD Movement ----
        let moveX = 0, moveZ = 0, moveY = 0;
        if (getKey(KC_W)) moveZ += 1;
        if (getKey(KC_S)) moveZ -= 1;
        if (getKey(KC_A)) moveX -= 1;
        if (getKey(KC_D)) moveX += 1;
        if (getKey(KC_SPACE)) moveY += 1;
        if (getKey(KC_LSHIFT)) moveY -= 1;

        if (moveX !== 0 || moveZ !== 0 || moveY !== 0) {
            const speed = 8 * dt;

            // Forward/right relative to camera yaw
            const fwdX = Math.sin(yawRad);
            const fwdZ = Math.cos(yawRad);
            const rightX = Math.cos(yawRad);
            const rightZ = -Math.sin(yawRad);

            const dx = (fwdX * moveZ + rightX * moveX) * speed;
            const dz = (fwdZ * moveZ + rightZ * moveX) * speed;
            const dy = moveY * speed;

            // Move the player
            try {
                const curPos = playerTf.method("get_position").invoke();
                playerTf.method("set_position").invoke(
                    Vector3Class.method("op_Addition", 2).invoke(curPos, [dx, dy, dz])
                );
            } catch(_){}

            // Kill velocity so player doesn't drift
            try {
                const rb = getComponent(gl, RigidbodyClass);
                try { rb.method("set_linearVelocity").invoke([0,0,0]); } catch(_){
                    try { rb.method("set_velocity").invoke([0,0,0]); } catch(_2){}
                }
            } catch(_){}
        }

        // ---- Escape to exit PC mode ----
        if (getKeyDown(KC_ESC)) {
            O.pcModeOn = false;
            togglePCMode(false);
        }
    }

    // ================================================================
    //  VR MENU BUILD
    // ================================================================
    function initMenu() {
        if(O.menuInited||O.buildFailed) return;
        try {
            const head=headTf();
            if(!head){if(O.tick-O.headWaitTick>=300){O.headWaitTick=O.tick;log("waiting for head...");}return;}
            let font=null;
            try{const fonts=ResourcesClass.method("FindObjectsOfTypeAll",1).invoke(FontClass.type);for(let i=0;i<fonts.length;i++){try{if(fonts.get(i).method("get_name").invoke().toString()==="Utopium"){font=fonts.get(i);break;}}catch(_){}}}catch(_){}
            if(!font)try{font=ResourcesClass.method("GetBuiltinResource",2).invoke(FontClass.type.object,Il2Cpp.string("Arial.ttf"));}catch(_){}
            log("building VR menu...");
            const mGO=GameObjectClass.method("CreatePrimitive").invoke(3);
            mGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
            try{getComponent(mGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
            try{getComponent(mGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
            getTransform(mGO).method("SetParent",2).invoke(head,false);
            getTransform(mGO).method("set_localPosition").invoke([-0.15,0,0.45]);
            getTransform(mGO).method("set_localRotation").invoke([0,0,0,1]);
            getTransform(mGO).method("set_localScale").invoke([1e-3,1e-3,1e-3]);
            const cv=addComponent(mGO,CanvasClass);cv.method("set_renderMode").invoke(2);
            const tGO=GameObjectClass.method("CreatePrimitive").invoke(3);
            tGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try{getComponent(tGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
            try{getComponent(tGO,ColliderClass).method("set_enabled").invoke(false);}catch(_){}
            getTransform(tGO).method("SetParent",2).invoke(getTransform(mGO),false);
            const mt=addComponent(tGO,TextClass);
            if(font)mt.method("set_font").invoke(font);
            mt.method("set_supportRichText").invoke(true);mt.method("set_fontSize").invoke(14);mt.method("set_alignment").invoke(0);mt.method("set_resizeTextForBestFit").invoke(false);mt.method("set_fontStyle").invoke(1);
            try{const rt=getComponent(tGO,RectTransformClass);rt.method("set_anchorMin").invoke([0,1]);rt.method("set_anchorMax").invoke([0,1]);rt.method("set_pivot").invoke([0,1]);rt.method("set_anchoredPosition").invoke([0,0]);rt.method("set_sizeDelta").invoke([400,800]);}catch(_){}
            ObjectClass.method("DontDestroyOnLoad").invoke(mGO);
            O.menuGO=mGO;O.menuText=mt;O.menuInited=true;
            // Init screen overlay too
            initScreenOverlay();
            log("MENU BUILT + screen overlay");
            setText(renderVRText());
        } catch(e){O.buildFailed=true;log("BUILD FAILED: "+(e.stack||e.message||e));}
    }
    function setText(s) {
        if(!O.menuText||s===O.lastText)return;O.lastText=s;
        try{O.menuText.method("set_text").invoke(Il2Cpp.string(s));}catch(e){log("setText: "+e);O.menuGO=null;O.menuText=null;O.menuInited=false;}
    }

    // ================================================================
    //  TICK
    // ================================================================
    function onTick() {
        O.tick++;
        try{const t=TimeClass.method("get_time").invoke();O.deltaTime=t-O.lastTime;O.lastTime=t;if(O.deltaTime>0.1)O.deltaTime=0.016;}catch(_){O.deltaTime=0.016;}
        if(!O.menuInited&&!O.buildFailed)initMenu();
        if(O.menuInited){
            processVRInput(); tickFly(); tickPlatforms(); tickOrbitAll(); tickItemOrbit(); tickGun();
            tickScreenInput(); tickPCMode();
            if(O.noRedWatchOn&&O.tick%60===0)toggleNoRedWatch(true);
            setText(renderVRText());
        }
        if(O.tick-O.lastLog>=300){O.lastLog=O.tick;log("t="+O.tick+" fly="+O.flyOn+" plat="+O.platformsOn+" gun="+O.itemGunOn+" pc="+O.pcModeOn+" scrMenu="+O.screenMenuOpen);}
    }

    // ================================================================
    //  HOOK
    // ================================================================
    if(!O.hookInstalled){
        const tgt=GorillaLocomotionClass.tryMethod("OnUpdate")||GorillaLocomotionClass.tryMethod("FixedUpdate");
        if(!tgt)log("ERROR: no update method");
        else{Interceptor.attach(tgt.virtualAddress,{onEnter(){try{onTick();}catch(_){}}});O.hookInstalled=true;log("hook on GorillaLocomotion."+tgt.name);}
    }
    log("===== Orbit Menu V6.9 READY =====");
});
}, 5000);
