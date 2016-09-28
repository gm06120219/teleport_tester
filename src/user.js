var Emitter = require('./lib/emitter');
var Client = require('./lib/client');
var EventEmitter = require('events');
var Config = require('./_config.json');
var Uuid = require('uuid');
var Https = require('https');
var Querystring = require('querystring');


/**
  session_id
    describe: 用户唯一标示
    type: text
 **/
function user(session_id) {
  // Emitter.call(this);
  this.session_id = session_id;

  // parse _config.json
  this.developer_id = Config.developer_id;
  this.log_level = 3;
  this.idc = Config.idc;
}

// user.prototype = new Emitter();

// user.prototype._getSession = function() {
//   // get session for get user's id
//   self = this;

//   var post_data = Querystring.stringify({
//     username: self.username,
//     password: self.password,
//     developer_id: self.developer_id
//   });

//   var post_option = {
//     hostname: self.idc,
//     port: 443,
//     path: '/api/sessions/get_session',
//     headers: {
//       'Content-Type' : 'application/x-www-form-urlencoded',
//       'Content-Length' : post_data.length
//     },
//     method: 'POST'
//   };

//   var post_req = Https.request(post_option, function(res){
//     res.on('data', function(buffer){
//       res = JSON.parse(buffer.toString());
//       if(res.Rescode === 10000){
//         self.logDebug('get_session success. user_id: ' + res.Data.user_id);
//         self.user_id = res.Data.user_id;
//         self.emit('get_session');
//       }else{
//         self.logError('get_session error. error message: ' + buffer.toString());
//         self.emit('get_session');
//       }
//     });
//   });
//   post_req.write(post_data);
//   post_req.end();
// };

user.prototype.login = function() {
  var self = this;
  self.client = new Client({
    // client_type: '__proxy',
    client_type: 'ssh',
    session_id: self.session_id,
  }, "asdfghjkl;'", false);
};

user.prototype.date = function() {
  var d = new Date();
  var year = d.getFullYear();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  var week = d.getDay();
  var h = d.getHours();
  var mins = d.getMinutes();
  var s = d.getSeconds();
  var ms = d.getMilliseconds();

  if (month < 10) month = "0" + month
  if (day < 10) month = "0" + day
  if (h < 10) h = "0" + h
  if (mins < 10) mins = "0" + mins
  if (s < 10) s = "0" + s

  date_tag = year + "" + month + "" + day + "_" + h + "_" + mins + "_" + s + "_" + ms;
  return date_tag;
}

module.exports = user;

// var u = new user('1')
// u.login();
// u.client.on('login_success', function(){
//   console.log('login success');
//   u.client.close();
// });