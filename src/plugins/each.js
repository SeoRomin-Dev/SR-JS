/*
	@ SeoRomin Library Plugin: .each()
	@ Iterates over the collection, calling a function for each element.
	@ `this` is the current DOM element. Returning `false` from the callback stops the loop.
	@ Returns the original SR object for chaining.
*/
(function() {

	$.extend('each', function( callback ) {
		if( typeof callback !== 'function' ) {
			return this;
		}

		// Use a for...of loop to allow breaking out of it
		for( const [index, el] of this['_sr_elements'].entries() ) {
			// If the callback returns exactly false, stop the iteration
			if( callback.call(el, index, el) === false ) {
				break;
			}
		}

		return this;
	});

})();