/*
	@ SeoRomin Library Plugin: .empty()
	@ Removes all child nodes from the set of matched elements.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('empty', function() {
		return this.each(function() {
			// Proactively clean up all descendant elements in a single, efficient pass before removing them from the DOM
			// `cleanRoot` is false to preserve the parent's data/events
			$._internal.cleanupNodeTree(this, false);

			// Setting textContent to an empty string is the fastest way to remove all children
			this.textContent = '';
		});
	});

})();