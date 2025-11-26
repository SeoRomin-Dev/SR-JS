/*
	@ SeoRomin Library Plugin: .remove()
	@ Removes the set of matched elements from the DOM.
	@ Returns the SR object (now empty) for chaining.
*/
(function() {

	$.extend('remove', function() {
		this.each(function() {
			// Clean up the element itself and all its descendants before DOM removal
			// to ensure immediate and predictable memory reclamation
			$._internal.cleanupNodeTree(this);

			// Remove the element from the DOM
			this.remove();
		});

		// Clear the SR object's internal list of elements
		this['_sr_elements'] = [];

		return this;
	});

})();