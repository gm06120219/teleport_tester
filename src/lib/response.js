function Response(client, id, to) {
  this.client = client;
  this.id = id;
  this.to = to;
}

Response.prototype.send = function(msg) {
  this.client.response(this.id, this.to, msg);
  this.dispose();
};

Response.prototype.dispose = function() {
  this.client = null;
  this.id = null;
  this.to = null;
};

module.exports = Response;