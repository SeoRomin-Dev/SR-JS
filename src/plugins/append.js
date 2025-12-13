/*
	@ SeoRomin Library Plugin: .append()
	@ Inserts content to the end of each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('append', function( content ) {
		return $._internal.domManip(this, content, function(target, nodes) {
			target.append(...nodes);
		});
	});

})();