/*	Copyright 2013 Chris Zieba <zieba.chris@gmail.com>

	This program is free software: you can redistribute it and/or modify it under the terms of the GNU
	Affero General Public License as published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.
	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
	without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
	PURPOSE. See the GNU Affero General Public License for more details. You should have received a
	copy of the GNU Affero General Public License along with this program. If not, see
	<http://www.gnu.org/licenses/>.
*/

var bcrypt = require('bcrypt'),
	fs = require('fs'),
	sanitizor = require('../../lib/validation/sanitizor'),
	validator = require('../../lib/validation/validator'),
	utils = require('../../lib/utils'),
	models = require('../../models/models'),
	auth = require('../../middleware/manager/auth');

module.exports = function (app) {
	"use strict";

	app.all('/manager/login', auth.login, function (req, res) {
		function view (msg) { 
			var data = { msg : msg };
			res.render('manager/login', data);
		}

		if (req.method === 'POST') {
			var clean_email = sanitizor.clean(req.body.email);
			var clean_password = sanitizor.clean(req.body.password);

			// make sure the input is valid and then sanitize it
			if (validator.check(clean_email, ['required']) && validator.check(clean_password, ['required'])) {	
				models.Users.findOne({ 'email': clean_email }, function (err, user) {
					if (err) {
						console.log(err);
						throw err;
					} 

					if (user) {
						// if a users group is 0 than it is just a regular user and does not have access to the manager
						if (user.group > 0) {
							bcrypt.compare(clean_password, user.password, function(err, found) {
								if (err) {
									console.log(err);
									throw err;
								} 

								if (found) {
									// the password was found!
									req.session.user = {
										id: user.id,
										name: user.name,
										email: user.email,
										group: user.group,
										privledges: user.privledges,
										authenticated: true
									};
									res.redirect('/manager');	
								} else {
									// the password is not in the database or is wrong
									view("The password entered is incorrect.");
								}
							});
						} else {
							// the password is not in the database or is wrong
							view("Access Denied.");
						}
					} else {
						// the password is not in the database or is wrong
						view("The username is not in our database.");
					}
				});
			} else {
				view("Both fields are required to proceed.");
			}
		} else {
			view(null);
		}
	});

	// When a user logs out
	app.get('/manager/logout', auth.validated, function (req, res) {
		req.session.user = {};
		res.redirect('/manager');
	});

	// the error page for insufficient privileges
	app.get('/manager/error', auth.validated, function (req, res) {
		res.render('manager/layout', { 
			title: 'Error',
			name: req.session.user.name,
			layout: 'error',
			back: req.session.back
		});
	});
};