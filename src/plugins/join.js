/*
	@ SeoRomin Library Plugin: .join()
	@ Creates a string by concatenating the text content of each element, separated by a separator.
	@ Mimics Array.prototype.join().
*/
(function() {

	$.extend('join', function( separator = ',' ) {
		const textContents = this['_sr_elements'].map(el => el.textContent);
		return textContents.join(separator);
	});

})();