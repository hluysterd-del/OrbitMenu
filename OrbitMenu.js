// ====================================================================
//  Orbit Menu V7.1 — Animal Company
//  Fixes: All guns (proper raycast + collider targeting), soundboard,
//         snowball launcher, anti-modder, RPC bypass
// ====================================================================

console.log("[Orbit] Script loaded, waiting 5s for game...");
setTimeout(() => {
console.log("[Orbit] Timer fired, calling Il2Cpp.perform...");
Il2Cpp.perform(() => {
    console.log("[Orbit] ===== Orbit Menu V7.1 LOADING =====");

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
    let audioModImage = null;
    try { audioModImage = Il2Cpp.domain.assembly("UnityEngine.AudioModule").image; } catch(_){}
    let webReqMultiImage = null;
    try { webReqMultiImage = Il2Cpp.domain.assembly("UnityEngine.UnityWebRequestAudioModule").image; } catch(_){}
    if (!webReqMultiImage) try { webReqMultiImage = Il2Cpp.domain.assembly("UnityEngine.UnityWebRequestMultimediaModule").image; } catch(_){}
    if (!webReqMultiImage) try { webReqMultiImage = Il2Cpp.domain.assembly("UnityEngine.UnityWebRequestModule").image; } catch(_){}
    let mscorlibImage = null;
    try { mscorlibImage = Il2Cpp.domain.assembly("mscorlib").image; } catch(_){}
    let photonVoiceImage = null;
    try { photonVoiceImage = Il2Cpp.domain.assembly("PhotonVoice").image; } catch(_){}
    if (!photonVoiceImage) try { photonVoiceImage = Il2Cpp.domain.assembly("PhotonVoice.API").image; } catch(_){}

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
    const CanvasClass     = uiModImage.class("UnityEngine.Canvas");
    const TextClass       = uiImage.class("UnityEngine.UI.Text");
    const FontClass       = textImage.class("UnityEngine.Font");
    const RectTransformClass = coreImage.class("UnityEngine.RectTransform");
    const ColliderClass   = physImage.class("UnityEngine.Collider");
    const RigidbodyClass  = physImage.class("UnityEngine.Rigidbody");
    const PhysicsClass    = physImage.class("UnityEngine.Physics");
    let BoxColliderClass  = null;
    try { BoxColliderClass = physImage.class("UnityEngine.BoxCollider"); } catch(_){}
    let LineRendererClass = null;
    try { LineRendererClass = coreImage.class("UnityEngine.LineRenderer"); } catch(_){}
    let AudioSourceClass = null;
    if (audioModImage) try { AudioSourceClass = audioModImage.class("UnityEngine.AudioSource"); } catch(_){}
    if (!AudioSourceClass) try { AudioSourceClass = coreImage.class("UnityEngine.AudioSource"); } catch(_){}
    let ApplicationClass = null;
    try { ApplicationClass = coreImage.class("UnityEngine.Application"); } catch(_){}

    // ---- AC Classes ----
    let PlayerControllerClass, GorillaLocomotionClass, XRInputManagerClass, NetPlayerClass;
    try { PlayerControllerClass  = acImage.class("AnimalCompany.PlayerController"); } catch(e){ console.log("[Orbit] ✗ PlayerController: "+e); throw e; }
    try { GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion"); } catch(e){ console.log("[Orbit] ✗ GorillaLocomotion: "+e); throw e; }
    try { XRInputManagerClass    = acImage.class("AnimalCompany.XRInputManager"); } catch(e){ console.log("[Orbit] ✗ XRInputManager: "+e); throw e; }
    try { NetPlayerClass         = acImage.class("AnimalCompany.NetPlayer"); } catch(e){ console.log("[Orbit] ✗ NetPlayer: "+e); throw e; }
    console.log("[Orbit] ✓ All AC classes loaded");
    let PrefabGenClass = null;
    try { PrefabGenClass = acImage.class("AnimalCompany.PrefabGenerator"); } catch(_){}
    let NetSessionRPCsClass = null;
    try { NetSessionRPCsClass = acImage.class("AnimalCompany.NetSessionRPCs"); } catch(_){}
    let GBOClass = null;
    try { GBOClass = acImage.class("AnimalCompany.GameplayBaseObject"); } catch(_){}
    let NetworkObjectClass = null;
    if (fusionImage) try { NetworkObjectClass = fusionImage.class("Fusion.NetworkObject"); } catch(_){}

    // ---- Photon Voice (for mic passthrough) ----
    let RecorderClass = null;
    if (photonVoiceImage) try { RecorderClass = photonVoiceImage.class("Photon.Voice.Unity.Recorder"); } catch(_){}

    // ---- IO Classes ----
    let DirectoryClass = null, PathClass = null;
    if (mscorlibImage) {
        try { DirectoryClass = mscorlibImage.class("System.IO.Directory"); } catch(_){}
        try { PathClass = mscorlibImage.class("System.IO.Path"); } catch(_){}
    }

    // ---- Shaders ----
    let TextShader = null;
    try { TextShader = ShaderClass.method("Find").invoke(Il2Cpp.string("GUI/Text Shader")); } catch(_){}
    if (!TextShader) try { TextShader = ShaderClass.method("Find").invoke(Il2Cpp.string("UI/Default")); } catch(_){}

    // ================================================================
    //  ITEM / PREFAB / MOB / TP LISTS
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
    const NAME_PRESETS = [
        {l:"Orbit On Top", v:"<color=#bb88ff><size=40>Orbit Menu On Top</size></color>"},
        {l:"Giant Emojis", v:"<size=300>\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}</size>"},
        {l:"Rainbow Text", v:"<color=red>O</color><color=orange>R</color><color=yellow>B</color><color=green>I</color><color=cyan>T</color><color=blue> </color><color=magenta>M</color><color=red>E</color><color=orange>N</color><color=yellow>U</color>"},
        {l:"Invisible Name", v:"<color=#00000000>.</color>"},
        {l:"Huge Purple", v:"<size=200><color=#bb88ff>ORBIT</color></size>"},
        {l:"Tiny Spam", v:"<size=5>orbitorbitorbitorbitorbitorbitorbitorbitorbitorbitorbitorbitorbit</size>"},
        {l:"Reset Name", v:"RESET"},
    ];
    const SNOWBALL_ITEMS = [
        "item_snowball","item_egg","item_disc","item_grenade","item_flashbang",
        "item_dynamite","item_broccoli_grenade","item_cluster_grenade",
    ];

    // ================================================================
    //  STATE
    // ================================================================
    globalThis.orbit = globalThis.orbit || {};
    const O = globalThis.orbit;
    const hadHook = O.hookInstalled;
    Object.assign(O, {
        tick: O.tick || 0, hookInstalled: hadHook || false,
        menuInited: false, menuGO: null, menuText: null, buildFailed: false,
        cursor: 0, tab: "main", page: 0,
        joyCd: 0, selWas: false,
        // Features
        flyOn: O.flyOn||false, platformsOn: O.platformsOn||false, orbitAllOn: O.orbitAllOn||false,
        itemGunOn: O.itemGunOn||false, tpGunOn: O.tpGunOn||false, kickGunOn: O.kickGunOn||false,
        snowballOn: O.snowballOn||false,
        invincibleOn: O.invincibleOn||false, invisibleOn: O.invisibleOn||false,
        noRedWatchOn: O.noRedWatchOn||false, longArmsOn: O.longArmsOn||false,
        shieldOn: O.shieldOn||false,
        antiModderOn: O.antiModderOn||false,
        // Fly
        savedGravity: null,
        // Platforms
        platL: null, platR: null, platLLatched: false, platRLatched: false,
        // Gun (shared beam)
        gunLine: null, gunPointer: null, gunCd: 0,
        // Snowball
        snowballIdx: O.snowballIdx||0, snowballCd: 0,
        // Orbit
        orbitAngle: 0,
        itemOrbitOn: O.itemOrbitOn||false, itemOrbitObjs: O.itemOrbitObjs||[], itemOrbitAngle: 0,
        // Prefab orbit
        prefabOrbitOn: O.prefabOrbitOn||false, prefabOrbitIdx: O.prefabOrbitIdx||0,
        prefabOrbitRate: O.prefabOrbitRate||60, prefabOrbitObjs: O.prefabOrbitObjs||[],
        prefabOrbitAngle: 0, prefabOrbitCd: 0,
        // Mob spawner
        mobSpawnIdx: O.mobSpawnIdx||0, mobSpawnDelay: 0,
        // Soundboard
        soundsPath: null, soundFiles: [], soundIdx: 0,
        soundSource: null, soundReq: null, soundReqKind: "", soundPending: "",
        soundUseMic: false, photonRecorder: null,
        // Name
        savedName: null,
        // Self RPC bypass
        selfBypass: false,
        // Anti-modder
        playerPositions: O.playerPositions||{}, detectedModders: O.detectedModders||{},
        // Misc
        actionMsg: "", actionTick: 0,
        lastLog: 0, lastText: "", headWaitTick: 0,
        deltaTime: 0, lastTime: 0,
    });

    function log(m) { console.log("[Orbit] " + m); }
    function flash(msg) { O.actionMsg=msg; O.actionTick=O.tick; _cacheDirty=true; log(msg); }

    // ================================================================
    //  HELPERS
    // ================================================================
    function getTransform(obj) { return obj.method("get_transform").invoke(); }
    function getComponent(obj, cls) { return obj.method("GetComponent",1).inflate(cls).invoke(); }
    function addComponent(obj, cls) { return obj.method("AddComponent",1).inflate(cls).invoke(); }
    function getComponentInParent(obj, cls) {
        try { return obj.method("GetComponentInParent",0).inflate(cls).invoke(); } catch(_){}
        return null;
    }
    function destroySafe(obj) { if(obj) try{ObjectClass.method("Destroy",1).invoke(obj);}catch(_){} }
    function Destroy(obj) { destroySafe(obj); }
    function playerIsLocal(np) {
        try { return np.method("get_IsMine").invoke(); } catch(_){}
        return false;
    }
    function getGameObjectSafe(obj) {
        try { const go = obj.method("get_gameObject").invoke(); if (go && !go.handle.isNull()) return go; } catch(_){}
        return null;
    }

    // ---- Network Authority (RPC Bypass) ----
    function getNetworkObjectSafe(target) {
        if (!target || target.handle.isNull()) return null;
        try { if (target.class && target.class.name === "NetworkObject") return target; } catch(_){}
        const getters = [
            () => target.method("get_Object").invoke(),
            () => target.method("get_NetworkObject").invoke(),
            () => target.method("get_networkObject").invoke(),
        ];
        if (NetworkObjectClass) {
            getters.push(() => target.method("GetComponent",1).inflate(NetworkObjectClass).invoke());
        }
        for (const getter of getters) {
            try { const obj = getter(); if (obj && !obj.handle.isNull()) return obj; } catch(_){}
        }
        return null;
    }
    function requestStateAuthoritySafe(target) {
        if (!target || target.handle.isNull()) return;
        try {
            const netObj = getNetworkObjectSafe(target);
            if (netObj && !netObj.handle.isNull()) {
                netObj.method("RequestStateAuthority").invoke();
            }
        } catch(_){}
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
    function readBool(v) {
        if (v===true) return true; if (v===false||v===null||v===undefined) return false;
        try { const u=v.unbox(); if(typeof u==="boolean") return u; if(typeof u==="number") return u!==0; } catch(_){}
        return false;
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
    function localPlayer() {
        try { return NetPlayerClass.method("get_localPlayer").invoke(); } catch(_){} return null;
    }
    function getOtherPlayers() {
        const others = [];
        try {
            const lp = localPlayer(); const localH = lp ? lp.handle.toString() : "";
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
    //  RPC SHIELD (Anti-Kick + Anti-Mod Protection)
    // ================================================================
    function installShield() {
        if (O.shieldInstalled) return;
        try {
            const hostileRPCs = [
                "RPC_ApplyBuff","RPC_AddForce","RPC_Teleport","RPC_TagAsStinky",
                "RPC_KickPlayer","KickPlayer","RPC_PlayerStun","RPC_SetColorHSV",
                "RPC_ShakeScreen","RPC_SetRadioActive","RPC_SetJellyEffect",
                "RPC_DoPlayerDie","RPC_AttachToGiantHand","RPC_AttachTo",
                "RPC_AttachToAttachable","RPC_SetMuffledVoiceEnabled",
                "RPC_SetSqueakyVoiceEnabled","RPC_AwardKill","RPC_PlayerHit"
            ];
            let hooked = 0;
            hostileRPCs.forEach(rpcName => {
                try {
                    const methods = [];
                    try { methods.push(...NetPlayerClass.method(rpcName).overloads()); } catch(_){
                        try { methods.push(NetPlayerClass.method(rpcName)); } catch(_2){}
                    }
                    methods.forEach(m => {
                        if (!m) return;
                        const orig = m;
                        m.implementation = function (...args) {
                            try {
                                if (this.method("get_IsMine").invoke() && !O.selfBypass) {
                                    log("[SHIELD] Blocked: " + rpcName);
                                    return;
                                }
                            } catch(_){}
                            return orig.invoke(...args);
                        };
                        hooked++;
                    });
                } catch(_){}
            });
            O.shieldInstalled = true;
            log("[SHIELD] Installed — blocked " + hooked + " hostile RPCs");
            flash("SHIELD ON — " + hooked + " RPCs blocked");
        } catch(e) { log("[SHIELD] Error: " + e); }
    }

    // ================================================================
    //  KICK PLAYER (with RPC bypass)
    // ================================================================
    function kickPlayer(player) {
        if (!NetSessionRPCsClass) { flash("no NetSessionRPCs"); return; }
        try {
            const netInst = NetSessionRPCsClass.field("_instance").value;
            if (!netInst || netInst.handle.isNull()) { flash("no session inst"); return; }
            // Request authority to bypass target's anti-RPC
            requestStateAuthoritySafe(player);
            const playerRef = player.method("get_Object").invoke().method("get_InputAuthority").invoke();
            O.selfBypass = true;
            try { netInst.method("RPC_KickPlayer").invoke(playerRef); } catch(_){}
            try {
                const refInt = playerRef.field("_val").value;
                NetSessionRPCsClass.method("KickPlayer").invoke(refInt);
            } catch(_){}
            O.selfBypass = false;
            flash("Kicked player");
        } catch(e) { O.selfBypass = false; log("kick: "+e); flash("kick failed"); }
    }

    // ================================================================
    //  OP ACTIONS (all with RPC bypass)
    // ================================================================
    function withBypass(fn) { O.selfBypass=true; try{fn();}finally{O.selfBypass=false;} }

    function actOnPlayer(np, rpcName, args) {
        requestStateAuthoritySafe(np);
        const overloads = [1, 0, 2, 3, 4];
        for (const pc of overloads) {
            try { np.method(rpcName, pc).invoke(...args); return true; } catch(_){}
        }
        try { np.method(rpcName).invoke(...args); return true; } catch(_){}
        return false;
    }

    function actTpAll() { const p=readPos(headTf()); if(!p){flash("no head");return;} let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);actOnPlayer(np,"RPC_Teleport",[[p.x,p.y,p.z]]);});}); flash("TP'd "+n); }
    function actYeetAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);actOnPlayer(np,"RPC_AddForce",[[0,80,0]]);});}); flash("Yeeted "+n); }
    function actStinkAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);try{np.method("RPC_TagAsStinky",0).invoke();}catch(_){try{np.method("RPC_TagAsStinky").invoke();}catch(_2){}}});}); flash("Stinked "+n); }
    function actColorAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);const h=Math.random()*360;try{np.method("RPC_SetColorHSV",4).invoke(h,1,1,1);}catch(_){try{np.method("RPC_SetColorHSV").invoke(h,1,1,1);}catch(_2){}}});}); flash("Colored "+n); }
    function actFlingAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);actOnPlayer(np,"RPC_AddForce",[[0,120,0]]);});}); flash("Flung "+n); }
    function actVoidAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);actOnPlayer(np,"RPC_Teleport",[[0,-500,0]]);});}); flash("Voided "+n); }
    function actMoneyAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);try{np.method("RPC_AddPlayerMoney",1).invoke(99999);}catch(_){}})}); flash("$99999 to "+n); }
    function actStunAll() { let n=0; withBypass(()=>{n=forEachOtherPlayer(np=>{requestStateAuthoritySafe(np);try{np.method("RPC_Stun",1).invoke(30.0);}catch(_){}})}); flash("Stunned "+n); }
    function actKickAll() { withBypass(()=>{let n=forEachOtherPlayer(np=>{kickPlayer(np);}); flash("Kicked "+n);}); }

    function toggleInvincible(on) {
        try { const lp=localPlayer(), pc=playerInst();
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
    function toggleNoRedWatch(on) { try{localPlayer().method("set_isWanted").invoke(false);}catch(_){} flash(on?"No Red Watch":"cleared"); }
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
    function createPlatCube() {
        const obj=GameObjectClass.method("CreatePrimitive").invoke(3);
        obj.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
        getTransform(obj).method("set_localScale").invoke([0.4,0.05,0.4]);
        try{const r=getComponent(obj,RendererClass),m=r.method("get_material").invoke();if(TextShader)m.method("set_shader").invoke(TextShader);m.method("set_color").invoke([0.6,0.2,0.8,1]);}catch(_){}
        return obj;
    }
    function tickPlatforms() {
        if(!O.platformsOn) return;
        if(grip(1)){if(!O.platRLatched||!O.platR){if(O.platR)destroySafe(O.platR);O.platR=createPlatCube();O.platRLatched=true;const h=handTf(1);if(h){const t=getTransform(O.platR);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
        else if(O.platR){destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
        if(grip(0)){if(!O.platLLatched||!O.platL){if(O.platL)destroySafe(O.platL);O.platL=createPlatCube();O.platLLatched=true;const h=handTf(0);if(h){const t=getTransform(O.platL);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
        else if(O.platL){destroySafe(O.platL);O.platL=null;O.platLLatched=false;}
    }

    // ================================================================
    //  GUN BEAM — proper raycast from right hand with collider detection
    // ================================================================
    function renderGun() {
        const rH = handTf(1); if (!rH) return null;
        const startPos = rH.method("get_position").invoke();
        const direction = rH.method("get_forward").invoke();
        const gunMaxDistance = 384.0;
        const layerMask = -2063;

        // Offset ray start slightly forward
        let rayStart;
        try {
            rayStart = Vector3Class.method("op_Addition",2).invoke(startPos,
                Vector3Class.method("op_Multiply",2).invoke(direction, 0.03));
        } catch(_) { rayStart = startPos; }

        // Raycast to find where beam hits
        let bestRay = null, bestDist = Infinity;
        try {
            const hits = PhysicsClass.method("RaycastAll",4).invoke(rayStart, direction, gunMaxDistance, layerMask);
            if (hits && hits.length) {
                for (let i = 0; i < hits.length; i++) {
                    const hit = hits.get(i);
                    try {
                        // Skip local player colliders
                        const hitCollider = hit.method("get_collider").invoke();
                        if (hitCollider && !hitCollider.handle.isNull()) {
                            try {
                                const hitPlayer = getComponentInParent(hitCollider, NetPlayerClass);
                                if (hitPlayer && !hitPlayer.handle.isNull() && playerIsLocal(hitPlayer)) continue;
                            } catch(_){}
                        }
                        const point = hit.method("get_point").invoke();
                        const dist = Vector3Class.method("Distance",2).invoke(point, startPos);
                        if (dist < bestDist) { bestDist = dist; bestRay = hit; }
                    } catch(_){}
                }
            }
        } catch(e) { if(O.tick%300===0) log("raycast: "+e); }

        let endPos;
        if (bestRay) {
            endPos = bestRay.method("get_point").invoke();
        } else {
            try { endPos = Vector3Class.method("op_Addition",2).invoke(startPos, Vector3Class.method("op_Multiply",2).invoke(direction, gunMaxDistance)); } catch(_){ return null; }
        }

        // Check zero vector
        try {
            if (Vector3Class.method("op_Equality",2).invoke(endPos, [0,0,0])) {
                endPos = Vector3Class.method("op_Addition",2).invoke(startPos, Vector3Class.method("op_Multiply",2).invoke(direction, gunMaxDistance));
            }
        } catch(_){}

        // Create/update pointer sphere
        if (!O.gunPointer || O.gunPointer.handle.isNull()) {
            try {
                O.gunPointer = GameObjectClass.method("CreatePrimitive").invoke(0);
                O.gunPointer.method("set_name").invoke(Il2Cpp.string("[OGunPtr]"));
                getTransform(O.gunPointer).method("set_localScale").invoke([0.1,0.1,0.1]);
                try{const c=getComponent(O.gunPointer,ColliderClass);if(c)Destroy(c);}catch(_){}
                ObjectClass.method("DontDestroyOnLoad").invoke(O.gunPointer);
            } catch(e){log("gunPtr: "+e);}
        }
        if (O.gunPointer) {
            O.gunPointer.method("SetActive").invoke(true);
            getTransform(O.gunPointer).method("set_position").invoke(endPos);
            try { const r=getComponent(O.gunPointer,RendererClass),m=r.method("get_material").invoke();
                if(TextShader)m.method("set_shader").invoke(TextShader);
                const col = trigger(1) ? [1,0.2,0.2,1] : [0.7,0,1,0.9];
                m.method("set_color").invoke(col);
            } catch(_){}
        }

        // Create/update line renderer
        if (!O.gunLine || O.gunLine.handle.isNull()) {
            if (LineRendererClass) {
                try {
                    const lo = GameObjectClass.method("CreatePrimitive").invoke(0);
                    lo.method("set_name").invoke(Il2Cpp.string("[OGunLine]"));
                    try{getComponent(lo,RendererClass).method("set_enabled").invoke(false);}catch(_){}
                    try{const c=getComponent(lo,ColliderClass);if(c)Destroy(c);}catch(_){}
                    O.gunLine = addComponent(lo, LineRendererClass);
                    ObjectClass.method("DontDestroyOnLoad").invoke(lo);
                } catch(e){log("gunLine: "+e);}
            }
        }
        if (O.gunLine) {
            try {
                O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(true);
                const lm = O.gunLine.method("get_material").invoke();
                if (TextShader) lm.method("set_shader").invoke(TextShader);
                const gunColor = [0.5, 0, 0.8, 0.75];
                O.gunLine.method("set_startColor").invoke(gunColor);
                O.gunLine.method("set_endColor").invoke(gunColor);
                O.gunLine.method("set_startWidth").invoke(0.025);
                O.gunLine.method("set_endWidth").invoke(0.025);
                O.gunLine.method("set_useWorldSpace").invoke(true);

                // Electric effect when trigger held
                if (trigger(1)) {
                    const Step = 10;
                    O.gunLine.method("set_positionCount").invoke(Step);
                    O.gunLine.method("SetPosition").invoke(0, startPos);
                    for (let s = 1; s < Step - 1; s++) {
                        const t = s / (Step - 1);
                        const pos = Vector3Class.method("Lerp",3).invoke(startPos, endPos, t);
                        if (Math.random() > 0.75) {
                            const offset = [(Math.random()*0.2)-0.1,(Math.random()*0.2)-0.1,(Math.random()*0.2)-0.1];
                            const jittered = Vector3Class.method("op_Addition",2).invoke(pos, offset);
                            O.gunLine.method("SetPosition").invoke(s, jittered);
                        } else {
                            O.gunLine.method("SetPosition").invoke(s, pos);
                        }
                    }
                    O.gunLine.method("SetPosition").invoke(Step - 1, endPos);
                } else {
                    O.gunLine.method("set_positionCount").invoke(2);
                    O.gunLine.method("SetPosition").invoke(0, startPos);
                    O.gunLine.method("SetPosition").invoke(1, endPos);
                }
            } catch(_){}
        }
        return { ray: bestRay, endPos };
    }

    function hideGun() {
        if(O.gunPointer)try{O.gunPointer.method("SetActive").invoke(false);}catch(_){}
        if(O.gunLine)try{O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(false);}catch(_){}
    }

    // ---- Get target player from raycast hit (proper collider-based detection) ----
    function getGunTargetPlayer(ray) {
        if (!ray) return null;
        // Method 1: GetComponentInParent from the hit collider
        try {
            const collider = ray.method("get_collider").invoke();
            if (collider && !collider.handle.isNull()) {
                const target = getComponentInParent(collider, NetPlayerClass);
                if (target && !target.handle.isNull() && !playerIsLocal(target)) return target;
                // Try from the collider's gameObject
                const go = getGameObjectSafe(collider);
                if (go) {
                    const target2 = getComponentInParent(go, NetPlayerClass);
                    if (target2 && !target2.handle.isNull() && !playerIsLocal(target2)) return target2;
                }
            }
        } catch(_){}

        // Method 2: Nearest player to hit point (fallback)
        try {
            const hitPoint = ray.method("get_point").invoke();
            const allPlayers = ObjectClass.method("FindObjectsByType",1).inflate(NetPlayerClass).invoke(0);
            let closest = null, closestDist = 1.75;
            for (let i = 0; i < allPlayers.length; i++) {
                const p = allPlayers.get(i);
                if (!p || p.handle.isNull()) continue;
                if (playerIsLocal(p)) continue;
                try {
                    const go = getGameObjectSafe(p);
                    if (!go) continue;
                    const pos = getTransform(go).method("get_position").invoke();
                    const d = Vector3Class.method("Distance",2).invoke(hitPoint, pos);
                    if (d < closestDist) { closestDist = d; closest = p; }
                } catch(_){}
            }
            return closest;
        } catch(_){}
        return null;
    }

    // ---- Item Gun ----
    function tickItemGun() {
        if(!O.itemGunOn) return;
        if(!grip(1)){hideGun();return;}
        const g=renderGun(); if(!g) return;
        if(O.gunCd>0){O.gunCd--;return;}
        if(!trigger(1)) return;
        O.gunCd=25;
        // Spawn at hit point
        try {
            const hitPoint = g.ray ? g.ray.method("get_point").invoke() : g.endPos;
            const id=ALL_ITEMS[Math.floor(Math.random()*ALL_ITEMS.length)];
            spawnItem(id, hitPoint, [0,0,0,1]);
            flash("Shot: "+id.replace("item_",""));
        } catch(e) { log("itemGun: "+e); }
    }

    // ---- TP Gun ----
    function tickTPGun() {
        if(!O.tpGunOn) return;
        if(!grip(1)){hideGun();return;}
        const g=renderGun(); if(!g) return;
        if(!trigger(1)||O.gunCd>0){if(!trigger(1))O.gunCd=0;else O.gunCd--;return;}
        O.gunCd=20;
        try {
            const hitPoint = g.ray ? g.ray.method("get_point").invoke() : g.endPos;
            const pos = readPos(getTransform(O.gunPointer));
            const tp = pos || {x:0,y:0,z:0};
            const gl=gorillaInst();
            getTransform(gl).method("set_position").invoke([tp.x, tp.y+1, tp.z]);
            const rb=getComponent(gl,RigidbodyClass);
            try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}}
        } catch(_){}
        flash("TP'd to beam");
    }

    // ---- Kick Gun ----
    function tickKickGun() {
        if(!O.kickGunOn) return;
        if(!grip(1)){hideGun();return;}
        const g=renderGun(); if(!g) return;
        if(!trigger(1)||O.gunCd>0){if(!trigger(1))O.gunCd=0;else O.gunCd--;return;}
        O.gunCd=30;
        // Get target from ray collider (proper detection)
        const target = getGunTargetPlayer(g.ray);
        if(target){
            withBypass(()=>{
                requestStateAuthoritySafe(target);
                kickPlayer(target);
            });
            flash("KICKED target");
        } else {
            flash("No player at beam");
        }
    }

    // ================================================================
    //  SNOWBALL LAUNCHER — fires items from hand with velocity
    // ================================================================
    function fireSnowball() {
        const rH = handTf(1); if (!rH) return;
        const pos = rH.method("get_position").invoke();
        const fwd = rH.method("get_forward").invoke();
        const itemID = SNOWBALL_ITEMS[O.snowballIdx];
        try {
            const result = PrefabGenClass.method("SpawnItem",4).invoke(
                Il2Cpp.string("item_prefab/" + itemID), pos, [0,0,0,1], ptr(0)
            );
            if (!result || result.handle.isNull()) { flash("Spawn failed"); return; }
            requestStateAuthoritySafe(result);
            // Apply forward velocity
            if (GBOClass) {
                try {
                    const gbo = getComponent(result, GBOClass);
                    if (gbo && !gbo.handle.isNull()) {
                        try { gbo.method("set_scaleModifier").invoke(127); } catch(_){}
                        const velocity = Vector3Class.method("op_Multiply",2).invoke(fwd, 100);
                        gbo.method("AddExternalForceVelocity",1).invoke(velocity);
                    }
                } catch(e){ log("snowball gbo: "+e); }
            }
            flash("Fired: " + itemID.replace("item_",""));
        } catch(e) { log("snowball: "+e); flash("snowball failed"); }
    }
    function tickSnowball() {
        if(!O.snowballOn) return;
        if(!grip(1)) return;
        if(O.snowballCd>0){O.snowballCd--;return;}
        if(!trigger(1)) return;
        O.snowballCd = 15;
        fireSnowball();
    }

    // ================================================================
    //  ANTI-MODDER — detect and abyss teleport other modders
    // ================================================================
    function tickAntiModder() {
        if (!O.antiModderOn) return;
        if (O.tick % 90 !== 0) return; // Check every ~1.5 seconds

        const others = getOtherPlayers();
        const newPositions = {};

        for (const np of others) {
            const h = np.handle.toString();
            try {
                const go = getGameObjectSafe(np);
                if (!go) continue;
                const pos = readPos(getTransform(go));
                if (!pos) continue;

                newPositions[h] = { x: pos.x, y: pos.y, z: pos.z, tick: O.tick };

                const prev = O.playerPositions[h];
                if (prev) {
                    const dx = pos.x - prev.x, dy = pos.y - prev.y, dz = pos.z - prev.z;
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    const tickDiff = O.tick - prev.tick;
                    const speed = dist / Math.max(1, tickDiff);

                    // Teleporting = >2 units/tick AND >50 total distance (rules out normal movement)
                    if (speed > 2 && dist > 50 && !O.detectedModders[h]) {
                        O.detectedModders[h] = true;
                        log("[ANTI-MOD] Modder detected! Speed=" + speed.toFixed(1) + " dist=" + dist.toFixed(0));

                        // Random abyss coordinates
                        const abyssX = 111000 + Math.floor(Math.random() * 999);
                        const abyssY = 111000 + Math.floor(Math.random() * 999);
                        const abyssZ = 111000 + Math.floor(Math.random() * 999);

                        withBypass(() => {
                            requestStateAuthoritySafe(np);
                            actOnPlayer(np, "RPC_Teleport", [[abyssX, abyssY, abyssZ]]);
                        });
                        flash("Modder sent to abyss!");
                    }
                }
            } catch(_){}
        }
        O.playerPositions = newPositions;

        // Re-abyss already detected modders every check
        for (const np of others) {
            const h = np.handle.toString();
            if (O.detectedModders[h]) {
                const abyssX = 111000 + Math.floor(Math.random() * 999);
                const abyssY = 111000 + Math.floor(Math.random() * 999);
                const abyssZ = 111000 + Math.floor(Math.random() * 999);
                withBypass(() => {
                    requestStateAuthoritySafe(np);
                    actOnPlayer(np, "RPC_Teleport", [[abyssX, abyssY, abyssZ]]);
                });
            }
        }
    }

    // ================================================================
    //  ORBIT ALL + ITEM ORBIT + PREFAB ORBIT
    // ================================================================
    function tickOrbitAll() {
        if(!O.orbitAllOn)return;O.orbitAngle+=0.033;if(O.orbitAngle>6.28)O.orbitAngle-=6.28;
        const mp=readPos(headTf());if(!mp)return;const ot=getOtherPlayers();if(!ot.length)return;
        const r=4,st=(2*Math.PI)/ot.length;
        withBypass(()=>{
            for(let i=0;i<ot.length;i++){const a=O.orbitAngle+st*i;
                requestStateAuthoritySafe(ot[i]);
                actOnPlayer(ot[i],"RPC_Teleport",[[mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]]);
            }
        });
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

    // Prefab Orbit
    function tickPrefabOrbit() {
        if(!O.prefabOrbitOn) return;
        O.prefabOrbitAngle+=0.03;if(O.prefabOrbitAngle>6.28)O.prefabOrbitAngle-=6.28;
        const mp=readPos(headTf());if(!mp)return;
        O.prefabOrbitCd--;
        if(O.prefabOrbitCd<=0 && O.prefabOrbitObjs.length<8){
            O.prefabOrbitCd = O.prefabOrbitRate;
            const name = PREFAB_NAMES[O.prefabOrbitIdx];
            const a = (2*Math.PI/8)*O.prefabOrbitObjs.length;
            const obj = spawnNetworkPrefab(name,[mp.x+Math.cos(a)*3,mp.y+0.5,mp.z+Math.sin(a)*3],[0,0,0,1]);
            if(obj&&!obj.handle.isNull()){try{ObjectClass.method("DontDestroyOnLoad").invoke(obj);}catch(_){}O.prefabOrbitObjs.push(obj);}
        }
        const r=3,st=(2*Math.PI)/Math.max(1,O.prefabOrbitObjs.length),alive=[];
        for(let i=0;i<O.prefabOrbitObjs.length;i++){
            const o=O.prefabOrbitObjs[i];
            try{if(!o||o.handle.isNull())continue;
                const a=O.prefabOrbitAngle+st*i;
                getTransform(o).method("set_position").invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);
                alive.push(o);
            }catch(_){}
        }
        O.prefabOrbitObjs=alive;
    }
    function stopPrefabOrbit(){for(const o of O.prefabOrbitObjs)destroySafe(o);O.prefabOrbitObjs=[];O.prefabOrbitOn=false;}

    // ================================================================
    //  MOB SPAWNER (undetected — delayed spawn)
    // ================================================================
    function spawnMobDelayed(mobID) {
        const delay = 60 + Math.floor(Math.random()*120);
        O.mobSpawnDelay = delay;
        O.mobSpawnQueued = mobID;
        flash("Mob queued: " + mobID + " (" + Math.round(delay/60) + "s)");
    }
    function tickMobSpawn() {
        if (!O.mobSpawnQueued) return;
        O.mobSpawnDelay--;
        if (O.mobSpawnDelay <= 0) {
            const id = O.mobSpawnQueued;
            O.mobSpawnQueued = null;
            const p=readPos(headTf()),fwd=readFwd(headTf());
            if(p&&fwd){
                const dist = 8 + Math.random()*7;
                const angle = Math.random()*Math.PI*2;
                const sp = [p.x+Math.cos(angle)*dist, p.y, p.z+Math.sin(angle)*dist];
                const r = spawnMob(id, sp, [0,0,0,1]);
                flash(r ? "Mob spawned: "+id : "Mob failed: "+id);
            }
        }
    }

    // ================================================================
    //  NAME MODS
    // ================================================================
    function setName(nameStr) {
        try {
            const lp = localPlayer();
            if (!lp) { flash("no local player"); return; }
            if (!O.savedName) {
                try { O.savedName = lp.method("get_displayName").invoke().toString(); } catch(_){ O.savedName = "Player"; }
            }
            if (nameStr === "RESET") {
                lp.method("set_displayName").invoke(Il2Cpp.string(O.savedName));
                flash("Name reset");
            } else {
                lp.method("set_displayName").invoke(Il2Cpp.string(nameStr));
                flash("Name changed!");
            }
        } catch(e) { log("name: "+e); flash("name failed"); }
    }

    // ================================================================
    //  SOUNDBOARD (fixed — proper path + URL encoding + mic passthrough)
    // ================================================================
    function ensureSoundsPath() {
        if (O.soundsPath) return O.soundsPath;
        if (!DirectoryClass) { log("[SOUNDS] No Directory class"); return null; }

        const candidates = [];

        // 1. Application.persistentDataPath (most reliable in Unity)
        if (ApplicationClass) {
            try {
                const pData = ApplicationClass.method("get_persistentDataPath").invoke();
                if (pData && !pData.handle.isNull()) {
                    let base = pData.toString().replace(/\\/g, "/");
                    if (!base.endsWith("/")) base += "/";
                    candidates.push(base + "Sounds/");
                    log("[SOUNDS] persistentDataPath: " + base);
                }
            } catch(_){}
        }

        // 2. Script location
        try {
            if (typeof __filename !== "undefined" && __filename) {
                const ls = Math.max(__filename.lastIndexOf('/'), __filename.lastIndexOf('\\'));
                if (ls !== -1) candidates.push(__filename.substring(0, ls + 1) + "Sounds/");
            }
        } catch(_){}

        // 3. Fallback
        candidates.push("C:/OrbitMenu/Sounds/");

        for (const path of candidates) {
            try {
                const pathStr = Il2Cpp.string(path);
                if (!DirectoryClass.method("Exists").invoke(pathStr)) {
                    DirectoryClass.method("CreateDirectory").invoke(pathStr);
                    log("[SOUNDS] Created: " + path);
                }
                O.soundsPath = path;
                log("[SOUNDS] Using: " + path);
                return path;
            } catch(e) { log("[SOUNDS] Path failed: " + path + " — " + e); }
        }
        return null;
    }

    function refreshSoundList() {
        const path = ensureSoundsPath();
        if (!path) { flash("No Sounds folder"); return; }
        try {
            const pathStr = Il2Cpp.string(path);
            if (!DirectoryClass.method("Exists").invoke(pathStr)) {
                DirectoryClass.method("CreateDirectory").invoke(pathStr);
            }
            // Try GetFiles with 1 arg first
            let rawFiles = null;
            try { rawFiles = DirectoryClass.method("GetFiles",1).invoke(pathStr); } catch(_){}
            // Fallback: GetFiles with 2 args for each pattern
            const next = [];
            if (rawFiles && !rawFiles.handle.isNull() && rawFiles.length > 0) {
                for (let i=0;i<rawFiles.length;i++) {
                    try {
                        const fp = rawFiles.get(i).toString();
                        const low = fp.toLowerCase();
                        if (!low.endsWith(".wav")&&!low.endsWith(".ogg")&&!low.endsWith(".mp3")) continue;
                        const si = Math.max(fp.lastIndexOf('/'),fp.lastIndexOf('\\'));
                        next.push(fp.substring(si+1));
                    } catch(_){}
                }
            }
            if (next.length === 0) {
                // Try pattern-based search
                const patterns = ["*.mp3","*.ogg","*.wav"];
                for (const pat of patterns) {
                    try {
                        const files = DirectoryClass.method("GetFiles",2).invoke(pathStr, Il2Cpp.string(pat));
                        if (files && !files.handle.isNull()) {
                            for (let i=0;i<files.length;i++) {
                                try {
                                    const fp = files.get(i).toString();
                                    const si = Math.max(fp.lastIndexOf('/'),fp.lastIndexOf('\\'));
                                    next.push(fp.substring(si+1));
                                } catch(_){}
                            }
                        }
                    } catch(_){}
                }
            }
            next.sort();
            O.soundFiles = next;
            O.soundIdx = 0;
            flash(next.length ? next.length + " sounds loaded" : "No sounds in " + path);
            log("[SOUNDS] Found " + next.length + " files in " + path);
        } catch(e) { log("[SOUNDS] Refresh err: "+e); }
    }

    function prepareSoundboard() {
        try { if(O.soundSource && !O.soundSource.handle.isNull()) return true; } catch(_){}
        if (!AudioSourceClass) { log("[SOUND] No AudioSource class"); return false; }
        try {
            const gl = gorillaInst();
            if (!gl) return false;
            const go = gl.method("get_gameObject").invoke();
            let src = null;
            try { src = getComponent(go, AudioSourceClass); } catch(_){}
            if (!src || src.handle.isNull()) src = addComponent(go, AudioSourceClass);
            if (!src || src.handle.isNull()) return false;
            O.soundSource = src;
            try{src.method("set_playOnAwake").invoke(false);}catch(_){}
            try{src.method("set_loop").invoke(false);}catch(_){}
            try{src.method("set_spatialBlend").invoke(0.0);}catch(_){}
            try{src.method("set_volume").invoke(1.0);}catch(_){}
            log("[SOUND] AudioSource ready");
            return true;
        } catch(e) { log("[SOUND] prep: "+e); return false; }
    }

    function findPhotonRecorder() {
        if (O.photonRecorder && !O.photonRecorder.handle.isNull()) return O.photonRecorder;
        if (!RecorderClass) return null;
        try {
            const recs = ResourcesClass.method("FindObjectsOfTypeAll",1).inflate(RecorderClass).invoke();
            if (recs && recs.length > 0) { O.photonRecorder = recs.get(0); return O.photonRecorder; }
        } catch(_){}
        return null;
    }

    function trySetMember(obj, names, value) {
        for (const name of names) {
            try { obj.method("set_"+name).invoke(value); return true; } catch(_){}
            try { obj.field(name).value = value; return true; } catch(_){}
        }
        return false;
    }

    function playClipThroughRecorder(clip, fileName) {
        try {
            const recorder = findPhotonRecorder();
            if (!recorder || recorder.handle.isNull()) return false;
            let ok = false;
            ok = trySetMember(recorder, ["SourceType","sourceType","InputSourceType"], 1) || ok;
            ok = trySetMember(recorder, ["AudioClip","audioClip","clip"], clip) || ok;
            ok = trySetMember(recorder, ["LoopAudioClip","loopAudioClip"], false) || ok;
            ok = trySetMember(recorder, ["VoiceDetection","voiceDetection"], false) || ok;
            ok = trySetMember(recorder, ["TransmitEnabled","transmitEnabled","RecordingEnabled","recordingEnabled"], true) || ok;
            try { recorder.method("RestartRecording",0).invoke(); ok=true; } catch(_){}
            try { recorder.method("StartRecording",0).invoke(); ok=true; } catch(_){}
            if (!ok) return false;
            // Also play locally
            try {
                O.soundSource.method("set_spatialBlend").invoke(0.0);
                O.soundSource.method("set_clip").invoke(clip);
                O.soundSource.method("set_volume").invoke(1.0);
                if (!O.soundSource.method("get_isPlaying").invoke()) O.soundSource.method("Play").invoke();
            } catch(_){}
            return true;
        } catch(e) { log("[SOUND] Mic route failed: "+e); return false; }
    }

    function getAudioType(name) {
        const l=(name||"").toLowerCase();
        if(l.endsWith(".mp3"))return 13;if(l.endsWith(".ogg"))return 14;return 20;
    }

    function getSoundFileUrl(path, fileName) {
        let fullPath = (path || "") + (fileName || "");
        fullPath = fullPath.replace(/\\/g, "/");
        if (!fullPath.startsWith("/")) fullPath = "/" + fullPath;
        return encodeURI("file://" + fullPath).replace(/#/g, "%23");
    }

    function playSound(fileName, useMic) {
        if (!webReqMultiImage) { flash("No audio module"); return; }
        const path = ensureSoundsPath();
        if (!path||!fileName) return;
        if (!prepareSoundboard()) { flash("AudioSource failed"); return; }

        // Abort previous request
        try {
            if(O.soundReq && !O.soundReq.handle.isNull()){
                try{O.soundReq.method("Abort").invoke();}catch(_){}
                try{O.soundReq.method("Dispose").invoke();}catch(_){}
            }
        }catch(_){}

        try {
            const url = getSoundFileUrl(path, fileName);
            log("[SOUND] Loading: " + url);

            // Try multiple class locations for UnityWebRequestMultimedia
            let UWRMulti = null;
            const classNames = ["UnityEngine.Networking.UnityWebRequestMultimedia"];
            for (const cn of classNames) {
                try { UWRMulti = webReqMultiImage.class(cn); if(UWRMulti) break; } catch(_){}
            }
            if (!UWRMulti) { flash("No UWR Multimedia class"); return; }

            const req = UWRMulti.method("GetAudioClip",2).invoke(Il2Cpp.string(url), getAudioType(fileName));
            req.method("SendWebRequest").invoke();
            O.soundReq = req;
            O.soundReqKind = "uwr";
            O.soundPending = fileName;
            O.soundUseMic = !!useMic;
            try { O.soundSource.method("set_spatialBlend").invoke(useMic ? 1.0 : 0.0); } catch(_){}
            flash("Loading: " + fileName + (useMic ? " (Mic)" : ""));
        } catch(e) { log("[SOUND] play: "+e); flash("Sound error: "+e.message); }
    }

    function tickSoundboard() {
        if (!O.soundReq || O.soundReq.handle.isNull()) return;
        try { if(!O.soundReq.method("get_isDone").invoke()) return; } catch(_){ return; }

        const req = O.soundReq, pending = O.soundPending, useMic = O.soundUseMic;
        O.soundReq = null; O.soundPending = ""; O.soundUseMic = false;

        try {
            let clip = null;

            // Method 1: DownloadHandlerAudioClip.GetContent
            try {
                const classNames = [
                    "UnityEngine.Networking.DownloadHandlerAudioClip",
                ];
                for (const cn of classNames) {
                    try {
                        const DHAClip = webReqMultiImage.class(cn);
                        if (DHAClip) {
                            clip = DHAClip.method("GetContent",1).invoke(req);
                            if (clip && !clip.handle.isNull()) break;
                            clip = null;
                        }
                    } catch(_){}
                }
            } catch(_){}

            // Method 2: handler.get_audioClip
            if (!clip || clip.handle.isNull()) {
                try {
                    const handler = req.method("get_downloadHandler").invoke();
                    if (handler && !handler.handle.isNull()) {
                        try { clip = handler.method("get_audioClip").invoke(); } catch(_){}
                        if (!clip || clip.handle.isNull()) {
                            try { clip = handler.method("GetAudioClip").invoke(); } catch(_){}
                        }
                    }
                } catch(_){}
            }

            if (clip && !clip.handle.isNull() && O.soundSource && !O.soundSource.handle.isNull()) {
                O.soundSource.method("set_clip").invoke(clip);
                O.soundSource.method("Play").invoke();
                const micOk = useMic ? playClipThroughRecorder(clip, pending) : false;
                flash((micOk ? "Playing (mic+headset): " : "Playing: ") + pending);
            } else {
                // Log the error for debugging
                try {
                    const err = req.method("get_error").invoke();
                    if (err && !err.handle.isNull()) log("[SOUND] Request error: " + err.toString());
                } catch(_){}
                flash("Failed to load: " + pending);
            }
        } catch(e) { log("[SOUND] load: "+e); }
        try{req.method("Dispose").invoke();}catch(_){}
    }

    // ================================================================
    //  MENU ITEMS
    // ================================================================
    const PER_PAGE = 6;
    function menuItems() {
        switch(O.tab) {
        case "main": return [
            {l:"Movement",t:"tab",to:"move"},
            {l:"Items / Spawning",t:"tab",to:"spawn"},
            {l:"<color=#ff8800>Gun Mods</color>",t:"tab",to:"gun"},
            {l:"Player Mods",t:"tab",to:"player"},
            {l:"<color=#ff3333>Overpowered</color>",t:"tab",to:"op"},
            {l:"<color=#55ccff>Prefabs</color>",t:"tab",to:"prefabs"},
            {l:"<color=#88ff88>Mobs (stealth)</color>",t:"tab",to:"mobs"},
            {l:"<color=#ffcc00>Name Mods</color>",t:"tab",to:"names"},
            {l:"<color=#ff66ff>Soundboard</color>",t:"tab",to:"sound"},
        ];
        case "move": return [{l:"< Back",t:"back"},
            {l:"Fly (B=forward)",t:"tog",k:"flyOn"},
            {l:"Platforms (grip)",t:"tog",k:"platformsOn"},
            {l:"Long Arms",t:"tog",k:"longArmsOn"},
            ...Object.entries(TELEPORT_LOCS).map(([n,p])=>({l:"TP: "+n,t:"act",fn:()=>{try{withBypass(()=>{localPlayer().method("RPC_Teleport").invoke(p);});flash("TP "+n);}catch(_){flash("tp err");}}}))];
        case "spawn": return buildListPage(ALL_ITEMS,"item",id=>id.replace("item_",""));
        case "gun": return [{l:"< Back",t:"back"},
            {l:"Item Gun (grip+trigger)",t:"tog",k:"itemGunOn"},
            {l:"TP Gun (grip+trigger)",t:"tog",k:"tpGunOn"},
            {l:"Kick Gun (grip+trigger)",t:"tog",k:"kickGunOn"},
            {l:"<color=#44ccff>Snowball Launcher</color>",t:"tog",k:"snowballOn"},
            {l:"Snowball Type: "+SNOWBALL_ITEMS[O.snowballIdx].replace("item_",""),t:"act",fn:()=>{
                O.snowballIdx=(O.snowballIdx+1)%SNOWBALL_ITEMS.length;
                flash("Ammo: "+SNOWBALL_ITEMS[O.snowballIdx].replace("item_",""));
            }},
        ];
        case "player": return [{l:"< Back",t:"back"},
            {l:"Invincible",t:"tog",k:"invincibleOn"},
            {l:"Invisible",t:"tog",k:"invisibleOn"},
            {l:"No Red Watch",t:"tog",k:"noRedWatchOn"},
            {l:"RPC Shield (Anti-Kick)",t:"tog",k:"shieldOn"},
            {l:"<color=#ff4444>Anti-Modder (Abyss TP)</color>",t:"tog",k:"antiModderOn"},
            {l:"Clear Modder List",t:"act",fn:()=>{O.detectedModders={};flash("Modder list cleared");}},
        ];
        case "op": return [{l:"< Back",t:"back"},
            {l:"Orbit All",t:"tog",k:"orbitAllOn"},
            {l:"TP All to Me",t:"act",fn:actTpAll},
            {l:"Yeet All",t:"act",fn:actYeetAll},
            {l:"Stink All",t:"act",fn:actStinkAll},
            {l:"Color All",t:"act",fn:actColorAll},
            {l:"Void All",t:"act",fn:actVoidAll},
            {l:"Money All $99999",t:"act",fn:actMoneyAll},
            {l:"Stun All 30s",t:"act",fn:actStunAll},
            {l:"<color=#ff0000>Kick All</color>",t:"act",fn:actKickAll},
        ];
        case "prefabs": return buildPrefabPage();
        case "mobs": return buildMobPage();
        case "names": return [{l:"< Back",t:"back"},
            ...NAME_PRESETS.map(n=>({l:n.l,t:"act",fn:()=>setName(n.v)}))];
        case "sound": return buildSoundPage();
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
    function buildPrefabPage() {
        const tp=Math.max(1,Math.ceil(PREFAB_NAMES.length/PER_PAGE)),pg=Math.min(O.page,tp-1),s=pg*PER_PAGE,e=Math.min(s+PER_PAGE,PREFAB_NAMES.length);
        const its=[{l:"< Back",t:"back"}];
        its.push({l:"Prefab Orbit: "+(O.prefabOrbitOn?"ON":"OFF")+" ["+PREFAB_NAMES[O.prefabOrbitIdx]+"]",t:"act",fn:()=>{
            if(O.prefabOrbitOn){stopPrefabOrbit();flash("Prefab Orbit OFF");}
            else{O.prefabOrbitOn=true;O.prefabOrbitCd=0;flash("Orbiting: "+PREFAB_NAMES[O.prefabOrbitIdx]);}
        }});
        its.push({l:"Orbit Prefab: "+PREFAB_NAMES[O.prefabOrbitIdx],t:"act",fn:()=>{
            O.prefabOrbitIdx=(O.prefabOrbitIdx+1)%PREFAB_NAMES.length;flash("Selected: "+PREFAB_NAMES[O.prefabOrbitIdx]);
        }});
        for(let i=s;i<e;i++){const id=PREFAB_NAMES[i];its.push({l:id,t:"act",fn:(function(x){return function(){spawnInFront("prefab",x);};})(id)});}
        if(pg>0)its.push({l:"◀ Prev",t:"act",fn:()=>{O.page--;O.cursor=1;}});
        if(e<PREFAB_NAMES.length)its.push({l:"Next ▶",t:"act",fn:()=>{O.page++;O.cursor=1;}});
        return its;
    }
    function buildMobPage() {
        const its=[{l:"< Back",t:"back"}];
        its.push({l:"<color=#88ff88>Stealth mode (delayed spawn)</color>",t:"act",fn:()=>{}});
        for(const id of MOB_IDS){
            its.push({l:id.replace("Controller",""),t:"act",fn:(function(x){return function(){spawnMobDelayed(x);};})(id)});
        }
        return its;
    }
    function buildSoundPage() {
        const its=[{l:"< Back",t:"back"}];
        its.push({l:"Refresh Sounds",t:"act",fn:refreshSoundList});
        its.push({l:"Stop Sound",t:"act",fn:()=>{
            try{if(O.soundSource)O.soundSource.method("Stop").invoke();}catch(_){}
            // Also stop mic
            try{
                const rec=findPhotonRecorder();
                if(rec){trySetMember(rec,["TransmitEnabled","transmitEnabled","RecordingEnabled","recordingEnabled"],false);}
            }catch(_){}
            flash("Stopped");
        }});
        if(O.soundFiles.length===0){
            its.push({l:"(put .wav/.ogg/.mp3 in Sounds folder)",t:"act",fn:()=>{
                const p=ensureSoundsPath();flash("Path: "+(p||"unknown"));
            }});
        } else {
            const tp=Math.max(1,Math.ceil(O.soundFiles.length/PER_PAGE)),pg=Math.min(O.page,tp-1),s=pg*PER_PAGE,e=Math.min(s+PER_PAGE,O.soundFiles.length);
            for(let i=s;i<e;i++){
                const f=O.soundFiles[i];
                its.push({l:"♫ "+f,t:"act",fn:(function(x){return function(){playSound(x, false);};})(f)});
            }
            // Mic passthrough option
            its.push({l:"\u{1F3A4} Play Through Mic",t:"act",fn:()=>{
                if(O.soundFiles.length>0) playSound(O.soundFiles[Math.min(O.soundIdx,O.soundFiles.length-1)], true);
                else flash("No sounds loaded");
            }});
            if(pg>0)its.push({l:"◀ Prev",t:"act",fn:()=>{O.page--;O.cursor=1;}});
            if(e<O.soundFiles.length)its.push({l:"Next ▶",t:"act",fn:()=>{O.page++;O.cursor=1;}});
        }
        return its;
    }

    // ================================================================
    //  MENU ITEM CACHE — only rebuild when something changes
    // ================================================================
    let _cachedItems = null;
    let _cacheTab = "", _cachePage = -1, _cacheDirty = true;
    function invalidateMenu() { _cacheDirty = true; }
    function getCachedItems() {
        if (!_cacheDirty && _cachedItems && _cacheTab === O.tab && _cachePage === O.page) return _cachedItems;
        _cachedItems = menuItems();
        _cacheTab = O.tab; _cachePage = O.page; _cacheDirty = false;
        return _cachedItems;
    }

    // ================================================================
    //  VR TEXT MENU (head-tracked) — throttled rendering
    // ================================================================
    function renderVRText() {
        const its=getCachedItems();
        const L=["<b><color=#bb88ff>Orbit Menu V7.1"+tabTitle()+"</color></b>",""];
        for(let i=0;i<its.length;i++){const it=its[i];const c=(i===O.cursor)?"<color=#ffcc00>▶</color> ":"   ";let t=it.l;
            if(it.t==="tog") t+=O[it.k]?" <color=#00ff00>[ON]</color>":" <color=#ff4444>[OFF]</color>";
            else if(it.t==="tab") t+=" ▸";
            L.push(c+t);}
        L.push("");
        if(O.actionMsg&&(O.tick-O.actionTick)<180) L.push("<color=#00ffaa>"+O.actionMsg+"</color>");
        if(O.flyOn) L.push("<color=#88ccff>✈ Fly ON</color>");
        if(O.shieldOn) L.push("<color=#44ff44>⛨ Shield ON</color>");
        if(O.antiModderOn) L.push("<color=#ff4444>⚠ Anti-Modder ON ("+Object.keys(O.detectedModders).length+" caught)</color>");
        L.push("<size=9><color=#666>R-Stick=nav  B/Trigger=sel</color></size>");
        return L.join("\n");
    }
    function tabTitle() {
        const m={"move":" > Move","spawn":" > Items","gun":" > <color=#ff8800>Guns</color>","player":" > Player","op":" > <color=#ff3333>OP</color>","prefabs":" > <color=#55ccff>Prefabs</color>","mobs":" > <color=#88ff88>Mobs</color>","names":" > <color=#ffcc00>Names</color>","sound":" > <color=#ff66ff>Sound</color>"};
        return m[O.tab]||"";
    }

    // ================================================================
    //  VR INPUT
    // ================================================================
    function processVRInput() {
        const y=joyY(1),its=getCachedItems();
        if(O.joyCd>0)O.joyCd--;
        else{if(y<-0.55&&O.cursor<its.length-1){O.cursor++;O.joyCd=18;}else if(y>0.55&&O.cursor>0){O.cursor--;O.joyCd=18;}}
        const selNow=bBtn(1)||trigger(1),press=selNow&&!O.selWas;O.selWas=selNow;
        if(press&&O.cursor<its.length) activateItem(its[O.cursor]);
    }
    function activateItem(it) {
        if(it.t==="tab"){O.tab=it.to;O.cursor=0;O.page=0;invalidateMenu();}
        else if(it.t==="back"){O.tab="main";O.cursor=0;O.page=0;invalidateMenu();}
        else if(it.t==="tog"){O[it.k]=!O[it.k];onToggle(it.k,O[it.k]);invalidateMenu();}
        else if(it.t==="act"){try{it.fn();}catch(e){flash("err: "+e.message);}invalidateMenu();}
    }
    function onToggle(k,on) {
        if(k==="flyOn")toggleFly(on);
        if(k==="platformsOn"&&!on){destroySafe(O.platL);O.platL=null;O.platLLatched=false;destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
        // Mutual exclusion: guns + snowball (only one active)
        if(k==="itemGunOn"){O.gunCd=0;if(!on)hideGun();if(on){O.tpGunOn=false;O.kickGunOn=false;O.snowballOn=false;}}
        if(k==="tpGunOn"){O.gunCd=0;if(!on)hideGun();if(on){O.itemGunOn=false;O.kickGunOn=false;O.snowballOn=false;}}
        if(k==="kickGunOn"){O.gunCd=0;if(!on)hideGun();if(on){O.itemGunOn=false;O.tpGunOn=false;O.snowballOn=false;}}
        if(k==="snowballOn"){if(on){O.itemGunOn=false;O.tpGunOn=false;O.kickGunOn=false;hideGun();}}
        if(k==="itemOrbitOn"){if(on)startItemOrbit();else stopItemOrbit();}
        if(k==="invincibleOn")toggleInvincible(on);
        if(k==="invisibleOn")toggleInvisible(on);
        if(k==="noRedWatchOn")toggleNoRedWatch(on);
        if(k==="longArmsOn")toggleLongArms(on);
        if(k==="orbitAllOn")flash(on?"Orbit All ON":"Orbit All OFF");
        if(k==="shieldOn"){if(on)installShield();else flash("Shield stays active (hooks can't be removed)");}
        if(k==="antiModderOn"){O.detectedModders={};O.playerPositions={};flash(on?"Anti-Modder ON — watching...":"Anti-Modder OFF");}
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
            try{const c=getComponent(mGO,ColliderClass);if(c)Destroy(c);}catch(_){}
            getTransform(mGO).method("SetParent",2).invoke(head,false);
            getTransform(mGO).method("set_localPosition").invoke([-0.15,0,0.45]);
            getTransform(mGO).method("set_localRotation").invoke([0,0,0,1]);
            getTransform(mGO).method("set_localScale").invoke([1e-3,1e-3,1e-3]);
            const cv=addComponent(mGO,CanvasClass);cv.method("set_renderMode").invoke(2);
            const tGO=GameObjectClass.method("CreatePrimitive").invoke(3);
            tGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
            try{getComponent(tGO,RendererClass).method("set_enabled").invoke(false);}catch(_){}
            try{const c=getComponent(tGO,ColliderClass);if(c)Destroy(c);}catch(_){}
            getTransform(tGO).method("SetParent",2).invoke(getTransform(mGO),false);
            const mt=addComponent(tGO,TextClass);
            if(font)mt.method("set_font").invoke(font);
            mt.method("set_supportRichText").invoke(true);mt.method("set_fontSize").invoke(14);mt.method("set_alignment").invoke(0);mt.method("set_resizeTextForBestFit").invoke(false);mt.method("set_fontStyle").invoke(1);
            try{const rt=getComponent(tGO,RectTransformClass);rt.method("set_anchorMin").invoke([0,1]);rt.method("set_anchorMax").invoke([0,1]);rt.method("set_pivot").invoke([0,1]);rt.method("set_anchoredPosition").invoke([0,0]);rt.method("set_sizeDelta").invoke([400,800]);}catch(_){}
            ObjectClass.method("DontDestroyOnLoad").invoke(mGO);
            O.menuGO=mGO;O.menuText=mt;O.menuInited=true;

            // Auto-setup soundboard folder
            ensureSoundsPath();
            refreshSoundList();

            log("MENU BUILT");
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
        // Only read time every 5 ticks
        if(O.tick%5===0){try{const t=TimeClass.method("get_time").invoke();O.deltaTime=(t-O.lastTime)/5;O.lastTime=t;if(O.deltaTime>0.1)O.deltaTime=0.016;}catch(_){O.deltaTime=0.016;}}
        if(!O.menuInited&&!O.buildFailed){if(O.tick%30===0)initMenu();return;}
        if(!O.menuInited) return;

        // ---- EVERY TICK: only critical input + active features ----
        processVRInput();
        if(O.flyOn) tickFly();
        if(O.platformsOn) tickPlatforms();

        // ---- EVERY 2 TICKS: guns ----
        if(O.tick%2===0){
            if(O.itemGunOn) tickItemGun();
            else if(O.tpGunOn) tickTPGun();
            else if(O.kickGunOn) tickKickGun();
            else if(O.snowballOn) tickSnowball();
            else hideGun();
        }

        // ---- EVERY 3 TICKS: orbit, menu text ----
        if(O.tick%3===0){
            if(O.orbitAllOn) tickOrbitAll();
            if(O.itemOrbitOn) tickItemOrbit();
            if(O.prefabOrbitOn) tickPrefabOrbit();
            setText(renderVRText());
        }

        // ---- EVERY 10 TICKS: slow stuff ----
        if(O.tick%10===0){
            tickMobSpawn();
            tickSoundboard();
            if(O.noRedWatchOn) toggleNoRedWatch(true);
        }

        // ---- EVERY 90 TICKS: anti-modder (already rate-limited inside but gate it here too) ----
        if(O.tick%90===0) tickAntiModder();

        if(O.tick-O.lastLog>=300){O.lastLog=O.tick;log("t="+O.tick+" fly="+O.flyOn+" guns="+O.itemGunOn+"/"+O.tpGunOn+"/"+O.kickGunOn+"/"+O.snowballOn+" shield="+O.shieldOn+" antimod="+O.antiModderOn);}
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
        if(!tgt){log("ERROR: no update method");}
        else{Interceptor.attach(tgt.virtualAddress,{onEnter(){try{onTick();}catch(e){if(O.tick%600===0)log("tick err: "+e);}}});O.hookInstalled=true;log("hook on GorillaLocomotion."+tgt.name);}
    }
    log("===== Orbit Menu V7.1 READY =====");
    log("Features: Shield, RPC Bypass, Kick/TP/Item Gun, Snowball, Anti-Modder, Names, Soundboard");
});
}, 5000);
