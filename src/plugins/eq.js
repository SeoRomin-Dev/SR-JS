/*
	@ SeoRomin Library Plugin: .eq()
	@ Reduces the set to the element at the specified index.
	@ Accepts a positive index (from start) or a negative index (from end).
	@ Returns a new SR object with only the element at the given index.
*/
(function() {

	$.extend('eq', function( index ) {
		// Explicitly check for non-numbers and NaN to ensure a valid index
		if( typeof index !== 'number' || Number.isNaN(index) ) {
			return $();
		}

		const finalIndex = index < 0 ? this.length + index : index;

		// Return an empty SR object if the calculated index is out of bounds
		if( finalIndex < 0 || finalIndex >= this.length ) {
			return $();
		}

		return $(this['_sr_elements'][finalIndex]);
	});

})();