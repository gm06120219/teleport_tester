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