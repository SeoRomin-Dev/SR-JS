/*
	@ SeoRomin Library Plugin: .formData()
	@ Creates a FormData object from the first form in the matched set, or serializes the form data into a plain object.
	@ Pass `true` to serialize the form data.
	@ Returns a native FormData object, or an object for serialization.
*/
(function() {

	$.extend('formData', function( serialize = false ) {
		// Find the first <form> element in the collection
		const form = this['_sr_elements'].find(el => el.tagName && el.tagName.toUpperCase() === 'FORM');

		// --- Default Behavior: Return FormData object ---
		if( !serialize ) {
			return form ? new FormData(form) : new FormData();
		}

		// --- Serialize Behavior: Return a plain object ---
		if( !form ) {
			return {}; // Return empty object if no form is found
		}

		const result = {};

		// Helper to add values to the result object
		const addValue = ( name, value, isMultiValueField ) => {
			if( Object.hasOwn(result, name) ) {
				// If the key already exists, ensure it's an array and push the new value
				if( !Array.isArray(result[name]) ) {
					result[name] = [result[name]];
				}
				result[name].push(value);
			} else {
				// For new keys, initialize as an array if it's a known multi-value field,
				// otherwise, set it as a single value
				result[name] = isMultiValueField ? [value] : value;
			}
		};

		// Iterate over all form controls in a single pass
		for( const el of form.elements ) {
			// 1. Element must have a `name` and not be disabled to be successful
			if( !el.name || el.disabled ) {
				continue;
			}

			const type = el.type ? el.type.toLowerCase() : '';
			const tagName = el.tagName;
			const isMultiSelect = tagName === 'SELECT' && el.multiple;
			const isCheckbox = type === 'checkbox';

			// 2. Skip buttons and file inputs for serialization consistency
			if( ['file', 'submit', 'reset', 'button'].includes(type) ) {
				continue;
			}

			// 3. Skip unchecked radio/checkbox inputs
			if( (isCheckbox || type === 'radio') && !el.checked ) {
				continue;
			}

			// 4. Handle <select multiple> by adding an entry for each selected option
			if( isMultiSelect ) {
				for( const option of el.options ) {
					if( option.selected ) {
						// The third argument `true` ensures this field is treated as a multi-value field from the start
						addValue(el.name, option.value, true);
					}
				}
			}
			// 5. Handle all other successful controls
			else {
				let value = el.value;
				// For checkboxes, treat default 'on', explicitly set 'on', or empty (`value=""`) as boolean `true`
				// This ensures consistent behavior for checkboxes without a specific value attribute
				if( isCheckbox && (el.getAttribute('value') === '' || value === 'on') ) {
					value = true;
				}
				// Pass `isCheckbox` to ensure even a single checkbox value is stored in an array
				// This creates a consistent data structure for fields that can have multiple values
				addValue(el.name, value, isCheckbox);
			}
		}

		return result;
	});

})();