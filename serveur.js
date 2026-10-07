// jason-invest/api/server.js — JASON INVEST API FINAL PUBLIC FC
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jason-secret-2026';

// ================= TES 9 PLANS OFFICIELS FC =================
const PLANS = [
  { amount: 20000, daily: 1500, duration: 30, total: 45000, name: "Starter 20K" },
  { amount: 50000, daily: 4000, duration: 30, total: 120000, name: "Bronze 50K" },
  { amount: 100000, daily: 8000, duration: 30, total: 240000, name: "Silver 100K" },
  { amount: 300000, daily: 24000, duration: 30, total: 720000, name: "Gold 300K" },
  { amount: 500000, daily: 40000, duration: 30, total: 1200000, name: "Diamond 500K" },
  { amount: 1000000, daily: 80000, duration: 30, total: 2400000, name: "Elite 1M" },
  { amount: 2000000, daily: 160000, duration: 30, total: 4800000, name: "VIP 2M" },
  { amount: 3000000, daily: 240000, duration: 30, total: 7200000, name: "VIP+ 3M" },
  { amount: 5000000, daily: 400000, duration: 30, total: 12000000, name: "Legend 5M" },
];

// DB mémoire (Vercel garde en global)
let users = global._users || [];
let investments = global._investments || [];
let deposits = global._deposits || [];
let withdrawals = global._withdrawals || [];
let tasks = global._tasks || [];
let referrals = global._referrals || [];
let support = global._support || [];
let notifications = global._notifications || [];
global._users = users;
global._investments = investments;
global._deposits = deposits;
global._withdrawals = withdrawals;
global._tasks = tasks;
global._referrals = referrals;
global._support = support;
global._notifications = notifications;

function getUserFromToken(req){
  try{
    const h = req.headers.authorization || "";
    const t = h.replace('Bearer ','').trim();
    if(!t) return null;
    const d = jwt.verify(t, JWT_SECRET);
    return users.find(u=>String(u.id)===String(d.id)) || null;
  }catch{ return null; }
}

function readBody(req){
  return new Promise(async (resolve)=>{
    let body=''; for await (const c of req) body+=c;
    try{ resolve(JSON.parse(body||'{}')); }catch{ resolve({}); }
  });
}

module.exports = async (req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if(req.method==='OPTIONS') return res.status(200).end();

  const url = req.url || "";
  const path = url.split('?')[0];
  const method = req.method;

  try{
    // ========= PLANS =========
    if(path==='/api/plans' && method==='GET'){
      return res.status(200).json({ plans: PLANS });
    }

    // ========= AUTH ME =========
    if((path==='/api/auth/me' || path==='/api/me') && method==='GET'){
      const u = getUserFromToken(req);
      if(!u) return res.status(401).json({ error:'Non connecté' });
      return res.json({ user: u });
    }

    // ========= REGISTER =========
    if(path==='/api/auth/register' && method==='POST'){
      const data = await readBody(req);
      const id = Date.now().toString();
      const code = 'JAS-'+Math.random().toString(36).substring(2,6).toUpperCase();
      const user = {
        id, name: data.name||data.nom||"Client",
        phone: data.phone||data.telephone||data.numero||"",
        email: data.email||"", password: data.password||"",
        solde: 0, balance: 0,
        code_parrain: code, code: code,
        referredBy: (data.ref||data.referredBy||data.parrain||"").toUpperCase()||null,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      if(user.referredBy){
        referrals.push({
          id: Date.now().toString(),
          parrainCode: user.referredBy,
          filleulId: id,
          filleulName: user.name,
          amount: 0, bonus: 0,
          date: new Date().toISOString()
        });
      }
      const token = jwt.sign({ id }, JWT_SECRET);
      return res.json({ user, token });
    }

    // ========= LOGIN =========
    if(path==='/api/auth/login' && method==='POST'){
      const data = await readBody(req);
      const u = users.find(x=> x.phone===data.phone || x.email===data.email || x.telephone===data.phone);
      if(!u) return res.status(404).json({ error:'Utilisateur non trouvé' });
      const token = jwt.sign({ id:u.id }, JWT_SECRET);
      return res.json({ user:u, token });
    }

    // ========= PROFILE UPDATE =========
    if(path==='/api/profile/update' && method==='POST'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      const data = await readBody(req);
      if(data.name) u.name=data.name;
      if(data.phone) { u.phone=data.phone; u.telephone=data.phone; }
      if(data.email) u.email=data.email;
      return res.json({ user:u, success:true });
    }

    // ========= INVESTMENTS =========
    if(path==='/api/investments' && method==='POST'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      const data = await readBody(req);
      const plan = PLANS.find(p=>p.amount===Number(data.amount));
      if(!plan) return res.status(400).json({error:'Plan invalide FC'});
      const inv = {
        id: Date.now().toString(),
        userId: u.id,
        amount: plan.amount,
        dailyGain: plan.daily,
        daily: plan.daily,
        plan: plan.name,
        duration: plan.duration,
        total: plan.total,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      investments.push(inv);

      // Bonus parrainage 10% AUTO PUBLIC
      if(u.referredBy){
        const parrain = users.find(x=> (x.code_parrain||x.code||'').toUpperCase()===u.referredBy.toUpperCase());
        if(parrain){
          const bonus = Math.floor(plan.amount*0.1);
          parrain.solde = Number(parrain.solde||0)+bonus;
          parrain.balance = parrain.solde;
          let ref = referrals.find(r=>String(r.filleulId)===String(u.id));
          if(ref){ ref.amount=plan.amount; ref.bonus=bonus; }
          else { referrals.push({ id:Date.now().toString(), parrainCode:u.referredBy.toUpperCase(), filleulId:u.id, filleulName:u.name, amount:plan.amount, bonus, date:new Date().toISOString() }); }
          notifications.push({ id:Date.now().toString(), userId:parrain.id, title:"Bonus Parrainage FC", message:`+${bonus} FC de ${u.name} qui a investi ${plan.amount} FC`, date:new Date().toISOString() });
        }
      }
      notifications.push({ id:(Date.now()+1).toString(), userId:u.id, title:"Investissement FC", message:`Investi ${plan.amount} FC - gain ${plan.daily} FC/j`, date:new Date().toISOString() });
      return res.json({ investment:inv, user:u });
    }

    if(path==='/api/investments' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      return res.json({ investments: investments.filter(i=>String(i.userId)===String(u.id)) });
    }

    // ========= DEPOSITS =========
    if(path==='/api/deposits' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      return res.json({ deposits: deposits.filter(d=>String(d.userId)===String(u.id)) });
    }
    if(path==='/api/deposits' && method==='POST'){
      const u = getUserFromToken(req);
      const data = await readBody(req);
      const dep = { id:Date.now().toString(), userId:u?.id||'guest', amount:Number(data.amount||0), method:data.method||'mobile', status:'pending', createdAt:new Date().toISOString() };
      deposits.push(dep);
      return res.json({ deposit:dep });
    }

    // ========= WITHDRAWALS =========
    if(path==='/api/withdrawals' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      return res.json({ withdrawals: withdrawals.filter(w=>String(w.userId)===String(u.id)) });
    }
    if(path==='/api/withdrawals' && method==='POST'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      const data = await readBody(req);
      const amount = Number(data.amount||0);
      if(amount < 5000) return res.status(400).json({error:'Retrait min 5000 FC'});
      if(Number(u.solde||0) < amount) return res.status(400).json({error:'Solde insuffisant FC'});
      u.solde -= amount; u.balance = u.solde;
      const w = { id:Date.now().toString(), userId:u.id, amount, status:'pending', createdAt:new Date().toISOString() };
      withdrawals.push(w);
      return res.json({ withdrawal:w, user:u });
    }

    // ========= TASKS TODAY =========
    if(path==='/api/tasks/today' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      const invs = investments.filter(i=>String(i.userId)===String(u.id) && i.status==='active');
      const lastInv = invs[invs.length-1]||null;
      const today = new Date().toISOString().slice(0,10);
      const todayTasks = tasks.filter(t=>String(t.userId)===String(u.id) && t.dateKey===today);
      const history = tasks.filter(t=>String(t.userId)===String(u.id));
      const book = {
        titre:`Jour ${new Date().getDate()} - Patience en FC`,
        title:`Jour ${new Date().getDate()} - Patience en FC`,
        contenu:`La patience est la clé en FC. ${lastInv? lastInv.amount:20000} FC devient ${lastInv? lastInv.total:45000} FC en 30 jours si tu lis 5 min chaque jour. Investis petit, gagne chaque jour en Franc Congolais.`,
        content:`La patience est la clé en FC.`
      };
      return res.json({
        investment:lastInv,
        daily:lastInv?.dailyGain||lastInv?.daily||0,
        duration:lastInv?.duration||30,
        doneCount:history.length,
        doneToday:todayTasks.length>0,
        history, book, user:u
      });
    }

    // ========= TASKS COMPLETE =========
    if(path==='/api/tasks/complete' && method==='POST'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      const invs = investments.filter(i=>String(i.userId)===String(u.id) && i.status==='active');
      const lastInv = invs[invs.length-1]; if(!lastInv) return res.status(400).json({error:'Pas d investissement actif FC'});
      const today = new Date().toISOString().slice(0,10);
      if(tasks.find(t=>String(t.userId)===String(u.id) && t.dateKey===today)) return res.status(400).json({error:'Déjà fait aujourd hui'});
      const reward = lastInv.dailyGain||lastInv.daily;
      u.solde = Number(u.solde||0)+Number(reward); u.balance=u.solde;
      const t = { id:Date.now().toString(), userId:u.id, investmentId:lastInv.id, reward, date:new Date().toISOString(), dateKey:today, book:'Livre IA' };
      tasks.push(t);
      return res.json({ task:t, user:u, success:true });
    }

    // ========= REFERRALS =========
    if(path==='/api/referrals' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      const myCode = (u.code_parrain||u.code||'').toUpperCase();
      const mine = referrals.filter(r=>r.parrainCode===myCode);
      return res.json({
        referrals:mine,
        count:mine.length,
        activeCount:mine.filter(m=>Number(m.amount)>=20000).length,
        totalBonus:mine.reduce((s,m)=>s+Number(m.bonus||0),0),
        all:referrals
      });
    }

    // ========= SUPPORT =========
    if(path==='/api/support' && method==='POST'){
      const data = await readBody(req);
      const u = getUserFromToken(req);
      const ticket = { id:Date.now().toString(), userId:u?.id||'guest',...data, createdAt:new Date().toISOString() };
      support.push(ticket);
      return res.json({ success:true, ticket });
    }
    if(path==='/api/support' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      return res.json({ tickets: support.filter(s=>String(s.userId)===String(u.id)) });
    }

    // ========= NOTIFICATIONS =========
    if(path==='/api/notifications' && method==='GET'){
      const u = getUserFromToken(req); if(!u) return res.status(401).json({error:'Non connecté'});
      return res.json({ notifications: notifications.filter(n=>String(n.userId)===String(u.id)).reverse() });
    }

    // ========= BOOKS =========
    if(path==='/api/books/today' && method==='GET'){
      return res.json({ book:{ titre:`Jour ${new Date().getDate()} - Patience en FC`, contenu:`La patience est la clé en FC. Investis petit, gagne chaque jour en Franc Congolais. 20 000 FC = 1 500 FC/j pendant 30 jours.` } });
    }

    // ========= PAYMENT METHODS =========
    if(path==='/api/payment-methods' && method==='GET'){
      return res.json({ methods: [{id:'mtn',name:'MTN Mobile Money'},{id:'orange',name:'Orange Money'},{id:'airtel',name:'Airtel Money'}] });
    }

    return res.status(404).json({ error:'Route non trouvée '+path, path, method });

  }catch(e){
    console.error(e);
    return res.status(500).json({ error:e.message });
  }
};