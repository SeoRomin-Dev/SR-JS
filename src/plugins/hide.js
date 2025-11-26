/*
	@ SeoRomin Library Plugin: .hide()
	@ Hides the matched elements.
	@ Saves the previous 'display' value so .show() can restore it correctly.
	@ Distinguishes between HTML 'display' style and SVG 'display' attribute.
*/
(function() {

	$.extend('hide', function() {
		return this.each(function() {
			const el = this;

			// Get computed styles once for efficiency
			const computedStyle = window.getComputedStyle(el);

			// Optimization: do nothing if the element is already hidden
			if( computedStyle.display === 'none' ) {
				return;
			}

			const isSVG = el instanceof SVGElement;
			let originalDisplay;

			if( isSVG ) {
				// For SVG, we must store the `display` attribute value, which can be null if not set
				originalDisplay = el.getAttribute('display');
			} else {
				// For HTML, check if it's in the DOM. If not, getComputedStyle is unreliable
				if( el.isConnected ) {
					// Use the already fetched computed display style
					originalDisplay = computedStyle.display;
				} else {
					// Store undefined so .show() knows to calculate the display value later
					originalDisplay = undefined;
				}
			}

			// Use the internal cache directly for better performance, avoiding new SR object creation
			const data = $._internal.dataCache.get(el) || {};
			data['_srOldDisplay'] = originalDisplay;
			$._internal.dataCache.set(el, data);

			// Hide the element using the correct mechanism
			if( isSVG ) {
				el.setAttribute('display', 'none');
			} else {
				el.style.display = 'none';
			}
		});
	});

})();