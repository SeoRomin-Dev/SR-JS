/*
	@ SeoRomin Library Plugin: .html()
	@ Gets the innerHTML of the first element or sets the innerHTML of every element.
	@ Returns the original SR object for chaining in setter mode.
*/
(function() {

	$.extend('html', function( content ) {
		// Getter: .html()
		if( content === undefined ) {
			const firstEl = this['_sr_elements'][0];
			// Safe check: innerHTML is only valid for Element nodes (nodeType 1)
			return (firstEl && firstEl.nodeType === 1) ? firstEl.innerHTML : '';
		}

		// Setter: .html( newContent | function )
		const isFunction = typeof content === 'function';

		this.each(function( index ) {
			// Safe check: Ensure valid Element node before accessing innerHTML
			if( !this || this.nodeType !== 1 ) return;

			// Proactively clean up data and events for all descendant elements before removing them
			// `cleanRoot` is false to preserve the parent's data/events
			$._internal.cleanupNodeTree(this, false);

			const newContent = isFunction
				? content.call(this, index, this.innerHTML)
				: content;

			this.innerHTML = newContent;
		});

		return this;
	});

})();