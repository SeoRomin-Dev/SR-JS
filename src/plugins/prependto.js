/*
	@ SeoRomin Library Plugin: .prependTo()
	@ Prepends each element in the set to the target.
	@ If multiple targets, clones are created for all but the last target.
	@ Returns a new SR object containing all inserted elements (clones + originals).
*/
(function() {

	$.extend('prependTo', function( target ) {
		const $target = $(target);
		const finalInsertedElements = [];

		if( !$target.length || !this.length ) {
			return $([]);
		}

		$target.each((targetIndex, targetElement) => {
			// Check if this is the last container we are inserting into
			const isLastTarget = (targetIndex === $target.length - 1);
			const nodesToInsert = [];

			this.each((index, sourceElement) => {
				// Use original for the last target (moves it), clone for others
				const node = isLastTarget
					? sourceElement
					: $._internal.cloneNode(sourceElement, true, true);
				nodesToInsert.push(node);
			});

			targetElement.prepend(...nodesToInsert);
			finalInsertedElements.push(...nodesToInsert);
		});

		return $(finalInsertedElements);
	});

})();