/*
	@ SeoRomin Library Plugin: .after()
	@ Inserts content after each element in the set.
	@ Works safely with existing DOM elements by taking a snapshot before manipulation.
*/
(function() {

	$.extend('after', function( content ) {
		// Do nothing if content is null/undefined or there are no elements to modify
		if( content == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(content)['_sr_elements'].slice();

		if( !sourceNodes.length ) {
			return this;
		}

		this.each((index, targetEl) => {
			const isLastTarget = index === this.length - 1;

			const nodesToInsert = [];
			// Iterate over the stable snapshot, not a live collection
			for( const sourceNode of sourceNodes ) {
				// For the last target, move the original newContent elements
				// For all other targets, use a deep clone
				const node = isLastTarget
					? sourceNode
					: $._internal.cloneNode(sourceNode, true, true);
				nodesToInsert.push(node);
			}

			// Use the native DOM method to insert the nodes
			targetEl.after(...nodesToInsert);
		});

		return this;
	});

})();