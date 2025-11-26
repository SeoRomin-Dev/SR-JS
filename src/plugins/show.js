/*
	@ SeoRomin Library Plugin: .show()
	@ Displays the matched elements.
	@ Restores display using CSS for HTML, and the `display` attribute for SVG.
*/
(function() {

	$.extend('show', function() {
		return this.each(function() {
			const el = this;

			// Optimization: Ignore if already visible
			if( window.getComputedStyle(el).display !== 'none' ) {
				return;
			}

			const isSVG = el instanceof SVGElement;

			if( isSVG ) {
				const data = $._internal.dataCache.get(el);
				const storedDisplay = data ? data['_srOldDisplay'] : undefined;

				// If the stored value was null, the attribute was not present
				// Removing it restores the default rendering behavior
				if( storedDisplay === null ) {
					el.removeAttribute('display');
				}
				// If a value was stored (even an empty string), restore it
				else if( typeof storedDisplay === 'string' ) {
					el.setAttribute('display', storedDisplay);
				}
				// Fallback if no data was found: just remove the 'none' set by .hide()
				else {
					el.removeAttribute('display');
				}
			} else {
				// For HTML elements, use the existing helper to resolve the correct display value
				el.style.display = $._internal.resolveDisplayValue(el);
			}
		});
	});

})();