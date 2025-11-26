/*
	@ SeoRomin Library Plugin: $.ajax()
	@ Performs asynchronous HTTP (Ajax) requests.
	@ Optimized for modern browsers using Fetch API.
*/
(function() {

	// --- Custom Error Classes for Better Diagnostics ---

	class HttpError extends Error {
		constructor( response, responseText ) {
			super(`SR: HTTP Error ${response.status}: ${response.statusText}`);
			this.name = 'HttpError';
			this.status = response.status;
			this.statusText = response.statusText;
			this.responseText = responseText;
			this.response = response; // Full response object for advanced inspection
		}
	}

	class ParserError extends Error {
		constructor( message, responseText, originalError ) {
			super(`SR: Parser Error: ${message}`);
			this.name = 'ParserError';
			this.responseText = responseText;
			this.cause = originalError; // Original error for debugging
		}
	}

	class TimeoutError extends Error {
		constructor( timeout ) {
			super(`SR: Request Timeout (${timeout}ms)`);
			this.name = 'TimeoutError';
			this.status = 0;
			this.statusText = 'timeout';
		}
	}

	class ManualAbortError extends Error {
		constructor() {
			super('SR: Request Aborted');
			// Overwrite name to be consistent with native abort for generic error handling
			this.name = 'AbortError';
			this.status = 0;
			this.statusText = 'abort';
		}
	}

	// --- Helper Functions ---

	// Checks if a value is a "plain" object (created via {} or new Object())
	const isPlainObject = ( obj ) => {
		if( obj === null || typeof obj !== 'object' ) return false;
		const proto = Object.getPrototypeOf(obj);
		return proto === Object.prototype || proto === null;
	};

	// A simplified, robust query string serializer
	// - Accepts only plain objects or arrays
	// - Serializes arrays as `key=value1&key=value2`
	// - Throws errors for nested objects/arrays to enforce simplicity
	const toQueryString = ( data ) => {
		if( !isPlainObject(data) && !Array.isArray(data) ) {
			throw new TypeError('SR: Data for toQueryString must be a plain object or an array.');
		}

		const parts = [];
		// Object.entries works for both plain objects and arrays, producing [key, value] pairs
		const source = Object.entries(data);

		for( const [key, value] of source ) {
			if( value === undefined || typeof value === 'function' ) {
				continue;
			}

			if( value instanceof File || value instanceof Blob ) {
				throw new TypeError('SR: Cannot serialize File/Blob — use FormData with processData: false');
			}

			const prefix = encodeURIComponent(key);

			if( value === null ) {
				parts.push(`${prefix}=`);
			}
			else if( Array.isArray(value) ) {
				for( const item of value ) {
					if( typeof item === 'boolean' ) {
						throw new TypeError('SR: Boolean values in arrays are not supported — convert manually');
					}
					if( item === null || item === undefined || typeof item === 'object' ) {
						throw new TypeError('SR: Nested arrays/objects are not supported in toQueryString');
					}
					parts.push(`${prefix}=${encodeURIComponent(item)}`);
				}
			}
			else if( isPlainObject(value) ) {
				throw new TypeError('SR: Nested objects are not supported in toQueryString');
			}
			else {
				parts.push(`${prefix}=${encodeURIComponent(value)}`);
			}
		}

		return parts.join('&');
	};

	// --- Main AJAX Function ---

	$.ajax = function( options = {} ) {
		// 1. Set Defaults and Configuration
		const {
			url,
			method,
			headers = {},
			data = null,
			dataType,
			contentType = 'application/x-www-form-urlencoded; charset=UTF-8',
			processData = true,
			cache = true,
			timeout = 0,
			xhrFields = {}
		} = options;

		if( !url ) {
			return Promise.reject(new Error('SR: AJAX URL is required'));
		}

		// Normalize method and dataType for robust handling
		const methodUpper = String(method || 'GET').toUpperCase();
		const finalDataType = String(dataType || 'text').toLowerCase();

		// Explicitly reject Blob/ArrayBuffer if processData is true
		if( processData && (data instanceof Blob || data instanceof ArrayBuffer) ) {
			throw new TypeError('SR: processData must be false for Blob or ArrayBuffer data.');
		}

		const isGetOrHead = methodUpper === 'GET' || methodUpper === 'HEAD';
		const reqHeaders = new Headers(headers);
		let reqBody = undefined;
		let reqUrl = url;

		// 2. Header Finalization
		if( typeof contentType === 'string' && !isGetOrHead && !reqHeaders.has('Content-Type') ) {
			// Set the default Content-Type unless processData is false and data is a raw string
			if( processData || typeof data !== 'string' ) {
				reqHeaders.set('Content-Type', contentType);
			}
		}

		if( data instanceof FormData && contentType === false ) {
			reqHeaders.delete('Content-Type');
		}

		// 3. Data and Body Preparation
		if( data !== null && data !== undefined ) {
			if( processData && data instanceof URLSearchParams ) {
				throw new TypeError('SR: Use data.toString() for URLSearchParams');
			}

			const isRawData = data instanceof Blob || data instanceof ArrayBuffer || data instanceof FormData;

			if( isGetOrHead ) {
				if( processData && !isRawData ) {
					const qs = typeof data === 'string' ? data : toQueryString(data);
					if( qs ) reqUrl += (reqUrl.includes('?') ? '&' : '?') + qs;
				}
			} else {
				if( !processData || isRawData ) {
					reqBody = data;
				} else {
					const finalContentType = reqHeaders.get('Content-Type')?.toLowerCase() || '';
					if( finalContentType.includes('application/json') ) {
						reqBody = typeof data === 'string' ? data : JSON.stringify(data);
					} else {
						reqBody = typeof data === 'string' ? data : toQueryString(data);
					}
				}
			}
		}

		// 4. Cache and Other Header Configuration
		if( isGetOrHead && !cache ) {
			const [baseUrl, hash] = reqUrl.split('#');
			const urlParts = baseUrl.split('?');
			const path = urlParts[0];
			const existingParams = new URLSearchParams(urlParts[1] || '');
			existingParams.set('_', Date.now());
			reqUrl = `${path}?${existingParams.toString()}`;
			if( hash !== undefined ) {
				reqUrl += `#${hash}`;
			}
		}

		// Set Accept header based on dataType if not explicitly provided
		if( !reqHeaders.has('Accept') ) {
			switch( finalDataType ) {
				case 'json':
					reqHeaders.set('Accept', 'application/json, text/javascript, */*; q=0.01');
				break;
				case 'html':
					reqHeaders.set('Accept', 'text/html, */*; q=0.01');
				break;
				case 'script':
					reqHeaders.set('Accept', 'text/javascript, application/javascript, */*; q=0.01');
				break;
				case 'text':
					reqHeaders.set('Accept', 'text/plain, */*; q=0.01');
				break;
				default:
					reqHeaders.set('Accept', '*/*');
				break;
			}
		}

		let credentials;
		switch( xhrFields.withCredentials ) {
			case true:
			case 'include':
				credentials = 'include';
			break;
			case 'same-origin':
				credentials = 'same-origin';
			break;
			default:
				credentials = 'omit';
		}

		// 5. Execute Request with Timeout
		const controller = new AbortController();
		// Pass a reason to distinguish timeout from manual abort
		const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(new TimeoutError(timeout)), timeout) : null;

		return fetch(reqUrl, {
			method: methodUpper,
			headers: reqHeaders,
			body: isGetOrHead ? undefined : reqBody,
			signal: controller.signal,
			credentials
		})
		.then(async res => {
			const text = await res.text().catch(() => '');

			if( !res.ok ) {
				throw new HttpError(res, text);
			}

			if( finalDataType === 'json' ) {
				if( !text.trim() ) {
					return null; // An empty body is valid and parses to null
				}
				const contentTypeHeader = res.headers.get('Content-Type') || '';
				if( !contentTypeHeader.includes('json') ) {
					throw new ParserError(`Expected JSON but received Content-Type: '${contentTypeHeader}'`, text, null);
				}
				try {
					return JSON.parse(text);
				} catch( e ) {
					throw new ParserError(e.message, text, e);
				}
			}

			return text;
		})
		.catch(err => {
			if( err.name === 'AbortError' ) {
				// If a reason was provided (e.g., our TimeoutError), re-throw it
				if( controller.signal.reason ) {
					throw controller.signal.reason;
				}
				// Otherwise, it was a manual user-initiated abort
				throw new ManualAbortError();
			}
			// Re-throw other custom errors (HttpError, ParserError, etc.)
			throw err;
		})
		.finally(() => {
			if( timeoutId ) clearTimeout(timeoutId);
		});
	};

})();