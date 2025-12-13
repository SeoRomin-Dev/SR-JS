/*
	@ SeoRomin Library Plugin: .attr()
	@ Gets an attribute value for the first element or sets attributes for every element.
	@ A value of null or undefined will remove the attribute.
	@ Returns the original SR object for chaining.
*/
(function() {

	// A set of HTML attributes that are treated as boolean (true/false)
	const booleanAttrs = new Set([
		'async', 'autofocus', 'autoplay', 'checked', 'controls', 'defer', 'disabled',
		'hidden', 'ismap', 'loop', 'multiple', 'muted', 'open', 'readonly', 'required', 'selected'
	]);

	$.extend('attr', function( name, value ) {
		// Getter: .attr('attributeName')
		if( typeof name === 'string' && value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			if( !firstEl ) {
				return undefined;
			}

			// Boolean attributes: return name if present, otherwise undefined
			if( booleanAttrs.has(name) ) {
				return firstEl.hasAttribute(name) ? name : undefined;
			}

			const attrValue = firstEl.getAttribute(name);
			// getAttribute returns null when missing, return undefined instead
			return attrValue === null ? undefined : attrValue;
		}

		// --- SETTER ---

		// Case 1: .attr({ 'attr1': 'val1', ... })
		if( typeof name === 'object' ) {
			this.each(function() {
				const element = this;
				// Optimize loop using Object.entries to iterate only own properties
				for( const [key, val] of Object.entries(name) ) {
					if( val === null || val === undefined ) {
						$._internal.removeAttribute(element, key);
					} else {
						// setAttribute expects a string value
						element.setAttribute(key, String(val));
					}
				}
			});
		}
		// Case 2: .attr('attrName', 'value' | function)
		else if( typeof name === 'string' ) {
			const isFunction = typeof value === 'function';

			this.each(function( index ) {
				const element = this;
				let finalValue = value;

				if( isFunction ) {
					// Determine the "old value" based on the same logic as our getter for consistency
					let oldValForCallback;
					if( booleanAttrs.has(name) ) {
						oldValForCallback = element.hasAttribute(name) ? name : undefined;
					} else {
						const oldAttr = element.getAttribute(name);
						oldValForCallback = oldAttr === null ? undefined : oldAttr;
					}

					finalValue = value.call(element, index, oldValForCallback);
				}

				if( finalValue === null || finalValue === undefined ) {
					$._internal.removeAttribute(element, name);
				} else {
					// setAttribute expects a string value
					element.setAttribute(name, String(finalValue));
				}
			});
		}

		return this;
	});

})();