/*
	@ SeoRomin Library Plugin: $.ajax()
	@ Performs asynchronous HTTP (Ajax) requests.
	@ Optimized for modern browsers using Fetch API.
*/
(function() {

	// --- Custom Error Classes ---

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

	// A recursive query string serializer
	// Supports nested objects (key[subkey]=value) and arrays (key[]=value)
	const toQueryString = ( data ) => {
		const parts = [];

		const build = ( prefix, obj ) => {
			if( prefix && (obj instanceof File || obj instanceof Blob) ) {
				throw new TypeError('SR: Cannot serialize File/Blob - use FormData with processData: false');
			}

			if( Array.isArray(obj) ) {
				// Serialize array items
				obj.forEach(( v, i ) => {
					// Style: brackets [] for simple arrays, [index] for complex (objects)
					const isComplex = typeof v === 'object' && v !== null;
					build(isComplex ? `${prefix}[${i}]` : `${prefix}[]`, v);
				});
			} else if( obj !== null && typeof obj === 'object' ) {
				// Serialize object keys
				for( const name in obj ) {
					if( Object.hasOwn(obj, name) ) {
						build(prefix ? `${prefix}[${name}]` : name, obj[name]);
					}
				}
			} else {
				// Primitive value
				const val = typeof obj === 'function' ? obj() : obj;
				if( val !== undefined ) {
					parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(val === null ? '' : val)}`);
				}
			}
		};

		build('', data);
		// Replace spaces with '+' for standard application/x-www-form-urlencoded encoding
		return parts.join('&').replace(/%20/g, '+');
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
			crossDomain = undefined, // Undefined allows auto-detection
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

		// 2. Cache Configuration
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

		// 3. Header Finalization

		// Auto-detect crossDomain if not explicitly provided
		const isCrossDomain = crossDomain !== undefined ? !!crossDomain : (() => {
			try {
				// Resolve the request URL against the current window location
				const requestOrigin = new URL(reqUrl, window.location.href).origin;
				return requestOrigin !== window.location.origin;
			} catch( e ) {
				return true; // Fail safe: treat invalid URLs as cross-domain
			}
		})();

		// Add X-Requested-With header for same-origin requests
		// This is crucial for servers to detect AJAX requests
		if( !isCrossDomain && !reqHeaders.has('X-Requested-With') ) {
			reqHeaders.set('X-Requested-With', 'XMLHttpRequest');
		}

		if( typeof contentType === 'string' && !isGetOrHead && !reqHeaders.has('Content-Type') ) {
			// Set the default Content-Type unless processData is false and data is a raw string
			if( processData || typeof data !== 'string' ) {
				reqHeaders.set('Content-Type', contentType);
			}
		}

		if( data instanceof FormData && contentType === false ) {
			reqHeaders.delete('Content-Type');
		}

		// 4. Data and Body Preparation
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

		// Determine credentials policy
		// Default to 'same-origin' to behave like standard XHR (sending cookies for same domain)
		let credentials = 'same-origin';
		if( xhrFields.withCredentials === true ) {
			credentials = 'include';
		} else if( xhrFields.withCredentials === false ) {
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
				// We attempt to parse any response as JSON if requested, regardless of headers
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