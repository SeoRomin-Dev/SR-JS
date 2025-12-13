/*
	@ SeoRomin Library Plugin: .prepend()
	@ Inserts content at the beginning of each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('prepend', function( content ) {
		return $._internal.domManip(this, content, function(target, nodes) {
			target.prepend(...nodes);
		});
	});

})();