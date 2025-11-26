/*
	@ SeoRomin Library Plugin: .prop()
	@ Gets a DOM property value for the first element or sets properties for every element.
	@ Use this for properties like `checked`, `disabled`, `value`.
	@ Returns the original SR object for chaining in setter mode.
*/
(function() {

	$.extend('prop', function( name, value ) {
		// Getter: .prop('propertyName')
		if( typeof name === 'string' && value === undefined ) {
			const propName = name.trim();
			if( !propName ) return undefined;

			const firstEl = this['_sr_elements'][0];
			return firstEl ? firstEl[propName] : undefined;
		}

		// --- SETTER ---

		// Case 1: .prop({ 'prop1': 'val1', ... })
		if( typeof name === 'object' ) {
			this.each(function() {
				const element = this;
				for( const key in name ) {
					if( Object.hasOwn(name, key) ) {
						const propName = key.trim();
						if( propName ) {
							element[propName] = name[key];
						}
					}
				}
			});
		}
		// Case 2: .prop('propName', 'value' | function)
		else if( typeof name === 'string' ) {
			const propName = name.trim();
			if( !propName ) return this;

			const isFunction = typeof value === 'function';
			this.each(function( index ) {
				const element = this;
				const finalValue = isFunction
					? value.call(element, index, element[propName])
					: value;

				element[propName] = finalValue;
			});
		}

		return this;
	});

})();