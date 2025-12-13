/*
	@ SeoRomin Library Plugin: .after()
	@ Inserts content after each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('after', function( content ) {
		return $._internal.domManip(this, content, function(target, nodes) {
			target.after(...nodes);
		});
	});

})();