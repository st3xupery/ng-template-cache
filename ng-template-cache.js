#!/usr/bin/env node

/* global require, module */

// require()s

var fs = require('fs');
var jade = require('jade');
var minify = require('html-minifier').minify;

var opts = require('minimist')(process.argv.slice(2));

var templateFolderPath = opts._[0];
var outputFilePath = opts.o;
var templateFileObject = {};

var finalTemplate = function (templates, options) {
	var template = '';
	
	if (options.browserify)
		template = 'var angular = require(\'angular\');\n';

	return template.concat('angular.module("' + options.moduleName + '", []).\n' +
		'run([\'$templateCache\', function($templateCache) {' +
		templates + '\n' +
		'}]);\n');
};

var options = {
	moduleName: 'templateCache',
	quote: '\'',
	strict: true,
	indent: '  '
};

var indent = options.indent;

var putTemplate = function (options) {
	return '$templateCache.put(' + options.name + ', ' + options.template + ');';
};

/**
 * Escape backslashes and the specified quotes and prepend and
 * append a quote.
 *
 * @param {string} The string to quote.
 * @returns The quoted string.
 */
function q(string) {
	var quote = options.quote;
	string = string.replace(/\\/, '\\\\');
	string = string.replace(new RegExp(quote, 'g'), '\\' + quote);
	return quote + string + quote;
}

/**
 * Parse the templates to the putTemplate template.
 *
 * @param {templates} An object consisting of key->value pairs
 *                    of templateName->templateContent.
 */
function parsePutTemplate(templates) {
	var out = '';
	for (var name in templates) {
		var tmpl = q(templates[name]);
		if (tmpl.indexOf('\n') === -1) {
			tmpl = ' ' + tmpl;
		} else {
			var ending = '\n' + indent + indent;
			tmpl = tmpl.replace(/\n/g, '\\n' + q(' +' + ending));
			tmpl = ending + tmpl + '\n' + indent;
		}
		out += '\n' + indent + putTemplate({
			name: q(name),
			template: tmpl
		});
	}
	return out;
}

fs.readdirSync(templateFolderPath).forEach(function (fileName) {
	var key = fileName.substr(0, fileName.lastIndexOf('.')) || fileName;
	templateFileObject[key] = jade.renderFile(templateFolderPath + '/' + fileName);
});

fs.writeFileSync(outputFilePath, finalTemplate(parsePutTemplate(templateFileObject), options));