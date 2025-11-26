/*
	@ SeoRomin Library Plugin: .next()
	@ Gets the immediately following sibling of each element.
	@ Optionally filtered by a selector.
	@ Returns a new SR object with the found siblings.
*/
(function() {

	$.extend('next', function( selector ) {
		const nextSiblings = new Set();

		this.each(function() {
			const nextEl = this.nextElementSibling;

			// Check if the next sibling exists
			if( nextEl ) {
				// If no selector is provided, or if the sibling matches the selector, add it
				if( !selector || (typeof selector === 'string' && nextEl.matches(selector)) ) {
					nextSiblings.add(nextEl);
				}
			}
		});

		return $(nextSiblings);
	});

})();