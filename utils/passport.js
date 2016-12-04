var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LocalStrategy = require("passport-local").Strategy;
var async = require('async');
var bcrypt = require('bcrypt');

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
			mysql.fetchData('user_id, email, secret, salt, f_name, l_name, active', 'account_details', {
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
									'l_name' : account_details[0].l_name
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
			/*{ id: '1476505045714689',
				  username: undefined,
				  displayName: 'Keyur Golani',
				  name:
				   { familyName: undefined,
				     givenName: undefined,
				     middleName: undefined },
				  gender: undefined,
				  profileUrl: undefined,
				  emails: [ { value: 'keyurgolani@yahoo.com' } ],
				  provider: 'facebook',
				  _raw: '{"id":"1476505045714689","name":"Keyur Golani","email":"keyurgolani\\u0040yahoo.com"}',
				  _json:
				   { id: '1476505045714689',
				     name: 'Keyur Golani',
				     email: 'keyurgolani@yahoo.com' } }*/

			mysql.fetchData('external_id, user_id', 'external_authentication', {
				'external_id' : profile.id
			}, (error, external_details) => {
				if (error) {
					throw error;
				} else {
					if (external_details && external_details.length > 0) {
						if (req.session.loggedInUser) {
							req.session.destroy((error) => {
								mysql.fetchData('user_id, email, f_name, l_name, active', 'account_details', {
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
											}
											return done(null, account_details[0], req);
										}
									}
								})
							});
						} else {
							mysql.fetchData('user_id, email, f_name, l_name, active', 'account_details', {
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
										}
										return done(null, account_details[0], req);
									}
								}
							})
						}
					} else {
						var f_name = profile.displayName.split(' ')[0];
						var l_name = profile.displayName.split(' ')[1];

						mysql.fetchData('user_id', 'account_details', {
							'email' : profile.emails[0].value
						}, (error, account_details) => {
							if (error) {
								throw error;
							} else {
								if (account_details && account_details.length > 0) {

									async.parallel([
										function(callback) {
											mysql.insertData('external_authentication', {
												'external_id' : profile.id,
												'user_id' : account_details[0].user_id,
												'website' : 'facebook'
											}, (error, results) => {
												callback(results);
											});
										},
										function(callback) {
											mysql.insertData('profile_details', {
												'user_id' : account_details[0].user_id
											}, (error, results) => {
												callback(results);
											});
										} ], function(error, results) {

										req.session.loggedInUser = {
											'user_id' : account_details[0].user_id,
											'email' : account_details[0].email,
											'f_name' : account_details[0].f_name,
											'l_name' : account_details[0].l_name,
										}

										return done(null, {
											'user_id' : account_details[0].user_id,
											'email' : profile.emails[0].value,
											'f_name' : f_name,
											'l_name' : l_name
										}, req);
									})

								} else {

									mysql.insertData('account_details', {
										'email' : profile.emails[0].value,
										'f_name' : f_name,
										'l_name' : l_name
									}, (error, insert_results) => {
										if (error) {
											throw error;
										} else {
											if (insert_results.affectedRows === 1) {
												async.parallel([
													function(callback) {
														mysql.insertData('external_authentication', {
															'external_id' : profile.id,
															'user_id' : insert_results.insertId,
															'website' : 'facebook'
														}, (error, results) => {
															callback(results);
														});
													},
													function(callback) {
														mysql.insertData('profile_details', {
															'user_id' : insert_results.insertId
														}, (error, results) => {
															callback(results);
														});
													} ], function(error, results) {

													req.session.loggedInUser = {
														'user_id' : account_details[0].user_id,
														'email' : account_details[0].email,
														'f_name' : account_details[0].f_name,
														'l_name' : account_details[0].l_name,
													}


													return done(null, {
														'user_id' : insert_results.insertId,
														'email' : profile.emails[0].value,
														'f_name' : f_name,
														'l_name' : l_name
													}, req);
												})

											} else {
												throw new Error('Internal Error');
											}
										}
									})
								}
							}
						})

					}
				}
			});
		});

	}));


	//google stretegy
	passport.use(new GoogleStrategy({
		clientID : properties.get('passport.googleAuth.clientID'),
		clientSecret : properties.get('passport.googleAuth.clientSecret'),
		callbackURL : properties.get('passport.googleAuth.callbackURL'),
		//		 profileFields : [ 'id', 'displayName', 'emails' ],
		passReqToCallback : true

	// clientID        : configAuth.googleAuth.clientID,
	// clientSecret    : configAuth.googleAuth.clientSecret,
	// callbackURL     : configAuth.googleAuth.callbackURL,
	// passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
	},

		function(req, token, refreshToken, profile, done) {

			process.nextTick(function() {

				console.log(profile);

				/*{ id: '1476505045714689',
					  username: undefined,
					  displayName: 'Keyur Golani',
					  name:
					   { familyName: undefined,
					     givenName: undefined,
					     middleName: undefined },
					  gender: undefined,
					  profileUrl: undefined,
					  emails: [ { value: 'keyurgolani@yahoo.com' } ],
					  provider: 'facebook',
					  _raw: '{"id":"1476505045714689","name":"Keyur Golani","email":"keyurgolani\\u0040yahoo.com"}',
					  _json:
					   { id: '1476505045714689',
					     name: 'Keyur Golani',
					     email: 'keyurgolani@yahoo.com' } }*/

				mysql.fetchData('external_id, user_id', 'external_authentication', {
					'external_id' : profile.id
				}, (error, external_details) => {
					if (error) {
						throw error;
					} else {
						if (external_details && external_details.length > 0) {
							if (req.session.loggedInUser) {
								req.session.destroy((error) => {
									mysql.fetchData('user_id, email, f_name, l_name, active', 'account_details', {
										'user_id' : external_details[0].user_id
									}, (error, account_details) => {
										if (error) {
											throw error;
										} else {
											if (account_details && account_details.length > 0 && account_details[0].active) {

												if (account_details[0].f_name) {
													req.session.loggedInUser = {
														'user_id' : account_details[0].user_id,
														'email' : account_details[0].email,
														'f_name' : account_details[0].f_name,
														'l_name' : account_details[0].l_name
													}
												} else {
													req.session.loggedInUser = {
														'user_id' : account_details[0].user_id,
														'email' : account_details[0].email
													}
												}
												return done(null, account_details[0], req);

											}
										}
									})
								});
							} else {
								mysql.fetchData('user_id, email, f_name, l_name, active', 'account_details', {
									'user_id' : external_details[0].user_id
								}, (error, account_details) => {
									if (error) {
										throw error;
									} else {
										if (account_details && account_details.length > 0 && account_details[0].active) {
											if (account_details[0].f_name) {
												req.session.loggedInUser = {
													'user_id' : account_details[0].user_id,
													'email' : account_details[0].email,
													'f_name' : account_details[0].f_name,
													'l_name' : account_details[0].l_name
												}
											} else {
												req.session.loggedInUser = {
													'user_id' : account_details[0].user_id,
													'email' : account_details[0].email
												}
											}
											return done(null, account_details[0], req);
										}
									}
								})
							}
						} else {
							console.log("here");
							console.log(profile);
							if (profile.displayName) {
								var f_name = profile.displayName.split(' ')[0];
								var l_name = profile.displayName.split(' ')[1];
							} else {
								var f_name = profile.emails[0].value;
								var l_name = ' ';
							}

							mysql.fetchData('user_id', 'account_details', {
								'email' : profile.emails[0].value
							}, (error, account_details) => {
								if (error) {
									throw error;
								} else {
									if (account_details && account_details.length > 0) {

										async.parallel([
											function(callback) {
												mysql.insertData('external_authentication', {
													'external_id' : profile.id,
													'user_id' : account_details[0].user_id,
													'website' : 'facebook'
												}, (error, results) => {
													callback(results);
												});
											},
											function(callback) {
												mysql.insertData('profile_details', {
													'user_id' : account_details[0].user_id
												}, (error, results) => {
													callback(results);
												});
											} ], function(error, results) {

											req.session.loggedInUser = {
												'user_id' : account_details[0].user_id,
												'email' : account_details[0].email,
												'f_name' : account_details[0].f_name,
												'l_name' : account_details[0].l_name
											}


											return done(null, {
												'user_id' : account_details[0].user_id,
												'email' : profile.emails[0].value,
												'f_name' : f_name,
												'l_name' : l_name
											}, req);
										})

									} else {
										if (account_details && account_details.length > 0) {
											
											async.parallel([
												function(callback) {
													mysql.insertData('external_authentication', {
														'external_id' : profile.id,
														'user_id' : account_details[0].user_id,
														'website' : 'google'
													}, (error, results) => {
														callback(results);
													});
												},
												function(callback) {
													mysql.insertData('profile_details', {
														'user_id' : account_details[0].user_id
													}, (error, results) => {
														callback(results);
													});
												} ], function(error, results) {

														req.session.loggedInUser = {
															'user_id' : insert_results.insertId,
															'email' : profile.emails[0].value,
															'f_name' : f_name,
															'l_name' : l_name
														}


												return done(null, {
													'user_id' : account_details[0].user_id,
													'email' : profile.emails[0].value,
													'f_name' : f_name,
													'l_name' : l_name
												}, req);
											})
											
										}else{

												mysql.insertData('account_details', {
													'email' : profile.emails[0].value,
													'f_name' : f_name,
													'l_name' : l_name
												}, (error, insert_results) => {
													if (error) {
														throw error;
													} else {
														if (insert_results.affectedRows === 1) {
															async.parallel([
																function(callback) {
																	mysql.insertData('external_authentication', {
																		'external_id' : profile.id,
																		'user_id' : insert_results.insertId,
																		'website' : 'facebook'
																	}, (error, results) => {
																		callback(results);
																	});
																},
																function(callback) {
																	mysql.insertData('profile_details', {
																		'user_id' : insert_results.insertId
																	}, (error, results) => {
																		callback(results);
																	});
																} ], function(error, results) {

																req.session.loggedInUser = {
																	'user_id' : insert_results.insertId,
																	'email' : profile.emails[0].value,
																	'f_name' : f_name,
																	'l_name' : l_name
																}

																return done(null, {
																	'user_id' : insert_results.insertId,
																	'email' : profile.emails[0].value,
																	'f_name' : f_name,
																	'l_name' : l_name
																}, req);
															})

														} else {
															throw new Error('Internal Error');
														}
													}
												})
										}
									}
								}
							})



						}
					}
				});
			});

		}));

};