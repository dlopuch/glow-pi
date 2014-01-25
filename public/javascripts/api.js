/**
 * Programatically highlight the specified pattern button, or de-highlight all of them
 * @param {string} patternId
 */
var selectPattern = function(patternId) {

  var $active = $('input.pattern[value=' + patternId + ']');

  // No active -- clear them all out
  // TODO: Is there a better way to programatically unselect all bootstrap radio buttons?
  if (!patternId || !$active.length) {
    $('input.pattern').prop('checked', false)
    .closest('label').removeClass('active btn-primary');
  } else {
    $active.trigger('click', {noUpdateActivePattern: true});
      // TODO: Better way to programatically select bootstrap radio?  .button('toggle') not working for radio
  }
};

$(function() {

// Any time a pattern button is pressed, make it have the btn-primary styling to add extra highlight.
$('input.pattern').closest('label').click(function(e) {
  $('input.pattern').closest('label').removeClass('btn-primary');
  $(e.target).closest('label').addClass('btn-primary');
});

// Initial page load: Select the active pattern
$.get('/api/activePattern')
.done(function(results) {
  $('#quick-patterns-init').hide();
  $('#quick-patterns').show();
  selectPattern(results.activePattern);
});

// Whenever a pattern is clicked: post the active pattern
$('input.pattern').closest('label').click(function(e) {
  if (e.noUpdateActivePattern)
    return;

  var newPattern = $(e.target).find('input.pattern').val();
  $.post('/api/activePattern', {activePattern: newPattern})
  .done(function(results) {
    // server may respond with a different pattern if choice was invalid.  If so, select the one server specified
    if (results.activePattern !== newPattern)
      return selectPattern(results.activePattern);
  });
});


});
