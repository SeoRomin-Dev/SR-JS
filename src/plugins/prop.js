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

		// Setter
		this.each(function( index ) {
			const element = this;

			// .prop({ 'prop1': 'val1', ... })
			if( typeof name === 'object' ) {
				for( const key in name ) {
					if( Object.hasOwn(name, key) ) {
						const propName = key.trim();
						if( propName ) {
							element[propName] = name[key];
						}
					}
				}
			}
			// .prop('propName', 'value' | function)
			else if( typeof name === 'string' ) {
				const propName = name.trim();
				if( !propName ) return; // continue .each loop

				let finalValue = value;

				if( typeof value === 'function' ) {
					finalValue = value.call(element, index, element[propName]);
				}

				element[propName] = finalValue;
			}
		});

		return this;
	});

})();