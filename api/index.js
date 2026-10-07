import admin from 'firebase-admin';
import { FIREBASE_SERVICE_ACCOUNT, ADMIN_PASSWORD } from '../backend/firebase.js';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT),
      databaseURL: `https://${FIREBASE_SERVICE_ACCOUNT.projectId}-default-rtdb.firebaseio.com`
    });
  } catch(e){ console.error("Firebase init fail", e.message); }
}
const db = admin.firestore();

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
};

function verifyToken(req){
  const h=req.headers.authorization||"";
  const token=h.replace('Bearer ','');
  if(!token) return null;
  try{
    const payload=JSON.parse(Buffer.from(token.split('.')[1]||'', 'base64').toString());
    return payload;
  }catch{ return {id: token}; }
}

export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(200).end();

  const { url, method } = req;
  const path = url.split('?')[0].replace('/api','') || '/';

  try{
    // AUTH REGISTER PUBLIC
    if(path==='/auth/register' && method==='POST'){
      const {name,phone,email,password,referral} = req.body;
      const snap=await db.collection('users').where('email','==',email.toLowerCase()).get();
      if(!snap.empty) return res.status(400).json({message:"Email existe déjà PUBLIC"});
      const id=Date.now().toString();
      const code='JAS-'+Math.random().toString(36).substring(2,6).toUpperCase();
      const user={id,name,phone,email:email.toLowerCase(),password,referral_code:referral||"",code_parrain:code,solde:0,balance:0,investment:0,points:0,vip:"Bronze",createdAt:new Date().toISOString()};
      await db.collection('users').doc(id).set(user);
      const token=Buffer.from(JSON.stringify({id,email})).toString('base64');
      return res.json({success:true,user,token});
    }

    // AUTH LOGIN PUBLIC
    if(path==='/auth/login' && method==='POST'){
      const {email,password} = req.body;
      const snap=await db.collection('users').where('email','==',email.toLowerCase()).get();
      if(snap.empty) return res.status(400).json({message:"Email incorrect PUBLIC"});
      const user=snap.docs[0].data();
      if(user.password!==password) return res.status(400).json({message:"Mot de passe incorrect PUBLIC"});
      const token=Buffer.from(JSON.stringify({id:user.id,email})).toString('base64');
      return res.json({success:true,user,token});
    }

    // AUTH ME PUBLIC
    if(path==='/auth/me' && method==='GET'){
      const tokenData=verifyToken(req);
      if(!tokenData) return res.status(401).json({message:"Non connecté"});
      const doc=await db.collection('users').doc(String(tokenData.id)).get();
      if(!doc.exists) return res.status(404).json({message:"User not found PUBLIC"});
      return res.json({user:doc.data()});
    }

    // DEPOSITS PUBLIC
    if(path==='/deposits' && method==='GET'){
      const snap=await db.collection('deposits').orderBy('createdAt','desc').limit(100).get();
      return res.json({deposits:snap.docs.map(d=>d.data())});
    }
    if(path==='/history' && method==='GET'){
      const snap=await db.collection('deposits').limit(50).get();
      const snap2=await db.collection('withdrawals').limit(50).get();
      const all=[...snap.docs.map(d=>d.data()),...snap2.docs.map(d=>d.data())];
      return res.json({history:all});
    }

    // ADMIN STATS PUBLIC
    if(path==='/admin/stats' && method==='GET'){
      const users=await db.collection('users').get();
      const dep=await db.collection('deposits').where('status','==','approved').get();
      const depPend=await db.collection('deposits').where('status','==','pending').get();
      const witPend=await db.collection('withdrawals').where('status','==','pending').get();
      let depVal=0; dep.forEach(d=>depVal+=Number(d.data().amount||0));
      return res.json({
        clients:users.size,
        depositsValides:depVal,
        withdrawalsPayes:0,
        pending:depPend.size+witPend.size,
        depositsPending:depPend.size,
        withdrawalsPending:witPend.size,
        recents:users.docs.slice(-5).map(d=>d.data())
      });
    }

    if(path==='/admin/users' && method==='GET'){
      const snap=await db.collection('users').get();
      return res.json({users:snap.docs.map(d=>d.data())});
    }
    if(path==='/admin/deposits' && method==='GET'){
      const snap=await db.collection('deposits').orderBy('createdAt','desc').get();
      return res.json({deposits:snap.docs.map(d=>({id:d.id,...d.data()}))});
    }
    if(path==='/admin/withdrawals' && method==='GET'){
      const snap=await db.collection('withdrawals').orderBy('createdAt','desc').get();
      return res.json({withdrawals:snap.docs.map(d=>({id:d.id,...d.data()}))});
    }

    // ADMIN ACTIONS PUBLIC - SOLDE = CLIENT VOIT DIRECT
    if(path==='/admin/add-solde' && method==='POST'){
      const {userId,amount}=req.body;
      const ref=db.collection('users').doc(String(userId));
      const doc=await ref.get();
      if(!doc.exists) return res.status(404).json({message:"User not found"});
      const u=doc.data();
      const newSolde=Number(u.solde||0)+Number(amount);
      await ref.update({solde:newSolde,balance:newSolde});
      return res.json({success:true,solde:newSolde});
    }

    if(path==='/admin/approve-deposit' && method==='POST'){
      const {id}=req.body;
      const depRef=db.collection('deposits').doc(String(id));
      const depDoc=await depRef.get();
      if(!depDoc.exists) return res.status(404).json({message:"Deposit not found"});
      const dep=depDoc.data();
      await depRef.update({status:'approved'});
      const userRef=db.collection('users').doc(String(dep.userId));
      const userDoc=await userRef.get();
      if(userDoc.exists){
        const u=userDoc.data();
        await userRef.update({solde:Number(u.solde||0)+Number(dep.amount||0),balance:Number(u.balance||0)+Number(dep.amount||0)});
      }
      return res.json({success:true});
    }

    if(path==='/admin/approve-withdrawal' && method==='POST'){
      const {id}=req.body;
      const ref=db.collection('withdrawals').doc(String(id));
      await ref.update({status:'approved'});
      return res.json({success:true});
    }

    return res.status(404).json({message:"Route not found PUBLIC: "+path});
  }catch(e){
    console.error(e);
    return res.status(500).json({message:"Erreur serveur PUBLIC: "+e.message});
  }
}
