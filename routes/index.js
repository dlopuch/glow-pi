
var patternController = require('../controllers/patterns');

var renderHTML,
    getActivePattern;

/**
 * DI wrapper
 * @param {Express} app
 */
module.exports = function(app) {
  app.get('/', renderHTML);

  app.get('/api/activePattern', getActivePattern);

};


renderHTML = function(req, res){
  res.render('index',
             { title: 'Yayyy colors!',
               quickPatterns: patternController.PATTERNS_LIST
             });
};

getActivePattern = function(req, res) {
  res.json(200, {activePattern: patternController.getActivePattern()});
};
