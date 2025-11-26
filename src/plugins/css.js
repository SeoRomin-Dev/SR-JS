/*
	@ SeoRomin Library Plugin: .css()
	@ Gets a computed style property or sets CSS properties for every element.
	@ Setting a property value to `null` or `undefined` removes it.
	@ Returns the original SR object for chaining.
*/
(function() {

	// Helper to normalize CSS values: trims strings and appends 'px' to numbers where appropriate
	const normalizeValue = ( prop, value ) => {
		// Pass through non-string/number values (like null/undefined)
		if( value == null || (typeof value !== 'string' && typeof value !== 'number') ) {
			return value;
		}

		const strValue = String(value).trim();

		// Do not auto-append 'px' to custom properties
		if( prop.startsWith('--') ) {
			return strValue;
		}

		// Check if it's a plain number (integer or float)
		if( /^-?\d+(\.\d+)?$/.test(strValue) ) {
			const camelProp = $._internal.camelCase(prop);
			// Add 'px' if it's a numeric value for a property that requires units
			if( !$._internal.unitlessCssProps.has(camelProp) ) {
				return strValue + 'px';
			}
		}

		return strValue; // Always return the trimmed string
	};

	$.extend('css', function( prop, value ) {
		// --- GETTER ---
		// .css('property-name')
		if( typeof prop === 'string' && value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			if( !firstEl ) return undefined;

			// Handle both standard (kebab-case) and custom properties
			const propName = prop.startsWith('--') ? prop : $._internal.camelToKebab(prop);
			const styleValue = window.getComputedStyle(firstEl).getPropertyValue(propName).trim();

			// Return undefined for non-existent/invalid properties for API consistency
			return styleValue === '' ? undefined : styleValue;
		}

		// --- SETTER ---
		this.each(function() {
			const element = this;

			// Helper to set or remove a single style property
			const setStyle = ( key, val ) => {
				const finalVal = normalizeValue(key, val);

				// If final value is null or undefined, remove the property
				if( finalVal === null || finalVal === undefined ) {
					const propToRemove = key.startsWith('--') ? key : $._internal.camelToKebab(key);
					element.style.removeProperty(propToRemove);
				} else {
					if( key.startsWith('--') ) {
						element.style.setProperty(key, finalVal);
					} else {
						element.style[$._internal.camelCase(key)] = finalVal;
					}
				}
			};

			// .css({ 'prop': 'value', ... })
			if( typeof prop === 'object' ) {
				for( const [key, val] of Object.entries(prop) ) {
					setStyle(key, val);
				}
			}
			// .css('prop', 'value')
			else if( typeof prop === 'string' ) {
				setStyle(prop, value);
			}
		});

		return this;
	});

})();