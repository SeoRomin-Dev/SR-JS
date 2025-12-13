/*
	@ SeoRomin Library Plugin: .before()
	@ Inserts content before each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('before', function( content ) {
		return $._internal.domManip(this, content, function(target, nodes) {
			target.before(...nodes);
		});
	});

})();