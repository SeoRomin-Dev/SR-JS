const fs = require('fs');
const path = require('path');
const terser = require('terser');

const { version, license } = require('./package.json');

// --- Path Definitions ---
// Define path relative to the project root
const rootDir = __dirname;

// --- Build Process ---

async function build() {
	try {
		console.log('Starting build process...');

		const srcPath = path.join(rootDir, 'src');
		const distPath = path.join(rootDir, 'dist');

		// Verify that the source directory exists
		if( !fs.existsSync(srcPath) ) {
			throw new Error(`Source directory not found: ${path.relative(rootDir, srcPath)}`);
		}

		// Define the order of files for concatenation
		const filesToProcess = [
			path.join(srcPath, 'sr.js'),
			path.join(srcPath, 'internal.js'),
		];

		const pluginsDir = path.join(srcPath, 'plugins');
		if( fs.existsSync(pluginsDir) && fs.lstatSync(pluginsDir).isDirectory() ) {
			const pluginFiles = fs.readdirSync(pluginsDir)
				.filter(file => file.endsWith('.js'))
				.map(file => path.join(pluginsDir, file));
			filesToProcess.push(...pluginFiles);
		} else {
			console.log('ℹ️ Plugins directory not found, skipping.');
		}

		console.log('\nFiles to be processed in order:');
		filesToProcess.forEach(file => console.log(`- ${path.relative(rootDir, file)}`));

		// Ensure the distribution directory exists
		fs.mkdirSync(distPath, { recursive: true });

		// Step 1: Concatenate files to create the unminified build
		console.log('\n1. Creating unminified build...');
		let concatenatedCode = '';
		for( const file of filesToProcess ) {
			if( fs.existsSync(file) ) {
				concatenatedCode += fs.readFileSync(file, 'utf8') + '\n';
			} else {
				console.warn(`⚠️ Warning: File not found, skipping: ${path.relative(rootDir, file)}`);
			}
		}

		const rawCode = concatenatedCode.trim();
		if( !rawCode ) {
			throw new Error('No code was found to build. Are the source files present and correctly named?');
		}

		const rawOutputPath = path.join(distPath, 'sr.dev.js');
		fs.writeFileSync(rawOutputPath, rawCode, 'utf8');
		console.log(`✅ Unminified build saved to ${path.relative(rootDir, rawOutputPath)}`);

		// Step 2: Minify the code to create the minified build
		console.log('\n2. Creating minified build...');
		const terserOptions = {
			compress: {
				passes: 3,
				booleans: true,
				collapse_vars: true,
				join_vars: true,
				conditionals: true,
				sequences: true,
				if_return: true,
				toplevel: true,
			},
			mangle: {
				toplevel: true,
				reserved: ['$'],
			},
			format: {
				preamble: `/*! @ SeoRomin JS Library v${version} @ Pure JS in action @ Copyright (c) by SeoRomin @ Licensed ${license} */`,
			},
		};

		const minifiedResult = await terser.minify(rawCode, terserOptions);
		if( minifiedResult.error ) {
			throw minifiedResult.error;
		}

		const minOutputPath = path.join(distPath, 'sr.min.js');
		fs.writeFileSync(minOutputPath, minifiedResult.code, 'utf8');
		console.log(`✅ Minified build saved to ${path.relative(rootDir, minOutputPath)}`);
		console.log(`\n🎉 Build process completed successfully! Version: v${version}`);

	} catch( error ) {
		console.error('\nBuild failed:');
		console.error(error.message);
		process.exit(1);
	}
}

build();