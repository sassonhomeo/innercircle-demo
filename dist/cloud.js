(() => {
  const SUPABASE_URL = "https://fwmcujjzdcwqrddgejid.supabase.co";
  const SUPABASE_KEY = "sb_publishable_IA-iZFBxl_V24x8Z9Vtziw_Lm6ZWxCF";
  const KEYS = { posts:"my-aliyah-posts-v1", settings:"my-aliyah-settings-v1", journal:"my-aliyah-journal-v1" };
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let user = null, ready = false, syncChain = Promise.resolve(), timers = {};

  const esc = (v="") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const originalSet = Storage.prototype.setItem;

  function authScreen(message=""){
    document.body.innerHTML = `<main class="auth-page">
      <section class="auth-card">
        <p class="auth-brand">My Aliyah Journal+</p>
        <h1>Welcome</h1>
        <p class="auth-intro">Sign in to keep your posts, photographs, journal and shipment information private and available on all your devices.</p>
        <button id="googleSignIn" class="secondary-button auth-secondary" type="button">Continue with Google</button>
        <p class="auth-message" style="margin:14px 0 8px">or sign in with email</p>
        <form id="authForm">
          <label>Email address<input id="authEmail" type="email" required autocomplete="email"></label>
          <label>Password<input id="authPassword" type="password" required minlength="8" autocomplete="current-password"></label>
          <button class="primary-button" type="submit">Sign in</button>
        </form>
        <button id="createAccount" class="secondary-button auth-secondary">Create an account</button>
        <p id="authMessage" class="auth-message" aria-live="polite">${esc(message)}</p>
      </section>
    </main>`;
    document.querySelector("#googleSignIn").addEventListener("click", async () => {
      setMessage("Opening Google sign in…");
      const { error } = await client.auth.signInWithOAuth({
        provider:"google",
        options:{ redirectTo:location.origin + location.pathname }
      });
      if(error) setMessage(error.message, true);
    });
    document.querySelector("#authForm").addEventListener("submit", async e => {
      e.preventDefault();
      setMessage("Signing in…");
      const email=document.querySelector("#authEmail").value.trim(), password=document.querySelector("#authPassword").value;
      const { error } = await client.auth.signInWithPassword({email,password});
      if(error) return setMessage(error.message, true);
      location.reload();
    });
    document.querySelector("#createAccount").addEventListener("click", async () => {
      const email=document.querySelector("#authEmail").value.trim(), password=document.querySelector("#authPassword").value;
      if(!email || password.length<8) return setMessage("Enter your email and a password of at least 8 characters.", true);
      setMessage("Creating your account…");
      const { data, error } = await client.auth.signUp({email,password,options:{emailRedirectTo:location.href}});
      if(error) return setMessage(error.message, true);
      if(data.session) location.reload();
      else setMessage("Check your email and click the confirmation link. Then return here and sign in.");
    });
  }
  function setMessage(text, bad=false){ const el=document.querySelector("#authMessage"); if(el){el.textContent=text;el.classList.toggle("error",bad);} }

  async function signedPhoto(path){
    if(!path) return "";
    const {data}=await client.storage.from("journal-photos").createSignedUrl(path,3600);
    return data?.signedUrl || "";
  }

  async function loadCloud(){
    const [{data:profile},{data:entries},{data:photos},{data:shipment}] = await Promise.all([
      client.from("profiles").select("*").eq("id",user.id).maybeSingle(),
      client.from("entries").select("*").eq("user_id",user.id).order("occurred_at",{ascending:false}),
      client.from("photos").select("*").eq("user_id",user.id),
      client.from("shipments").select("*").eq("user_id",user.id).maybeSingle()
    ]);
    const photoMap={};
    for(const p of photos||[]) (photoMap[p.entry_id] ||= []).push(p);
    const posts=[], journal=[];
    for(const e of entries||[]){
      if(e.entry_type==="post"){
        const photo=(photoMap[e.id]||[]).sort((a,b)=>a.sort_order-b.sort_order)[0];
        posts.push({id:e.id,text:e.body,image:photo?await signedPhoto(photo.storage_path):"",_storagePath:photo?.storage_path||"",mood:e.mood||"",createdAt:e.occurred_at,timestamp:"",saved:e.is_saved});
      } else {
        journal.push({id:e.id,title:e.title||"",body:e.body,createdAt:e.occurred_at,date:""});
      }
    }
    const settings={name:profile?.display_name||user.user_metadata?.full_name||user.email.split("@")[0],theme:profile?.theme||"navy",setupComplete:true,pin:"",aliyahDate:profile?.aliyah_date||""};
    originalSet.call(localStorage,KEYS.posts,JSON.stringify(posts));
    originalSet.call(localStorage,KEYS.journal,JSON.stringify(journal));
    originalSet.call(localStorage,KEYS.settings,JSON.stringify(settings));
    window.myAliyahShipment=shipment||null;
  }

  async function dataUrlBlob(url){ return await (await fetch(url)).blob(); }
  async function syncEntries(type, items){
    const {data:old}=await client.from("entries").select("id").eq("user_id",user.id).eq("entry_type",type);
    const oldIds=(old||[]).map(x=>x.id);
    if(oldIds.length) await client.from("entries").delete().in("id",oldIds);
    if(!items.length) return;
    const rows=items.map(x=>({id:x.id,user_id:user.id,entry_type:type,title:type==="journal"?(x.title||null):null,body:type==="post"?(x.text||""):(x.body||""),mood:type==="post"?(x.mood||null):null,is_saved:type==="post"?!!x.saved:false,occurred_at:x.createdAt||new Date().toISOString()}));
    const {error}=await client.from("entries").insert(rows);
    if(error) throw error;
    if(type==="post"){
      for(const item of items.filter(x=>x.image)){
        let path=item._storagePath||"";
        if(item.image.startsWith("data:")){
          path=`${user.id}/${item.id}.jpg`;
          const {error:uploadError}=await client.storage.from("journal-photos").upload(path,await dataUrlBlob(item.image),{contentType:"image/jpeg",upsert:true});
          if(uploadError) throw uploadError;
        }
        if(path) await client.from("photos").insert({user_id:user.id,entry_id:item.id,storage_path:path});
      }
    }
  }
  async function syncSettings(){
    const s=read(KEYS.settings,{});
    const {error}=await client.from("profiles").upsert({id:user.id,display_name:s.name||"",aliyah_date:s.aliyahDate||null,theme:s.theme||"navy",updated_at:new Date().toISOString()});
    if(error) throw error;
  }
  function schedule(key){
    if(!ready || !user) return;
    clearTimeout(timers[key]);
    timers[key]=setTimeout(()=>{
      syncChain=syncChain.then(async()=>{
        if(key===KEYS.posts) await syncEntries("post",read(key,[]));
        if(key===KEYS.journal) await syncEntries("journal",read(key,[]));
        if(key===KEYS.settings) await syncSettings();
      }).catch(err=>{ console.error(err); alert("My Aliyah could not save to the cloud. Please check your connection and try again."); });
    },500);
  }
  Storage.prototype.setItem=function(key,value){ originalSet.call(this,key,value); schedule(key); };

  function addAccountControls(){
    const observer=new MutationObserver(()=>{
      const card=document.querySelector(".settings-card");
      if(!card || card.querySelector("#cloudAccount")) return;
      const block=document.createElement("div");
      block.className="setting-block";
      block.id="cloudAccount";
      block.innerHTML=`<label>Signed-in account</label><p>${esc(user.email)}</p><button id="signOutCloud" class="secondary-button">Sign out</button>`;
      card.prepend(block);
      block.querySelector("#signOutCloud").onclick=async()=>{await client.auth.signOut();location.reload();};
      document.querySelectorAll(".signin-options,.preview-label").forEach(el=>el.remove());
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function loadApp(){
    const script=document.createElement("script");
    script.src="app.js";
    script.onload=()=>{ ready=true; addAccountControls(); };
    document.body.appendChild(script);
  }

  async function start(){
    if(!window.supabase) return authScreen("The secure connection could not load. Please refresh.");
    const {data:{session}}=await client.auth.getSession();
    if(!session) return authScreen();
    user=session.user;
    try { await loadCloud(); loadApp(); }
    catch(err){ console.error(err); authScreen("We could not load your journal. Please refresh and try again."); }
  }
  start();
})();