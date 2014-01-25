var selectActivePattern = function(patternId) {
  $('input.pattern').closest('label').removeClass('btn-primary');

  var $active = $('input.pattern[value=' + patternId + ']');

  // No active -- clear them out
  // TODO: Is there a better way to programatically unselect all bootstrap radio buttons?
  if (!patternId || !$active.length) {
    $('input.pattern').prop('checked', false)
    .closest('label').removeClass('active');
  } else {
    $active
    .trigger('click') // TODO: Better way to programatically select bootstrap radio?  .button('toggle') not working for radio
    .closest('label').addClass('btn-primary');
  }
};

$(function() {

// Any time a pattern button is pressed, make it have the btn-primary styling to add extra highlight.
$('input.pattern').closest('label').click(function(e) {
  $('input.pattern').closest('label').removeClass('btn-primary');
  $(e.target).addClass('btn-primary');
});

// Select the active pattern
$.get('/api/activePattern')
.done(function(results) {
  $('#quick-patterns-init').hide();
  $('#quick-patterns').show();
  selectActivePattern(results.activePattern);
});




});
