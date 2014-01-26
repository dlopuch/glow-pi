
var patternController = require('../controllers/patterns');

var renderHTML,
    getActivePattern,
    setActivePattern;

/**
 * DI wrapper
 * @param {Express} app
 */
module.exports = function(app) {
  app.get('/', renderHTML);

  app.get('/api/activePattern', getActivePattern);

  app.post('/api/activePattern', setActivePattern);
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

setActivePattern = function(req, res) {
  patternController.load(req.body.activePattern);
  res.json(200, {activePattern: patternController.getActivePattern()});
};
