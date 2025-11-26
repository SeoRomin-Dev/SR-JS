/*
	@ SeoRomin Library Plugin: .text()
	@ Gets the combined text content of each element in the set, or sets the text content of every matched element.
	@ Returns the string value for getter, or the original SR object for chaining in setter mode.
*/
(function() {

	$.extend('text', function( content ) {
		// Getter: .text()
		if( content === undefined ) {
			return this['_sr_elements'].map(el => {
				// Safe check: Ensure el exists and is a Node to avoid runtime errors
				return (el && el.nodeType) ? el.textContent : '';
			}).join('');
		}

		// Setter: .text( value | function )
		this.each(function( index ) {
			const el = this;
			// Safe check: Ensure valid node before attempting to write
			if( !el || !el.nodeType ) return;

			const newContent = typeof content === 'function'
				? content.call(el, index, el.textContent)
				: content;

			// Coerce the new content to a string, treating null/undefined as empty for comparison
			const finalContent = (newContent === null || newContent === undefined) ? '' : String(newContent);

			// Optimization: Only update the DOM if the content has actually changed
			if( el.textContent !== finalContent ) {
				// Proactively clean up data and events for all descendant elements before removing them
				// `cleanRoot` is false to preserve the parent's data/events
				$._internal.cleanupNodeTree(el, false);

				el.textContent = finalContent;
			}
		});

		return this;
	});

})();