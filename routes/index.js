
var patternController = require('../controllers/patterns');

var index;

/**
 * DI wrapper
 * @param {Express} app
 */
module.exports = function(app) {
  app.get('/', index);
};


index = function(req, res){
  res.render('index',
             { title: 'Yayyy colors!',
               quickPatterns: patternController.PATTERNS_LIST
             });
};