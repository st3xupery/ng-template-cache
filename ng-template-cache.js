#!/usr/bin/env node

/* global require, module */

// require()s

var fs = require('fs');
var jade = require('jade');
var minify = require('html-minifier').minify;
var junk = require('junk');
var path = require('path');

var opts = require('minimist')(process.argv.slice(2));

var templateFolderPath = opts._[0];
var outputFilePath = opts.o;
var templateFileObject = {};

var options = {
	moduleName: 'templateCache',
	browserify: opts.b !== undefined,
	quote: '\'',
	strict: true,
	indent: '  '
};

var finalTemplate = function (templates, options) {
	var template = '';

	if (options.browserify)
		template = 'var angular = require(\'angular\');\n';

	return template.concat('angular.module("' + options.moduleName + '", []).\n' +
		'run([\'$templateCache\', function($templateCache) {' +
		templates + '\n' +
		'}]);\n');
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

var fileNames = [];
var count = 0;
var templateObj = {};
var deferred = [];

var compileTemplates = function (dir, cb) {
	var templateObj = {},
		file_counter = 1,
		async_running = 0;

	dir = path.normalize(dir).concat('/');

	var again = function (current_dir) {
		fs.lstat(current_dir, function (err, stat) {
			if (err) {
				file_counter--;
				return;
			}
			var fileName = path.parse(current_dir).name;
			if (stat.isFile()) {
				file_counter--;
				templateObj[current_dir.replace(dir, '').replace('.jade', '.html')] = jade.renderFile(current_dir);
			} else if (stat.isDirectory()) {
				file_counter--;
				async_running++;
				fs.readdir(current_dir, function (err, files) {
					async_running--;
					if (err) {
						return;
					}
					files = files.filter(junk.not);
					file_counter += files.length;
					files.forEach(function (file) {
						again(path.join(current_dir, file));
					});
				});
			} else {
				file_counter--;
			}
			if (file_counter === 0 && async_running === 0) {
				cb(templateObj);
			}
		});
	};
	again(dir);
};

compileTemplates(templateFolderPath, function (templateObj) {
	fs.writeFile(outputFilePath, finalTemplate(parsePutTemplate(templateObj), options));
});