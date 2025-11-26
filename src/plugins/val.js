/*
	@ SeoRomin Library Plugin: .val()
	@ Gets the current value of the first element or sets the value of every element.
	@ Handles <input>, <select>, <textarea>, including <select multiple>.
	@ Returns the value for getter, or the original SR object for chaining in setter mode.
*/
(function() {

	// Helper to get the value of a single raw element
	const getElValue = (el) => {
		const nodeName = el.nodeName.toUpperCase();
		if( nodeName === 'SELECT' && el.multiple ) {
			if( !el.options ) {
				return [];
			}

			return Array.from(el.options)
				.filter(option => option.selected)
				.map(option => option.value);
		}

		return el.value;
	};

	// Helper to create a Set of string values from an input
	const createValueSet = (value) => {
		if( value === null || value === undefined ) {
			return new Set();
		}

		const values = Array.isArray(value) ? value : [value];
		return new Set(values.map(String));
	};

	// Coerces null or undefined to an empty string, otherwise returns the value
	const coerceToString = (val) => (val === null || val === undefined) ? '' : val;

	$.extend('val', function( value ) {
		// GETTER
		if( value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			return firstEl ? getElValue(firstEl) : undefined;
		}

		// SETTER
		const isFunction = typeof value === 'function';
		// For static values, create the Set once for performance
		const staticValueSet = isFunction ? null : createValueSet(value);

		this.each(function( index ) {
			const el = this;
			const finalValue = isFunction ? value.call(el, index, getElValue(el)) : value;
			const nodeName = el.nodeName.toUpperCase();

			if( nodeName === 'SELECT' ) {
				if( el.multiple ) {
					if( el.options ) {
						const values = isFunction ? createValueSet(finalValue) : staticValueSet;
						for( const option of el.options ) {
							option.selected = values.has(option.value);
						}
					}
				} else {
					el.value = coerceToString(finalValue);
				}
			}
			else if( el.type === 'checkbox' || el.type === 'radio' ) {
				const values = isFunction ? createValueSet(finalValue) : staticValueSet;
				el.checked = values.has(el.value);
			}
			else {
				el.value = coerceToString(finalValue);
			}
		});

		return this;
	});

})();