var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require("passport-local").Strategy;

// var bcrypt = require('bcrypt');

var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');

var session = require('express-session');
module.exports = function(passport) {
	passport.use('local_login', new LocalStrategy({
		usernameField : 'email',
		passwordField : 'password',
		session : false
	}, (username, password, done) => {
		process.nextTick(() => {
			mysql.fetchData('user_id, email, secret, salt, f_name, l_name, last_login, active', 'account_details', {
				'email' : username
			}, (error, account_details) => {
				if (error) {
					throw error;
				} else {
					if (account_details && account_details.length > 0) {
						if (account_details[0].active) {
							var salt = account_details[0].salt;
							var fetchedPassword = account_details[0].secret;
							if (bcrypt.hashSync(password, salt) === fetchedPassword) {
								done(null, {
									'user_id' : account_details[0].user_id,
									'email' : account_details[0].email,
									'f_name' : account_details[0].f_name,
									'l_name' : account_details[0].l_name,
									'last_login' : account_details[0].last_login
								});
							} else {
								done(401, null);
							}
						} else {
							done(451, null);
						}
					} else {
						done(404, null);
					}
				}
			});
		});
	})
	);

	passport.use(new FacebookStrategy({
		clientID : properties.get('passport.facebookAuth.clientID'),
		clientSecret : properties.get('passport.facebookAuth.clientSecret'),
		callbackURL : properties.get('passport.facebookAuth.callbackURL'),
		profileFields : [ 'id', 'displayName', 'emails' ],
		passReqToCallback : true
	}, function(req, token, refreshToken, profile, done) {
		process.nextTick(function() {
			mysql.fetchData('external_id, user_id', 'external_authentication', {
				'external_id' : profile.id
			}, (error, external_details) => {
				if (error) {
					throw error;
				} else {
					if (external_details && external_details.length > 0) {
						if (req.session.loggedInUser) {
							req.session.destroy((error) => {
								mysql.fetchData('user_id, email, f_name, l_name, last_login, active', 'account_details', {
									'user_id' : external_details[0].user_id
								}, (error, account_details) => {
									if (error) {
										throw error;
									} else {
										if (account_details && account_details.length > 0 && account_details[0].active) {
											req.session.loggedInUser = {
												'user_id' : account_details[0].user_id,
												'email' : account_details[0].email,
												'f_name' : account_details[0].f_name,
												'l_name' : account_details[0].l_name,
												'last_login' : account_details[0].last_login
											}
											mysql.updateData('account_details', {
												'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
											}, {
												'user_id' : account_details[0].user_id
											}, (error, results) => {
												return done(null, account_details[0], req.res);
											});
										}
									}
								})
							});
						} else {
							mysql.fetchData('user_id, email, f_name, l_name, last_login, active', 'account_details', {
								'user_id' : external_details[0].user_id
							}, (error, account_details) => {
								if (error) {
									throw error;
								} else {
									if (account_details && account_details.length > 0 && account_details[0].active) {
										req.session.loggedInUser = {
											'user_id' : account_details[0].user_id,
											'email' : account_details[0].email,
											'f_name' : account_details[0].f_name,
											'l_name' : account_details[0].l_name,
											'last_login' : account_details[0].last_login
										}
										mysql.updateData('account_details', {
											'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
										}, {
											'user_id' : account_details[0].user_id
										}, (error, results) => {
											return done(null, account_details[0], req.res);
										});
									}
								}
							})
						}
					} else {
						var f_name = profile.displayName.split(' ')[0];
						var l_name = profile.displayName.split(' ')[1];
						mysql.insertData('account_details', {
							'email' : profile.emails[0].value,
							'f_name' : f_name,
							'l_name' : l_name,
							'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
						}, (error, insert_results) => {
							if (error) {
								throw error;
							} else {
								if (insert_results.affectedRows === 1) {
									mysql.insertData('external_authentication', {
										'external_id' : profile.id,
										'user_id' : insert_results.insertId,
										'website' : 'facebook'
									}, (error, results) => {
										return done(null, {
											'user_id' : insert_results.insertId,
											'email' : profile.emails[0].value,
											'f_name' : f_name,
											'l_name' : l_name,
											'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
										}, req.res);
									});
								} else {
									throw new Error('Internal Error');
								}
							}
						})
					}
				}
			});
		});

	}));

};