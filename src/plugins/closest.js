/*
	@ SeoRomin Library Plugin: .closest()
	@ Gets the first element that matches the selector by testing the element itself and traversing up through its ancestors.
	@ The selector can be a string, a DOM element, or an SR object.
	@ Returns a new SR object with the unique matched ancestors, in document order.
*/
(function() {

	$.extend('closest', function( selector ) {
		if( !selector ) {
			return $();
		}

		const closestElements = new Set();

		// Case 1: Selector is a string (fast path using native method)
		if( typeof selector === 'string' ) {
			this.each(function() {
				// Ensure the element supports .closest() (e.g., not window or text node)
				if( typeof this.closest === 'function' ) {
					const found = this.closest(selector);
					if( found ) {
						closestElements.add(found);
					}
				}
			});
		}
		// Case 2: Selector is an element, SR object, or other iterable
		else {
			let elementsToMatch;

			if( selector instanceof $ ) {
				elementsToMatch = selector['_sr_elements'];
			} else if( selector.nodeType === 1 ) {
				elementsToMatch = [selector];
			} else if( typeof selector[Symbol.iterator] === 'function' ) {
				// Filter to ensure we only have valid Element nodes to match against
				elementsToMatch = Array.from(selector).filter(el => el && el.nodeType === 1);
			} else {
				return $(); // Invalid selector type
			}

			if( !elementsToMatch.length ) {
				return $();
			}

			const matchSet = new Set(elementsToMatch);

			this.each(function() {
				let current = this;
				while( current ) {
					if( matchSet.has(current) ) {
						closestElements.add(current);
						break; // Found the closest for this element, stop traversing up
					}

					current = current.parentElement;
				}
			});
		}

		if( closestElements.size === 0 ) {
			return $();
		}

		// Use the centralized sorting helper
		const sortedElements = $._internal.uniqueSort(closestElements);

		return $(sortedElements);
	});

})();