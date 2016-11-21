// Loading all the variables necessary for authentication module
// var LocalStrategy    = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var LocalStrategy = require("passport-local").Strategy;
// var TwitterStrategy  = require('passport-twitter').Strategy;
// var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;

var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');

var session = require('express-session');
module.exports = function(passport) {

	//local stretegy for sign-in
	console.log("entered into local-sign-in!");
    passport.use('login', new LocalStrategy(function(username, password, done) {
         // console.log("second here!");
      
        process.nextTick(function(){
         /*var msg_payload = { "username": username, "password": password };
                mq_client.make_request('login_queue',msg_payload, function(err,user){
                    done(null, user);                                         
                             
                });  */  
            });      
    }));

	/*
	 * Passport Session Setup
	 * 	Needed for persistent login sessions
	 * 	Passport needs ability to serialize and deserialize Users Object in and out of the session
	 */

	// Serializing the user for session
//	passport.serializeUser(function(userObject, done) {
//		done(null, userObject.user_id);
//	});

	// Deserializing the user for session
//	passport.deserializeUser(function(user_id, done) {
//		//        User.findById(user_id, function(err, userObject) {
//		//            done(err, userObject);
//		//        });
//		// TODO: Need to refine this logic to fetch the userObject from database based on the user_id provided and return to done function.
//		done(null, null);
//	});

	// =========================================================================
	// LOCAL LOGIN =============================================================
	// =========================================================================
	/*passport.use('local-login', new LocalStrategy({
	    // by default, local strategy uses username and password, we will override with email
	    usernameField : 'email',
	    passwordField : 'password',
	    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
	},
	function(req, email, password, done) {

	    // asynchronous
	    process.nextTick(function() {
	        User.findOne({ 'local.email' :  email }, function(err, user) {
	            // if there are any errors, return the error
	            if (err)
	                return done(err);

	            // if no user is found, return the message
	            if (!user)
	                return done(null, false, req.flash('loginMessage', 'No user found.'));

	            if (!user.validPassword(password))
	                return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

	            // all is well, return user
	            else
	                return done(null, user);
	        });
	    });

	}));*/

	// =========================================================================
	// LOCAL SIGNUP ============================================================
	// =========================================================================
	/* passport.use('local-signup', new LocalStrategy({
	     // by default, local strategy uses username and password, we will override with email
	     usernameField : 'email',
	     passwordField : 'password',
	     passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
	 },
	 function(req, email, password, done) {

	     // asynchronous
	     process.nextTick(function() {

	         //  Whether we're signing up or connecting an account, we'll need
	         //  to know if the email address is in use.
	         User.findOne({'local.email': email}, function(err, existingUser) {

	             // if there are any errors, return the error
	             if (err)
	                 return done(err);

	             // check to see if there's already a user with that email
	             if (existingUser) 
	                 return done(null, false, req.flash('signupMessage', 'That email is already taken.'));

	             //  If we're logged in, we're connecting a new local account.
	             if(req.user) {
	                 var user            = req.user;
	                 user.local.email    = email;
	                 user.local.password = user.generateHash(password);
	                 user.save(function(err) {
	                     if (err)
	                         throw err;
	                     return done(null, user);
	                 });
	             } 
	             //  We're not logged in, so we're creating a brand new user.
	             else {
	                 // create the user
	                 var newUser            = new User();

	                 newUser.local.email    = email;
	                 newUser.local.password = newUser.generateHash(password);

	                 newUser.save(function(err) {
	                     if (err)
	                         throw err;

	                     return done(null, newUser);
	                 });
	             }

	         });
	     });

	 }));*/

	// =========================================================================
	// FACEBOOK ================================================================
	// =========================================================================
	passport.use(new FacebookStrategy({
		clientID : properties.get('passport.facebookAuth.clientID'),
		clientSecret : properties.get('passport.facebookAuth.clientSecret'),
		callbackURL : properties.get('passport.facebookAuth.callbackURL'),
		profileFields : [ 'id', 'displayName', 'emails' ],
		passReqToCallback : true // The req object from user request will be passed back to callback function to allow us to check the session parameters.
	}, function(req, token, refreshToken, profile, done) {
		// Asynchronous
		process.nextTick(function() {
			// Check if the user is already logged in
			mysql.fetchData('external_id, user_id', 'external_authentication', {
				'external_id' : profile.id
			}, (error, external_details) => {
				if(error) {
					throw error;
				} else {
					//check if the user is aready oreset in system?
					if(external_details && external_details.length > 0) {
						if (req.session.loggedInUser) {
							//user is already loggedin
							// Destroy the existing session first and then log someone else in.
							req.session.destroy((error) => {
								mysql.fetchData('user_id, email, f_name, l_name, last_login, active', 'account_details', {
									'user_id' : external_details[0].user_id
								}, (error, account_details) => {
									if(error) {
										throw error;
									} else {
										if(account_details && account_details.length > 0 && account_details[0].active) {
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
							//not loggedin :
							mysql.fetchData('user_id, email, f_name, l_name, last_login, active', 'account_details', {
								'user_id' : external_details[0].user_id
							}, (error, account_details) => {
								if(error) {
									throw error;
								} else {
									if(account_details && account_details.length > 0 && account_details[0].active) {
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
						//new user
						var f_name = profile.displayName.split(' ')[0];
						var l_name = profile.displayName.split(' ')[1];
						mysql.insertData('account_details', {
							'email' : profile.emails[0].value,
							'f_name' : f_name,
							'l_name' : l_name,
							'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
						}, (error, insert_results) => {
							if(error) {
								throw error;
							} else {
								if(insert_results.affectedRows === 1) {
									mysql.insertData('external_authentication', {
										'external_id' : profile.id,
										'user_id' : insert_results.insertId,
										'website' : 'facebook'
									}, (error, results) => {
										// TODO: Send back the inserted userObject from insert_results into callback
										return done(null, insert_results, req.res);
									});
								} else {
									throw new Error('Internal Error');
								}
							}
						})
					}
				}
			});



			//local-stretegy log-in




			/*  User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
			      if (err)
			          return done(err);

			      if (user) {

			          // if there is a user id already but no token (user was linked at one point and then removed)
			          if (!user.facebook.token) {
			              console.log(profile);
			              user.facebook.token = token;
			              user.facebook.name  = profile.displayName;
			              user.facebook.email = profile.emails[0].value;

			              user.save(function(err) {
			                  if (err)
			                      throw err;
			                  return done(null, user);
			              });
			          }

			          return done(null, user); // user found, return that user
			      } else {
			          // if there is no user, create them
			            console.log(profile);
			          var newUser            = new User();

			          newUser.facebook.id    = profile.id;
			          newUser.facebook.token = token;
			          newUser.facebook.name  = profile.displayName;
			          newUser.facebook.email = profile.emails[0].value;

			          newUser.save(function(err) {
			              if (err)
			                  throw err;
			              return done(null, newUser);
			          });
			      }
			  });

            } else {
			  // user already exists and is logged in, we have to link accounts
			  var user            = req.user; // pull the user out of the session

			  user.facebook.id    = profile.id;
			  user.facebook.token = token;
			  user.facebook.name  = profile.displayName;
			  user.facebook.email = profile.emails[0].value;

			      if (err)
			  user.save(function(err) {
			          throw err;
			      return done(null, user);
			  });

            }*/
			});

		}));

		// =========================================================================
		// TWITTER =================================================================
		// =========================================================================
		/*passport.use(new TwitterStrategy({

		    consumerKey     : configAuth.twitterAuth.consumerKey,
		    consumerSecret  : configAuth.twitterAuth.consumerSecret,
		    callbackURL     : configAuth.twitterAuth.callbackURL,
		    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

		},
		function(req, token, tokenSecret, profile, done) {

		    // asynchronous
		    process.nextTick(function() {

		        // check if the user is already logged in
		        if (!req.user) {

		            User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
		                if (err)
		                    return done(err);

		                if (user) {
		                    // if there is a user id already but no token (user was linked at one point and then removed)
		                    if (!user.twitter.token) {
		                        user.twitter.token       = token;
		                        user.twitter.username    = profile.username;
		                        user.twitter.displayName = profile.displayName;

		                        user.save(function(err) {
		                            if (err)
		                                throw err;
		                            return done(null, user);
		                        });
		                    }

		                    return done(null, user); // user found, return that user
		                } else {
		                    // if there is no user, create them
		                    var newUser                 = new User();

		                    newUser.twitter.id          = profile.id;
		                    newUser.twitter.token       = token;
		                    newUser.twitter.username    = profile.username;
		                    newUser.twitter.displayName = profile.displayName;

		                    newUser.save(function(err) {
		                        if (err)
		                            throw err;
		                        return done(null, newUser);
		                    });
		                }
		            });

		        } else {
		            // user already exists and is logged in, we have to link accounts
		            var user                 = req.user; // pull the user out of the session

		            user.twitter.id          = profile.id;
		            user.twitter.token       = token;
		            user.twitter.username    = profile.username;
		            user.twitter.displayName = profile.displayName;

		            user.save(function(err) {
		                if (err)
		                    throw err;
		                return done(null, user);
		            });
		        }

		    });

		}));*/

		// =========================================================================
		// GOOGLE ==================================================================
		// =========================================================================
		/*passport.use(new GoogleStrategy({

		    clientID        : configAuth.googleAuth.clientID,
		    clientSecret    : configAuth.googleAuth.clientSecret,
		    callbackURL     : configAuth.googleAuth.callbackURL,
		    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

		},
		function(req, token, refreshToken, profile, done) {

		    // asynchronous
		    process.nextTick(function() {

		        // check if the user is already logged in
		        if (!req.user) {

		            User.findOne({ 'google.id' : profile.id }, function(err, user) {
		                if (err)
		                    return done(err);

		                if (user) {

		                    // if there is a user id already but no token (user was linked at one point and then removed)
		                    if (!user.google.token) {
		                        user.google.token = token;
		                        user.google.name  = profile.displayName;
		                        user.google.email = profile.emails[0].value; // pull the first email

		                        user.save(function(err) {
		                            if (err)
		                                throw err;
		                            return done(null, user);
		                        });
		                    }

		                    return done(null, user);
		                } else {
		                    var newUser          = new User();

		                    newUser.google.id    = profile.id;
		                    newUser.google.token = token;
		                    newUser.google.name  = profile.displayName;
		                    newUser.google.email = profile.emails[0].value; // pull the first email

		                    newUser.save(function(err) {
		                        if (err)
		                            throw err;
		                        return done(null, newUser);
		                    });
		                }
		            });

		        } else {
		            // user already exists and is logged in, we have to link accounts
		            var user               = req.user; // pull the user out of the session

		            user.google.id    = profile.id;
		            user.google.token = token;
		            user.google.name  = profile.displayName;
		            user.google.email = profile.emails[0].value; // pull the first email

		            user.save(function(err) {
		                if (err)
		                    throw err;
		                return done(null, user);
		            });

		        }

		    });

		}));*/

};