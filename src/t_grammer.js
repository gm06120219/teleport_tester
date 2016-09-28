// const os = require('os');

// ip_info = os.networkInterfaces();
// ip_en0 = ip_info.en0;

// if(ip_en0.length <= 0) {
//   console.log('Get ip error.');
//   return;
// }

// if (ip_en0.length == 1) {
//   console.log(ip_en0.address)
// } else {
//   for (var i = ip_en0.length - 1; i >= 0; i--) {
//     if(ip_en0[i].family == 'IPv4') {
//       console.log(ip_en0[i].address)
//     }
//   }
// }

// var d = new Date('yyyy');
// function getdates() 
// { 
//   var d=new Date(); 
//   var year=d.getFullYear(); 
//   var month=d.getMonth()+1; 
//   var day=d.getDate(); 
//   var week=d.getDay(); 
//   var h=d.getHours(); 
//   var mins=d.getMinutes(); 
//   var s=d.getSeconds();
//   var ms = d.getMilliseconds();
   
//   if(month<10) month="0" + month 
//   if(day<10) month="0" + day 
//   if(h<10) h="0" + h 
//   if(mins<10) mins="0" + mins 
//   if(s<10) s="0" + s 
   
//   shows = year + "" + month + "" + day + "_" + h + "_" + mins +  "_" + s + "_" + ms;
//   return shows;
// } 
// console.log(getdates());

// var Emitter = require('./lib/emitter')
// var loop = 0;

// function loop_back() {
//   var evt = new Emitter();
//   setTimeout(function(){
//     loop_back();
//     console.log('loop ' + loop);
//     evt.emit('ok');
//   }, 100);

//   evt.on('ok', function(){
//     loop ++;
//     if(loop == 100) {
//       process.exit(0);
//     }
//   });
// }

// loop_back();

  console.log('date :' + new Date());
// console.log(Math.ceil(Math.random()*5)*1000);