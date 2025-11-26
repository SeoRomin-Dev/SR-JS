/*
	@ SeoRomin Library Plugin: .removeData()
	@ Removes previously-stored data from the internal cache.
	@ Does not affect `data-*` attributes in the DOM.
*/
(function() {

	$.extend('removeData', function( name ) {
		const cache = $._internal.dataCache;

		// Case 1: .removeData() with no arguments removes all data for each element
		if( name === undefined ) {
			return this.each(function() {
				cache.delete(this);
			});
		}

		// Determine which keys to remove based on the 'name' argument
		let keysToRemove;
		if( typeof name === 'string' ) {
			keysToRemove = $._internal.splitByWhitespace(name);
		} else if( Array.isArray(name) ) {
			// Filter out any non-string values for robustness
			keysToRemove = name.filter(item => typeof item === 'string' && item.trim());
		} else {
			// For any other type of 'name' argument, do nothing
			return this;
		}

		// If no valid keys were provided (e.g., empty string or empty array), there's nothing to do
		if( !keysToRemove.length ) {
			return this;
		}

		return this.each(function() {
			const elementData = cache.get(this);
			if( !elementData ) return;

			// Remove only the specified keys from the element's data cache
			keysToRemove.forEach(key => {
				delete elementData[$._internal.camelCase(key)];
			});
		});
	});

})();