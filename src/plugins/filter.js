/*
	@ SeoRomin Library Plugin: .filter()
	@ Reduces the set of matched elements to those that match the selector, element, or pass the function's test.
	@ Returns a new SR object with the filtered elements.
*/
(function() {

	$.extend('filter', function( selector ) {
		// For null/undefined selectors, return an empty set for compatibility
		if( selector == null ) {
			return $();
		}

		const elements = this['_sr_elements'];
		let result = [];

		// Case 1: Function
		if( typeof selector === 'function' ) {
			result = elements.filter((el, index) => selector.call(el, index, el));
		}
		// Case 2: String Selector
		else if( typeof selector === 'string' ) {
			// An empty string is not a valid selector and should result in an empty set
			if( !selector.trim() ) {
				return $();
			}

			result = elements.filter(el => {
				// Use the safe internal helper which handles nodeType checks and invalid selectors
				return $._internal.matches(el, selector);
			});
		}
		// Case 3: SR Instance
		else if( selector instanceof $ ) {
			const validSet = new Set(selector['_sr_elements']);
			result = elements.filter(el => validSet.has(el));
		}
		// Case 4: Element Node
		else if( selector.nodeType === 1 ) {
			result = elements.filter(el => el === selector);
		}
		// Case 5: NodeList, Array, or other iterables
		else if( typeof selector[Symbol.iterator] === 'function' ) {
			// Create a set directly from the iterable for faster lookups,
			// avoiding intermediate arrays for better performance
			const validSet = new Set();
			for( const node of selector ) {
				if( node && node.nodeType === 1 ) {
					validSet.add(node);
				}
			}
			result = elements.filter(el => validSet.has(el));
		}
		// Other falsy values like 0 or false will fall through and return an empty set

		return $(result);
	});

})();