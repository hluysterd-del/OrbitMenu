// ====================================================================
//  Orbit Menu V7.2 — Animal Company
//  PHASED INIT: Il2Cpp.perform only installs hook (instant).
//  All class resolution spreads across frames → no freeze.
// ====================================================================

console.log("[Orbit] Script loaded, waiting 5s for game...");
setTimeout(() => {
console.log("[Orbit] Timer fired, calling Il2Cpp.perform...");
Il2Cpp.perform(() => {
    // ---- Persistent state ----
    globalThis.orbit = globalThis.orbit || {};
    const O = globalThis.orbit;
    const hadHook = O.hookInstalled;

    // ---- Phase tracker ----
    O.initPhase = 0;       // 0=hook only, 1=assemblies, 2=core classes, 3=AC classes, 4=ready
    O.tick = O.tick || 0;
    O.hookInstalled = hadHook || false;

    // ==============================================================
    //  PHASE 0 — Only resolve what's needed to install the hook
    //  This runs synchronously in Il2Cpp.perform (~1ms)
    // ==============================================================
    let acImage, GorillaLocomotionClass;
    try {
        acImage = Il2Cpp.domain.assembly("AnimalCompany").image;
        GorillaLocomotionClass = acImage.class("AnimalCompany.GorillaLocomotion");
    } catch(e) {
        console.log("[Orbit] FATAL: Can't find GorillaLocomotion — " + e);
        return;
    }

    // Store for later phases
    O._acImage = acImage;

    function log(m) { console.log("[Orbit] " + m); }

    // ==============================================================
    //  MASTER TICK — dispatches to init phases then normal operation
    // ==============================================================
    function masterTick() {
        O.tick++;
        try {
            switch(O.initPhase) {
                case 0: // Just installed — skip a few frames to let game settle
                    if (O.tick >= 10) { O.initPhase = 1; log("Phase 1: resolving assemblies..."); }
                    return;
                case 1: phase1_assemblies(); return;
                case 2: phase2_coreClasses(); return;
                case 3: phase3_acClasses(); return;
                case 4: phase4_helpers(); return;
                case 5: phase5_features(); return;
                case 6: phase6_menu(); return;
                case 99: onTick(); return;  // Normal operation
                default: return;
            }
        } catch(e) {
            if (O.tick % 600 === 0) log("masterTick err phase=" + O.initPhase + ": " + e);
        }
    }

    // ==============================================================
    //  PHASE 1 — Resolve all assemblies (spread: ~1 frame)
    // ==============================================================
    function phase1_assemblies() {
        try {
            O._coreImage = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
            O._physImage = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;
            O._uiModImage = Il2Cpp.domain.assembly("UnityEngine.UIModule").image;
            O._uiImage = Il2Cpp.domain.assembly("UnityEngine.UI").image;
            O._textImage = Il2Cpp.domain.assembly("UnityEngine.TextRenderingModule").image;
        } catch(e) { log("Phase 1 critical fail: " + e); return; }

        // Optional assemblies (won't throw)
        try { O._fusionImage = Il2Cpp.domain.assembly("Fusion.Runtime").image; } catch(_){ O._fusionImage = null; }
        try { O._audioModImage = Il2Cpp.domain.assembly("UnityEngine.AudioModule").image; } catch(_){ O._audioModImage = null; }

        O._webReqMultiImage = null;
        try { O._webReqMultiImage = Il2Cpp.domain.assembly("UnityEngine.UnityWebRequestAudioModule").image; } catch(_){}
        if (!O._webReqMultiImage) try { O._webReqMultiImage = Il2Cpp.domain.assembly("UnityEngine.UnityWebRequestMultimediaModule").image; } catch(_){}
        if (!O._webReqMultiImage) try { O._webReqMultiImage = Il2Cpp.domain.assembly("UnityEngine.UnityWebRequestModule").image; } catch(_){}

        try { O._mscorlibImage = Il2Cpp.domain.assembly("mscorlib").image; } catch(_){ O._mscorlibImage = null; }
        O._photonVoiceImage = null;
        try { O._photonVoiceImage = Il2Cpp.domain.assembly("PhotonVoice").image; } catch(_){}
        if (!O._photonVoiceImage) try { O._photonVoiceImage = Il2Cpp.domain.assembly("PhotonVoice.API").image; } catch(_){}

        log("Phase 1 done — all assemblies resolved");
        O.initPhase = 2;
    }

    // ==============================================================
    //  PHASE 2 — Core Unity classes (~1 frame)
    // ==============================================================
    function phase2_coreClasses() {
        const ci = O._coreImage, pi = O._physImage, ui = O._uiModImage, uii = O._uiImage, ti = O._textImage;
        try {
            O.CL = {};  // Class library
            const C = O.CL;
            C.GameObject    = ci.class("UnityEngine.GameObject");
            C.Object        = ci.class("UnityEngine.Object");
            C.Transform     = ci.class("UnityEngine.Transform");
            C.Vector3       = ci.class("UnityEngine.Vector3");
            C.Quaternion    = ci.class("UnityEngine.Quaternion");
            C.Time          = ci.class("UnityEngine.Time");
            C.Renderer      = ci.class("UnityEngine.Renderer");
            C.Shader        = ci.class("UnityEngine.Shader");
            C.Resources     = ci.class("UnityEngine.Resources");
            C.Camera        = ci.class("UnityEngine.Camera");
            C.Canvas        = ui.class("UnityEngine.Canvas");
            C.Text          = uii.class("UnityEngine.UI.Text");
            C.Font          = ti.class("UnityEngine.Font");
            C.RectTransform = ci.class("UnityEngine.RectTransform");
            C.Collider      = pi.class("UnityEngine.Collider");
            C.Rigidbody     = pi.class("UnityEngine.Rigidbody");
            C.Physics       = pi.class("UnityEngine.Physics");
            log("Phase 2 done — core classes");
        } catch(e) { log("Phase 2 fail: " + e); return; }
        O.initPhase = 3;
    }

    // ==============================================================
    //  PHASE 3 — AC + optional classes (~1 frame)
    // ==============================================================
    function phase3_acClasses() {
        const C = O.CL, ai = O._acImage, ci = O._coreImage, pi = O._physImage;
        try {
            C.PlayerController  = ai.class("AnimalCompany.PlayerController");
            C.GorillaLocomotion = GorillaLocomotionClass;
            C.XRInputManager    = ai.class("AnimalCompany.XRInputManager");
            C.NetPlayer         = ai.class("AnimalCompany.NetPlayer");
            log("Phase 3: AC core classes done");
        } catch(e) { log("Phase 3 critical fail: " + e); return; }

        // Optional
        try { C.BoxCollider = pi.class("UnityEngine.BoxCollider"); } catch(_){}
        try { C.LineRenderer = ci.class("UnityEngine.LineRenderer"); } catch(_){}
        try { C.AudioSource = O._audioModImage ? O._audioModImage.class("UnityEngine.AudioSource") : null; } catch(_){}
        if (!C.AudioSource) try { C.AudioSource = ci.class("UnityEngine.AudioSource"); } catch(_){}
        try { C.Application = ci.class("UnityEngine.Application"); } catch(_){}
        try { C.PrefabGen = ai.class("AnimalCompany.PrefabGenerator"); } catch(_){}
        try { C.NetSessionRPCs = ai.class("AnimalCompany.NetSessionRPCs"); } catch(_){}
        try { C.GBO = ai.class("AnimalCompany.GameplayBaseObject"); } catch(_){}
        if (O._fusionImage) try { C.NetworkObject = O._fusionImage.class("Fusion.NetworkObject"); } catch(_){}
        if (O._photonVoiceImage) try { C.Recorder = O._photonVoiceImage.class("Photon.Voice.Unity.Recorder"); } catch(_){}
        if (O._mscorlibImage) {
            try { C.Directory = O._mscorlibImage.class("System.IO.Directory"); } catch(_){}
            try { C.Path = O._mscorlibImage.class("System.IO.Path"); } catch(_){}
        }

        // Shader find (one-time)
        try { C.TextShader = C.Shader.method("Find").invoke(Il2Cpp.string("GUI/Text Shader")); } catch(_){}
        if (!C.TextShader) try { C.TextShader = C.Shader.method("Find").invoke(Il2Cpp.string("UI/Default")); } catch(_){}

        log("Phase 3 done — all classes resolved");
        O.initPhase = 4;
    }

    // ==============================================================
    //  PHASE 4 — Define helper functions (~1 frame)
    // ==============================================================
    function phase4_helpers() {
        const C = O.CL;

        // ---- Static data ----
        O.ALL_ITEMS = [
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
        O.PREFAB_NAMES = [
            "ItemSellingMachineController","Duplicator","ClawMachineNetObject",
            "TeleportMachine","BigBanana","BonfireController","ChristmasBox",
            "ExplosiveEgg","ExplosiveEggClustered","Basketball","BigHatchdoorNetObject",
            "DiggableGrave","DummyPlayerTarget","DummyTarget","FuelCanisterNetObject",
            "GiantRockObject","GiantRockObject_Fire","GreenscreenNET","HellAltar",
            "HordeMobController","InflatedBalloon","Landmine","LootLantern",
            "Net","RPGRocket","RuinTower_FloatingPlatform","ScaffoldTrap",
            "SpawnableZipline","StickyAnchor","Vehicle_Buggy",
        ];
        O.MOB_IDS = [
            "AnglerController","AnglerMadController","ArmstrongController",
            "BansheeController","BombController","BomberController",
            "ChickenController","EvilEyeController","FakeGorillaController",
            "GiantController","NextBotController","PhantomController","SpiderController",
        ];
        O.TELEPORT_LOCS = {
            "Lake":[-213.170,56.764,-15.242], "Moon":[1021.538,980.105,1054.145],
            "Sewers":[88.541,-103.024,140.867], "Spawn":[-397.684,2.135,-399.209],
            "Water Tower":[49.446,50.186,-33.340],
        };
        O.NAME_PRESETS = [
            {l:"Orbit On Top", v:"<color=#bb88ff><size=40>Orbit Menu On Top</size></color>"},
            {l:"Giant Emojis", v:"<size=300>\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}\u{1F600}</size>"},
            {l:"Rainbow Text", v:"<color=red>O</color><color=orange>R</color><color=yellow>B</color><color=green>I</color><color=cyan>T</color><color=blue> </color><color=magenta>M</color><color=red>E</color><color=orange>N</color><color=yellow>U</color>"},
            {l:"Invisible Name", v:"<color=#00000000>.</color>"},
            {l:"Huge Purple", v:"<size=200><color=#bb88ff>ORBIT</color></size>"},
            {l:"Tiny Spam", v:"<size=5>orbitorbitorbitorbitorbitorbitorbitorbitorbitorbitorbitorbitorbit</size>"},
            {l:"Reset Name", v:"RESET"},
        ];
        O.SNOWBALL_ITEMS = [
            "item_snowball","item_egg","item_disc","item_grenade","item_flashbang",
            "item_dynamite","item_broccoli_grenade","item_cluster_grenade",
        ];

        // ---- Helper functions stored on O for later phases ----
        O.fn = {};
        const F = O.fn;

        F.log = log;
        F.flash = function(msg) { O.actionMsg=msg; O.actionTick=O.tick; O._cacheDirty=true; log(msg); };
        F.getTransform = function(obj) { return obj.method("get_transform").invoke(); };
        F.getComponent = function(obj, cls) { return obj.method("GetComponent",1).inflate(cls).invoke(); };
        F.addComponent = function(obj, cls) { return obj.method("AddComponent",1).inflate(cls).invoke(); };
        F.getComponentInParent = function(obj, cls) {
            try { return obj.method("GetComponentInParent",0).inflate(cls).invoke(); } catch(_){}
            return null;
        };
        F.destroySafe = function(obj) { if(obj) try{C.Object.method("Destroy",1).invoke(obj);}catch(_){} };
        F.playerIsLocal = function(np) { try { return np.method("get_IsMine").invoke(); } catch(_){} return false; };
        F.getGameObjectSafe = function(obj) {
            try { const go = obj.method("get_gameObject").invoke(); if (go && !go.handle.isNull()) return go; } catch(_){}
            return null;
        };

        // Network authority
        F.getNetworkObjectSafe = function(target) {
            if (!target || target.handle.isNull()) return null;
            try { if (target.class && target.class.name === "NetworkObject") return target; } catch(_){}
            const getters = [
                () => target.method("get_Object").invoke(),
                () => target.method("get_NetworkObject").invoke(),
                () => target.method("get_networkObject").invoke(),
            ];
            if (C.NetworkObject) getters.push(() => target.method("GetComponent",1).inflate(C.NetworkObject).invoke());
            for (const getter of getters) { try { const obj = getter(); if (obj && !obj.handle.isNull()) return obj; } catch(_){} }
            return null;
        };
        F.requestStateAuthoritySafe = function(target) {
            if (!target || target.handle.isNull()) return;
            try { const netObj = F.getNetworkObjectSafe(target); if (netObj && !netObj.handle.isNull()) netObj.method("RequestStateAuthority").invoke(); } catch(_){}
        };

        // Player instance helpers
        F.playerInst = function() { try { const v=C.PlayerController.method("get_instance").invoke(); if(v&&!v.handle.isNull()) return v; } catch(_){} return null; };
        F.gorillaInst = function() {
            try { const v=C.GorillaLocomotion.field("<Instance>k__BackingField").value; if(v&&!v.handle.isNull()) return v; } catch(_){}
            try { const v=C.GorillaLocomotion.method("get_Instance").invoke(); if(v&&!v.handle.isNull()) return v; } catch(_){} return null;
        };
        F.headTf = function() {
            const p=F.playerInst(); if(!p) return null;
            try { const h=p.method("get_head").invoke(); if(h&&!h.handle.isNull()) return h; } catch(_){}
            for (const n of ["_headTransform","_cameraTransform","headFollower"]) { try { const v=p.field(n).value; if(v&&!v.handle.isNull()) return v; } catch(_){} }
            return null;
        };
        F.handTf = function(side) {
            const gl=F.gorillaInst(); if(!gl) return null;
            try { const f=gl.field(side===0?"leftHandTransform":"rightHandTransform").value; if(f&&!f.handle.isNull()) return f; } catch(_){}
            const p=F.playerInst(); if(!p) return null;
            try { const v=p.field(side===0?"_handTransformLeft":"_handTransformRight").value; if(v&&!v.handle.isNull()) return v; } catch(_){} return null;
        };
        F.readPos = function(tf) {
            if(!tf) return null;
            try { const v=tf.method("get_position").invoke();
                try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
                return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
            } catch(_){} return null;
        };
        F.readFwd = function(tf) {
            if(!tf) return null;
            try { const v=tf.method("get_forward").invoke();
                try { const u=v.unbox(); return {x:u.field("x").value,y:u.field("y").value,z:u.field("z").value}; } catch(_){}
                return {x:v.field("x").value,y:v.field("y").value,z:v.field("z").value};
            } catch(_){} return null;
        };

        // XR Input
        F.joyY = function(hand) { try{const r=C.XRInputManager.method("GetJoystickValue").invoke(hand);if(!r)return 0;try{return r.unbox().field("y").value;}catch(_){}return r.field("y").value;}catch(_){return 0;} };
        F.joyX = function(hand) { try{const r=C.XRInputManager.method("GetJoystickValue").invoke(hand);if(!r)return 0;try{return r.unbox().field("x").value;}catch(_){}return r.field("x").value;}catch(_){return 0;} };
        F.readBool = function(v) { if(v===true)return true;if(v===false||v===null||v===undefined)return false;try{const u=v.unbox();if(typeof u==="boolean")return u;if(typeof u==="number")return u!==0;}catch(_){}return false; };
        F.trigger = function(hand) { try{return F.readBool(C.XRInputManager.method("GetTriggerButtonValue").invoke(hand));}catch(_){return false;} };
        F.grip = function(hand) { try{return F.readBool(C.XRInputManager.method("AnyGrabInputPressed",1).invoke(hand));}catch(_){return false;} };
        F.bBtn = function(hand) { try{if(F.readBool(C.XRInputManager.method("GetButtonDown").invoke(hand,1)))return true;}catch(_){}try{if(F.readBool(C.XRInputManager.method("GetButtonDown").invoke(hand,0)))return true;}catch(_){}return false; };
        F.primaryBtn = function(hand) { try{return F.readBool(C.XRInputManager.method("GetPrimaryButton").invoke(hand));}catch(_){}return F.bBtn(hand); };

        // Player iteration
        F.localPlayer = function() { try{return C.NetPlayer.method("get_localPlayer").invoke();}catch(_){}return null; };
        F.getOtherPlayers = function() {
            const others=[];
            try { const lp=F.localPlayer();const localH=lp?lp.handle.toString():"";
                let arr=null;try{arr=C.Object.method("FindObjectsByType",1).inflate(C.NetPlayer).invoke(0);}catch(_){}
                if(!arr)try{arr=C.Object.method("FindObjectsOfType",1).invoke(C.NetPlayer.type);}catch(_){}
                if(!arr)return others;
                for(let i=0;i<arr.length;i++){try{const np=arr.get(i);if(!np||np.handle.isNull())continue;if(localH&&np.handle.toString()===localH)continue;others.push(np);}catch(_){}}
            }catch(_){} return others;
        };
        F.forEachOtherPlayer = function(fn) { let n=0;for(const np of F.getOtherPlayers()){try{fn(np);n++;}catch(_){}}return n; };
        F.withBypass = function(fn) { O.selfBypass=true;try{fn();}finally{O.selfBypass=false;} };

        log("Phase 4 done — helpers defined");
        O.initPhase = 5;
    }

    // ==============================================================
    //  PHASE 5 — Define feature functions (~1 frame)
    // ==============================================================
    function phase5_features() {
        const C = O.CL, F = O.fn;

        // ---- Spawning ----
        F.spawnItem = function(itemID, pos, rot) {
            if (!C.PrefabGen) return null;
            const full = itemID.startsWith("item_prefab/") ? itemID : "item_prefab/" + itemID;
            try { const r=C.PrefabGen.method("SpawnItem",4).invoke(Il2Cpp.string(full),pos,rot,ptr(0)); if(r&&!r.handle.isNull()) return r; } catch(_){}
            try { const r=C.PrefabGen.method("SpawnItem",4).invoke(Il2Cpp.string(itemID),pos,rot,ptr(0)); if(r&&!r.handle.isNull()) return r; } catch(_){}
            return null;
        };
        F.spawnNetworkPrefab = function(prefabName, pos, rot) {
            if (!C.PrefabGen) return null;
            try {
                const inst = C.PrefabGen.field("_instance").value;
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
        };
        F.spawnMob = function(mobID, pos, rot) {
            if (!C.PrefabGen) return null;
            try { return C.PrefabGen.method("SpawnItem",4).invoke(Il2Cpp.string("mob_prefab/"+mobID),pos,rot,ptr(0)); } catch(_){} return null;
        };
        F.spawnInFront = function(type, id) {
            const head=F.headTf(), pos=F.readPos(head), fwd=F.readFwd(head);
            if (!pos||!fwd) { F.flash("no head"); return null; }
            const sp=[pos.x+fwd.x*3,pos.y+fwd.y*3,pos.z+fwd.z*3], rot=[0,0,0,1];
            let r=null;
            if(type==="item") r=F.spawnItem(id,sp,rot);
            else if(type==="prefab") r=F.spawnNetworkPrefab(id,sp,rot);
            else if(type==="mob") r=F.spawnMob(id,sp,rot);
            F.flash(r ? "Spawned: "+id : "Failed: "+id);
            return r;
        };

        // ---- RPC Shield ----
        F.installShield = function() {
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
                        try { methods.push(...C.NetPlayer.method(rpcName).overloads()); } catch(_){
                            try { methods.push(C.NetPlayer.method(rpcName)); } catch(_2){}
                        }
                        methods.forEach(m => {
                            if (!m) return;
                            const orig = m;
                            m.implementation = function (...args) {
                                try { if (this.method("get_IsMine").invoke() && !O.selfBypass) { log("[SHIELD] Blocked: " + rpcName); return; } } catch(_){}
                                return orig.invoke(...args);
                            };
                            hooked++;
                        });
                    } catch(_){}
                });
                O.shieldInstalled = true;
                log("[SHIELD] Installed — blocked " + hooked + " hostile RPCs");
                F.flash("SHIELD ON — " + hooked + " RPCs blocked");
            } catch(e) { log("[SHIELD] Error: " + e); }
        };

        // ---- Kick ----
        F.kickPlayer = function(player) {
            if (!C.NetSessionRPCs) { F.flash("no NetSessionRPCs"); return; }
            try {
                const netInst = C.NetSessionRPCs.field("_instance").value;
                if (!netInst || netInst.handle.isNull()) { F.flash("no session inst"); return; }
                F.requestStateAuthoritySafe(player);
                const playerRef = player.method("get_Object").invoke().method("get_InputAuthority").invoke();
                O.selfBypass = true;
                try { netInst.method("RPC_KickPlayer").invoke(playerRef); } catch(_){}
                try { const refInt = playerRef.field("_val").value; C.NetSessionRPCs.method("KickPlayer").invoke(refInt); } catch(_){}
                O.selfBypass = false;
                F.flash("Kicked player");
            } catch(e) { O.selfBypass = false; log("kick: "+e); F.flash("kick failed"); }
        };

        // ---- OP Actions ----
        F.actOnPlayer = function(np, rpcName, args) {
            F.requestStateAuthoritySafe(np);
            for (const pc of [1,0,2,3,4]) { try { np.method(rpcName, pc).invoke(...args); return true; } catch(_){} }
            try { np.method(rpcName).invoke(...args); return true; } catch(_){}
            return false;
        };
        F.actTpAll = function() { const p=F.readPos(F.headTf()); if(!p){F.flash("no head");return;} let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);F.actOnPlayer(np,"RPC_Teleport",[[p.x,p.y,p.z]]);});}); F.flash("TP'd "+n); };
        F.actYeetAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);F.actOnPlayer(np,"RPC_AddForce",[[0,80,0]]);});}); F.flash("Yeeted "+n); };
        F.actStinkAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);try{np.method("RPC_TagAsStinky",0).invoke();}catch(_){try{np.method("RPC_TagAsStinky").invoke();}catch(_2){}}});}); F.flash("Stinked "+n); };
        F.actColorAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);const h=Math.random()*360;try{np.method("RPC_SetColorHSV",4).invoke(h,1,1,1);}catch(_){try{np.method("RPC_SetColorHSV").invoke(h,1,1,1);}catch(_2){}}});}); F.flash("Colored "+n); };
        F.actFlingAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);F.actOnPlayer(np,"RPC_AddForce",[[0,120,0]]);});}); F.flash("Flung "+n); };
        F.actVoidAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);F.actOnPlayer(np,"RPC_Teleport",[[0,-500,0]]);});}); F.flash("Voided "+n); };
        F.actMoneyAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);try{np.method("RPC_AddPlayerMoney",1).invoke(99999);}catch(_){}})}); F.flash("$99999 to "+n); };
        F.actStunAll = function() { let n=0; F.withBypass(()=>{n=F.forEachOtherPlayer(np=>{F.requestStateAuthoritySafe(np);try{np.method("RPC_Stun",1).invoke(30.0);}catch(_){}})}); F.flash("Stunned "+n); };
        F.actKickAll = function() { F.withBypass(()=>{let n=F.forEachOtherPlayer(np=>{F.kickPlayer(np);}); F.flash("Kicked "+n);}); };

        // ---- Toggles ----
        F.toggleInvincible = function(on) {
            try { const lp=F.localPlayer(), pc=F.playerInst();
                if(on){try{lp.method("set_maxHealth").invoke(999999999);}catch(_){}try{lp.method("set_healthGained").invoke(999999999);}catch(_){}try{pc.method("SubtractPlayerHealth").invoke(-333333);}catch(_){}try{pc.method("set_healthHealed").invoke(999999999);}catch(_){}}
                else{try{lp.method("set_maxHealth").invoke(125);}catch(_){}try{lp.method("set_healthGained").invoke(125);}catch(_){}try{pc.method("set_healthHealed").invoke(125);}catch(_){}}
                F.flash(on?"INVINCIBLE":"invincible off");
            } catch(e){log("invincible: "+e);}
        };
        F.toggleInvisible = function(on) {
            try { const pc=F.playerInst(),view=pc.method("get_playerView").invoke(),cam=view.field("_cameraTransform").value;
                if(on) cam.method("set_position").invoke([0,-99999,0]);
                else { const hp=F.readPos(F.headTf()); if(hp) cam.method("set_position").invoke([hp.x,hp.y,hp.z]); }
                F.flash(on?"INVISIBLE":"invisible off");
            } catch(e){log("invisible: "+e);}
        };
        F.toggleNoRedWatch = function(on) { try{F.localPlayer().method("set_isWanted").invoke(false);}catch(_){} F.flash(on?"No Red Watch":"cleared"); };
        F.toggleLongArms = function(on) { try{const gl=F.gorillaInst();F.getTransform(gl).method("set_localScale").invoke(on?[1.5,1.5,1.5]:[1,1,1]);F.flash(on?"LONG ARMS":"normal arms");}catch(e){log("longarms: "+e);} };

        // ---- Fly ----
        F.toggleFly = function(on) {
            const gl=F.gorillaInst(); if(!gl) return;
            try { const rb=F.getComponent(gl,C.Rigidbody);
                if(on){try{O.savedGravity=rb.method("get_useGravity").invoke();}catch(_){O.savedGravity=true;} rb.method("set_useGravity").invoke(false);try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}} F.flash("FLY ON — hold B");}
                else{rb.method("set_useGravity").invoke(O.savedGravity!=null?O.savedGravity:true);try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}} F.flash("fly off");}
            } catch(e){log("fly: "+e);}
        };
        F.tickFly = function() {
            if(!O.flyOn) return;
            const gl=F.gorillaInst(); if(!gl) return;
            try { const rb=F.getComponent(gl,C.Rigidbody),tf=F.getTransform(gl);
                try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}}
                try{rb.method("set_angularVelocity").invoke([0,0,0]);}catch(_){}
                const bHeld=F.primaryBtn(1)||(F.trigger(0)&&F.trigger(1));
                if(bHeld){const fwd=F.readFwd(F.headTf());if(!fwd)return;const sp=25,dt=O.deltaTime||0.016,step=sp*dt;
                    const cur=tf.method("get_position").invoke();tf.method("set_position").invoke(C.Vector3.method("op_Addition",2).invoke(cur,[fwd.x*step,fwd.y*step,fwd.z*step]));}
            } catch(_){}
        };

        // ---- Platforms ----
        F.createPlatCube = function() {
            const obj=C.GameObject.method("CreatePrimitive").invoke(3);
            obj.method("set_name").invoke(Il2Cpp.string("[OrbitPlat]"));
            F.getTransform(obj).method("set_localScale").invoke([0.4,0.05,0.4]);
            try{const r=F.getComponent(obj,C.Renderer),m=r.method("get_material").invoke();if(C.TextShader)m.method("set_shader").invoke(C.TextShader);m.method("set_color").invoke([0.6,0.2,0.8,1]);}catch(_){}
            return obj;
        };
        F.tickPlatforms = function() {
            if(!O.platformsOn) return;
            if(F.grip(1)){if(!O.platRLatched||!O.platR){if(O.platR)F.destroySafe(O.platR);O.platR=F.createPlatCube();O.platRLatched=true;const h=F.handTf(1);if(h){const t=F.getTransform(O.platR);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
            else if(O.platR){F.destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
            if(F.grip(0)){if(!O.platLLatched||!O.platL){if(O.platL)F.destroySafe(O.platL);O.platL=F.createPlatCube();O.platLLatched=true;const h=F.handTf(0);if(h){const t=F.getTransform(O.platL);t.method("set_position").invoke(h.method("get_position").invoke());t.method("set_rotation").invoke(h.method("get_rotation").invoke());}}}
            else if(O.platL){F.destroySafe(O.platL);O.platL=null;O.platLLatched=false;}
        };

        // ---- Gun Beam ----
        F.renderGun = function() {
            const rH = F.handTf(1); if (!rH) return null;
            const startPos = rH.method("get_position").invoke();
            const direction = rH.method("get_forward").invoke();
            const gunMaxDistance = 384.0, layerMask = -2063;
            let rayStart;
            try { rayStart = C.Vector3.method("op_Addition",2).invoke(startPos, C.Vector3.method("op_Multiply",2).invoke(direction, 0.03)); } catch(_) { rayStart = startPos; }
            let bestRay = null, bestDist = Infinity;
            try {
                const hits = C.Physics.method("RaycastAll",4).invoke(rayStart, direction, gunMaxDistance, layerMask);
                if (hits && hits.length) {
                    for (let i = 0; i < hits.length; i++) {
                        const hit = hits.get(i);
                        try {
                            const hitCollider = hit.method("get_collider").invoke();
                            if (hitCollider && !hitCollider.handle.isNull()) {
                                try { const hitPlayer = F.getComponentInParent(hitCollider, C.NetPlayer); if (hitPlayer && !hitPlayer.handle.isNull() && F.playerIsLocal(hitPlayer)) continue; } catch(_){}
                            }
                            const point = hit.method("get_point").invoke();
                            const dist = C.Vector3.method("Distance",2).invoke(point, startPos);
                            if (dist < bestDist) { bestDist = dist; bestRay = hit; }
                        } catch(_){}
                    }
                }
            } catch(e) { if(O.tick%300===0) log("raycast: "+e); }

            let endPos;
            if (bestRay) { endPos = bestRay.method("get_point").invoke(); }
            else { try { endPos = C.Vector3.method("op_Addition",2).invoke(startPos, C.Vector3.method("op_Multiply",2).invoke(direction, gunMaxDistance)); } catch(_){ return null; } }

            try { if (C.Vector3.method("op_Equality",2).invoke(endPos, [0,0,0])) endPos = C.Vector3.method("op_Addition",2).invoke(startPos, C.Vector3.method("op_Multiply",2).invoke(direction, gunMaxDistance)); } catch(_){}

            // Pointer sphere
            if (!O.gunPointer || O.gunPointer.handle.isNull()) {
                try {
                    O.gunPointer = C.GameObject.method("CreatePrimitive").invoke(0);
                    O.gunPointer.method("set_name").invoke(Il2Cpp.string("[OGunPtr]"));
                    F.getTransform(O.gunPointer).method("set_localScale").invoke([0.1,0.1,0.1]);
                    try{const c=F.getComponent(O.gunPointer,C.Collider);if(c)F.destroySafe(c);}catch(_){}
                    C.Object.method("DontDestroyOnLoad").invoke(O.gunPointer);
                } catch(e){log("gunPtr: "+e);}
            }
            if (O.gunPointer) {
                O.gunPointer.method("SetActive").invoke(true);
                F.getTransform(O.gunPointer).method("set_position").invoke(endPos);
                try { const r=F.getComponent(O.gunPointer,C.Renderer),m=r.method("get_material").invoke();
                    if(C.TextShader)m.method("set_shader").invoke(C.TextShader);
                    m.method("set_color").invoke(F.trigger(1)?[1,0.2,0.2,1]:[0.7,0,1,0.9]);
                } catch(_){}
            }

            // Line renderer
            if (!O.gunLine || O.gunLine.handle.isNull()) {
                if (C.LineRenderer) {
                    try {
                        const lo = C.GameObject.method("CreatePrimitive").invoke(0);
                        lo.method("set_name").invoke(Il2Cpp.string("[OGunLine]"));
                        try{F.getComponent(lo,C.Renderer).method("set_enabled").invoke(false);}catch(_){}
                        try{const c=F.getComponent(lo,C.Collider);if(c)F.destroySafe(c);}catch(_){}
                        O.gunLine = F.addComponent(lo, C.LineRenderer);
                        C.Object.method("DontDestroyOnLoad").invoke(lo);
                    } catch(e){log("gunLine: "+e);}
                }
            }
            if (O.gunLine) {
                try {
                    O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(true);
                    const lm = O.gunLine.method("get_material").invoke();
                    if (C.TextShader) lm.method("set_shader").invoke(C.TextShader);
                    const gunColor = [0.5, 0, 0.8, 0.75];
                    O.gunLine.method("set_startColor").invoke(gunColor);
                    O.gunLine.method("set_endColor").invoke(gunColor);
                    O.gunLine.method("set_startWidth").invoke(0.025);
                    O.gunLine.method("set_endWidth").invoke(0.025);
                    O.gunLine.method("set_useWorldSpace").invoke(true);
                    if (F.trigger(1)) {
                        const Step = 10;
                        O.gunLine.method("set_positionCount").invoke(Step);
                        O.gunLine.method("SetPosition").invoke(0, startPos);
                        for (let s = 1; s < Step - 1; s++) {
                            const t = s / (Step - 1);
                            const pos = C.Vector3.method("Lerp",3).invoke(startPos, endPos, t);
                            if (Math.random() > 0.75) {
                                const offset = [(Math.random()*0.2)-0.1,(Math.random()*0.2)-0.1,(Math.random()*0.2)-0.1];
                                O.gunLine.method("SetPosition").invoke(s, C.Vector3.method("op_Addition",2).invoke(pos, offset));
                            } else { O.gunLine.method("SetPosition").invoke(s, pos); }
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
        };
        F.hideGun = function() {
            if(O.gunPointer)try{O.gunPointer.method("SetActive").invoke(false);}catch(_){}
            if(O.gunLine)try{O.gunLine.method("get_gameObject").invoke().method("SetActive").invoke(false);}catch(_){}
        };
        F.getGunTargetPlayer = function(ray) {
            if (!ray) return null;
            try {
                const collider = ray.method("get_collider").invoke();
                if (collider && !collider.handle.isNull()) {
                    const target = F.getComponentInParent(collider, C.NetPlayer);
                    if (target && !target.handle.isNull() && !F.playerIsLocal(target)) return target;
                    const go = F.getGameObjectSafe(collider);
                    if (go) { const target2 = F.getComponentInParent(go, C.NetPlayer); if (target2 && !target2.handle.isNull() && !F.playerIsLocal(target2)) return target2; }
                }
            } catch(_){}
            try {
                const hitPoint = ray.method("get_point").invoke();
                const allPlayers = C.Object.method("FindObjectsByType",1).inflate(C.NetPlayer).invoke(0);
                let closest = null, closestDist = 1.75;
                for (let i = 0; i < allPlayers.length; i++) {
                    const p = allPlayers.get(i); if (!p || p.handle.isNull()) continue; if (F.playerIsLocal(p)) continue;
                    try { const go = F.getGameObjectSafe(p); if (!go) continue; const pos = F.getTransform(go).method("get_position").invoke(); const d = C.Vector3.method("Distance",2).invoke(hitPoint, pos); if (d < closestDist) { closestDist = d; closest = p; } } catch(_){}
                }
                return closest;
            } catch(_){}
            return null;
        };

        // ---- Gun ticks ----
        F.tickItemGun = function() {
            if(!O.itemGunOn) return; if(!F.grip(1)){F.hideGun();return;}
            const g=F.renderGun(); if(!g) return; if(O.gunCd>0){O.gunCd--;return;} if(!F.trigger(1)) return; O.gunCd=25;
            try { const hitPoint = g.ray ? g.ray.method("get_point").invoke() : g.endPos;
                const id=O.ALL_ITEMS[Math.floor(Math.random()*O.ALL_ITEMS.length)];
                F.spawnItem(id, hitPoint, [0,0,0,1]); F.flash("Shot: "+id.replace("item_",""));
            } catch(e) { log("itemGun: "+e); }
        };
        F.tickTPGun = function() {
            if(!O.tpGunOn) return; if(!F.grip(1)){F.hideGun();return;}
            const g=F.renderGun(); if(!g) return; if(!F.trigger(1)||O.gunCd>0){if(!F.trigger(1))O.gunCd=0;else O.gunCd--;return;} O.gunCd=20;
            try { const pos = F.readPos(F.getTransform(O.gunPointer)); const tp = pos || {x:0,y:0,z:0};
                const gl=F.gorillaInst(); F.getTransform(gl).method("set_position").invoke([tp.x, tp.y+1, tp.z]);
                const rb=F.getComponent(gl,C.Rigidbody); try{rb.method("set_linearVelocity").invoke([0,0,0]);}catch(_){try{rb.method("set_velocity").invoke([0,0,0]);}catch(_2){}}
            } catch(_){} F.flash("TP'd to beam");
        };
        F.tickKickGun = function() {
            if(!O.kickGunOn) return; if(!F.grip(1)){F.hideGun();return;}
            const g=F.renderGun(); if(!g) return; if(!F.trigger(1)||O.gunCd>0){if(!F.trigger(1))O.gunCd=0;else O.gunCd--;return;} O.gunCd=30;
            const target = F.getGunTargetPlayer(g.ray);
            if(target){ F.withBypass(()=>{F.requestStateAuthoritySafe(target);F.kickPlayer(target);}); F.flash("KICKED target"); }
            else { F.flash("No player at beam"); }
        };

        // ---- Snowball ----
        F.fireSnowball = function() {
            const rH = F.handTf(1); if (!rH) return;
            const pos = rH.method("get_position").invoke(), fwd = rH.method("get_forward").invoke();
            const itemID = O.SNOWBALL_ITEMS[O.snowballIdx];
            try {
                const result = C.PrefabGen.method("SpawnItem",4).invoke(Il2Cpp.string("item_prefab/" + itemID), pos, [0,0,0,1], ptr(0));
                if (!result || result.handle.isNull()) { F.flash("Spawn failed"); return; }
                F.requestStateAuthoritySafe(result);
                if (C.GBO) {
                    try { const gbo = F.getComponent(result, C.GBO);
                        if (gbo && !gbo.handle.isNull()) { try { gbo.method("set_scaleModifier").invoke(127); } catch(_){}
                            gbo.method("AddExternalForceVelocity",1).invoke(C.Vector3.method("op_Multiply",2).invoke(fwd, 100)); }
                    } catch(e){ log("snowball gbo: "+e); }
                }
                F.flash("Fired: " + itemID.replace("item_",""));
            } catch(e) { log("snowball: "+e); F.flash("snowball failed"); }
        };
        F.tickSnowball = function() {
            if(!O.snowballOn) return; if(!F.grip(1)) return;
            if(O.snowballCd>0){O.snowballCd--;return;} if(!F.trigger(1)) return;
            O.snowballCd = 15; F.fireSnowball();
        };

        // ---- Anti-Modder ----
        F.tickAntiModder = function() {
            if (!O.antiModderOn) return; if (O.tick % 90 !== 0) return;
            const others = F.getOtherPlayers(), newPositions = {};
            for (const np of others) {
                const h = np.handle.toString();
                try {
                    const go = F.getGameObjectSafe(np); if (!go) continue;
                    const pos = F.readPos(F.getTransform(go)); if (!pos) continue;
                    newPositions[h] = { x: pos.x, y: pos.y, z: pos.z, tick: O.tick };
                    const prev = O.playerPositions[h];
                    if (prev) {
                        const dx=pos.x-prev.x, dy=pos.y-prev.y, dz=pos.z-prev.z;
                        const dist = Math.sqrt(dx*dx+dy*dy+dz*dz), tickDiff = O.tick - prev.tick, speed = dist / Math.max(1, tickDiff);
                        if (speed > 2 && dist > 50 && !O.detectedModders[h]) {
                            O.detectedModders[h] = true;
                            log("[ANTI-MOD] Modder detected! Speed=" + speed.toFixed(1));
                            const ax=111000+Math.floor(Math.random()*999), ay=111000+Math.floor(Math.random()*999), az=111000+Math.floor(Math.random()*999);
                            F.withBypass(()=>{F.requestStateAuthoritySafe(np);F.actOnPlayer(np,"RPC_Teleport",[[ax,ay,az]]);});
                            F.flash("Modder sent to abyss!");
                        }
                    }
                } catch(_){}
            }
            O.playerPositions = newPositions;
            for (const np of others) { const h=np.handle.toString();
                if(O.detectedModders[h]){const ax=111000+Math.floor(Math.random()*999),ay=111000+Math.floor(Math.random()*999),az=111000+Math.floor(Math.random()*999);
                    F.withBypass(()=>{F.requestStateAuthoritySafe(np);F.actOnPlayer(np,"RPC_Teleport",[[ax,ay,az]]);});}
            }
        };

        // ---- Orbit All + Item Orbit + Prefab Orbit ----
        F.tickOrbitAll = function() {
            if(!O.orbitAllOn)return;O.orbitAngle+=0.033;if(O.orbitAngle>6.28)O.orbitAngle-=6.28;
            const mp=F.readPos(F.headTf());if(!mp)return;const ot=F.getOtherPlayers();if(!ot.length)return;
            const r=4,st=(2*Math.PI)/ot.length;
            F.withBypass(()=>{for(let i=0;i<ot.length;i++){const a=O.orbitAngle+st*i;F.requestStateAuthoritySafe(ot[i]);F.actOnPlayer(ot[i],"RPC_Teleport",[[mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]]);}});
        };
        F.startItemOrbit = function() {
            F.stopItemOrbit();const p=F.readPos(F.headTf());if(!p){F.flash("no head");return;}
            const sp=[];for(let i=0;i<5;i++){const a=(2*Math.PI/5)*i;const o=F.spawnItem("item_rpg_ammo",[p.x+Math.cos(a)*2.5,p.y+0.5,p.z+Math.sin(a)*2.5],[0,0,0,1]);if(o&&!o.handle.isNull()){try{C.Object.method("DontDestroyOnLoad").invoke(o);}catch(_){}sp.push(o);}}
            if(!sp.length){F.flash("orbit failed");return;}O.itemOrbitObjs=sp;O.itemOrbitOn=true;O.itemOrbitAngle=0;F.flash(sp.length+"x RPG orbiting!");
        };
        F.stopItemOrbit = function() { for(const o of O.itemOrbitObjs)F.destroySafe(o);O.itemOrbitObjs=[];O.itemOrbitOn=false; };
        F.tickItemOrbit = function() {
            if(!O.itemOrbitOn||!O.itemOrbitObjs.length)return;O.itemOrbitAngle+=0.04;if(O.itemOrbitAngle>6.28)O.itemOrbitAngle-=6.28;
            const mp=F.readPos(F.headTf());if(!mp)return;const r=2.5,st=(2*Math.PI)/O.itemOrbitObjs.length,alive=[];
            for(let i=0;i<O.itemOrbitObjs.length;i++){const o=O.itemOrbitObjs[i];try{if(!o||o.handle.isNull())continue;const a=O.itemOrbitAngle+st*i;F.getTransform(o).method("set_position").invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);alive.push(o);}catch(_){}}
            O.itemOrbitObjs=alive;if(!alive.length)O.itemOrbitOn=false;
        };
        F.tickPrefabOrbit = function() {
            if(!O.prefabOrbitOn) return;
            O.prefabOrbitAngle+=0.03;if(O.prefabOrbitAngle>6.28)O.prefabOrbitAngle-=6.28;
            const mp=F.readPos(F.headTf());if(!mp)return;
            O.prefabOrbitCd--;
            if(O.prefabOrbitCd<=0 && O.prefabOrbitObjs.length<8){
                O.prefabOrbitCd = O.prefabOrbitRate;
                const name = O.PREFAB_NAMES[O.prefabOrbitIdx];
                const a = (2*Math.PI/8)*O.prefabOrbitObjs.length;
                const obj = F.spawnNetworkPrefab(name,[mp.x+Math.cos(a)*3,mp.y+0.5,mp.z+Math.sin(a)*3],[0,0,0,1]);
                if(obj&&!obj.handle.isNull()){try{C.Object.method("DontDestroyOnLoad").invoke(obj);}catch(_){}O.prefabOrbitObjs.push(obj);}
            }
            const r=3,st=(2*Math.PI)/Math.max(1,O.prefabOrbitObjs.length),alive=[];
            for(let i=0;i<O.prefabOrbitObjs.length;i++){const o=O.prefabOrbitObjs[i];try{if(!o||o.handle.isNull())continue;const a=O.prefabOrbitAngle+st*i;F.getTransform(o).method("set_position").invoke([mp.x+Math.cos(a)*r,mp.y+0.5,mp.z+Math.sin(a)*r]);alive.push(o);}catch(_){}}
            O.prefabOrbitObjs=alive;
        };
        F.stopPrefabOrbit = function(){for(const o of O.prefabOrbitObjs)F.destroySafe(o);O.prefabOrbitObjs=[];O.prefabOrbitOn=false;};

        // ---- Mob Spawner ----
        F.spawnMobDelayed = function(mobID) { O.mobSpawnDelay = 60 + Math.floor(Math.random()*120); O.mobSpawnQueued = mobID; F.flash("Mob queued: " + mobID + " (" + Math.round(O.mobSpawnDelay/60) + "s)"); };
        F.tickMobSpawn = function() {
            if (!O.mobSpawnQueued) return; O.mobSpawnDelay--;
            if (O.mobSpawnDelay <= 0) { const id = O.mobSpawnQueued; O.mobSpawnQueued = null;
                const p=F.readPos(F.headTf()),fwd=F.readFwd(F.headTf());
                if(p&&fwd){const dist=8+Math.random()*7,angle=Math.random()*Math.PI*2;
                    const r=F.spawnMob(id,[p.x+Math.cos(angle)*dist,p.y,p.z+Math.sin(angle)*dist],[0,0,0,1]);F.flash(r?"Mob spawned: "+id:"Mob failed: "+id);}
            }
        };

        // ---- Name Mods ----
        F.setName = function(nameStr) {
            try { const lp=F.localPlayer(); if(!lp){F.flash("no local player");return;}
                if(!O.savedName){try{O.savedName=lp.method("get_displayName").invoke().toString();}catch(_){O.savedName="Player";}}
                if(nameStr==="RESET"){lp.method("set_displayName").invoke(Il2Cpp.string(O.savedName));F.flash("Name reset");}
                else{lp.method("set_displayName").invoke(Il2Cpp.string(nameStr));F.flash("Name changed!");}
            } catch(e){log("name: "+e);F.flash("name failed");}
        };

        // ---- Soundboard ----
        F.ensureSoundsPath = function() {
            if (O.soundsPath) return O.soundsPath;
            if (!C.Directory) { log("[SOUNDS] No Directory class"); return null; }
            const candidates = [];
            if (C.Application) { try { const pData=C.Application.method("get_persistentDataPath").invoke(); if(pData&&!pData.handle.isNull()){let base=pData.toString().replace(/\\/g,"/");if(!base.endsWith("/"))base+="/";candidates.push(base+"Sounds/");} } catch(_){} }
            try { if(typeof __filename!=="undefined"&&__filename){const ls=Math.max(__filename.lastIndexOf('/'),__filename.lastIndexOf('\\'));if(ls!==-1)candidates.push(__filename.substring(0,ls+1)+"Sounds/");} } catch(_){}
            candidates.push("C:/OrbitMenu/Sounds/");
            for (const path of candidates) {
                try { const pathStr=Il2Cpp.string(path); if(!C.Directory.method("Exists").invoke(pathStr)){C.Directory.method("CreateDirectory").invoke(pathStr);} O.soundsPath=path;log("[SOUNDS] Using: "+path);return path; } catch(e){log("[SOUNDS] Path failed: "+path+" — "+e);}
            }
            return null;
        };
        F.refreshSoundList = function() {
            const path=F.ensureSoundsPath(); if(!path){F.flash("No Sounds folder");return;}
            try {
                const pathStr=Il2Cpp.string(path);
                if(!C.Directory.method("Exists").invoke(pathStr)){C.Directory.method("CreateDirectory").invoke(pathStr);}
                let rawFiles=null; try{rawFiles=C.Directory.method("GetFiles",1).invoke(pathStr);}catch(_){}
                const next=[];
                if(rawFiles&&!rawFiles.handle.isNull()&&rawFiles.length>0){for(let i=0;i<rawFiles.length;i++){try{const fp=rawFiles.get(i).toString(),low=fp.toLowerCase();if(!low.endsWith(".wav")&&!low.endsWith(".ogg")&&!low.endsWith(".mp3"))continue;const si=Math.max(fp.lastIndexOf('/'),fp.lastIndexOf('\\'));next.push(fp.substring(si+1));}catch(_){}}}
                if(next.length===0){for(const pat of["*.mp3","*.ogg","*.wav"]){try{const files=C.Directory.method("GetFiles",2).invoke(pathStr,Il2Cpp.string(pat));if(files&&!files.handle.isNull())for(let i=0;i<files.length;i++){try{const fp=files.get(i).toString(),si=Math.max(fp.lastIndexOf('/'),fp.lastIndexOf('\\'));next.push(fp.substring(si+1));}catch(_){}}}catch(_){}}}
                next.sort();O.soundFiles=next;O.soundIdx=0;
                F.flash(next.length?next.length+" sounds loaded":"No sounds in "+path);
            } catch(e){log("[SOUNDS] Refresh err: "+e);}
        };
        F.prepareSoundboard = function() {
            try{if(O.soundSource&&!O.soundSource.handle.isNull())return true;}catch(_){}
            if(!C.AudioSource){log("[SOUND] No AudioSource class");return false;}
            try{const gl=F.gorillaInst();if(!gl)return false;const go=gl.method("get_gameObject").invoke();
                let src=null;try{src=F.getComponent(go,C.AudioSource);}catch(_){}
                if(!src||src.handle.isNull())src=F.addComponent(go,C.AudioSource);if(!src||src.handle.isNull())return false;
                O.soundSource=src;try{src.method("set_playOnAwake").invoke(false);}catch(_){}try{src.method("set_loop").invoke(false);}catch(_){}try{src.method("set_spatialBlend").invoke(0.0);}catch(_){}try{src.method("set_volume").invoke(1.0);}catch(_){}
                log("[SOUND] AudioSource ready");return true;
            }catch(e){log("[SOUND] prep: "+e);return false;}
        };
        F.findPhotonRecorder = function() {
            if(O.photonRecorder&&!O.photonRecorder.handle.isNull())return O.photonRecorder;
            if(!C.Recorder)return null;
            try{const recs=C.Resources.method("FindObjectsOfTypeAll",1).inflate(C.Recorder).invoke();if(recs&&recs.length>0){O.photonRecorder=recs.get(0);return O.photonRecorder;}}catch(_){}
            return null;
        };
        F.trySetMember = function(obj, names, value) { for(const name of names){try{obj.method("set_"+name).invoke(value);return true;}catch(_){}try{obj.field(name).value=value;return true;}catch(_){}}return false; };
        F.playClipThroughRecorder = function(clip, fileName) {
            try{const recorder=F.findPhotonRecorder();if(!recorder||recorder.handle.isNull())return false;
                let ok=false;ok=F.trySetMember(recorder,["SourceType","sourceType","InputSourceType"],1)||ok;ok=F.trySetMember(recorder,["AudioClip","audioClip","clip"],clip)||ok;
                ok=F.trySetMember(recorder,["LoopAudioClip","loopAudioClip"],false)||ok;ok=F.trySetMember(recorder,["VoiceDetection","voiceDetection"],false)||ok;
                ok=F.trySetMember(recorder,["TransmitEnabled","transmitEnabled","RecordingEnabled","recordingEnabled"],true)||ok;
                try{recorder.method("RestartRecording",0).invoke();ok=true;}catch(_){}try{recorder.method("StartRecording",0).invoke();ok=true;}catch(_){}
                if(!ok)return false;
                try{O.soundSource.method("set_spatialBlend").invoke(0.0);O.soundSource.method("set_clip").invoke(clip);O.soundSource.method("set_volume").invoke(1.0);if(!O.soundSource.method("get_isPlaying").invoke())O.soundSource.method("Play").invoke();}catch(_){}
                return true;
            }catch(e){log("[SOUND] Mic route failed: "+e);return false;}
        };
        F.getAudioType = function(name) { const l=(name||"").toLowerCase();if(l.endsWith(".mp3"))return 13;if(l.endsWith(".ogg"))return 14;return 20; };
        F.getSoundFileUrl = function(path, fileName) { let fp=(path||"")+(fileName||"");fp=fp.replace(/\\/g,"/");if(!fp.startsWith("/"))fp="/"+fp;return encodeURI("file://"+fp).replace(/#/g,"%23"); };
        F.playSound = function(fileName, useMic) {
            if(!O._webReqMultiImage){F.flash("No audio module");return;}
            const path=F.ensureSoundsPath();if(!path||!fileName)return;if(!F.prepareSoundboard()){F.flash("AudioSource failed");return;}
            try{if(O.soundReq&&!O.soundReq.handle.isNull()){try{O.soundReq.method("Abort").invoke();}catch(_){}try{O.soundReq.method("Dispose").invoke();}catch(_){}}}catch(_){}
            try{
                const url=F.getSoundFileUrl(path,fileName);log("[SOUND] Loading: "+url);
                let UWRMulti=null;try{UWRMulti=O._webReqMultiImage.class("UnityEngine.Networking.UnityWebRequestMultimedia");}catch(_){}
                if(!UWRMulti){F.flash("No UWR Multimedia class");return;}
                const req=UWRMulti.method("GetAudioClip",2).invoke(Il2Cpp.string(url),F.getAudioType(fileName));
                req.method("SendWebRequest").invoke();O.soundReq=req;O.soundReqKind="uwr";O.soundPending=fileName;O.soundUseMic=!!useMic;
                try{O.soundSource.method("set_spatialBlend").invoke(useMic?1.0:0.0);}catch(_){}
                F.flash("Loading: "+fileName+(useMic?" (Mic)":""));
            }catch(e){log("[SOUND] play: "+e);F.flash("Sound error: "+e.message);}
        };
        F.tickSoundboard = function() {
            if(!O.soundReq||O.soundReq.handle.isNull())return;
            try{if(!O.soundReq.method("get_isDone").invoke())return;}catch(_){return;}
            const req=O.soundReq,pending=O.soundPending,useMic=O.soundUseMic;O.soundReq=null;O.soundPending="";O.soundUseMic=false;
            try{let clip=null;
                try{const DHAClip=O._webReqMultiImage.class("UnityEngine.Networking.DownloadHandlerAudioClip");if(DHAClip){clip=DHAClip.method("GetContent",1).invoke(req);if(clip&&clip.handle.isNull())clip=null;}}catch(_){}
                if(!clip){try{const handler=req.method("get_downloadHandler").invoke();if(handler&&!handler.handle.isNull()){try{clip=handler.method("get_audioClip").invoke();}catch(_){}if(!clip||clip.handle.isNull())try{clip=handler.method("GetAudioClip").invoke();}catch(_){}}}catch(_){}}
                if(clip&&!clip.handle.isNull()&&O.soundSource&&!O.soundSource.handle.isNull()){O.soundSource.method("set_clip").invoke(clip);O.soundSource.method("Play").invoke();
                    const micOk=useMic?F.playClipThroughRecorder(clip,pending):false;F.flash((micOk?"Playing (mic+headset): ":"Playing: ")+pending);}
                else{try{const err=req.method("get_error").invoke();if(err&&!err.handle.isNull())log("[SOUND] Request error: "+err.toString());}catch(_){}F.flash("Failed to load: "+pending);}
            }catch(e){log("[SOUND] load: "+e);}
            try{req.method("Dispose").invoke();}catch(_){}
        };

        log("Phase 5 done — all features defined");
        O.initPhase = 6;
    }

    // ==============================================================
    //  PHASE 6 — Initialize state + build menu system → go live
    // ==============================================================
    function phase6_menu() {
        const C = O.CL, F = O.fn;

        // ---- Initialize remaining state ----
        Object.assign(O, {
            menuInited: false, menuGO: null, menuText: null, buildFailed: false,
            cursor: 0, tab: "main", page: 0,
            joyCd: 0, selWas: false,
            flyOn: O.flyOn||false, platformsOn: O.platformsOn||false, orbitAllOn: O.orbitAllOn||false,
            itemGunOn: O.itemGunOn||false, tpGunOn: O.tpGunOn||false, kickGunOn: O.kickGunOn||false,
            snowballOn: O.snowballOn||false,
            invincibleOn: O.invincibleOn||false, invisibleOn: O.invisibleOn||false,
            noRedWatchOn: O.noRedWatchOn||false, longArmsOn: O.longArmsOn||false,
            shieldOn: O.shieldOn||false,
            antiModderOn: O.antiModderOn||false,
            savedGravity: null,
            platL: null, platR: null, platLLatched: false, platRLatched: false,
            gunLine: null, gunPointer: null, gunCd: 0,
            snowballIdx: O.snowballIdx||0, snowballCd: 0,
            orbitAngle: 0,
            itemOrbitOn: O.itemOrbitOn||false, itemOrbitObjs: O.itemOrbitObjs||[], itemOrbitAngle: 0,
            prefabOrbitOn: O.prefabOrbitOn||false, prefabOrbitIdx: O.prefabOrbitIdx||0,
            prefabOrbitRate: O.prefabOrbitRate||60, prefabOrbitObjs: O.prefabOrbitObjs||[],
            prefabOrbitAngle: 0, prefabOrbitCd: 0,
            mobSpawnIdx: O.mobSpawnIdx||0, mobSpawnDelay: 0,
            soundsPath: null, soundFiles: [], soundIdx: 0,
            soundSource: null, soundReq: null, soundReqKind: "", soundPending: "",
            soundUseMic: false, photonRecorder: null,
            savedName: null,
            selfBypass: false,
            playerPositions: O.playerPositions||{}, detectedModders: O.detectedModders||{},
            actionMsg: "", actionTick: 0,
            lastLog: 0, lastText: "", headWaitTick: 0,
            deltaTime: 0, lastTime: 0,
            _cacheDirty: true, _cachedItems: null, _cacheTab: "", _cachePage: -1,
        });

        // ---- Menu system functions ----
        const PER_PAGE = 6;
        F.menuItems = function() {
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
                ...Object.entries(O.TELEPORT_LOCS).map(([n,p])=>({l:"TP: "+n,t:"act",fn:()=>{try{F.withBypass(()=>{F.localPlayer().method("RPC_Teleport").invoke(p);});F.flash("TP "+n);}catch(_){F.flash("tp err");}}}))];
            case "spawn": return F.buildListPage(O.ALL_ITEMS,"item",id=>id.replace("item_",""));
            case "gun": return [{l:"< Back",t:"back"},
                {l:"Item Gun (grip+trigger)",t:"tog",k:"itemGunOn"},
                {l:"TP Gun (grip+trigger)",t:"tog",k:"tpGunOn"},
                {l:"Kick Gun (grip+trigger)",t:"tog",k:"kickGunOn"},
                {l:"<color=#44ccff>Snowball Launcher</color>",t:"tog",k:"snowballOn"},
                {l:"Snowball Type: "+O.SNOWBALL_ITEMS[O.snowballIdx].replace("item_",""),t:"act",fn:()=>{
                    O.snowballIdx=(O.snowballIdx+1)%O.SNOWBALL_ITEMS.length;
                    F.flash("Ammo: "+O.SNOWBALL_ITEMS[O.snowballIdx].replace("item_",""));
                }},
            ];
            case "player": return [{l:"< Back",t:"back"},
                {l:"Invincible",t:"tog",k:"invincibleOn"},
                {l:"Invisible",t:"tog",k:"invisibleOn"},
                {l:"No Red Watch",t:"tog",k:"noRedWatchOn"},
                {l:"RPC Shield (Anti-Kick)",t:"tog",k:"shieldOn"},
                {l:"<color=#ff4444>Anti-Modder (Abyss TP)</color>",t:"tog",k:"antiModderOn"},
                {l:"Clear Modder List",t:"act",fn:()=>{O.detectedModders={};F.flash("Modder list cleared");}},
            ];
            case "op": return [{l:"< Back",t:"back"},
                {l:"Orbit All",t:"tog",k:"orbitAllOn"},
                {l:"TP All to Me",t:"act",fn:F.actTpAll},
                {l:"Yeet All",t:"act",fn:F.actYeetAll},
                {l:"Stink All",t:"act",fn:F.actStinkAll},
                {l:"Color All",t:"act",fn:F.actColorAll},
                {l:"Void All",t:"act",fn:F.actVoidAll},
                {l:"Money All $99999",t:"act",fn:F.actMoneyAll},
                {l:"Stun All 30s",t:"act",fn:F.actStunAll},
                {l:"<color=#ff0000>Kick All</color>",t:"act",fn:F.actKickAll},
            ];
            case "prefabs": return F.buildPrefabPage();
            case "mobs": return F.buildMobPage();
            case "names": return [{l:"< Back",t:"back"},
                ...O.NAME_PRESETS.map(n=>({l:n.l,t:"act",fn:()=>F.setName(n.v)}))];
            case "sound": return F.buildSoundPage();
            default: return [];
            }
        };
        F.buildListPage = function(list,type,fmt) {
            const tp=Math.max(1,Math.ceil(list.length/PER_PAGE)),pg=Math.min(O.page,tp-1),s=pg*PER_PAGE,e=Math.min(s+PER_PAGE,list.length);
            const its=[{l:"< Back",t:"back"}];
            for(let i=s;i<e;i++){const id=list[i];its.push({l:fmt?fmt(id):id,t:"act",fn:(function(x){return function(){F.spawnInFront(type,x);};})(id)});}
            if(pg>0)its.push({l:"◀ Prev",t:"act",fn:()=>{O.page--;O.cursor=1;}});
            if(e<list.length)its.push({l:"Next ▶",t:"act",fn:()=>{O.page++;O.cursor=1;}});
            return its;
        };
        F.buildPrefabPage = function() {
            const tp=Math.max(1,Math.ceil(O.PREFAB_NAMES.length/PER_PAGE)),pg=Math.min(O.page,tp-1),s=pg*PER_PAGE,e=Math.min(s+PER_PAGE,O.PREFAB_NAMES.length);
            const its=[{l:"< Back",t:"back"}];
            its.push({l:"Prefab Orbit: "+(O.prefabOrbitOn?"ON":"OFF")+" ["+O.PREFAB_NAMES[O.prefabOrbitIdx]+"]",t:"act",fn:()=>{
                if(O.prefabOrbitOn){F.stopPrefabOrbit();F.flash("Prefab Orbit OFF");}
                else{O.prefabOrbitOn=true;O.prefabOrbitCd=0;F.flash("Orbiting: "+O.PREFAB_NAMES[O.prefabOrbitIdx]);}
            }});
            its.push({l:"Orbit Prefab: "+O.PREFAB_NAMES[O.prefabOrbitIdx],t:"act",fn:()=>{
                O.prefabOrbitIdx=(O.prefabOrbitIdx+1)%O.PREFAB_NAMES.length;F.flash("Selected: "+O.PREFAB_NAMES[O.prefabOrbitIdx]);
            }});
            for(let i=s;i<e;i++){const id=O.PREFAB_NAMES[i];its.push({l:id,t:"act",fn:(function(x){return function(){F.spawnInFront("prefab",x);};})(id)});}
            if(pg>0)its.push({l:"◀ Prev",t:"act",fn:()=>{O.page--;O.cursor=1;}});
            if(e<O.PREFAB_NAMES.length)its.push({l:"Next ▶",t:"act",fn:()=>{O.page++;O.cursor=1;}});
            return its;
        };
        F.buildMobPage = function() {
            const its=[{l:"< Back",t:"back"}];
            its.push({l:"<color=#88ff88>Stealth mode (delayed spawn)</color>",t:"act",fn:()=>{}});
            for(const id of O.MOB_IDS){its.push({l:id.replace("Controller",""),t:"act",fn:(function(x){return function(){F.spawnMobDelayed(x);};})(id)});}
            return its;
        };
        F.buildSoundPage = function() {
            const its=[{l:"< Back",t:"back"}];
            its.push({l:"Refresh Sounds",t:"act",fn:F.refreshSoundList});
            its.push({l:"Stop Sound",t:"act",fn:()=>{
                try{if(O.soundSource)O.soundSource.method("Stop").invoke();}catch(_){}
                try{const rec=F.findPhotonRecorder();if(rec){F.trySetMember(rec,["TransmitEnabled","transmitEnabled","RecordingEnabled","recordingEnabled"],false);}}catch(_){}
                F.flash("Stopped");
            }});
            if(O.soundFiles.length===0){
                its.push({l:"(put .wav/.ogg/.mp3 in Sounds folder)",t:"act",fn:()=>{const p=F.ensureSoundsPath();F.flash("Path: "+(p||"unknown"));}});
            } else {
                const tp=Math.max(1,Math.ceil(O.soundFiles.length/PER_PAGE)),pg=Math.min(O.page,tp-1),s=pg*PER_PAGE,e=Math.min(s+PER_PAGE,O.soundFiles.length);
                for(let i=s;i<e;i++){const f=O.soundFiles[i];its.push({l:"♫ "+f,t:"act",fn:(function(x){return function(){F.playSound(x,false);};})(f)});}
                its.push({l:"\u{1F3A4} Play Through Mic",t:"act",fn:()=>{if(O.soundFiles.length>0)F.playSound(O.soundFiles[Math.min(O.soundIdx,O.soundFiles.length-1)],true);else F.flash("No sounds loaded");}});
                if(pg>0)its.push({l:"◀ Prev",t:"act",fn:()=>{O.page--;O.cursor=1;}});
                if(e<O.soundFiles.length)its.push({l:"Next ▶",t:"act",fn:()=>{O.page++;O.cursor=1;}});
            }
            return its;
        };

        // ---- Menu cache ----
        F.invalidateMenu = function() { O._cacheDirty = true; };
        F.getCachedItems = function() {
            if (!O._cacheDirty && O._cachedItems && O._cacheTab === O.tab && O._cachePage === O.page) return O._cachedItems;
            O._cachedItems = F.menuItems();
            O._cacheTab = O.tab; O._cachePage = O.page; O._cacheDirty = false;
            return O._cachedItems;
        };

        // ---- VR Text Rendering ----
        F.tabTitle = function() {
            const m={"move":" > Move","spawn":" > Items","gun":" > <color=#ff8800>Guns</color>","player":" > Player","op":" > <color=#ff3333>OP</color>","prefabs":" > <color=#55ccff>Prefabs</color>","mobs":" > <color=#88ff88>Mobs</color>","names":" > <color=#ffcc00>Names</color>","sound":" > <color=#ff66ff>Sound</color>"};
            return m[O.tab]||"";
        };
        F.renderVRText = function() {
            const its=F.getCachedItems();
            const L=["<b><color=#bb88ff>Orbit Menu V7.2"+F.tabTitle()+"</color></b>",""];
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
        };

        // ---- VR Input ----
        F.processVRInput = function() {
            const y=F.joyY(1),its=F.getCachedItems();
            if(O.joyCd>0)O.joyCd--;
            else{if(y<-0.55&&O.cursor<its.length-1){O.cursor++;O.joyCd=18;}else if(y>0.55&&O.cursor>0){O.cursor--;O.joyCd=18;}}
            const selNow=F.bBtn(1)||F.trigger(1),press=selNow&&!O.selWas;O.selWas=selNow;
            if(press&&O.cursor<its.length) F.activateItem(its[O.cursor]);
        };
        F.activateItem = function(it) {
            if(it.t==="tab"){O.tab=it.to;O.cursor=0;O.page=0;F.invalidateMenu();}
            else if(it.t==="back"){O.tab="main";O.cursor=0;O.page=0;F.invalidateMenu();}
            else if(it.t==="tog"){O[it.k]=!O[it.k];F.onToggle(it.k,O[it.k]);F.invalidateMenu();}
            else if(it.t==="act"){try{it.fn();}catch(e){F.flash("err: "+e.message);}F.invalidateMenu();}
        };
        F.onToggle = function(k,on) {
            if(k==="flyOn")F.toggleFly(on);
            if(k==="platformsOn"&&!on){F.destroySafe(O.platL);O.platL=null;O.platLLatched=false;F.destroySafe(O.platR);O.platR=null;O.platRLatched=false;}
            if(k==="itemGunOn"){O.gunCd=0;if(!on)F.hideGun();if(on){O.tpGunOn=false;O.kickGunOn=false;O.snowballOn=false;}}
            if(k==="tpGunOn"){O.gunCd=0;if(!on)F.hideGun();if(on){O.itemGunOn=false;O.kickGunOn=false;O.snowballOn=false;}}
            if(k==="kickGunOn"){O.gunCd=0;if(!on)F.hideGun();if(on){O.itemGunOn=false;O.tpGunOn=false;O.snowballOn=false;}}
            if(k==="snowballOn"){if(on){O.itemGunOn=false;O.tpGunOn=false;O.kickGunOn=false;F.hideGun();}}
            if(k==="itemOrbitOn"){if(on)F.startItemOrbit();else F.stopItemOrbit();}
            if(k==="invincibleOn")F.toggleInvincible(on);
            if(k==="invisibleOn")F.toggleInvisible(on);
            if(k==="noRedWatchOn")F.toggleNoRedWatch(on);
            if(k==="longArmsOn")F.toggleLongArms(on);
            if(k==="orbitAllOn")F.flash(on?"Orbit All ON":"Orbit All OFF");
            if(k==="shieldOn"){if(on)F.installShield();else F.flash("Shield stays active (hooks can't be removed)");}
            if(k==="antiModderOn"){O.detectedModders={};O.playerPositions={};F.flash(on?"Anti-Modder ON — watching...":"Anti-Modder OFF");}
        };

        // ---- VR Menu Build ----
        F.initMenu = function() {
            if(O.menuInited||O.buildFailed) return;
            try {
                const head=F.headTf();
                if(!head){if(O.tick-O.headWaitTick>=300){O.headWaitTick=O.tick;log("waiting for head...");}return;}
                let font=null;
                try{const fonts=C.Resources.method("FindObjectsOfTypeAll",1).invoke(C.Font.type);for(let i=0;i<fonts.length;i++){try{if(fonts.get(i).method("get_name").invoke().toString()==="Utopium"){font=fonts.get(i);break;}}catch(_){}}}catch(_){}
                if(!font)try{font=C.Resources.method("GetBuiltinResource",2).invoke(C.Font.type.object,Il2Cpp.string("Arial.ttf"));}catch(_){}
                log("building VR menu...");
                const mGO=C.GameObject.method("CreatePrimitive").invoke(3);
                mGO.method("set_name").invoke(Il2Cpp.string("[Orbit Menu]"));
                try{F.getComponent(mGO,C.Renderer).method("set_enabled").invoke(false);}catch(_){}
                try{const c=F.getComponent(mGO,C.Collider);if(c)F.destroySafe(c);}catch(_){}
                F.getTransform(mGO).method("SetParent",2).invoke(head,false);
                F.getTransform(mGO).method("set_localPosition").invoke([-0.15,0,0.45]);
                F.getTransform(mGO).method("set_localRotation").invoke([0,0,0,1]);
                F.getTransform(mGO).method("set_localScale").invoke([1e-3,1e-3,1e-3]);
                const cv=F.addComponent(mGO,C.Canvas);cv.method("set_renderMode").invoke(2);
                const tGO=C.GameObject.method("CreatePrimitive").invoke(3);
                tGO.method("set_name").invoke(Il2Cpp.string("[Orbit Text]"));
                try{F.getComponent(tGO,C.Renderer).method("set_enabled").invoke(false);}catch(_){}
                try{const c=F.getComponent(tGO,C.Collider);if(c)F.destroySafe(c);}catch(_){}
                F.getTransform(tGO).method("SetParent",2).invoke(F.getTransform(mGO),false);
                const mt=F.addComponent(tGO,C.Text);
                if(font)mt.method("set_font").invoke(font);
                mt.method("set_supportRichText").invoke(true);mt.method("set_fontSize").invoke(14);mt.method("set_alignment").invoke(0);mt.method("set_resizeTextForBestFit").invoke(false);mt.method("set_fontStyle").invoke(1);
                try{const rt=F.getComponent(tGO,C.RectTransform);rt.method("set_anchorMin").invoke([0,1]);rt.method("set_anchorMax").invoke([0,1]);rt.method("set_pivot").invoke([0,1]);rt.method("set_anchoredPosition").invoke([0,0]);rt.method("set_sizeDelta").invoke([400,800]);}catch(_){}
                C.Object.method("DontDestroyOnLoad").invoke(mGO);
                O.menuGO=mGO;O.menuText=mt;O.menuInited=true;
                F.ensureSoundsPath();
                F.refreshSoundList();
                log("MENU BUILT");
                F.setText(F.renderVRText());
            } catch(e){O.buildFailed=true;log("BUILD FAILED: "+(e.stack||e.message||e));}
        };
        F.setText = function(s) {
            if(!O.menuText||s===O.lastText)return;O.lastText=s;
            try{O.menuText.method("set_text").invoke(Il2Cpp.string(s));}catch(e){log("setText: "+e);O.menuGO=null;O.menuText=null;O.menuInited=false;}
        };

        log("Phase 6 done — menu system ready, going live!");
        log("===== Orbit Menu V7.2 READY =====");
        log("Features: Shield, RPC Bypass, Kick/TP/Item Gun, Snowball, Anti-Modder, Names, Soundboard");
        O.initPhase = 99;  // Normal operation
    }

    // ==============================================================
    //  NORMAL TICK (phase 99)
    // ==============================================================
    function onTick() {
        const C = O.CL, F = O.fn;
        O.tick++;

        // Time sampling every 5 ticks
        if(O.tick%5===0){try{const t=C.Time.method("get_time").invoke();O.deltaTime=(t-O.lastTime)/5;O.lastTime=t;if(O.deltaTime>0.1)O.deltaTime=0.016;}catch(_){O.deltaTime=0.016;}}

        // Menu init (deferred until head exists)
        if(!O.menuInited&&!O.buildFailed){if(O.tick%30===0)F.initMenu();return;}
        if(!O.menuInited) return;

        // ---- EVERY TICK: critical input + active features ----
        F.processVRInput();
        if(O.flyOn) F.tickFly();
        if(O.platformsOn) F.tickPlatforms();

        // ---- EVERY 2 TICKS: guns ----
        if(O.tick%2===0){
            if(O.itemGunOn) F.tickItemGun();
            else if(O.tpGunOn) F.tickTPGun();
            else if(O.kickGunOn) F.tickKickGun();
            else if(O.snowballOn) F.tickSnowball();
            else F.hideGun();
        }

        // ---- EVERY 3 TICKS: orbit, menu text ----
        if(O.tick%3===0){
            if(O.orbitAllOn) F.tickOrbitAll();
            if(O.itemOrbitOn) F.tickItemOrbit();
            if(O.prefabOrbitOn) F.tickPrefabOrbit();
            F.setText(F.renderVRText());
        }

        // ---- EVERY 10 TICKS: slow stuff ----
        if(O.tick%10===0){
            F.tickMobSpawn();
            F.tickSoundboard();
            if(O.noRedWatchOn) F.toggleNoRedWatch(true);
        }

        // ---- EVERY 90 TICKS: anti-modder ----
        if(O.tick%90===0) F.tickAntiModder();

        if(O.tick-O.lastLog>=300){O.lastLog=O.tick;log("t="+O.tick+" fly="+O.flyOn+" guns="+O.itemGunOn+"/"+O.tpGunOn+"/"+O.kickGunOn+"/"+O.snowballOn+" shield="+O.shieldOn+" antimod="+O.antiModderOn);}
    }

    // ==============================================================
    //  INSTALL HOOK — this is the ONLY thing that runs in Il2Cpp.perform
    // ==============================================================
    if(!O.hookInstalled){
        let tgt=null;
        try { tgt=GorillaLocomotionClass.method("OnUpdate"); } catch(_){}
        if(!tgt) try { tgt=GorillaLocomotionClass.method("FixedUpdate"); } catch(_){}
        if(!tgt) try { tgt=GorillaLocomotionClass.method("Update"); } catch(_){}
        if(!tgt) try { tgt=GorillaLocomotionClass.method("LateUpdate"); } catch(_){}
        if(!tgt){log("ERROR: no update method");}
        else{
            Interceptor.attach(tgt.virtualAddress,{onEnter(){try{masterTick();}catch(e){if(O.tick%600===0)log("tick err: "+e);}}});
            O.hookInstalled=true;
            log("hook on GorillaLocomotion."+tgt.name+" — phased init starting (NO FREEZE)");
        }
    }
    log("Il2Cpp.perform done instantly — init spreads across frames");
});
}, 5000);
