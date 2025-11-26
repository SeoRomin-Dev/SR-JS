/*
	@ SeoRomin Library Plugin: .removeAttr()
	@ Removes one or more attributes from each element in the set.
	@ Supports a space-separated string, an array, or a function.
	@ Optimized to handle namespaced SVG attributes correctly and efficiently.
	@ Returns the original SR object for chaining.
*/
(function() {

	// Helper to normalize input (string or array) into an array of names
	const normalizeAttrNames = ( input ) => {
		if( typeof input === 'string' ) {
			return $._internal.splitByWhitespace(input);
		}

		if( Array.isArray(input) ) {
			// Filter out non-string/empty values to be safe
			return input.filter(item => typeof item === 'string' && item.trim());
		}

		return [];
	};

	$.extend('removeAttr', function( name ) {
		if( !name ) {
			return this;
		}

		// Case 1: Function argument. Must be evaluated for each element
		// The callback receives the element's index and the element itself
		// It should return a space-separated string or an array of attribute names to remove
		if( typeof name === 'function' ) {
			return this.each(function(index) {
				const el = this;
				const result = name.call(el, index, el);

				const attributesToRemove = normalizeAttrNames(result);
				// Use a for...of loop for potential performance gain over forEach on very large sets
				for( const attr of attributesToRemove ) {
					$._internal.removeAttribute(el, attr);
				}
			});
		}
		// Case 2: String or Array argument. Normalize once for efficiency
		const staticAttributesToRemove = normalizeAttrNames(name);
		if( !staticAttributesToRemove.length ) {
			return this;
		}

		return this.each(function() {
			const el = this;
			// Use a for...of loop for potential performance gain over forEach on very large sets
			for( const attr of staticAttributesToRemove ) {
				$._internal.removeAttribute(el, attr);
			}
		});
	});

})();