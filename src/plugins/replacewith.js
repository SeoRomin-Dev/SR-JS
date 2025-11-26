/*
	@ SeoRomin Library Plugin: .replaceWith()
	@ Replaces each element in the set of matched elements with the provided new content.
	@ Returns the original SR object (containing the removed elements) for chaining.
*/
(function() {

	$.extend('replaceWith', function( newContent ) {
		// Do nothing if content is null/undefined or there are no elements to replace
		if( newContent == null || !this.length ) {
			return this;
		}

		// Create a stable snapshot of the source nodes before any DOM manipulation
		const sourceNodes = $(newContent)['_sr_elements'].slice();

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

			// Proactively clean up the element being replaced to prevent memory leaks
			$._internal.cleanupNodeTree(targetEl);

			// Use the native DOM method to replace the target element
			targetEl.replaceWith(...nodesToInsert);
		});

		return this;
	});

})();