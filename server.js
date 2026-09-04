const express=require('express'),http=require('http'),{Server}=require('socket.io'),path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server),rooms=new Map();
app.use(express.static(path.join(__dirname,'public')));
function code(){return Math.random().toString(36).slice(2,6).toUpperCase()}
io.on('connection',s=>{
 s.on('create',cb=>{let c;do{c=code()}while(rooms.has(c));rooms.set(c,[s.id]);s.join(c);s.data.room=c;cb(c)});
 s.on('join',(c,cb)=>{c=(c||'').trim().toUpperCase();let r=rooms.get(c);if(!r)return cb({ok:false,error:'Sala no encontrada'});if(r.length>=2)return cb({ok:false,error:'Sala llena'});r.push(s.id);s.join(c);s.data.room=c;cb({ok:true});s.to(c).emit('peer-joined')});
 s.on('signal',m=>s.data.room&&s.to(s.data.room).emit('signal',m));
 s.on('start',()=>s.data.room&&io.to(s.data.room).emit('start'));
 s.on('disconnect',()=>{let c=s.data.room,r=rooms.get(c);if(r){r=r.filter(x=>x!==s.id);r.length?rooms.set(c,r):rooms.delete(c)}});
});
server.listen(process.env.PORT||3000);
