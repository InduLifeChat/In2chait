// केवल Project URL और anon/publishable key डालें। service_role key कभी नहीं।
const SUPABASE_URL="https://sjxopxpazpuqjibdrckg.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_6JVG4OCCJfZJZOL7yBawXg_IJAJ-pBk";
const BUCKET="chat-media";
const $=id=>document.getElementById(id);
let db,user,rows=[],live;
const ready=()=>SUPABASE_URL.startsWith("https://")&&SUPABASE_ANON_KEY.length>20;

async function init(){if(!ready())return;$("status").textContent="URL और key भरने के बाद Login करें।";db=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:true}})}

$("loginForm").onsubmit=async e=>{e.preventDefault();if(!ready()){alert("पहले app.js में Supabase URL और key डालें");return}let {data,error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){$("status").textContent=error.message;return}user=data.user;$("login").classList.add("hide");$("app").classList.remove("hide");await load();live=db.channel("chat").on("postgres_changes",{event:"*",schema:"public",table:"messages"},load).subscribe()};

async function load(){let {data,error}=await db.from("messages").select("*").eq("is_deleted",false).order("created_at").limit(100);if(error){alert(error.message);return}rows=data||[];render()}

function render(filter=""){$("messages").innerHTML="";let list=rows.filter(x=>(x.body||"").toLowerCase().includes(filter.toLowerCase()));if(!list.length){$("messages").textContent="अभी कोई message नहीं है।";return}list.forEach(m=>{let d=document.createElement("div");d.className="msg "+(m.sender==="A"?"fromA":"fromI");let name=document.createElement("b");name.textContent=m.sender==="A"?"A":"Isha";d.append(name,document.createElement("br"));if(m.body)d.append(document.createTextNode(m.body));if(m.file_url){let el=m.file_type?.startsWith("video/")?document.createElement("video"):m.file_type?.startsWith("audio/")?document.createElement("audio"):document.createElement("img");el.src=m.file_url;if(el.tagName!=="AUDIO")el.controls=el.tagName==="VIDEO";else el.controls=true;if(el.tagName==="IMG")el.onclick=()=>viewer(el.outerHTML);d.append(el)}let meta=document.createElement("div");meta.className="meta";meta.textContent=new Date(m.created_at).toLocaleString()+"  ✓✓";d.append(meta);let del=document.createElement("button");del.textContent="Delete";del.onclick=()=>softDelete(m.id);d.append(del);$("messages").append(d)});$("messages").scrollTop=$("messages").scrollHeight}

async function send(sender,text,file){if(!text.trim()&&!file)return;let file_url=null,file_type=null;if(file){let path=user.id+"/"+Date.now()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");let up=await db.storage.from(BUCKET).upload(path,file);if(up.error){alert(up.error.message);return}let signed=await db.storage.from(BUCKET).createSignedUrl(path,604800);if(signed.error){alert(signed.error.message);return}file_url=signed.data.signedUrl;file_type=file.type}let {error}=await db.from("messages").insert({sender,body:text.trim(),file_url,file_type});if(error)alert(error.message);else{if(sender==="A")$("textA").value="";else $("textI").value="";await load()}}

$("formA").onsubmit=e=>{e.preventDefault();send("A",$("textA").value,null)};
$("formI").onsubmit=e=>{e.preventDefault();send("I",$("textI").value,null)};
$("fileA").onchange=e=>{if(e.target.files[0])send("A","",e.target.files[0]);e.target.value=""};
$("fileI").onchange=e=>{if(e.target.files[0])send("I","",e.target.files[0]);e.target.value=""};

async function softDelete(id){let {error}=await db.from("messages").update({is_deleted:true,deleted_at:new Date().toISOString()}).eq("id",id);if(error)alert(error.message);await load()}

async function recycle(){ $("bin").classList.remove("hide");let {data,error}=await db.from("messages").select("*").eq("is_deleted",true).order("deleted_at",{ascending:false}).limit(100);$("deleted").innerHTML="";if(error){$("deleted").textContent=error.message;return}if(!data.length){$("deleted").textContent="Recycle Bin खाली है";return}data.forEach(m=>{let d=document.createElement("p");d.textContent=(m.sender==="A"?"A":"Isha")+": "+(m.body||"Media");let r=document.createElement("button");r.textContent="Restore";r.onclick=async()=>{await db.from("messages").update({is_deleted:false,deleted_at:null}).eq("id",m.id);recycle();load()};let x=document.createElement("button");x.textContent="Permanently delete";x.onclick=async()=>{if(confirm("हमेशा के लिए हटाएँ?")){await db.from("messages").delete().eq("id",m.id);recycle()}};d.append(r,x);$("deleted").append(d)})}

$("more").onclick=()=>$("menu").classList.toggle("hide");
$("logout").onclick=async()=>{if(live)await db.removeChannel(live);await db.auth.signOut();location.reload()};
$("binBtn").onclick=recycle;
$("closeBin").onclick=()=>$("bin").classList.add("hide");
$("searchBtn").onclick=()=>$("search").classList.toggle("hide");
$("search").oninput=e=>render(e.target.value);

$("exportBtn").onclick=()=>{let b=new Blob([rows.map(m=>new Date(m.created_at).toLocaleString()+" | "+m.sender+" | "+(m.body||m.file_url||"Media")).join("\n")],{type:"text/plain"});let a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="A-I-Chat.txt";a.click();URL.revokeObjectURL(a.href)};

function viewer(html){$("viewerBody").innerHTML=html;$("viewer").classList.remove("hide")}
$("closeViewer").onclick=()=>$("viewer").classList.add("hide");

window.addEventListener("pagehide",()=>{if(db)db.auth.signOut()});
init();
  
