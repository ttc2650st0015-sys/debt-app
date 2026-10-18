const $ = id => document.getElementById(id);
const STORAGE = "debtDashboardMyanmar_v1";
let state = loadState();

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE)) || {
      person: {name:"", phone:"", note:""},
      entries: []
    };
  } catch {
    return {person:{name:"",phone:"",note:""},entries:[]};
  }
}
function persist(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function money(n){ return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Number(n)||0) + "ယန်း"; }
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function sums(){
  const borrowed=state.entries.reduce((s,e)=>s+Number(e.borrow||0),0);
  const paid=state.entries.reduce((s,e)=>s+Number(e.paid||0),0);
  return {borrowed,paid,balance:borrowed-paid};
}
function updatePerson(){
  const p=state.person;
  $("displayName").textContent=p.name||"အမည်မထည့်ရသေးပါ";
  $("displayPhone").textContent=p.phone||"ဖုန်းနံပါတ်";
  $("displayNote").textContent=p.note||"ထောက်ပံ့သူအချက်အလက်";
  $("sideName").textContent=p.name||"အမည်မထည့်ရသေးပါ";
  $("sidePhone").textContent=p.phone||"—";
}
function render(){
  updatePerson();
  const s=sums();
  $("sumBorrowed").textContent=money(s.borrowed);
  $("sumPaid").textContent=money(s.paid);
  $("sumBalance").textContent=money(s.balance);
  $("sideBorrowed").textContent=money(s.borrowed);
  $("sidePaid").textContent=money(s.paid);
  $("sideBalance").textContent=money(s.balance);
  const q=$("search").value.trim().toLowerCase();
  const entries=state.entries.filter(e=>(e.description||"").toLowerCase().includes(q)||(e.date||"").includes(q));
  if(!entries.length){
    $("rows").innerHTML=`<tr><td colspan="8" class="empty">${state.entries.length?"ရှာဖွေမှုနှင့် ကိုက်ညီသောစာရင်းမရှိပါ။":"စာရင်းမရှိသေးပါ။ အပေါ်က Form မှ ထည့်ပါ။"}</td></tr>`;
  }else{
    let running=0;
    const balances={};
    [...state.entries].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).forEach(e=>{running+=Number(e.borrow)-Number(e.paid);balances[e.id]=running;});
    $("rows").innerHTML=entries.map((e,i)=>{
      const remaining=balances[e.id]??0;
      return `<tr>
        <td>${i+1}</td><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.description)}</td>
        <td>${money(e.borrow)}</td><td>${money(e.paid)}</td>
        <td><strong class="${remaining<=0?'green':'red'}">${money(Math.max(0,remaining))}</strong></td>
        <td><span class="status ${remaining<=0?'status-paid':'status-open'}">${remaining<=0?'ပေးဆပ်ပြီး':'ကျန်ရှိ'}</span></td>
        <td><div class="row-actions"><button class="btn btn-edit" data-action="edit" data-id="${escapeHtml(e.id)}">✎ ပြင်ရန်</button><button class="btn btn-delete" data-action="delete" data-id="${escapeHtml(e.id)}">▤ ဖျက်ရန်</button></div></td>
      </tr>`;
    }).join("");
  }
  $("recordCount").textContent=`စုစုပေါင်းစာရင်း : ${state.entries.length} ခု`;
}
function exportCsv(){
  const rows=[["ရက်စွဲ","အကြောင်းအရာ","ယူငွေ","ပြန်ဆပ်ငွေ","မှတ်ချက်","ထောက်ပံ့သူအချက်အလက်","ဖုန်းနံပါတ်"],
    ...state.entries.map(e=>[e.date,e.description,e.borrow,e.paid,e.note,state.person.name,state.person.phone])];
  const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="akyet-sarinn.csv";a.click();URL.revokeObjectURL(url);
}
function resetEntryForm(){
  $("entryForm").reset();$("editId").value="";$("date").value=new Date().toISOString().slice(0,10);
  $("paid").value=0;$("formHeading").textContent="စာရင်းအသစ်ထည့်ရန်";$("saveBtn").textContent="▣ သိမ်းမည်";$("cancelBtn").classList.add("hidden");$("formError").textContent="";
}
$("editPersonBtn").addEventListener("click",()=>{
  $("personName").value=state.person.name||"";$("personPhone").value=state.person.phone||"";$("personNote").value=state.person.note||"";
  $("personDialog").showModal();
});
$("personForm").addEventListener("submit",e=>{
  if(e.submitter && e.submitter.value==="cancel") return;
  e.preventDefault();
  const name=$("personName").value.trim(),phone=$("personPhone").value.trim();
  if(!name||!phone)return;
  state.person={name,phone,note:$("personNote").value.trim()};persist();$("personDialog").close();render();
});
$("entryForm").addEventListener("submit",e=>{
  e.preventDefault();$("formError").textContent="";
  if(!state.person.name||!state.person.phone){$("formError").textContent="အရင်ဆုံး အမည်နဲ့ ဖုန်းနံပါတ်ကို အပေါ်က ပြင်ဆင်ခလုတ်မှ ထည့်ပါ။";return;}
  const borrow=Number($("borrow").value),paid=Number($("paid").value);
  if(borrow<0||paid<0||!Number.isFinite(borrow)||!Number.isFinite(paid)||borrow+paid<=0){$("formError").textContent="ယူငွေ သို့မဟုတ် ပြန်ဆပ်ငွေကို မှန်ကန်စွာ ဖြည့်ပါ။";return;}
  const id=$("editId").value||((crypto.randomUUID&&crypto.randomUUID())||String(Date.now()));
  const old=state.entries.find(x=>x.id===id);
  const item={id,date:$("date").value,description:$("description").value.trim(),borrow,paid,note:$("note").value.trim()};
  const next=state.entries.filter(x=>x.id!==id);next.push(item);
  const balance=next.reduce((sum,x)=>sum+Number(x.borrow)-Number(x.paid),0);
  if(balance<0){$("formError").textContent="စုစုပေါင်းပြန်ဆပ်ငွေက စုစုပေါင်းယူငွေထက် မများရပါ။";return;}
  state.entries=next;persist();resetEntryForm();render();
});
$("rows").addEventListener("click",e=>{
  const b=e.target.closest("button[data-action]");if(!b)return;
  const item=state.entries.find(x=>x.id===b.dataset.id);if(!item)return;
  if(b.dataset.action==="edit"){
    $("editId").value=item.id;$("date").value=item.date;$("description").value=item.description;$("borrow").value=item.borrow;$("paid").value=item.paid;$("note").value=item.note||"";
    $("formHeading").textContent="စာရင်းပြင်ဆင်ရန်";$("saveBtn").textContent="ပြင်ဆင်ချက်သိမ်းမည်";$("cancelBtn").classList.remove("hidden");
    $("entryPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }else if(confirm("ဒီစာရင်းကို ဖျက်မှာ သေချာပါသလား?")){
    state.entries=state.entries.filter(x=>x.id!==item.id);persist();render();
  }
});
$("cancelBtn").addEventListener("click",resetEntryForm);
$("search").addEventListener("input",render);
$("exportBtn").addEventListener("click",exportCsv);
$("sideExportBtn").addEventListener("click",exportCsv);
$("newEntryBtn").addEventListener("click",()=>{$("entryPanel").scrollIntoView({behavior:"smooth"});$("description").focus();});
$("clearBtn").addEventListener("click",()=>{
  if(confirm("စာရင်းအားလုံးကို ဖျက်မှာ သေချာပါသလား? အချက်အလက်ကိုတော့ မဖျက်ပါ။")){
    state.entries=[];persist();resetEntryForm();render();
  }
});
function tick(){
  const now=new Date();
  $("todayDate").textContent=now.toLocaleDateString("sv-SE");
  $("todayTime").textContent=now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
}
$("date").value=new Date().toISOString().slice(0,10);
tick();setInterval(tick,30000);render();
