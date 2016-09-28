var User = require('./user');
var Fs = require('fs');
var Config = require('./_config.json');

function receiver(session_id) {
  this.session_id = session_id;
  var self = this;

  var u = new User(session_id);
  u.login();

  // process login success
  u.client.on('login_success', function() {
    console.log(self.session_id + ' login success!');
  });

  // TODO
  // process login fail
  u.client.on('login_fail', function() {
    console.log(self.session_id + ' login fail!');
  });

  // process request
  u.client.on('request', function() {

  });

  // process file
  u.client.on('file', function(fileReceiver, done) {
    console.log(self.session_id + ' get a file from sender.');
    done({
      'some': 'test data'
    });
    var date_tag = u.date();
    Fs.exists(fileReceiver.filepath, function() {
      Fs.unlinkSync(fileReceiver.filepath); // for test
      // Fs.rename(fileReceiver.filepath, '../receiver/' + self.session_id + '_' + date_tag + Config.send_file_type)
    });
  });

  // TODO
  // process file error
  u.client.on('file_error', function(fileReceiver, err) {
    console.log(fileReceiver);
    console.log(err);
  });
}

module.exports = receiver;

// new receiver('receiver_1');
