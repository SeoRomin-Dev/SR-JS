/*
	@ SeoRomin Library Plugin: .data()
	@ Stores or retrieves data from an element's internal cache.
	@ Reads from `data-*` attributes on first access, then uses the cache.
*/
(function() {

	// Helper to parse a value from a data attribute (string) into its likely type
	const parseValue = value => {
		if( typeof value !== 'string' ) return value;
		try {
			// Intentionally converts 'true', 'null', '123' etc. to their respective types
			return JSON.parse(value);
		} catch( e ) {
			return value; // Fallback to plain string
		}
	};

	// Internal helper to get a single data value from an element (cache-first)
	const getData = ( element, key ) => {
		const cache = $._internal.dataCache;
		const camelKey = $._internal.camelCase(key);

		// 1. Check cache first
		let elementData = cache.get(element);
		if( elementData && Object.hasOwn(elementData, camelKey) ) {
			return elementData[camelKey];
		}

		// 2. Fallback to dataset, then prime the cache
		// Guard: element.dataset is only available on HTMLElements
		const datasetValue = element.dataset ? element.dataset[camelKey] : undefined;
		if( datasetValue !== undefined ) {
			const parsedValue = parseValue(datasetValue);

			if( !elementData ) {
				elementData = {}; // Create cache if it doesn't exist
				cache.set(element, elementData);
			}

			elementData[camelKey] = parsedValue; // Prime the cache

			return parsedValue;
		}

		return undefined;
	};

	$.extend('data', function( name, value ) {
		const cache = $._internal.dataCache;

		// --- GETTER ---

		// .data(): Get all data for the first element
		if( name === undefined ) {
			const firstEl = this['_sr_elements'][0];
			if( !firstEl ) return undefined;

			const allData = {};

			// 1. Prime cache from all dataset attributes. getData handles cache-first logic
			// Use Object.keys for safe iteration over own properties
			if( firstEl.dataset ) {
				for( const key of Object.keys(firstEl.dataset) ) {
					// This call ensures that any dataset attribute not yet in cache is read, parsed, and cached
					allData[key] = getData(firstEl, key);
				}
			}

			// 2. Merge in any data that was set programmatically and isn't in the dataset
			const cachedData = cache.get(firstEl);
			if( cachedData ) {
				Object.assign(allData, cachedData);
			}

			return allData;
		}

		// .data('key'): Get a single data value
		if( typeof name === 'string' && value === undefined ) {
			const firstEl = this['_sr_elements'][0];
			return firstEl ? getData(firstEl, name) : undefined;
		}

		// --- SETTER ---
		this.each(function() {
			const element = this;
			let elementData = cache.get(element);
			if( !elementData ) {
				elementData = {};
				cache.set(element, elementData);
			}

			const setData = ( key, val ) => {
				const camelKey = $._internal.camelCase(key);
				// A value of undefined removes the data, null is a valid value
				if( val === undefined ) {
					delete elementData[camelKey];
				} else {
					elementData[camelKey] = val;
				}
			};

			// .data({ key: val, ... })
			if( typeof name === 'object' && name !== null ) {
				// Optimize loop using Object.entries to iterate only own properties
				for( const [key, val] of Object.entries(name) ) {
					setData(key, val);
				}
			}
			// .data('key', val)
			else if( typeof name === 'string' ) {
				setData(name, value);
			}
		});

		return this;
	});

})();