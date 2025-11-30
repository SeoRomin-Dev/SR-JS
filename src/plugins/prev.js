/*
	@ SeoRomin Library Plugin: .prev()
	@ Gets the immediately preceding sibling of each element.
	@ Optionally filtered by a selector.
	@ Returns a new SR object with the found siblings.
*/
(function() {

	$.extend('prev', function( selector ) {
		const prevSiblings = new Set();

		this.each(function() {
			const prevEl = this.previousElementSibling;

			// Check if the previous sibling exists
			if( prevEl ) {
				// If no selector is provided, or if the sibling matches the selector, add it
				if( !selector || $._internal.matches(prevEl, selector) ) {
					prevSiblings.add(prevEl);
				}
			}
		});

		return $(prevSiblings);
	});

})();