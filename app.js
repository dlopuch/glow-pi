
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

// Initiate routes and controllers
require('./routes')(app);

// http.createServer(app).listen(app.get('port'), function(){
  // console.log('Express server listening on port ' + app.get('port'));
// });
// console.log("HEYDAN! Lightstrip controller not engaged");

console.log('Initializing lightstrip controller...');
require('./controllers/lightstrip').open(function(error, results) {
  if (error) {
    console.log('ERROR: Could not initiate lightstrip controller: ', error);
    return process.exit(1);
  }

  console.log("Lightstrip engaged!");

  require('./controllers/patterns').load('rain');

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
});
