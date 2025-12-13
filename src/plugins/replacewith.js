/*
	@ SeoRomin Library Plugin: .replaceWith()
	@ Replaces each element in the set of matched elements with the provided new content.
	@ Returns the original SR object (containing the removed elements) for chaining.
*/
(function() {

	$.extend('replaceWith', function( newContent ) {
		return $._internal.domManip(this, newContent, function(target, nodes) {
			// Proactively clean up the element being replaced to prevent memory leaks
			$._internal.cleanupNodeTree(target);
			target.replaceWith(...nodes);
		});
	});

})();