/* =========================================================
   JASON INVEST — APP.JS CENTRAL - VERSION PUBLIC CORRIGEE
   TON PLAN : public/ + api/index.js + Firebase PUBLIC
   ========================================================= */
"use strict";

const JASON_APP = {
    name: "JASON INVEST PUBLIC",
    apiBase: "/api", // CORRIGE : Vercel route /api -> /api/index.js automatiquement
    currency: "FC",
    pages: {
        index: "index.html",
        login: "login.html",
        register: "register.html",
        dashboard: "dashboard.html",
        investissement: "investissement.html",
        tache: "tache.html",
        activites: "activites.html",
        fidelite: "fidelite.html",
        vip: "vip.html",
        parrainage: "parrainage.html",
        historique: "historique.html",
        notification: "notification.html",
        profil: "profil.html",
        support: "support.html",
        admin: "admin.html"
    }
};

const App = {
    get(id){ return document.getElementById(id); },
    qs(s){ return document.querySelector(s); },
    qsa(s){ return document.querySelectorAll(s); },
    formatMoney(v){ return new Intl.NumberFormat("fr-FR").format(Number(v)||0)+" "+JASON_APP.currency; },
    formatDate(d){ if(!d) return "—"; const x=new Date(d); return isNaN(x)? "—" : x.toLocaleDateString("fr-FR"); },
    formatDateTime(d){ if(!d) return "—"; const x=new Date(d); return isNaN(x)? "—" : x.toLocaleString("fr-FR"); },
    showMessage(m,t="info"){
        let box=this.get("appMessage");
        if(!box){ box=document.createElement("div"); box.id="appMessage"; box.style.position="fixed"; box.style.left="20px"; box.style.right="20px"; box.style.bottom="20px"; box.style.zIndex="99999"; box.style.padding="15px 18px"; box.style.borderRadius="14px"; box.style.fontWeight="700"; box.style.textAlign="center"; document.body.appendChild(box); }
        box.textContent=m;
        box.style.background=t==="success"?"#173d2c":t==="error"?"#4a1d24":"#18283d";
        box.style.color=t==="success"?"#9df2bd":t==="error"?"#ffb4bd":"#fff";
        clearTimeout(box._timer); box._timer=setTimeout(()=>box.remove(),3500);
    },
    go(page){ if(JASON_APP.pages[page]) location.href=JASON_APP.pages[page]; }
};

/* =========================================================
   API CENTRAL PUBLIC CORRIGE - TON PLAN
   ========================================================= */
const API = {
    getToken(){ return localStorage.getItem('jason_token') || localStorage.getItem('jason_current')? JSON.parse(localStorage.getItem('jason_current')||'{}').token : ""; },

    async request(endpoint, options={}){
        const token = localStorage.getItem('jason_token') || "";
        // 1. ESSAIE VERCEL PUBLIC /api/xxx
        try{
            const url = endpoint.startsWith("/api")? endpoint : `${JASON_APP.apiBase}${endpoint}`;
            const r = await fetch(url, {
                headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
               ...options
            });
            const d = await r.json();
            if(r.ok) return d;
            if(d && d.message) throw new Error(d.message);
        }catch(e){
            // console.warn("API fail:", endpoint, e.message);
        }

        // 2. FALLBACK LOCAL (si Vercel offline)
        const key = "jason_"+endpoint.replace('/','').replaceAll('/','_').replace('user_me','current');
        const local = localStorage.getItem(key) || localStorage.getItem('jason_current');
        if(local){
            try{
                const parsed = JSON.parse(local);
                if(endpoint.includes("me")) return {user: parsed};
                return {data: parsed};
            }catch{}
        }
        throw new Error("API offline");
    },
    async me(){
        try{
            const r = await this.request("/auth/me");
            return r;
        }catch{
            const cur = localStorage.getItem('jason_current');
            if(cur) return {user: JSON.parse(cur)};
            throw new Error("Non connecté");
        }
    },
    async dashboard(){
        try{ return await this.request("/dashboard"); }
        catch{
            const cur = JSON.parse(localStorage.getItem('jason_current')||'{}');
            return {data:{balance: cur.solde||cur.balance||0, points:0, referrals:0, vip:cur.vip||"Bronze"}};
        }
    },
    async investments(){
        try{ return await this.request("/investments"); }
        catch{ return {investments: JSON.parse(localStorage.getItem('jason_plans')||'[]')}; }
    },
    async activities(){
        try{ return await this.request("/activities"); }
        catch{ return {activities: JSON.parse(localStorage.getItem('jason_activities')||'[]')}; }
    },
    async fidelity(){ return this.request("/fidelity").catch(()=>({data:{points:0,vip:"Bronze"}})); },
    async referral(){
        const cur = JSON.parse(localStorage.getItem('jason_current')||'{}');
        const code = cur.referral_code || cur.code_parrain || cur.parrainCode || "JAS-XXXXXX";
        return {data:{referralCode: code, referralLink: location.origin+"/register.html?ref="+code, count:0}};
    },
    async history(){ return {data: JSON.parse(localStorage.getItem('jason_history')||'[]')}; },
    async notifications(){ return {notifications: JSON.parse(localStorage.getItem('jason_notifications')||'[]')}; },
    async paymentMethods(){ return {methods: JSON.parse(localStorage.getItem('jason_payments')||'[]')}; },
    async logout(){ localStorage.removeItem('jason_current'); localStorage.removeItem('jason_token'); localStorage.removeItem('token'); return {ok:true}; }
};

function initNavigation(){
    App.qsa("[data-page]").forEach(b=>b.addEventListener("click",()=>{ const p=b.dataset.page; if(JASON_APP.pages[p]) App.go(p); }));
    App.qsa("[data-action='logout']").forEach(b=>b.addEventListener("click", async()=>{ try{await API.logout();}catch{} location.href=JASON_APP.pages.index; }));
}
function initMobileMenu(){
    const menuButton = App.get("menuButton")||App.qs(".menu-button")||App.qs(".mobile-menu");
    const sidebar = App.qs(".sidebar")||App.qs(".side-menu");
    if(!menuButton||!sidebar) return;
    menuButton.addEventListener("click",()=>sidebar.classList.toggle("open"));
}
function displayUser(user){
    if(!user) return;
    ["userName","profileName","dashboardName","welcomeName"].forEach(id=>{ const el=App.get(id); if(el&&user.name) el.textContent=user.name; });
    ["userEmail","profileEmail"].forEach(id=>{ const el=App.get(id); if(el&&user.email) el.textContent=user.email; });
    ["userPhone","profilePhone"].forEach(id=>{ const el=App.get(id); if(el&&user.phone) el.textContent=user.phone; });
    const balance=user.balance??user.solde??0;
    App.qsa("[data-balance]").forEach(el=>el.textContent=App.formatMoney(balance));
    App.qsa("[data-vip]").forEach(el=>el.textContent=user.vip||"Bronze");
    App.qsa("[data-referral-code]").forEach(el=>el.textContent=user.referral_code||user.code_parrain||"JAS-XXXXXX");
}
async function loadCurrentUser(){
    try{
        const result=await API.me(); const user=result.user||result.data||result;
        if(user){ displayUser(user); window.JASON_USER=user; return user;}
    }catch{
        // Si pas de token et pas sur index/login/register -> redirige
        const publicPages=["index.html","login.html","register.html",""];
        const current = location.pathname.split("/").pop();
        if(!publicPages.includes(current) &&!localStorage.getItem('jason_current')){
            // location.href="login.html"; // active si tu veux proteger
        }
        return null;
    }
}
async function loadDashboard(){
    if(!App.get("dashboard")&&!App.qs("[data-dashboard]")) return;
    try{
        const result=await API.dashboard(); const data=result.data||result;
        if(!data) return;
        App.qsa("[data-dashboard-balance]").forEach(el=>el.textContent=App.formatMoney(data.balance??data.solde??0));
        App.qsa("[data-investments]").forEach(el=>el.textContent=App.formatMoney(data.investment??0));
    }catch{}
}
async function initJasonInvest(){
    console.log("JASON INVEST — app.js PUBLIC CORRIGE — TON PLAN public/ + /api");
    initNavigation(); initMobileMenu();
    await loadCurrentUser(); await loadDashboard();
    document.dispatchEvent(new CustomEvent("jason:ready"));
}
if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded",initJasonInvest); } else { initJasonInvest(); }

// Export pour les autres pages
window.JASON_APP=JASON_APP; window.App=App; window.API=API;
