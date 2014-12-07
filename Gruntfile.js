module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: ['app.js', 'controllers/**/*.js', 'routes/**/*.js', 'public/javascripts/**/*.js'],
      options: {
        'supernew': true,
        'undef': true,

        // globals:
        'jquery': true,
        'node': true
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', ['jshint']);
};