
var user = require('./user');

var index;

/**
 * DI wrapper
 * @param {Express} app
 */
module.exports = function(app) {
  app.get('/', index);
  app.get('/users', user.list);
};


index = function(req, res){
  res.render('index', { title: 'glow-pi' });
};