//Status code 401 : User Session not present

var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');
var logger = require('../utils/logger');
var cache = require('../utils/cache');
var pdf = require('html-pdf');
var utility = require('../utils/utility');
var async = require("async");
var barcode = require('barcode');

var NodeGeocoder = require('node-geocoder');
var GeoPoint = require('geopoint');
//var bcrypt = require('bcrypt');

var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
// require('./config/passport')(passport); // pass passport for configuration


/* GET home page. */
router.get('/', (req, res, next) => {
	cache.fetchItem('user', 1, (userID, callback) => {
		console.log('----------------------Missed Logic!!!---------------------------');
		callback('Keyur Golani');
	}, (result) => {
		console.log('----------------------Process Result!!!---------------------------');
		res.render('index', {
			title : result
		});
	});
});


router.get('/sample', (req, res, next) => {
	res.render('sample');
});

router.post('/addListing', (req, res, next) => {
	//	if(req.session.loggedInUser) {
	//		var owner_id = req.session.loggedInUser.user_id;

	// Listings Table Fields

	if(req.session.loggedInUser){
	var property_id = req.body.property_id;
	var room_type_id = req.body.room_type.room_type_id;
	var title = req.body.title;
	var is_bid = req.body.is_bid;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;
	var daily_price = req.body.daily_price;
	var bedrooms = req.body.bedrooms;
	var accommodations = req.body.accommodations;
	var active = true; //A listing is active by default at the time of adding new listing

	// Listing Details Table Fields
	var description = req.body.description;
	var bathrooms = req.body.bathrooms;
	var beds = req.body.beds;
	var checkin = req.body.checkin;
	var checkout = req.body.checkout;

	//TODO Get user Id from session
	//var userId = req.session.user.userId;
	var userId = 1;

	mysql.insertData('listings', {
		'property_id' : property_id,
		'room_type_id' : room_type_id,
		'title' : title,
		'is_bid' : is_bid,
		'start_date' : start_date,
		'end_date' : end_date,
		'daily_price' : daily_price,
		'bedrooms' : bedrooms,
		'accommodations' : accommodations,
		'active' : active
	}, (error, listing_insert_result) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (listing_insert_result.affectedRows === 1) {
				mysql.insertData('listing_details', {
					'listing_id' : listing_insert_result.insertId,
					'description' : description,
					'bathrooms' : bathrooms,
					'beds' : beds,
					'checkin' : checkin,
					'checkout' : checkout
				}, (error, listing_details_insert_result) => {
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (listing_details_insert_result.affectedRows === 1) {
							console.log("End Date Here", end_date);
							end_date = new Date(end_date);
							console.log('end_date', end_date);
							var current_date = new Date();
							console.log('current_date', current_date);

							var time = end_date.getTime() - current_date.getTime();

							//automate task to inactivate the listing after end date!
							setTimeout(function() {

								mysql.updateData('listings', {
									'active' : 0
								}, {
									'listing_id' : listing_insert_result.insertId
								}, function(error, result) {
									if (error) {
										console.log("error in update of listing!");

									} else {
										if (result.affectedRows === 1) {
											console.log("success in update of listing!")
										} else {
											console.log("error in update of listing!");
										}
									}
								});

							}, 999999999);


							//this is to setup automatic task for the bid winner
							if (is_bid) {
								console.log('is_bid', is_bid);

								setTimeout(function() {
									var query = "select * from bid_details WHERE listing_id = ? AND bid_amount = (SELECT MAX(bid_amount) FROM bid_details WHERE listing_id = ?)";
									var parameters = [ listing_insert_result.insertId, listing_insert_result.insertId ];

									mysql.executeQuery(query, parameters, function(error, winner) {
										if (error) {
											console.log('error', error);
										} else {
											if (winner && winner.length > 0) {

												console.log("highest bidder is selected");

												//update trip_details and bid_details

												mysql.insertData('trip_details', {
													'listing_id' : listing_insert_result.insertId,
													'checkin' : start_date,
													'checkout' : end_date,
													'deposit' : 100,
													'no_of_guests' : winner[0].no_of_guests,
													'user_id' : userId,
													'active' : 1,
													'trip_amount' : winner[0].bid_amount
												}, (error, trip) => {

													if (error) {
														console.log(error);
													} else {
														var receipt_id = utility.generateReceiptNo();

														//TODO
														var cc_id = 1;
														//generate bill
														mysql.insertData('bill_details', {
															'trip_id' : trip.insertId,
															'receipt_id' : receipt_id,
															'cc_id' : cc_id
														}, (error, results) => {
															console.log('error, results', error, results);
															if (error) {
																console.log(error);
															} else {
																console.log("highest bidder is selected and got the property to stay.");
															}
														})
													}
												})
											} else {
												console.log("No bidder is awarded for the selected property");
											/*res.send({
												'statusCode' : 500
											});*/
											}
										}
									})

								}, properties.get('project.bidTimeOut'));
							}


							res.send({
								'statusCode' : 200
							});

							// res.redirect('/');
						} else {
							res.send({
								'statusCode' : 500
							});
						}
					}
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	});

	} else {
		res.redirect('/');
	}
});

router.post('/addProperty', (req, res, next) => {
	if (req.session.loggedInUser) {
		var owner_id = req.session.loggedInUser.user_id;
		var property_type_id = req.body.property_type.property_type_id;
		var house_rules = req.body.house_rules;
		var longitude = req.body.location.longitude;
		var latitude = req.body.location.latitude;
		var st_address = req.body.location.st_address;
		var apt = req.body.location.apt;
		var city = req.body.location.city;
		var state = req.body.location.state;
		var zip = req.body.location.zip;
		var photos = req.body.photos;
		var active = true; //Default value at the time of adding new property.

		mysql.insertData('property_details', {
			'owner_id' : owner_id,
			'property_type_id' : property_type_id,
			'house_rules' : house_rules,
			'longitude' : longitude,
			'latitude' : latitude,
			'st_address' : st_address,
			'apt' : apt,
			'city' : city,
			'state' : state,
			'zip' : zip,
			'active' : active
		}, function(error, result) {
			if (error) {
				res.send({
					'statusCode' : 500
				});
			} else {
				if (result.affectedRows === 1) {
					for (var i = 0; i < photos.length; i++) {
						req.db.get('property_photos').insert({
							'property_id' : result.insertId,
							'photos' : photos[i]
						});
					}
					res.send({
						'statusCode' : 200
					});
				} else {
					res.send({
						'statusCode' : 500
					});
				}
			}
		});
	} else {
		res.send({
			'status_code' : 401
		})

		// res.redirect('/');
	}
});

router.post('/register', function(req, res, next) {
	var first_name = req.body.firstname;
	var last_name = req.body.lastname;
	var email = req.body.email;
	var secret = req.body.password;
	var month = req.body.month;
	var day = req.body.day;
	var year = req.body.year;

	if (req.body.password === null || req.body.password === undefined) {
		res.send({
			'statusCode' : 400
		});
	}

	var salt = bcrypt.genSaltSync(10);
	mysql.fetchData('user_id, email', 'account_details', {
		'email' : email
	}, (error, results) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 409
				});
			} else {
				if (!results || results.length === 0) {

					mysql.insertData('account_details', {
						'email' : email,
						'f_name' : first_name,
						'l_name' : last_name,
						'secret' : bcrypt.hashSync(secret, salt),
						'salt' : salt
					}, (error, account_result) => {
						console.log('error, account_result', error, account_result);
						if (error) {
							res.send({
								'statusCode' : 500
							});
						} else {
							if (account_result.affectedRows === 1) {
								mysql.insertData('profile_details', {
									'user_id' : account_result.insertId,
									'month' : req.body.month,
									'day' : req.body.day,
									'year' : req.body.year
								}, (error, profile_result) => {
									console.log('error, profile_result', error, profile_result);
									if (error) {
										res.send({
											'statusCode' : 500
										});
									} else {
										if (profile_result.affectedRows === 1) {
											mysql.insertData('login_history', {
												'user_id' : account_result.insertId,
												'user_agent' : req.body.user_agent.os + ' ' + req.body.user_agent.os_version + ' - ' + req.body.user_agent.browser + ' ' + req.body.user_agent.browser_version
											}, (error, result) => {
												console.log('error, result', error, result);
												res.send({
													'statusCode' : 200
												});
											});
										} else {
											res.send({
												'statusCode' : 500
											});
										}
									}
								});
							} else {
								res.send({
									'statusCode' : 500
								});
							}
						}
					});
				}
			}
		}
	});

});

// Facebook Authentication

// Authentication Request to Facebook
router.get('/auth/facebook', function(req, res, next) {
	req.session.user_agent = JSON.parse(req.query.user_agent);
	passport.authenticate('facebook', {
		scope : [ 'email' ]
	})(req, res, next);
});

// Post Authentication Logic
router.get('/auth/facebook/callback', passport.authenticate('facebook', (error, userObject, req) => {
	if (error) {
		console.log("Redirecting to homepage!");
		req.res.redirect('/');
	} else {
		if (userObject) {
			mysql.insertData('login_history', {
				'user_id' : userObject.user_id,
				'user_agent' : req.session.user_agent.os + ' ' + req.session.user_agent.os_version + ' - ' + req.session.user_agent.browser + ' ' + req.session.user_agent.browser_version
			}, (error, result) => {
				console.log('error, result', error, result);
				console.log("Redirecting to homepage!");
				req.res.redirect('/');
			});
		}
	}
}));

//google Authentication

//Authentication Request to Facebook
router.get('/auth/google', function(req, res, next) {
	req.session.user_agent = JSON.parse(req.query.user_agent);
	passport.authenticate('google', {
		scope : [ 'email' ]
	})(req, res, next);
});

//Post Authentication Logic
router.get('/auth/google/callback', passport.authenticate('google', (error, userObject, req) => {

	console.log(userObject);
	if (error) {
		console.log(error);
	//     req.res.redirect('/');
	} else {
		if (userObject) {
			mysql.insertData('login_history', {
				'user_id' : userObject.user_id,
				'user_agent' : req.session.user_agent.os + ' ' + req.session.user_agent.os_version + ' - ' + req.session.user_agent.browser + ' ' + req.session.user_agent.browser_version
			}, (error, result) => {
				req.res.redirect('/');
			});
		}
	}
}));

router.post('/updateProfile', (req, res, next) => {
	var f_name = req.body.f_name;
	var l_name = req.body.l_name;
	var gender = req.body.gender;
	var birth_month = req.body.birth_month;
	var birth_date = req.body.birth_date;
	var birth_year = req.body.birth_year;
	var email = req.body.email;
	var phone = req.body.phone;
	var city = req.body.city;
	var state = req.body.state;
	var description = req.body.description;

		async.parallel([
			function(callback) {
				mysql.updateData('account_details', {
					"email" : email,
					"f_name" : f_name,
					"l_name" : l_name,
				}, {
					"user_id" : req.session.loggedInUser.user_id
				}, (error, result) => {
					console.log('error, result', error, result);
					if (error) {
						throw error;
					} else {
						callback(null, result);
					}
				});
			},
			function(callback) {
				mysql.updateData('profile_details', {
					"gender" : gender,
					"phone" : phone,
					"description" : description,
					"day" : birth_date,
					"month" : birth_month,
					"year" : birth_year,
					"city" : city,
					"state" : state
				}, {
					"user_id" : req.session.loggedInUser.user_id
				}, (error, result2) => {
					console.log('error, result2', error, result2);
					if (error) {
						throw error;
					} else {
						callback(null, result2);
					}
				});
			}
		], function(error, results) {
			if (error) {
				res.send({
					'statusCode' : 500
				});
			} else {
				res.send({
					'statusCode' : 200
				});
			}
		});
});

router.post('/getPendingHostApprovals', (req, res, next) => {

	mysql.fetchData('*', 'account_details', {'is_host' : 0}, (error, results) => {
		console.log("error, results", error, results);
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'users' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/approveHost', (req, res, next) => {
	var user_id = req.body.user_id;

	mysql.updateData('account_details', {
		"is_host" : 1
	}, {
		"user_id" : user_id
	}, (error, results) => {
		console.log("error, results", error, results);
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results) {
				res.send({
					'statusCode' : 200
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/fetchRoomTypes', (req, res, next) => {

	// >>>>>>>>
	// req.session.loggedInUser
	mysql.fetchData('room_type_id, room_type', 'room_types', null, (error, results) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'room_types' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/changePropertyStatus', (req, res, next) => {
	console.log("jere");
	var status;
	var property_id = req.body.property_id;

	if (req.body.status === "deactivate") {
		status = 0;
	} else {
		status = 1;
	}

	console.log('status', status);

	mysql.updateData('property_details', {
		"active" : status
	}, {
		"property_id" : property_id
	}, (error, results) => {

		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results) {
				res.send({
					'statusCode' : 200
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/changeListingStatus', (req, res, next) => {
	var status;
	var listing_id = req.body.listing_id;

	if (req.body.status === "deactivate") {
		status = 0;
	} else {
		status = 1;
	}

	console.log('status', status);

	mysql.updateData('listings', {
		"active" : status
	}, {
		"listing_id" : listing_id
	}, (error, results) => {

		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results) {
				res.send({
					'statusCode' : 200
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/updatePassword', (req, res, next) => {

	var user_id = req.session.loggedInUser.user_id;


	var password = req.body.old_pass;
	var new_pass = req.body.new_pass;
	mysql.fetchData('secret, salt, active', 'account_details', {
		"user_id" : user_id
	}, (error, results) => {
		console.log('error, results', error, results);
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				if (results[0].active) {
					var salt = results[0].salt;
					var fetchedPassword = results[0].secret;
					if (bcrypt.hashSync(password, salt) === fetchedPassword) {

						//password matches! update the new password

						var salt = bcrypt.genSaltSync(10);
						var new_secret = bcrypt.hashSync(new_pass, salt);

						mysql.updateData('account_details', {
							"secret" : new_secret,
							"salt" : salt
						}, {
							"user_id" : user_id
						}, (error, results) => {
							console.log('error, results', error, results);
							if (error) {
								res.send({
									'statusCode' : 500
								});
							} else {
								if (results) {
									res.send({
										'statusCode' : 200
									});
								} else {
									res.send({
										'statusCode' : 500
									});
								}
							}
						})

					} else {
						console.log("Password is incorrect");
						res.send({
							'statusCode' : 500
						});
					}
				} else {
					console.log("user is no longer active!");
					res.send({
						'statusCode' : 500
					});
				}
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/addCard', (req, res, next) => {

	var cc_no = req.body.cc_no;
	var cc_month = req.body.cc_month;
	var cc_year = req.body.cc_year;
	var first_name = req.body.first_name;
	var last_name = req.body.last_name;
	var security = req.body.security;
	var postal = req.body.postal;
	var country = req.body.country;

	var user_id = req.session.loggedInUser.user_id;


	var JSON_OBJ = {
		"card_number" : utility.maskCard(cc_no),
		"card_number_full" : cc_no,
		"cvv" : security,
		"exp_month" : cc_month,
		"exp_year" : cc_year,
		"first_name" : first_name,
		"last_name" : last_name,
		"postal_code" : postal,
		"country" : country,
		"user_id" : user_id
	}

	mysql.insertData('card_details', JSON_OBJ, (error, results) => {
		console.log('error, results', error, results);
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					"card_id" : results.insertId
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});


router.post('/fetchPropertyTypes', (req, res, next) => {
	mysql.fetchData('property_type_id, property_type', 'property_types', null, (error, results) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'property_types' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/fetchAmenities', (req, res, next) => {
	mysql.fetchData('amenity_id, amenity', 'amenities', null, (error, results) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'amenities' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/fetchUserProperties', (req, res, next) => {
	var owner = req.body.owner;
	mysql.fetchData('*', 'property_details', {
		'owner_id' : owner
	}, (error, results) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'property_details' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/fetchUserListings', (req, res, next) => {
	var owner = req.body.owner;

	var query = "select * from property_details,listings WHERE  property_details.owner_id = ? AND property_details.property_id=listings.property_id";
	var parameters = [ owner ];

	mysql.executeQuery(query, parameters, function(error, results) {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'property_details' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/fetchUserTrips', (req, res, next) => {
	var user_id = req.body.owner;

	var query = "select * from trip_details,property_details,listings WHERE trip_details.user_id = ? AND trip_details.listing_id= listings.listing_id AND listings.property_id=property_details.property_id";
	var parameters = [ user_id ];

	mysql.executeQuery(query, parameters, function(error, results) {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'property_details' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/fetchUserHostings', (req, res, next) => {
	var user_id = req.body.owner;

	var query = "select * from trip_details,property_details,listings WHERE property_details.owner_id = ? AND listings.property_id=property_details.property_id AND trip_details.listing_id = listings.listing_id";
	var parameters = [ user_id ];

	mysql.executeQuery(query, parameters, function(error, results) {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'property_details' : results
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})
});

router.post('/deactivateUserAccount', (req, res, next) => {
	if(req.session && req.session.loggedInUser) {
		var user_id = req.session.loggedInUser.user_id;
		console.log("user_id", user_id);
		
		mysql.updateData('account_details', {'active' : 0}, {'user_id' : user_id}, function(error, results) {
			console.log("error, results", error, results);
			if (error) {
				res.send({
					'statusCode' : 500
				});
			} else {
					res.send({
						'statusCode' : 200
					});
			}
		})
	} else {
		res.send({
			'statusCode' : 401
		});
	}
});

router.post('/adminLogin', (req, res, next) => {
	var email = req.body.email;
	var password = req.body.password;
	console.log("Here");
	var query = "select * from admin_user where username = ? AND password = ?";
	var parameters = [email, password];
		mysql.executeQuery(query, parameters, function(error, results) {
			console.log("error, results", error, results);
			if (error) {
				res.send({
					'statusCode' : 500
				});
			} else {
				if(results && results.length > 0) {
					req.session.loggedInUser = {
							'user_id' : results[0].user_id,
							'email' : results[0].username,
							'f_name' : 'admin'
						}
					res.send({
						'statusCode' : 200
					});
				} else {
					res.send({
						'statusCode' : 500
					});
				}
			}
		})
});

router.get('/viewListing', function(req, res, next) {
	var listing_id = req.query.listing;
	if (req.session && req.session.loggedInUser) {
		var user_id = req.session.loggedInUser.user_id;
		logger.pageClickLogger(listing_id, user_id);
	}
	var query = "select * from property_details,property_types,room_types,listing_details,listings,account_details WHERE  listings.listing_id = ? AND listing_details.listing_id = ? AND listings.room_type_id = room_types.room_type_id AND listings.property_id = property_types.property_type_id AND listings.property_id = property_details.property_id AND property_details.owner_id = account_details.user_id";
	var parameters = [ listing_id, listing_id ];
	mysql.executeQuery(query, parameters, function(error, results) {
		if (error) {
			res.render('error', {
				'statusCode' : 500,
				'message' : 'Internal Error'
			});
		} else {
			if (results && results.length > 0) {
				results[0].start_date = require('fecha').format(new Date(results[0].start_date), 'MM/DD/YYYY');
				results[0].end_date = require('fecha').format(new Date(results[0].end_date), 'MM/DD/YYYY');
				
				async.parallel([function(callback) {
					mysql.executeQuery('select trip_details.user_id as traveller_id, host_review, host_rating, host_rating_timestamp, f_name, l_name from ratings right join trip_details on ratings.trip_id = trip_details.trip_id inner join listings on listings.listing_id = trip_details.listing_id inner join account_details on trip_details.user_id = account_details.user_id where listings.listing_id = ?', [listing_id], function(error, ratings) {
						if(error) {
							res.send({
								'statusCode' : 500
							});
						} else {
							var itemsProcessed = 0;
							ratings.forEach(function(item, index, array) {
								req.db.get('user_photos').find({
									'user_id' : item.traveller_id
								}).then((docs) => {
									itemsProcessed++;
									ratings[index].profilePic = docs;
									if(itemsProcessed === array.length) {
										results[0].ratings = ratings;
										callback();
									}
								});
							});
						}
					});
				}, function(callback) {
					mysql.executeQuery('select avg(host_rating) as average_rating from ratings right join trip_details on ratings.trip_id = trip_details.trip_id where trip_details.listing_id = ?', [listing_id], function(error, average_rating) {
						if(error) {
							res.send({
								'statusCode' : 500
							});
						} else {
							results[0].avg_rating = average_rating;
							callback();
						}
					});
				}, function(callback) {
					req.db.get('property_photos').find({
						'property_id' : Number(results[0].property_id)
					}).then((docs) => {
						results[0].photos = docs;
						callback();
					})
				}, function(callback) {
					req.db.get('user_photos').find({
						'user_id' : results[0].owner_id
					}).then((docs) => {
						results[0].owner_photo = docs;
						callback();
					})
				}], function(error, finalResults) {
					res.render('viewListing', {
						data : JSON.stringify(results[0])
					});
				});
			} else {
				res.render('error', {
					'statusCode' : 204,
					'message' : 'Listing expired or unlisted!'
				});
			}
		}
	})
});

router.post('/placeBidOnListing', function(req, res, next) {
	var listing_id = req.body.listing_id;
	var checkin = req.body.checkin;
	var checkout = req.body.checkout;
	var bid_amount = req.body.bid_amount;
	var no_of_guests = req.body.guests;
	console.log('no_of_guests', no_of_guests);
	var accommodations = req.body.accommodations;
	console.log('accommodations', accommodations);
	var base_price = req.body.daily_price;
	console.log('base_price', base_price);
	//TODO Get user Id from session
	//var userId = req.session.user.userId;
	var userId = 1;

	//do bidding log

	logger.bidLogger(listing_id, userId, bid_amount);

	if (bid_amount > base_price && no_of_guests <= accommodations) {

		console.log("valid bid!");

		//update the daily_price as bid_amount in listings
		mysql.updateData('listings', {
			'daily_price' : bid_amount
		}, {
			'listing_id' : listing_id
		}, function(error, results) {
			console.log('error, results', error, results);
			if (error) {
				res.send({
					'statusCode' : 500
				});
			} else {

				//insert the bid details in bid_details table
				mysql.insertData('bid_details', {
					'listing_id' : listing_id,
					'checkin' : checkin,
					'checkout' : checkout,
					'bid_amount' : bid_amount,
					'bidder_id' : userId,
					'no_of_guests' : no_of_guests
				}, (error, results) => {
					console.log('error, results', error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						res.send({
							'statusCode' : 200,
							'updated_base_price' : bid_amount
						});
					}
				})
			}
		})

	} else {

		if (bid_amount < base_price) {
			console.log("entered bid amount is less than the listing amount");
		}
		if (no_of_guests > accommodations) {
			console.log("entered no. of guests are more than the listing specified!");
		} else {
			console.log("you have entered bid price less than the listing price and also no. of guests are more than specified listing");
		}

		res.send({
			'statusCode' : 500
		});
	}
});

router.post('/instantBook', function(req, res, next) {
	var listing_id = req.body.listing_id;
	var checkin = req.body.checkin;
	var checkout = req.body.checkout;
	var deposit = 100;
	var no_of_guests = req.body.guests;
	var active = 1;
	var trip_amount = req.body.trip_amount;

	//TODO Get user Id from session
	var userId = req.session.loggedInUser.user_id;
//	var userId = 1;

	mysql.fetchData('*', 'trip_details', {
		'listing_id' : listing_id
	}, (error, results) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				var isValid = true;
				for (var i = 0; i < results.length; i++) {
					var checkinDate = new Date(checkin);
					var checkinDateDB = new Date(results[i].checkin);
					var checkoutDate = new Date(checkout);
					var checkoutDateDB = new Date(results[i].checkout);
					if (!(checkinDate.getTime() > checkoutDateDB.getTime()
						|| checkoutDate.getTime() < checkinDateDB.getTime())) {
						isValid = false;
					}
				}
				if (isValid) {
					mysql.insertData('trip_details', {
						'listing_id' : listing_id,
						'checkin' : checkin,
						'checkout' : checkout,
						'deposit' : deposit,
						'no_of_guests' : no_of_guests,
						'user_id' : userId,
						'active' : active,
						'trip_amount' : trip_amount
					}, (error, trip) => {

						if (error) {
							res.send({
								'statusCode' : 500
							});
						} else {
//							var receipt_id = uuid.v1();
							var receipt_id = utility.generateReceiptNo(10);

							//TODO
							var cc_id = 1;
							//generate bill
							mysql.insertData('bill_details', {
								'trip_id' : trip.insertId,
								'receipt_id' : receipt_id,
								'cc_id' : cc_id
							}, (error, results) => {
								console.log('error, results', error, results);
								if (error) {
									res.send({
										'statusCode' : 500
									});
								} else {
									res.send({
										'statusCode' : 200
									});
								}
							})
						}
					})
				} else {
					res.send({
						'statusCode' : 500
					});
				}
			} else {
				mysql.insertData('trip_details', {
					'listing_id' : listing_id,
					'checkin' : checkin,
					'checkout' : checkout,
					'deposit' : deposit,
					'no_of_guests' : no_of_guests,
					'user_id' : userId,
					'active' : active,
					'trip_amount' : trip_amount
				}, (error, trip) => {
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
//						var receipt_id = uuid.v1();
						var receipt_id = utility.generateReceiptNo(10);
						console.log("???????????????? : " + receipt_id);
						//TODO
						var cc_id = 1;
						//generate bill
						mysql.insertData('bill_details', {
							'trip_id' : trip.insertId,
							'receipt_id' : receipt_id,
							'cc_id' : cc_id
						}, (error, results) => {
							console.log(error, results);
							if (error) {
								res.send({
									'statusCode' : 500
								});
							} else {
								res.send({
									'statusCode' : 200
								});
							}
						})
					}
				})
			}
		}
	})

});

// Local Authentication

router.post('/login', function(req, res, next) {
	passport.authenticate('local_login', function(error, userObject) {
		if (error) {
			if (error === 401) {
				res.send({
					'statusCode' : 401
				});
			} else if (error === 451) {
				res.send({
					'statusCode' : 451
				});
			} else if (error === 404) {
				res.send({
					'statusCode' : 404
				});
			}
		} else {
			if (userObject) {
				mysql.insertData('login_history', {
					'user_id' : userObject.user_id,
					'user_agent' : req.body.user_agent.os + ' ' + req.body.user_agent.os_version + ' - ' + req.body.user_agent.browser + ' ' + req.body.user_agent.browser_version
				}, (error, result) => {
					async.parallel([ function(callback) {
						req.db.get('user_photos').findOne({
							'user_id' : userObject.user_id
						}).then((photo) => {
							if (photo) {
								callback(null, photo.photo);
							} else {
								callback(null, null);
							}
						});
					},
						function(callback) {
							req.db.get('user_videos').findOne({
								'user_id' : userObject.user_id
							}).then((video) => {
								if (video) {
									callback(null, video.video);
								} else {
									callback(null, null);
								}
							});
						} ], function(error, results) {
						if (error) {
							res.send({
								'statusCode' : 500
							});
						} else {
							userObject.photo = results[0];
							userObject.video = results[1];
							req.session.loggedInUser = userObject;
							console.log(req.session.loggedInUser);
							res.send({
								'statusCode' : 200
							});
						}
					})

				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})(req, res, next);
});

router.get('/property', function(req, res, next) {
	if(req.session.loggedInUser){
	res.render('property');
	}else{
		console.log("in else");
		res.redirect('/');
	}
});

router.get('/admin_fTYcN2a', function(req, res, next) {
	if(req.session && req.session.loggedInUser) {
		res.render('administrator');
	} else {
		res.redirect('/');
	}
});

router.get('/listing', function(req, res, next) {
	if(req.session.loggedInUser){
		res.render('listing');
	}else{
		res.redirect('/');
	}
});

router.get('/searchListing', function(req, res, next) {

	var address = req.query.where;
	var guest = req.query.guest;
	var daterange = req.query.daterange;

	//TODO
	// var user_id = req.session.loggedInUser.user_id;
	var user_id = 1;

	//area seen logging
	logger.areaLogger(address, user_id);

	var options = {
		provider : 'google',
		// Optional depending on the providers 
		httpAdapter : 'https', // Default 
		apiKey : 'AIzaSyA67uROXPqm2Nnfg5HOTHttn2C7QRn1zIo', // for Mapquest, OpenCage, Google Premier 
		formatter : null // 'gpx', 'string', ... 
	};

	var geocoder = NodeGeocoder(options);

	// Using callback 
	geocoder.geocode(address, function(err, georesult) {

		var longitude = Number((georesult[0].longitude) * Math.PI / 180);
		var latitude = Number((georesult[0].latitude) * Math.PI / 180);

		center_lat = georesult[0].latitude;
		center_lng = georesult[0].longitude;

		var locat = new GeoPoint(georesult[0].latitude, georesult[0].longitude);
		var bouningcoordinates = locat.boundingCoordinates(10);

		var longitude_lower = bouningcoordinates[0]._degLon;
		var longitude_upper = bouningcoordinates[1]._degLon;
		var latitude_lower = bouningcoordinates[0]._degLat;
		var latitude_upper = bouningcoordinates[1]._degLat;

		var query = "select * from property_details,listings INNER JOIN room_types ON listings.room_type_id = room_types.room_type_id WHERE property_details.property_id = listings.property_id AND property_details.longitude<=? AND longitude >= ? AND latitude<= ? AND latitude>=? AND listings.active != 0 AND property_details.active != 0";
		var parameters = [ longitude_upper, longitude_lower, latitude_upper, latitude_lower ];

		var centerLatLng = {
			center_lat : center_lat,
			center_lng : center_lng
		};

		mysql.executeQuery(query, parameters, function(error, results) {
			results.forEach(function(item, index, array) {
				async.parallel([ function(callback) {
					req.db.get('property_photos').find({
						'property_id' : Number(item.property_id)
					}).then((photos) => {
						results[index].photos = photos;
						callback();
					});
				}, function(callback) {
					req.db.get('user_photos').find({
						'user_id' : item.owner_id
					}).then((profile_photo) => {
						console.log(profile_photo);
						results[index].profile_photo = profile_photo;
						callback();
					});
				}, function(callback) {
					mysql.executeQuery('select count(host_rating) as number_of_ratings, avg(host_rating) as host_rating from ratings right join trip_details on ratings.trip_id = trip_details.trip_id inner join listings on listings.listing_id = trip_details.listing_id inner join property_details on listings.property_id = property_details.property_id where owner_id = ?', [ item.owner_id ], (error, hosting_rating_details) => {
						if (error) {
							throw error;
						} else {
							results[index].rating = hosting_rating_details
							callback();
						}
					});
				} ], function(error, finalResults) {
					if (error) {
						res.render('searchListing', {
							data : JSON.stringify({
								centerLatLng : centerLatLng
							})
						});
					} else {
						if (results && results.length > 0) {
							res.render('searchListing', {
								data : JSON.stringify({
									results : results,
									centerLatLng : centerLatLng,
									guest : guest,
									daterange : daterange
								})
							});
						} else {
							res.render('searchListing', {
								data : JSON.stringify({
									centerLatLng : centerLatLng
								})
							});
						}
					}
				});
			});
		});
	});
});

router.get('/profile', function(req, res, next) {


	//TODO naive nested query to be written to show performance increase.
	async.parallel([
		function(callback) {
			mysql.executeQuery('select account_details.user_id as user_id, f_name, l_name, email, active, phone, gender, month, day, year, city, state, description from account_details left join profile_details on account_details.user_id = profile_details.user_id where account_details.user_id = ?', [ req.query.owner ], (error, profile_details) => {
				if (error) {
					throw error;
				} else {
					console.log('profile_details', profile_details);
					callback(null, profile_details);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select card_id, card_number, exp_month,exp_year,cvv,first_name,last_name,postal_code,country from card_details where user_id = ?', [ req.query.owner ], (error, card_details) => {
				if (error) {
					throw error;
				} else {
					callback(null, card_details);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select timestamp, user_agent from login_history where user_id = ?', [ req.query.owner ], (error, login_history) => {
				if (error) {
					throw error;
				} else {
					callback(null, login_history);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select property_id, house_rules, longitude, latitude, st_address, apt, city, state, zip, active, property_type from property_details inner join property_types on property_details.property_type_id = property_types.property_type_id where owner_id = ?', [ req.query.owner ], (error, property_details) => {
				if (error) {
					throw error;
				} else {
					property_details.forEach(function(item, index, array) {
						req.db.get('property_photos').find({
							'property_id' : item.property_id
						}).then((photos) => {
							property_details[index].photos = photos;
						});
					});
					callback(null, property_details);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select listing_id, listings.property_id, title, is_bid, start_date, end_date, daily_price, listings.active as listing_active, property_details.active as property_active, room_type from listings inner join property_details on listings.property_id = property_details.property_id inner join room_types on listings.room_type_id = room_types.room_type_id where property_details.owner_id = ?', [ req.query.owner ], (error, listing_details) => {
				if (error) {
					throw error;
				} else {
					callback(null, listing_details);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select trip_details.trip_id, title, st_address, city, state, zip, longitude, latitude, checkin, checkout, trip_amount, host_rating, host_review, receipt_id from trip_details inner join listings on listings.listing_id = trip_details.listing_id inner join property_details on listings.property_id = property_details.property_id left join ratings on ratings.trip_id = trip_details.trip_id left join bill_details on bill_details.trip_id = trip_details.trip_id where user_id = ?', [ req.query.owner ], (error, trip_details) => {
				if (error) {
					throw error;
				} else {
					callback(null, trip_details);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select trip_details.trip_id, f_name, l_name, st_address, city, state, zip, checkin, checkout, no_of_guests, traveller_rating, traveller_review from account_details inner join property_details on account_details.user_id = property_details.owner_id inner join listings on listings.property_id = property_details.property_id inner join trip_details on listings.listing_id = trip_details.listing_id left join ratings on ratings.trip_id = trip_details.trip_id where account_details.user_id = ?', [ req.query.owner ], (error, hosting_details) => {
				if (error) {
					throw error;
				} else {
					callback(null, hosting_details);
				}
			});
		},
		function(callback) {
			req.db.get('user_photos').findOne({
				'user_id' : req.query.owner
			}).then((photo) => {
				if (photo) {
					callback(null, photo.photo);
				} else {
					callback(null, null);
				}
			});
		},
		function(callback) {
			req.db.get('user_videos').findOne({
				'user_id' : req.query.owner
			}).then((video) => {
				if (video) {
					callback(null, video.video);
				} else {
					callback(null, null);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select owner_id as user_id, avg(host_rating) as host_rating from ratings right join trip_details on ratings.trip_id = trip_details.trip_id inner join listings on listings.listing_id = trip_details.listing_id inner join property_details on listings.property_id = property_details.property_id where owner_id = ?', [ req.query.owner ], (error, hosting_rating_details) => {
				if (error) {
					throw error;
				} else {
					callback(null, hosting_rating_details);
				}
			});
		},
		function(callback) {
			mysql.executeQuery('select user_id as user_id, avg(traveller_rating) as traveller_rating from ratings right join trip_details on ratings.trip_id = trip_details.trip_id where user_id = ?', [ req.query.owner ], (error, travelling_rating_details) => {
				if (error) {
					throw error;
				} else {
					callback(null, travelling_rating_details);
				}
			});
		}
	], function(error, results) {
		if (error) {
			throw error;
		}
		res.render('profile', {
			data : JSON.stringify(results)
		});
	});
});

router.get('/getBill', function(req, res, next) {
	if (req.query && req.query.receipt) {
		mysql.executeQuery('select * from bill_details, trip_details, card_details, account_details, listings inner join room_types on listings.room_type_id = room_types.room_type_id, property_details inner join property_types on property_details.property_type_id = property_types.property_type_id where receipt_id = ? and trip_details.trip_id = bill_details.trip_id and bill_details.cc_id = card_details.card_id and trip_details.user_id = account_details.user_id and trip_details.listing_id = listings.listing_id and listings.property_id = property_details.property_id;', [ req.query.receipt ], (error, results) => {
			console.log(error, results);
			barcode('code128', {
				data : "http://localhost:3000/getBill?receipt=" + results[0].receipt_id,
				width : 566,
				height : 40,
			}).getBase64(function(err, imgsrc) {
				if (err)
					throw err;
				var nights = parseInt((results[0].checkout - results[0].checkin) / 86400000);
				var total_amount = results[0].trip_amount * nights;
				var strVar = "";
				strVar += "<!DOCTYPE html>";
				strVar += "<head>";
				strVar += "<meta name=\"generator\" content=\"HTML Tidy for Java (vers. 2009-12-01), see jtidy.sourceforge.net\" \/>";
				strVar += "<meta charset=\"utf8\" \/>";
				strVar += "<title>Receipt<\/title>";
				strVar += "<link type=\"text\/css\" rel=\"stylesheet\" href=\"https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/font-awesome\/4.7.0\/css\/font-awesome.min.css\" \/>";
				strVar += "<link type=\"text\/css\" rel=\"stylesheet\" href=\"https:\/\/maxcdn.bootstrapcdn.com\/bootstrap\/3.3.7\/css\/bootstrap.min.css\" \/><script type=\"text\/javascript\" src=\"https:\/\/ajax.googleapis.com\/ajax\/libs\/jquery\/1.12.4\/jquery.min.js\"><\/script>";
				strVar += "<script type=\"text\/javascript\" src=\"https:\/\/maxcdn.bootstrapcdn.com\/bootstrap\/3.3.7\/js\/bootstrap.min.js\"><\/script>";
				strVar += "<\/head>";
				strVar += "<body class=\"container\" style=\"background-image:url('data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAACH0lEQVQ4T03U2W5CMQwE0KRAofD\/38dWFal9Lftyq2N1EJZQLrE9Hi9x3263w+PxaG9vb42Mx+N2Pp\/b+\/t7u91ubTKZtMvlUjo2bIdhaPP5vOym02mdbD8+PlpfrVbDbDYrJyDX67X13gvofr+X8WKxaMfjsYAi8RGEPSnfz8\/PwQXn0WhUoJxFA4YRFgnI0T1bPgCf7Hpv\/efnZ3Dxyux0Oj1TVgI6ApwAw3C\/39dJkJJB\/\/r6KoZERD\/ppo6c6QUhADi6PxwOpfMtA7q+Xq+HFJmBFCgASNWJpSD0Ef\/dA5QBv6onQKmI4gyDFNl9UsJCbQELJptMAtDKZrfbDdITiZEoaYoaaRJH52uqxiYjlHK468vlcoAcyqGfZtABAkhSltRdRggQNsUwg83xWYv\/UeLoTqDofQuYlOkFlmF1OZ0NsLr4vdYvI8P2tX6Aw66akjkUPaPCiJIzoDBRowSXeoa\/5u8\/k2cN83aBZdDzvIByJuplZLB0jwQf3+675SACB0AMfLtLzTJCaZjgQLDE+vf3t84aLzXMA8+LYAwsw5z\/0uWIJZ\/Y8EOmUt9sNjU2\/qCdTcMg9cppsAVJvbOR0mHz2L+\/v6vLMU4j1IgkcgLmbWfLSJ+v+9JZX0A0QE3sPpGSUoCygDNK2L1uIffVFCljk7eYrmGWx68U2ZPZjQIAoMumqRUIUFe9W+KbIqkDynoSIIs208A25fH9B0YMRT02B3K8AAAAAElFTkSuQmCC')!important;\">";
				strVar += "<div class=\"row\">";
				strVar += "	<div class=\"col-xs-12\">";
				strVar += "		<div class=\"row\" style=\"height:100%;padding:10px;\">";
				strVar += "			<div class=\"row\">";
				strVar += "				<div class=\"col-xs-6\">";
				strVar += "					<div style=\"font-size: 24px;\">Customer Receipt<\/div>";
				strVar += "					<div style=\"font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;margin-bottom: 10px;\">Confirmation Code: " + utility.generateConfirmationCode(6) + "<\/div>";
				strVar += "					<div style=\"font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">" + utility.formatBillDate(results[0].checkin) + "<\/div>";
				strVar += "					<div style=\"font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">receipt # " + results[0].receipt_id + "<\/div>";
				strVar += "				<\/div>";
				strVar += "				<div class=\"col-xs-6\" style=\"margin-top:10px;\">";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-12\">";
				strVar += "							<span style=\"float:right;font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">airbnb<\/span>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-12\">";
				strVar += "							<span style=\"float:right;font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">+1 (415) 800-5959<\/span>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-12\">";
				strVar += "							<span style=\"float:right;font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">www.airbnb.com\/contact<\/span>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<hr style=\"border-top: 3px double #8c8b8b!important;opacity:0.5!important;margin-top: 5px!important;margin-bottom: 5px!important;\">";
				strVar += "			<div class=\"row\" style=\"padding:0 10px 0px 10px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\" style=\"border-bottom:inset 0.08em!important;border-color:#c5c5c5!important;\">";
				strVar += "						<div class=\"col-xs-6\" style=\"border-right:inset 0.08em!important;border-color:#c5c5c5!important;padding: 0 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;margin-top:2px;\"><span class=\"glyphicon glyphicon-user\"><\/span><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + results[0].f_name + " " + results[0].l_name + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">name<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-6\" style=\"padding: 0 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;margin-top:2px;\"><span class=\"glyphicon glyphicon-map-marker\"><\/span><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + results[0].city + ", " + results[0].state + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">travel destination<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border-bottom:inset 0.08em!important;border-color:#c5c5c5!important;\">";
				strVar += "						<div class=\"col-xs-6\" style=\"border-right:inset 0.08em!important;border-color:#c5c5c5!important;padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-exchange\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + results[0].st_address + ", " + results[0].city + ", " + results[0].state + " " + results[0].zip + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">accommodation address<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-6\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-home\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + results[0].title + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">property<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border-bottom:inset 0.08em!important;border-color:#c5c5c5!important;\">";
				strVar += "						<div class=\"col-xs-6\" style=\"border-right:inset 0.08em!important;border-color:#c5c5c5!important;padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><span class=\"glyphicon glyphicon-stats\"><\/span><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + results[0].property_type + " - " + results[0].room_type + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">accommodation type<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-6\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-group\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + results[0].no_of_guests + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">guests<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border-bottom:inset 0.08em!important;border-color:#c5c5c5!important;\">";
				strVar += "						<div class=\"col-xs-6\" style=\"border-right:inset 0.08em!important;border-color:#c5c5c5!important;padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-calendar\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + utility.formatStayDate(results[0].checkin) + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">check in<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-6\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-calendar\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + utility.formatStayDate(results[0].checkout) + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">check out<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-6\" style=\"border-right:inset 0.08em!important;border-color:#c5c5c5!important;padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-moon-o\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">" + nights + "<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">nights<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-6\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-2\" style=\"font-size:20px!important;\"><i class=\"fa fa-credit-card\"><\/i><\/div>";
				strVar += "							<div class=\"col-xs-10\">";
				strVar += "								<div style=\"font-size:12px;\">$1000<\/div>";
				strVar += "								<div style=\"font-size:8px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">security deposit<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<hr style=\"border-top: 3px double #8c8b8b!important;opacity:0.5!important;margin-top: 5px!important;margin-bottom: 5px!important;\">";
				strVar += "			<div class=\"row\">";
				strVar += "				<div class=\"col-xs-6\">";
				strVar += "					<div style=\"font-size: 24px;\">Payment Details<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<div class=\"row\" style=\"padding:0 15px 0px 15px;margin-top:10px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">accommodations<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">$" + total_amount + " <span style=\"color:#959595!important;font-size:8px;\">($" + results[0].trip_amount + " per night)<\/span><\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;border-top: none!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">airbnb service fee<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">Free<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;border-bottom: 3px double #c5c5c5!important;border-top: none!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">airbnb concierge<span style=\"color:#959595!important;font-size:8px;\"><sup style=\"color:#959595!important;font-size:8px;\">BETA <\/sup>Premium Guest Services - Details below<\/span><\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">Free<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;border-top: none!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;float:right;\">total<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">$" + total_amount + " <\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<div class=\"row\" style=\"padding:0 15px 0px 15px;margin-top:10px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">payment received: " + utility.formatBillDate(results[0].checkin) + " (" + utility.getCardDetails(results[0].card_number) + ")<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">$" + String(parseInt(total_amount) + 1000) + "<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;border-bottom: 3px double #c5c5c5!important;border-top: none!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#fd009d!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">refunded (" + utility.getCardDetails(results[0].card_number) + ")<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#fb0082!important;\">($" + String(1000 - parseInt(results[0].deposit)) + ")<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "					<div class=\"row\" style=\"border: 1px solid #c5c5c5!important;border-top: none!important;\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border-right: 1px solid #c5c5c5!important;padding: 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;float:right;\">balance<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"padding: 10px 10px 10px 10px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">$0<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<div class=\"row\" style=\"padding:0 15px 0px 15px;margin-top:10px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-8\" style=\"border: 1px solid #c5c5c5!important;padding: 8px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">deposit held<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "						<div class=\"col-xs-4\" style=\"border: 1px solid #c5c5c5!important;border-left: none!important;padding: 8px;\">";
				strVar += "							<div class=\"col-xs-12\">";
				strVar += "								<div style=\"font-size:10px;\">$" + results[0].deposit + "<\/div>";
				strVar += "							<\/div>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<div class=\"row\" style=\"padding:0 15px 0px 15px;margin-top:10px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-12\" style=\"text-align: center;\">";
				strVar += "							<img src=\"" + imgsrc + "\"/>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<div class=\"row\" style=\"padding:0 15px 0px 15px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-12\" style=\"text-align: center;\">";
				strVar += "							<span style=\"font-size:10px;color:#626262!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">thanks for traveling with airbnb<\/span>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>";
				strVar += "			<div class=\"row\" style=\"padding:0 15px 0px 15px;\">";
				strVar += "				<div class=\"col-xs-12\">";
				strVar += "					<div class=\"row\">";
				strVar += "						<div class=\"col-xs-12\" style=\"text-align: center;\">";
				strVar += "							<span style=\"font-size:10px;color:#959595!important;font-family: Courier, Lucida Console, monospace;text-transform: uppercase;\">1 washington square, san jose, ca, 95112, united states<\/span>";
				strVar += "						<\/div>";
				strVar += "					<\/div>";
				strVar += "				<\/div>";
				strVar += "			<\/div>	";
				strVar += "		<\/div>";
				strVar += "	<\/div>";
				strVar += "	<div>";
				strVar += "		<img style=\"position: absolute; right: 0; top: 58%;padding: 0px;\" height=auto width=\"115px\" alt=\"here\" src=\"data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAA9kAAASNCAYAAABXDJ2FAAAABmJLR0QAAAAAAAD5Q7t\/AAAACXBIWXMAAABIAAAASABGyWs+AACAAElEQVR42uz9d3Bcd5bg+X7PzYQj6K1ISiJAiTIl74kEZQhK5UtVkghQpTLTfkzH7EbMvI14sfHeTOzMrJ+N7p6Znenu7e7q7jIiEpRKKidHkZJIJCjvKEqiwQW99yRcZt6zf5ybAuVpkA44nwgESRAkbiYy773nd87vHHDOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc845d+Gk3AfgnHPOOVeQSocAZDqaz+Jrt8Vfe9nHPt\/a1SuAdrcvBOCuVb1BViWAIA9oT\/sCUuneBCqCiAL5TEcTS9K9QUQgKoKoKhAFKKpIJIIAQQCArl\/e9Ilj6Y2PZWG5n0LnnHNl5kG2c84550qmpWtb\/Duhp30hqa7Q\/oAIKkCkAIoIEQKakIBEfZ0OqCL5vNTm80xWJYnIaYgGQWYCE0AEGLYIWWpB6kVVgASgKjIY\/7keaACNQAaA4yLUozpNkXqgHziiqoOBMFVhiopEopwQ4aCgQQQzUWpA8sBx0IMi1KFMiY8tC5yqq4kOq5LIRTIhiqhVJAIGezqaBu771TZUkWxeEvm8iCpRd0dz\/szn685VFryvW+7Bu3POVQsPsp1zzjk3qm7\/6TaChARBUhIqohDlQWpEpR4LeAHNgyQEJqjoZFRqgSHQYRWZjzJHkBrQYaBWhdmiTAI0\/pgATMICZuLPAdQBjWd8Ph9\/1ANTgADIAafjfzMdmA0cB44BEVAbfz4JHMSCbj3j\/xgAjsb\/RyFoT8Z\/PhH\/mo3\/jcRffzr+dcAeJ7n4ox84JdCvaD8qka0VaBYYBE4GoqdBE6qSUAWQPCLZTMeCYYBUeqvd0IlIIMK65QsLz4Vzzrky8CDbOeecc5\/yyfLnVLrvo79TVXpWNLO4MwwQGkSkXpSsaoSIzAaZjAWqCaAGmAjMxILiZPz5acA8LCCOsOB4DjALCy7zQAMWTNfG\/+7MwLUh\/sjHXy\/x\/1Ef\/3\/Z+HBrGbnf0fjrk594uIXAveDMr4\/O+FzhI48FyMSPJRl\/7dAZx1h47AKcxILrCAvya+J\/e4KRoDwff20OOBX\/m2NY8D8kkFf7P05hAf5R4PAZj3VIICuip1EdjJAAjY9fJAJymY6mwmNxzjlXRB5kO+ecc+NYSxw893Q0cetPPyRZVxeISEI0jjsVUQtmp4hIHMDqJKAJZBoWxE7CgugZWNBcF39MwoLmRmAYCzynxJ+X+HMBFqQWAlgYCXjP\/Fzh82Pl3uWzHkuEBdl5RoL3AAuij2OB92D8b2vjrz8GHAD2AscFTig6AGRRjgNHECl8zckzvscwFpgPd3vw7Zxzo2qsXKicc8459wXO3Nvb2hUKSI0qdYBYBbI0iOpUjQNlAUF1FrAIkelYUDcDWIBlpsGCwNr4z4XP5c74\/JlBs99zjL5CBj4443MRlhk\/imXJC4sbw1hAfhQLyHuBgyKawwL3o8BxlFMKR1BOZFY0e9m5c86dB7\/gOeecc2NEKt1HMmlxURRBXY3KUFZqokgagRoB1ZEy7enAZCyzPAuYj\/3dxPjPF2HZ6DxW3lyDBc9JPl1C7SpfIYMtWFBeCND7gf3AbuAA6BDKMHAE2APsReSgiuwX1V2ZjqYT5X4gzjlX6fzC6JxzzlWhVDoUsKgZERELghuBBhFVkJmqNGNl3JOx5l7zsQB6ElYCPhULpmuxkuRCEO33B+PLJ\/ekF4LvI1j2exh7XQxjgfe2T3zsyXQ0DZb7QTjnXKXwi6hzzjlX4QoBdS6KJJEI6kSlAbQBG\/I8DZGFojoPC5ovAS6Pf1+LNQ5rxDLWdVhGM4FlM\/0+wH2RTwbeheZuhS7pg2d8nAS2A+8BG+OPfZmOpty5fEPnnBsL\/OLqnHPOVaB7Vm0LhjU5GbTe5jEzBZiLBdGzsXLva+I\/12CZ6clYUF3DSIDkwbQbbZ8VfBfK0M+0D3ifkaD73fjXU5mOJt\/v7Zwbs\/yi65xzzpVYKh3ab0bagQXAFAhEoygpwpWIFEq752Bl3ldgQXQtIyXgCT7eVMyv664abOPjQfdGYHOmoyl7Qf+rc85VCL8YO+ecc0VUmDc9PBBRUxcEEog1EFPyikwW0atA5gOzQZpAr8ZKvSdiZd5zGJn97FlpN1adBl4CXgO2AFuxYPygZ72dc9XGL9TOOefcKGt5tBcgkECS8ZW2TlVmCHoRwmyQqcCtwGVYMH0R1tl7EpapLnT0dm68KOz3PoU1XRuIfz3ESIO1D1HdBOzJrGgeKPcBO+fc5\/Eg2znnnLsA\/\/8dH\/De1hr2Hw6CeOT0BFWZCTqdke7d1wFNWCB9KbaPupCdTmCdm51zn97vnWWk0doRVLdgI8f2Y53OdyH0CexBON7d3hyd83d0zrlR5kG2c845d5YKe6kzHc3c8fNQggQ1IkyWQCaqMgm4EliINSibH\/9+AZadTmKBdXBe39y58Us\/8Wse62Z+GDgAhIK+j7ALOIyyN1LZI8IpYMj3ejvnSs2DbOecc+5LtHaGAgQq2H5qkQbgclUuF8tMXx5\/zMUC6Qas9NtLvp0rHv3ExyAjc7zfwzqbbwN2YWXowx99qOYyK5p9r7dzrig8yHbOOefO0NLVB4XrYxQFIjIBG5k1D2QOcC1wA9b5e1r86xRGSr49U+1c+ZwZdEdYUN0LvIEF3FuBrajuBk4iDAeiOYFoXftCD7qdc6PCg2znnHPjWqEEPCGgUKsqkxQmKTJJ0GbgRmARVva9EJtPncCuoQk8qHau0hX2dZ\/CSsx3oboboVdgC8huYK8qhxD6Mx1Nvq\/bOXdBPMh2zjk3LqXSoYAksUB5ItAcfxSC6evi30+IP+rw66ZzY0UOOAbsBnYAm7G53SHW0fwk6CmUQSwbns+saC73MTvnqoTfLDjnnBvzWjt7ERFRQISkKtMVLgKZiTUruwkLsGdic6ln4PupnRtvFGuktgnb070J2AIaChwU0UEgt759oWe6nXNfyINs55xzY9adXdskIqhRZYJYQ7KLFLkZuJqRzPWlQCOW0a7Br43OjWeKZa5PYxntA8BOgQ\/V9naHWHO1I8DJTEdTvtwH7JyrPH4j4ZxzbkxJdYaJyQ256ORgcrIi87D51AuwbPVNWLZ6ChZY1+LXQufclzuOzebuAz7EMt1bVdgnqkdFOCkwKJBb1+5dy50b7\/zGwjnn3JjQ2hlOVJEpWMfvhcDNWCl4YcTWdOy6F+DXP+fc+csCJ7Amau9jZeUfxB9bgaOZjiYPtJ0bx\/wmwznnXNVpTYciQgLIqTJLkeuxwHoRIyO2arCGZvX49c45N\/oU61p+DDiIzePehgXb24A9qB4IhJMiDAK6rt2bpzk3HiQv\/L9wzjnniiOV\/gBLPBcuV5IAmaCq80FmqOodiNwGzAfmxh8TCl9c7uN3zo1pwsj0gXnY4p5i+7U3A+8jslHhPdB3axL5ffHfO+fGOL8Bcc45V5GWdIUoBCg1CkmQ2aBXgVyLza6+DbgIa1hWiy8cO+cqg2Il5aexLPchLMu9BdgY\/7ob1cNBwMB638Pt3JjjQbZzzrmKcOvfbwOgdkIgIDXY3urZWJb6RiAFXIxlq33ElnOumuSxfdw7sSz3RtA3A+HtQNj70vLm4XIfoHNu9HiQ7Zxzruxa02GgSlJF6oB5AtdhY7auwvZYNwF1WGAdlPt4nXPuPCgQAUPAKSzLvQfLbr8JfICyHfRwZkXzYLkP1jl3\/jzIds45V1KptGWsVQMISAoyGZiLfjRm6xYsqJ6LdQSvLfcxO+dckeSwDPcerIz8HdCXRdgIHFSVYVAFFIGMN05zrip4kO2cc65kWlZtF1FNoiRUdbaIXA9cj2Wrr8NKwxuwjHWi3MfrxqzCHlj5xOc0\/px84us++bXOjbY8to97EMty9wGv2Ye+D+xEOBZAdr0H2s5VPL9gOOecK7rUo9sCSQQTVGQWyjwsW92CjdwqZKzr8OuSM58XBOexcttE\/JEF+uNf67Cqh0IpbhZbrKnHsoX98b8tBNGFColc\/LX5+OsnxP\/3UPxvABqBSfHvT8Z\/lwSmxH8Xxd9zOP78pDP+\/+H4exS+55mLR9EZj9Nf++5Mw8BxbA\/3B6BviJAB2YZyUlVzQF5EIxFY376w3MfrnDuDd2J1zjk36lLpEGzvtKoyHZFFCtejXIsF1wuxjHVt\/HUeYIx9ufjXBBbQDsW\/KnY\/olhgcQILbpNYgHwM2I\/NI07EX3dE4Jjav5f4\/x7CsoC5+CM64+9Ox3+XxF53EehJ+5yIfU5qUR1C9GD8cpyEBdBJQU8qcgoL5CcDk1BVhCGQ4fjrJmNz2ZPx987H32siMDX+fCI+pmT8+Qnxvyv8G7D3REP8+cICwZmLC4X3jBvbaoGZ2ALktSDfVeUEtn97HSKvgm4F2afKaXw0mHMVxW9qnHPOXbBUug+AqZMjTp6WZD7PNJAZWBl4K1YS3oSVg9eV+3jdqCmUVxd+P8RIMFwDHMayccPxh8Z\/fxA4Shx4q8gxUd2NZYMTwJCq7heR\/Xw8Q90PDAo6HAfHSQVUGBTVkyMBs4oqg1GegSiv+Zq6oF5Vk6pkgeENDzdrKh2KQK0IKJJVFUUVEQ2iiEACARG1WFoVlQAhAAL7iygS0bwQJDQeIaciIlEUIZoVpEaRwkJSLao5FTQQGlCZoBZg19iHBiATsWB9KvZ3k7Aguy7+fD3WcX\/qyL\/7KPM+Mf57wYJxZSTb79suxo7Ce2w\/sBULuF8E3gU5CjogqkOgEaDdKzy77Vy5eJDtnHPuvLU9uZWh4YSoCqA1wPx4jvW12Mitm7EAoBG\/2a9GnyzRLtzkH8OywzVYqXUvNgs4i5VTHwOOYAH2gP0b6VeJ9onKURWpE1U00uOIHCOQvGjUoCoRInlEI81rXgREgoSKApoHtKe9mdZ0r4jdwehol8m2WhUG3R0f3\/fa8oteAHoe+fLvl0r3MqtxEBF44ptfGfk\/ukJJigZJ0UhEdc2Dl8dfH9ag1IkQBAKBaL+I5obziSlYYD0Z1UCFWhEGRWWSwiws2z0Xy3gmsMC8Dgu8Z2Ij8BqwTHktI4F5PSPVjJ+1F91VNj3jIwtsAjaA9oC8i5WYHwfymY6mch+rc+OSn0ydc86dl9Z0GCDUqzIJZDpwF7AY+ApWDj4Dv85UixxWTq1YKXKhbPtw\/GsEnAT9EORQ\/PdHBXapfQ3YzX5WRU4lyB+NNFBU64KALDBQaNaUSocCaOYTQWyq04LbzApv6vRllnSFNaoksJ9D1N3RTCrdVwvMBp2KUk+cCRcraZ+jcAkWeM\/BqkqmMVK6X4dlyKcxkg0HCpl7L0+vcIUO5duBdyk0TFPdoarHsAoQ7XnYM9vOlYrf\/DjnnDsrreleALGkdTAJWABcCXodyL3YjbtnrSubYjfjQ1hG8zhWenoIyz4PYCXbHwIHsJv3I6A7QI6ATlAlLyKDQDaZzGVzuSSoJhDNZzoW+r7QChJn5WtEqAPqRMgh9EeR5NUaEDZh2e7ZWEZ8PiMN3hrjz8\/BFszODLgFD74rWRbYAawFNmCB9y5Uj2ZWNA+U++CcGw88yHbOOfeFbvv5ZpLJZCASNIA2gizCmpfdgO21vpyR\/aB+XSmfQsmvYpnIYax0O8Cyle8C+7DA+jAWXO\/GyrqHgeMiuicIOJ3LSx2qEUpWJN7jK6CKqKpu8IxYVSv0UDhD4X2bAOaCTkOZjGW2Z1DIgItcxEjQPQ3rrl5o6Jbg483dXHkp9v7fDWwG3kL1ZYV3orweBIZfPoutD8658+MnQeecc5+rZWVfgDBVRC4FvQK4I\/64GLvxnoBfS8qhEFDn+WjP80d7p3cCW7DmYocVtgrswfZQnwIZENGjoKdVJRBRAtHcuuWehR7vRoJvjZdVAHud1WGB9XQsuK4VIYswBZUFalUtl2K\/zsPOC4WA+8wg3JVHvN2Dbdhi2+vAe8B2VPcnE5x+aXmzv\/+dG0V+Y+Scc+4jqZW9ICIIgQqTUW4U5HbgRixzvYCRWb9+DSmdMzt357HMcyETvQc4ikifoJtszI8OqcphEfojosEAKQTluU\/uhXbuixT2yn9SEHwUfE+IPxrjXycrzEfl0k8E33OwgPvMDz+PlF6hO\/kW4FVgvQivdbc37S\/3gTk3lviJzTnnHACt6b6Eqk5AmAVyHXAfI4H1TEZKwl1xFeZFZ7GA+hDW0OhA\/Pt9WDfvndj+6WOgB1WCgUAVQBSNMh2emXKlt6QrTGDnijMD7wnAdB0JvC+PPy7G9oCfud+7EHj7uaa4hrGtIjuxHgxvqsiboFtE9WCmo3mo3AfoXDXzE5hzzo1TLZ0hQaAkAoJ8Xqaq7bW+HusS3oo1ParFMk5+vRh9hRE8+fjPw1gAvRsLpndh2aadwBEVjltnbz0EmidCNE9+wyMeTLvKt6QrrAEmKDSqMgPlEqzR2hxsv\/ccoLDneyYjDRQLjdbAz0PFksPOPRuBV4AerKz8QKajKVvug3OuGvnJyjnnxqFUensCtB6YLHC1WlB9O5a5vggPrIsh4uP7qA9jwfQJbK\/kRmBv\/Pl9oPuB0yBqM6K9e7cbO+Iy9AQ2kWA6tufb9n2LXApciWW6Z2DjxabHX5s8j2\/nvlyEjfE7hm1BeQt4QdBXgoDdIIP5SCMA33Li3JfzGyjnnBsHCg2NVKOEiEwBuRi4Fsta34LdzE7HMtdudPVjgfTJ+NcQ2IRlqHeBbsWalOVRIoRhIO\/l3m6s+4z93nZfKlILzMLOSxfDR+PGrsTmfU\/GStAb4g9vqja6FAu492OLfxnQl7Eu5QdVGerxefbOfSEPsp1zboxr6ewTEUREJqnqNcCtWNb6Nmx\/ZA2+B3K0ZLEsdcBIc6EdWEC9HeF14CiQRTkNDIFlh9T2U9OzwsfquPEtld6OxXnAx89LU7FgexG2p\/srwFVYx\/MGLPCuxc5p3lTtwhWy2wexhcEe0NUgHyicAs2jGvk5y7lP85OPc86NUXet6pW8BvWqMh20CWtkthi7OZ2L3ZT6deD8FPZTR\/Gvx4E+bF\/jDoT3FPpEbXSWqu5T1VMbHl6orY9Z9q77Ic8EOXcuzpzvHeU1CAImBwGzFC5RlSuAa4BmLPt9CRZ0F8aHBeU+\/iqm2L7tIWw7S7fCc6L6qiK7EE4jkpco0oxnuJ0D\/ObKOefGlK8+uRWA00OJepD5CteBtIJ+FSu5nIRlevz8f24KI7AKmZ3jWGfeEyCvg76LBdg7VXRPTV10KDuUTOSzUTbKq772I8\/0OFcsS7rCWlUaVZmFNU2biQRXgi7EFhQLI8Sm4IuLo+EUNvHgdeAl4DXQLbmhaCA7lNc3\/+iKch+fc2XnJxnnnBsDUit7AYJEkppIg\/mqtGJZ68XYPsYJ8Zf6ef\/cFJqUDce\/bgbeA\/aoyGYifU1ETgqaVxiE7HCmY5HvpXaujKzcnAToHCzIvhy4AstyX4EF21OxRmoN+MLj+Yiw7TEHgDeB51BeRtipwjHR\/FCm4zI\/F7pxy08ozjlX5VLpUICpIHNBbwP5DlY2OZeRGbTu7BQ6gA9inb53Y\/uptyK8AexEOSroQQ2C\/nw20kQioCaR0xcfuqzcx+6c+wKtXWESuFxVFjGyn3shFoQXstx+vjw\/Wawj+RqFF8Uaph3MdDQNlvvAnCsHD7Kdc66KLF7ZSxCAiBDZObwRuF5U7gCWYJnrQpdwv1k8O4VOukexMvBtwNtYOeQOoBd0FyLDEihzp5Bfda\/vOyylJatCFERVRDSKgACkRlUCRPKguYREqork1dr8IRIlUAUlihBGOmn5vtFxakmXjQ2LlDpVJgvMVJE5Ys3UmrCg+2JsjOF0bJHS75XPjmKB9kHgfeBlrFHaO6rs71nRPFzuA3SulPzE4ZxzVaK1qxdVCYCkQAPIQoVvASlsvvUcfJTN2VCsDDzCguoPgQ+ALWKZmC0Kp0GHgNOZjuZcuQ94PEultwdAA+gUhEZgGsps0EaQiHhxRCAAbVRFERkGTgTCsKrOUmUSNv\/3IHBQbZSa+hgiB5BK9yWw8vF52P7tRcDV2FabOfHfTQbq8Xvns6HY6MIQC7ZfAt4B3aHCcdEon+nwyh83tvmJwjnnqsCSrlBUqVNr6nM5yBLga8BlWMalrtzHWAWGsaD6KLaPcKNYl9ztAnuAAzWJ\/OlIJcpHgXR3NPl+wjJKpXsFggbgUuB6bCHpBizjGGBZs1os29iA\/WwPAqexxaZp8d+dwoLqQ6juATYhZFRlq4ieynQ058v9WM\/iuQBAJEBBQARsxQ1U17c3R+U+xrFi6S97g3xe6qKIqapcrCKLsGD7GizTXZjT7b5cIdjuA14BXgReVqGvp93LyN3Y5kG2c85VqG8+baOejp6kVlQuAq7F5lvfhQUdU\/BZsJ+nMHKmMLd6N5at3gx8KPCGiO5SlSyQTQRRHtCXlnsX8HKLA8oAgunAHdhiUgprWDUx\/rLPes1\/clGkUCJ+5ri1CFts6QV+CzwJvAfan+lorshFFVtskARIUoRJCs0g87G56odF9ITYaz2nyrAqeZDTwInMiiYv0b0Aqc4wqSITxDLZc4D5AgvVgu7LgfnADCzorsHPxZ8njy2C7QTeUZF1qGYC0TAQHVi3fGFFvvecuxB+MnDOuQp0Z1cYKFKryFRVvQFowwLsq7BsdrLcx1ihCvurD2A3dIX91ZuwbPW+QPTo+vbmXLw\/k\/XtXjJcKVpW9hIkpEZVLsGC6\/uBm7BAZjRf81lgF\/AskMZGEJ2stEA7le4NQCaCLABuBVqx4G4qtuBQhwUwR7DX+37gNEoW+WhB4QQ2Xi7EFhcOZjqafAvEeVj6y16iSGpyeZkTB9pXAddhi55XYdUT7osNY+fit7Ay8g0qukWUY0Au0+HnYzc2eJDtnHMVJtUZNiAyF8tct2HNzJqwsvCach9fhTkzY30ay1S\/i+2z3iTwPqKHgaxA3stqK1trOkwg0qRKO\/AQFsg0UpwmfnmsvPwp4Cegr2U6mgfK\/RwUpNLbBIJZwGKQ7wJLsYZcSayCpfCcFHoM5OJf4eMz3YcYGUHXjy1AfRjPd39ThO0i2o+ivuD05e55vJfhnAQodQgTQKZii0ALsHP2NVjH8nnYYoiPB\/u0iJEKo9eANVgp+Q611yo9HU3lPkbnLoi\/6Z1zrgK0pkNAAmCeWsbqTqws\/ApsxrWXhX9c4SZtL5YV6UW1G5H3gAOgR4CT3rSseixe1UugMgOVh4Hfx0YsFbvRlGLZ35XAX4NuqZTXTCrdNx34OvB9RqYGnOtig\/Lp5y+LZbf7gPXAbwR9VYQT69srK5NfTVLpviRWZbQAWxy6EavCuBELtt2nFc7jR7CO5M8qPIvSK8IgaB7As9uuGvkNm3POlVkq3Vcr6ASQ2+Nu4bdj3W2n4t3Cz5TFshxDwBbgVWAT6EZBNoMeVyRnN2aRjqfutYs7rfR9w4pmWrvCWtWgAdu0ezohUWDjrzSnEFXq89LSFSZF5S7g\/4ftxW6gNPcpeazy4T8LPBaIHlpX5mCzpbO3ViRoA\/4lth99ShGeixzWFO5d0H8QeEoC9keR5jMd3pvgXLV29oIgiCQ1og4JGkEnAc3Azdji6SJsRNgUfMvPJ0XYgtc7IM+CvgRsVeWECFHGM9uuyniQ7ZxzZXLXqt5kXoOZqlwJfAe4D7sBm4zfgJ2psIdvF7avdB3KW2qlvodRPQ1EEl\/RxuoM5JbOUETi5l4SSDIRJXI5JkGQjDRSCbhUVOZhe3UnMjLjV4BD2P70HSpyABjqaV9QMVnLVLqP+Jj\/A\/AjbG9rKe9RBrEmaP8H8E459yzbcyGXgv6PwHIsg13M5yKHLVr9V9DHgP0i+ai7\/fJyPQVjSirdVyPCNEWbUa4EuQ2rUmrG9tQXSv\/9nnxk1vZOoAfrmfCCih6MRypqT7svALnq4G9o55wrodau7WiUD0BmIHITlqX6LraXT\/DMdcEg9ny8j2WsNwIfiOjbAofyeSHKR3lVeOWHY\/umK9UZJiWQSaraAAwEwoQI+QrKxcBUkHmg12BBagMjY61mx78\/AhwGdgDvIqwFMsDxTHtTuR8eS7pCFJKqciXwONbYqxh7sL\/MW8C\/B30KGChHiWpruhclqMF6Mfwttq+3FPdqir3P\/ncssDnlmcPRk1oVgpJUJSlIPbYF6Hos2L4OKy+\/CHvfupE+A6eBDaCdIK+A7gY9CXi1hat4nilxzrkis5FEIiBJYAISXIOVhS\/B9uv5zFWTw\/aK7gL6FF4Q1dcR2Q16GDgeiM0t6nl4bGarAVq6thd+mwBmo3qDKtcAs0GaIwuuk9h2gqmgE7G9y9n433xyoWZO\/HE10IrSBvwaSKfS4dZMR3O2XI81DrAFWyC4DQsqyxFga\/y9F4I0ZjqaSt4AbUlXL2qjr2di5fJzKV0yRLCGXd8DNqvyPiNN1NwFyixvhnjMGjDYmu47FveN2KTKAkRuAFqwRddp2OJYDeO3F4dg57gpwH0gXwFesTJyeQnYju3ldq5ieZDtnHNFFJfBJkGnAwtV9W7g21i2bryP4jqzM\/hh4B3gdSzb+paq7BI0P7E+l3v2\/ssrprS5mOIAO4EFnV8B2rGA60qQwr7cQjOrTwbTtV\/y3wuWKbsJy5rNBv46lQ7fo7yjcwJswWAh5avkKNzUNwLJO1f1sq7EM9Pj7Q5JlIvUnotSLzbUY\/uGbxVhRyrde8KzhcUhoqgyqLATZDfwMtbhfh6wFORWLMN9GfbeGM9TJQJsG9V0bE\/79cDzqXT4RhTpvg0PLxwq9wE691nG882dc84VxdLHtgEwlE8EKjIJ+IooKWwEzx2MNL0ZjxkKsAY3\/dg+4b1Y46W1WPOyPYIc7m5vKlt2tVxaukIBrQXmgtwJrBDV27DFmNEMuAIss\/0NkCOgx4Cdi1f2RhseLnFgab8k1Ko5Zo\/y4zxXWSAhI\/vYS76woyo12M97Vhkef4D9DG4H1oGcwt6rbpSdMSqtUBadb+0Kh4FeVQ6BZkCuxrrK34Lt356CbQepYfxdOwRbALsOm7jxVZDuIJDnU+m+1xV2Rrnc6ZcfGR+Lsa46eJDtnHOjaPGqXoaUhKjUCyxAdRlwD9Zddh5fnm0cqwpZ69NYA653sH3Wb6iyUeBUkNBsFJHvHqd7QQWpwcb\/fAvVFVjGplgjrJLAfOxmdbOqPgGcLM8DF0WpwfaplvMmeUDguIgOl+0IhATQiNJYlu9ulQ6LsIWe7VRgkB1XB8XvCdWxMt6pu72ZVDrMA0eBo4HoexLwpEbMjlRuwbYXXY9VQc3G3i\/lXJQqB8HOiZdj19MbgW6B1Ylk8rWWru37e9oXjLsFWleZPMh2zrlRsnjVjkA0alT0YlQWYzNub8JuBiYw\/rIPMNK85iDWwfhl4A1gm8DOmkT+5MCgKEBmxfgtTU11hgmU2cDdwIPYzWNdkb9tLdZwaZnAm0Eg71HiIHddezOtq\/oitbFsp7AKh\/pSHkNMsUWGgyI6WOrnAWDd8oWFALKuTM8BWJZ0OjBPIdnSGeZ6KqRbfyodiipJ0EaQicRZ4NaucILYYsAp4GSkMpzpaKrKjOYnFgwUGG5Nh7uBIwrviG0juBGrNrgGWyibyPi7ny9ktq\/BehdcB3Sj+lxLZ\/hGz4rm4+U+QOfG25vSOeeKYklXX20URRcDt4HcC9yJ7SOrZ3x2DFdsn\/WHWMb6NeBVlF1AP+hQ94rmisuSlY3IBOAGbGHmKxQ\/wC5oBL6CyNVCtAULdktKlQhreLcbOEbpx3eBlYrvVdirEcPry7cXOYFlkxuwwLHUmUoFJipMR6QG1cFyPREFqXQIkASZJcI12PvjCuAqkCmqHLG9zWzGFvA2ptJ9R+PHEsW\/KlTnrOXujmbFFp\/CZY9vDYfyie4IfglyLcqtWNB9ObYFZBLja\/92Tfy4ZwLXCixF5MVUum81wjsBejhSyVfjz91VPw+ynXPuPBW6QItG0yJlMfBVrKTvCiy7MN5K+fJYx9cTwNvAOmws0mZgryqDqkT9x7O8808XlftYK8aSdG+g6FxFlmD7L6eW8NsX9uFeHqnMwOaRl1RSIs1HwRG1Gej7scWpUm6rUEa2MezO5SjbjGwViURVsdnwuRI\/D2CLG3UCgqqUe+Z8Kt0rQAPItcA3scXLRdie9VpGtqHk4udsEPtZ7gG2YtUzW7Bz0I5Uuu90\/G8iQbW7ykrNn3\/wcuLH2JtK9+3EKoMK2e1bsfPHQuz6M54qpxJYBcZt2Jaba1Cei6wT+dZUOjydscUK50rGg2znnDtHcUlnQqFRNLoc5AHgXiy4nsL4y1xHjMxh3gg8jQXZh0BPBKLDtYlI19gNovuESINahKuwffuj3eTsywRYNnsOIhMXd4bBhhJXGLy0fCGp9I5+iN7B5qJfid0wl8oQFoi9rsj+UyfyZbsZT0g0EKkcwErXyzFCS7Ag7igVsR9bJsZNAH8ItGJZy1o+HkAmsMqPwj52xQKtW7DAewhb+NsKvAm8BfoesKu1q69flarMdGY6mrLA\/ju7wkN52KTIGtGPAu6bgauwBatJjJ9rUgJ7jSzFrsc3A08AG1Lp8LBGmsvnVF\/54WXlPk43DniQ7Zxz52DJqlBUmahKE3AvyHLsZmYy4+ucmsduwvdjgfXLIG+JaCYR6KFcvjD+WPSMTrrus4jUgl6LZaBKVSZ+pkKgXR\/YTWrJg6tMx6VRa1e4TVWew4KEUpW9FrY1vAK8AXpy4z8rX5XF+uXNw6l0XyGjP0TxGt992fNxECuhL5s7u8KavMqtwB8Bd2EVHmcTLAr22qlhJPC+COvQfQvQB\/KmwjqUV0F3p9K9g6BRpqP6gq917c154Hj88WFrV1+3KlfEj7UFy3BfTnnOLeVQOJ9dDlwKLLPZ2voYErySqOVgSzocVlQ3+Ig6V0Tj6YbQOefOWyodIlAbRbIAG6vyNbHO4bMYP1kCsOD6OLAPeBt0NchGEe0T9PB6u+Fz50RrsBLYmZTntZTEsoOJwrDmcuhubx5IpcNnQBZh2ai5FD+rfxKrungO2IpqBXQm1l6QN4AUtnhXyh\/KAFaRcoDyZNI\/kkfmAw9hGexpXPhroQbbGjETW8hpB94FHodgNdCXSvcNVmvTtIKG2vyJwaHg7QgJgZewxYXbsfGR18bPwXiYchFgi1QXA98FuVKE1cCzCu8KciTV2ZfPrGgq93G6McqDbOec+xItXdtr0WiCIouBbzOyL7Ch3MdWIoUGQoeA97DM9TqgB+VoIoiGRMi\/tNyzAucqle4rjKS5GMu+lCvKPYntZS1rYJXpaD6aSod\/BzIXWA7MoHiB9ingVWClqnYDp7D90GWmAyDPA23YYkMpM5C7gddB9lPG10Iq3ZdEuR1Yxui+BgRbyCqUmN8N8hWsrPjnoK+kOntPomimxDPjR8vq714GVoVwGDh8y0+2fFDXmFwPciW2ZzmFLTIsoLznnFJqjB\/zJcB1gvwGWI2wI5XuG6rG7QKu8nmQ7Zxzn+GeX4aoEmRzwTSUK0C+DtxH6feLllMe62pbyPatBt5C+RCNDmQeXlgBWb\/qleoMQTWIO4sr5esKPIhVJpzMdDSVdR\/uklUhKHtV+S\/xWK\/vMjJffjSDgSNYlq8L5DnQIz0ryt8YqaUrREFBt4hKFxYIXUFpKhyGsUWHHtBj5croxj0vJmHlzpcX+bELVo10v31PEUS6NZD+cjz2YqhrTCpwAvRtQbYhvKiqN8RTML6GLWIksYWMsRxwJ7As\/jewzP5XgZUq8kaqq29XIDq4fnn5zwFu7PAg2znnYrf\/YhsADfUBubzURRFXgS7BLsqt2Gr4eBiPEmEl4X1YI6q1ChlED4rKscyKpooPrlOP2s8y8\/3K3WOpqohIgGo9IofKdBg5LMDehQXbZRUIKESqug34G5C9wLeA6\/nsruvKxwODQmfwwt7ywginKP67JBZIrhFhrQhvzpo2eOKXy64s90MHoKe9uTCyqh94HgsA\/xgo9gs5i00CeEbgQyUqy3v8zq6QSEmqzX9uojT3qYKVoy\/FnvejWIO0MbH15YzZ28PLnth2JJeXY7mcbFPhWeA\/Y4F2CnuPFSonxnKwLdiWge8A14vqs8BTkcqbqc5wX2ZFc8Vf31x18CDbOediQSCISE02xyzgbixz3YLtaRvrTWMUu6k8BWzCRsO8BrymojuIJKsQ9VT4fsVUOgywkT9JVHOt6VBUCeLHlgsCzQpE69orpBRUpDCu6RAW6JR6EWcAK\/\/fhGrZs3cvPWQBwV2Ph0OR8kEU6UFUNmKNr76Cde+fgu1VnoBl34ax4KjwUYO9X3dgDcSy2NaOI6i+gcgWYKcIBydNiIYrJcAuyHQ0k0qHedA9qpIWYRD4w\/jxFyPbmMXm2f8cWKeqxzIrFpbrfS6MNK2aV+LvOxW4R0V2AHsXr9qxd8PySyugw\/roef57l4EtOA2m0n2DInoc2KcqPdi17m7gBiy7XcPYDrYTWKXIg1iF2hqQ36VWhm9nHvbeIu7CjeU3j3POnZU7HttJEOUTKJMFrga+h2U1LsNu6Mf6vOthbP9eL7AW6Aa2qLJn+HR+oLbRqjV7KrBBTJz1EyAhyAzgSrWOstOwvc4NqA4Be4HtIrIFYX93e1NF3ESlOsMEIvOBR4A\/xfZml0qE\/cz\/G\/AzVT3UU+LxXWcrle5LYEHQJdjPdz4WaB8HPQgyiL1PBwTdg8gBVSahmpSAU6rSj2oWJRvf+eQyFVAe\/kVu+3lIIhkkRHQKcJPYeekuLDCYgAUJAbZAdqazvbcrzLX\/EPg74LfAblRz5ZqPfWdXGEQqc9Uanv1zbHJDKWWBN4D\/GXgOdDBTZbO0z8WSVb1EKgISoNSr6FyQFlG5D\/RWrCt7oYJrLMcMeazZ36vAatDnQTcDuYx3IHfnaSy\/YZxz7kst+02fDAzKBFW9TJR7sNLUm7Dgeqx3YB0G9gDvABngRWAr6GkVhnraKzPgKmjt2h6A1qoyGcvy3YeNq2nGgrBaLDN\/AjgG7BR4DeFlVd6DaC+QLedNVKozFEQmY02u\/hRrqleK151iWwKeRvhz4DWNNN9TpuDqfKU6w4QISRHy69ubcx993vb1iqAEgeq65QtpebT3o3\/X8\/3quXG+Y2UvQSANglyKnZtuA67Dgu2AkSqIeqwMdhaWuS\/c4515ryfY+\/4osBOrVvkl6GvYgkW+nO+HJV29iUiDhcCPgB\/Hj7HUjgA\/CQL+V+Dw+uVNZXs+SqmlKwRANKgFnYO91u7GMtxXMT4WnPNY87\/ngadV5FXRaBeQHcuLLa44PMh2zo07d\/wiJJGAhnpkcFjmq9KKBdfLsD1pY7kBTGFv6gGgB8tcv4rqFuBE\/Ki1Um8oFj\/ahwQaiDULm4OV+d0VfzRjTem+KEiNgO3Ak8AvBd6qr82deP57l5ftMaXSfUnsJvb3gYex0VXFfP0plsF8A\/hrhF9l2puOl+0JcF+qxSo2EoIkGZkBXQtMU5ghaCOQFKEGC4YuUpWLscWmi7Dy3xxWQr8Dew+8A7yRG87vT9aKZjrKViL+kdau3kA1uBLbh154L5TaIPArFf3fgLd62iu74mG0pdLbARXQehXmi8otwD3YAuYCrEpoLG83zWGLsh8Az2AVHu9nOprK3rPCVZex\/CZxzrlPSaVDUBKqUj8wxHVY9+JC1\/CJ5T6+IspjXcIPYA2OnhLR14BdIpxYv7xys9atnb2CSKAgqjSKyEJs3+Ct2MzyRYyUz35ZcBpg5cbtwAyFXwwMJ3pSneGJ8pUP53OQ2AW8gmWPplHc8XCD2Ci2x0BeTJI\/UZ7H7c5Wjy165eOPIfgoW38QCEAQlEAUVUkqTIzLzCejklDbq65q9339AkdBT2Y6KqvJk+pHjeqIf\/1kY7tSEGCOqMwWQfh0Of6YlulYACMLcVvv7Aq3KfwmUm4AuQ87516Bdeou9EUYS5JYRcjt2MLtbUBXa1e4RgI5mI\/I9bRXdm8SVxnGaqbGOec+ZUlXGKhKg1pDnXux7qI3YRfUsbroGGHl0lux4HqdiLwYSLRPlRxofn2lNAH7hFt\/sZXaZLIey07PBL0E5A7sZ7YQy9JN4vxu8iJsweFp0L9FeS2zorlsmYpUujcAuQRkBVYmewWj2wStUMFwCisRfhx4KpFg17qHyju2y42uO1f1whml4iKqAjocJQNUhQpvYJhK980H\/ggrGW+iNOPLzpTFuov\/u0Sgz61b3jxc7uekEqTSYS3ILGxR8w6seugOrEpirFLs9bAbWAM8ocKrohwBzWU6xleVgzs3HmQ758aFVDqsAbkIG1PyLWxG5nzG7riSHJax3IrNA86Avglsr0laJuzFByuzJLxlZS8CASLzELkJuBHLJtyIlcLWYQHohWZQImxP+k9R\/X+A7ZkyNv5avLI3EAkuFuFHwPexxnvn+vosdIlPYDeHJ7AKhn4s6\/ky1tjnbeBIpsO76LrK0tIZNojI94F\/CVxD6TvuDwMvC\/wvIvri+vbmgXI\/J5VixYsfsPtQbSKfD6YjcoWo3oaN\/7oRqxAaq1M4IkZGu\/0OC7i3iDDQ7Vlt9znGaubGOec+0tLVNwnlamxf2TeBW7COqWM1uD6C7bvMgK4G2aSq+1D6ex6u7JX3O1f1ks+TBLkOkQewbMnVWLZktDNaAbZftU2tVPtgS2d4qlzNvzY8vDC64a+27GycVvM3WObkQawkfjqfXlQozH4u9A84iQXRJ7Eyz93YvtsjWKB9GNXNIoTAKbVAoqJfC27cGsD2i+\/GsqalDrItoBI9Ef\/exTrvvgpsEe8gcLClK3xFVJ4HlmDX1xuwCQkTGFvX1wA7D9+FVVFdjfC4whstXX2HRYfymY7KGgXoym8svQGcc+5jWrq2J4FZovp14GtYcN3E2FxgVCzAegfLVq4V0VdUOQGaBY0yHZeV+xi\/VGtXGKBcp8j\/gHXavojid9s+DPwV8OfAoUyZS2lT6T4RYVqE3CCqbYzsO58cf8kJ7Ca3MNf8AywgOYpl5vcg7EXJA6qq\/ap6WlWjuhq77L+0vDK3CDgHkEqHE0D+BfCvsHNAKe9XTwB\/K6J\/IbBzfYVPWSi3lq6wRlSmYPuXb8eutUuwkXtjNc4YBkJgFdYY7QPQ45CPMh3la6LpKstYffE758a51q6+6RFymag+BHwdK70di43NclgjpBB4EnSDCm+LBnuBXNzEpiqk0qEAc0H+HPgGpWuqk8XGGP07YJMI2t1e3lL6JatCyWuQENUJgs4XYbpax+ikPS+6D+RD4ISitaKSRRjCysJzCJKUCEA9oHbVJj4XLAD598APKN39qmIVIP9WRDuBoXKfC6pFS2cYIDIRkYtE9XqsauxObLZ9LWMz5jgKdANPAC+iulMjHVKFDY\/4eXe8G4vZHOfcONXa1QdWUtysyn2C3o\/t5Z1M6UsOi02xC\/x2kIygjylswWbmDmU6FlRNKfDdj4fk8iKqTMduqL9KaRdEBGgGmRtF+sGGh8u\/T3n98mYFcq1dYWFPNRLvd9SPukxrFP+QJZJIN3x8vnHV\/Pyd+wwK7AH9C5AEtug2tQTftx80A2xU9dnI56LH+lmcSKXDE8AOkE1YAHovdh0uBNtjyVSsTH4+NqHkV4q8uuGR5qFyH5grPw+ynXNVL5UOARGUCcDNantZv47tnaphbK2gF0arxDcw+ryKrhfkdADZSNGeKsu8qFoAqXAt9rObVIbDqAMaAiGJBbEVIc6i6ZKuEGCwu6Pps77MA2o3pmQ6mkmlw2GQjcD\/hfWY+BpWkdRIcSpccsBWkCdBQypwP3bLqhCAnuXN3DXSRV40Hne2rgKqVlQUURkCNouwW5VXsb3M32WkH8pYuS4LtiB8AzAfkWuDBL9KdfU9F6A717d7Z\/rxbCy8wJ1z45QF1wiQjDuHfxd4AAvWZjK25ncW5uPuBJ4BXgBeE83uioKEAvRU6CiuL9OaDhPAfEU6sD2Yc0t8CFngHdD\/VeDp7o7m0+V+Tpxz1p8AqENoQkkBS7F9v01YokgYnXvZPHZu\/Qfgb0D3AvlKyWS3pnsFJKFQi0gSaESZIhas5oCjgeixKfWDQ7\/5ztUVs+jWagvggVoGe5bCPQL3Y8H2HKCesXWdzmKvozXAb4ANoAczHb6vfzzyINs5V5Xi7HUCG+l0LdCBXbwvYmyVhuexcuE9QA+29+s9kH2ZjgVjYrRMqjOcgHALyB8D36P0mews8Cqq\/xF4OrPCR\/Y4VylStg0oqUqD2LlhClaaey9wMzY6ajpWjXI+AVsWy5Q\/Bvp3WDY7n\/nsqpHSP\/50XxKYBizAqrOuAq7ASpWHgONi14dehQ+BXSocA+0X1WymozIWX1vSfQEik0AXidKKLZjcgl2zx1JlbR6b6vAGNu7rOVXt7VnhJeTjzVh6UTvnxok7V4USqTSocgnWWKUD62Z6vjdZlUixztF9wGvAcyKsU9WDKmR72pvG0sp4Hco8hIspz569CDiG3Rhly\/1kOOdGZNqbwLK1J4GTd3b17olUtqvKe4hcBXoDtuf3emA2dm+bYGS83edR4DSwEXgSeJKIbQSaL\/cODFtEjoCgAbgcuBsrub4JmBc\/tmT8UTjaU1iQ\/bIor4C8BdIbP2+VIAKOi+qbwDaQ14FlWLB9NbZQMhbikgQ2cnIJtgC0SJBVLSvD1xDpF1GtlAoJV1yeyXbOVY24PDwJMgu72ViGNcm6grHTUCXCAr1dWOb6RazkbFsiwUA+b\/sVx5JUZ3gRIg8BfwBcR2krEQqjzx5D9c+AjZkVlT1L3LnxrjUdoioB1kOhBpggoherchPIrVh1UxO2baiw+KpYlrEwkWEv0K3C0yAvq8ieDcsvrYh+DHF39ckgt2PVPXdjWeyGL\/mnWeA4VrL8LvAK8DYQCnqwu6Oy9gin0mE9cC3IN7BFhKuxn9lY6UYeYRMfNqpIp6j+DtihqkOqqhserowqA1ccY+EF7JwbB+KbjnqQhcB9WGOzG7ELcqLcxzdKBoADwFvAs8AGIFTVEyKar5Syv9EWB9k\/An4fmwddymxGHhvZ8xeC\/qK7o\/lQuZ8P59y5uXNVL1EkgcJEkLkKi8RKyW9lpAHmCaxa5URcVt0DfIiwH+R0T\/uCiqkOSqXDBpClwD\/BMqKFDP25Oo0F2\/FiLe8De1E9lVlRGfuEU+mwJl44vwFow7p1X8XYGrmZB3YDq4HHseq0wxDlxup13XmQ7ZyrAql0mACZjl2Ev4eVlzVhq\/pj4TyWB\/ZhN0NrQZ6Lu9ueAs1nOsZ2ZjXVGU5F5E+AP8RuiEsZZPcDGwT+XRBoZt3yZi8Xd64KWXYbEBEsc134mICNWJqh6DCwH+QAMASa10CjDRXQlbug7cmQwSFuBflTrKP6bC5sIXkIOAz0YvuE1wu6QYS969ubc+V+vAWW1ZZLsOv8vVhmuwlrjjYWrvMRtsjzKrY94VnQnZDLZToWlfvYXBGMhRetc24MS6XDWpAmrFzuIaxRylTGxt6twr7rN7Bu4S+h+g5wFAnymY4F5T6+kmhZGdZKIP8S+OfYTVWpKhNy2I3nz4G\/CQLdG8+nds6NEal0H3w06kpVI0UVffn7lRNYn+nux8OabE7+FfBHWLOz0do+E2FbY3ZhJeSrFVmH6o4oGw2\/\/MPKeD5S6a0CibkgLVhmu5WR0W1jIW7JA1uBVaj+WoSNdcl8\/5oHL\/drzxgzFl6szrkxKpUOG0FuBr4NfBMrJR4Le7UirDR8H\/AY8DywSVUPAMM9K8bWnusv09LZhwjtwL\/BygRLsYCiwH7g16D\/BSujzI61\/e7OuerRmg5FhIsjlf+MZXMnUJzrXRYrmf8lsErRzQhDEGhPe2Us7qbSfROwRYa7sN4ri7GxX2Nle1gW6Ab+UUW6NdK+KBsNv1Ihix3uwo2FTJBzboxJpcMAmALyLeBBIAXMYmx0Dh\/G9gC\/DfoTsQ6rxxQdFmFcdh2tSSq5PG+B7MdG8xSbYk2PngMeBflAhKyqJxKcc+WjkES5EfgKxd0OVYMtaD4CJAT5e7VO5BXR+A0g09HUn0r3bgbZB7Iea3T6B9g1opbqvx+owfbbXySqvxPhMalLbFy8su\/k0IlhffNPrij38bkL5EG2c64ixJ3DwfZfXQzyAyzAvozireaXimLZ60NYt9enQJ8B7UNEQTQeUzPu3PWY7aMMAvZEEU8BLRSnu3ghgs5hpXq\/A54Q0Te62yur465zbvxJpfsEmKK2J3kGxQ8ik9j2nA6s4eZPoyB5pNzPw5kyHQvzLV3bj2IjFreL6mqF+8Wq227COsdXc2Y7iVXoPQxcIqqPgj7z5p9c0V\/uA3MXzoNs51zZxQF2obnZTcAPsfLwKVT\/eSqL7YN7D3gKWAv6bqaj+XS5D6wSvPRQc+HnPww8jc26\/QGjd+OkWHOzfuAo1mH3eeBV0HAwiAbL\/Rw455yKBKI6m7Mb1TVaEsAlwHLQD4MouxZrlFYx4vJ1bekMTylsRuQfVWSTqH4Hq3JrLuHzVQwJYC7wDWCBBHJja7pvVRBE769bvrBiGtO5c1fNmSHn3BgQj+aqA2nGmpwsx\/Ze1VHd56gIm1fai41P+Y0I79ck9cALD1TG6JRKEr8OJoCkgP8Ba3R3vrPPC5UDh4EQy1x\/iGo3IluAE6p6Kog0312hzY+cc+NLS7qvTmyR+b\/DpmiUMnA8hvUH+Q8iuqO7vfKuUYtX9oIIgUggQh3KxQp3gXwPdDG2KF+MKqhSKlS8rQU6RXQ9cDiKiMZbr5axoJpvYJ1zVSzOXgYgU7Abi\/ux5ialnpNcDANAH\/AyNqZjHXAgURNk1z2wwDf+fo4lXX2iyjS1vXe\/j2UpJnF2ZZOKZcNPY2NSXsdmkW5CdUsywQ6F4XweENFMR1O5H65zzn0k1RnWA7cg8qfY9bCxhN8+At4S+LfA0xHkeir4HJlK94EiCrWIXirI14HvAtcA0zn\/BdpKEGGLHm8ATwCrVbVPRIb8ulVdqv1G1jlXhc7IXs\/HOoc+ANxOdTc3O3Pf9atYU62XQLcgUb8MR7quTLMw73i0F+JF1Ze\/v7Big\/z17U3amg6PAS+C5LBMdCswD6tsOFPhcRRuSHZgWeuNQA+wRZGjGunJDQ\/77GvnXIUT8iBZrPlYqTPJAsxRuCEQfRGVk+V+Or5IHGwqMNSSDrcBvwA2YXPFl2LN0SZSncnEAJiGVfTNBC4WkV8C76TSvUOZjsq9hruP8yDbOVdSLZ1hADIVW3H+JrYP6XKqu7lZHpt3vQ14Nv54H\/RQpqO5pHuqvv7bbQwMCsPDCJCUQCYhYs+tai7VGeaAPMIwwlBSNPfS8gq6aItGGskhQdci7AN5H8tsX4E1xQvi57uQtX4f22f9Pvb871TVkyKiPR1eNeCcqw61NeSGswxg57UhrIqnlCYA8yKCi3o6FlR0kH2mno7mKJUOj6hIBmSXqL4PfB2rhJpLdTZGE2yR4DrgYux+6VGQF1LpvoOZjibfq10FqvWG1jlXhVLp3gCCOVh28gFs3+0cqnvBrx8bydWtIr8S9HWBIyI6FEWqmY7S7fn92m97OT0QJDXSBoVLQK7FurNPxzLB9Vh37QNYOfsHAlsVjmY6mipmdAsUthNIACQC0akKV6nK5VjX3Xosy\/0e6G6U4wgnQYd9ld85V61S6b5LsK0yv4fNiC5lZddJ4LfAf8x0NL1e7ufifKXSYQPIIiyjfR+2HW021X2fkcMy9auA3wBbQE9nOpr9elfBPMh2zpVEKh0m4+ZmXwW+A9yKlURVa3k4WLD6MvAUqquBHSoyjIjGHVFL5r5f99I\/GDSq0oTdXLRh+9unY89zffyl\/VhDtoPAh0A38JIImycl+\/uffuAr5X5OP2VJVwhQq1CnSgRkEfIiKAooUfc4nC\/unBtblnSF9ZHKd7DmZ7cyct4uhVPAM8D\/Ulujb77wQHUHcKnOcCoiN\/LxEvLJVO89RxbbFvUstlf7DeBIpqOp4prUOeNBtnOuqO58LJR8nhqQm7B5nPdS3bOvCxe094EnbN4174CeELUQsPv7l5X0gO5aFUouklnAzdgCxtexfcy1fPENhWJjrV4CugTWisiB9e0LKiqr\/XmWPN4LwPoHvUO4c25saO0KF6jK\/xd4ENuTW6qg8CTwO4H\/PQj03XXLS7vVabS1rOwVEWlA5GKgBWsmdw+26FyN9x5g9x8HgAyW1V4DejDTUXnd4F31vsicc1Xgu89t4\/DxxOQoYinwx9jK\/Ayqs2xLsX1yh4D1QBr0VVX25fNR7pVHShtYQ6GBnCQEmtXK4r4J3IFlr8\/lxmwQ68b9t8Dv\/KLtvkhbOkwA9QJJtb3xg2u8bNG5UXHX432JfJ6UKv8GCw5LtSB9FEiL6H8S2Ly+vbqD7ILFK3uDIEhMRHUhQhu2Ve16bM9ztWa1h7Emn49ji\/1bgaGMV3RVFA+ynXNF0drVl8CyqUtV+bfAfCyzWo3nnTw2Fup94DkRfqbKflUGe1Y0lSW4SKW3N0A0CeQ2bIW+BasQaOD8nuMBbHX8P4M+jzXfUb9oO4DW50OCYaTmFFNQrmHktXYC2IdtQTiEciQS+hWiF\/2149x5WdLVVxsp9wL\/GrgNG+dV7IDwAPBXIvrXAnvWV+Cs7Atx8z9uoa4h2SgqNwMPYVvXmrCS\/Gq8LwFbGPkNkAbWgx7Hr9sVoxqzSc65Ctfa1dcA3KDK\/cAPse6Y1XoRy2Jdq9eA\/DYR6DqFUyLo+uVNJT+Y1s5wmorMBr0C5G7sRmE+MIUL66LagI1RewhkM+gHJX9wrmLVHaEW5VIsC7QUa8o0Fyu9PAV8AGQQXgxsPvmetnSYW+M3e86dBx1GeQmRBPAI1iz0IqCmiN+0H9gmNhJxTAXYAG\/8eBHA6VS672VsQWEztkB9G9VbQj4Nmw8+D5ghyNOIHmjtCrW73c+95eZBtnPugrV07Yh\/pwEwRVWXAD\/ARi\/NLPfxnacstkr8sgpPg7wIfLhueWlHZ1iXbdAgSACLNNKvATdi+6+vxM7jAaNzgzABK+lvAXozHc1DpXysrvIs6wwBGlS5GfgR1lNhPh9vyDQR6+C7ALgFWAf8DuENrCLCOXeWUit7yecVkNOgzwvsRmQjNo3jMmzL1SRGL7Ot2Pv0NeAdYGD9GA7QVBkGtgL7BH0HkeVYL5NqrbabhM3UnqowBZWuQHTfkq5Qx\/LPsRpU2wvJOVeBWrq2CzYiap6o3oc1bLkdmFruYzsPimXmtgBPg\/5WRbaAHOkpcUOwO7tCFCRS6kFuAP4AyyJegj3fxXjsx4AnQf+vhOh769p9JNZ4tSQdUms3ndcA\/wQrsfyyubOKlZC\/AXRinXB3rOloropmes5VmjtXhagiClNRWhW5F7u+NmPX2Dou7H4+i42H+o\/AbzMdTUfL\/ZhLIWULiAHCZGAZyMPY83oRdt6rNllgN\/CUiP61qrxfF+SG1i6\/vNzHNW55kO2cuyCpdBiATASuxsqWvoNd\/Kuxe3jhIvUK8BToGmC\/aDTcveKykgabqXQvQiBAo8INWOO4b2NNzYr5vA5jAdJ\/FOHp7vYmz0SOU\/ekwyCwoPphbG7vVZx9BdwQNiLuMWAVwpY17c3Zcj8m56pVazoUhQaQecC1WJPLFHAdVjZ8PnJAr4r8RNB\/AA5k2pvG1YKYVYtJAzby8lvYPcxV2BasamuMFmFd4l8F\/kGE1XmVgxs6qmNiyFjj5eLOufPW2hUmVGUGViJaGB11CdV5bukH3gWeBFbbnmQ9BWj3itJ3DgeJb6i4GtuTdz+WtSj2wkUSmIbIJWolwR5kj1OBvf6uBe4ELuXc3te1wBXAckBROpemw16F3Au+T9u5c9ZtHfz771rVuzVS6VNlgyLPYnuKb8cCw4ux7Rtf1p9DsWaXvUBnIPr3qhwI0DG3F\/vLxE3CBhan+94XkROC7kD5FlY1NofqShYE2CzwO4A6VaYL+lRLum9HpAy9vKKp3Mc3rlTjjbBzrgKk0mFCVeZj+64fwFbUi51lLYYI23v9ArASdAOwD6JcpqMcwXVMJYEwD9sDu4zSBNhgF+mJqE4SIXH3Y73y4kNeMj7e3PJ\/h2D9FFLYfuvGc\/wvBFukuQL4HpZdeUxgF3aD75w7Dy8tXwiWgd4H7Eul+14BnsECq1Zs0buJz37PKjYt4wCW7XwSeAaN9osEun75+F0A29DRlE2tCvuA\/ahswkZkfYuRcV\/VQuLjvRmYIDBN4deBbQkYLPfBjSceZDvnzsk3n9rG4aNBAuRKrDz821i52qRyH9s5irAs7WbgCeA3oNviz0XlDLDv+EUvCo1ie2GXYjdMpVy8CIAkkdbltdrWTNyFWtYZokoCy17fiu1RPN\/O9XXY6\/ghgcPAb9vS4VGfq+3c6AhET6uySWEPyKtY9UmhjHwmI80xk1jF1vvYuMYM8B5Ex7u99wYAGVtkGGjpDN8SkR3A29g9zt3AQorTC6UYBFtkuQGYKTAPoTPVGb6aWdF8stwHN154kO2cO2tfeyrkZD+1iaTcgI3m+jp2I14tF56CYWAvsB74mQgvq3ICyIOS6VhY1oNLJCQAnRk3O7uc0j6\/hUzHoEIO9azjOCQiTFELjhdy4U2A6rCsyv3ATuDlezvDgdUrxm\/WzLnREneQzgIHb\/v5loPJZHITsFpEmrGO\/9Ow+\/2TWCXJbuCgKsd6VjR5n4TP0LOiWVs6wyMi8hL2fPVh56\/rsCxxtaw+J7F7tBXAJYikU+m+tSq6u6e9uaSTUsYjD7Kdc19q8aodAMHJ0zqJSO\/CulwXysOr6TxSGFXyHvA08KQI73e3N1VaCVWANZy6ktJ3aM8Dx7FywsFuD4TGHRUS2F7Eaxm9EXwTsKqMD1C2R7ADe60550bJqz9YBDDUku7bq3BY4F3QhEIuinQgQFQCANWeFZ69\/iI9K5r1jpV9J4NA3hPhIKqbsf4oS7GFi2ppiiZYE7d7sHu22aLyVCrdtxV0MONVRUVTTTfHzrkyWLJqK3mNkiBzUb0b+EOs0Uq1dQ\/PYXuvXwKeEOFFYG93e2nnXp8lwYKbeXx8HnEpZIHDqB7AMv5u\/KnFGihdwbnvxf4iM4BlCOtU2b+0M+xf64s4zo26no4msPN3VZ\/DW9PbRVEBokA+2rv0UVBY7DnQLz\/cBJBdku7do8jvFN4FuR+buHA1dh9ULcF2A1Y+3ogtEjwGsrE13TfYba8XN8o8yHbOfaEoStQININ+i5ExPtU0QzLCuqjuAH4j8ATCewIn1rc3VeoKboCtOM8Eakr4fQszwt8T4X0Rb5IyTtUC87FAe7Tf69cAi0V4C3tfVup70DlXYi02uxqQmiDQKao6C4hsQAH1AsMKx4AjqjKcSvdppgQB4vqOhQoMpdK924C\/B+nFJifcSXXN1a5nZDzZTIGfAG+1psOBKBLtsUUFN0o8yHbOfaa7Hw\/J5qgFuQbbz3M\/Vr5cLau2YNnrPcA7WPb6aYGDwPD69qZyH9vnUgFRJmKB9vk2nDofOWwx4vVkgp01SfVy3vFpAjbrfg6j\/35vwLogd2LvReecI5UORRUBZonQoiq3AJcB14JMVWWfWk+HD4F1wJvAgVS6LypFoA2Q6VioqXTfUVVdLSJ7seP5Nlb1Uy2BdhJbQH1YkcuB\/6TKiyJ6LNUZRhmvLho1HmQ75z5m6S9DIkVyeWnEmhX9ATZC6uJyH9s5GgDeAXkGeCYQfRvor+DsNQAtXSEoosIpsY7tpSrJj7AFiTUg3dOm5IaeuPfycj8drsTa0mGA9QG4HMt2jPbrLyDOkg+dZnO5H69zrrxS6RDi+c4ici3wfaznSzPWZKyw0DcXG6f1NeAHwNOgfwXS19IVngaGeopcPg6gqipwStDXEdmtyqb4eO6gOOfMYojHfGkrMEPQv0L4NcKexat6cxuWl7f561jhQbZz7iMtXdsZypEQ1TkKS4AfAy3Y\/p1qEWGNu9aqyONAN7BrfWXuvf4UUQARbP94qTq\/RtjM1WeBXyck3+sB9vhz36qQfEQS2zs9l+JUURQWuWbW1pHAqiecc+OWBFjVzN3An2BjAxv5dBVNMv6ow6ptfg9kGfCUIE8JvJ5Kbz9al8wOr32weNevnpFMb+6On27bJTWJTgnkHUF\/hC0ALMQqdqoh2K4BrkDknwKzUVYFKpuBoXIf2FjgQbZzDoBUuheFWrULxFeBh7BMdiPVcbEAC0p3g\/xahZXAB8CxnvYFUbkP7GxpFIfYwmkgxErGiymHjSj5FbBKRN5c176wqpvluPMmYu\/3y9Rueoshwpox1QUBdXiQXbGWpkMBZG1Hc9WcP111SXWGCVQvQmQZ1vOllbMru5b46xYAHShXKTwLujqbT7xHiRq+vfyjywCGWzr73gP+K8JmbGvdbVhPlWrYXleH7dP+EZaJ\/1lruu+t7o7qSExUMg+ynXMxqRfVq4AHGNl\/XU91BNgK9ANbgMdE+BmwV2G4p31BRZeHf\/qRKAgRKscQtgA3UpyMYg44ge1X\/xWwVoTN9XXZ\/nI\/Ba5sCqNeLsOy2cWQw5rrDalUxQ3ouNJmgfUELECoU6hb2hVOEaUWy26dAPYDR9Z0+Jxdd\/6WPtErw8MyVa152MNYYHqu+5qTwGxsPNVVwPWRyhOpdF8P5PZmOi4vyfU\/P5zPJWqCHSL8CmQP9h75KtWzza4GaAJ+CMxU+LuWzu2voJzqeXhBuY+tanmQ7ZyjNR02KHIj0MFIuVNduY\/rLOWAQ8ArQGcgPA0cFdD17dV3cej5\/kJaO8Ocih4C+QDYy+heqAuzwreC\/BZ4EnQ7cExVh5+\/38vEx6u8kkC4CGURtheyGIaBI9h2CG+sV0Ztq0JQ0IgACESYAdyEdYBvAi4VmIFSgwXYA9hWnF3A5rZ0GKoQouxG6V+7wufturM3OCS1IiwC2rDX3YWMCyw081qBVeA9DslfpdLh+5mO5lPFfiyvWEY7d\/8zW\/YdPp5cqxZobwcexIL\/arifEmxx9QFgroj+Pejqe5\/ctm\/1dy\/z9\/Z58CDbuXEsle6TQLQ+UmkBfh9YipWJVsu5YRDYiu0l\/mUgvLG+vanqM7HJIIpyJA4qvIJyE9aIajSCnizW3Oxl4AkV1ohyCBuRopkO7yo6Xt23KgTQKKJGreFeseazn8I62B9AvFS8XJZ1haiSBCaLMAe4Bcu8XYNlBqdhGW3FSvzBSl8DbGHzCLBNlNeBdQivLOsKdwtkV5eg+ZSrfmJVM9dir7nRahhme4wtIzsX5IlUuu8V0MOZjuaiL+r96muLAE7f1bXtrbwGuxTZiG29uwsb9VUN91YTsCZuNYhM7h9KPJNKhzsyHc2+jewcVcMP2zk3yka6eeqkSKUN+ENsL9RkqmMPUaHU+TXgl8AaEfrWtzeNiYvAi+2XaWrV9lNE0WsgF2Gryzdzfs1UNP44Gj9fq4EXQN8HOa0CPRU8zsyVThx0TcUCrGKdB\/YCG4F96kF2yd2TDhEIVJkMLMJKdJdhN9UzsCDlzO0pwmc3oJrFyNaCm4GnVHkMYfPXHgvzzzzkgbb7EiKzsCD7YkZ3\/FUSuAT4FrZgNBvk6VS6b2+mozTTRV5qvyxqTYcHgeewpqLb4+NZRHVsw5uAVRfUA5NAfplK923L+D7tc+JBtnPjTBxgJ7FV1fuwbp43YuVMlX7iBytZ3Ak8j82+fhM40t3eNKZKTzPLF2gq3XtIhN+oimBltjdhCyFnu0c7j2UO+4BngKeBjaBHSrGq76qLWllwI1Y1UYxzQaEHwEaFY1nFG2qVUFs6DCI791+KVS0tw4Ls8wlyBLtmzMaC8yZgAcpfDStvL30szK71QNt9sWlY47KpjP6iXgKryluGjQK7BnisNR2+XVdH\/5rvFn9rQ3dHsy5Z1XsqioLXQQ+BHALasTFkE4r9\/S9QPOKLG7DKpsnAz1PpcLMI2W6vVjkr1XBD7ZwbRal0WAPShK2q\/gi7+FTDfiGwgHEj1qjrlyL0AUPdFT77+kK0doWiKjOwm+KHgMXYAkktn38OV2wP5V7gFRE6VXkNOAA6nOnwvZPu09rS4USs6eG\/wzKUo0mxbQp\/rsLzwJG17d61ulTa0mEt1szsOuDbWKOo0R41dBz4R4T\/pAG9ax\/yn6\/7fKn09m+A\/o\/YyK5ibU8BO\/ecBJ4X+FugW0SPR6qa6SjNPOhUOgxAGkHvBPln2BzwYlYMjaY8cBD4nYj+BHgzEPrXLff7iC\/jmWznxomWrh0kJKqJIq7CmnF0YKVLNeU+trN0BFiPBdirgV1jLXv9WbrbmzWVDg8Bz4Lsw8aStWKZo4lYsJ3EVu4LHYD3AZuAl0V4BtgkooOq+L7rz3HboyGNCQRQERICdaIk1W4whoHcmrG\/OFGDvabqsBvT0Qq+FHv\/PgtkgKOKZ7FL5Z50WIOd678OLMf2rE5h9KcWTAa+gfKO5DnUtjI8vubhMf+ecech1dkXoCoIjRRnesaZBHtttqlNITmmypsgA9i5qegyHc1RKh2exCrKPsB64DyALXRVevl4oSqgXVWmAX+XVzKpdN8x0MjvKT6fB9nOjQOLV\/UKqrVRxE1Y983vYEFasS9uoyHCmnWtAn4DvAl6zCZKjw\/xRew4sG7xyvANEToFrkakCZiH7Y9swALsD4FeIER1M8hRESIJYJ2Xb36uxiQ1okwRmItyOTBLLctwGKsIONJmN0mDKP3AoCr5fB5e+sHYeF5VQGxfdp7RC7IL3exfEOhS2KtKPuehV0nckw4bAtsO9D3gu1iFQrHu\/QSYi3WL7ibgBCUKYlx1EdFAkZPY66NU2dzJ2GtzE0gIDKbSYckWnuPvk0+lwz6Qv8a2va3Amg5OprID7UL5+DJsMbYeeAk4lEqHHmh\/Dg+ynRvDFq\/cjEgAKhNBbwH+CXaSnE91lCkNYfuJ\/wL0eawr8eB4PqFveLj5dKozfB8LoicBk1SoRzghykGQelRzUcRgEJDv7mgq9yFXtDbrUZBAP2qU04Gt2it2MxHEvx4H3gK2ILwNvIcSvvSDsdFxtS0dgpLDOvYPMjrnh8L8+neBn4rw\/vPt3gug2OLXNFhly11Yp+WlWABc7PN+A\/AV4AqEzeV+LlzlWdIVAkSqHMPOD6W6FxGsh8B9wPOg+8t0LxGB7gJWxfu0fxwfUzXs056EbTWZGB\/v7zIdzYfKfWCVyoNs58awRKJWgCmqpLAA+x6sSU2lB9iF8tI3QP8B69B5BMiN5wC7ILOiGUaCoYOf+Ouhch9flRGs8c5XgT\/AmtIIn84qzMEaRJ3EMhDvSMD6tnT4JtC3pqP5ZLkfyIXIDUOihpwIp7HmghdKsdfnJuAXgbBmtQfYRXffL0IiRVQ+yjr9U6y5WSn3f04CLkNpxJrdOfcREchHFJp5bsNen6XqCxMAV2Id8Tel0r0nS7UvuyC+h9FUZ3gU9BlEDmDXlG9jFYaVrJDRbsG6jk9Opfsez+fz+17+\/mXjprrwbFX6jbZz7jyl0n2BKjNU+TrwL7D9eDOp\/BLxHLAb+CXovwftAg7hAbYrjsJ+s9uxTrcBn122l8CCh3nYuKM\/Av4M+A9AR1s6vHJZOmz45uPhWX3TSvPSD5sRe9Qn4o\/sBf6Xw8AW4EmFX61ur+5FiGrQ1hUSJREVpmCLRv8KWAJMp7TZwgbsWjO53M+JqzzrljcjoIKeAN7HtuSUSiFIvB1kIgRlK9HOrGjWi2ZkTweiPaD\/J\/B\/AmupjoWpOqzz+J8Cf5JIJK5u6ewbzTFsY4IH2c6NQS1dfYGKzFHhQeCfY6WClT4DW7EM2ibgZ8BfgvYAw95cwxVRgAUhczm3bIpg2cGl2I3GHyjcOpijcWlndQba2F7sw1jjvAupiMhifQF+jfJrcuwu9wMb6+Jy\/0DtNXkf8P\/BJhE0Utq9noW52gmg5r5VVftecEWUTBKBnMJ6iGzFFtdLpQ64CHRSuVsGPH7vFaxvb84L7Bb0MeC\/AL8D9lP5zSGTWEPFHwN\/IOhNqc6wIbWyt9zHVTG8XNy5MSSV7gMiQXUuNu7px9j+uIZyH9uXyGNluG+CrFLhOaCvp31hKS+8bnxKYFsopnPu18TCHrVr4\/9jLvAo1hDmdLkf2HnIYtsPwvj4zydAy2O9E34FPA58uPYRLxMvprZVISgJYDbKMuBPsBLcclUtDYtVMgTxR6UHC67EXnywmVQ6HADZDLyCBWtzS\/TtFUCFmVi1Tdklgyifj4KDCC8qnEQ5AXwD26JUyQ3REvExfheRGiCB8GYqHQ54YsSDbOfGjNau7aKqCQguxsa0\/Ai4Cmt+U8mywAGgB0iL8JLCwZ72BSW7MWvt2kQU1SdAEmI3hLl437Mb+yw4sX3Z5xuU1ACXYHvqpkrAhLaucA1wbE179YwwWtPRrG3p8DDwHrZlYwbndp8QAduBXwKPK3wYBd4joAQCYAbKUuD3KG+ADTCkcEogq1Xz6nellq1pyCVzQztF9QXsXmUptrBXbDkgK1o540tfXH4ZQJRatf2IRpoBOQDsFXQ5I6NWKzXYrsG2Wt1vvxcFfSOVDofGe6DtQbZzY0CqMxRVbcCaZqyIPxZS+TOwB7Gy0qeAx0R4NxDt717eVLQAe3HXNgQRkCCB1kSRzFOVS0SoA\/KongROpDrDkwjHQAesXP2ycj9XbpS1pUPho9JBJnNhgUmhfHwZSqDCMPBiWzo8WU3ztUU5pcK7wDvYOWTqWf7TPBaYPwF0Ah+I0v\/iOL\/JKrZ7V4aiETOAuxUeBm7FxuuU0yBwUmHYg2z3eV594CLueGznySCKXhXVS7FM9nUUPzGQB3IgFVdhk1m+QIHTLV3bN4rqfmy6yg+wMV9TqNwtf0ngUqAdu5b+TRDw8t2PbRtISKRrHlxU7uMr25PinKtid67qlXwkE7Gy8HZsFmoTlf\/+PgG8jc2+\/q0qW4OAoXXLm4r2De96vE\/ykdRFqtNBvxJp0IpwDTZnOi51kgjrZL4FK19\/B+hr6QxP9qxo9rLHCnT3Stv3GdSARAiKiBBgZYHR85+fTS6Ue5\/rfuwvMgFoFeU4cBzh1bZV4cCa5dURbEYJIqBXItZhndav48sX6\/JAPJKGR9WaGQ2sXVE9iwvVaGk6FIWpCils9Nxi7PVcboeB3Qj9lHvTq6toLz90CYtX7TiI6pNi9yw\/BK7BtrgVI6BUbCvDYeBYuR\/\/5+lpX5BPpcN9IE9ijV8fxsbxXUTlJk8Eq356AGRqFPGXKol1OZInWru2R93tC8p9fCVX6TfhzrkvEWkwEbgJKxG\/H9sfU+kdxI8AL2IdxF8E9vSsaC7q\/utUOiSbl4kC1wp8DZVvA5dhwVUdH7+gD2Hdpu\/BZiP\/CnihpTM81uNl5BWj5Sch9Y0kgAAhIRGTse7f01VREURhYls6TKgwLMoRLNu6b01H8zD2PpmFrcCPZvZvCnA3sEWUnarsaOsM82uq4LWzdnkzbV3hKYTnRJkXN9IqdF3\/LBEWYHcBP41nIw\/l1IOrEmhQy3A9BLRS2i7in0eBPQI7BAYC8deB+2Ibll+qwJ5Uuq8wSeSb2ASH+ViwPZpl0or1f9kDHC\/3Y\/8imY5mWrvCY6i8qHAqPt6vYderSg20wX5mdwEJVSaArlXVQ4zD3gweZDtXxVLpvomq3I5lMb6FrXJWcoAdYSvIvwZdJfB6IHq4LhkVrWxr8coPC7+dLKq3YSvCX8eyl5\/3XNVh+3RnYzM1rxMrnV2ZWtm7L\/PwwnF3sag0bZ1hDZbFmwXMFuUmbKTIDGx80CxVJmId64+L0o\/dXPWhbGxLh5uxG5fbgKsZ3Tmtgr0X71XYgLJfob\/cz9nZWtPeHC1Lh7tV+EcAlB9g1TF1fPyGN4cF2J3A34nQq0JOgHXtlb+gUM3a0mEtynUID2E3tLOojHP\/INCnsF8ht7pKKjhcRTigqk+J0BtXkH0DuJHRLZOOsOkJW7BquopeBOq2KqyTqXSYATmKJShWYOfjSg60G7HxgQGgIrI2le47nOko3lbASlSpm+idc1\/gnsdDsjkaFLkLeAS4F7upL3cW44vkgb0q0imqK1H9EDiNaJTpWFi0b5pK9wYgk7HnqgNYhgXP5\/JcRUCvivw58AvgWE\/7goq+OI9F8R5qxX5+N8Qf12NZj9nYTUehKqHw840YuZFSLDAcxjpg78UytddTnH2Ax4H\/qvBnCoeyoN1VtEd56WOhSMRUlG9ii1M3xs9XHfZcbgNWKvwcCNd2eBfxUrhvVRhEEVeqdRH\/Hpbxq4Qb7jzWmf7fKDyRg4F1VfR6d+W3eGUvQSAJkBoRroiQDlG9HwsqG7nwe5yTwC9Q\/WvgXSBbTU1OU53hHES+i9333cboZ\/pH2yDW1PYnqvxK83piwyPjZxtRJf9gnHOfY8mqvnqNWKI2A\/tOLHNXye\/nHHZD3qUif4HqcVHNoaqZh4sXYC\/p6ksqOlNVvo5dlG7FGjmdz3OVA15Wkf9ZVJ8HhjMdTaV+HsettnSYxDIa12BdvG\/Duq4WgutzlY8\/AopX1ZUHehT+JfD22ipqgFbQ1hWCMhnbm30nto3iMuC4Ck+KsioPOyOIPKAqjbZ0OFvg9xX+GdbVvhIy2GABzPPA\/wS8XU0N\/1zlae0KBQlqVXUJyo+w889czn8kaR4L+P5MVZ\/FOuBTTUE2QCrdF4B+DeT3gPs4\/3uaUslifTr+m4o+AezvqaKpGxfCy8WdqyKpzlAQJqrSqvCvsaBxCpV9gu3HGpz9LJHQf8xFchoRLWaAumRVH0CDRixS5OtYBvsqLmw8SAK4WlQfQHVLlI22luoJHM\/aVoUCTJKIr6iV+X8HCyymcmHZuwTFD04EmCdwczLgPexmo7ooaMQJoEes6\/ivgZkCR1XYi3DoxXFyw1RubekQ7By2TOH3qawAu1CG+zKwxwNsd6FqkqK5fDQEZBQ5AmzErgF3ABPP8b\/LYv1VfgJ0A6ert7+KKrAOK3cvzNOeR+XeB9ZgjXn\/tahMATpv+8fe7a\/+eOGYP0d4kO1clbizK5RImaLIMlX+BZZRaqRyT6wRcBRYD\/wcdPW6h5pPFf15WtUnqkyLlFas0\/rXgDlc+PlOsAv7zYjcLjWJHVjZsRtFLekQAWoEAqhBuRjlm2o9B1qw7skBlfu6\/6Q64LKsMhU4WO6DOVdrRrLTEXZD996yzhAgCCL0ee8gXnTLHg3RAMGa892MBdiXUzkBNljvgw+A10Urt2uzqx4vPNAEwJ1dvQMqvK3IDkXeRvXrWFPSRXxxN33Fstf9KvIC8DNgPaqHeqr4vBXlUYTTIrwhwiC2T\/vH2JbBSpXEGmj+EEjW1Afplq4wJJJcz4qmch9bUR+0c66Ctb+wlROnAk4NyBS1rpt\/jK3k1lOZgUZh3+s+4FkgDdqT6Wg+WexvfOeqvkSkXKLK97CM582MbqY\/iZUnfwVh1u0\/7d39yo+KV+4+3lyfDqkBCSAQZarYaKLvYjdUld5R9bMUAqPpYk3Yqi7I\/izPWwZoXDWwKZdlj4ZENSBKHco1wO9hi02VFGBnge1YKe4WUV98dKNnXftCgOhPXnvv8JZd9c8PZ4M3VOV5oA27xs\/HGl5Owa7Rw1g\/jJNY34312PSDzcBpDYKqPndt+H4zgLZ2hQPAO6pyDLvf+mNs4aFSY7skttWoHQhEJa22jbCok2XK\/YCdcxVq8apedh9IBMBM0Puwk2gLxWnSNBoUa3SxFfidwi8FfQ+0aBnsVGcIgkggNXnlGpQ\/wPYpLeDT3ZAvlGDVAwuAeZKUvXiwMWpmWIZ6AtAsVoGwHCvzn0xlLih9mcIx1whMuW9VGDy33Getu7MX2ez3Guyccz\/2vriQbS+jrTAS6S0syD6w+uFqLcN1leyvb70GIEql+44AL2CVE5fFH\/OwEXa1WJB9DJt88KZG0XskEoNArmcMzWrubm\/mjse2ZRMahKj8DGUPVuVSqPiqtGtmYdH5SuzaDsLKxZ3htg0rxuZ10YNs5ypUa1dIpCRUootE5T6szOZWKjvAPgVswuZKPwlsI9KhYjY3AwKUiZFyqyg\/xm5CizXORrDAfarANElQh5VJugu01BqbzRbLTBTK\/C+i+rLXn5QHIoWavJLAF2WKZunKEOIby7UPV2856MfYa2YONkHi2\/HvK+nmOQv0qrAe+BA\/H7oiy3Q0KdC\/pKs3BHaISDdoIlKpUZUJWGwzCHos09E8WO7jLaaXH7oMIEp1hYeA1SAD2Da9e6icsX5nKgTaVwM\/EKgl4BepdN\/WTEdT9fUs+RIeZDtXgVq7ekGpEWQO8FUswL6NyspgnEmxleNXgcdFeDqR0F3DUSLfU8QGZ4vT20XRiQKLRfkj7EZ0NGdqfpYEttBRHyB+Dr0Ad9tCEkloENtjuhTbe3071thsLBhGOQ4MoJU9k7XaLO0KAZCIBFCP0IAtumXbOsNhbEEjAvIC+WQCfaaK5ja3pUOImIrQgr0vLqey7tsU2wKxFnhJ4fAL3gTPlcj69oWFrWk5sPsmET3S3T4Ot3ApqhFHRXgJYQirKLwP68ZeiaNda7DS9h+JSi3w01S6b0sURUMbipuUKalKOlk754Dbft5LFEmNCPOwbN4jwC2cezfNUjoKvAikgRdV9YBAfsPyS4v2Da\/7L5tBtQHhamxW7J3YDN9iE2AI65o+ZvcSlYIIklQmiwXV38b22F3G+Y9oqUT9WCByCjzIHg1tnWECoVaVOoFZCAuBhRRmeAv1KEPY874PYSfQl4s4RHW9Z+sQrsK6B99M5S2yDgCvA8+g9CJV2D3fjRnjMriOZaxBZdTSGR4XWA9yCjiNLc5dTGXGewHWa2U5VvHVFQTBh61d2we62xeMiWtlJT7pzo1r9XWSyEdyMXZj9QhwI7ZPtRIp1tnyd0An6CvAkUxHc77Y37hxdk1C4CKxsqilWGlUKRS6ph+iGkcyVYilXWEATBYLrFcArYxOF\/hK0w8cwG54xsSNQ6nd+VPLWNfUkcAaHF0CXCo2u\/sW7CZyGjATO1cKwkns3HQY2KG2X\/jFtnS4DeH4mvbin6MuRFs6DLB92G3YItQ0KisjlcUaSaVFeE1gIOcbIdx5uNtG0\/FiRzPLOsN6tYqUCDi9pqO5mhbFyi7umn56STp8NVI5inAIeBC4AtvqVmmEkUA7wO4j379rVTj4UhVVHX2esXYz41xVS6X7JB9xKdYZ+xHgBmz\/SiVSLNB8FBvRtQk4nSnRfNSAoB70KqzJx3xKt\/coFz\/uw9jqqztHbV1hQmG2RDyIzTC\/Fivzr7T9Y6PhOLAfy\/pVTJB9T1eIKCKAYIXsz1fg3NhlXaGoklQbgXYTFnBeh81dLTQ3TPLpAHRK\/NGMBeLfAjYirEJ5uq0z3KJKfwXv3Z4KLMHmAi+ksnpx5LGuzU8Aa4ATz7dX3mvHVbZ70mEg0KCACAva0uEitUW0CcS9ONrSYWFE1U5gj8BBFfrX+LaEL7S+o3kY2JRK9\/0dlhTowM6bE6msng7w8a7jOeCnkbKt\/en3c11fv7rcx3bBD8w5VwFS6V5R0UtE5QHgYSzwqNQAO4cFDj8F\/g7ogyCb6Shl506tx1Znr6B05cWFWcG7geNxAxZ3Dlo7Q0FZgNAO\/ICR8vBKu\/CPBgW2IGwTZVDLGGTf0xWKKIIQiFKnygSxm9m8wlERsm3pUBUisde5wsfmZJdUS1dIvVBPxByE6+Nu8zdhWY8ZnNsIw0LDwhtRZgCXIjwqwlttXeGpSrthv7MzFKwx0NexTryVlIFS7KZ9LfCYCAefr7Dnz1WmtnRIXkAgEJgmymUKVwWwDOVSrFqjATsvNca\/P45t++gD3ld4TZVXlqbDPQrDL5Tp\/FRFdgGPYZVUD2O9fSqx83iALSb+WFUDhL\/Ze6p++52rwvy6Ks5oe5DtXAVIWVfcmaLyfWzF8Woqd1\/qINALrFTVn4iwNwjIr1\/eVOrjqGPkhrtUGdBhe+zyHlYG7M5RrXAJ8GNRfohlIktyHapPCLUJoT+roEqekkS8\/cDbCrsjIZcoQyjS9mgoBEyMM8FTUK4FbpCRLSgBUKvWZ2A7woco27CFpJOleZo+7r5HwyCnXCTK7dgN+FexBj712OvlfG8QE9g540Hs\/PE3KK+3pcPhci0mfOZBBsxEuQ+r0qm0MvF+rMHlo8AW1ara4+7K5B6rSAkCpRE7\/7QBi8WqTGZg1REJPv1ar8e2EV2F9V35nsBG4BmBp9vS4S4gX0nv30qS6WiKFq\/s3ZMIgl+pJQgi4C4qa+HuTBeD\/LEqjar6n4AwlQ6jTJX+fD3Idq6M7l61DVWRXEQjyPeBH2EdZCv1BNgPvAt0odrZs6J5VzkOIpXuE2wRYi6FPZjFlwf2AeuV6M0e3yt2Vtri\/XZiN1ALFP4J8AfYPtqiUvu+zKxPcuXUWq6ZXkc2r7yw+zTbT2fR4oaPOWA78FYEp18s8U3CUnveJ2Hnk2sFrsduUi\/Gzi+FUTdxxTingGOi7ALeB9arsnrpqvDA2uXFfa0XXiPxcdTk4WaBB4B71RYczyVr\/WUC7Kb92\/FjPrCmo3lbMR\/fWT8P1i09gZXEP0DldQbOAW8DPxdhQ0IYeraKs0yu+JbZazqpymS1PgrfwiamXI3NtS4skH\/Z6zzJyBaQBVjQfQnwsyjP5rt\/EUYvPuKvxc+y4eGFUaozPAA8BXIQYRDrY9NI5WW0BVt0eRgkgepfIrKJKh196UG2c2XS2tVHTglAZyDcD\/whNtKgkvbeFRRmYL8KdIL8FnRP2Y5GJIHqFCzLU4rzWKFEcp3C7\/JDeqhsj72K3PWzEFUQoVZtb+wjwI8pUYCdFKFpUg0tcxu47aIGLp5Uw1t7B0gGRb+viLB9hD3A3lIF2Pc8ESJ5giDPBBUWodyLlQd+BXv+JzCy9vBJU7Eb2EuwIO87Ijytyl8u7QrfWtvePFSMY44DbMH2YM7EMlw\/wkrDZ1K8m8AZ2I1m5t6ucO\/q9uayVqbEAXYNyiLgfiwIqaQeBcPYAusvgBc0z4lnH\/agxn2+pV2hRDBBlIVAS7xwdgt2rqm5gP+6Fls8fARISMD\/jVXeVNW2hdZ4cbG7BNeHzIpmFq8MT4pot8BRkP8O6\/0zncpayIORQPs7iAwDf9OyMtyczw7nXvnRleU+tnPiQbZzZZBKh6hqEmQOyDeA\/x5bma3E92SEzcDuwUoE11w0M7v38bbLy3ZAqipiz5VS\/AtEhO0LWw88Drz9yo8WVuWqaqnV1IIqdSjNZ+zBLt5ctzM0JoVrp9ez9JJGrplVx+wJSQZyyrHhPAO5qNhZ7CwQYu+Zw6V4vPekw0CGmSi2x\/0elG9i+3ln8PE9718UtAoW2CWwbO\/9omSB\/7a0K9y4tr15VLvpxwF2AEzGzn\/fwrbLXErx+1EEwEXArZGy\/q6fh\/0v\/aA8QeOyrhBVEtiiwlLgXi4sCBltWWxP7K+B51D2r6nchnGuArTZ9IiZKHdgvQWWYXtuL2S7x5lqsAXBB0TYifD3VMEWrtRH5zxJIAiqUaozLLyXFFABzeeVDY+M7kiyDbYoNtza1fceyp+pJQ4ewhrHVtq9ZwKr5LkfGBaRnwQ1NVuosox2pT2pzo15d67qJYpIAnPVbqZ+H7iGyivbASuRPgS8BPwcyIAeLmeAvXhlL6hGiBRGIxXzectjDd7WAI+i+opmo1Nle\/BVZOljIZqnVoQm4HsK38fK\/Iq6KBIITK1NcMuser61cBJNU2tprA0QgYGBPIcG8vTnixofKLaXeRPwbhBxspjf7B67aasRuDje5\/gthRSWobiQG1rBgt8U8KYou9o6w0NrVoxOcBWXs9cA8+LvcT92Iz6D0mRWBMuITUepSwQElOkGTm3kWCNwXVx9cEk5juNz5LDOzk8CvwJ2UF2zxl0JLR2pyGgCvomNIi3sux7ta3USe698W+CNpenwlbUdzRUXhKU6QxIBopCMlGnxMc9GCbBz4ESs181+YJcKBySQfoqUmU+IZnMEW1D9KVahshy7NlfSwh7x8VwKPICQFQn+ofWx7WH3QwuqZqqLB9nOlVikQRKYp3Afltm7mcoNsPcBzwCPgr6qysmeFRVxESt0+d6Jdc2cWoTvkcPG1PwW+KmKbBQ4ueGHl3kG5yxI3jINajday7HyvqJec2oCYW5Dkta5DSxrmsglU2pIBIIAqnB0IM+OE1n6c1Ex6wqz2OvybWD36oeLM485Dq5FoDGeF\/0AlglexOjdLCWB2dgi4AsIRxi9sXW1WAn7N+Jjvxm72SylHNAvQiRlKsxuS4co1Ih1V27DApJKudmNsIXM54BfAh8AQ2sqcNSbK7+2zlAU6kW5DltUvQ9oorh9U+qAK1DuCuz1eazcz8OZUjYpoDZSZgE3gSzBqnaaFOaBJBFOYMmM3cAm0G6EN1LpvkMQDWc6Fo7q5eql5c2kurYPBqKbIpWfY+fBFdi1o9LUYNeJFQKBRvqzVDrcmukY3aqqYvEg27kSaXtyK4NDyYSqzAP9BnYRuo3KHNMVYaMffgWsFOEtVQZ6RimLdSE2PLwwLrnSkyBbsbLcGxjd7FcWa1r1G9BO4F1R+n1k19m55xdhobnUvVgn569QxMBBgLqEcGljDfdc3Mg9CxqZM\/Hjl7e8KrtOZ9l+OstwcTPZhSz2Rmybwai7Jx2KWJA6U2yWcjv26yxGPws8GSurnqyQuDMd5tddwB7Cts5QNEGNRFyJBdeF\/ccTzvs\/PT9KIXsknJLy7ecUsc7vt2Jdf+eW6Tg+y3GsiqlL4Z08DL7UUf5rgKs8964MJYKpcXn497EFo9kUv8dMAjtHXQrMvTcdHl9dIa\/RxSt7BWs+eY0i38Guh01Y74saRhYepmAl29cD94H8WIRuYCVIdyrddzDT0TSqi7WZ9gUAw6nOcBPwd3Fl4CPYSNRK6wtUCLQfQsmDdLV0hZt7itQnZDR5kO1ciWRziTjw0PuwfYc3U\/oby7MRYSO6VgFdwPsiOtDdXknZC1UITgHvYc14mhm9bPYw1l35CdAngQ9AByn2Lt4xRGqYhrIEC6CKPu+9NiEsnFzLPRc3kpo\/gVmNH7+0RQrHBvN8eHSYI0NRMWuCFSv5ewPYKsrAaH+Dex4PRXJMFLsZ+jbWvOYqipctqo3\/7wYsc37e4kY\/9RJxPVbd8A1sD3k5FhqHsYXE9\/PKyYSUJ8hWpUaEq7BS+UVUTrOzAeB1oBPhFYH+l3wetvsckTADWCbwQ2z03FRK91qegG2\/m6a2yFgR5cSJRDBBlVuxRo73YgvPn7WFp9ALg\/jv52L72GeDzEF4JrWqbyciw5mHFozqMWZWNEepdLgd9O9BDsXHejPWebySJLFrxYNAVlQea+3avnXa5Nzwb752WbmP7XNVWkc558akls4wiKJgJnbi\/D5WEljq0siz1Yc1OPu5im5S0cH1FTamJdOxkLpazYqwGXgKC7QHR+G\/Po01OPtL4KcoG4l0ANBMx+g2IRmr7n40TIpyI\/Bd7HU+mSJuh6gLhMsn17L0kkZa5k9gdmOSTzYPz+aVXSey7DqZJRsVNU4YBD4E3gIOio7+zV6QY5rYHuZ\/AfwxcCPFH8VSByQESF7Ad6m1\/+c6LGPyXco3rnAQW0h8CnhdYej5MiwitnWFiDAdC0puwwKTStg6NIxVYvwCYd2a9uaTazzAdp+hLR3Slg5nIHwT4Z8C9\/Dx0VylUIst1NWKkLy3K7zQ\/++CpTrDGlW9Blt0+AbWe+LM7PWXmYhVt\/wQ5TsoC4i0KBnmTEdzFAW6T9HfAH8PvIxtx6u093wSu2Z8D\/iWql567EQiuaQCft5fdMDOuSITkemq+k3s5vIWrISoEm6mChTbl7MLO8l2goSiks10jO7K6WhZ+71mgOMtXdufFdVJ2EX2es79pl2x8vAjwDMq0gm8qiJHNiy\/tBL2n1eVIMkilPuxwKGoTaySgY3ouvviRhbPm8DsxgSJz\/hu\/dmI7ceyHDidI1\/cgoRD2A3KNmBo9SiOOGpLh6gwB+VurBLmborTTOiT8ti9QhbQNecZjLZ1hcl4PNUKLPt+MaXfe1yYFLAJeBqr1NlV6hnmBaokxLa6LMFK8ishi\/3\/svfnwVHdWb4v+lk7UxJiBhuM8QAJNh6qPE+QYAMC22W7XFUuI4Grqqu7q6dzbt\/hnIh33z\/vRbwbcd+LG\/fEjXtv9B3Oqa7q6q5y2UYpeZ4ZJEYJDJ5tbIPRFvM8alZm7vX+WHsjjEFkSrkzU\/b+RqhFuyBzj7\/f+q71Xd\/VB+wC\/oQlIU6W+oAilB8ebnTJZnFQrkB4DEv43YMpXkoDoULL4B2a39AuwFWqPA08isnmh7JOj8aqytX+nxvmNbhua22i4MaDKqqCHME8eDz\/537KL1atwjxCngHSqjSKcJAydR2PSHaECCEjmdoz0ZeI\/wrLTI6jvFQkQW9iG\/AskAL2ttSNDAfH1toZJ5P17huIjMYSBT8g940hMFD7WkVexsx9XKBvy7Lryy2LW9aoSbl4WUaL8ihmeHM1Ie4xMRGuGxPnoWvH8MD0aqaOiV1y\/vXpvixtZ\/s51ZcNW\/TfDmxAOUwBJYuLV7oAU0V5DCPYD1C8qmcGq2x2M8RAZnGjKyhXYxLxn2HuusWKPzwsQdCFtZdsBbYitCocbq4Nx5guR0zG1E13Ux7BbDB67jngdYVjzVEFO8IFWJJy8ZSYOExGeVzhN5SaYEMfSh\/WHVQyzGtwRdHxQA3ITzCJ+HDe6yrgTpTJwJWCPD+\/wf1coHdTAd\/NrU\/PBvCS9e2HEN7E1kvBkuXl1tYYKKL+WqFLPV5P1rtHxRFvc+3MUh\/bNxCR7AgRQsSDDe6orOpDwN9ggXHYss6hoAdz5awH\/qyih0W9sswKDoLDqqREOIWZKd2HmUANJq9KY26e7\/kE+23MtMprrS3P6n25wp93XOHEmIdd\/1mEaJ4iwBVVMeZOG83c6aO5amz8kgQb4Gh3hvaONF0ZDUv\/psAZgW0KX2SFghmy1DS6ohlGY2Qs6JebQPHWkQw26\/s0eZLshfUujoOgTFAbs\/MrbFRMsapNfdiEgF1YhWarmPP7UZTephIbJIntCQux+dilTrxmMbPHV4EGhP2E0O4QYeTDs0mJV6A8DPw9cBelJdgecBrlJCUeLycqgj+\/m8KuddcDf4tVyH+H8N5DL7k9oyrRVT8unBKnZflMb+7KtuOxmPO2qnSB\/ndYe1K5xa5xzO\/l\/4FIRoTXQU\/Ob3C9cvIPikh2hAghIJlqQ5CYp3IvtjAmKe0mdCn0Ap8AK0XkBUWPAdpSV75GEhdDy\/KEPrCy\/bAj8oag+zEToQWYk2el\/xMEsRWYOdXHGMFehxlV9UfkesiIYz1nP8YSHKH22VbHHe6dOoqF143hmnFxKgYh2OmscqArw+GeDGnVsKKENPCVwlrgTEHlx8oYcfgRFszejvXqFTPY6cfelzPkSbLFjr8KeEDs+GcV8dhPY+\/1GuAtNSO6fhwygJaiBzvAwudcnDjjMNn8TZSHm+8B4HXgTwJ78MhGo7oiXIiFllCdiPIQ9k7fQ2l8Fc6HohzHkoElSwzNb3BRW+9uxqTWhTZ0HAf8GKRKld9nMrqhI033vHqX1gK+q1tWzFKgM5lqX6OqHSLyH7CYKlR\/lSHAwcwi\/3uUjCpvAKeT9a62lMnaFZHsCBEKiAcbXTxFVKlU67X7B2xxKkeC3QNsw0zOXtlcO+NoqQ9oONi6YqbOrW87qbBRHGeHKA2YZPk6rP\/zSmwDPqDwpcBeVA+K5x1rWTErqtgMAQ+mXOK20U3CKnJLCflZrxDh5omVLJ05lhkTK6iIXXrPV4Xj3Vn2nUnTkwmtaKkYoXtflQ+aCzTmbkm9CzBaLZj97xioFhUzyPGATqwa3N+UY\/Jg8Uo3OMoqrNrw11gbRzGOXf3jNXWKsLXrWo5X74PmMgi8fNXHaKx16D5KL8X0sOv1OlCvyteOkimkn0CE7wZqUq5gSb55mKpmLqVPECnWynIMU6JpKZJD8xtcUBxBpypyJ+GpjcZhMWUVSEZEN4KGMspKVftF5D3gnzBV0FJC9lkZAgSYrfBfIZIB3iKk0ZlDQUSyI0QoEJIr21APQagG+QFWwX6M0gdRF0MfRrD\/qKKrgBFNsANsWT4LrKp4OJlqP4IZHI22H4kr2quiZ0VFPSS7ZfnMkkrLRjriNtKpGsvcP4qNlQoNjsCU6hiLrhnDjZMqqYwNHsNkPOVwR5qDnRnS4c3G7sP8DLagHBvuhz0ykKgbrSYN\/3eYKkMpfhUhi60NB8hDhqlxEI8KYKaYbHIxxYk3Mpg0\/F+BN1Vw0xPo2TqvPAjjg2+70EEck34+hiUASwnFjM3exrw4Pmtenugv8TFFKEMsesWFNNUoczHTqQUU37jwYvCAUwiH0IJMGBkSxP5PTE1Gfz3htcQIRuAfxGKdblXZ5v+58F8m0q+qHwD\/4n\/HcIzcwkIlpvL6K6BLYBWFmTYzbEQkO0KEQsER8aBalGBsw0+wrF85QTFDi23YorlOVA631M0caT3Yl0VL3UzFpK79WKUxQoEhFkhchQVc9xJyH\/b4Cod7p1Rzz9XVVFdcPpnem\/HY35HmWE+GjIYSFXgYSdkGfOR5w5cqZjwEkxneCvwaq1oEl6DY6MHM3Paq5E6yBRwRrkBZBDxOcVzQ8Y\/1f8L6r0+U2NTsW4j1AcJolFuxKuDEEh5OoMBYi\/lxfIxDd6mvUYTyhNNHFcJtQC2WNJtE6YmW4ic5RdiNkC1VG8im2gTzU+2qdkxhK44Ek24vBRkvwv+ZTLmrWuoSBX1\/fQm6zl3Z1iki74lIkOh9AjNtLCdUY2tqL9CRTO3e0FI3u+TrfzmV\/CNEGLFIptoBGQVyqyK12AzYKaU+rgugmJxqk6C\/FXSNIxxuqZtZ8oUowsjDopSLmkrgFsxzINSqXGVMmD2hkuS1o5kyJo7kEMJ09nvs60hzui+LF46teAYz0tomsG\/9L4YX4PlS4kpsFuhTmNlZKZUwp7AZ9PvFy4NkK2OwWelLsT7sYhidecBe4HOUk1mn\/KVo+vIAAIAASURBVEy7nH4qUWZiweBMSlfoCPaCDcAfFbZ7cLZpWeQkHuHbWPSCG8Oe159hBLtcKpmKTQf5VIU2SjzX2SfYcazCH3bhQjDp+H3Ar0HuS6bcUHrjt6yYpa3LEx0gW4DfA69h4yrLab0IrscChX8PsUXzGtpK3qYZkewIEQoAFR2FSWafxoLj6yi\/96sD2AT8QZE1wPGYZMsuEI0wMuBATMzsbB5WdQ1tQ4sJXDUqxj1Tq7lhUiVODm+Wp3C0O0t7Z5rOTCjxjmK9X58Cn3kxOob7gWJrxlUYOX0C8xQoFTwsgfCRwLGYk1vQuPjlc+O6FmKmSGOKeMxzgN8g3B\/zmLy4wa14+AW36BfuYnik0UWs+nQ7pvoolcopUDO1AL9D2SDKmXUldlqPUJ5YtNJF4kxDeAJrcbiW8lHB9mOJtY9QTpfSzNCgCprFiH+x2i7GYm1Fj4JcN\/e5ttCSHy11M7pBtwL\/BWgEDlNe86kFU1gsBv4anAeSjXtK2q5ZbiQgQoQRh3kr2ytEZTYmD38C67crp3cryPZuBP5ZlXdVOamQXb9sZLmIRygf+C6qgez1qjC\/a0yFw02TqvjhlVWMq3IuW0JRoCftsacjzaHuDOlwwgAPkydvAQ5IpgDBhjAOuBOTiM+meKOuLoazmAP\/LhW6V+c4k9XJnqvE34GpeYp1Dg5wDbAC+B+AvxHlrmyMSYsb3FJeRwA8JaYwDTOwu4HCOw\/ndBhYYqgF+GcPmhG6KK+KVIQyweIGF2CUKA9g6rw5lN5JPEDgJ\/CBCju0xKO7ADJ9nqfmy7Efky0X471ysHX2LuBmicdCrd621CX6VPkI8714EfPrKKdijWBS9oWi1OHpXclU++hkqjTJ1nIiAhEijDjMXdkm4sgMbHTRk1jwVGq3zfMRyAJbgH8FXYcFz9pSyDFDEb5XWLzSFTG39gewEUShEYaYwLTqOLdNGcX0cRXEctCJe55yoifLvrNputJeWLrGDPCJwAcCZ0SGF1AtbXDxLEG3EHPkLrXUzQVagUN5zUv2mIglX2ZQ\/IA8CLAWYMaT\/wj8WJRZNSFJKXOFKmMxh\/XbsWpLseOvYC\/YBvwepQnobqpLEI3qinAhFqVcQamSGPdgfdi3U\/zpBoMhDewGNjke7aKlr6j6HUknQHdS3CpvFbZ3zBLRcY++2Rbql3lZ7cMUXC9gbt6HKS+i7WAJzUewFoebVKlK1hefaJeL5CNChBEJx5FpoI9jWd5QycYQoNj4nVbgDyBNoGdal88s9XFFGOmI4SjcKsp9GNkOpVKowLgKh5smVnLDpErGVjo59WKns8qxrgyHOtP0ZsNxPMNGxrQouAL9a4eftBotyh3YfNUplC4JrlgVZiuWQOggj4qMmgx6Dva7FBVkwcjAHCCBufBuBFbVNLgfAPscoXvNskRRg3K1Pta5\/nGVIoFyFiPYfwKaMhWc2fDziFxHuDgEfzqA8iQwH3O0LiccxVREH6hwRrT0aoxtv55NMuX2Au8DX2B+FOOK8NUx7P5cCVR39YgQYhV96y8SzGtwe4APRcXBSP7j2L5VLkmYYIrDE8Bpfx9rp8iKh4hkR4gwBCRTuwFnLMijQB1wG9Z7WC4LzDmTM+APIqyNx7wz66OgKsIwUZNyQalggDCEqtyYNjrOLVeO4qrRceJObq9XT0Y50JHmaHeGjBfKS5nGCMsHQKcWIKBRZQamDEhQWklmP\/AVsAnhQEzIrlqWx7qhjEe4hvJYDyuw63ktcD9KM7DKUz6sSbmHsdnfoQfnS+rdmJr8\/wGstaLYyYdgosRzwBpVTl2MYPvyYJprEyxKuY4IVQKVovQDvWujvu3vBRY1uDGUKVjbyo8xb4hSv8vnIwt8jLARm\/GeLUCSsyDwNOvFnLirylpMkXQzxeFaVcAoVCuzWWKETCZbaxMkU+09qG4DehBxGHAdL5dnpQK4EahD5CzwYjLVXtRpOhHJjhAhTyRT7QJaCTwE\/AbrhSknGRVY310r6O8F1gmcWf\/zKECKMDwsbXDJCo4oV6MswDLnoVRcFagUYdbESmZPqmRsVW5VbICzfVn2dKQ50euRLbyreGB4thahHcg2FcBwR01KfBelkRKff24nsV7dbUBXPgR7Sb3rqK2FUzFVT7msiUGwNRlzw18PvOXBJwtSbu+mEAP0mpQraqO67qf47UTBGMPNwJ+B1ShHY943ZawLUy4xiKFU4FBZ0+AmUG5AGY+5209QqKqxKt1BzGxqL2aM199UJgQnwvAx9\/cuoowD7hfzmZlN+XEFF1gtykcCHTGn9FXsAJ6XQXC6RWQ1yE1YUu1Kwl8LK4EqRBzRcEZpXIiWupkk690+x+ETVf5Xvy\/+x4QYFwwBcWxv\/TugV4RX5ze0H99cWxyiXW4vToQIZY1kyvWliHIb8F9j4xPKSSIOJgtsAX4rIutV9Ww2pPlFEb5\/cJRqNVOrmwmRMKjCVdUxbp1UxdTRMWI5VrFV4VivuYp3ZEJpE0tjld5WVTqyhZPlBfLmUpLTXv\/cmgX2SJ59dmqBVRZ7LsolyAoQw8j\/FVjP+EIH1lYq7y5e6e4AuppXhEIWY1h\/+iKKX+XpwSrYfwbWeB5HvSzehl8OnGdNgxtTZSJwDcrNeDyCjWu6Akv4VPuj+jL+553FkkwngK9U2FKTct\/XGHsR+psjtdSIRvUEKlFuFc7JxMstvukF3gTWKBxRyK7JR2kTMt575mYAL5lyD4I+DzINmzgT9pSFONYD3oNI0Sq1LebnkF70svtpf1r+L\/8\/P0H5jHkDW4N\/CPyDKl2g7yRTbacAbambFeoXRyQ7QoQcMb+hHWCU6rmsWA3l47QZoBN\/9imq6xxHOjbm6AocIcJgqDFjLgGmoMzFAvDwNlFRZk6oZM6kKkZXXN5RPEB3v8ee02kOd5mreI7cPFco1gu4UWBvU11i2Czen409CnMVL2Uvtoc5xa5F+TDu0PduHsHr4pUuqiAOvVgiotxIdoCAbE8BbkG4R4SXFNYuXukeEYdsISqzS1e6qCBqPZl3Yfe3mDLxboxg\/2dgHcLxdSsG+tB9afgY4FaxMXwPIed6b2NYfHjhPZzIN8fK1YiyBNgqWd5WYfPile6x5hXF7XePMHzUrHTBltmpwKPYGKSxpT6uC+Bh\/gqNwNeUqYoimfoKyKYh9jmq\/8mXKj9NiP4lmGLlOHC6pW5m0WO+dMbxBD5X9F+wffInFKeCnysEa+v8W6AXZDXosMduXg4RyY4QIQckUy6qwSxsqcMWzHIi2MHs0w3As8A6VDs2LosIdoTCwH+QKoFZYk6zFWF+3+iYw42TK5k2Lp5zFdtTON2b5UBHms5wXMXTwE6gVYXOAn2mYE6oVxDyNR0EwZi\/94EN2QyH8nWczmYhXoFglexD\/u+Sj84aBJYwsmTpNIGrcXgZaKMATrkqoEIlpk6YhyWlioHA8HIr8C\/AuwJn19Ya8fWTOnG1APgRlMcwRdZ15K9MqcIULdOBm0W5FuGlmpXugaYV0d4zomCL5ViUGmApdk\/LCWns3Xwe+AjoK0eCDdBSdxMAyXq3X4QvQf8XRXYDyxmYHFHI7cnD2nwOYWqTomNz7QySKbcf+ATkWWzt\/wmm3ikXVAB3g\/waOCMimx9sbO\/duGxmaF8YkewIEXKCVGBOkT\/1f8rNabMb67t7FlgPerJlxayCBzkPNbahiHgqxBxFlQrPY7QqDtDTsjxRkgU+QvgQe5pGYy76MwmRQMUEpo+uIDGhkjGVuRdE01nlYGeavR399IXjKt4BfAZ85VnloBCowAhOKatGwTicJmCn5jOyy8eGXyaoSbkeRta\/wly9y22dvBAOA5XmKf7Pvy5udHc2L0sMyzhIBQcYjyWk7ijiOXVjrsv\/RYS1MeHsKj\/ZWmPtTlXAbFGewvayG\/1rMFTlQQUWSN8LTEaYBPxbTYO7r6k2qmiPBCxc6YJQga3tP8N8C0qV8LsYMtjs6RexNaqzXAn2+WhZnmBBg5tWZR+qjYicBlZgSa0JFGaHCqZBuIDbUjezUPtS\/udbl9B59e1dInzgn1tAtMtlHxBsrZsHnEA5rfAxIZrERSQ7QoRB8MQ7LqfOEseC4CewPqUE5SOBAQuqtgN\/BJpV9HhrgYObBY1tgONklVHYgjktk3VuAbWRDUIvqkeT9e5+EQ45Dkc2LkuUbLGPUHh4II5V4+YQsqx5dNxh1vgKrqrOb4vqy3oc6MxwqCtLxtNCv6R9WCXlY+D4usK9Y5WYBDfsnr1LwcNkhpv8n+MbfjXkADYLnMKknIcxkllOa+XFEBDPmVilKSYev1uccnc11w2LaDuY9PYurCe7GOjCJ9goq1TpWrXcCPaDf3JBqUL4AfAr4OeYKVMlw79HgrU83AgsR+hHeW5xo7u\/ucij0gIsTvlO6SOAjJUaMZOJT8d6h++lvN7bLDYucSPwBnBwJBDsAJtqE8x7oS2D4xwA3kI4K0oHJscvhLrFw\/wRPlLR4g+CvgCty2dqcmVbpziy3dLcEgMeK9C5FgIOpuJ5VKFDVc\/OT7m7RfA2FcDA9EJEJDtChEHQ148IMk1tBuDPsExvubw3igX+nwB\/QHkX4XShCXYy1YbnSRU2BudOrEJ1v0+wK7DNWBHpB44qfJz12JxMtW9H2BvD69tYW\/iqeoTiQiwYn4k5JIc259cRGF\/hcN24OBOqcufxqnCm36Oto59jvZkw7GbPYgT7C5SuAn5uJVbFzmABU7F7mYM15F2sz3zIxNIRUOhUZQfwKbZmlCp5kC9i\/vE+js0+P7a43j3RvDx\/2fPDjS6exxi1\/eJ2wg8wg3ah94DfqbK2eXniXDvDEiOcFcCNCn8BPEM4DsAVmBv1j4E94vHW0nr39Jo8Ww+GgyUNrgCVqlQoxGpS7mSsl9zDDNtOYpXQqMqOeW04MMZT5mFkaCrl0+YRtLF8ALwKfDKc9alUaH1mFkA2mWo7gjrvYknNY9j1ns7wYsoeLKm5VT0Ol\/pcAVpWzNKHX\/26s6c\/vkUVVXuellLayRnnw8ES20+BdCL6X7LoQaDga0K5kIUIEcoOyZQr3b1cic2KfAobAzC61MflQ7EK9mfAHxR9w8twygvFRVzGgtyJVfJrsB68YAbuhQvmTCywvAtYg+rrHvIZJeoTilA4OEK1P8v5akKUEsZEGF\/pcEV1nKp47sWUtKcc6cywvyNDWkMxPDsMfAi0ixRMKo4KMVHilIZke9goprdRtqmtKUPGmtoEixrctAidopzG3vuRQrLB1rTrMDlhi8CZpSvd9Jo8XcezioMwFeUOrIodJmlR7Dp\/CPwJYS1GTAAbu6c2134GsAyrYE8N8XgqMbXLg8AOz+HzmgY3XYgxdxfi0RddMv4F8LLEBCaqcp1\/rrPFCP8ULCnYi5kWHgQO1aTcA5iD\/gEPOpu\/hzPAF73sQoa4Z\/LwJzElQjFHzF0O3cAO4C3MY2BY61Op0VI3S4GOefXuZhE5jkngf4Jd\/yCmygdpbP1eD3zo9Wlvqc8xwOqf3sCChvYeNZ+Pf\/PPbQnlRbSnAz9XlTOIrJzbuPfAlmXXF5RoRyQ7QoSLYO7KNkDGAQuBWqyCO47ykFAFVYvPgH9V5VUcTm39ZWGDhIca2\/CQUZ4nDwC\/xAj2dAYnWBVYhWQ8cBXIBEWfTabcT4G+lhEk84pwAZTRWKVvEiGRBgXijjB5VJwrqmNUxHI3POvoy7LvbJoTPaEUOoKe5R3AaccpXMZbPCoQqrH9uJiB\/jmzRLE+x5Po8M6rJuWCmmM1lowrl6RkPqgGrgemI+xASef7AaLEgFlq+0bYY7sCQ6jXBJpRTjadRxizWUQcJmOVpJ9SHEOrScDdWGK6XYUzFPjZrnnBJZMlpkIVMNEx5+C5mLHUjdg9HI0lkuL+T3AfzgK7gC1qxnBbF6fc483fs+q2k\/Gd9pVHgKR\/vcohxgFLOu7GCPZq4HDTdyQR0ro8kU6m2r\/ETNyOYUT7Xsz8Mte9NYMljNYCb4Puf+\/X4Y6jyhebameSTLV3quhWUanGWkoeonD96MNFHGv\/\/Jkop1B9c35D+5FCztAuh2xChAhlBxGpAu7BevTmYotCubwvPcDnwEoVfVvRY60hjOnyVCo9j\/uBXwOPANeQewUzkBbXgvw1yB0g1clUyVuGIgwRqkzHgubJhPguVDgweVSMSaPiVORYjs56yomeLO7pfs72e0jht+9TwMcqtKvQt7pAc1lrGl0HIyRXMzzzqaEgkIm\/gdIGeE3DnBOtDnGUO7Gq2C2U34zdnE4DuxejAMfL844seclFhQo1sncT4SYaFDiCJUmagCOx8xJAS1a6iDAaI6CPY5XdYkiBY\/53zUGZIIrU1Bdu7V\/c6AoOYxVuQHkM5f8N\/I\/AP2CKq0CiX4UlTYK2pgCBId0y4N9jFbaJRbguZYNHGlxQxvnjGBdj6oZyiXHAnLJXA2+LFGZcYjmhpW5mBnQv8BrwO+Ad7F2+HMHLYm0Pn2Mk\/Tn\/z2VTxb7gPBU4DTQDL2CV7UK2Ww0XVdha8LSgSVUmJs0gsiCIKtkRIpyH5Mo2EIkjciNQh2XdykXeAla1+BKbE\/mqqBxsXV7YmYjJ1B4BqhS9Dfh74GHyy7AGCPpelmF9cCdRaX\/g+bbM1l+UV8Y1wuCoqXcFSzRdTeHHj3wDMYTRcaEqJjmT5YynHO\/OcqQ7Q1+24IZnWcy59X2s6lCQLHey3hU8piLMBR6guDOyPSygexVhu0LPcM2EHvxXF\/G4HqEWkwpPLOL5FBJZbJ3tATTv66KIwGS1Su7VhBtn9WCJklXA1yj9qy5MAAnXYlXsOymusmACpmiYiHKAAr03i1JuhXhch3Av9pwtxKpRo7A9KtfXvwIzflsIZEXZu3ilu615xffDsDPDufFyD2MkIzSfjSHgLOYR8SqwS7Vw7TnlhJa6ROZv3\/\/00BdtY1eryk6gWYWFotyGJT3GYCRwFLaWnsBUK58Ba4DNoEeA\/nJWCfpFoNPzG\/a8raoV\/nndSXkkYcU\/nrlYMuAE8N78Brd7cwFaXCKSHSHCeRBHYsB1asTwp1jgWw6yFrAg5UvgJVVeRznQ35staHbXMng6BrhNlX\/Eqh8Th3kNpmDX8lOFY07MOUtxZbERho9KrII9mRArYao2vmt03KEyBpIjy+7JKHs70hzoytDvFfzR6gE+V9ihSs+6AgUzVcKVWNXtlxghG0vx1prTQAuwVuG4yPDex0WWhJkEPA08ir3z5WKelC8yBEnBPEe7LEm5kMXBKse3E7789hB2H3cAXaLfvI\/ZSmJOhjlYj3kYRmeDIYbfMiAaTAAcOhalXAcY5Zis+XHs980MXwFSDfxAHe4Fvljc4J5sDqF\/vNygcKXYc3E\/5SPf9Q+NJqBelY+BrqGYD44U\/P6e28AquzvmNbTtBmcTpoC5EfMWmAraB3IIS\/K6wBequg\/oFUHLmWCfj6xkzyC86HhOFvhvMe+ecvAACIoINcApkGOgX1GA0V4RyY4QAUimdqNS4SjeFJRHsVmGUymfjcfDMpgp4BVB2xHS7\/\/V7IJ9wX3PtqEq1SLcAfw1JvksRB+6YBvGEhG2AR3JlDtiNoYIgGWcr6QIbROqWCU77uT04KnCmb4s7tl+TvRlC529yWJmSZ8IHMoMsxpXM9AucSXm9fBrjJCFqg64ABlgh8KLCLsU0sMhFY80upJVxqv1df4Cq46N5NiiG2jHAtqhBFnjsArrtYSfaNgJbBflKOBdaNAWyzJJjezPxCpixcYE4BoV3h+OUmJRyo0LXCXmxvwMJsWfTGGeMwGuFGUWQgXiT8v4DqMm5Vai3IzJxG+gfGZie5gy41+B7SJ08h2\/F+ejtXZW37yGdhc4gI1TrASJoaT959ID7QRNi2S1pe7GUh9yXtiybBbz63d1I\/KqIhXAf8De5XLYLwRLDv8EOKHKvyRT7t6WYfo0lMOJRYhQBnBE1BuPScd+jbmjlgvBVsyF8gXQl0B2IZJuqZtZ0C+pqJRRCHf6578M61srFKqwwPM50D1FuWoRColqbAMKtW9YxGZdOyJUxXOTi2c85WBHmr0dafrCmY29Cwv8ujcOgyj4BNvByMFfYYmsORR\/Hz4IrBPY6jG8ILamwSXrMQarKv41Vlkc6XHFUeATFY6TZ1LFc3DE4yr\/eoQ9aziNyUZ3yCVGyqnHLIS7sHafUkj3K1WYoVnSDz3nsuGX+b8\/i1LuKN\/UrA5Lfl+J7SeFvLYxbPmJo98LUjcNWIT5zhRynx8OMhi5\/N8Q1gEdgIbhSl\/OaK2dmcXUU+cmsiTr3XOrdEsRx+GFgc3Lb2R+g9sl8JYqEzEfhZsoj9YiwbyH\/gqkS0X+lEztOQjQUjdjSB840jfDCBGGhXkrXSxDKEGg+CtMwlIuBNvDKiqvAfXAbsikW+puKMiHP7HKpaMTMhmqsb7QX2EzTieEcC6TgTu8LJu2PDOyN4rvE2rq3RgwCQl\/fqpgkVavpzg5MGxVON2b5YvjfZzoyRb6pfUww7PPgf1DrcQtfMFFHEShUqy6+UuMZM+g+IFFF1YhWQ0cWzcMw8Qam0c8Rs0V95fY+pFvj51i17lcpOW9GHE1mWoeAX5NoysoY4E7gFmEe289jJDsAM5cbMRYTb1bifUchzpybxAo1us81vOIbfhlbvONa1JukNlwBCaKmZL9AvsdRkuFYsk0T5Wq4XoTBOeARRYCSFNteZh2LfiTS0UVVdgzugh7NsoB\/dgoqmcd4W0POppCMHMdqRjpxPpCqArY3voa1lLzt5gCqlzi7quBFaKcEOGleMw7yRCT0RHJjvD9hgMo1ap6l4jUYT1K5WDGAPZSnwTeEtE\/CHyNp32blheGYAN0dCCeJ6OxntBfAz\/CKpZhnIvHQBUimps9chDHEiRDMb\/LGwIc7c7Qk\/YYFb\/016lCR7\/HR0d6+fBYL2fTBZ++E4xI+VyEE0P9EMdU72Mxt+1lGMEuRWWxH\/gCM8zZgRGLIWFJyhU1dcOtWIVxCflVxBQjtCcw4n8l4Y+6uhwyWKC\/FWjL5jm6S5SYWhXk3jyvxVAQjO36mkuvpVXYdZ1IaapEij1zXizGGMwReVAsNsdrHFtzrsa8PP4CS3yHlSgI5oyfGcq4tgDniLVd61HAFaJMVHBqUu44LMGm\/nU4BOxpqkucCumcLorKamIo12KKvRspj1gnmPX8qgoNjnB8zbKIYH+X0VI3k2S9mwEOiMhL\/l7yd1hSsByItgPcAFqnytFMVtYmU+2dQ1GPRiQ7wvcbQqUgc7Dgdwlm3lMOCDbj9SB\/Aj4DTW9aXjhX7geeayOTYTTCPRjBfhhb5MIIyIKAyxFhHBHJHkmowEhhqKO7AmQV9p5Ns\/tUP3dWjSJ+wRgvBTxPOdPr0XqgmzV7O3E706TDMTxrA75wzO02b9Q0uDGUK4H7sDXmJwzfSHAoUOA4ZijUCpwZasVuiY03qUb5ISbffYz8\/CsCUvMF8BbKJwg3YOvv3dhzVmwodo+3+Nfn5IY8Z\/KqEZYbsDF3YfY\/Kyal3YVykEv3jQctHuMpHcnuA9LiUM1lSPYjz7lkPcSfe53ATPSewchgmJV4BTpRjmH9+HlhSYMrKHGgSu1a34Q5JyfU1CqzsHe+y78eGf\/33pqU+6nA+yp8qsoxEdIaQ5t\/XvjK5eIXXFCq\/WOroTxinTTWCvcukMpU82VV3\/dCrv+9R8vyBMl6t1+VdqARYQymWCkHoi1Yhf0uoFaV48B2hpCYjkh2hO8t5qfcmCozsWx5mAQzX3hYwLcJ+EM8rpvxvCFn2C8FJyYViMzBDJgexvq0wjp\/D6tc9YmUhZtkhNxR1IpYxlP2dabZfKCb8ZUOsydX4ojQn1V60h49GY8DHRm2Hurh\/aM9HOoOxVHcwxy4dwKHVg9B7rm40a1AuQ4jjz\/FRoRMpDQBRDDqqRllb\/fZoVXsap53UWEUyq0YCXoSuI78nos0Ziz2psLzEmMXHlcAX2FVyxrCaVcZDP3+9zcBO70hBFMKE8TMpGYQLinMYi1Eu0Q4s\/YiyZLFKReUSiyhOZrSkuxezcEqIV2JiJHAm4GfYwqJYpjoecAJhEPkmfxdUu9WoFypZiz3Q2CB\/3sKRmKrGbj2wSIVXIt7gIUKO1E2CzShfCQeJynQuLMANSkX9YihTEdY5F\/jUu\/DWWyM4BrgReCzjT+OKtjfJ7QsTzCvvr0PR74S1eexWOMpwo1Fc0UwMWMR5tNxcn7K3bk5z3ntEcmO8L3EfX\/8WlRlKsLD2BidBOXjsNkNvAf8EXTzhp8nCk6wk6k2sEBgETYL\/CrCXQ+yWCXjOHw3Z15+h1GJMJGQTc8CeMDJviwbD3bjdvRz\/fgKpo6OUx1z6On3ONiZZufpfg71ZOjPamGj0QEEJjw7yUHmej4WN5yr9M5ReEJs3NBt\/vUrFQ4DzcBHCL1b\/m6IlbIKRqH8AKtg\/xRbN\/NpIQiuaxPwrkL7mevxJrRzQqyCPBkLsO6leOuxYsH+OqySfSZfF\/lFz7siyjSsih12srbfv4Zfw8UNzwBHzTdQKG1VqN8\/xkH7sWssKTAau351GMm+nuL06mcAV4Sd5JBcWfSyTQhw0kxWq3TN83\/uYGB0ncO3r\/uF\/38lpgCZhFXrbwMaUFbXpNwjTcN0NT4fqog4jAfmY3t+qWdiB8qadRjBfr+pLpG3iiDCyEfr8pkAfclU+w5ses5oBtRRpSbaDjAdSyYfVXg2mXIPtuShcopIdoTvJeKjK8ajuhD4GSbvKsV4kwuhWECyHXgeWK\/q5BXg5w6JYzL5RZicLeysdj8W6B\/AKtoRRghE8NSejwqKFLAHRPtEX5YvT\/UzukKIi5DOKt0ZJZ1LaWx46MdkjO3kISFd3OAG\/ev3Az8V5UGs0luqoDZoO3lPhY0Ix5qXDS14X5RyK3yJeGCOOBQSdAYj02+gfN5\/gr4PrBLr1aTcE8D7GHGZhZHVYlyfTmAb8BawG8hsylNK78So8o\/5BsKfd96D9bDuy2YunrBUUMf+3mn\/J\/TRe5dAII2+XPVnNDZqrA5L3hTLFDBoXdgjcFwvc5yLUm5MMlSJvQePYZXrWzBCMJSkkIPFHtOApcB0lCnAyzUpd29TXW5mcYOhpsFXNdg1XYglxkoJxZ7JdcALKNuyWTpKfEwRSg7tBfkIS7qMw2LTorSoXQaCreu\/BDmpoo2YV1JOiEh2hO8dkqm2ClTvwuSO91CYWdCFQC\/mZNwA2qQeJ1pXzAzh\/F3xz\/lOLEAYXYTzP4PJMduRqB97JEGFXj9IK\/TYnEERlOH6PaW\/V7\/130NGBjiC9WLlFOgubnCDXtKHRXkKIw0TKO0+248RxzUCO5uW5Sd1C+Z694\/Bcbq4E\/gNRi6mkz+p6MHI7KsIH6jD2Zb\/6rx4P0uaGMexZFyxqlr9wJf+MX2GDmkuNiKMVrv3Uwj3fgdJkz3AiXW\/uHjCZF1dQmtS7mnMRX4yptaaTXHW+vOP9SxmbndJ9dKil9w4mXMS8ccxg7BiBdaef3yfZoVTzcsu4tLuG5qprX\/XivIYFjvcgr3flQW4poL19N+BPT9p4OXFDe7B5uE6k1s+cjLWrnI3pa9idwBrFZ4FtgicXv+LSCb+fUdLXUKTqbYOcFqxROU4bOJPKRVg5+MmYLmonJzXsGdNa+2M07n8o4hkR\/jeYEGDi6cSxzbHOmxu80TKg2D3YUZADcAqgcMiGo4SVnEQrsKcgYvhchzMGn4fq2QPOzsfoThYknLJKt2OBeejKMG7Iuf+T9EQOF8fxQjNZYPcmpQ7US1h9xNRHsV6NAsRfA8HQV\/5NqBV7M854zy35MqqLu5U+HcMTB\/It4Kd4VwCkU3AyeYLHISbnkkE3xl8dnYI35PvMe0H3kHYkBnFmQ1PDqvINxEYQ7jraQZLQrgwePWvqS6RqUm5XwJ\/wirfP8EM+IpVHQoqlpdsEXqk0ZV0lhuxPszHCL+f\/UL0Ytdyt3jfPsZFjS54xICrxJLST2DS0elcXBI+XMSwYP4JoE2UMzUpt6MpTxO+86FChSizMW+I6yltZbAT84X4V6AV4Uw6HlbHT4SRhpa6WQqcTKba12ImgldgyepS+weArUt3A8tE9fj81J73RlVlu9f+dHAz4ohkR\/heIJlqQyEmcLVatvwRzMypHAh2Fqs2vQK8Cez1lHRrAZ3EL0AcZQrCNRRnhEfQe\/Uh0JFPP0uE0kIBZ2B89fcFHuY2fBToabrIjNIfveiSVUQVPEigLBPlEawSNYnymPscVGnXAfucHJIFF8DBiOP9Cn+PeTdMYmhB+n7gX7EE4lHVSx7LGGx0U9gV14AAbgFeRzm04cmhrUsLn3fxsvRIjP3Y7NcwewmDfuz95GbS1afKLoEjCC6mRFiK3cew976gSnyMi6wfNZbAmybKzzDiWoy2pfOh2P36CBvV9437vzjlinhUYP3ST\/g\/dxK+8q3K\/565wA6Urgf\/6GY3\/mX+CSC\/130S1oJxJ1YhLBX6sFaRf0bYKNCpim58utTq9Qjlhpa6mcfnNex5XVSrseTujZQHX52A7YNHQI\/39TtfzatvT\/t95RdFORx0hAhFgDiqcgXW5\/FzrE+yHAJhsA3+TZRXVWnzstqvEmpyN4bIeGzBCLtq0Am8i+rbCvuGKseMUFJUYIHy8GSLIwceVsE+wUX8A2pWutKfoVqEK\/zq9QpM1nY15bOnBgSiRS2w7Vpdm3swuyjlxtSqdwswYjYfI8BDIRfHMWno68BhhEzsIp+yeKUbwyqZPyB8J\/s08DnC6wo7tGJ4Zozq0Au84piseCkmzZ6KrbGFbLPowsbKHSQHA0l\/TFu2pt49Jcp6FTr9Y3kEqxSFRRaDkY3HsPfoYhvaaDXp9TJgDsVXyiimCvgCOKPnkexFKdfBnvdbMQ+CoMperPf7CsxMbZUKB2NVQ1x7FRHhZjXVXimNpPqw+fO\/VdjgQZeCblgeEewIF0dr7YzDyZT7Z5BRwD8C11D6mF2w9+hxhf2qHBXhGFx67Fy5BAQRIoSGZKpNQMZgZkS\/xlw8y0F+AlZNeQtoBN0lQr8qvPfL2WF+p4dttpWEu2ilgS2o\/h\/Al+rR631faNp3BE11CZbUu1kVDlAeqo9iQAAPIQ1kahpdUe+cdrlaYabArWoJuycwg66SSOkHQRZr0dgCHCIPt+xFjW7c8UgAj2JtNfMYWqwQ9A+\/qMq\/YNVXVYW1FwmuHYfxat81h3DXZwVcFd5AWQ90r\/vZ0IP99b9IBJ95EPi\/alLuc9geswSretzO0BUAF6IDc7w\/Rh7G+r4ao3dhyt0Wg+cw2fDdhJdkDQzljgFd589kX7LSRYU4Vl39G8KfK34pZIGvxEbbdQcv76KXXZE0U8WexV9jCaZiq95i2CiwWQjbZYi7tOMwSpUHsGs91CTZcNGHqQV+i7JGoHN9RK4j5ICWusTJZKr9X7H18zdYq1Kp99kgGbwc2K+qr81b6Xa1rrj4Mx2R7AjfaSRT7WCBxA+wCnaS4kikc0EfsBGr8nzasjwRuiHY3OfbUCUrQp\/\/\/WEsWEFP60ci+v9R+BwlveWZaGMdaahJufiOuyf9n6mlPqYiwMH6VucgvI\/SDzgxuBEhKTbC6k7McXR0qQ\/2IggIzgbgU4FM02Xcsv2xRCJZ4uLxQ6y6+BOskjcUchhIhVcDvxXY17T823LsB\/7ZJV4BFVXEVbkF4XH\/2odZYT2FuZu\/hXKseXnh2lcebnRRNRm6Ku1qkyIexiqhNw7z4z3giJiBZNfaIRx3XEkDW1XYiiUzJhXq3C9yrCeBE+c7ZC+xnvs4FqTWYT3ipRidqdjz+b4KrijZTKWZsDlpMy\/EKth3UzpvhbHADMdjSM\/nkpTrqI0RnIepbIpdBQyc2z8F\/qDwbvPyREjTUiJ8F7GgoR2FkyjPqhHsp7D9odSowBKpfyciRxHdyCWURRHJjvCdRbLeBdUK4AZEfopVFsolKE5jGfTfiuiHjmhRHLd7uzxGT4gLFoSf8I+jkFUjxZyBP0bkf1fY7oim8x2JE6E84JmTtwBdonyJmfKUOpMcNgSrTj+FMhkhLVaNnI0yAZNyFtOlOV9ksCr2OlEOqAwepC96xUWyxMRjMsr9mPx9PkM3SfIwifga4A+OsGPNJWb+jpkEKDHMSOoxBtyVw0K3wlpMut6e9QrbArF6wJ06vTDl7hM4JMKHorwP\/ALrs50wxI\/vAw4hHBRbt4cCRegQ+FBNMh7GaK8gyXoI22MAWLrSxbPvmoTJlx+mNAQb7Fp+AnyM0qUOOGkqsaTSU9hoz5spneJN\/WO8Ehi7dggJeLXK9UP+ORVbKRAk+j4BnkV5PS25jz2KUN54qLENBcmqgKItIcV3lXGPjCfZrCcu8EeUsdj4yDGlvgYMGKH9EuR0MuV+2lKX+BbRjkh2hO8sYjEcz2OaIk9iss7ppT4mBjbPHaj+VpENqtK9uUjyqY\/+7gaSKTcLcgz4GpOrF6o6Gcz5\/gR4TvBWezj9m2pnFuXcIhQe62oTLE65WbGq1D4scBpfwkPysEpkO1admUbhSYJgm\/gDwL0+RQ2qQGE4ChcSgaHXRuBrlcGr2ItedkUyjBKP2Zg8\/GmMXIxnaJWvwNG8BagH3ltTm+i76Hfb\/N5gnOAD2BodJhlIY\/Lgl1E+UYeeDSGqa9bbdc8set49KDFeQjgE\/CVDM90MxmF9pQ6HxBuaI\/Pa5QmWpNy02tp\/HOsdD4NkdwBtAkfO\/Uc722Ce+EKskl4qBPPa2wQyKKOA21GWY8me2ZS+pSwDVKpVtI\/l8w8XvewKaaZh13k6xa1iB\/f\/Q+B5VV4VOLbpAsPTpdY2gMpA65oqiDANYaooqrbvHGqqS0RztEuI5Au7AfBicUegOuPpGIFRoB7Qmax304CnkBEh6ziet2nZ8Fsem54y8995DW4v8LEgz2KV7BrKoz97HJYsPA7SnUy5u1oumG0fkewI31lks0xAZBGW+ZpN6Z\/3gGB\/DTSKw+v93dmO7X8Zav\/1RS8NFmB9jG3Ckwt0bbr9z0wBb2TRs1tqZxT73CIUGDHBU7WgWS1oLhXJ9rDvfw3YAfwDRrLDgGCbeKk38nyhwF6EZiwwvyQZW9zgiqSZhHlV\/BQLFq7DMvRDSSQECZBW4AWg5XLBsT97eLaYyihM0uVhrtxvAu+J0NFUW5wpB+t+kdCaercLG6VW4f88gpm75YqgZWNvZhR9G54YVnIgK9CvljDLUvhqcharYLepDlSyfTI1CVMr3Ebp3q0slqTbAhxHqFLlDgac16+h9ARbsaRQH5LfdVpS70I\/41S4F2uTK2YvdkCw38fWgDdRjjWtGFCyLE65OA6oObdPxtacGcCtItwCjEGJq8UkCnTWpNzD2Gx4F4uf9qCcaVqeiMZ\/hYwHG9vF8zSuygRHvZtU5E7gWrV563GsBeUEcEjABdnlaewoFusWBK21CZ1X73YqulVE\/og90\/dT+pjewYpUDwP7\/Ir24fMn6JT6ACNECAULGtxKT+VOTPZ1K7YglBppbKN4DfQlEU6UgGDTUpdg7gvuWScmH2KOnzMxCexwNuJOzNykEXhTPQ5sWTEr2gC\/A1hTm9CalNuBBaYHsYCo2EFo4Pi9XuAlLY851OWIDPCVKp8p9FzsBVyUchGIi3I9Fhz8DLiX4c1PDgj2ZuAFgfXo4PJQAUesovsQ5mIe5hp91j+2N0TYJ0UeSde0PKE1KfcsRrQnYu0I88jtPQrk13uBPRueGF5yQNWfzCf0E877k8aSYXuwfSFAzD\/v2zEiWyqcAd7DxtuJKnOBv8USH+Uyfs\/GCNp17M3nH\/qmctdj\/jNTKe4a2Yld25UC7wKHsuf1lNekXFGIqXcu2TIfM2W7FVMmVfjnHsP4iYMlRXowhcwxzJNgA9C8KOXuXleXGGrrRITL4MEX2x3PY5IityM8CjwopoyYDIwBifnryBns3rQDW1DWJBv2fC6inZuXzSxIHNi6POElU+5JoAlTd5j6pPQ8thIr4v0IM\/dsSqbcM4GEvtQHFyFCQTHfjFXwlBuw3qqgB67UwXgGIyirgZdBdqtqyby2tzyTyCZT7i6Q17BM8iKGNv8zCAY+wAj2atB9rSsSkY\/4dwjZDN2xGLsRdmDVkeEmZfJB0N\/3AfCG2kZ+N4UdjfRdQTcmgT3dfIE8c0m9mU55MEZs9NjTmJIlgRHcoV7LwExso5iJ43qEU2vrLl1lWtLgospozEF5IZa4CXO29A5sisOXcRneuK4LUZNyK\/zr5wG9TRfIBQM01SW8RSn3pGNE+xb\/nGdw+et+Tn6N7SFDP1Z7BmJYkDqacAhlL7BHwBX5xizvOEaub6R0apgMNrJrA0ofwgLg32PJpnJaTzwsMXSMPCqC571XtzIw07tY6MBULM8hrPWEw83LEucT7DgwUczXYykm+b0B20sGS5gGz+tY7Pm5GViA8LgDr9Wk3DXAPg8y6yLvl4IgaeuEZLN6FcgTwF9gz1OwZpx\/ryoxU7Ip2HM3H3gI1QZVfTeZcve31BUmHmypS3gLGtuPeMpalCkY0b6R0nk7BBiLmTge91sxt81r2NPXWjsjItkRvltQxBH0CpAfYRvnVMojM30MWA+8KsJXMfEyG5bNKukBtdQl+pIpt8WfQ+hhwe5Ecg80PP+8moEGFdkKHBX1oszydwx+9esg8Bm2iRZjxnqAHiwwfg0jcjFgnJZPQFwuCCSmGRWqFze4p5v92dg1Da6jMB5lplhw+zSWLBnL8NfHM1hl6VmFjY5wcs1lpNjZDI4TI4EF23cQXhU7UA+9ixGAjneXFS4QX9zgjkW51b+WlcC+mpT7pSgHRelbs+Kb12FdXSJb0+AeRNmOyR2ncHkTn8BM8ihGZIaLSkxBMJFwEhudwE4VDuJ8w6CtAquwXktpRnYpJrnfCuxHSGIS8Ycon4kjAQJvg+PkMA\/9vDOMYTHPnRR3rnc\/Jr\/\/N2C9KEerZMBUcGHKjWH3filW\/LgLUw3k25oi2FpxLUbOp2MtQ68K7FyccnubI6I9bKgiCJMEWYqN2buH3Pf7Cdh9ngpSDbwyb6W7P9Ov2W2\/Hn7Mu2nZTC\/Z2L4P5W2sol6NPVuljPMFW1OXAgdU5DDgzm3cm41IdoTvDJL1rgOMU2QJJoGcSXmoNU4DrQqvAB9mVTo315aWYJ+HLlTXIQIWyD2IbVqXW1A9jHStAf6IVRk7Aa+lrmzOLUKBsOGXCWrq3TNYFW4+pn6YSPhEtw+bC\/wGsBrliMJMhFGUR\/KsnBAEoLf7Y8Y6axrdLoUqVWaJch8maVuEkbtCEKxOYB3wB0yOfeZyBBtAhPEYyZyPSYjDuJdBBXgb0IRwqBB92At9tVTMekcXArXAYizgPwi8pkKDCh\/WpNzOprpvfWc3JnndifUmVzP4vcgCR1XYw\/BJdvCMTMGqyYV+f7NY7\/sXKKe6x37DEyDmf+84wlMtDIYeTNGwC5OZ\/hx7\/saW4Fguh6CvPZgAkhNUGYNwM6YQmUj467Ni6oCNwD\/jt4l4SvZtn+wueMeV2FnmYNf7aUzFUQjVQDWW3BqFtZ6kgK9rUm76ciMLIwwOEUZjarFl2DUeSkL9JmyiQq848npVNYcfbHS9jYVIcor0gX6JTYmYir3DV1CadeXcUWEtDz8X1d0qckJUT5UDAYkQYdhIrnRBpBqrivwE22RKkS2\/EGnMZfNVQd9DOb11+cyiGO7kgpa6hCZ\/9\/FZxo9fD3IKYT\/wJOYAe7Ess2CB3hfAKqy\/fAfQ3VpbPucVofBoWp7I1qTcL7DEyq3YxhZmNTuLSWRfR3nD\/3MaoQqr\/pXanKgcMRrrxewXuAaPM1iy8Q6sGnEjhava9WHjsH6v5iZ+xuPyrtePNLiS8bgVI6azCW+d7sP6bptU+CJbkV9v68WwNOXigWTt2VuEme8tYGAU1rUY6a4GehE+qWlwe5tqBwLLptqELm1w93mKi62ll0t4pIH94rEHI+hDh63mY7FEahjksg\/bG3YBfa2PDpy3gKhPiDByVmwlSgemvJqFeRDcS3mMAroYerBkRV4kG2ESlri5gfCr84FXwIfA74Emf0a817wiwZJ6F1FEzzJHzVX\/Kay6Xsj3vQozTFzmX6vTWB975AczRCRTroBchSlB72bo70gVlsxaAZxUlTWqehqGNvf9fLQ8PYPkyrYuHPkAZBJGtOdR+oSZYHvaL0T1oAgbIpId4bsBoRLrLXwCk0NOpPRyUsUqFi9hcsqjULo+7Euh5e\/uYN4LbWcQ3SLi7AReFyNRM9R6oK7FMnTj\/fNpwapD74MepcgmQhFKh6a6RGdNg7saq5ROxwhCGO9ZUBF7GXgZ4SuUfsdBVMF3Ni1nkt2LueA6DPQ8FwMOVhn+mT8HOTCemogFIIXI9Hv++a0F\/m9giwgdgK6vvXyVIgsTEBZjY7smFeiYLkQgDW5FaBE4s+Fnw6ugLF7pon6rQswUP\/+IJTTGMvAOBNf\/cYQ2YK\/vyP+NwHJNbaKrJuW6WN\/t5QhBMA0iP8J1cQQz4G9gaB4cgyEYH\/ceVtG\/cK\/L+kR7qO71w8UEzKPlLizJUEzX7XxxCvha4QSS2yz3hSnXwRRGd2P7dtjxfT8WD\/wbsArhVOADUZOy8XwqXK3wDJZ4uj6kY4pjRPtJ4AuF0w+l3J4NUTV7qAi8MuYxfMXTKGyd71A4hMWNBXEdb1kxi2TKPQu6GmQCAz3hpY4L4v45\/waIKtkRRj7mrWwTEZmiRq5\/RP4zSMPCSUwi\/jboASDTsrw8pdStz8wCSCdTu44IclSIfajCRLHgfKKqVKlyRoRu4KR6ekrVesW2hDhrNkJZ4iDCsygzsfF4ha5EZjAn5eeABrWqWG\/z8gQLn3WJVZJGyraSncFmxf8ZM1e6BeG\/xYKNYq1J4n\/fKAaSjYX67mCU1CYV\/ndRtgt0r82BXAdQq24sIVwi0I9VsTeK0u7I8BOBIsTVKiYPAf8N1vd6KcO4aSiPI7yFVU+\/QZQWrXRR5TORnEhzP3AI4STkRrgGgYORndkUPvETvLetqnQ2Lx94Jh5udPGUjCpnGJ7J3nAwCksMQvm3mhwEvhTlDJpbVdax6zoHU6uEnUDI+sf4tghvCpzy5BuJJEetJeRJTDI8g3CveSXWfvIQ8GXMji1S1g0FyiSE27B7Vgil2ihM9dMJ\/I\/JVPtOz3GyW5ZdP+wP9kdldSRT7msgUzFlUan7s8ESFQtVcSOSHWFEw3cTH6OWoX4S6x8p9QummNxrtcC\/KewBzYyEXuWWuht5sKFNQbt8Qn0IQFXxRDwgViinyAgjFBb07QD+ExbIPUrhZJdpYJcK\/wY8L3A0q6SDqkSsCsVIbLn1ZHuYHLUd609+TeA0wigtbcWskFXiILBuAn6rsL05x\/E5S1eaW60K41R5BJOuh1ndPwWsUfigqS7RM5wPWmx7TDAW6VGsQnEXl3\/+ZgJXxYWPvvF55twLcNi\/BpcLZDtE+Bw4ubZ26HOBF6dcFCrF9shCVxUVq8q\/r8rO5uUDe8TDjS7q0x2BTi2u4\/WFKKc141JQ4CuFLxByMvKqsWd0CgNV7LDP8wzmwfDy2trENxzv\/WOpxtyW67CETjF6ZScAC8QKG4cZfkLqewffVXwS1lIRtMAMF4KpfR41QzD5T1uWXX+4kMftiJwAfucpU4FfEZ7CLp9zngw8GZHsCCMW81a2oUqVn3ULHCtLvYkGJOA94L8g6jrgbSofo7PLYuPAsSrfzgZHG9f3HE11CWpWummEjxH+v8A+zGhwOha4D2Vz8zBJ7PvAS6I0qnBWwTtf9qeCI4qDVVP7Kb2xoWLyt73YO9\/owVpH6MWMWKahZaGqGS6CKuW7KjwnyrZeL\/fqsOcgWHY\/qDaFOcKpF3PBX4dJtYeMha+6kKZCrIf8Scy46XYuH3x6wClRRmNzi89dK7GOZAerip9i8P7kDOYq3iZ5zku+CGJYlfOHFL53sQ\/YIdAszjfdsFcvS1CTcgPDtWAOcikNisoZHtYm80HWFBA5JVVUqBAbW3on4ScxeoBPgbcc4dPz\/4fzElLXYe0q91K8e60YObwFU7EMK7n2PUUFRrKnUFi\/FQHGi\/KYCrvmNex5rrV2xtmCfbiAp5wF\/uQf\/8+xJEEp4QDXlTpAiRBhSEjWuzgOMVW5Ru2FWoBljkqJYNTKp8CfMv3epvd+NSsy4IjwnUPTigSL691+4AsxV9k9wOMYAbmC3JJdiiVt0hgpegNYpw7bgW7xjNCfD7GUTxrYT+nNbTysT\/Z9bERUUxa+dMx0LA5MVOVqyqN1ZThIY5L9V4BX1OGT5qcT+cqvY1gSpgabcxsWgrGCawiM8oaAB9+yarPTRbUo92IVuUexID4X0pDGVEDfCiT9ZzgOXKmWKBpM1toPHBH7nGElOMWSHLczYGpZKATjprar8iF60fNxMEXHeCxZMLqA3\/9dQeCG\/yHw6YYcFWMPplxEGYORyxsIt40mSIZuALatqU18I\/Ejdp8nYGT\/foqrWnD875sjSvWSerdn7fKolS1PVGL79yQKX7CKA9eJ6k9UxJ3XsGd9a+2MgiRCNi6byYLGPVmFr1FWgk7FjDVLuc4IUB2R7AgjFeIpk0Ef9Wdil0MwG4wbellh9Xu\/mhVVfSN8Z+GBilVsdwmcQNmBeSI8hBGqUdimHTvvJxj50oVVo\/dhssNm4EsvxpF1gxM4z\/+37ViPVyncRLPnHcM7wBqEj0\/dztEPb0rwcIOLZwHFZKxaWep1aagI3IN3AC8Ab6nD1+uezk0iHmBhyhWFMWLk+h7CTYZmgJ0irAVOOUPoy1zc4KI9xMRjiiiLMNOmBzCzrFwDz05gNyZb\/UYyyD+gOPbselz6GINn\/SDQtyaPvvcLsehlF9JcgUl4p1PY6mI\/ltDYrnA4B5LdR0SyL4YMlph5T5T2XP7BeZXjazAl31UhH2MP5h7fqsrBi\/zvMf9YktgIp2KvfQ4w3XMY53icLPJ3j3ioQ1xUxlA4k8wLUY0l+p4EDs9r2PNZa+2MghjnZszLvlvQ90V5AfNmupfSqludiGRHGHFI1rvEYlRmPbkXc64sdGZ+KMhgMq9VqL6FpwXtOQkbCxt3k1FfiauqLXUzS31IEcoc6\/0qQU2jm0Y5CqwWYQPmRn+7Krdh\/XhXYMSqGqsy7sOCya+B7UC7Qq9kSa+ru8wcY5Pa9qLswZxtp1C8TVQx8tSOOey\/A3yEcCQzmp4Pb\/oGCarwz7tcTBjzhYf1XW4HVgLNCvtV868Mx+xaXI+51c4hvPulmPx6qypfiHxTtpwLFjW6oIwSj+tFeRirYN9Gfv2JaYwYf6ZwZPWyb\/ZRqz0No4GZooMmYYLn7RDDcBWvSblo9pwD8\/0U1tFdsXe6FfhUhL6mi1cPY5gJ35WUvqWrHBGo4HYC74twPJd\/JIogjMUSWHNCPkYPa11oQfmSi7UvCFW+IebtlEZZGAfGijImqmLnDzEz2x5sfQhj33KAK0X1Qaz96HQy1b63pW7msFVpW5Zdz9zG3QpyGmQjyHRsvZkV0rnkhIhkRxhRSKZcQGLZrP4AYQWDO7wWC0GgsR70bcdh96blI0cmPj\/V7mQ8rVaRcaBxoCuZau\/1z8s7\/yci3xEuRNOyBAz07\/csbXB3q5GMrQwE9F1qRKFKBkb9nMH+m+Zi7nMe0ljl7D1MIjm1CKfZg5HrbViv7yYR9nqQbr7AjCprVyPobZvIyCPZaawCuwFIYQTqlECmOc9q6iMvumSyjMaqWvcS7r0KZjS3An2qsDaP52r+Sy6SZTxwpyhPYu0PszD3\/Hzu4Vms\/eFLlW\/3hYr16E\/wP3uwETlZ7B05yjBItgqOeEzHFCazKWxCuh+75uvN4POSLRwx7H24gijuvBjSWPJxqwo7c04QCTGMSPwAqyCHCQVcLPF2XC641w83uuIp49TI\/rWUrvChwKjFz7nS\/MtE3kqW7zl6\/Z9+wtu3KrG170lsfXstmWo71FI3a9j3asuy2SRTbVkRDoG+ripXAH9BCZWu0WIXYaQhBnoVIo9iQcP5M0pLhbNYZesVlE9VCzMHMEwkU232B5HxqtwC8kOUBNbTNR3LqrdhvZi7sAz7kWSqvZ9vE+9oI4twDmuMdHb5P\/uD\/76o3hUBsGG5OpRKQ5OZKAUu1xuBO7CZxWE4VWew4PcI9n6vBbYhuOrQ1fT0xQM438Uq6x9ToVzXi4UM9t6\/psKLwOco3eLhNa3I\/355HoIwGeWHGMEbFdJxB\/2sH4mtVdlcCPZDb7g4\/SAOIv1cjfWMP4XJXYeiksgyoHT4WvTb1T4RHFWmYWvtBC69f2Wx5MYxhkiyl9S7qFKlwu2iPEDhZ2MH78bnAl3ZS0vfKzAyOHkI17RYCBKFhRx5lys6gU+ALaIcWZ17MqsC269\/iF3fMJEBPgd2IPTIt+904Kg8G0uolAJZLC6pcGLEYPij+75ncEBPgxzC1AhhvatjMCf8PuAkOKuTqbbThSDaLXWzeLDBTWcVF3gVI9g\/xp7JonOFiGRHGDFIplwHZDIWCD1OefRhp4GPgNeA7Yic2VzmpNPUAFQAM1B5AngYk5tdxQBZyWLkJc0A2TiO9RnuZIB470qm2s8wQLqzgKciXmvtjFKfaoQywrrlhakqNNUlWFzv9oiwDXgJC+xup3CGP4HseA8W+K4RG010EAuGs81PXzoIbq5NUJNyPYzQhDmmqtDo88+3AVvP2oC0OpCn0mDgQipVWNXih9h9CtNp+DSwU+Gk5rArLEy5SDdxcaiUDHdhDvlLsErcUJMjxzHSuRU44ngXNSubiCWH5jD48xHMJB\/OfOw4MF2U+Zjqo5CmWGnM9G8jcFTBW3\/p56QK62kPw1BpqAjWozSmFjgWXC8KK6m\/HM7NF8dmY3fn8o8eaXTJeFQDCcKZe37htTqBxTpHVcg0ffteC8o4LC4LK5mWCxwgjhOR7HzhZfEchwMILlY8CjNxU435CCwQ+AJxOpMr29ItK4Y\/iWdjbYJkyu0D\/RzkFUxBswDzhCgqZ4hIdoQRBBmDBdM\/wfrkqkp8QFmMdL6BmTcdB6+szc7mrXQFZRTCD0H+HbAUC34uDL5iF\/lvU7ARMEsYIN6B03NAuj8HPhXYN7+hvTcmnm5YNnLGl0UYGWhenvBqUu4RlJeBfoRfYcRlPPmPEdPzfo5iz\/CHQAvCFoSTKBlH8PI0nxpN+e+xgcP7WWA98ALCBhWONS8b+kzm8z58LFaxuIVwq\/pKIK1W+rKZwQ3PFqZccezYrhePB7HRXHcwvEprGpPSvo3yNdC\/5oLq\/8MNrmSVOVh\/ejDybrDPO4YlfPLeV+7\/ZxeEiVgf9jz\/3AoZYB4AVmO9593ZwU3mxmCV+yso\/fiuYOxeh38O24EPsBaJcVgS\/0cUz7TwDLBRhRbgRNPlfCl8eIojMEXt3bqacJMXQYvO1wL9l7jTisVkUyldbCb4Eyt0CKaHEVAsUbgdI6UTCFf2PxG4WyGB0o5IhgLdt5a6BMmU2yGwWe2ZnIrxhqImgMo9AIgQAYAHG9x4VpmBzV68n9K4Cl+Io9hYm7eA\/aCZlroyJ5QxZ5Sq3i7wj5iEZiK5BxKBQ\/SFG+hULPnRjwWEH4A2ABuznnNkfqo9vTnq5Y5QYDTVJbQm5R5Th+fFYwf2PD+EVU4nYZny8wP6gEg7DJDLLuyZPauwTawCuUMsk390bW0is+hlG+e07qm8CHYWex\/K2ZshkPXvxRKFDerwJUJ389MF62Uch5HsyxHKQsERgYqLhIVLG1wyDuJkqWTAjflxBhKNFQydVGWx0Y0vAO8hnEW\/fe89I5tJrD\/9ctVSa1UQzjAEkj1mPJVqFc4ajIgVMrjsAdYjbARO9uuln\/MHbUb2FOBW8jOQCwNB+8eX2Lu+BmhTI7qdKDER2rDn4SHCV6Jk\/GN5B2WXP9ItJ3gecYTrMBVamHPnwdrHdgAHVclezNzOU0QFDw1dsTIYqrG1\/XKj8SJcBFueSZBMtXdj3iPbsHnnYZp3CqZyuk6gCpHOZKqNQsXRLXUJXdDQfhylSWEGtg5dSxG5b0SyI4wIZFWuxOTLiwg\/a5sLerHKT0pEd6vSD1rWi\/rclW4M1ZkCy7FM\/UQKs3jG\/Z9RWFB9DcoDagHnnxH9Yl5jW1\/WUd77+exSX4YI3yH4VZ++mpT7gZgL82Y1UncHproYjZGnwC01+DmKVWYOqPAVylbgEEo3SrdCJuhBzpNcAyBKWoXDDI+4hYl+rIr3EfAGwuvqmCx5MCl8rnik0UUVJ6tMwchsoXuBL4SDBVBXqZlBCX6Q\/cDvXEZPIKZKhXhMwsZxPQTMx4jfmGEeWz9mWvUvwLsIpwDvQjntA\/\/kosrtmBLoOi4ff6XFqqudDCFZIw7TgIUUvoptZmfCW0AbQmbzJRQeS+pdUCpUuBFLfpUq5gx69t\/HjAs3q\/AxcDJuqgdd\/UyCmgY3hnmqnC7g9RoMXQhvAB8IdF1i\/NlFIUKlbzKWIPzK8VlsrNhpLkFe1Qz9ejGVgEdpYrQK7D53Ud4JzvJFRYUnmfRe4FVVZmFJwdGE9z6MBWbqueelsF+zqXamt6ChfY8qr2DJsycxRU1R9uWIZEcoeyQb3AqUO4DHsKCokH1lQ0Eak5SudEQ\/BTIIbK4t7yq2xJjk9+Y9QXiLjGDrytXAr4EKlP9bVL6Oe2QLmaWMECFAU10ijVVk9y5tcJswUjFBlWvV\/jwRI1NnBVy1QCytyhGs57UfQVTQfB20L4Es1j4xZFfoENGJyWPXAGvU4SN8F+xCEGywdKPCKIE71chVMQLuKcBtat4SZx5+wY1l4oxBGQ9MVpgtymNYEuZ6CmPC1Ysla\/6ssFLh5LqLPD+LrJo7VeFnYiQ\/l6A1AxwRIww5k6+alIvfG5vEkqmzKWysdxyTiW8BevzpAheF2jlegXIPwpQczjkM9GHJipeAd9RM2o6Kkr4wEeI\/szf61yxs4poGPlJoRDgq4OVT\/lVLav+A8FUiChwU4SOxtpLB5rofBTZhrQGlmPoimDKpE8F7uNFl9bLCrGnfF7Q8dQ2LX3a7+zO0gozD1qr7CU827mHV5TRIKIWqTbUz+5ONez5W5XlRvR6TwhelpSEi2RHKFnNXtiGxmKMwS9AnsOCo1DLxNOYe2+iIrt9UmxgRxhrJVHsM6wVcjG3KYcu5LLiCn4IcAf3PCKdayjwREWHkY01ton9pg3sYOCxCO4J4Mfqbn0p4S8z0z3EE8RQPRZsHpI8F2eBrUm5ALo5iY8bKwQEwmMN7BHgbWAV86DkcXLcsUVAfiSUpF0\/PjRa6geLFGVXAYlG6gPeyMeKiXAlcrXYc9\/rHVFmgY+rFxlfVo\/zBE05daPw197cuVeMRUSYiPCZWRcllfrAH9KvSj5LJ1Ym\/xp7vuHlu8HNM0VEomXgwt3s7sNqBQ2tqL95W8OiLLunsuXtyI5ZYKHZlMzAw\/ARYibAGkzv3Nl\/Q97yk3kWFOMp1mGLuZsIliFngAMKzwN58\/Q9qUq6DPcv3EL5U3MaLCYdFyFyMtNakXGTA0+IPQFatfWc6xe3P7gP6Rcg6gkYEe2jIZBVUzqjqKhFxgP+IKZLCINpp7BnxWurC2ypNbcpWFXlBVKdjKpDQ16SIZEcoW4ggot4kkBqsb64Y83AHQxbbRNYAb2yqTZwu8fHkg2pMBfBDLDNZDDhYRfsnwHY8WUMk4YpQBJxnUPaNcXr+WKdiPIOBPLUFkwdfUaJLoRgZPIiZub2IEf+jQPe6ApibfesLjb5U+v2ic4p4rjGM0P03mKz1LLYGTRZLzhYysdgDfAw0qpJqXp44duFfePBZl\/goBBgvylygFqvq54Isvkxcc3RIXvicT7CtCrsCq2RPLOA5B3PI3wQ+XVObuKRKQy3L5Kj1nd+LkdZiIou1j6wCUgitQJcK2YspDVTOzS5PYgmBME36PMypu0mU5piTu9rl4QY3OLkKlNlY8ijsedRdwBdq1\/Oi64WvCNClKbdHhY8U2lFWYc\/hw1hCoBh92p1iaqU057WMRMgPG82sVpMp9wwW707CknW3UPjnzYPcHPWHg9baGTqvYU+nqL6B6lWI\/D3WthPqcxmR7AhliWS9iziMUpW7gGVYNSjszWQwBO61WwReE9Fdpb5GeWIc1rtVrM0uQByYAfKImkT1eKkvRIQIYaKpLsGilKtiAd\/H2Giexyh+JS\/NgHvyRpRmVXbhkBbINg1xLFcOEGAUyrUI04p8zmBrzhWEN36mG7umKeAtUQ5c7C85McBjlAg3Y4nG+8it1SkwbjoOdDYtzy0REqvAQbkK+AnCU5hsvlBrfQabIrEWkwOfGOwve3bE1QJz1EjrhAIdRy7IYuP3GoB6YEdTbaLvUn956UoXtb7xmZjny0zCrWL3YiZ5ryscXL0sd5NBP4HlCFyhVsUO2+sgkIC3o3Rfbn73GltTsjUN7klgA5Zo7MFa1KaFfKxgibVj\/ndGBHuYaKlL6IJG96R68qbv0P2XWKtNofayLHa\/vqII49Zaa2dost49gfAydj6\/JOT+7IhkRyg7JFPtAHFVTQBPYZt0KefNBlLLz4DXge2bBtm0yxTjsU2u2NfRwQKBW3Dkh\/Ma9qxvrZ0RbX4RvtNYV5fQRSm3F9gh1gs6DZPuhp0ozGIVxxOYO+wa\/\/dXCJ39YoHn5vAINljAMhoLYkrV3hNG0BSoE7YDz2GE80DTim+TYF+2PQqr5P8Mq+blo2bIAGdVLh94LjKpbhyYhrAM+HeYTLdQgbBiyoAtCO8A7U21g7cYeL6CAKti\/5Di9eZmABe7Py94Wdr6uwa\/hp6DYBX\/wPU9TPl10G62FuEDhLziCN\/roAK4FkvehJ246\/OPdw95OJ8Dqg4donyAUoElWR4l3GubxdphTkoO702E3DB+jOed6YwdEeVttQTUT7DKdiHe6T5gD8iXoMXyL8nYd+prIAlMJRuaujMi2RHKCsmUC2gM5AqQh7ERK2E6G+aCDGZu86bARhE9WerrNARMwoyBSmEaVwlcLaqz1NP3KII0KB8senE3Gc8RRQQQRRy\/ZKBYJl9b6mZGiYEIeWFdXcJb9IJ7XBzWIIzFsuZBu0ah17MsRoT2AB+LEcDtmLFbhyjZC2c2hwjB5LZTCFd2W0xkMYO8jdjUhM3Asaa6b3tyLFzpglCJMhNTMDyOVX\/yqSpngG65zOiuRa+4SJoKsV7inwK\/wRRLhXy+eoBPUN5E+VzjZpJ3KdQ0uKhHlZij+DzM1KgY+3dQbW8A\/hRz2NNUd3kVgMaISZabsWC7kMmJb30Vpk7YqDaZ5GhzHlVs\/wMES5TPxJ6psK9rD7amHCWPSmOTVbx1cYPbifCxmHR8NpZoDOv69gEHFU4q6JqoH7sgeOux2Sx9va2vt9f5CuVNfxTWPArj9XAK+ETRXZdb6wqFluUJkim3B1OTvIG9Rz8kJD4ckewIZQUxkjMWmIsZZ1xDaQm2Ys6kazBH1QOeSmg9nQ81tomnxFTFUSXbsrxgpkQTsCxyKST3DhYYTCLGBMqIZM9tbJO0J9WoTESYrEgwagasj\/VrYE8y1R6M0fnGT0s0\/zvCIFj3TMKrSbkHgNewIPBJ4E5MylzF0Ne24BnMYIH7p8AHCNtQ3hfliDpkEby1hXFLzxkioEoVwgQKO5u5VAhk92uAeoXtCB3Nl6jmVsSIe9br9wTwNFbNznfd7ceSJl0X+x\/9Sjmapgpbr36C9b\/eRGH3yyxWGX4dh40qnMphhrqIMBVToP2A4iRaMtg+\/bLAc6rsXZ2D30BNyoUsV2Iy8XsI16+kB+tp3wjs8sivig3AQO\/4jRRHfn0G2K1wAsnfy6K5NqFLUu4pNRXgDuxZnRjSsXYCu4CjWY28XwqJNU\/OYtHL7tl0WlqxZMk1mB\/AcNpR+rH4qhXVfV6RSLZBFUuargeZjSWErwnjmyKSHaG8IFKFcgMWoNxB6Z\/RDmCTWMbra4H+zQUiVg81tpFViYGKqowDuT7jBfNM1QM6k\/Vuh9gxnEa0d3PdrLw3j3kNe1BArDpbioSFgz9DW1RKPX6NZKot+GMcT6b5vW0PoSwAnYY9c5X+tcpi138vtoHvPO\/34WSqPZgJev6PRuQ7QoCmunNE+3XsOXoIGyFyC6YwybWyoxjh68IChMOYz8FWgV0K+xRONNcl8pF1FhyOoJ5FMRV5nFu5IgPsxiT\/LwFfAt393sX7PRe97IqX5jqM9NZhZpP5uisH604X0Lsg5bLp2\/J+AapEuQmrYP8cMxcrdBL1BPAOyrsoR3EuT17E5iXPVutBn0ZxPEDOYOqC1xTa4vHLB+w1jS7iUQXcozZ1Y0qIx6rYLPUmYLvA6fW1+VWxfQiWoJuNkdUw9\/Og8t4mSgdDJK7xGNl0lkOYyqATSxKEcdxnsKr72eahXdsIg2DdUwl98EX3kJeVN9WSPFcydNl40NaxBvhQkLO9nemi3bOWulkkU21ZYC\/oKyBXYwnwSYX+rlITmAgRzuGB513xkKsEXYjJUQrV9zFUZICPgFfVDIy6HJ+pDhfJelcyWcYjTAfnDizrPwurNsdBKhDSwGE1QvcRyKfJVPs+0O6Wutw3kRie4yHHscpImuJXs8X\/zjTlMze4AuRmkJ9iiokLKy7nP3dTMEnRA\/7xZ\/zfJ7A2gvOJ907gVDLVnkYkC3gtteUwwSlCKeHLig8tqnePOQ4fi\/KuWhLxFkz6eQ0WtEzGEjxprPKVxoLdoN9wJxactGFy8HaEbiAdE7KryyC4FEFRFPNiKOb4nkKjF\/hIhQbgNVH2AGkBNl9ipJaTZibmIr4cu7dD9cAw2zTIxi9wSV5k45vGYcnBpzD3+gSFv9ZdQBNCgzrsBtLNOUhwPTPmmoMRwWK0eqWx9+Ed4DNR+lblMO9dBQdhGsoSwklQXHgtP0LYDOxHh9wzHMPk97MJXyHQj6m5DpFfP\/Y38O7TCa2pdzsRTmEqtiyF5x7B+nhwOMcaYXCoJx7wJar\/hIiHxU5TyO9+9mN9\/i8L+iawV0QyH\/7NjUU9l5a6WdS8tLu3LxP7RM3D4UpgIQV+ryKSHaFs4MQYJ6r3AY9QWAfDoWIfJj\/bLKKnRdTzRxsMC\/PqXQfr\/UqCPI5Vtq7AgutKBrLpHhZoz8MCqQ+xatimZGr32Za62bl+pYpyWO18erDAr9jJizTmIllSqfi8hj2o51UAN4vIbzBTomsZfC0MkgQXBmFTMclUDQMJhF4sIfMOaLOots9vcHsA3Vxk2W6E8sO65Ua2gUM1KXcbFqAEQfPVGHmqZuBZ68dG0uxRq9IcB44hnFboFyOzwWiyssCqZQmtSbmd\/jkUc5JBIaD4pmPAGhVWYhXSE5fq7\/Wl24KSwPru67BKz3BIbzWWcBnv2NqU9r+rUi0YvA8j8g9hLuKFjuV6MFf8P2LEtb8px\/VLLEi9B3uui5HQPYPtjR\/4f84p0SRZxmHXcS7hJvQVU0O8oyaZ7mnOI0l+ARwGknJhX9tuTM57SITMcNYYx6HHUzr8axHGdQ6k4geISHZo2FQ7k+TKtowinwv6vyLShhHtm7G9q4JL39\/AOPJjrH3qDYV2gb6Y45UkOdz089nMq9\/VLVLxHvAKFpffSgG9iyKSHaEs8KvWr2nbJ7cCP8J6FsdSuip2sBi8BbwNHFaVrCMFWweuReQpTOJ3J5cew+FgAcsYbFP9gf19Sak6r86rd\/cqZLYsv+zmp1jQ+LF\/fSdS\/ARGLyYX6y3y957D\/c+1gWocca4HngF9GruuQyUCDhZIXxhMXwncgHIzyEso7yMaBBgRIgDQVJfoBvYs+Dd3b9VotquiXoaMU2H+CSrEgQ6E0yhZFAfINA09QC8mejDCE1TiS6lIyhUeFqy7KryGzRTfCfReSn66KOWKQkxgFsLfYkm7mQyfAI0F7hNTUh1ZYpXAKxRmiZHCn2D7QaHnf4P1Cn8OPAtsxaO76fJ7DABLUq7jGyPdSvH28P0YwT4sSnZtDsda0+CKKNf6MvHZhEtYz2LjrNahnNAh9DYD1NS7qDJKhBnYHh52AuuswF4RzjgyvL0rraRjxjfGh3TcZ7CEwFGK2tv7\/UPLilkA2Xkr3a8FfRaRnZhp4D3Yu1+FxZfBux8YyO7E2iU2qshWrOXJQ5X1BSheDRWty28kmWo7A7IW5AYs8X01BXpOI5IdoSzg7o9dgUk1klhVt5QVkD5s037ZEXVjoplCLQILGt0xnidPAr\/CgqR85IRjMcnyFBGpQvV5gf3JetdrGSSw2FSbYEHK7VbkfeATrMJQbJLdhfWjlizL7MRFgImCLsYkncMh2IOhGpNLXqV2rf8JaEk2uH0tUTU7wgXY9FcJ5ZsmSKf8nwsxYoJHtQB9F8MzdysmArnpNhVewTw4TgHZ5ku8s4sbXEEZi6lZ\/g6Tbk+lMGtKHLhN4R+B2xCOYdXWm7A2g6mEs4b3Y1XX54HVKGcczZ1gqVIlwq1qxm\/Faktygc8EzuRhzjVe4W5MJTaZ8OKNNGZ29jKwPwvZodJVMdOzadgzMIbw36tjCntV6fKGmSCODbQ8hNWP3Y6Zq52CyPSsGBAhg8gB0NeB91S4WTymA1cjchXWKlIFdIG2gHwloodU9bgo\/S11pSPWF6KlbpYmU+4+vz\/7RmzkYkHesYhkRygpFjS4KMRU5UHM7GwGpX0us1hm\/FXQDzbVFsZEaF6Di6g4nsdcYBmW6R9Kv55glZK64DjjMe0Y7B\/c92wbmSxZx9E2RF71v\/vmol1RC9xcYF9L3cySbID+7PWYit6EyqPYcxZmIsfBguIfA4pyDKsOjYQqZIQIQ8Zik097CjvFfCDCdGweLhSTxX4KrFNhNbAV6LokuW50AWLicSU2V\/lvsRanQrfhVAK3YST+LLYvTiC8\/TGDVQNfQHnVE46sW355h+4AS+y+T1AbhzOxwNfiUshiz9mBmEN61WV6xh\/6s4sTw0H5ATZebRbhXc8sZk74rsbY0vx0Ysizm5c0+M8c3KpmDBu2gaiHxRduP\/RtGkZy2G+nGIe1NYSxFnhYfLFboGftyFD6jHicV9hJY8We\/eDPnFedCDiqnAE5IxZpeTHR7Iba8iHXAWx0MGksUdOAxdi3U4BEZkSyI5QUijiYacuPGDrxLBSymHHGm8Bq0NOF+NBkqh1F4yo6S1R+jWXQh3OeDjAbkcdBP\/dUPmGQKte2v5jF\/a8cRDLpTlQ3idKAVV6mFeGaZoB9KrJaVM8W4fsuBQHGiMp92PUv1toXA5aAHAL9H7C+9AgRvrtwQBQP5WtsXFEd5VfNDtQDx4BmrHL9PnCguTZxydFKNfUueMQxFcxSrC96AeHuW9Uhfz5YgGmjuqw3ce+6HGZMnw+1NXU61o9erCkSp4EdCic0hwpmrBIRU8rNwxIk40I6rqBFa4sKbzU\/negZ6gctXunieYgIV4r5fxRjdFfQ3nV20zBI67w\/uKgSE+FKTH0RBk4B2wQOiIwctc93DT7pVi5QYvkElnKeuNJSl\/CnzjhdwCYssRn4pQwLI82UJMJ3BHNfaGPuyjbxlImqLMak4mFJiXKBh23YW4E3QXe31M0adkbUFhiNi8rVovI0VvG4VA92rhAsI3wHyF0KY84bS3VRvPez6cQyfVlHvX2CvgD8C+bImiG86moWM2pa6+CtaqmbWeoM8yRMoj+V4j1ngo0vmwvy4APPtZXazC9ChFDRvCyBeHiiHAfWY+St1O9+AMUIxD6MXP9PwP8MrALaByPYQDCneBxG0n6B7VulTAwXAhnMVO8VIOUIO4fofl2JBaXTKU4S0x\/Bw16gd3UOzueOyVdvwfraCyXtvxj6sB7Ud1X5fKgfUpNycRzEESYCNQqPMvz44XJQrMf5AOatMGRUjwaxa34N4cwh7sfaUj5X6Bxu73iEwqOlLkFLGRlzXvo4ZwEZD2sbegvrH+8Y1ocSVbIjlAiOIwH5+AE2n+5GSusm3oPJeV8X0Q9Uh2\/QlUy1IUhMLXP+ECYdLhTBi2OZtttUpQkub6y1acUcgPT8VPsu4A\/YJvpjrMfvSgZmQxcCHjbiahPQiMreAn3uUCHYfSiW4+35iGP3\/X6nMrYVu+4RInxnIYrnOZwGtmAEdhn2\/pV6JOMxzExsPbAG4UtV+gSyORrKCZasuw3zXShWxTYsnNceRSPwxZqht0hVY1XWsEkgDMj8d2GS7MsmBWrMpG4i5ih+G+GNwAr6+9cBm50hTNTwJdYAMR0YLfSXWK972Nc2gz0T7QyTZDuCo8I4NXO56QU+Tg8zz9quwl5RMpdrF4gQYTC01N1AMvVVP1R9BbyEycYfYBiTIiKSHaHo8KuuFSAzsMzsvZSWYGcw4tMMbIk5nNqQw5zNy0NELeC4G3MSv4vCZs7HYL3FU8HZTw6BxrnzVd2rIq9gfUzzscz+HM7N6SaO3ZO4f8z5bOzBmKKNQEpE33NKb0YiWLByJcV\/1oK5trNEdcYDz7cd2vqLWaW+HhfF\/IZ2FEQREVUtA\/VBhBGINSsS1KTcwETrDSzJtIjiuCKfj2DG+BlsusIaoAUbpXRShawqNOdYaVGrZI8WZRIjewY4DPTdvoQZnX3RVDd0WTOmrppK+PObg2M\/AXwJnMklQSJQqbbHLSA87xfFHOo\/AtYj7CVPFccjL7hkFVGhCgvylwA\/ZZjBfh5IY\/v3Ab5pyDiUixEUGWZiyalCH2c78J54HMnVAT9ChMHQUncTydRXnVDViiUer8Lk40OKGyOSHaEEcGLYwjsX6zG6qoQHo5hMfDPwjqB7R1frsAnQ3MY28KQaq9A\/gmXPCy0rrMJI8WjyILGb62Yy94XdGYnHD4vqMYwMx7Hg6DosEDn\/Z7r\/XRcj38E1DMY09GLmOauw8WcfeRk9u\/mZkptdCBYATqQ0bTIV\/ndPceJSxTArBIXEvAaXGIiqVGGBUCCjPJZMtQdurd\/4ich3hFwgSqfCNoQx2DOVxBJdYb+DQaXzCPAVJv1bD7iinBElvWZF\/kG5I3iq9PufHbTalFu\/eS7IAnsF6hWeU\/jaG\/54xXHY2jG6CNekH5O478BI7aBYknIDJVMSG5sZFln1sMTSKoVPEXqb86yuZmM4avv67diotoexIL9YBoIZrM3rFLkn7i8Ktes8AzNanVjAY\/SwxNnnwOe9XfmrBSJEuBSMaLvHQFZjKoxnMOVo3utaRLIjFBV3\/2FXMOZjDmYcczOl9QZIA5+oyFvAl\/E4ve88PvyMqKjEMcK61P8ptFQKbKNRgZjjeA55EO0tz8wGCxAz\/g\/JVHsnJqf8GCPSjv97MubCOgdLGgTkezIWrHVivSun\/X+7HvhUhYPqxHq2lJiQzWvYA6pCODNlc0Xc\/\/7xglRTJiQ7aXNtR6nKLIV5KD8ErhX0Guz+BvNHd2E9hruA9mSqvYOLk+9Sn1KEMkGTVYe9xSvd447QrFYVO4tVtMPo2\/UYINc7sWrie0ArQjtKN+Q2R\/lSEPv8E2p9wKcJb5RWWFCMoO4F\/qjC83jsF0ivH34lcAIWiI4qwnl0Yvf4a+cya+nSlTZfWi3mmI89e2ElAU5iLVKbgWPq5b4nz1\/pUulQoXYNgykkD2JFiGK2OGWw5NQZhjk2UIQxvnqg0EmC4Bn+SIVDLb+JHMUjFBqeQqwdM0KejRUE836GI5IdoagYNTYeA70W5EHgfmxjLhUUy4a\/iqctQEfPsDuxYV59m4gyEcua\/wgjqGEEYln\/JKqyWalkmFlnvzqZ5YKN1SdU+7HAISDeMeBqzBl+okI3qu0isl\/QLiAtnpfdXDszhNPODw4eKg4KnaLaQ2kqTxX+T1mYTfqOnxXA1aIsUgvobsOI9Wjs\/gr2LPwQS0Zl\/N\/BzPPzifdO4FAy1d5H8AyJeIAnKOXwHEQoDZpXJDzg2JIGd7WCi\/IhsBh73qZhpGyo72RAGrswUrAbU+ZsB3apcjCbpnvDrwoThK9ZlmBJyj0j8LHad11PceTRhYCHkdMdWPX6VeBg8\/JEoRyZx2LVymL0qZ\/G78fOZgYngtkYMVGmYfvxD0I8PsWq182YSqC\/OY\/RV5VxKsQjgSnfnsbay8ZR3D3Dw96lw0B3jj4FF8XSla54plq5DTM9K2SioAOrYn+MPQsRIoQArw\/kA5C3sbX+VvLkzRHJjlBkSDVwD5YVuobSko4ehNUgaxA9ipLd9szMYX1gMuUSc6jMevIANvf7h4TnPpvGNptOQux59sn3uYq3nWc7\/nd\/jQXInoInqooIm8uoomnRuyLgqm3IWYq\/9gkmx+zA7lvJcNc\/70RVKkSYDVoL8heYpK+Cb5OdIKFyfnVKMQO5+xgg3mmsiuMCXwAfoPqB35PYS\/m4S0coEdbWJrqBT2oa3DaULRjpmYsRn2vJTWkSJALB1r0D2JSENmAbyjaE4wjdKH3Nywtf4Vpbl8jUNLifo3yAmUZW53DcpUYWUyltBV4EVjvK0YwUdN+I+dciSNCFhTQD972j+ReXvscP\/dlFlCqskpokvDFSYEmeJmwU3FnyWPMWN7pV4nEHZkT6Y8wBvRiKgAsRyLCPYcmroX+QQxWmVPwBhTXDy2I94+8j7CI2fJPaCBEuREvdbJIp128n1VUgN2Lrx1Xk8SxHJDtC0ZBMuQ626C4hXPKZC\/qBD1BeFVE3JprZmEfWeRBI1uMGrJdqLuGOJevFNsPTDFPWlS98WXAgEy5rbKpNkEy1Z7HAbBfW6xbWfNTBUJDgZbgYNamqQlRnAE+D\/BpTI+SjtBAGKvPnYyoWzD6IKR\/Wo6wEPl7Q4HYIeAV6xyKMbHSq8KEo7VhryU3YOzkHe4bGY+9n8FOBrXWnMGLdiSmQPsCMr\/aJ0A6c8JQsAgiaTxUxXzhZTnnCKoQH\/WMuZxO0wEF8NfAy0AqcXlvABMSSBlf8iRwByQ4T3Vgybx+X6SMXQVAmINxBuDFHFvgE2IRyDMjmknZZ3OgKMEY8HgGewuTs11A61\/p+jMAeZhjJYN8dfSI2VWU2ha9ifwh8hHK6+eeRVDxCOPDnZ2fB2YeZoN1AnrLxiGRHKAqS9S7qyShxWIJllCdR2pnYhzBX1Q9U6S1U8O84EvM8fozJIcPu1zsDuKieoMgke6Qh7nhe1pOTimzGxqEERkzFxAngKMOU9Q8H9\/zpa0R1EvZ8LsNcXwv1jDpYcFiJVWJuwOYJ\/2dP5TVEj81rcLOtEdH+XqPJ7n8fFsgffrjR\/TTr8Q5WIbgG65mdjklN4xiRSmPk+jiwR2CHQo8IvUDv2triBtqekEX4FCOtN\/rHW27VbA\/rV96twiuivIXNbO5qKnCF33ddP4kWhWSfwpIrlx3dFaskDsxBeQB7vsK6R13AeoUvEfpEoekyhmeLG9wKlKmiPINNH7kFSzCV8jnqwtRph2SIJHthykVtD7hZzI9mMoWN9cysVfiKEiesI3z30VI3i2Rqdx\/EPgVSWFyT88jhiGRHKBZERO8EeRwL7Ev57J0E1gJvg3eSAklZFzS4iOhEkMew\/o0wzUo8rC\/2Y0f0GCOgolxKbFg2i+TKtg4c2QxswAhmMXspg9mjRylhQqSyOlaFcjPW9\/cDwnsPBQu07lT4f4JmUV4UOJNMudqS48ikCN99rF6W6AdO1tS7ljS0dbMSwRGHfvWIA1Uo\/ShngX4ce8DWlihh07Q8weJGtxPlNeBWUX6Jyd3LxWk8WG8+UaEe2KTCYSS\/PuFcoWbA2YcRxLBJ4jHgS5STXGbfU6gS5Q6sLzgstUGgFNjqwfGsopsGWd8Wm9P5ZFHmAH8F\/Ayr+l6sXafY6Ab2o5zUIexTfgXbwbwWHsfUKYVMuvRjhoZbPOUEUdwToQhoqZvN3JVtnY4jm0DewQpok3P5txHJjhA6zGRJJgK\/xgL7UvQaBegBPkF4WdE9rbWFmVe8oMEFqPQ8bsfkt2HKvRRz\/9wO7O7q8Po\/\/JsbQr5sIx9ePO6J6h5RfRlL9MylODJPD3BV5GNR7SiVA3cy1S7ouTE2d1M8x9rrQP4S9CCwpqUuUdKe9AjliSYz4MpyngR4aaOLOGY4VnZQU0SJ8ntsT\/spRpZKSZQUk9N+BLzl\/+wGeptrE6EQkpqUC94534aDWEU2rGuQBvaI4IrQt+YSCYOHG12yioOpIR4gPEfxYATo+0Db+rpvm8j5xBOxbx+lRq5rsOdlHhYrlJpcg+1Tfdjzk8l37rR\/noK1eDyAkexCcgyb6668iLBnXV3BDPsiRLgsHAcPOAj6CshsrO31srLxcpM3RfiOIZnaA8hY7IFcSmmDkDQWcKxR5BMVLaRhhgCjUbkWI25hnmM3sAWrxh+KCHZu2LLsekS1Fxvr82csMOohXFMuD1NONAn6fkvdzJJJxbGA5ypsTuzVRfzeCuAWkB+DXH3X73aW8BJEGElYsyxRngQbaK5NIEoaky7\/EXgDU6qUorqm2P62C\/gD8L8Af8KcxLvDItgXoB8zIwtzjQvkzAdELv096oFAlZgHzC2EN2M6i7UBfeFX1r+BxS+6qIOjQpUq01V5Cvjvgf+AjbILO1bIBx5273pFhrwnVmGFlB9jvdiFgmL3fosqzepFc7EjFBctdbMA7Qc+A30ZM3i9bMEgqmRHCA1zX3BR1UoRbsSytldTupmiHtbPtxFYpR6HtiyfVUhyJQpjNZz5r+ejBzP9eNF+e50hftd3EJ4nyDFglSIKLAfuJZzkj4e5zG4DXnXQfSU++YBkz6C4apJgRvkdwF1V4ysPUsK+9AgRCghVf00W+DeMaD5K8Xq0g77rw1jy8FWF7QoHFPrWD2MEU65oqkuwOOV6Ysnf4\/7xhKHkUqwfuw3lDIMkR9UW90C1E\/a9EOw+SM1Kl6YVCRY3uKDEyDJahKlqpms\/wirXsyiN8eblEIx4OzMUqbgjxFW5Rq2YMp\/CPgN9wGdACuF48\/KiJI0iRLgQinkhbcZ6s6dikzEuGTtGJDtCaHAc4qDTQBZh0txSuon3YIv0BqBdPS28ZFVFCDczncGy+CkRmkBPbq4taKLgO4+Wulksfml3pj8bO6DKq0A7Io+Jag1wHUY+41gyKM7Q72UWCwg\/AFYKvLepNlFqk5YKbFO4YhjnNZzvvhq4XRzZipGCskSyoR2Almi2d4TLoKkuwaKU6zmWTHsPq7YdBx7DKnmjCU+m3In1sH8ErMLc\/E+qR29\/D17Lb4qnABA7nh5sgsMBzMCr0Ofdj\/U+H1g7iFS4xoy3HGytC8zEwlrvYliC9laEmxC6Fje4\/aJMxHxZbkG5T2AB9jxUU75xd7BnnSBP07NFKVc8mIQwHy34eNYMphDZoMIWp7Bj5yJEyBlmgtaWAdkPNGNeD5MZxN+nXF\/2CCMcDzW0SUZlLCZNXYwF2KWSRWUxk7AmYKuqnt76TGEDkKwnnt9zFcxD1gKfr4cRk9dVeUXgSMzRaLMZApp\/PhsgO7fePSEi61DdAvxnTFp4E2bWMgfr257AN0l3HAseBru3fVig2Qq8hOp6cThV6vPGiO40\/5yKDQer3lwjqlfe+6evj2z\/9Q1llSBaYGOIYqjGVCSYBQ8Do+o8QEvVUx+hPLHOTK4U6Fy60t2ugqvCZqwn9T4seTeB4ffeZjHC0QV8ha0v7wHvi7JPhT4E1hV4b8sRAenfg619N1DYSmagCtqF9X1fDnGsYjyHcH03BCPZD\/r\/\/52ixPzvnuH\/vh5LtpR7e2YWSxCdIg+l0cONLhmPsSj3AE9gcvFCXfOgcrgFYRVwslRmhxEiQEC023tU5AtRXYclz27iEirdiGRHCAUZnApsc5mPzUANqycqF5wGWrDM06HW5YU3zBBRgH6Q41gP7jQKR7I9\/xzWqMhL6nkHN0dyqWFji42xySZT7V1YRWgvsAZbLGPYM3stA6Q7+JnOQEUiht1nhwFDuk+w522dinwmqp2bShwYzGvYA6pxLOtaihmswWzt8cCkiupYBWU0fiXZ4FapylTgWhWu9x3YpzFQLdzl\/xz3Z66fT7y9lrqZZZUwiFAarFmRyAJHa1LuKqxn7x5sD7wPC8Qm5fAxesGfe7D1\/yjmKbIZ85PYK3B0bV2ip9Tn3VSXoCbl9mEE2AXuwkzHCgUPI1v7\/d+DQbDK0vWEW8UOUIGZnSaAv8DuVwZTRZWDY3iuCCrGp8lDLq5KpZgc\/ufYs17I8ay92Lq7RuCzwfrwI0QoFlrqZuq8hj2HVWStqN6IrXVTuMhzH5HsCGFhEtbrOpdLPHxFQgbYifA26A6EvjC+xIbWt58C2rGN6gYK1\/faDXwMvIynO7asiFw1Cwm\/MhkQpnNIptqDubyfYiQ6IN+TsIBqDnafp2HyujagTewZcBU90Vo7syyctAVQEU9Us5SO3I7CerOrRKVU3gznkPRdf4FJqNyn5vg71yfYYxggO0EFMY2pSQLCvdP\/7SZT7We5gHhj5LvUpxmhBGiqS\/Q93OC2ecpRtbV7NrZWzMTI39VYBXSS\/1uxdb4He96C\/38\/1iLUrmau9SlwTIQ0kFlbhJ7rPBAoxj7HyNZEChdjBu\/ebrWK9mAQ7LreTOFnNF8OZoA68qAMyMW7ydG8r6bRddRjJqbaWIhJ9Au1tnuYKqIZaFHlZGzohmwRIhQUrbUzsvMa9uxQkVdFdRamZvlWS2xEsiMUHMmUW4lyI7bR3kTperE9jPC+o8gWkI7WZTNC+zJVTSPSJhZ4\/5DC9GdngH3AO8AHct54mwjhwq9OBmOFziGZau9gQA4ezIX1FGKCKtCHkG2pLZ8A2BFPVKVfLVDtoDSJr0qM4PdQ4vmmDzzXhiqOCFNAnsaqMHdjst7BZJ1Bn2dAutP++ezlm8T7S2B\/sqG9W4SsoLqpTF2yI4SD1ebofdb\/+RKgJuVOxGTE12EEcDyWeKrE1pl+oF\/gpFpF+ATQrcophS5xbC1SzN28nNBUl+DBZ91TFVVsw1rErqdws8PTmErokOhl90DBKksJSjsudCQhuEedQLqpLsdny2OawpOYse1MCjsW8hSmCFuNtSFkV0draIQyQmvtjHQytWcTFhMESdRvxA8RyY5QUNz33G5ArsQI9r0UVjqUD86NfADeEtWjYVeVWpcndF7Dnj0KW0T1biyAGu4mfxbYDroWOKrhjpuKkAN88p3hgr61eal2FKEcq5ebliU0mWrvw6rtJ7AAuFhzsgM4\/nefpsQk26mIxVGdAvwC+DVW9cpFRh+oGc6HYi0E9zJAvE+pyHsCr6pqC8iRBQ1uJi6q65bNKuWpRyghmuoSp5em3A5VdqjN2c7iEMf8CioFeh2hy3HIpLPnWlC0Oc+ZxaXCxr9IaE3K\/QJLQN6GVXULUdnsxhJZh5HLKnECkn0l5d8HfTl0+OcwivAns3RhrW6Dqq9qUi6qCJYkegJ4BlN1FboH\/zNgFcLnQHdTGSWtI0QIIKLdqryDtcUGyqRznCci2REKDQdbcBdhmeRiB\/IBMlgl4FXQr8jTLXMY6AaaVeQmUZ2GBd9D3RwVaAfd6J9LWjXaZ8oVrWVIrs+HI9rvqbhYr+hNFKdf8UIcIM+ev0LjgefbBHSyCI8DvyR3gn0pBP3mFQyodq4Q1WswE6CXgJdV2NWv0je3sU23RET7e4s15ox9\/vOfgYsaI45U340zwLtYH\/pVWOvFcNeZTuBrEY5KbmvHOEo3LrQQ6MNmnH+Imafdialswlyve8TiJO\/hRpeLVY3n\/d4NFEATsFF1f40lUwrt87EHU+9tAU4SOYpHGAQ1L+2mL+uMUhXHQ2MOEhi8prG19RjQG4Z3yubamd78hvY2VRqxWOJuznsfIpIdoaCIVzqTUR7GZuIWSiqWLxTLyG4A1mIbdFHQWjtD5zXs2Y8F1tdjszGHWs0\/i+8gq0oHoFtWRMF5hKFBRD2UAyAbgfux97OYgWgaC546KKEiw4nLKDHy+zRwK+EZwVVjbSMTFMai\/A6hTbR0CYYIEcJGU11Ca1LuTqABS7TfwfBjzS6Bg2LV1ssRLsHWtpFkOhbA2o3gTaAeazN4CpOihp0U7Qb6RcheanUeNYEYHhOx\/uu\/5wJCUSD0YkmaN1H2o2SaRoiSI0Lx8eCLbmVvhutBbgB+4CA3YjF3NdZ+cwJrNWlPptp3KuxW9DiQ3pJrW8RlIKau2abK29iaNxX\/XY1IdoRhI5lq8\/8kcVRuAWoprdlZHyaxfgXlSMvyosuMssBnCr8TIzE\/JX\/ZeAfWi\/Q6yNety8vDQCvCyEU2KwCdCC1YZWQaubkdFwK+KoOvge5SuXEnU+3in\/dDDPgmhIkY1oP7DHAC1d+KVfIjRPhOYnGDi0Ivyjoxg7fJWK\/iUOMBD6tEtQO9awbpRV9iZoZxYLTauz2S5OJZ\/zzfBf5JYRdKvwgHCf9cPEAVHBRdcwH5WNxw7rpOE6EG+HeYg3yh1880ZnT2b8BXKP1NKyKCHeHbSNa7IFKZ8WSRoE9gLao3Ysk1D0v+xPF9X4FDwMcCmwRpBvlkXn17V+vymcM+Fs9TBU6BvIkpO36MH\/OPpAUoQtnCASQGXAP6MyyTU6oETgbrO31XVT6iBLLU1toZaCbTg2oL8P8D\/mfMDCnD4BU8xTJvh4F6VH+H6jbP87qLfQ4RvntoWZ5AHcdTYR\/wKrCO4hjpBcqSVSrikscM1hBQiTk934dlm4sBn9jLL0AeJEpuR\/gOo7k2gXioKCeB14E\/YJWkoSbWejF39TYus3aogioVqvQzcuT2gX\/MR8D\/qfD\/UhsD2SmCYGtn2GuGYoS5igvUTTUpV0QZg5GH5cA\/YqPpCmkqp9h9\/hT4o38tIoId4VuYW9\/O\/X\/ajapWo\/qkqP5HrO3rLkztUY21qJyvZDk\/uf43wH8EfZiCTQJQgAzobuAVzAAViDb7CMPEvHoXVXVEZAIwD6valuq5UqxKtB5oFdGzLSUacbLlmdkkU239oDtADoNsxyRWd2I9VldgC0JgonUK20x3A2+huhGT1nZuWTErasSOUBC01s7QZMrtEnsef+c\/WDVYD2MYSVfFVBnbgNdj4h0r8czwUVhleQbhV7HPh5+ElCdV+QibGBAhwncSTcsTLFnpZtSe85UiZNT6d2eRX3wQrB8HgM41l1k7REEtrO6ldH4w+ZxbBquwtQKvePDuurrEKfCrx2YwlsZIeJiqI8f\/\/GsVJixucHsdS1HE1Zzw54qyGCMpMylsjBcQ7J3A86KsWrs8Ecqo1QgjG3f\/bjco4lTFqhHuA\/4BSGKk+nJw\/L+XwLwirhN0arLebQRODUfx2lI3i2TK9ZNl+iHIGuAa4IqIZEcYHhwHVKsU5ogZYVxfwqMJMqGrgV2gpayY0VI3CyCbTLWfQGkG3SHCbFXmYFW0sSLSo5Zx78YMqT51RA95anNQW6JepGHBlw8S+MVFvV3QUpfQBxvcM57KOix4\/RB4hAEztAoKQ7gV80P4CHgZ+GDTskSp2x5GYxvs+CJ\/b9AnejPi3DGvYc\/h1toZpb4WESKEhrUrEix+wU07MVzgTwJH1Nom7sJMiQIp52BIYyS0rakucdnK9NoVCRbXuxkRenP47FIhGA3ZicUrbwDrPPh8XV2i67y\/JSrEABHlIHBtiMck2Jq4CBuT9pkKozDPiiTmnJzw\/04hk7FBD\/rXwEuqNETtNBEuhcrxgkAlIrcK+itsokcuBPt8iP9v7kbEUZGzwOvzGvZ0tdYOfcRvS12CZMr1fWf0Haw3fElEsiMMC6LqYFXZuZiZUimr2Acwgv0xaBdlMu4q3Z32YhXSFYs7Lir7gI2AI0IVaKWIeKr0gXZXOJpBIO7Auqcjk7N8sSTl4gjigaMQR6nGqpc9QMeSelcBXfs9J9sbbRxKz7xU+5fAaYH3MQn1HRjZvgqrvsb9n2B0Va4BlocFS9sxE8DVMcc7WerzxjbXwPG42LCeRvQm9dh83593n9r2q9mlvh7fwkONbWTUERDHz04p4JXjaLoI5Y3mZxIA2SUp97AamTyIJeMXYFNIBjPzCtaQz7B2q8uiptEFJYMZhR4mXGI6FHgYud4LbMbk9O+rx\/F1KxLfKAqI2vg2rIXsbBGObTS2B1yJKesmYz31o\/2fMGK7NDY55XWUl7ws+5t\/EY3qinBxiEgc9CqBB7Ee7AnD+LhK4BZRfVpF9gNb5zXsSQ+baK9s68ZxPgPWAImIZEcYMuaubAcLVm\/FNs3rKV32uBOTpK5T5UCm38ts+4vyCGC3\/dWNwR8Vf45ust5FjPjpptqZpT7EEY1FL7oAjuMxSpXRHlypNkohof78WUxu9ynwoQpHa1JuuqlAzpIjHP2I7Ef1EGY4ExDrKVgQfKP\/ew7\/f\/b+O0yqO83zRD\/vORHpHR4JIUgQyHtLCiGRSGWEygoSqaral9TTvdvbc+fu7Nxn7uz0nd27d597Z2d3Z7Znukuq7umuLiMiqSpVSUhVMiBcgrx3CPIk3iekNxHn994\/3giBKBlIEybz93meeFJCIiLOyXPO7\/d9zfe1TEYDp0X3meI7Zy6Swc71YaAN+DXwMqpHt6xaUAyu2tVYUHAs+wnPldy82ymINoRlwSmKJBB48y93k8wEgagkYtV6YB7obOz3eQA42JTqGMBEgs13zpolefHtOQecOo4jbBahHQvqLcf6fKdifZS5nuAy7No6igXp1nOOIjv3WQhHUDow9+tiGeU1COzHKoeeBTYj7FVhcOOntLVtWNNIcypyWKZ3ELvnxvNYciXjZ5alK+O3p8tgwYansEqnDzd954urFTyTF0HKMaf9m7EA0GirKqqBW0T1qypyGPN9GNU12PbAAr1t3d5jgXPbgKu9yPaMmPIyJJ2ROaDLsAxY5Wjfc4Q4rNzoWWCnCMPFIrA\/i2wZeFFssEuR5Y9bGXgwREBMnQoXYxnY21S5FctWVpEb5WLbhINqG7ZfILzV3Bp1A\/GGwvYIF5TsbO+ccEoDNKU6wDInHVg0NiekK7E+o8VnvWZh2ZajmDvuHrEew9cUDqtI3\/aW+QXfPC1p3QOqIbaJL5TpZzlQL0iVnA5MFJSmVLuQliqEixRuRWUpFlCZggmgcqwvtgPrm\/zojJ\/HmlIdGU5fQw7Lehf8uDzFw\/MtH693A9h189HyVPRzsf7ey7CfF2IBsAA4hrAb+EDhXVFOnMvnbFjVSHNr5FCOZj\/nKLYZLxSK3RMnsCTARiyD\/YEGdAfgNqz6nPXHxmn1Y5nlHizImU\/GS2A7TGA\/AfxC4P0gxLfPeL6ISiyZN5+xMS0LMEO0uzENcWpJ654T21fPG9X6tWPVxZmmVMdOYKMX2Z4Rk4m1CjPyWoJdqIXYuOaci7cCO0BPFcrszJMf7kpFQppQoArhShMG3Iw5np5paHX2BmE+sAqYg\/JzzF37KAVwoC9m2j4pvD+mKdXRi20W3+G08A6xks\/Z2NicLrEeylNZTwTdvro4BFeIEydBL6q9WFAg30FBwTLZQmEd1gG4fV07qiIo04AmVFZhPZnTsL78M9sDHCa8l2a\/ezr7OoJtTs4U3rubUh3d2b+TQYgF1YQ4Nq0q7uCnJ39sbGkcXNEafSQmtsqBUIUhVQYVKgQkW+11vlVHToXjomzHWtjqGTMX4fNiCOgCPgSeBraq3SOdAumNq774mNSREaELe+7mYxJEPogxQ7zHgXXYuNP+Z8\/hfHgmPZVYC8hMxq59IQlcJqors9NPdjA291qvwDYvsj0jRlXmY30Ri7GLvxCl4gPAm8BzKrJv++r5XjBNUJa3RmZ6oUxBmQfcrSYKLsGyIF\/kFh1iWY2VmCisFnjiS+uiY8+s8mVqX0Q2OxlnXx9nHZpSHT0qcggAVadFXEIsqiezjsd9fH4\/6HgRYEHBgntGuIwEIkxH5F7gjzETmc8KPARYNDObvAAAgABJREFUBUDZWX8+E7ic06I7jYmLPVhZ7FbgFZADGQ2GC33MnuLi+dWNMWb6efaYyhFnNTesbuSu1mgA4TVRnsGe+Yv43Wt3vBjGgk8fANtQnkbYrUKPCum0Q7edY9Bg45pGtyIVdauJ7H7Gv2R8vMlgJfMpoFXhA4S+jat9YsRzTpRj6\/ZY3ss5U9IlohqpyP4lrXui7avnjUpLtLXM1zvWdRzwItszIu55oj3oG+BW4FZOl3jlGwccx8qvXgP186QnKF9qbZcMNKBcjrmdfgXr56vHHrjnKpZy2cQl2OZrauxY25yK9m9oafQBmhFwhvguaraubtSmVEcf8B4mdMcyGn6u5DaZvYU8F0ta9wA0qOoKsbmhNzOykWa5aoaz\/+5szKvjVpTfKDwuyPu3pzoGtxVpAMYzcXhhdaMub42OYBnk2dgzfy7jJ7QdtrYcwFplXgS2KbyrQl+gqCi6cQSGmyKcVGUPVjJ+EaUrsmMgQngMeAyIUAYHYh9485wzZZjeGOukXoC1va3E+rJTS1r3dI62bDx2LuNFtmdE9A3IPGy+7iWcLoHMNz3Aiyq6QZQjgYt9NnKCcUcqkipciLIohBUO7lIrAbyA04ZbIyEA5iv8BRYZ3dCcig5jbrZdQP8G33Yw4QhEh5zKO5gJ3vnO7B0LYizLO0ABs7oau\/IgkGuB72LmUGM9MzyJ9XPfhFU6Xa7wnxB9pak1GmybxD4InrwRo3yE8BMsuPV1LKM9ViI1Z2TamX1tx1qQ3kbYg7XOaG92hXp5hOXQgTDolJ1Ya1OG\/GXkxxKHiZd\/UvgHhIMCsQjs8AaknnNG0qBJxmfdDoGFovqAiuwBNi5p3TMwGrdxKN45gp4iZdm63cQaiGrwPdB\/h\/XAFiKLHWO9Tv9ZVX8CdG2f5GOZJhp3p6Iy0HqB2wTWOOQmZ9fbWDpDK+aE\/Q7WG3go+zqKCe7jAexNJjgJ6NPf9tdYqdO0NqpG5D7grzDTpXytg4o9s1ZiJmIFG4u1pDVqFJU\/Af4UG9mTj2N\/CvSvgDdAY4C2Fj+m0DO+3PWzKJSQeQIrgHuxCovZWIno+exdchU7ggXJIixY9xHKBuBdAgbLA\/oBffr+sVsr7vxpVBEm+LfAw1jwqpT27mmseugfFX4GHNZsmOOFMTxHnonPbamoIUD+Z+APsMkx40EfsE5F\/jfsunWjEdo+k+05Z25PRcSOBMhc0K9iTsOFMjs7CWwG2aZOu3c86B\/WE4UHWj+UNFLfrXpVCHfF0BIj8\/T8N0XngmAbrmnYZiDGsgU92EzXnQobhzM8i3CYUY538BQeDYIBoE1U1wLfJz+zdBXoVZHnRfUoBRTYTamOMpRrMT+Nujx+9B0gD4H+z2GCA1u+7QW2Z\/x54cHGGGhfsTbqAJ5R4Q7gNqzd6CJsXOGZG\/acW37O+G8Qm7bQja0LR4AtwNsCHQr70sN0J8vQ8ZhUcedPI8KQGHMm\/wrmMF4KJeMO6yN\/Gfh7EX6TUU5s9plrzwi48e93g5NhDdgpdk\/WMD7BpkrgTszEs1PUHWIUVWdeZHvOGUUCTIyswEZ2FapsaQjLCD0Drn3Hg76st9T579a9DkA5ceKUDs07pJXNCl+L4XaHNOj4BnOE3zV1asBK0i9TM3a6WGDtyl9EH63\/tr\/eSpntq+e5plR0GGQdtqCuxsaCjNd6mBtd9FaA\/lyFgbbV8wt5CmqwbF4jVtadDwRzeG4CuTMzzDrMIMrjyRdOYR\/KEwgvY\/f8HKwXcyYmtnMzu0Ms4HoSq3Q6iI0n3I0ZmvUDgwjDG1aPr2nmpu800rw2ymBZtU1YyXtNoU\/m56CcHum4A\/gRsBXllBfYnpGSqAohkAzo69j9OGOcPioAZonql7B7\/TfL1rX3bV41sqCwF9mec6Ip1Q5WprsIi\/KMrlFh5DhssdsEvKoS9hT63HhGzr\/8+WsMaYADKSNT2anl13ZS1jJMcLdDFjH2vaLnypluytcDF6hy6UCGn93dGm1zSheg5zlaxlM8pMU2zD9Vy1Ddh5WO1zO2AZ2cwH4fWKvK64FooU3i6jCBUUt+y05DTNA0EQTbsN50jycvPG\/tZA7z3MiN1qI5FQWYaJ2JiewKhGGgE2UAEJQ+5+h64cHGTHMqAiCfz\/44RsOQUwjPYyaFt1Gc2WyHZfs\/BJ5V4ZeivA8MPO\/XSs8oyHQPUVabjCWQI4hsAxYyfsGmckzr3AG8rcguRljF6EW25xwJEtgG6WZsNnYh5k6CZbHfRngWOCa+erdk+ZtfbuadOJQhggqFOSe1bEUvidUDmrgqRmZQmFaETyOJlRXeB8xxyiXAs0DUnIoGvUFa6dHW0sjtrdGQKh8q0gXsEvgy5lw\/k9NzohPZ10iuRYe5iL8PPC7oehG6txbe9GtK9hjzXYkkQDVwCeiltz0W7dvxQHGOzlu6LkIRcSo6WuMbT3GzoaXRcboc\/GOWt0YgyNnjpQoVWHXKQCC8BTyJZeDnUVy92Rks6\/8i8JQKG1TYp0L8gp+B7Rklrz58KU1rozg7LvQZgWuwYNN46NgAq2a8DGSeU\/YywtnZXmR7zgmBSrVMzxJMcBTi4a6YKdUGVN8UGFQppjXGcz68Fk8J0wTT0hpcO0SwakDDe4cIZ7jzG8mVLwTLAN6MZTsuBn4FvNGcirp9Rrv02Gab56ElqY69YuVn67GFtRFzxM69FmF9+znBHZ7x87PEdwYrl3wFeAp4Vp3uCRNFERWchpmd5atU\/EySwDSBCwmoosCjzM7mznXtZFyQUKVCrWw43ZTqGMLWHnfGS7Oj6zwTlI0WDCuK3\/Gm7zRyVypyav3gz4ll8VZhz6tiYBDYBfxWhd8Cr6vQ+cKq4gyieUqTtjWNNLV29KO8hXkUzMcCTuOxXyzHgtGznCNx3Q928cafXnLeb+JFtucLWbI2CtQuthuxXux8muWcyQCwHXQj0K2gBe5t9IyQ\/\/WXW8r3u8y8Xle+fIDEtwc0uC1NkO\/y1fMll4m7AusHmovN+9zavDY6sWGNn7Ndimw3sZTGBFU\/lo15idMzoENMlC7ik+J7AZYVzo2SS2Ob8iEse70FaAPedkFwfEfL\/IJfH0ta94BqHVaJVIhy0xATrw0ItRSRyL5tXXuYUZmhcCnKJQgLRfUSrCTxCCYiPgJ2Avuz18qZwjvGxHehD8UzAXmhpZG7UtGwwIcKPxd7JjWT\/7aPM8lgFQCvAo+rsAmbnND\/wipf4eUZF5wIh1XZjO3FVmBtXmN9DwTYvdWAaFnFlFAYQdDNi2zPFxMEFahehonsWRSmjHcY2+Q8oyq74nQcv\/S9hYU+M57z5L88\/owoUrffJa7r1\/Cr\/SS+0q\/hpTEylmO5xpsEltn8JhZ0+gXCr5e3Ru8D3RvH2QjHM35ks5Nx9vUxTamOHqyHeCOnhXc5FkVfjGW\/61TkFKofCuwT9CjQqejQjlXFkfUUVFRkSFRHVPo2BgSYt0eFqBS8HSTrNSIg5TiuVuQ+zHV9Mcp0rKrGYWIifcbPLux62Mlp4f0RcKwp1THMJ8W381lvz1jwQkuj3vXzqDdwbEMR7Hq8C6uuyvf91I3tyV4AnlDhHWzsZWZj4VtiPBOUttXzWbquYxB4S5VnsbaJaxif9qc6oE6QMkVH9Az3Itvzudz2WLuI6jSsTPxqLJNXCE4BmxR9VUT6vcAuPf7z48+WDRPMPuiq7z7iqr52Sstv7NfE7BgpRNnqaBGs9HUxNmv4clHWAdubU9EBYMj3ak8c2lrm5wRTJvdnWeF9EnP9taywaoxFu1UElwycbry\/eJ5VggaC7lPkBCYW870HyGUD+ikGd3GVAKEOGy\/2R1iP39ml9GH23yvP+LMZWKni7WSrIDjdIpDLeH8IvAvsbGrt6Aacr7zyjJYX7m\/U5taoR4TNqqQxsXsXcCEW+BvvrPYw0I5V6vwG2AacECVWQb3A9ow3W1fN16WtHScUtmMCey5WbTuW175igasYcDtG2BLoRbbnc5EgSCpcI+ayN4fCXDMZ7KG+GdjnxBW87NJz7rz85A\/5MDOjot2VX35Cq+4\/opUru7Vs4bCG1Y7CZ7PGgCnAcuwhvwh4Gni7ORX1e6E9ccmWBeey3uncn9+2NkIxc7WiQ8WpCcHdmECsHOU7joRBrPx6oJCnYknrnkBV67Nr2z\/H\/BaqObeN2pnTB85kBnApdj0MAfuB54Bfiuo7S1ujHsAVgfmdp4TZsLqRu1ujvqzI6AEOAPdg5bNjXT6u2B5sGPOu2Ixlr3co7AWGcx\/mBbYnX6Qzw3EYJttBXsCEdj1WJTVWCPYM72EUAWEvsj2fSraMDkSqsXlxV1C4cUoHsDLNN0Slb7sXLiXFh\/H0uo\/iqTcc0JpvHtOqr\/Vr4qKYoFAz1seLOiwLtgC4GuVxhA3LU9FhxJfPTSZ2rCne33Ugqg56VOVlzE29gfz3Zvdhz\/ShQp2Hm360C5xWIFyj8Pti9+5YBBzObCWowcp4r0C5BeQfVPmNih5pao3iNv9M8IyC5+z66bu7NXrNwRGUD4AvATdgCZFaRmZuqJjAcFgg7AiwD3gDCyDvQjgM9J\/tvO7x5IsXH1zM3b\/c1dufDttArsHKxucwtm0TXdjI4BGvVV5kez4dFRBCVBdgEdIpFMZcIwO8DTwHuh\/BZ7FLiKd\/\/ZNpr8RT7tnj6ls6tXJpH+E0nRjZ609DMM+CbyHcAFyH8BTKS3etjXpQ9IUH\/MbaUzi2rG6k6bH2fgJ5BSvznINlAPKFAiewTXtmlO81YpKVYYDqhYLcg61v45XRz7WV3KImehTlceBUUyrSoqx28JQUz61uTAMdy38Z7Q2G2aDCjcAtwJVYS8MsPjmy72OTvjP+LI0J6nT2vw1hbQ9vYOMNX1JrgegjMJ+BDX4sl6fAPPetS2hKtR8GfgNyK9bqM1bP8gw2zegwXmR7xpKmtRFAgDID9F5EFlAYJ1rFzGU2gXwAbrCtZUGhT4\/nc3hp\/d+Q1pC0JoIBTU5\/J77gT6J4yreOatWVQ4RVkyjsfTHwe6IsBtaJsCkI2As+SOQpHEt+1o4GgQIHBH6NeQrcRn6qlBTrH30LOFooM7CmVAco5cB1wJ2Y+B1vyjHR84cgh0Cfa2tpLFiQwTPx2PitRtecig5j7QmvYz3aczCTzpnZ1wys6qoC2\/8nMYf\/k0Bn9p8PCbyi9u\/dwJFAGHrWZ609RYnEIK+pSKuozseqCUerVxS7\/t8FDmc9WUaEF9meT0EEoQK4CispLJQxVT82GmI7aKcX2MVN2zP\/B6cySRnSiopurZp\/MK7\/4\/fjaQ8cdlUXDBGGk2yFFmwe8Z2Y4L5C4R+bU9H7gPNztT2FYPuDC7j15\/sIXDyo8Jooj2Flzdcy\/vsBc4QVeW776nmF7McWrEz+RizIkK8KrQR2ntdgZnl7C3gOPBOQ7LoyhPVOHwReAWhORQHWujADaFAhKdZL3a2KAqHAgArHMhX0JAeQQMAp6n1FPMVMW0sjS1r3DInyNMjVoA9ie6\/RPNfTWCXHKyqcGM338yLb8wmaUh2oaijIbGApcBmFGdkVY6YxW4EPQAvWv+f5Yl5+7If0DkowSPmUk1TfdMjV\/cEH8fSvHnY19cMExTz7ejwRTMBcAVyoynXAz4D1zanoxIYWP1fbk39evH8ut6\/d7ZDgKPAbRRLAH3BaaI\/H\/ZpzJP5VgHutwKcgJzgWkd9SecHmk18PsuyWH7f\/7KXvLfDPAM+4s6Gl0QHHs6+Pubs1QoTgud8dO+mFtaeUcCIcV\/g5ykVYC1DNCN8rxkrE24DX1bnu0XwxL7I9n0BEwDYCV2F9Pfkopfs0eoBXQHYAPeNRWpgzd\/MZ8tHx6lP\/mWGNk\/2uavYJV71sv2v4zu546l0HXU1lZvIK7DMJscjqMqx871LgF82t0fs4+jas8XO1Pfll25qFAJnbUx17UX1MYSciXxe7Ri\/C+toS2LU7mntYsazAHuAJgaew0tRCIlhG7wLy3wYVZj\/7hrA83Ap0FPhceCYxWfM0v\/54Sprtq+dxxy86huJY3gbWYpVKtzCykcPdmHP+bxHZs6NlwajaerzI9nwC51wgEswGloBeQeFGdu0DNom490HHdJ5qU6pdQAIQAdUlrVEoimT3kjFI3NYyz0dyz4Htv\/khGZcp79bK+Se05p79ruFb7fHUmw+5mqpMQQogippy4BKgBZiN8muEtubW6OiG1V5oe\/LPtpb57rbH2k9IELwAvA88gWW0L8dKqediGYEQWwtywvtcxGmMOYnvBH4N+rgI7UUwvirA+lOnkf8qrQDb+M0V1Ytu+Un73pe+u6Co7v2lrRGAKIIigZopvWIBE1eoXnqPx+P5LNxQrIicRGQTIjnzs\/OdGtED7ADWobymTntH+728yPZ8AhFqQK\/BZobOJP+bEIdlOl4CeXnb6vmjvsjPpCnVUc4ZvUkg00GnYwr7FLAPdE\/T2o5OVU2DxtsfWOA3FZ\/Ctqf\/mlCHynq1cmGnq7rvQFz3rT1xw9VHXHV12gvsz6IMGzXxTcz5dTbKb5sfi\/ZteKBxTINJHs+5sOOBBbqkdc+wqB7A3FQ3cVpI12LX6+Lsa1H252zsWs6J7jOz3o7Ts3vfAH6jwmZxHB4eHtuA6QgJMBfaKgozMSNBdrxXWCYVmPdIUbCkNQpUpQqoUmE2qpeLnaseLOve3pTqOMlph2qXfakX3x6Pp1Bse3AhgDalOo5gpp6HgXuB24GF2Fr2aRvTNOZjcApb+36G6g6BU9sfGL0fgRfZnrOZA9yKOfQVYpZxGoiAzaAdY\/GGd67bzbCTQJBZ2AzJm7I\/rwFqRaUv+7lpzF1zP8KrAttA3mtaG3UCmbY13gAkx\/PrfwiaLhvWYFGXq7j\/oKv9ZodruPSw1lQNFsSIvqQIsF7Q2zGhfY0Kjy9PRa8pnHjB92p78sz21fPgtGD6uDyuKdXRg21WXuG08A6wIOVCPim+Z2PPzw6sEukD0NcEIoWBTFmZe2nNnIIe55LWPTYEWDVJ4Zz+y7ANX7WolFEkIrspFVWgzFVbH1egXIs9pyo47T6fM9X6CKtQyP3c15Tq6OP0NfTxq61lfqEPzePxTBKywb7OprXRs4i8B7yAlY5fATRiGifG5l+f4uPkGtuB7SqyFxjMVu+MGi+yPR9z22NRAuRKCpfFVmz4+1vA64lwdIYDAEtbO3CqYQCXKLIGM0S4DJv7nVOD0874fIDrgaWIrMB6CH8L7GpKRQNt3mkTgHJcUjVYNKhl3z3uar65J56y4KCrLR9Q\/0g5DxJYlvBBERYCvxTY2JyK9ogw8LwfmeIpMNkNS8xZgrQp1dHLx+MVPxbfIdCgkES1V+CUiAyiaQ0Utn+r4GXihOJwKiByDNWeAn2NJJZBz1Bgg6mb\/usuyqpDsBL2m4FvYNmfRk5XJpyZ7Vesl\/2a7PfPBad7sOvhTOH9EXCkKdUxhEgGNBbQbavnF\/KQPR7PJKBtTWPctDY6gMhJLEg8FQsaVmJBwxAYUJETKHtw2imime1jXJHjd8Sej5GAmVjEZyEWvc53Kd0wtjBvBfZvvn90vWpNayOcalJE5iv8JXAftkH4rOs+d7whViJ3e\/b\/n4m5Qr9322PtgzsemNxGaZvXPyqg82PC755yVava46nz9rvasgFNeEvSkVELLMHMOuYAT6nyRnMq6vOjvjzFSHZu6NlZb1SkC0sAqHOOHVbCV1QIxKragTktD5OfGeFn04W1RaULeS7CilBUpVKEpcAfASuwzehnBdiF0735ZzITCxguyR5TToDvw1x6nxV4DTi2tDXKiChbVk3uddTj8YwvbWsaYywA2MMZIxObUh3lKoSBaDrEZbasHr+WUC+yPQA0pfYAejVmFDCN\/LuuKubq94qiL2E3xagIQgmdY7aqPgjyTayc8XwCB0nMCXpq9t9\/EAR0NKXaM5PbkVxnKaxKa3j\/ftcwv8M1JHu0HFeQ9sYJgWCZpGuxoM6lwGMibLq7NTrxnDdF85QA2bLgoo6zbV3VyO2tUQxyEJtVfR1Wvp3vh1dunFLBRPZN\/7SbIBFUiOoNwPeAu7G1biTnQrD1MnnWn08H5qF6lcLjYv35ewp53B6PZ3LT1jI\/byOBvTuRhyVrIwGtx+ZiX4llsfNNjGWxt6GyR2NGZZu\/tDVCVasEbgD5DjCLkW+kZmCbkK+A1AKSG\/812di8\/pEQZCXw3X5NNr6XmZnsdJXEXmCPBUksk30f8P9S5c+dcsWK1qji7tZIVqSiQn8\/j6fkCUWdoCeAbVh\/cb6DWIr1Ax6ncH3hJMqCUFQvAr7G6AT2534Mtn7eCfylwu8rXOBUwiWt\/nnm8XgmNj6TPclpso17OSaub+d01jbfDGD9fa8FQv+2B0deJtuUinA2f2Q2VgY3j9EHlGaCPAy8CrpjsmWyN69\/BEwEXg98Lya4\/IRWBx2uDj+qa8zJ3Y\/1wMUojym8pEI3RZ4p9HiKnUxGAPoIeAl4FlsfavL4FfqA3UBntuw+72QFbg3Kjdhs9NEEob+IXIn5JcCfowwCPxDoxD\/PPB7PBMbvjic9EtgYK27HFsFCkAF2AS+gemi0pn5BIAhSgcjVWI\/5WASTBCs3\/yoE+dyQFZxnfvt\/4kQD4EKQVQrXDGkyOOFqfIn4+HIB8DWFv1DhSyhT71wb+RPu8YyCtgcacYnQqchB4FfABizImw8GgVdV5I08fubvICqhqFyAVa8tJn\/l8g0gfwx8GbQQ00s8Ho8nb3iRPYm5+Ue7UaUcMzq7BSvryjcKnAJ9HvR9RAbb1ozO7ElVQ4Q5WH\/5Ysamv1wwV8IrRZi7dN3kETvlrkoCghqQ64AmkPo0Af0a+jTE+JIz4FuO8hfAtwJh1vLWyM9I83hGwY5VFyMaDwr6mqB\/DfwGMyIbz8zyMDae8okQ916B50ongQuxSRv1efzc7IxyWQlB49X\/6f0CngKPx+MZX7zInsQkK4JQhBlYCfClFMZlNQYiVTaochx01JscValRK4O7CRvVNVaCOAFMVWSBU5k8QsdJQpULsOtkLhCay42jUkbVOu\/5YgQrZW0C\/i3C\/yBwZXMqqmz2WW2PZ8S0tSzQMNBukO3A\/wn8IzY+spux75Uexpy2nwWewdzFC0kScwSfSX5NTnPB6kuA62tmV1UW+Dx4PB7PuOF7sicpt6\/djZOgXFQbgRuw0tR8b9qzWWy2isiLqjo42vHvd\/0ykuE0F2F9Zov4XbfT0RACtajWq8hkClAlxTZj84EaQUngqAmGaZAh+nUsT7HnMwiBi0T5HlZx8k8IL37551F3bQW6bqUf9eXxnC8ioNCn8CpwApF3RPVO4EasTzk3rio84+f5rpNDQDsmrteFoju3rG4sdBFQefb4Ggrw2YnsZ18GOuXGf9w18OofFKpT7fNpat0DILmxdFkHfY\/H4zknvMiepKiIiGodcFX2VVeArzEEvAtsAenfvmb05XPDaRqAm7Es9nTGtlojwMoJ4wAN72iN2LJ64oubAI0VcZyxwUwSUyND1MgwCZw3P8sPgo3X+xK2Sa7MxGw52c9JvIGQx3PebLp\/AYDetjbqE5H3Uf0IeAybsDEbazc683UxNtf+TNGd+5lDOX0\/9gBvAk8Dz6L63paWxryNj\/kcyrHAaSH8RQIsmz1dYFqyMjxM\/h3eP5fbW6MApVLRqdlz1A+cbEp1pLPf9eNXgcv+PR5PEeNF9iRFRRKizMci9hcxthnfc8Fh7qLbQd8EN6qNx21rIzJ9CsgioBlYgM0\/HdPThjnDDpD\/OeIFowwdHkL6MNOeGCAhjnoZZFrQx0FXQ6\/3sMkXAbY5vhsTAglVnscqQjwezwjYYT4gDivrHm5KdfRhPdo7sWd9iN17tZjQzonuRdmfs7H1Jo2tEYPAUWA7sAV4V0UOb2+ZP1zoY13SugdUQyywXqh1rBzrBa8VIYGd94LTlIoChBpUrlC4CeUS7Pd9Mfb734eNGt2Z\/flRU6oj18vvsPXRYVlvL749nkmOF9mTFqkGrgWuxhbbfJeKD2AL1cuCHN3WMrryOQmQRLXUAEswE7cpjL3ngAKHgKOqmnGTZAm9deWf6uYnHz2FcAzbQE4VNKiRIaZLP7UyTL8mvdN4fmkAVqjdu9XNqeipGI5vapn4lRUez3iTLQvOCad07s+bUh29wBHgNT4pvqcDjWQD1gqHBXYKnADtVxjavrow47rOJhDFIcOiOoBVkxWCCrJBcNHCrxtnjDKdh8pKhZVYAGUqlnXPVbFdAazArok0Fhw4yCeF905gTzZQc1p8izhQbVs9v9CH6\/F48oQX2ZOQplQ7KNMwM6UF5D+LDXAM2AG8r6qDY\/B+SQm4GmUZMIfxidB3Am8D+1VluG3N\/LydrEKjTo5IqHsww54LFYIKSTM96KNOhjhBJcOTJ7lfDAhQhQWVqgWqE8Ljy38eHdl4f2NRbOY9nolGNjsZc5YxWlOqowfYi4kxBWIFF4hFYrcVUVuRoAQwoLAHM3mbTv6D7AksYNtHgVtdbvtpJKpSIcLVwEPAvVi10Nn741xQ5WyD2FlYsiInvDNAL3Z+dwLvAG+Avg+cumNdFG9ZVTzXg8fjGT+8yJ5kLGmNQCnD3MRvxTJi+W6ojTEjmBeBA6CjcnJdsjYSUanDBMd1WOR5rFHglex37hSZXD2wLhMOhmHmDeAw5gybFJRpQR8zgj4OulrSfqRXISgDrlb4fZQhiVm\/PBUdE3AbfFbb48kLWfFdEqMWtq5qpCnVMQjswkra5zL2rVVfhGBrSRcF7seWZFCB6lXAw8A3sez1+QQdcuZ4FWf82QzsvN6KBTI+wGayr3fK3jtao+Fk4HTD\/QsLeegej2ec8W5FkwzRIACZBtyJZXwLcQ0cw9xcPwD62tYsGF2puGXiG7Ey8dmMTxZ7CFsk3wYGYLQ+6KXF8m\/\/kYK+h\/3OhgBVhGoZZm7QRY0MM8niDsVEOXAN8HvAMrFeR2m2EkiPx+P5BGHg0gK7MVO2fvKfTVasv7mHAorsW38WhaheLHA\/8FXGbuSnTbm0aqPZwDKUf4fy74CmGKoHNJBbf95eqEP3eDx5wIvsSYcmsFFMy4HqAn2JXUCbihxUkdHPIxWpBq4ELmN8stgO24xsxUrGXdskzBKKBr3ABqzEz\/4M5aLwFNNlwHdkF5YqzFX\/97DSRV+l5PF4PpUtqxY4VT2Aze3eRf6Fbm\/2cwtaLh4kqBcLzn8JE8PjtScOMP+Mb6rKX6BcJY5kGGfb9zwez4TEb8QmCUta2xGVAHQqyM3A5eS\/Dwssav4K8Lao6xutWF3SuidQmCqql2G9UWN9TAqcBP2tKIe2rWkcfVCgBNny5KOACspbCK8AF5I91xWSZmF4gg5XT493GS8kVdiG8dvAAawlw5cXeDye30FFBsXan36FlTdfTH72BBmEV1EiYLhQs6ebUh0hSiNW1Tef\/CSdKoBlIIdADyHsbVs9uko+j8dTvPhM9qQhAKQcZDFmeDYeGd8vIoMZgWwHjrS1jF6wimooqg1Y6XvVOHznNLBLkC0i9ObzZBUTLgQ1wdYF\/BYbbwNYNvvCsIs5Qa\/PZheW3Bzte7DSx2m+ZNzj8XwqIgocB9YDvwD2c5ah2zgQA\/tF+RUih9taCuq4Xo45iF+JZZnzgWDtPMtBlqtK+Wjf0OPxFC9eZE8SREWwheR6rJy0EL\/7XuAV0Nex8SGjR1U4PV5jrDcIMbYJeUWhPQi0JIxtxoM7v\/oQqCg2\/3UnVo2gYCK7WoaZF3ZSIZP2FBULCcyf4FtknccL\/YU8Hk\/xsX31PECHs6PGHgPWYtUvGcanAibGxp\/9Bng+ENc3yvcbLdWYOdlM8jsvPMRK0+9CZe6S1j0FPg0ej2e88CJ70uCSwDzgJizrm++kYwYzOmkT2CsyNoJYAzR7LIlxOKYhrG\/sZVQ7N69akM\/zVXyIgjCEjSZ5CXOmRYAyMswOepgbdPtsduGpxFz2vw1c3pyKfA2\/x+P5HdpaGlVE+zHPkb9R+P9g5eMdWNXSAFbNNZqMs2LzpA9hnh6tQLR1VcFHDdZgLWb5DkTmxi9egsjVFGaE6jlxx7p27ljne8Y9npHie7InAUtaIxQaRLkW68XO96LigFPA6yBvh4EObR6jOZGimgEZwDKsY00XNuPy3SDQQkfdC86y+x7i2Wf+Y1yWrjguyJsg72PjTpIJcUwJBrgw6OaQq6VHi3bfMFloAO4A9qJ0Na+N2jdMUj8Bj8fz2Wxd3ajA0JJUR4TIPlR\/AywGrsj+XIyNbZyO7RlDTo+tCvn84LZi5mYdmMD+JehrYTBGlWyjow7LYheidS4BzBR0vjpqOKP9qhj48i920R+H4pQQRJpaO7Dx6ii2n3OAK1Q\/vcdTKniRPQkQDQS4CPRmCjO2K41lsV9RcfvGSmADtLUs0KZURzc2FmwAWzjHIpmaxnrU3gT2iZDO8zkrSu750l+y+clH+xF2A+9iju6zBJVKhpkZ9DI16KcvrsP5nHYhCbBSyHsRjqjw+PJ10WEEt\/H+yeeM7\/F4Pp\/tNus73ZTqOIK1Sb2IiegAm6M9i9OiO\/eaB9RyWnQHZ7yGOL2GbgE2qshucTq0eVVRmH1VYf3Rhaj0yZ3TKQQ6ZUlrdGq7BTsKzq0\/b5feWKpQmQHMUmEBcCkWjDiCjX7bCRzOzlt3Z73Ui2+Px\/AiexKgTkMJuAK4Fstw5VNkK9aL\/QHwuiidY\/0BErojGge7sGjwTMZGZHdjIvIDoEe8XvyYZfc9lN60\/pE9gryBuVlPBcrKJGZm0Msc6aFTKr3TeOEpw7JR94tyAnhGlVN4x3GPx\/MZtJnYzmRfADSlOsCq0XZhxpcBJsCrMVfyxZiJ2AKgTk2k7xaIBD4C2hXt2r56flFU0yxp3YOCE1WlcM\/DCqBGVApe9nV7q5WEqxIQy4WK3AosA5pQLuZ0AAWstz6NjTNtx36\/O8\/42dmU6jhTdMeY8PbrjmfS4UX2BGdJawc4nQpyIxZ1zrfyiYGDwKvYA3nsM8JOhkX0FVV5D1vwx6Ic\/jDwmkCE6tDm+yd5P\/ZZDCcGTpVnqt7GFtWFwJQAlXoZ5IKwm32ujgFNkvHZ7EJTBdwGDKAcxbF9+WPR4MYHfDbb4\/GcG9nMZE40fbyGN6U6erEqsjc4nfUG22cIMIjoUCAabykiT5MQFzikEziBZdzzXTIuWC\/2cPbzC4qLBQkIgcUgq4GVWGthDZ+dtJiJrf3LsWsijQVmDvK7wru9KdXRjUgGcG2r5xX6kD2evOBF9sRHCOQqlBuw0qh8l4oPAu+r8Dpwavvqsd\/cB6IuVmnHer6uwCLqo7m2h4D3gFcRjgfBuI81KTl6K09peU\/VR8BbmJlenUIiKRlmBb3MDPo4oZVkfG92MVAFNAMDEpAWc4YfDw8Dj8czichmJ2POmuyxJNXRhyoKtLUUZUDPYVV1HVilXT35N4N1WPl1QUeDLmndA07LVGkU4fuYYeZFfPEeKsDGoJ09hmwmNhYtJ7qHgL3AM6BPiep7t7dGPYDbNg77QY+nmPDu4hOYFb9qR5QaUW7FIo6FqN89CbyC0w9wOi4b+y2rFqDQC\/o88AIWnR6Nc2mHIr9VkQ8dMrhlDHvIJwrfWvZXoJwC3YZtVIbIlt1NCfq4IOihWtIEea7EC1AqJUOlpKmQDElxiK+OBsvU3Av8mcJNy9dGVXf9LPJlBh6PZ8zZ3jKf7Wsa2b6mONfOrasbEdE+LEh8mDNK4\/NIzqumn0K28DgXIjIHke8Cq+Dj8vCREmKl8LXAFGxc2U3A91H+e0W+oiozFcKm1qhgh+3xjBdNqYimVBQ0pSKfyZ7IpDMSiDBbldswZ9B8B1UymEnGyyDH1On4jexQHEoH6GOITAHuwR7w53PMipW+\/Qr0aVU5ie9f\/UyW3feQ2\/TUD94Wla3Y\/PUqgCQxc8NTfBhP5yQVeTVAq5E0i4JOrk0ewqHsiqfzYWY6nVpB7GOKVZjQVhF+IAleb26N+jYUieGOx+Px5AuBIbXpIS9iSYgG8pvNHgAirGS8ICxpjUCpE3Qp8ADjZ4wbYMZ5X87+DFGeBHrweyxPCXN7azuCEMfZabbCNJAGwIGWe5E9Qbk9FRHH1GBmZ4v53ZKefDAAbFORjyQgvX3N\/HH7IFVQGBJ4VeAHWGb1K9gD\/Qv\/OrbQnQTWieg\/tq1uPFiA81VSbHz6b0GlF5H1qH4DC+QIwNSgnwuDbva5ejJ5WkIFmCIDXJk4wkXhSRSol0FqZZj3MjM57KoZJDHZM9v12EYng\/L3YhvMgvcEejweTz5xDgU9iMh64BqgCcvC5oMMZiIXAZlCuHE3pTpQVBAuQbkHm0YxnscvmF\/Okuy\/H8Va\/Cb1guwpTZpSuwFQlQRCWRCwUJUmRBZj99LFIJVeZE9QVEkAFyM0YeIn3zjgAOgLoto53o\/RHdmytKWt7X2qukNVjiPyLtaLugiYhpUw5WZ8SvY79mNOqO3AehF+GQTsK8D5KjlCFwIo6D7gWWyjUgYQ4mgMT\/JhPIPDmp+x7AGKIlhAUQlRGoIBrpZDTJEB3s3MYrebQq8mUfLfgFckCOYG\/5Xsv6eB7YX+Uh6Px5NP2tY0sqR1zxDwuqg+BszARlKONzFwUEWeAk6JFk5jikolVoV2I\/lrJwyAG0D+DHQX1m7m8ZQYYS5otECVu7BxqQuw9ogKzNjQTdJ95sSmKRUBUgt8CfhvsQhtPvuxc2O7fq3Kv0D12PYH8luSettj7SIiVSJyOXAzZsQxDzPlSGJlSt2Y8cj7KrI9FH1TYGDLqvnjV9Y+wdj0xA9BqBLRu4B\/jxnPoUCXq2RreiGvZWblpWRcgFoZ5trEYW5O7qNOBj7+b46Ak66KDzMz+SCezlGtZlDzlbQoShzWGvE88ENgx4aWxoHRvaXHM7lZ\/gvrMd347UaaH4sECBEqyTptb1jTWLDSYM+n05SKQmAOyDeAP8FctZOMTxzWYUH9p0T4XwX9aGuB2nWyY9lmA\/8S+AMsEZEvYiyL\/3+4WP9ux4ONvprKUzIsWdsRiDAFG2H7bawNbxr23PhEu4XPZE9MAuwXnhOW+bZ4zgB7gE0SyMm21fmfj7jjgQXatDbqR3kLoQN4DiuVLee0E2oMdInooTCgB2DL\/fPz\/VVLGhEF+djAZRPQCFQKUCkZLg5Psiuewikd\/24FBfo1QRRPcTOCPndpeDQsl7QABDimBb1cnxxiWtDHB\/EMOuIpdGtZNvM96QiwzM1XgTrgh81ro01xTNem7\/gebY\/nXGlORWiAiJIkQxVQ2dwaNaBchq3DglVM7b07Fe1WoTej9G9qaSyE2ZbnLNpaGuPbW6P9qvoYyD7gm1hJ84WYYeRYRWMdNlt6K9CqSse2loI\/axswJ\/F8txMGmGfOTZIINgAfFPg8eDznRFMqyl27dwAPAiv4nACVF9kTk3JM7FyJXQz5VBGKbSjeAl5RtGDjr9rWNOZ6rY9nXwA0rY0CtYe8276m0WetR8Gy+x5iy\/pHM2oVAW9i0ekrABISM1X6uSjopieenhcxmyHgsKt2r6Uv6Con3bsgcaIuSVxHdqNUIWnmhyeolmHqZIid8TSOuWrSyGSU2rnFYglwEuF4mOQVfI+2x\/OFLF8bIba2VojjAqwt6TLgepRLMXfl3LzoGDjpIEL5KIR3m1PRu8BeAno3rCq42JrUbFvd6JrWtp9QkY3APoEdWJbqak6L0ET2lWs5Ox+DsAy2Rm4C1gm6Iww0fR5\/f7yYhgVb860FBAtgzBXVhbf9LNq148HiDDotbY1wiIAEqCqg2dF1nkmJVGJeV9\/ChPbUz\/u\/vciemNRhJU8LsQdZPomBQ8DLqO5hPB3FR0ibCeui+16lyjSGtJPyXoXdCjux6onqAKU2GGJm0Mc+V0+X5qdjIUMQHnB1yZcyFx0tl\/Q7F4en5gXoAizDLuWS4YKwixoZYqoM8F5mJntcPYN587wpOhqwlop3gX3NrdH+Dat98Mnj+TSafxkhGRKqVGJuzLcCt2FB7YWYB0pub3WmEFNsc3YK2A+8CjyNsg0bO+kpIJlM7MJk0C3wBuY6\/k+YoG7Afq+LMBPZxdl\/zonT8KyfZgpirwzQhwWfnwOeBt5Spyc3tywoBqE2PXt8hdACIRaImi4h1UBXoU9GjtvWRZJARV2QVDtHc4Aa7N492JTq6Mb2kJ94FcLAzpM\/bvyvuwS775diyYkZfEES04vsCcayde1knMzkdAQ236Xi\/cCHIO8AfdsfKM45mZ6x44qV\/y1b1v\/dgOL2AB9iMzGrBJVKhpkZ9DA16Kc3TuarNFvSBNV74\/rqNua9WyeDL08NBu7EzF1qAQlxTAn6qZZhZoY97MxM54N4BsddFenJN+orxGaj3gm8B5xsTkU9G1r8vevxnMldqSgkTb1apditmLHmVdgUixrsXvqsh1wue1eJeYMsAm5GWd+cin6uAR+maxja+hV\/3xWCl767CEwYx9nXEEBTqqMHOAi0YUGTnJiexWnRnXvNw0yPurHASSfwPrAZ9B2Qoy4IBnYUOBO6pHUPCiKqldljKkQhVwIzjqoXyw4WhchuSkWhKtWKNCrcjnIjcCHoTKzyy2HXw07gozN+HmxKdQxi186Z4lu9+J4YlFeHZdh9fhNwAeegob3InmA4pQy4BHN6nkr+Z2MfBV4H7UAoyvIfz9hzx8o\/0c1P\/fAIqu9g\/dkzgPKkxEwJBpgmAxyRavo1bzGfME04d1c87eJ1Q1f\/43cr33i9muHVmJCcBZQpkJQMs6WLqsQwDTLIB\/EM9rs6+jSZ1\/neRUAlcCNKM5Z1+QD8\/evx5GhujWqzZeC3Andlf+aMNM93nc1lSK\/DSnYT4vhxspddS5+I0lu\/5oV2sZAtDc5wxvMwaxrWjU0leQb7fYZAFdbLPVNNYB0WdL9AL2isqNuxan6hDwkAQUVFukW1j8KM0coFKyjQ53+CplQ72e9zkSh3KvIgto+uw9oFcgE0xYLSN2HTOdLYtdGJrZ1nCu+dQGdTqiMDxCoSC2rCe\/X8Qh+y5zxoWhuBUoGwmPOoEvYiewKxpDUSZwv29cB88p\/FjoHdWBncUZXiKxX3jCu9WCa7HbgUKBNUamWQmUEve109g5rIp3itdcjSg67unf+rv+mf\/rJi24sVQfp+gRYs+9RAdg5DXTDIpXKU+mCQusxMPoqn0aXlk8kULVcGdQ\/wGnCgORWd2lB4Yx6Pp2As\/UmHVCZdMiMyD+VuzOTmOqx8tJzRZwBDbKbqvcAeUTrLBjmGb2cqarKZyd9pO2tKdfRi\/i8CqIJTRWvLzZrm2W9eUuivDsD21fO4vTVC0L2KHMeEYiH0wDCWwS68D4gGCWABwirgu1ilyaftoSX750k+KbRmYOLrTk4L7zTWPvkB8Kqo7kD4ACs79\/d4aSFYlcocziOB6UX2hCJIKjpPrO+roQBfoAczv9oJ9IsWcACkJ\/8ITtFdovIu1qNYD4SVkmZW0EODDHKSinxniC8A7hvUxOv\/cfD2F\/5V1QtrsWjzKiwbNYdsMKBC0lwcdjIj6GV2po83M7M54qoYJFH4MHt+EGxj8W1sU\/Bmcyoa9mXjnslG89pIxDbQs4CbA2WNmri+ANtojeVDLMTuuxWivA2cuqc1Gnp2tb\/vSo1s1rtgZq\/ng6ooNsbxfeB28u\/fAxaYP0IBRfYN\/7CL8upkqKpzgW8I\/B5WDXq++ijAjA7PNp+ZiRkiLgWaUNYJunFpa3QciLf6+7xUyM3Fngofj2X8QiZd8+FERlQrRVmMmZ5VFOArtAOvA8dQjdtaFhT6lHjyyLKvfp84yHQBL2I9S2nIjc\/qY2bQS7lk8p0bDrGsdcuAJi769\/3LToFuAP4L8PeYC\/7HZYABSrUMcV1yH\/eWfcANicNMD\/pJTp6gcxmWrfsONkPVrxGeScE96yLuWRfRnIoSCHNV+Aqi\/0qR\/6BwH9nxhIxP\/2oVcIPCYoRyV5geWc8kIgycCtqN9ZofpDDBgW4s01uw+fFBKOC0HrhDYA0jE9ifR66NYC7wDeD\/DfKwU5nnILGkNSrUoXvOBxtXG3A6mHJO+A3UBGHZunbBSsWvwfpFCvG7fU3QNwTtEfFZ7MlI81f+3KkFWt4kK7IVoVqGmRt0US0FmVpSDdwt8JU+KSv7q8F7hoIMr4njPwP\/E\/BjrI\/8YwRletjDzcm9LEnuY17YRVJidHLsfWuwbPZKoKY55TcBnolN89oocI4Kp0wHvgz8S+BfK\/yhMwPR3Ciu8UKwrPklChVaBD2qnonNllULcE4HsfagpzDBm08ccCD7Klj2P1kRJBEWibVKXcP4VfhK9r0XKvwr4LsoM0SRJr\/GlgIKkgYGOY9WXF8uPgFoao0ko1RhJSlXY71i+USBUyK8CLJP1MVbfRZ70iJKL\/A8YiINEEGZFfQyS\/o4QSWZ\/MaAcgGob4vjA5dgw9JvPJR59pn\/dCoRlz0daPCuqLwNfB0rCW0Ay2rXB\/1cKWnqGKQmnkV7PC07imxCy+3chr8FK63fSDH0zHk8Y0xzKsqVAM5SWIzyVWAZFqiuJ7\/B6gQwFyUsiXpjT8mjiYSielRUf4VlcL+MrdnjjQP2q8iLonqqUO7bTakOQanF2ttuIX8+RhXAd0EOgP6sraVxoCAnwHPuqAAaI3ICa3NoOJe\/5jPZEwAlCBSZpiawC9HgMQy8q8pbqvSHoY\/CT1Ze+M2jCMQI72EZ7Y\/3i5UyxLzwVKGy2WWYGduXJWZecyqSe7703xEQxILsA9YC\/xF4Aiudc2Bqs1zSLEgc585kxB3JDhaEpyif+OXjSazM\/n7g0uZUNGmHiHsmDnf9NOKun0Y0r4ukuTWqxFqrvgb8BfC\/AH+MXfdTyP\/+SIFytcfOBI7heYqFHasuRjROg74L\/APwPGbKNZ57OAecBLYIurmtZX4hp1gEWAD+OswVPp+feyFwL8iim3+029\/vRY46BRgADmNTlM4Jn8meAIhqiGWeLsceGPnEYW6aL6rIQVHVTff7LPZkRkUU5Tiiz2HmYlMBkuKYHXQzXQbp0bzL1ACLPDaJ8iZwojkVnbrzq408u+4fM8ny9GER3SDCAWAXsBqrDEnYX1amBn1cI0PUySBvcgGRm8KATljtGWCZvKXZ83G8ORUd8m7jnlKk+bEIDQiAJEqlxswS4S4sg3U1lsWrL+BXVKxapDsQXODLxT15Q1WQXoXtWHCnC6vmuJDz6D09RxxmkPs60Bqgha6TDjBX8IvJr\/Fbzql6MXBbWBHuAvoLfC48n4MqKlYqvg\/Yg01w+sL7w2eyS5zsbL8KbHTAFUBtnr\/CMHbBvSrqOgtV9uMpDu76ykM2tAQdxOZEvkJ2wyg4aoMhLgpPkZCCFESWAwuwERuLyZaG3bPqD7jra9936uhW5XXQH4D+FejjmPNphuxBlEmGueFJrkoc4aKgm7KJndFOYmYtX8bEdnWhv5DHc74sXxslEWaLcqPAShH+uQj\/Beu7\/iaWxSqkwAZ7vPQAhwXSz3vHYU+eaGtZyLaWRgecVNVNCv+Xwt8AWzBTsi6gDwsCxYw8ABRjs6RfBH4qolu2rm4smOFZlhAT2TPIf\/VIiCXFrhC48OYf7y7wqfhsmlo7aGrtKPTXKCg7vrOAQBgCOuDjMWxfiM9klz65SNy1mEFLPmdj5zYGHwIfZYWVZ5Kz7GsPsXn9I0NY8OUNkBuA6Ra6TTND+pjGIIfyr9kEKwO9HrgJ2LN8bXR04xrLzt719YcAMpvX\/+AoyG+xiOX7mAHYpUCVgFRKmovCk\/RqGb2a5IirzvdYsnxShWX67gX2N6eiVza0FHxj5PF8IXe0dpBQrRIT0V8BbsBGZV3IaZfwYkk0ZLAS2oOaNYz0ePJJW8t8d9tj7d0i8jrwDjZ9Yy629i3OvhZh+8xKTD+E2Z8JPv9eGgL2Y07mv0L1BRFOFvqYs99\/NrYvyPciHmDr6yyBWUEoEUU2\/m1paySqJNQSFLKkdc+wqDUnc3pOvMuOrpvwVFW6TN9AeETt\/rgDq9L8XB3tRXapo5JA9GKQy4G6PH96Got0vgMcamtZMKHTep5zpxx1aYLjCu8o7MZKtROhOKYE\/UwL+jgW590ADSwItRB7QL6NRek\/ERxatvJPdfP6R\/pF5W0VurHN7xrMebRSUGpkiPlhJ6dcJX1aRo+WTdT6TsEWkjuxrH5Pcyr60AttT7Hyl62vMEQYthPXZghWAL+PmRpNw\/Y8xRgRy4mQKFa8CZKnIOx4YAGY0IubUh1D2Nr3LiYIw+yrHvP+WXzWawanBXdOhIVY9vpVYBuwTUXe3d4yv6fQx7qkdQ+oBpjAzmdy6kyS2L69IUhIBVYxUBQsaY3KVOUC4BKUecClgs7Dqlf3YpWKHwFRU6qjizNEd\/alE018P\/O1hSxtjU6pynvZY1\/AF+guL7JLmKZUB1iE6QrsIZfv2dh9wE7gPWzeoscDwK0r\/1S3rP9hr6K5B\/FiYEqAo0aGmB70U+3SdGm+jfABeyjeCrxOQLS8NTq4cXXjJwJEy1Y+rFueeHQQ0V3A4yAV2b+3CEhYj3Y\/lyaO0aPl7HJTGNAJ+zgNsJ61r2H+C73LW6O9G1c3FlXU3eP5wa+flONxT82+uOGiShd\/uQ\/5nkOuYvxHcI2GGDiBiZnohZZGn8n2FJysQIo5K7valOrowZIrOzgtvHO+QIs4ne0OFfaKeXrsF\/QgaGfZUE9RXN+CoiIqkEF1iMI8H8qxqoAyUSm4wUt2lJgAdajcqlYBdAvmWTEl+7\/FWOVNBku09WNj2HZie73czwNNqY4BTovuGHAqottXzyv0oY6YrasbM0tSe3YL+iHm6VHD51RxTNhd4WRABFGlHvtFz8UedPnkJPAOym7FR989n+SOld9Pb1r\/6CGBdixjXC8QVEqaKcEAVZKmR8sKVWo9F2gGXgKOL2+NBjee1Qd5x9ceAog3r39kH\/AkVlZWg5WbhgliLgxPcRUJBtIJ9sZ1DOf9FswbAVYBsBJrA+he3hp1BqC+f9RTDPz2yR+F7XEwq1\/Llwxo8psxwd3ATIqnJPyzGMaEyOtYEMvjKVqy4vt3HMGz4jsCnsPuOctmqwoiMUi8rYiMMwNRVIlR9qntT5T8C+0EJlQHKHCp+M0\/2o0qoQjTQb6NjfC8li8eZahYUOWG7LGksevjFHY95IT3B8AHAsdub+0YFlS3lujeQTPxMUkEb2HVfbPxInvicUdrOw4tE5GLVbkS6+3IJ4pZ2b+rcNRl1Ge1PJ\/GMaxn\/zBwAVCeEEe9DFIrwxynqlAiOwHcJuaiuhM41Nwa6YZPeegvW\/lw5tX1f\/tOP+E\/qR3DPdjCI0li5gWdnAor6NEyjrsq4qJNmI2aMqy\/9euiHEJ4VWFg+c8j3Xh\/aS6WntLntV\/\/NScSFYn29NSFh+Oa+465ym+f1LLrBwkqS8Qr4STwksIbmMeJx1NytLXMz2UsP+a2VIf5oDrHiw8uLPRX\/ARbVzXSlOrIYEZWh7AMfL6rQcGqWDr5lMBFPklUJBKgs7CxnX+MTVc5l1JD4XSbwJkO7TOwtoI7ssfWA7wP+rjCsyD7lrZGQ4Gobl5VWhOJJJQMqm2IHACu5HPaDYo9wuv5DJyKoNSjegOWWcv3bqIfE0+7ROh\/8bsLiiZC6SkqBrCymn1Y36GGxNTKINUyTCAFvWxqUe5X5RJVkpnPCTneuPKfaTnx6wI\/xUT5xz3JlTLM4vAYC4KTVEkamajd2UYdsAL4FtmSwIl9uJ5ipv2Z\/690U1l5cHjGdQfi+u\/vc3XfP6TVN\/eRLBWBncbMFdsE9mqBN9oez1iyo2U+Lz6woOgEdo5E4DJWxs4bQDeFGZ13lAKL7Jt\/3C6gDQLLge9y7gL78wiwwHw1lpS4CFiB8v9E+e9Bb3VQkwG5bV17oQ595Ih0YlUbPXzOdeNFdonikECROYo0YaZS+d5RHMdKbffjNwaez+DOlQ8pVi60mzMMxiokQ40MkyjsCKwAaBT4ugh1iS9IQd+y8p\/FAhuAn2BBgxhAERqCAa5MHOHioIvkxB7rJVjvXQvK3UBFYeMknsnK20\/\/h+BAelr9CWqWHdKa\/\/t+V\/edw1qzqE+TyRK6JLuBJ7BN\/sALLb4ixOPJF5tXLVCU49i4so\/Iv7N\/BttDn4TCbRwS5VIu5iL\/NaxEfLzMcgKsGvB+VXkY5UqclAWuJAKiH7N9TSPYtfISZgL3mUuOLxcvQZpSHahIUqFRVC\/hHAaijzEO2K+qLwp0ta0pnj4bT3Gxef0jgPQD72FGeTNyjU+5ORCFaIQ6g0rgTlGetxKmzw4YbX\/qb8mo61XkcYHZIH+KOW8jKLODbq5PHKJLyzngatHSyKSNBMH6kP4c2B0rz+MDbZ488eLTjwAadKvMPOZq7mh3076zK5627IirahgkLKXEwTCwFXhWlSMb\/Trq8eSVpsciFBnCglxPYdnWi8nPlkQxgf0B0F0oJ+6mVIegTAOasL7q8XajFWzSw1dBToIexnxeSub515RqBzQGOQhsxsacfup5K6UFyZNFFRHVelG9Gnsg5Jt+YKcqu5z6zbXns1m28uGckv4Aq36IQejTMrq0ohAjvM4mAC5SuAflgqXmrvmpdIdDpMU5VQ6rys9BX+CM7HxCYuaEp7ghcZipMlTo4xpvQmy0x18FsHRZKpqwjm+eYiMdDKvMPhFXf21f3PDPdmWm3n3Q1UwZIFHwh8l5EAN7RPk7lD3ig1QeT95pe6ARDQOHyDHgt5jBaT7MBxUzBtugIu+3tcwvpON6AjOCvRmYk8fPrQO+aq\/CjJkZKW0tC3IhgW4sm\/0BnxEkKKVFyQPcnooQ0QQWcbsas9XPZ8osjZXKvqwxvTse8NF3z2ez+elHUA1ihC7MXEQzGnLCVXPU1ZDRoND53gB72N8A3JT4nCjul7\/8l9BfhWiQxtyAfwL6Nmc8XCskzaLEUW5MHqBaMoU+tvGmDFgs8L2EmcZ4PONK21N\/Ewy55KxeV776sKv7413xtNsOaG3NIGEp3WoxZgS5ToUtAv2l9OU9nonE9lUXg8bDgn4g6I+BdVif9HiZ+SrQi00TeCLEHSjwKSjDfJ3m80njsvEmAGaA3I0GJbd\/yFbwDmAC+yU+w7TSi+wSQy0rWIMZE1xMfn+HuYfDe6DvvPhdL7A9X4ATJHABQiVWAaGDJDjkajjhKgrlLH425dgCc4vAnOZU9JlfqnnVHwAoSK9q8CLIjzEjtBisbLw6a4R2feIwNVIUI0HHCwFqsQDFsuZUVFfoL+SZuGxe\/6jEGs4a1sSqE676D3bG06\/rcPVV\/aU1nz43E\/s54GdAz\/NrGvX5Nb4X2+MpFG0tCzQMtA\/kNeB\/U\/g3Ck9jCaU+LLk0Fj3Tmn2\/t4FfAC9uXd04OLq3HDUVmM\/KlNG+0Xki2c9uVOGmJa178j0haQzQDHAQaMPE9u9s+EpqdfKAiojAdMyc4ELyK7JzG4T3sIePx3MuVKAsAObFBOEpreSoq2aIgmexc4RYj9A1YsGrQ3zO3Pc7v\/Z9gHjzU48eQXkaW5x+DxPqYYCjIejn0vAIvZpkZzyNEhMC50MSKzVbArzZnIpe29DSOKEjC578Yr4OSIBOjQnu69WKh9vj6Yt2x1PLS+y+Uizb8RK2wd5FgWfjejweIztGanjJ2qiDIGhF9XXgeuAabF\/QiK31IadHVoXZ17lsZWJsHvebQAr4bSh6tNDHzWmRXYggeQKYKbBInU654R929b\/2h5cU+nx8gttbI0JRcQhOJcia7dgMeFRBT4G8BFyC7SPnY9fExwfoKSEEUJELRfVysrN68\/jxaUyAvCfCiUKfC0\/x4zKhBGHcgHAlyNwhTYbH4xpOaj6rks6JKuwhea3AO\/esi\/Y\/u6rxcyPXy+59KLNp\/aN7xAxTZgLfwJwzgwSOmUEPl4dHGdAEHXEDQ0zItmXBFudrgBuBjhVro6PPexMnz9gRAA0xcl+\/Jh\/eE09d\/GE8vaxby0rHKcfIGUA+BbwMDG7wbuIeT7HhgC6xcu63OS2kK7HE1uIzXouw1s1qTovu3M9cAiyD9e7uB3YA64FXUD22paWxGIJsFZg4LMSmTLBAfR2iU8urwkMU0GX9bJpao1ChPHZSpyLzsEBLAmsn2A1yFMigHER4BtsHfg0LWgh4kV1yiBCgeil2c1eQP5GdKxV\/H3hP7J\/HlTtaT5tQbVntNyOlSBjE5WptDVc4qO\/VMo66Gvq0vFiy2DkCbLG8TmFrrBxdkYoGn\/\/iTfAwVib0a2yhWpH9KeWSYU54ij4to1+THHI1xWD0Nh4ksejtzcBrauNIhkf1jh4PsGn9IyJQFxMsHdRky7546uXvxTPLjrvKUhPYQ9iIoKeBTcDxDS0+EOXxFBvZ8UyKZZ4\/FsFNqY5erJLzXU4L7xBLds3jk+J7IbYuHsbKifdmRfurCodUZGh7y\/yCi8klrXuyPaiUUTh373KgTpBKbB9W8PMC0JSKqq0CU25RuAvlEiyhUJP9zg44BnyE8BE2yutDTGgvwSqOAy+yS4g71kWiqg2KXIdlzPL5+1PsgnofOOY0GNMbcsnaPQCIOAESIpJwENoUYobuaI0yiOoWK+nxlAgaUAtcDiyMNSjvdhUc02oGtSizulXAVcBlKB+obYw\/9zq\/c+VDbF7\/SK8gLwNT1B6st2IPYqplmMbwBL1Zod2pFRNxtJdgG40bgOuA9rvWRsde8NlszyhJ4qoGNXlFP2VfPxjX3\/xWZnb1fldLurSCVYpVgG0EngEi8j+P1+PxjILsiK2c8P74\/m1KdfRg9\/dLnBbeAVZa3qAwLCbOu0R0WBXdvnp+oQ8HgBAnTmQA5RTWIleIkvGK7M+ieCY2mSfPFJBlwLeBu8kK5uzrzA3cTGy+eJrTiYXy7MtnskuNWCnDMtiXMP6z7M4mDbSjfAj0jGXQq2ltlEC0EqgCmQd6qSrTgbSI9Ct6WGGvOjnYlIr6VEmrqtvxgBfcRY8wA+VK4IIhEuERreaYqyzmjO4iLJu9BTh5VyrKvPAF2exlKx\/W7et\/cDJDsBkrE5qB9XCVCUp9MMCliWP0ajnD8XR6S6\/M9VwIsej9HQivi7nJT\/g5Zp4vpilbkdSWrUZalooIQbI7Fd3Q0sjyVISc3rzohpZGtjzxw\/JjcfUlvZStPOpq7vwwnjFln6tlsLT6sMFKRbcDvxX4MBAGn\/WVWR7PhCArvn9nBN+S1j09qO4j27jb1jK\/0F\/101BR+tTmVHdje5d8b84CoBPzqyjo1ui2n0WiKlNFWAn8MVad93mGbLmgymfqsZJbrSY1ShVwBWY0lO\/f3TDwuoh+CAyojj4bt\/SxdlwgdSDzsXFkdwHXg9RhrsU1qgQgw1j0\/0Vgo6A7RORQUypKt\/metuJGmQdc7pCGHq0MjrpaBjRZzCIzAdwlZkzUca7za5es\/FNtW\/\/I4YzKLxGdCTIF698KA5TpQS\/XJg4yoAl2xVMZJFHM52CkVANNQJtA1NwaHd+wurEoSr88haNMCQWSzamoAkgqJLOrxwAQL09F5WKVH2XAoIPOr6Z21f7DUN\/l06S\/2SH3Hdbqi4+5ykS69HwN0lgf9hPA6wo9z672FR4ez0Rn++p5NguoiNm6upHbUx2D2ISUg1hrX74TeIr1qxdUZN\/2swhJBPUod4P+EXALY9Cn7kV2SSHTMDFaiGjTAPCqU44Cbvua+aN+wziUmaKyDPgysAxYgGUzzi7JqMKMlRYA1yPyC9BfAu14d9aipW39IxUZu14vcSpVp1ylnHSVxV7qKVh\/1RKElzXknMdrNK182L3wqx\/uC0J+hDALM0KbCgQhjguCbq5OHKFLKzg4cfuzLwa+hfKGKN0r1kaDfjzR5GV5KkoCjQLLsUqHcoFBThvmTRXbWPVjP2sCmDNMmD7gauS4VM6NVeYMEpYVybi\/80GBI0CrwBYRTogUR7+hx+PxAASiaafykcIr2D67jPwaKjssk95HIYMSQpmoXgmswUxcK0b5joAX2aXGRdhNkG9XcQUOAK8KMuoboSkVEQjTncr9wGrsgv6iXpCcwcQtwDyQOSL8bVOqfScQt7X40vFiI5ZgBqpXA7NigvCQq+OkVhbLbOzPoxxYjvJjydB9Pn\/xrm98Xzc98XcfSeD+C8osoJlsuVEgjsbECfo1yVD6Yo6Vxrk4XwJgKfA1J+x0MHRnKtJNvuJk0nHr2n1lQuYa4GHgPmzzVsnpfjXBWgrkjFcAiEKcJiCtQaj5DyiPFcPANoG1wBFV4ud8mbjH4ykitqxudE1ro8OIPI3tr28nv\/riOJZJH6CAIltCZqPchZWI14zVOfAiuwRoSkVgznuLyX+puGK9GluB48joekuyx1LtlDXAHwBX8vk9D2cjWN\/rg6oIBH8NbhdF4kjoMTatfzTpVC8XuESRih6tYF9cx0Dp9FNeANwSl7OH83zwS+gcynvAI1hg6FZMYJAgZmHiOF1ayWuZCyjBMUTnQgK4T2C7JFjvys+t5N5T+vzw148zqMmw01XNeCvTf0unlv0+8BXsGf9pm5bPyhaMrbNm\/kljbuL\/FTgUCOr7sD0eTzGiQTAMvCmqP8ZMvi5l\/IObVsEk8pzCflF1hepbb0p1JFEuxxIE0xnDIEOpRognFWJZ3Aswl+aGPH98BuuXeF0hMwY3QSXoXcAqrL\/8fAT2GaeEqViZ+b0QTL\/pH3fn+bR4PovN6x9FoFYsKrogQ5A45mo4ppXEpZG5DbBI5tXhEPXn+5eX3fsQalmsF4GfALvJBoEEpUqGWZw4ysKwkwqZkPozNw7tW0GG+cFgafzSPSPnmV\/9iCee+LEkcFXDmripS6v+RZrgX2MZ7GrymxkpNDFWJv5bDdiueIHt8XiKl+2r56mo6wR9Cvhb4C3OYbrKKFCsbegtUU0Foj1ZA7lCUYUlMRsZ4550L7JLgzJsDu0C8jswPncj7BT0nQAdVbZ4+S\/bBeRCkG8C147yWELMWKoZuLqsIsy3WYPnU9j0878H\/fh3c5UiU\/q1LDjsLItdItkpwYTBfKDxrp9H5y0QBHWgndjYnl9hIz4UIMQxPejl6sRh5gY9BKVyVs7n8O383QisEEfNilQ0yrf0FCvPPvkj+qQ8cSKunX48rrv7QFz\/\/9jvav+wX8ObyL+JTqFRoBd4VYUnUPo2+FYJj8dT5LS1NDpBDgs8Dvwn4LdYm+jwqN74d1GsNPx9YJ3CS4IWenxXDTAHa1sd04CwF9klgCrV2GihuWTLTvNIF\/Cewj505CL79taITCxlWBnK9VgZ7Wivv0psnNlVCA13tJ6\/GPKMLZJwgkouKrggJkiedFUcdrWlNB9asDLWC4GLJT7\/e27ZyocBMqD7BH4JPI0ZewCQJObCoIsrwyPMkIFCH+94EGKL1jKUy2zmvWeisWf9v5c+V15x3FU3HtHq1ftc7f8QufoVna5iRoxMxt95GtgHbEZ526k35vR4PKWBiGYUDiqsVxPa\/4jN\/z4KnMICiAPYc24kekAxF\/G3gHWCPpkI3Mmtqwo+caEOm3k95klML7JLAZEpmGiZRX77sYewDcN7qtK9bc3IzcVUCWPHbOAG7GIei2svxPonLgGmlrBBzoRBQk0gegFwrcLMYQ055qrpdBWlJLLBglnTgLmiNNz92PlnYpetfJgEDAq8lx0JthVbnOwDJE1jeIKrE0eYIhNupLSQLbkXuA2YUugv5BlbOtb\/B3k1c3HN\/rj+qr2u4cGP4unfj9yUG7u1vKZE2kLGg17gHeB1EXq84Z\/H4ykVtq5upK1lfgY4hsgmhf8FWImt4Q8A\/xr4O6xCrx2bb92FJRAGsfbSswVzbpRZBjic\/bv\/AKxTR\/vmVQuKwU+pAdMSY155VTIuRJOVplQHWD\/2pdiFkM\/dSz+wC4hEGGU5hySxTPxlfLGT+PlQj2UcpziV8OYf745f\/t7CPJ4iz5moUI6VWV+uBA09Ws5hV0MPJWfwFWLX6TSEqmyE4LwPoWnlw7pt\/SP9wKtAqyL1WKCpXIDaYJBFiWP0kuTdzEx6NN+FKuNKErsW7hB4ffm6aMfGVY0Tsgl9sqHPreTx\/gvr9ripNx5ytV87rNVf7nQVCwdIlJXYfT7WHAPeBDrUj5f0eDwlyHbrj84AmaZUxwAWPNwHvIDtjUJMkF6IJQAXY9W2OXPmmuxbDWPJujSmJTYBO4D3NQiObW+5uODPyCWte0C1CuvLHnNN7EV2EfOlJ3bTN0BSbb5oI1bCmm9r\/Q+BIyCjjTZVYT3lY91XXob1f5apm+Tbu+Kghuz1Oqxh5QlXzTFXzbCWXJGBALVYNrvWBSRgZIGm21c+7Lau\/8ExVXkOYSYWLFsEJARlqvSxODxGlyun3U1lSCdUlW0NcBOwVBzRirXRwefXFLw0zDMK9IXfY13X16dF8dRlh7T220dc9R0ntXzOMGFikv9iFduIvqNwQtVPvPB4PKVN1uzYZV8fB8mbUh09WCb7fU4L7xDbN83D9oHTVWQI1V0CHYKeBHoUHdq+qqBGZx8ToOJEBkR1EAuMJsfy\/b3ILmIGhwMRoUGVhZibdr6VygHQD1BOMkrTMywruADLyo\/ldRdjN7YiSCJZcmJuwtC2\/pEgY60AVwIXDWoyedzV0KvlpZbFzlGHVUqUMcrg1tKVf6qbn3zkIKrPILIAK5+eCQRJiZkd9LAoPEGXVnBEa0rFhf1cECzafZcKb6hw6s6fR32b7vdltKXIpid+GGzvjRvqwv5vl2ldy6lM2XUnKZ8yRDihIkOjYB+wX2Bgoy8V93g8E5SzxPfHCYis+D4MvAJI1sspBlQEAlHdvGrkradjjaASoIcVOYpl3StG+55n4kV2EROb4VIjVoJRM8q3O18U+AhkN6L9qI5YJ92xLpLYMR2LbE1hbIMFacyIYVBA29b4jU2hiEXKUOZj12tdt1bIMVednY1dkqKxDIvKJkSQe9ZFPLtqNNeXZFT5QGA9wjxgCXZfS6WkmR+e5KRW0atldOuEMmUuB64TpQn4MIzZiy+lLTk2P\/VoAqdzMyLfqyR9\/7Sg75KkuCrnpCRv7nFAMTfek4zMFMjj8XhKmuworpgSWeO3rm50TamOTmAnZso2pg7jPu1XxKhSoZb9nUf+R6FkgDcFDgiSTowiT6FKGdancTFj7943BBxH9RQlclNPVJxSi3kHzHVI2SFXwxGtZpiwVDPZYGYYoTqIR3l1LbvvIQa7avtR2oBfY8YhGbD52Q3BAIvDY1wUdJOceHv0GcAy4FKFirtSfhJAKbH5qUcBLkX4C5CHBb1iRtBbNTPok8SoO4kmFEcUehVckx9b5\/F4PEVPINovlnnfywjbAj8Ln8kuYlSkTqx380Ly\/7s6CLyt5hzoRlPe4ZQa7DjmMMb9DkA3sAcbL+B3ewVEzP3+JuCCIU2Gh10tXVpe6qXPc4AMwpgYdn35ew\/wm39IHa+a0fVr7HzNBGYDEuCYHXRzZeIonVrFEVddysGJswmAazATtHdEGGj+eaQbfNl4aaAkEe4Gfg+YpiBVMkRj0MmHTGeQxES6VkdDFZBW\/Mw6T35Z3mpBnY2r7Zm6IhUlVEgCAyhoTCgBCQLiWIkd6Bbf0uDxsHV143DT2ugdRJ7DKm5nMkbZbC+yi5SmVEeAbcIXk39X8WHgHRXZJ6rpbO\/FiFiS6ggUZoplOKeM8XHEmMB+IxC6trZ4Q6VCsXn9oyHW2nAzSO1JVy0nXBXp0jM8O5PcXjkG4g1jtCH5yh+26OanHj0APIayAPgG2XaQpMQ0hic4qZX0p+dMtLLxWuBuYKvAMVUm3Nyyicim9Y8AmkDlODam5eNn+Oygh7lhNycyY9rGVqpksMkB1SjdW3zrkmccyY2VdAGBKglARUmsSEXzFC5QKEOpwvZdVRKSBrpQ9gXw4aaWxuOFPgaPpxhoWhuBcBx4Crgc+Cpj1KLrRXbxUo6VVy9gjBvxvwAHnADeENXubH\/FiBE+7iu\/DHMBH0uGsJLb9iDUwTyeI0+Wrb9+FBVElXqEK4E5aQ2Cw66Wbq0o9dKCGDgEDI+VwM6x7N6H3OanHt2F8PcoF2H92WUAlZLm8vAoJ10l78YzGNQJ85gOsSjxl1V5FzOJ8oGxIicOMoQapkV5C6QNuJ9sorZMMswLTrJbptCtZcjk\/nUKcJnALYQ81dwapTes9kLbM3Y0WwuCADioFmUGMFuEejVxcJVaUmYK9rMB6zEdwkay9gPHBd5dkYqeEdieCOj8zSqfoPBMXtrWNLKkNYpF+RD4GZYQuIMx0CwTZvc2kbijNSJWqrEZs7PI7+8pQ3YMCeoGxuD9qoGrsGDBWJeK92Muhr2b7y8et8LJRByCWEBoIXAdUNavZeyP6+nTJCVqeJZjCLsXxuI++F0ChnG8DvwUu88XAaGg1MsAVySO0qUVRHE98cSwz8iNRVsCXIdyiDHuf\/KMPc1f\/XM2P\/moQzgKtGG99bMBEhIzI+jhgqCHvngKrrTv99ESYu0l3xLHfuBdLPPv8YyK5lQUYH42VdjEiwXAbSrMx5Ixl4gyDXvGBthe68x9o3J6MVbgNoVbFH46pPxyeWt0YOPqxhKPiXs8IyeZ7tM4UdUNsk2RBKaF7iRrTjvS9\/UiuxgRAuyBOR97oOaTQaBDoANheKRvcse6dlQlocpchWsxA6mxVAqKubgewMS2pwCIXau12Niuy2ICTmgVh7WKdGkLQwX6gP2M00Z52VceYvNTj3YjvICyCPh9zCBMEhIzO+jmsvAY3VrOMVc1UXKEucqW5Sq8gnk\/eIqcZJhxGRf2AO8p8gZwDxAGKLXBEBcFXRyMa+kd8zhqSRFgmcMV2AbtR8vXRa+Io3+sK2E8pc+dj0cEsRV\/bFzVqFkzyKQIVQKBwoAoGaw\/NGeAuxjzPbkcE9x12DP1ixZbOeufq4CrgVWiHAfWr0hFXc+P8jptTkWiECqIQLmAogwNCJnt\/h7wFDGbv3MVgLs91XEc1d8Ce1XkVYEvYUmkaix4lZsHfk54kV2EqJLEIuILGPsS68\/9aMxAbKfCoTAYVbWvYGXuc4GLGPtrbRgTQHvwIrtwqIYg04ErFJndp+UcdPX0atknQuclSAwcwdoRxieTDSDEKPuB32KZ7LvJ3vOVMsz88CQntIo+TWYrAyYEDcDNwC3LW6P1G1c3+mx2kbPkq3\/G1vU\/HHLmvvo26LXABYJSSZqZQS8zwn7647rJns1OYEal9wPzxfET4JkVrdGR51c3jol5oqf0uPuxCBVQQUQIgApNUw\/UoFQub41mi7UNVaKECEmxqSw1mMiel31dTLatiNEvr5VYG98y4C2EXkYxoaU5FSWB6QKXigUBaoCjCDsrIWpORSc2tPhnvae42dYy3936s93dQRi+LPAB8DiWRLocC3Itxp7xOcGdyL5CPiXY5UV2kdG0NsI5KrEyoDmcfqDmgzSWWdoN9GxZtWDkyTP9eATZTMYnG9+f\/Z77wBsoFYJX1v8t\/UgZtvBfGatM6XYVnHDVDJf+o6UP2AXskvEU2XaHDSC8hfI0FpS6BkgEKA3Sz6LwOCdcFbvjKaXu1J4jBBaKcjvwdnMqat\/gTQuLHiWIUXcE0bew4OZ0IJmUmKlBPzOlj6NSNZGCQSMll9G+AztHF6ryRHMq2hUIA8+t9tf6ZKI5FQXO9nHlwBRVrsDE7YWYcF4gSh123ViWTKnERLBiPjmVjP1+XbDr9DJgoUL7Xamo\/4URZJzvXhslnB3LSuDbmBDJYP4+HVjrxJvNrdFHouwX4eRz5xF0WvqjiEQZIgIb1\/j7xzO+vPjgQgDXlOroBt4G3uN0BjsApgGXcFp0L8ay3VP5pOgOS34nPOEQCTDTikuxvrd8TgIZxETrfkYpXGMFrK+hlrGfjQ02ums3qkdhbMYrec6PQVvzpqiZ\/TRmCMtOaSWnXAUZDUpdDnZiG4O9qiNvm\/gilt37EJufelSBE9my8QVYf\/YcsJ7XC4NuFoUn6HSVHNfxuJXyTu4ZdzOwVa0321ejFDl3rPxjtvz60R4N+ADhfazyYqqgUiuDzAh6qHH1DGhismezc5Rh2Y\/vAA0CT6jy5opU1P28DypNeJavi0Qc1ZiYXgjcCNyGBaWnYMmHCj4pnvN94ySwwO4ctcz5OT+HN69\/BHWBVARd4eODB2e872Ys7dXENxxyA6edmS\/C2gW\/DBxEeUfhFVVeb05FOzFj0b4NLaf7we\/9h4jhctAANCBAKcfK28uAsDkV5SZ+DAGDAkOqpDd48e0ZY7LGzzFnVXg0pTp6MK20mdPCuxy4ABPci7I\/53qRXXwkMHGd71JxsJnYHwIHUB2tsMg98HIX4FhWDzvM8Oyj7Hf2hh0FIEYSYg+VK4DpfVrGobiWTq0o9YyrYg\/Qt4EjMs5BnGX3PgQQb37q0Q6EJ7NC+0tYvx1lkubi8CSHXC19cZKBieE2XoYtQreJ8E7z2ijasMYb75QAMcJeLLK\/BBMKiXLJMDPoY5r000U5g6VfyTJW5K7zWoUZAo+psr3p0air7SHfozoRWZ6KJAgoV5cbackt2Z+XYnu6ANsLFcMiKdg93CBCJbaf+kKxunn9DwACEZ2Xpnbpjcn9V\/Snk9fuiqdcPkii8lPeoILTRr7XYevrB8DLKK8vT0UdCEOiVAxBgOKAWdnJGzOwipBZnJ62cxSrpmlX2Akcal4b9YrQHwakRYh\/e7+\/vzzjQ1Z8Zzhjb9iU6ujFfKI+5Iyst18Ji49yLLI4n\/yO7gLL3u1B9SSj6M0BaGtZQFOqI4OV2g5l32+srrchcv3YwmCbN9QoCIIksZKZSx1Sc0orOazV9Gmy1E26hjAR8T7Q\/XyeIuTL7n1oaPP6R98CnsY25leQLRufFvRyRXiELlfOXq0vdVM5sM3dVOBGlM3A4XvWRX3PrvL3cjFzx9cfYvP6R08Ar2Ob3Llkr9GpQR8zg34OujqGNESLQkMUBbls4TcV5iD8rLyBZ5eviw5tXOX7tCcKd6YiAguqzFRHE\/AV4HpsL5crBy82csmPGlHk3Nt2JAAuRvhzhS+XSTynWoZrEuKSn3PjB1iQoRq7H24AvorQLvAuykFAFKYgzMaSTbXYPnha9hVifjxDWOVlF9bieABhN\/Bu7NgFHGhORScFhn3ViCcftLXMB0v4Oc6YmuJFdvFRjfW2XEj+fz97BN4VoQt0DB5M2gtyFHsQjqXIHgSOCnQGMrpggGdUVAA3CLpwSJPlJ1wV3Vpe6llssCqJ17FStrxuguOhsDssizchXI35GcwEggSOOWEXi7STk+lKTmn5RCjJLQOuQLhF4F2nDOCrUoqeZSsfijevf\/Rd4B2sFLRSICgjppIMYamH2MaPesx5\/EJRLkL5ZXMq2gUMek+C0ubftL7CDtVa4GqHtGDu+xdiZdOlsM9OKOfWFrV5\/aOAloN8HfgWcLFCcoAEw+d+9wt83Hc+AxvzOoCZSdVgyaYYE+ZnByfKs686bH1chJAGTqolX3YDbwBvqPLRilR0SIQ+74XgKQSlcPNPGu5Y1y6xow4bcTOV\/JcTdSC6FxgSGYudkg6B7MYijddiD8axoBfYL6LnVNrkGXu2PPEoTqVBRK8HpvdreXDM1dKn5aWewXLAByq8yjmWzo0ly7\/9x7rp1z\/skEB\/gbAQaMb60aRC0jSGJzgU19IfT2Mwr3YN44JgJYBLFF4ADje3RsMbVvtsdvHjjkOwCfgqMEOBAco47qoZIFHqz4DxRLCy4d\/HBMJjwOvNqagfUD\/qq3TQt68B4HjH9+V\/HCyfXYm7Z5Dgu0ATJh5zZeHFjHA6sHmu\/dgCUgcsBy5SJJnEMaQhaR1Rsj6JGbA1nPXn56NPkpwOSt8A3AfsR3hVYbsqbzSnogg4qjCUBrb6e82TB7zILhLuWNcOkBC4SE1k57NUXDHh+m4gegBgy6oFo39TFQWNROQ1rH+vitEvOhksWvmuwKktPjqZd7Y88SgKCUGvwkzPyk+5Sg67Gga15IVfL\/Ay8GEhRku98Ku\/A3Gxom8I8gS2IV8EINmS3MsSRzmmVRxyNRMhwpTAshjXA28lZPxM5jxjh4pkQF8WlQ+BS4c1wTvpC\/jITWGg9J8B402IlRC3YMH0vwe2MZ5TDDxjyronf8K6PUiXBIndw42Xd2rZgxnkW4osojjLwj+PYeDkhpbGLxTZlsX+2F35ArLTb5KSJsSRIWR0k1\/HjEps3bwIM5t7H2gDnnfw8tYW36bhyQ+l9jCYsDgVcSrVaovvhXn++DRmIrZ3y6oFYyKwAVQVAulHZBv2kBvtBtoBB4CtwAdbVjf6UvE8s\/mpR3ABogENKiwHpqUJ5bCr5pirKvUS5kHsOn0l4+grxBe46xt\/QhxkENF+0C3A89jsegASOC4Iu1kYdlIlE2bkaAOwFGW+5neagmcE7HjyEUIVCTRwjuCDfi3r+zAzi1czF9BV+pUs+SLEzJzuA\/4n4EFg6t2tUfCVn0eF\/m6ez2HTk39PlZI4GddPOzR84T3HtPJ\/7Cf8o2GCxa709tQZ4Bi2rzpXclnj8PSbBDQEQ5QXX\/deJbanXgH8KfBXIfxFcyq6JOtS7vGMK6X2QJiwqCNQlanYqIcp+fxoLHv3EXBkLN94xwMLSIakBX0fM3Paz8h7Lh1mzNaWfa99eTxHnjMQSAo0ClyjSNkpV8khraGvtAtjYuA48LLAzi0FHAfSvPLPCBEXIPsFnsT6y4bBstnVMsSCsJMLg56J0v9aAVwN3BjruIz784whTpw4qBnS8IpOV7Xw\/cyscEt6Hqe0fGJcjflDMGOnm4F\/A\/ylKpcNZyhvXuuFdjHy8lN\/I06o7tXkpb1a9uAxV\/lvj2nFVwcJZ2nxl4afjWKB5T2c435K7AYPsAqkU7k3AaFOhqiQdLEG2cqwrPbdwL8A\/hXQ3JyK6ptTkTSn\/P3mGR+8yC4eQqwEZx628OaLGBOvO0E7x\/rNN397voYBJ0TklyA\/AfZy\/kI7xsyongN+JqKvg\/rSugIgtoJWA1cClw5rGBx3tZx01cW5tJ47aezafMUJBwv9ZW5f+bAGaB\/wJvAMZsKmYNns6UEv84OT1MqoxtkXCyGWGbkNZXZzKvLrUpHS9uTfSkxQPaBl1xxzNat2ZaYvez1zYfUJrSz1KpZCknMf\/yOFf4GwRIW6O9dG\/oQWEduf+FvpdWX13a7ilhNa9fAhV\/PP97u6m3u1rLooCqTPH8V8R3Zj68sXkp0ZoGJB317snwlxVJCmggxjYuczfoRYmfvXgf8G+AYwB9866xkn\/GamWJAgF2mbR377sdOYgI1QesfjAwaCIZcOhztU3N8Dfwu8hD3cz4VcCe\/PQP8G9AWBrjbvxpp3Nq9\/BMw34EKBGxSZMqBmdtSrZaW8xc5tNt4H3nfjdB+cL00rH1ZFj2PtES+TNaYRlCoZZl54irlBN2XFV6I3EuqAqxUWOwju9JmFokRFKntcxVWHXd23d8XTv\/xuPHPGIVc9ESYKFJoE1iZ2L\/B9gbsCYarPaBcHW9Y\/IsNBYuoAyWXHXdUf7osbVu2JGxZ0aXlQwhuRGJs3\/RE23\/cLabrvYRRitRFa\/dj+jAClQjLUynn4ixeOXKvGXVgJ+RpgXnMqCu5+zN9vnrHFR2+KBi3HBPYcsmYSeWIQ68fZi5yzu+R58fK3LgXQJa3RAYSfoezDZkjeiAUWajldapXGHuAO6xV6CXgOdCtW1jQkUvQP8QmJJbG1Glgs6OWxBskuLeeQq6ZPE5Sw0fswlsV+XWD\/ppbGoklMLFv58NCm9Y++LfAb4DLgciDMZbMbw5Mc1QnRDy\/AfIHbBV4R4Wihv5DnNC899Z8lwFUcdxVXHdG6VR3xlJXt8dR5R1xVmCEo7SuveAix2cD3AbPFhMBTWBDcUyB+8+z\/jg7JtBhZ3uMqWg64+qUdrmFmp1aU7opn5Kq3PoJzDywHiFOrJOxU+3tVgTjKJENScpnson8iBNhIvZux4NbFovxYhfdWpKJ+P1vbM1Z4kV0ENKU6BJsNOB8zAcpnhUEfsFfgcCCMq5NSEGpGVferk9+IyvuYM\/WlenqeZAUmrk8BHaBvgHykqoeBHsBtX+PHLhQKsWrxBoHLFJkzRCI4rtUc0yqGCYt\/Wf1s+oH3gDf1DJOxYkGEbmAjqteBXAQ0KFAhaeaGp9jv6unSilJ3ds\/1p14JXKrCCZgYKfpS58On\/neOa7KyT8uvPujqW9rjqfd1xFPmH3dVSS+wxxzBNv\/LgNkIjc2p6Fco721Y88Xuz56xZfPTfyeaztSocHu\/K3vgoKtb2hFPmdbpKoISD2qCJVg+RIjEEhvnRBmZeIjwlFr2ewjQEJUyMpQTk0ApIevuJJbc+gMVLgZ+LNB2d2t0DMg858dJekaJF9nFQRLrE7mU\/PZjgz0oI2X8N7Xbvr0AsgZmy9a1dwJvK5Q7lTpVacDmaMeIHke0U1QyIqpbVxVPZnEyo05EAp0LXKvIrH4tD064avq0rDRi159xWJjh2evAbhUrfysmlt37kG5e\/+gBkOewGaC3kH12NwT9NIadHHI1HNbqYjWdOVfKgcXAYlXepggDHpORo662okcrrjjo6h7cGU\/\/2h7XMPeUq0imfbfZeJIErsCC7hcgrGtORS8BpzYUUaXNhEe1QjS4wxF876jWLt0dT512VKvC9MQYgtALvI1wUOXcdfEtK\/+Zbl7\/w8GsL84Q4AQNqyRDtaRJSlxqAd9cYOtuYKrCHFWeBaK7W6Oh5\/yYWM8o8CK7wDSlbD42ZvxzEfn9nShWkh0B3fmcOb3ZxoRlgMwdre39Dj2i4NpaxmZ8mGfsESUJLBJ0UYawpstVyAlXxbCWdBZ7EHhThVeBk06LY8jn2YiTYURfU2EL0IiVlUoCx5ygiwuDHrq0gn4t6Ud6gD0Hrxel7e7WqOc5P6avoGx98pHyHq247qCr\/8P345krO+KG2d1alvA92HlBsPv8XsyzoAbYvCIVHX\/eC+1xZ\/P6R0JUrwTW9GvZ0o54yrSDri4c1ESpl4mDiePdwPsKg+d9POK6UDlAtsIQCKuy7uJBrrGs0Ed4\/tRgAex6YBbwC1Xeu6c1GnjWZ7Q9I6Skd2QTASvB\/bhUfFqePz7Xi3qA0c+wHjFbVi9QSvKZPMkQnY6V885Ka5g45mo46SrJlHZGqwfYKspHwPCmluJcTAVUhWPABqyPrAGoFJRaGWRB2MlBV8eQhqVuQlWHXWPznNIB+CkCBWL7+h8kBjS86bhWf\/\/9zKwv73YNM3s1GU6AMtlSIsQ2\/F\/CerTrgSfubo2OA86Xs44Pm9c\/Klh14TcFvnTU1c3cFzcEvZosde8LsL1WN\/CWwiFx6MbzXPeW3fvw0Ob1jxwEGeaMqRfVZLAzpKVaVVUBXIP97hcq\/DxWNjenouMBhE5JqpBGSG9c3ah3\/zIKJCZ0inPZStCN\/p70nIEX2QUmEMQp09TKJOvy\/PHDmJnYYXz\/o+eLCFiELUANg4RywNXRreWlvOnIAPtRnlPluATFmcUGWPq177N5\/SNDIO8CL2CtJRcAQUIcFwTdXBj0cNJVEJd2KWMCCzheAbzcnIoGN3gTmryyef2jCEgaWdKtVf\/NzsyMez5yUxr6NFnKTsqlTM6k6XbgIoVLgJ8BO5tbo8ENflM\/pmx+6oeCah1wJ7BqmHDGzsy04KirIi7tgHIOh7mKvykjbMl5\/jd\/DRk5iPmFKIAI1ATDOEo+YyJYRdUq4FrgSeAdB30IIKRF0eZUJC5NLNCvcFCsInRCzNT0jB1eZBcYFQKUBqxUvDKPH+2AI9jYopOU\/HPRM\/7oNSCLlaDilKuWA66GodIVdIptMF5A2CVCrEUrsY1lKx\/WzU89egxlK3AHthEIBKVGhmgMOtkj9QxqPh8jY45gmbtrgBlAZ3MqYkORVhhMNLICoyxGbu3Xsv\/b7nj6Pe\/GM6t7NVnor+axqSOXAP9MlQsV\/ivwWnNr1As4L7bHBlGSai059zqCS47GteFeV8fAxNkuZ4BI4A0YuQeJijsmBIexagscQqerpkfLSjWLfTYhlvz6A8y3ZQgoE6USW6cGgS418+DDwCsozzevjd7esMYHhj3GhHlqlCJNqQjnqACdBzKH\/LqKDwP7Qfe2tTSWkBmkJ5+0rX+E2IZy1AE3AbOGNBEejOvp1fJSjsyksZ603wLpkhFxTtPAB4hsAq7CstkkJGZm2MNFrpuTmYpSLxlPAouAi4FdG\/zzadzZsv7vABVUqx1yzYCW\/VlHPG3FW5lZ1V1eYBcTOZOmlWItI\/8EbFShEx8oHzWb1z8qiubWulv6tSyM4ml0Z8d1lfRT1VCsBed9hT0jNdFLxuWSPR37gGGHJE66SnbFU8mUbuD90wiwYO+Ms\/7c8bv79W8i3Az88O7WaMdzq\/00AI8X2YVFCTDxsgj5nZt4PHFYL+puzFXc4\/lUbGOh5SBXKlzukPJeLeeoqynlXmyHVW+8irmrlszmtFxUhwlOKbyIjfmZBpQFKLUyxJygiz1ST6dWltJhnU2ABQ8WA68AnYX+QhMfFdBqRa4d0sSfHHa1X3knM6vmsCt5x\/qJiABTgbuAyuzEpGexjJpnhGx86m9QdWWCzAe5LUNw8XFXxV7XwIAmJspdkAsuv6l67rOxz0btGV0lECsyMKjJqv1xPQe0unRXnfPj0zY\/FZh3QqVTpjSnoq2BcOy51d6kcDJTsrvkCUJuNuxMoDqPn+uwjetuEU4W+iR4ipcYQgfTFG4EZqQ15Kir4Ygr6cV0CPgI2K5C54YSGtFx68o\/RfX098daPhQgKTEzgj5mBP0kire9\/FzIBR8vBRqaU9EE2d8WJxuf\/lsUVwFcltbwWydc9T0fZabX73e1Muy3CMVKbu9wI\/A1URqbU9GESiHmm9AlAiGYAnKDItf2u\/Kyg66eY66SzESR2NAP7FRhN8HIfHiefeY\/IpAUuBCYFyNlXVrJAddARifMeRoJATAF6+X\/M2CVKhcV+kt5CovPZBeWBCKzMKOfqjx+bgbLYO8X797r+RwUSYr5BVztkLp+LWO\/q+W4VhT6q438kCyL\/QrKW6LnPh+0WFh230Nu05M\/PCKibdiCPhMoTxDTIAPMDno45Gro0bJCf9XRUI31n87BShLThf5CE5Ftv3wUF1OG6PyMBl8+pRVfidyUObvdVOnT5MSRFhOTnNC+AmuvaMdElOc82fqrR3FCApgrcFtag\/kntJpDro4BJky7RM6H5ANRDisjjsSKojWCLAYuHdZE1RFXyxFXky3OnNQEWBtHE2ZSeFVzKkqp8BpCj3O4Yp1g4hkfJv0dUSiaUh0gksQMNi4ByvP48UPAfmBPNivm8XwqYmJnMXB5rEFVl1ZywlWXcs9vGnMBfUmE\/WERO4p\/Hnfe9\/1BbMTVW1jrhwJUSpppQT81MkxQyrUG9jycgz0fk82pqNDfZ0ISJwlEdLYSrOjT8vv2xw0Ld2WmyylX4cvES4MkcIHCpQo1d7X6qo8RIQhKLXC1wrUDJBsOxzUcjasY1mCi3AkO2CvwmkDnSEcFlKcrkgJzgWtjgjndWhHui+s4rpWluZiOPYKZGC8Cvgf8\/0T55yg3BVDfnIpCv55NHrzILhyCuYXOxkoj81nqNQAcBI4opZfJ8+SVemwDN3eQZNlxV02XVlDCFjAngdcx45eeZ0uoVPxT2I\/1LB8gm5UolzQNMkCtDBOWtsgW7Nm4CMvWecaYrb96FLFze+uwhvcd1ZordrupFYe1mrTfGpQSswUWiFBTsk\/lAqOhBCLSKNAUE8w96aoSB7SOLkp6ROXZZICPVNmlSr+M0LRDCKtAFgGXD2mi\/oir5airZlj9M+MsAqAGuBr4fVH+UuBbWNKi6ks\/9UJ7MuDLxQtHrn9jHvktFVegF9uYd7f5GbSez2DLr39Ypuhc4BJF6ntdhRxxtaXuKh4BL2FzLUt6NnyADijyjsIurH85lKwBWr0MkhBHurQ3PlXALIFpQcAxRl7e6PkUXIJQ0Ktjgq93aeX1HfHUmgNxHcPqW3tLjBCoR5kisIcSf64VAkXLQK8VuGFIk3VHXC3HXfVEuhcUG0P1OsIhVeLnRlC2vPHp\/yLqdAbmBXBpt6usOhDX060VEykYMdaUYy2hs4DrgTbgN5kEbzS3RkcV+h3Em0o74O\/5DLzILhwhlqm5nPxmajJYj+NOrMzU4\/lUXKhTxMZELXRIZadWcsxVM1i6G49h4DVsPugpV+KizYWAsg\/lQ+B2YLYi1MogtTJU6uZnAKFYEHKWc+wG39oyVmx8+m9QdVNE5SuDmli6L26YGsVTgm6dUJm7yYJirRVTsX2FF9nnyOb1jwCIqkwVoQm0sVvLy\/a7erp0QrVMZIAPgHeBgZFmsQMNkqCXgFwrMKNTK8PDroY+TU6kczUeBFjr3eVYQPxeoA1lo\/D\/Z++\/o+S67jxP8PO774XNSAvvSBh67w1IwlGkJIIyXRJBSdVdRiVQU13dvTs9p\/v0ntmzu70z09M7vd0zs7saiUiWaVMtEaAcySRVIgmTIEFRFL0DAQIJn4n0PsO9+9s\/bgQJsWiAzEDke5HxOSdFHkLIePHeu\/f+7PfH7zw4sml71zCQ31lPfNUUkU5zRBwfJ1i0mOo+h7LwUw\/O6ahT5xMRYR5OVGdpXv3YaZthUBNRHt11HPgNcAKlsCviAiQKqugEwpu4NW0BjCitJktCItw570goLFOYr0p8\/d\/Wy+sqwZ6ntiFqYoL5UoC5r882Lt0fLPT7bCrKWgtzGR\/nYKcR\/Hq\/57lgAPFF7O2C3lJUr7E3aJQTQSNTGvGGm99nHHgDOAYUd07z7BM180Bux7WQJQt45PDqgblzw+Ds\/nuBvwD+Oa53+zZg2cbtXamN9YkaNUM9kz17lPuxW6r8uTlcSdkp6v3YdT6F5x9vF6u6AuQqoHXUpkyvbSCLH1XDI48befUqMKYRVwUDWP\/lh+h8sr2IcBQXNFsNJAzKAjNOo+QYIkEQ3aCI4HraViDEPTeqNvLPbbYRlbiIXKEq\/2hSE5ceDBbET9hG8lWVBalTYTygDcWf21OUzg0rgRg1bSB3K6wY06Q5blsY02rq0J53FOgXJ5I5YKaRxX6p42GKiAmQ5TjncAngNUoh6gKbs0V5MkA5s303ru3rTXE2ytubtncdw00BmlKwUU8KzFUia31FHXGR50txomfVOhZdP7bqO6j2E\/Fy2Trnh71PbgMhDnIFcKkiyQGbkQGbphjNHl+L60fbjevJLu56oDYOrNIIsn7cAa2Ak8mVLMvNaHRDIh8xD1guSlyAu39Sz9LNhD1PPOKBLELlOwX1bjwRtKT2F+czpfV4e8RJ4jRebN3HPnuMSgL0YpzgWabPZuR40Fxrwn954AOFV9VltKd1KCjExTmFV1GahtMmEySk3p0wQwzunLsVl9H+l8D\/BfgzYJPCYgv+unqFSiSpn6yzwB07ugR0MSqX4g7HahHgImOn9z24Kjvb96FO+Njb0Q5gFF0EcjOwwCLmhG0mwv2aE8ArwGvGMvnst2rDwX7hF+1Yl5UYAY7gqlSSAAmKLDcjvCcLyGlqti91JiSA5QjzUHqeq5FnNxt0drQD2gLcFWC+PGjTbW8XF8uAJqMfipnblLNiKVW0nvE6Ozo72gVYANylcMGExr0Ttom+aO+Xn8QgrlS8d+eWVefsEb\/U8TAFBIvEcX3FDeU\/S5scF5lBuoMMuXolTCVI4cZWLsOJy20WOODBbwRe3bS9632FwV3TeI51ZoeaCtdFiDguctVWxc9UIItTFR+e7RtQJ5woiEJaRa7ECZ6ZQZvmmG2M6iEa4EZd7UU5XisONsAdX9+KigpoFjhU+gHAiKXNTHKhN0ws+gUrKxQWqFc\/r6bL3sfbQUkBV1vka+M2sfpwME+O2aaoBs7qfITiWr+MQOruR+sZr89jnxM8i+M0R9YX1U\/32wzdtoliba2HAq56622Byen8gls3fx8LAhrDvWuD5T\/zsFzk9bHGG2KaWmp1Ppk4To38RuBB4F8q\/AvgjwRu3rS9q2W2L7DO2VHPZM8OCVwEtYXqloqPAO8aw9HZvgF1QovBBX+uVbggpz7dQTMjmkCRqB2k5XF17wIvB8LQbF\/QefiKCpIHPQJyEFfOlxKUjGS50AxxyjTSbTOzfaHTxeCydItQEkzTUJzrqEcMuECR9TmN3XjctqQPBAuY0NhsX1qdylDA9WUnI7VDzxLWBSTmK9ygyGVTxOKnbDP9tqG2XGxXxfU28B4uyTIDpIDT\/tgP3A6Ih6XVTHG138OoJjlpM9GyEKKBwfXAb8KV6t8NPLdxe9cv1VWwFXfXq1dCSz0zMDtkVLkQaK7iZ1rcyK5TwNRs34A64eOZv\/vfKEWrlwFXK2b+hCY5bTMlRfHIHZ9FXBb7FRW6tAaF\/tZt\/j5ipQByCids0wOoAAkpssgbY7kZJRXdvjnBzcu+ACVZVxg\/d5771Q9E0WbglqKa9QO2YcnhoI1eTdfVxGsHg1MXrz\/Qs8CqJNVp4lxXxLQO2hQngkbGaivopEAf8CbCSc9M\/\/xbt\/khxdmNhymNwCz\/WVyKLDfDXON1s0Am6y\/g+cHgREBXA\/cA\/0LgRwb+sREu3vhYV3zjji7ZWO\/bDh11J3sWUGUBLuNUTdGzADfmpxcX9a5T5\/eIF9JlNec1wOqCGn\/QpunVDEU1UTw8J3BZ7FeAgc4ajfbe9ZWtVpBBnPFzkFLGwqC0yBSrvCEWyQQRHUhTni86H4gZL4qv4eziB\/GkIJcqbJjU+OUnbHOq2zaSi+68+zq\/jwCx0k+RSG7VVUZoBa5T5NKsxpKnbRODmoryeMpPIo+bJPMBytivvzmz+cvrNm8t4EaAvYDLjOfBCW02mBwX+f1c4\/ewMLpnTVTwcaXkdwDfR\/kLsawVpakeZAsfNbWjRIG1j3YZlMUgS3B9F9WiAHQLHBOZadlQndpEfJBFuD61RTl8+rSBIZuM4hgoiwsovQrsx2Niti\/ofHLkt2smUFcWj1MbtwAJCVhiRrnQGyIj+dm+zOmSxJWMN9ZNiHOjs+NhEVgoru\/09l6baTsStMigJutZ7NrCADmk1lqKK8+LHQ8bYAVwg8LyEZuKdQdNjGui1lzDYeAtnKNdkc0\/jh0V9LfArylN6gAX0G02U1zm93KVf5qFZgI\/+logYScJXAJsAb4PrBdoXf\/zLln\/83pGOyxEznKuARK4KFQz1b3\/OeCIwnFjKrPh1qktRDSBK0e6SpF5ozZJr00zQSyKxkcWOIAroR7c9Qczi+KHnX\/0rzfii54A9gDv4NY7oDSbSS7whlhoJogRybLxGE4oslnqQ1nPEZMGblLYNKLJC4\/atniPbSRfH9lVixQEfIlgX081KappBK4GLi+o19htG+WUzdRiZccp4DWUHrQyG\/9tm79vregx0A7g73DtWAE4EbRWM8nlfi9Xeb0sNJP1jPb5xwcWA18F\/nuU73gFLvQK1FTfQ5Spn7TVJ41zshtm+ovOkTxOWXzE1A3VOp+IpICLBV2d01hqQNMM2jT5aM7GHgReoiKCL9Fg7eaHip0d7a8Cz+CCJWsAz8Oy2IyxwozQb9MMq0Gjle4yuNaapLp\/r6dIPofdTj1ZFF1i4N68xq49GbQku4JWxjRePwBqi7K6uKri7XygNttiZspLHQ8DkIPlwM3A8nFN+ieCJkY0UWuVHTlc69B7WMZ2frtyQebJ+ES+IZt5F+FnOHv2yzhhLuNhmWcmuMrvJiUF3goWczJoJF\/P551PyrolNwFLcSPAtm\/a3vUeML5zy6r6eTmL1J3sKqMiTeIWQrXlfrPEHdepAACAAElEQVTAcWBy19frh3Cd3+f5x9vFKvMRrgaWTGnc77cZxjWOjd4BGeAEWvaKcEpqUPDsUxEZQvVZ3IG7GGhShLTkWOkNcTRoYVzjFKJnUKaAjDiF8bpw4+dgEFE0A3IX6F2Dmm47FLSZfpuqNWeijsPi1MXr8ZNPIUAIkBiuHeqGANN6Omgyp20jheidcZ+F4vR33gFO5rKVLV\/68hf+OcBk51Ptv0NRXNvjl3G6GSIoLWaSq6SbJsnyjizmcNDKmMbq4wLPLwYnWvstYCHwU+A3m7Z39WXiBI\/X7f5Zoe5kVxlxWew1uEx2Ncd3DeB6aOql4nX+HtbTGMjFwJVA45gmpN82MKWRKxUvv+svAO8+98Cq3GxfUDURVYubl\/2Mwg24fcYTYKEZY4U3wmltoKDVlIOYMT6uJ7tNiOaw9mrS+fQjoMSNslrhG1MaX3k0aDXHbHNUZ93XOXvq5\/unYJ0TshC4UWFlVmOxI7aVEU3UmvOXxWWx30IZfeFPz49zte6+rRN7Oh75jShDiI7hSpaXAL4iJKTAKn+ABsnRIpMcCObTZ9MU6kXk5xPBPYPNuBarFoGnJwv0Ua8AmxVqKnwXEZYBK3G92dWigDO8PxSqqFPnTASTAK4BLhTwT9kM3baBXPS2iALuPX+OM8aMzBXu2rwVK3ZK0edBX+GMUvmEFLnIG6BZckSsY8TgMtlpBfuFHXVRl89CXenJAoQvB2pu6bWNycPBPEajFVipc\/YILrhYALLr6mPuPpHS2K4rgBsD9Rr7bQNHbRPZ2gs8jeEc7Pc5z61S6zd\/L4\/13lbRfw36v+Ky51OAKoKHZZE3xnWxU9wSO8mF3ijxaOqCRAkBWoGNwD9R+BOFNXfv6Kq5Fz0KRM6CrgGW4hZAtV748nzDk8DQvi0rZ\/v71wkZnR3tomgLsFZgXlbj0h00MaLJqPXuKjAC\/FaVV1Xn5qi6vJ+1ip4EeRzoLt0XBKXVTHKBGaV6RTQVQXBByQYBXyMVH5gFVBOoXqXK\/ZPE2w4HrXLMNtVUmXgcS7PkaZYcXj1BAy5LNamWvFc3pf8ev+34EQgtwI3AlVli8RNBK6Mar7UsNrjg8ns4m++8e7TrvvqnCtoP\/BfgfwVexJ3DFkrK4zLFFX4P62NdXOEN0FBrBfrhJAlcD\/y3qvz3qmzYuL0rU5+lXV3q5eJVZO32IylcJjtZxY+1uE23Z9+WlXVrpM7vsadjG4omBbkcuDpAvAHbwDCudzNiGc88TlF8LzCy68G52YOUyqZRQ06F13AKsH+KE0ZBsDSZyWg9VT7s+8uoktr54KrR2b6gMPL8k49gxXqgq0Duyat\/XXfQ5B2zrUxoDInaU\/8YAhgsC2SK5d4orZKlyWRJSY5JjdFjm+izDQzYNKMar7WZx5+FxWUsp8QQ37llbrXIfB4vPLmNPJLAVRDeZJEFAzbNcdtMQb1ac7FzwBFgvxXGd2+p0hmooqj0CzyuwhDwDeBunL0LQIwiy7wh2sw4S4pLeb24hD5NUYimsGpUKLdIfA1YIPC3Cs9t\/ElXn3jYukji+afuZFeXJly\/RDXr9gJcj2rvbH\/5OuFiz5M\/pNTjOg\/Xvzs\/qzFO2WZGbTXjQBXB4sRefiPCqxJ1j2IG3PnVrezpaLcCfTiF9XXA1QoEGIoY4hJEbWRNDEgi9dEkn0bBK4ixpkmQOwJk3bCmEofsPE7bDFHXw4phaZQCa7wB1ngDLDATZCRLTAIMSgGPC+wII5qiO2jiQDCP47aJYtTChNPD4pyrglBfHx\/HIkahDbhekUsmNe6fsk2ctulaC8RYoB94HThqq5DFLrN+80MA+nzHtiGBp1XkfYV3UB7A6bykwFVTpSTP1f4pmmSKt4pLOGqbmVA\/alVzUUJwvscduGqwNgxP4ISQ64m380zdya4urbioUozq1GsqLsJ9Cuip9C9f+5PDAIJIDMETIaFqmkENrkR9Apjct2VlvQknlPjgynBXAddZJDauCbpthvHoZb5ywPs4wbNTc31W7PrNW7Wzo30Kl9V4Hye2mA7UI1CfODZKIljlvTIGePc+1iW\/\/mZtzz2fDr71E8BVFjZOafyiE7bFPx40Mal+pM3XGDZYYiamrvJ7i6u9\/vEmmSrEJEgImsZVaMRjBDSbKZrIstiMssof4HAwn\/eKCzltU+RrW2xJcftfvt5K8fdRF5i7ELg5UFk6ZNP02EYmcaKeUV4bH6OAc5zeAgY6q5XFPoM7nbNd2PP0wwdQ2SYi76B8B7gLl9U2AiQlzypvkKQUyRRzHAra6NcUikTN7ogK5TGYt+CSKgtQ\/uvGHV2HgcKuekb7vFF3sqvL\/NJPte674kQwDoOerOQvvmPHEQGSqizGGfCXqXIR6HzcZn8SZ+AfW7v9yGkV6TWiA0D+hW+urNLXr\/NZiCBAM3AVcKlVMRMaZ6w0MzRCxofisrb7VHhPIVc\/NMBKUDBqhkEGgawi6QIeWfWjGL4WnFJ6InDCXvXA3RnsfbwddQHcDQHe9YO2IdNVbGNIU1E2WdVDJ5old3C1N\/j6Gq\/vvRYzddLD+qDLgEuAq4GLgEZBjaAkxLJQCjTJFG0ywZvFxRy1LbWeLSsCBaS+Ls5k35PbJICMwhUC1+Xxm0\/bRvptA0U1tfY2TAEfAO+pS3DMGuu\/\/H3d8\/S2EZS9CCMoJ3FjvtYAKQESUmCFN0STZFkgk7wTLOSUZsjWXgl\/WBBcRcHlwPeBNaL8J+DlTTu6RnY+UJ+nfT6oO9lVYu32IwYnetZGdUXPRoGTKCOV+qV37jhiVJmnTlThXmADztApZ+gTfCSqNwa8LarPqPIM8PadO7pGn68v6BCgBhf0uUKQJYpIoK680qBREkoq4tTzXxTllNZD4QDk\/XyQLKQ8nAaEgBBgCKJZIpkAMoBff7ifgJACrlbkjglNLDsWtPgnbSZqLQFnogYdTRA83yK5v11ixjtTUuj1sL6o+ogkLTpP4GLgZlwp5FW4\/ayULStwoTeIh8UvWg7ZNsa1Jqupyw\/ZOdp1PiRAPJzddYNFlg3blH\/CNjFUCiTXEGXRz7cUDmsIRrmt\/\/JDuufpbWPAqwLDqPQAD+Ba0+IAHpY2M0FjLMcCb5y3i4s5FLixasVoBfqjhIcbJXw\/rrr2xyh77t7e1W2E4jP1BEVFqTvZ1SOFi7y3UT1Vd5fJVu3DRTlnxB3bu1DEs8oy4IvA1\/mo\/OTT9sMMblNdhCtL\/pmq7L19R9fAi\/XFPMuIAZYDlyk0lR+gRC\/fMwS8DLyHMCFad7IB7r33n9HZ0d6M23NioAQqFDBRVNRNwYcZ7HqA7mOoxwUomwLMFaeDTPpI0Mp4dJWTVWDUg50x0W0+5vmtX7t\/vPRnZSdyDFe9sr\/zqUd2o7oLN6d3E87xTpUd7Qu8IQQoFg2HglaytWf2GD6aIlJYt72L2SgVDiMqJHBZ7OtHbLLxg2A+J2wTWa25dyAPHAZeFxixIWmXWv\/lhxSY7Hyq\/T0V7QcOi8oDuPFSCykFiOJSZLk3TEIKNEmW94P59No0+ei0NEWRcp92BmhTeDpQjhKCAE0tUXM7TYhpxs1obKziZ5aVxftxPVszQgSjVpcj8lXgW7i5yg18dltTObO9CmfsL1BnFDyLy7LXmT0EJ8S3CIgZsRixKE4sNBzH9OeiuHElLwCnsdidc1RV\/FNIlX48g1IuFI\/Go\/09tPQ\/seCjucBzns6ObdiiiaN6I7Bu3CYWHQrmed2aoRBNA7WckXvWIn+Vw3\/h\/\/jmteOf+TeMGSMIfgucBo4BD+LOphS4+fAXeEMU8JggxvGgKarVHJ+GxQUfpiKza59nXuv4IXmM5NFm4Nacxi45Ytvi7wfzGbKpqAafPg2LWzOvA4d3bglfleC6+7YGzzzzv\/fEC6mngYPAG7gkzVW4cn7xCFhgxkn4RTKS553iQo6X5pjX1NMKD+V2wdtwDncL8NiG7V0HCkrxhbodVRFq6qQJOfOBFVSvVBzcgTuEc7JnHJ1SyCByO24cwNk42GciuEV8J\/DHonLb2u1dDVW8F3X+PoKLYpZKt5x9FiCoRuJYU2AceF7hdatMhCWCHwY6O9rBORoNgCcoDSZHg+SJRc\/MLODKgH2\/fm4B8PjufwMQM769Eri3gLfmWNAaPxq0MKV+FBdCub3pRYUfB\/CbSfXGP+8vrfvSd1m3eesELtj2E+D\/AN6hlPVWICZFVnv9XOn10irZWhNXKuLO96KAV89iwzi+FJAUyLUB3p3dtqntneIi6bUNtVYmDq665xTwGq66I5Tcc8\/\/ifX3PZRTlfdRfgz8CNiFm3wTgCsfbzGTXOb3sDZ2lCu9PpolPzdmBMweceA64PsK\/63AnTEhs6E+T7si1I2V6rEIVx5TTSxufFc\/7iCeEaqyBtd\/fQVO1XU6p1UDcCvwBZCla7d3RTLdUkN8eHoJigEkOoIwBWA\/sE+gT8HWj+Lfoyx00ggYRUhSpEWyGCJXU6+4AKWN2oWfL5om5hmFFpC7AsxtQzbddCCYz5AmoxdCcUzhlJF\/AuxVZWT3lgvP+mmv27xVEekB+SXK\/wz6CmdUcMWlyGV+L5f4A6RkxsdhmLCUhQAj1+lTefY+3g5KXJHLA+RbQzZ1yfvBAnPcNpGvTZM3D3QBr1vL5walZpsgMEVVOanKk7iA2FO4KpQASoeWFFjpD3BXvIu1sWMsN2PUXBd9+Fgq8IcC\/8Io9xtYtHFHV00umGpSv4HVYxmuXLqaFFHtBQapSB+jXI8TmZlJX7kAC4DbgUtVJXHrj+sRs2rz\/C\/bQQlw7QQxwCjgR8v5GgE6gf0q5Pc8uIo99RKnM\/GAo5yhx+BLQIuZIoL64jFcgK7uRpQwmKQglwF35dRffixo807ZTFT7GAOco9ChsFdhsJA995d03X3fU1tkBOEZkIeBdzlDDCwjOa7wellqxqO4Bj4L\/dg\/5yxqMAjLFfl6VmNfOBG0NB4szicb8VF2n8EYrgT7pDHhV5ff9LXvsv4r37OKDNqi2anw\/wIeBt7EqaIrOPHVVjPJ1X43a2NHucQfoFFy9az2+SUFrEP4c+AboqzYtL3L31TPak+bupNdPS6k+v3YYwgnEEb3PViJubJ6bel7xGf4iwywGrgakYzxTY2efeFGVCwqp3Bl\/AIugmyFKMSMCzhF8T2inPKC8BsX1SbvZQN1o\/t6OSPI1iQ5miRy2iYxwCLkkNryjqbDix3bRFxl1EZF7hrUdPqDoI0xTUTVBO0Hdin8nQ04XswSPP\/H0wuYbfja98DImHO0eRyXJbPgqnUWmHEu9fppqJ1stodzTIrIzCvWoo44xeSNBTVf67ONiw4GC8xAtEfZfRYBbn\/fD+HPYp\/Jhvu\/x4av\/Vlh\/eat7wdF739R+DfAM0APH1ZeKmnJscYb4LbYMa7ye8+oxKqxpo\/wkMEJGv9j4Nu4DLe5Z0fd0Z4OdeGzKrB2+5EYTvgrUcWPDYCTCB\/se2DVjMZ63LmjC4VmVVZzbn3Yn8U84GLQNhvY0PYR1SrWB1AfZ3zGAVEMvgQU1FDEhDlirDjDYp\/AO889uCo72xcURuJBApyxcgCn5gpAUvI0mizYFiKU+LJATsDz5rht9XzHIxShAfRqgTsnNL7wRNAiPbaBPF4UTc9J4CWFXyrsHz9F8ZX\/boYVKaoAvQhPolwKfAV3dhEvCaEtC9oYDeZF7279fYTS+K6dW1bN2WDj7icfQUR9Fa62ajYPafqiA8F8rytoIaAyRksIKQBHVDgE5HdFdGKL8YMs8Cucg\/0N4B7cWNiE4DQVlsoIzbEsi2WCt4JF9No0kxqjULJUavT5zhZJ4DLgL4DVCP8hUA5RHxF4ztQz2dWhBTcqqVookAWOGLdpTZu1j3ahSgLlJmAlM89in8kigXliJJL1jRFHcM+yCSeORxHDgE1HQZU4jxM52ovLUtX5VGQcN9plrPxfjCotkiMZraRXHtdznwp0bp9bFvUUXaawsYi58rRtkiNBGxMaJ0JBkzJF4DDCEwiv796yamrGDvaZv1v5ANfzeZAzstkNkmO5GaZBCtG7Y5\/0Pd15H6zf3jVnfQ1xGf0LVeVLUxq76UjQljgUtDFJzZaJuxGtcECUUxLhF3n95q2oNROq8juFdlyv9m85Q7BXUDKS5erYCe6L72d97CiXeoPMkykSdUmC80F5xvwWVf4dcO\/GR7uaNz42d\/eY6VDPZFeHBcDiKn6e4npbTuEO3+kjxig6H7gLt+AqZeAKrqwrI4JPBYTZ6pw9pcivh9sD+hRZMWHjnAyamdBYmI8qiystfQ3Yry4LVucTENdmb0EHFLpx+5D4YmmULEkpMqV+VDKfBSCPUtRIXO754YWOdrGu7ehaRW4d18TCY7aJHttAgcgIFpZRnCbEHpQ9Rhiu1C9ed99WAO18cts48Aoie4ELKOmiJCiy0Iyz0EwwEbREYwV8OgXcOW+N29Pn3Fm658l2I6LzgS8W1Lu7z2YWdAWtZtDWbJk4fCRs+x4wtDPiqvIbvvJnCmQ7Ox5+D+QUyAfAA8CXOMP2FKDZTHK5FFhkRum2jZwMmunVDKOaYFJ9ih+aqXW3e4YYXCJmPZAQYT6W5zbt6OrZ+cCqObfPTIc5nRGoIotxBm61KI82Os2M52Orjxs9diWlcrsK4Zd+ihKNcVE1hbhbbnDPIBdgGNYUp22GPD4hzohN4hSI9wE9O7dUQmugNvGxCFrEBSU+HJMiKHEJSEkxzC0BH6dceRFR4ezKECCeuv14Y1HNmgHb4J8OmpgkkiO78ri1\/EvgqDkPzuG6+x8qgpxA2Qu8T+kzfLG0mkmWmjEaJPIVkEHpR80crZoVoQG4RWHzhMYv6Qra4qdthkJtm7hudJfwnki0+rE\/i3Wbv6\/rNj80DLoL9N\/herV\/BhyhVK5sUFKSZ5k3zPWxk2yMH+Le+Aesix3lav80K8wwzZIlJhaLuJNwbi6NSlAe9Xor8GfAH6Cs3FSfDHRW1DPZ1WE5rmS8WlhgRJyTPVOFoxSun\/wCKvu+GNxM1FHmYOR9thFF1GXElgHNOfXosw30a5pCeEd4Kc5h\/C3whkZM6GU2ULSgMAIygMt2ZQxKkiKpUjdbBETuwO0XOVyQJYL+5Mx5qeNh8mgDcIPC2nGNtx4NWui2mTCv2U\/DaYbArxF+h5J\/5jz1k4oyoYYDuNnZlwKtgkqD5FloxmmRLJPqRz16YwHVOehJdD71iI\/qSuCLAd4NvZrJHA1aZEzjtb5RZHF6G0es1GSvbAE4rOiQwNsgdwNfxI2QbaQUUPKwNJtJmphisRlitSYY1hQDtoFhTTOqCUZtgjFNMHFGD3edc0JwGe2bcA53M\/DTL+zoOvjsDDWfap2aDvOFgbXbjySBNVS2l\/nzUFyfbT8zd7IzOCd7IVS0Wdfi+sWHoK4MXW3UBUyWAVdZzIIxm+S0zTCm8TAbmzmcUfE7oDco1IMzn8Xtmx\/CogGub6+f0igvXwLiUsCXIErmRhzIIkxFpb69knR2bKOA54GsBjYFalb120zsuG1mVONRy9IoLrj6IsIuaxg5n6Wud31la4DKMeBVzlAaT0iR+TLBfDNJQiJ9BJUFLPNzU3lfm4HbgLWjNjn\/aLHVDGiKYrTWxLlStp9eQxkSW3vPfd3mh8h7uWJgiv0oL6H8AOSfAP8K2I4rkx8BCopYgKQEzDcTXOQNcFPsBBtjh7g3dpCNsS5u8U9wqdfPPDOFh5ay23XOkRRwDfBd4B9b5dZNj3Zl1v51XXn806hnss8\/TbgscDUJcL06A8w8S9wELAHSFb7GLC6TMbFvy8r6XldF9j7ejjqn5RKBq\/LqNQ9oA4M2TV5Dq05czmK\/oG6eZrbzD6Pdg1YlLM4QKVeMqEHFR4lho+RkW2BUYM41l+x+6kegYLFJ4FZBbpkk3nDSNsuAbQhzUOzTyOPG7z0rsN8E599BUGVEhLdwo45WABkpzeFdKOMco4ksXtSCFWVilDUL5lDAurPjYUB8lDXARous6bbN\/hHbxqTGovosz5Ycbg0dQCjsjKiq+OfxhS\/9U3Bnf37Pk3\/dh9oBEd0P7MS1MF4PXIerUFmokADxAM9gxZNAYlKgQbIs9EZZpQn6bQMnghaOBq30a4pCbb8n5wMPJ4K8BZiH8ONkAy9u2t41sHPLqpoL9syUupN9\/mnDZQyriQV6ER1m5oduCy6LXenxY+M4MaYZ9ozXOWcEQVmMcD3oiimNxU7bDEOaOkMwJFQo7j3ZD+y0cMLMIWNyJqzf\/H32dGybEOdol0utJSlFElLEEwsa+tYqLV37OB\/KCcwdRAUVjYGsFJX1RcyKAdtgjgUtjGtsti\/vXFGgD3gRV5EyXg3BpvVf+Z7t7Gh\/FxeguxkXNDZJybPMG+WobWE8iJMP\/2SFT8LihE5zuYnoRM1mjhicbXKHIjeN2FRTV9DCgCai0gIzXcqVIG8KHFOtvSz2J7H+\/j8FsHs62icEPgCOgD6nMM+oLAGWqnARzvm+DLhAkRYg5oklQ5aMZFkkY6wyQ1zk9XPYtnEoaGPAhtb2CTPzgC\/gstsZYPem7V2ngSDqInyVpO5kn38WAIuq\/JmBuFKiEWbujLQB86l8ufsIlekZr3OOqMFDuQS4WjFNQ5qSbtvIuMbCaqFZXEBmF\/DBnjk8C3Z66CTISVz1iAI0SA5Bo5TtySIUFHROWJRnIGpAaQLWqnDNpMaTp2wTvZqOojNRAN5XeI4qOwhFrzDsBf5eQe7BnclGgMVmhCVmnG7bSEG9sO6Bn0Wu9BPEEghzRrNAEsAlwIa8ektO2hZ6bCP58AcNZ4rihCzfUGVA5szzdqzfvBVKYn+7nvphTlRGsd4RDHHQZkWWC1wOeiPIXbhK0oy698WIKBmZYpXJ02onaZYcrxcX02vTBHVH+1wwOEd7A65HPgk8rXB6w\/Yuu7vuaAN1J7saLMW9iNWkCJwUF+2c6Qa8sHT9lX5XBnAHRV00ofr4GG4Q1TU5\/ESvbXSCZ+HN4kwCbwPPqHtv6pwDKhqg2iMuCSwAcSkSd1pJs315Z0sWSx4oROaKK4URg+oygfUBZtmwTZuTQTNZjeTx3Qv8RlxGecJW8QX0i74ish\/Xm30ZboSkJKTIKm+QA0FbKdAYycCFBdSLzQ0nu\/PpvzRYOw+4SZHrxjSZ7gpaGdBUFNsnzpUicAynlj9p51rU8Qw23vfn4N533ft4exZDDqEPeAPYgdKGcDdwD66CZRnO4TYeljYzyZXSQ0E9JnUpo5qo\/cVTWQQngnYHLhnXAPzCQPem7V3Feka77mRXgxW4l7BaWGAc0R6c0NG094z7nj4kw2MsxWWzK+2B9VGZnvE650DnE4+IKo2CflFgyYQmvG7bxLgNrRJrWYV4L07opB6UOUc89aSkxD6B2x+MAE2Sj0qHs+L2smHOyMbPIZqAmxRuzqqfOWkb5aRtjOJ4Igu8jlvLvUCVsx2iuDNnJy770kzpXJtvxllhRum36SiWjH\/oZM+ZhaE2jnC5qN6ZU3\/xadtoum2GqWgGns6Vflyg6CRCcde3644MwF1f3Qolhxu3HopAd+eT7b9AeA24HfgycCfOITSC0iA5VvsDHAzaGNVKd0XOGRLAVcD\/Q2A5wt8Ahzdt78oBzGVnO3KndARZQuX7mT8LCwyK24gLz89MEENwQYJWKv+u1JXFq0znk+0gGhf0KuBKi8QHgjQnguYwG5Y5nEHxHDARCZcwbKgozsE+TSmwqkBGclFx1ATwEQxCrvYTVR\/78k7YaV2AWTpoM96xoIXhaBqDQ8AuhdeLMFmocrBk3f1bUTSHy3K9zBkB3pTkudgboCm6M7Ndyfgc6M\/d17ENlEaUtcDN45qMnwhaGNZUFKsQzhUFTqrwtgojGlKV0jCx7v6t48Wp+Dtq5b+i\/L+BxzijIk4BSn0rEWy\/CRMGl5DbivIvUa5VSM31FzQSFlZUWbv9SAZXPlHNvuM8cAKYnImDfd\/ThxgZ9zK4iF+lLbpJXHYyu2\/LyiremrlLZ0c7JSdlCcK9iiTHNcFx21wy2EO5FRZwJXE7FQ7s3LJK53JEdDo8\/3g7pWdbxDnZJZtC8KVILBo2eYDTcOgH5sw7sOvpH7LnqW0Nit4E3JhTP3XcttBrM7N9adOhgBM6e0lgWEH3zsJzFGdEDwLPA8cprQcB2swEF3rDUVLch\/LoLphSqf218XzHNgIkIXCZwC0FvAWnbQMnbCNT6od1MkYlyQFvCxwUKO6qUVXxSrDxJ11s\/IkbLbXpm39MUPQnVc3LwA+BXwg6ajEM2AyHgvmMarLuYleGZmAz8BcCt4mS3vjY3B3xNSdqa2aRJlxkp1o7f1mF9xSurHLaDI95guvHzuBGhFSSMerK4rNBAjfq4vaievEBm+G0baSAhNGwVJxjtRNnmE\/O9gVFkTu\/upXOjvZyL\/ZE6SfjMj5CoxSiUGIZ4Paz0dm+kGpirOcLrAJucVnsBu940BTVksZh3Fr+QJTC3gdnyTmwKIYp4B3gFWA5kBSUlBRYboY5Ks30aTpKDlsAjMscyGIHiBGnEbNe4bIJm\/BP20aGNYktjc2oYRRXDfIacLI+YePT2fDjLlQRMbDp0S4w8D8G+H4xSGyKfdB\/o9+ze0yTt\/bbhmuOBc0cDtoY1zghTTZEjbIg2mbcFIcErhIxsmVCMyH01lXEacOpi1frPpfLQmfswKqIL6qtfNTvVcmqh2FcT15dWbxKGNQoMk\/hWkXWTKnv9dhGBmw6rNHbLK5\/cxdwdK6MKTkfiIIKAS5QMQZkFOd1p6QAmprtS\/zcr4DLxE8wh6wgQRqBWxSuyWqs4ZRtps82RKXE\/0yywFvAi6L0z6YzuO4rW9n91MMFUTkuyMvALbhABjEJmGcmWWgmGAqSUSkdFZyzNUGNO12dTz2CWvURXQ1ssOotHta09NkMOTzmwNZQBA4Db6OMmhBGxsOCMRiFZoGLRbhElQaUQhGP3YWLlr5WuOCWjOQWFfAY1iST6mq6IrHio0G5dPwehCaxzLv70a6\/e+7BVf2zfWHVpu5kn1\/OlzL3p2FxRnSf6swcWEFBsCgDOCMpXcHrHMAJn9VFz6qEVUkiXAxcHyAtw5rkeNDIiCbCGP1XnDr+r4C3VJncNVuZrxrAoNYiBXWBtwJQymNbJBqxiwC3ZwwxByxpgM6nHjGoLgVuU2TloE3HDwdtjGloBQo\/jbJwYafAoecenP3xexvu+77tfLJ9BOEdYD9ONyXpYWmULAvMBCdsEyMaj4LRLbgzf4gaP09VVUSkGbhJ0MvzeMk+20C\/TVNUE4VnNVNGgTfEKYsXfv3N+pn4Sdz+6DGjErQKbAL+oboxb3GcHZ7Iq5fqJ5Uc0KQHzAU1+tmirDy+DmhTYd7d27ueCAKO7f727J8D1SJyIfGosHb7ER83vquJ6t7nKWBippk\/gQBlGFd6XukyzV7qyuLVRWgBrla4JKexRL9mGNA0+XBuARPAb9SVl56ul8XNDN+oVT7cD0o9qFqSYJUomBgBbh8anu0LqQadT7UDmgFuAG7Kq996wjbJqehlscuVVW8D+8I1fk8nQQ+Dvot7r7RcMj7fTNAsWSI0MXsY11pTXP+fa7P3sbOjHQGj6AXALSCtkxoz3TbDsCbmgqNkcXvgq6r0UT8TP5FfPv7j+PV+39IYeg\/wJ8BG4GJctcoFwCKgSSFuEW8OvDdhIAlciQt4PGA8Lt60oyu+aXtt7lUfp57JPn+kccrcCapXhaJADtUszMzJNlgbYIaBLlz5+QIqM8ZrCheJHZ\/pNdY5O371Nz8GxpcC1yhm6bhNer1BI+Ph7e3sw\/VLHlfIP1fPYs+IW+\/7Pp0d7YozzIo4EVVPcdkfg4a9NLYInFJlnLmQyVY8YCVwp0Uu7LcZ71jQVippDPVz+jhZXKb4WVwPdGg0ONbd\/5A+37HtlEXeBNbjShvjCSnSZiZpNVP0aToqs8gnUPJzQFk8IXA1cHWASYxomn5tIIcXrVUxPfK4tfSWMUzM5dnYH+fljh9QxJMi3uKuYupGgVs99AtF5Fog9L1Qc4Syo+0BHsrPgUPMgT7tSIXFI0YjrgwtXsXPLItFDTHDl3fvA6sBHQPeBQ7gMhIzpYhzsN8Fmagri1eH1ILJFHCpwBVWpWVIU6ZPG8hpKMd2KS4wVSz91L5TVQVUmcI5PQVK07EN7rQLeWuflq57XOZAUPjFjodF3NlxjSI35NRvOha00mMzBNE6rou4KRc7gd0KfWFTvla8CZC3gYOUhEIFpVWmWCwTZCiEfW2AW8+DIox7PjZeoy6FFVsWU7oJWJ7VmOmzGcZsNXMYs4biqhXeA7rHhwl21gPPALz\/9L9nSuP+mE0uP1Rc8OChoO2\/G7TJ7wfIzdQd7DAhuMTjlcB3gC3Amo3bu2r+TI\/UqR0xWoDFOCe7WqeAxY0n6acComIqFFT0ILAXOMrMo05juDEub1FXi64idiFwncKyHF7spG1iwKYohnP5Cy7aGaAQNsM8qphARnGOjweIoAiKRcI+W9bi5qNPGoOp9d78PCamLot9W6Dmgn7b6B+xzYxrLPzu3kcorjR8L\/CUwuHiZPgyFndt\/jNV1cO4LPsQpcqqlORZYCZolHwUSsbHgIMIg4A+U6N9ukYlAawGLlckPaUxhmyKLD5zIA6bA47gEh4jv9lam8\/4XHns8Z\/xev7C+CnbtvxgsOiBd4JF\/+h9O+\/2QU0uKCKhzCDUIQFcDnwX+BOByzc+2pXYsL0r1EbITAillV0jJKlMefW5YFHtxznZM+7ZefGBVSpKP+izwN\/hBGym+3tzuNLz3QIHQevK4lVCnPDH9YrMG9WUOWEbGQ936Wm+5Pl5d\/+4djffaqK+5nEBvzRgTMnJzuKFvca0PLamnxovLevseBhBG4HrgJuniDWfCJoZsGmK4V2rn8QU8JpChypvqWVq75+E0zEQsWPAi7izrQgum73IjNJmpohJiHfJj6oF3lVl5Jlvrqpdb1MlA1wusCzAeCOadJoiOidKxYdxkzYOoDMbzVor7HryJ9Jn0+mjtu3S94vz\/+GbwaLvHgxar+y3qXjEdCvmIh6uP\/5PgO8hXCuQ3vRobdp6NZ+qnzVUGxCppqOtuOx1H25TrojtvG\/LKrt2+6EDYB4BKQJ\/gMu0nEsZfA5Xkvc40KmqQ4jWrkEQEl7o2IZFfIWbgcstkjodNMugTYe99DTABanQUF9mdBDEc1Jnbt0aFCOWiXAHW6CsLC4MUONONmBAFgE3WsxFQzYdP2pbGdNE2KsNzqSIay\/6GcoLKKM2G95Uo6hYhf0I7wHXUFofGZNjmRnlg6CVqfCaSeO47GYXtT4OU5gPXAHMC1TMqE0yahNh15KoFD3AKwLHkJrfAz8X3f3\/5D8MLWwe0OQNYxr\/+qAm\/2DAJhfn8erZ6+gguOlL3yq1gf1nhDc3bu+aKoA+X0MVjHUT9vwxD5hP9XqyldL4LmBiXwXLKvdtWaPAAYW\/AtqBFzj7bPkYTsTqb4G\/xZXnFfdtWV2l2zKnMcBy4HpgYV59cyJoiULpaRIhjRCEcb5YREkIMkmptlIpqyTGZvu6Pg8L9Ilrg6nxaQSSAW4QuCmrsZZTtklO29BOAPg0+oDtwK8F+lBsZ0iz2ABSFBUXlN6HO6tK6vuW5d4wGSkQ4nLkEVyf7mlqX216Oa4iqzGPL\/2aZlQT4X0ylSPABVHeRRj2ItC\/cL75Hwc2LTpsm798wjb+Nyds43d6bMPSMDrYkdq1ZwfBCSr\/A+CPgKuAeOgtknMktCHaKLP20S4fF6VpoXprLcA5vv37HlxVcWPUYhToAv2vAu8DXwTuBi7io2y94rJNBmccHwReAp4RYfcLD6w8XaV7Mefp7GgngAbgWuAii\/jDNkm3NmDDvf0rbl8qAkG9J3vmdD7ZLqoah1ILNkighqJ6JAnIEdoZsy4O4DI5E88+UJvlsJ1P\/yWoGlQXAesVLu6zDeZ40MKERsrkmACeRHhMhRO7vrkq1J0IL\/y8HRsDdVng14E3cToqCJCRLBd6w5yyDbN9qZ9EgBMRfQdlbOeDtbk2ADo72mM4B3slEJtUnz5NMVX1bryqU9Y2eAc4+dwDc2e28Mf5n366FyBewFt5xDZ8Y4jEfZPqX5PHa5rta\/skBFhkJhjTGBMar0dGPh3B7bnfAJICP0B5gxoKqNed7PNDA24eXzVP5yIwish5KRv7zZYLAYq37ejqBp4Rld8BP8LNAr8IWMNHI8tO4xzxI7jSwcMvPLCyEurkdc4SccIfCxW9XmFRXn1Oa4b+aET\/XbBG8O99rItf16iYT7UQBQRf3UjsAKCAR159YljcORfKt0JxquI9hGj8U6URVVElA9wI3DSp8ZbjQQvdNkMhOo5EFtgD\/DXKMbHhz6ze8Q+2upnkbvRVP67i6nagCcDDstCMkZEiY+ELdmRxQexDIjXfp9sIXArMCxCZ0viHjktIg4OVoojLYr9VqraYk\/ybn+41BUzbiMav79PUt4c0cVcOb3mAJGf72j4JD2WBmeRG\/ySjmuDd4kJ6NR2FSQWzRTmj\/XUgqcIPNmzvermg5F+oAaHTupN9PhDSuIM6RXWVxbOc57Kx37hsUhboXrv9SA\/OiX4J10ObALGgUwIFVQ2AqX0PhjujUWu82PEwBTSBi\/xfq0jrpMbotw1h778tkwdioiSshtcDjArGKBbxgQy4kpQAQwEPCbfsWXkkYS+13HPq5mIvE9hYxKzotxnvpG1ijPiHIZAQU642eB34SzW8seubqyITEFl331b2dLSruP7m\/Tin5lr3xYQ4libJMarxMHWulDOc+4He7ET4AxrTZfcv\/krQYCHChUA6pzHpsw1M2HjY10UlmMBVV7yjOvemsTz\/xN9wOGiNnbLFFb22+d5eTT04qvHri0hGQ6oe7ipg8lzsDXKJ3wcKrZLl9eISTtqm2knPVh4BWoH7BRIi\/CAhvLBpR1du5wPRdrTrTnaFuWNHFygxdS9NNfux8zgV3tFqfdd9W1aWPzePM4YBWLv9CApUsi+8ztmjKiJCk8JlwGqLSYxrkmFNYTUSpokFkgpeaMzaCHPH5oe0s6PdwznZHggF9ciqXwq6hPYuW9ye1keNip7t69hGgCaBa0DvzKnffMI20WszFEulByGm7GC\/A\/xnYK8ETM32RZ0r6zdv1c6O9kncmMqDwMWKpIt4TGmsJK4VqjWSAw7jqsXGXvjT2j1nPS9IqquUW6ZIbFLjDNgMU+HXkpgpiquueF2EY8bMDf9Md10DQNfkVjoLbamTtunKU7bx632a+uqoJi4tIDFCHHf0sMwzkyw3w6Qljy8Bl0sPjSbHm4XFHLatjIevKiZMZIB1KFlxTVQv3vNYVzbKownrTnblEYQUKk2UFJKrRBZnjI7M9BfNlH1bVs72JcxpAsRTJ7q3GphXUE9GNRklleIxhNPAVF2DvmKkcOO7AgUtYGSSWFhnpZdxOhNOWbzmjMzOJ7cR8GEWe53FWzNgG\/xjQSvD0VirOeAD4HGBX4sw+OyWqPYGax7kNK7FaRRIF9RjQuPkNHRJswngA3Vq05GpGpgWQrKUxV5gEW9MEwzaFIXwPZNKM4kTtXtLlYlnalSP4uP8cuK\/I864OV68oPVY0HZHj2a2DGpy\/bjGlgZIqA8rQFNStAvNuM4348YnMABJKXCBGcSPFUkVC3wQzGNY54wy\/rlSzmhvUJjCUrDCK5u2d01FVZ+n7mRXHh+nLL6Q6omeKW5TPo1TSK0zh1EjsZKI0jIgXcBjxCaZtKFXFQfnWB1Q5TWE8TDVaEacspMtAlgMBTVhP+gDoLfUj1hzTrYiAtqA68W+ddLG4ieDFnptA0VM2F\/9PC7z2wH8UpWjcS+6ZcvrNj9k93S058QFqUcUWZBT35vQWBj74vuANwycUq29dVFmz1OPGFXaQFcDmaIaM2jTDGkq7PvWTAlwz\/g14OjOLXOj3W5Xx1\/JkaA1NmoXL+oOGr\/UbRu\/06\/J63N4TdYdW2FnStBjDZLvS0l+gcBydbpMEpciS80oCT8gJUXeK86nX9O1\/h5PFw+naXUfUFQlB7xBRFvGwh4Zih5KDKUNaKvipwouqzAAc693p87vo6opYBWuJzs1pXFGNEUWnxBXWoErDx4BfiNwAKUQajcjWjThgn8JEIpqyOITENqSZAWmgOO4d6KmDM09T7bj5oPKMtCNAeaiAW2Qo7aFMY0TsvLkjxMAJ4HngCdRPlBL4elvRDPTUEbcmX0B0KwgOXwmNV4KeISGAOgGDiqMmBpbF2ciqgnQNcClCskpjdFjM6X1UdMUcPveW+pGF9Y8ezvaTX+QyYzaxBWnbNOfnNKmv+jX1O1Z\/OaIONgAg5Mae25M4z\/wxbar0yoaprSZx6XIQm+M6\/yT3Bg7xWIzjl+7y3emlB3trwLfBa7d9GhXYrYvajrUM9kVxrp+2BjVFT0TIIYrc6vt8rE6Z0MKp\/o+TxF\/3CYYsknyGvohmzkVXsYdTuO75kiJXDVQUHFBVVF187EnNUZRQxtntbig4VsKw89FXPzk44iLbTQDNyrm+imNZ7ptE6dtmkK4nLqPo7gs2x7g58AbOx9cVSuTI+YBSwUaQCSnPpPECMKjY6G4UvEDwJFAyEddFOhzaAAuBi60mPioJui2GbLhqyyoJIqrRtwP7Nc5kDTZ89hfS1Zl3pgmbh7S5B\/02IYv9mtyaQ7PRMgAsMDJIubl\/cUFe+5JHDSoa3kD1uJKoMXD0mwmuVZO0SxZ3igu4ahtZlL9KLQHVRuDG+\/1Bzgdyr+++yddbzWPkv3ZQ9HZ9+pOdoUpGU8pXAN\/tTlN3cme84jQgnIZzmj0hjXJqCbC3n+rwJAo+4BD1GB58CyTBtoE4iAypT7jGg+z2rzFOXMnargkdjmwrqhywYBNm+NBC+Phz9KNAc8DPxV4xQjjs31BFaQVmK8QA5UAQ069MK2RAHfGvwcMWA17zHT67NzxH4H8POByYGFBPW9QG5gI\/\/qYKUVclcgbQI\/WcKVC5xPtFHMJMcns8knNbBrS1DdPBk139NlUSxYvNIvuLBkH3lFh\/4gmh\/9vpzdl\/+2CZ59QoQc3HeMeXOLDEyAhBVb7\/SSkSEOxwKGglZF6n\/YnIbjW268AU2oIhlt4d9P2rmxUerTrTnbl8YElQEsVP7NcWnmUunMyp+nsaDeldoWLgIyCnLIZRgm1QwWuRK4L5SWgL+yzpaLEno52g3MgFgExBaY0xoTGwvxOBDjjZICQ105PC5FmVK8Hbp4i3nI8aJYTtjGM\/b9nUgB+h\/Io8JLCyDORFTr7fTo72sGVi88HYgb30mXxwrQR5YAucQroE3sjYmROBxE1ODvqIkUas8RkyKZLLU81zRTwjiivA2N7antCi\/ip3CrgaxM2\/vVe23B9r6Yzueg52ACncBV4RxHyL\/zpKu6C0c5n\/uNO8vlTONv8D4BLcILIEiNguTdMgoCkFHk\/mE+\/TYb5TJ5NluBKxyeBSYRDG3\/aVdgVgRalUKe2IoqPE5zKUL1y8SIu69MHdT3mOU4C11d4IeDn1KdHG8iqH3ZPZRD4HYaDGPJRiVJGhATOeWgFvADDpMaZDPcokQIuozNCDTrZoqwWuCPAXDBoG\/wTpV7sEH9RxRmK24DdqgwEQZj8zxnj49ZJI2AMFkUZ13iYyjjHgfdU+aAkBlSz+IlCI84hWa4Qn7RxBm2avNa0k624kYW\/RdgvEk2hp7Nh99MPC8JyYIsifzigqZu6bWNmSmMSovV2tlhgP8Iu3DSMD\/fFdff8seJG7f01bu\/8LW4dK4BPwGJvhOv9k1zvd7PQTGLCfArMHh5OY+gbwNeAhVjMhu1ds31dn0tN71jVZu32I+ACFwmqaxgWgQlQf1\/dOZmTPP94OypQUrNcBSwMMAzaBiasy2KHXK34EPCiQt+uB+aGmmo12OMydA3AAqBBEcmpx7jGyeMR0i59xQnGfACM11LAZV\/HNhS8AL0ZuDmvftPxoEVO20yYSwUtTuX93yr8Chjd9a3ayGADdD7ZDi67pDib6ENDPxcup24IeN8Ip5+tYcXpzqceQaEJ1YuB+arijdkkI5qkGN41UgmKuH7734kw+GyNapLseWobKE0I9wn6h5OavOiUbUr2a4pCeIU4P41yYORFlMN4BH8\/u2otcBI1jyH0A38CrMe1cCEo88w410meVpnkteJSuoIWcuHW5pgNfJxGwx+hjCn8F+N0qEJNPZNdWQwug91A9XppyqXi\/UaqOpe7TviIoSzFZbIpqE+fZkolqKE9r8sO1SvAG6K1L\/RSZTxcL\/YCwAsQRjTFqCbCfIAXgRO4wEtNORNWxViVNcDaALOi3zb4R4OWMCsmF4ETKvxQhV8YYdQLaWRmBghKBnUj7gAK6hGoR4ZCWL5seWTafhFqRWjuE1FVX1VXAGuAdB6fQU0zEe7Kmxl\/bZyzthflaK062ACC+KJyBfDHFrOm3zYk+2yGgnphPpM+jSzwJvAifJKDDes2f591m79vVehT+JWK\/luEn+P0LZTS\/6QlxyX+ae6MdXGt30Or5MKeGJkNyo72nxlXPt6ycUdXqF+bUIVpawCD68VegFP7rgYWV37STb0fe86igqiQwpXUXGQRJjXGoE0ThDuWVgQOA68CvXNlJmgV8XECePMAU1CPEU0xHm4nO48TeOolxNGh6WBFG4A7FLk2q7GGY0EbfZoOa4auLLT1hMB\/Vmozu2ZAFGIqeJSCOkUMAYa4BDD7I9UUl7E5AJxAavucF1dVsBJYoUgipz5DmmIqXFUFlSYAjgk8jzAw2xdzPtjz1MMAoqqNAjeAXFtQk+y2TQzZVBR7kQOgH3hZlP3PfU7\/\/PrNW\/XZX\/9\/R2NB\/EWxcgo3hu+PcEkRXxEMyhJvhJgEpKXAu8UFDNb+XPhzJQZcCfxTFQrArzbt6BrdGdKzKdTWd\/QQg8tiJ6FqCjblsR4DtaxEWeezUSOCkCn1Oc2zGCY0wbAmCTTUZUdjwOvAO1DbGZpZIobrx25TxOTVZ8wmyGpoqxvKI2wOU0OiZ51PbqPzyW0CshRko8WsHrTpWFfQGube+DzOsXtWoLtWR+qJKDgHO41zuAkQgpLRGwLKs7HfA4ae+WbttE98Co044c4lCv6kxhizoZ+OMVPGgN+py4rWZL+9UQ9RExNYCXIbkB7XhJwImsKuR\/FJOF1Ed079rpCh\/2z+0hfu\/ad4VgrAEeBvgH+P69Oe4MM+bcsCM841fjc3+N0sMhNh2YfCRAK4QpQ\/EuV2lPTG7eHMaNf0rlVN1j7aBWoF1TiqSnWd7ByQ1wiGAutUBkU9XLZyNdBaVMOoJhnTRJgjL4rLVv4OOCJKYbYvqAZJ4iprmi0ik8QY0SS58KpYKzCIcgBlqGZsCxEBmoCbFLluSuOZY7ZVurUhzM7DJNAFHFNqd21aNzreQLndSlCEIgYrEII4jxMBVA6iNTUy7e9RUnnP4CYhNFpERjRJv6bCWu1RCcpO1wvAiIbghTsfKCpABuRK4Mq8+py2TfRpmkJ498BPw+KCwK8D+zs3n30A8s7NDyGqRZQTwONAO9CJa5tTAA9Lm5nguthJNsa6uMwbJCnBbH\/nsNEA3AQ8CFwLxMMohBa5NzvECBAHFiDSQvWcbIuLgo3hIt515iAi+Lh5ghcCjTn1GbQpxmyo1HE\/ThbYj4veDz\/3YL1U\/DzQKLACaLMqZlwTDGmSvPphfSsUN8LtGM7Ji7zB2fnUXwLEELkI2BAgK\/psRo4GrWFW\/Q9wEyveB3rzGuZY3cwo3f9k6SdwfZBKgJRKWGd9pShubM0EUrvBjhI+rnz2MqAhUCMDmmIk\/CMop4t7tvAWylsotpaEHj+Ghwv4XqfIiglN0GMbS7PPQ7oLfjrlwMjL4pzlc+LO+x9ChQD0FOjjwA+Ap+GjjLigpCTPar+Pu+KHud7roU2yYRUrnQ0El1jaCHxdYJUJYQt06C4o4sRwJWfVrP+zwAiqg1C7Ix\/qfA5KAliOGx+XyGqMUU2Sww+rk21xJZC\/xR1WNd1nOFuIC7xcJNBaxJghm2I43Cq9eeAwwrHacSi0rNVxvSI3Tmqi6WjQwmmbDrPjkMVlsQ8Ao8\/XyDzsz6AcFA\/EjcEUWxrXEALxIQOgQnHXA6tqPZCeAJYC8xW8AoYRTRJoaNfJTAmAHuBlhONSo8GsvU+0iypphIsFri+oaR2waU7bRrLR67Uvi7W+WfoZmc4vWbd5Kzg7aHBPR\/uzQLc4ccPNOHGvFLis9gIzxnWxk6Qlz\/vBfHptA\/l6jhTcvr0Cd896gJ\/gZpaHhvpTqhDGKIj4iMSprpNtAEVMFjF1R2XuksSN7loMxIc1Sb9NkdPQxj1zlMeVKAM1HL2fbRbijNbUlMak16YZ03hYhVTK\/dgHBfo90J0P1MJ7oQlcj+ltRfWW99sGc9I2MaGxsK5NcErH7wJHVGqzR\/RDtJS6dgZbySZyGWxDKJxsxbWO2\/UhLIesFHsf\/3Dc4EIgowiTGmdME2ENFFeCceBt4A2E8c8Tz4oqKgjCAuB6hQuniJlTmuG0TZOP3qiqABeAfAXoVpl5YGT95q25oOC9psqPcFntTlw5uoVyn\/YYV\/vd3Oif4kJvpFQ+HrE7d34wwCXAt4G7N+3oapntC\/r4xdWpAKWisrhAG66nqJofnQMdBa072XOXDG6jaQPMoCYZJkEhnJuwBQZxUeCD1KjQy2zzQsc2cGNwVlgkMa5JBjVNTkPdjz2AC76ME8Eawo\/zcscPQWkGrgNunNB4y\/GghQEbesXYk8AbwCmp4X5sKCmdKTlcoDIG7lDVD93rWX9OQelHpXptaLOBhxNpvBBoLKrHsKYZtcnobwSfzmmcJslRtIaruVy8apWg1waYeSM2Jf02wyShDjR+GkXc3vgmMFapL7Dp699VRU4CTwCPAM\/h3o8AwKC0mEmu9LtZGzvKlV4vrZKtO3EOH7gK+GOUDRt3dDXO9gWVqT+fCpHPWlVF1JWLp6r88aO4\/rna3aTrfCqdHe0GaMVtMo05jcmAbWBSY2HNAORwM5BfBQaee7DmS1Grzgsd21AXeLkSWBio8QZtA0PhHumWw6m1fqCQe6YGstg5YnGnpsvNBbxVPbYxdiRoCXt2Lo\/LYr+tMFKs0RLWMnd9ZSuqMoTLosYArBqm1A+LIJOldLZ7Go4LOk\/4KEtx4p0NRTxGbKqkvh\/atTITLC4j+jrKIDaK\/uZZflGxKZx9ckVe\/YZ+m2HApimGe\/LJJ+GEOZ1I3RERCqaCK3LD\/d8LxHo9IM8i\/AjhFzjb\/sM9OCFFVnn93Bk7wi2xE6wwoyQk5CHb6pAEbgG+CVyxcUdXctOO2a\/8qeUNu6q89I8uKp8DGarrZFtcpGuEGsj81Dk3nn+8vdyPfQGuLNhMaYJhTVEIb8ZyAmfEvwdMzfbF1CJWxVPkQlxvVzqHL6eCZsbDXaI8hsti96G1IeJo0SaFmwW9btwmG07ZZgY1FRbn7dPoBl7Cze3Nd9Z4K0dnRzsimgWagZiATGqMQU2HRZjOAzwUPwTXcn6\/p9CGq8aKBRjGNUaudqWeRnDq1AeBqUK2Nr9m51PtYjBLcLOxl0xq3D9lm1yvffRcQwu8hksQjKpin61wMPiur3xX123+3jDoC4r+e4T\/ufR5U+AEIwBazQRX+6e4OXacNd4wDRLSusXqkgE2ifKAKKtQ\/I2z7GiH+qSPIHFcT2yiip9ZxJXzje3bsnK2v3+dauPSYc0olwPNAYYh60Z3hTRj6dSj4XeqdGktl8jNIlZIq8scLLcYf9imOGabyYe72vQ0bl56TQQMn3r234miS0HXKbKm1zb4R4PmkppuaFGc4v+LAsNSA8\/hLBCENK6SwlNgXJMM2NCMFooDCVxfa00Enz4JNRrDje5qU8Sf0njYg8UzQziE8ArQixDs\/ZPaDGaJCqJyjcDVFsn0a1qO2aZShULkyAk8Q7m8\/zzujuvueyi\/\/r6HDoH+JaL\/d1wZeR9nTBHKSI6LvT5u9Y9yhddPQ2139pwNgtN0+CrwRaBFQDY+NnuOduRk\/cLK2u1HynM2E7hFUI17WxYKOrVvy8o5v7rmGp1PtGPde7YE14\/t59VnwDYwFd4DbBIn9PKWDRjf853aNCxmk86n2g2wAOUmhXlT6stx28yAVjP2d84UgEMIB1HyURfC63xym5ClEZHbgGtHNZU5ErTRp+kwK7uXZ78+r8IHO2tfyZpOp1vg4Zy7FGBy6jOgqVK7TWgKlYtAceeW2hxz2NmxzYDMw2lItFhERm2CYZsMswL\/TMijvIbwngpTu2qgNeaT6HyqHVVNAXcCKyY14Z0MWhjRRBR7UAq4dqadRph6tgpnVOdT21BnM3WKMIRyEvgKTrcgBq58fLk3TEbyNEqO14uLGdJEra6bs6GsOP514APgmV3fXDVruj+hCNPWCB6uVKGB6kX\/yzOyc3fu6GqY7RtQp7qoQTCkEFYiXKgIE5qgX9MU8AhhEqo8ruRFFY7v+U69F\/u8oBpDdSVwRYCXHrINnAqaw+zcQUllV+B4TWTrBA9hJej9AWbJ6aBJum0TufCOqynP631ThZcDO1faOARcYHwlboavTGicPptiKjxVH0XcWS\/3PtZVkzabIr66QMeFQENRDROaYCrc7S3T\/7oumPUCbsZy9Pe7T6DzyXYkwKBcANxpkeZBm5LjQQv58O6Dn4bFZZGfUzhlTHViBOvuewhrAlV0QtFXVfRhYBtOeO3Dkb0eljYzzo2xY2yKH2alN0K8Nl+rsyUBXA18A+WyDT\/vmjXjJ3JvenhRA5LC3dNqPdAAZ5yOUtuqo3U+AREEaALWoCwO1DBikwzZFAWVMLpUBdxM7FdQhmb7YmqRvY+3G1VaEa5UZFVWY7FTtolu2xhmoS0oj4xSBg1RTHI4XGZUQSWN6I0gt07YRPqIbeG0bQhzD2IRN1\/0eVHe6Zw7YoSCC4xfCiwp4jGsbpZ8gGDC4eKVK+OSQUCM2pzG4AvMw6mLxwp4jGmCbFXNqaqRw2mSvAtMFGpX8ExUmI\/wBYUVWY35p2wzp2yGCA6fyuF65\/ehTP76G9WrPNj4pT8H0D1PbctZsQcN5i8F+QDlT4C1lCbKCJCSAqu9fmJS5E2W0GVbPqzImWO4NkpYDxw2RfrWPdHV3fmV6p9rdSe7Aqx9tAsUg1B2sqvl8JYz2eN2DteGzFn0w5EnFwGtWTx6NU2\/piiGr0hFccGg14D3tDYNxVnHeiTElVxeV8QsGLRpOW6bGQl3qXgWJ4J3UJWpSM+KVQGROMIlIPfm1W\/rtk3mWNDCJH4YZi5\/4lXj2o7eBl4QpWe2L6hqX1zUiJbLlKUhr74M2zTj4VovQqnq0NbgKe9KikkBy4EFiviTGqfPunGDoVwx08cCvThn7QRC8fko73efhRDHnUV3FPEyA7aBY7aZbPTmYitOJ+QNgbfEzI7tsv6+h6A0\/vT5jm1PK3JK4R8C9+AqcRKCkpQCF5gh\/JglXgw4GLQxFm4dkPOFBywDvoJyxM\/y+F1Pd43s\/XJ111voLPEoYkTBOdctQCPVc7IVlx0sErnAYJ2Zox7oYtBVFmkY1yQD2sAUoVDE\/ThFoEvgtwJDc0RQqeqIq2y4SuHKSY1nTtkm+mxDWOell+kHXgZOItEVwuvs+EsUMSitwB2K3DaqSe9I0MaATRPiV74AHAP2Ae8zR0ZB7n2iHXGTGVYAFyh4WfUZ0RRZjYVpxcRwtlogEa7y+FQUI0IrLli8EPAmNMGIJsMiPFdJcrg+0ZeNYTDq2hOfxt4n2gVnC19jkasnbSx50jZzOsiEaV2dLXngKPCaQrfI7K9Bgay6Od2PAP8JVz4+4f7MOdorzBA3+Ce53OunWXJRvO+VIA5cBvwDlOv9CZJ3PVVdEbSa28FmAxHECCIfOb3Vep8VVy4+hsicbsCYa+x+8ocoJEEuElhZVC8xZNMMBiny4VNjVdwB8KYq76hSDN0V1gCdT\/2l4ETwrg\/wLui1mXhX0MawTYa5VDzAtRC8AQwTZSdCFBGSCJeC3JVTf3GvzchJbWQKL6xPoFxh8gawT5SeSFcSnMsXFxCVNLAKWGpVvAlNMKxJcuHStPBx66RAbfbv+ijzcFmnRIBhUuPk1QvzvjUdLC4j+i5wiFqu5hJJ4NbVjUX1Fg9qgzkahL6i6tMYwVX5HACyz3xz9vfHOzY\/xLrNW6fE8h7wKPAfcXt4tvz\/iUnAMm+YW2PHuMHvYYFMhqX9pdpkcPOz7xPLSn8Sb\/0vqudo153sCqCAInGFVtwDrRYCBCqS07qTPacQRMT14lwGzJ\/SmNdrM4yoU2MNmWkS4MYzvSSG4zsfXEU1lDnnHtoMXAdcPWaTrceCFnPapsmFe5ufxI3tOmAhF+nMjqogugDh9gC5clhT8eO2hSGbDHPkoIhTdX9ehUOcIaZT66iAFVpwzkCrCiaHx5T6BOHaQwOcg+bZ2qxYi+NEzxYCvtVSU4U4y6qGyOMqRt4C+is9XzksPLXrfwHRVuBGRa7OEmvotRkGtCGMbWxnQzdunvlx0XDNyFIzlkcLh1EeA\/43YDeljDa4rPZ8M871\/kmuj3Wz2EyEs87x\/CK4\/eUe4C6xtHoFZNP26jja9Z7sCmAVxd3LFNWdkW2ACVEdZY6U+NWBzo52xGIULkS4TKBhVJOcso2MaTyMoxsmcD23b6oyOdsXU4t0Pv2XgtrlwF1FvIuPBy3xo0ErExoPczaoiFObfwM4rVHOYgOIJFG9FLgrp\/7yHttojgfNTIar9PjjjAIvCLwkMBxNG3jalCs\/LgFafKz4WAIEq6F6YkXcWR8zrhWt1gLqaZyq+Aog5omlQXIkKeJRU4bNOG4G\/XsqjM32xZwvUlONnqIrQG5UWDlqk\/HTQSMT0RTgyuOe2RtAv2i41t66zf8cQHc\/+Ugfqk+J0Cuu5\/9LOL0eo0CTmeIK6cFgeau4mNO2oRZbMT4LHydueT\/wPspLKtWpJJlTd\/l8sW\/LanD3Mo1ztKtFuYxslNo7eOt8BmpIINwqcInFxAdsml6bJh8+kfmy0MvvcOrF0XakQkhnR7ugmkK5UdA7Bmym7UAw3\/Rq6A\/SCVxW5x1gYk+Us9gA6HLgrgBzxbBNp04ELQxoKsyK4hZ3759VpYuQZWnONyIgsBhXppw0qMQJMIQyXVxWLgrhpc2YJC6L3QhO1KBRcrSaKeK1VaA3gCs7PoLWbqm4sV4zyHXANYq09Nu0Oa2ZMI8v\/Cz6gFdwLU35Z78VzjNqw\/3f0w33b50QeAl4GPgFzt4qLSClSbJc7p3mWr+b+WaSmpMU\/HySODX2u3EBiKrspaG2wCJGDOdkV7uZK4cbf1NTp1Gdz8TgNok7FOZP2IT02kbGSIRx21SgC3gV13MbwkuMLk\/u\/LcoGkPtZcD945pcsb+40Dtmm8mGrzf\/4\/Tj1OaPRN3B29fxsAGuAG4rqLfwhG0xJ2wTuXA\/g3GUx1FeR5lURZ+r0RLWj9PZsQ0UwZWLL6BU1ZeQgFj4aoFiOCe7XDZea5TngCuggtJosqzxBllkxmtl3m8BJ571DjAQ1OZzBEBEVgC3ARcW1Iv3agMjGg9zsPGzeB8nytlPNJ5ZFvQ14K+AJ3Gl7gG40vEmk+Vy\/zQ3+N20Snau9WgLTpx6swq3Aql1Pzv\/JeORDC2FFA\/Xj13Ne5oFxgXGSwrn543bf3I4LkYaQPK+ZwtqJQaoQlFVC4C+4DL6dc4je59oByWmwoXA1RZJDGmKXs1Q1FCOxsgBb6nyLjClUTimIkTjVJsRF3DZWFBv06Fgfuq9YEEURnaUBc9eFeiViAcJLd4CVG9T5LJhm051BS0yaJPhc9c+oiCwV+EpVXptgJ1ra1MVEZddTAHGIqQlhy8BxXA9Nxe4V6y16M0\/7OLlP6+hYIgwjHISJzC1CJA4RVZ5AxQxBGo4YRvDvJbOhhFcyfEHQLYz8lU7n8lqnDZI67imTJ\/NkNVIdgJPAr8T5S2crR36r7Bu81Y6n9w2pchrIjqFO1cfwAUSBSAjea70u4mLZV\/hAvrCfU5VGh+4QpTvAO\/4RQ5ynoMndSe7Aty+46go+KLagDsQq\/XGZoGCMWr2VlDxcG1JEMA6szdjPHMl6DJc\/1prMTBJ3AbUCxwFOQhyEqKdjQo7nU+2o67KcT6wTmBBQT3Tpw0M2lQpMROqc0CBE8DrIvTt3LJqjpnx54\/Op38EahArGRVuzKn\/lR7b1PZOcSF9NhWut+CTGcKJyRwQJftshBWt93a0i6K3AOuKmAXHbZvpsZkwtm6UscBx4McidO18cFWkAxzTQa1Q2i67cSN5BMAnICFFLIaQ2dQB4BvQWnKwf\/XMf6BYLGR9jR3CiWNeAu5hpCTPJV6vi+QXLqBH01F1BhSnPfFblO6dD9bmObj38XYQUgqXA6stEh+2KYZsqFtmPo0CcBj47XMPrhqY7Ys5F9bd\/xCdTz2SB3kX1f8Pzlb\/h7jWGAElLXku97pRVV4qrqDHpsOs3VJpkji18c2i\/BWuwvK8UXeyK4BYaxDiILEqfqzF9TROWEvF0lYlB1sEUp7PBaryLdCbcH1ri4F5uA1ouPTTiyup2bN2+5HnQbv3bVlVQ1oloSOmsBK41kJsTBN020ZGNU7IjEJwWexXcMIh9QBMJSl6iJBQ4bKsxu7vs5mbXy8u5WjQQjFcysifRAG3Z\/wW6I+yg72vY5sEsFDhCxa5bNim4u8W5zEe3kqCskbCrxReMLZ2e0M\/C2MERT1cKXY3LoAsBTwyFEgSMEVoKoPKY0ETGDcve7YvqFJ86Z5\/TmdHO7j94HGcnbGaUitjUgpc4vdhEH5XXMapaAo25YEPUN4SmJrtizkfdD71CKp4JV2Kq4BMUT36bQOTGouaA6e4yoNXcO9l5Fh33\/cAip1Ptn8A\/BAhC3wbZzv64EZ8rfH7yePxSmEp\/ZqOYjBkOghOA2KzCm9v2N61e\/eWVedtqkbkdqswogZTcrATULX0hcU5MYEqFXHuSw62ByxQ5Kuq8gPgz3FCAdfinOxy7\/lSXA\/iBuC7oP8a+FeC3H7njq7UXY8drtJtmEM4pZ60m8PL6gK+GdQG+kqGRwi3x2HgJZTjhEyVM8rs6ngEEY0prMxq7Eu9tnHde8Gi1OGgjWx45zGfyShOCO8NI4zP9sVMl70djxBg0sCtCrflNNZ8JJgnp21oR9WU59W\/gdKhlp5nv7UqdJG5aiGIEURwGVR1N0iIUyQmRUKkMaYCcXFzG0NzUZVi3eatVqEbZQfKD3FtJB+eFynJs9rv41K\/j4wUonYDlFLVjsKxYlBLYulnfElVUTSNq0RYqbiZ8z22McwVPZ9GESca9grKqdm+mJmw7v6tFuEE8GPgv+LmsxfB9Wg3SI6LvT6u8XuYb6bmUo92DDf+9gsGlm34Rdd521ZCaQlEDd8dgp7716pVByguKjqmMvOG7LXbD5e+iiwGuQ\/4Z8A6XC9Hks+2OGLAGuAbCg9ZlduCQFJrH63ewPe5gJXA4J7H9QoXZjVmBmwDY5oghFnscs\/tKwjDRiMhGhIJvCJiMQumiN\/baxs3Hwjmr36\/OE9Gwps9PZM8pTI84JRINI3Olzp+BKiv6AqFuwO8S3pto\/dusIhseCeR5oADwK9UeEPnaBYb3IGtglU0C4xR2kAFxROLH67tyij4CoVwTRarHOs3bw3EchJkO\/ADXAbxw70hTpFWmSQuxbC1RH0WimvpOyDKq7seXDW15zvRrdr5LEQwAq24UvElAcKIJhjVeLhW0udTDkQeAN5Wy+hsX1AFvlIBtAv0p8BPcedvEcCgNJspLvN7udI7TatkZ\/tiq4XBva+3AjebAg3na2523cmuDKpO\/TMFlSvdPgsCIC8V8bDEA5mHc6z\/ELgRFzA422O9rHi9CXhQjblCjam3I1QQQRK4YMalFpMZs0npsw1MhXMO7yjwmsBRJLyjL6LG3ifawac1S3zDadv0tf3BwssOBPPjw5qc7Us7W8aAlwVeEZh8poJaEtWkiGeAZuB6i7lpXBNNXbaVnvD2H1rcOJp9wPPG0L\/7O3M3i73uvu+BaoArxc6VfpyTjSUuQZiyOm42dsm7vPex2gxe3\/XVrVZVelB+CfwtLutmATyxxCSI2tihD7PYRLTs+By+qY8rwb0IaCmoR59tYEgTUeujLwIngddUOJKbimYQ+EzWbX6IqfhkVtEDwGO48V4nyn9uUFrNJJf5vVzu99EsuWg9semTxL2vd6KsAvx7f1L5vbXuZFeAQEVwDyxB9e6phzuAssywR+u2nxwWkAbgamAzcAPTCxZ4OHXQL4DeAzrv9h21aRDMCiqtwJUCy4tq\/EFN0W8bwjgmqIgbV\/KKKiM7H5i7xnwleeXnP0SRxkmN33UiaP7228VF171fnJcZCK9j93HKmdQ9KhxRiWYLwW87foR1Aa+LgHV59S7qCZrM8aCFvPphfRLjOHXjPcAhcRUFcxp1TpDFCQNNgIso+6K4edmh2rYUJY0iNmKpwXMhP5Eo4kT5\/g54AReUQ0o\/8Wi5bEVcv\/\/rmGiXHX8+msC1EK5UJJUlxqCmmIqe7FMWF9x5U5SBfd+NZhD443zxnv8z6zd\/P6vwLspPcOO9eigl6AzKfDPBVf5prvD6S452qPa\/84HgNKZuwLXDNp6Pb1x3sitDuU\/ZQNUiXwZnKI0zQ1EpY8QDXQrcgVPda53Br\/OAZaJsAL26dG\/qVABx4jxXAwvyeKbPphnSRBgdrEngbYG3RWpT6KXa6O5\/zIQfa5iU+PojwbzvvlVcsvZg0NYypEkTwuf\/SQQ4wa0XgNd3PrAqtzOiM5kLeKJoM3BNgLlxRFOtR2wLvTa0wjFFnOH4DK4XfvTZb9YDXwYti4eOUzq3LUJBvbA9R8WVixvAag0\/uXu+9Q\/BUMBl2t4HBss3wAAGGyXTfxI3smu\/GiZn+2LOL5ICVgBLLRIbtUmGbYpAI+ViKK4C7x3ggFJ7z2z95q05FX0b9D\/iHO0+StUiBssCM8aVfg9rvMGS\/kGEVtv0SOB0BG4GlgZS+ahQpFZAiInhZmRXuzl2UmBMoLhuRkJjEgdZg4voLGLmii8J4CpRuUlU5q3dfqSKt6SW0TXAZRZpHLFp02MbmQrf\/MlyidzbCsej2nMbJp568r\/Ik+N3NJ7U1rX7i4v+9M3i4rsO2ZaWMY17EcrrZHEq87sRTs72xcwEiyQFLhX0jkmNrzwRNMeOB81MamjjiQNAJ7AX6Nm5Ze6N7Pok7tr8kIpzsAPcmadZjTNsk0xpLEy9pBbwS7Pk9bkIq\/GfDUVTBHduTPFh0kLwCMJ21n0W5aDi2wInC6F6nSrLbzoeLvdjrwTmFdUzo5pkLHql4gFwDHgN6NEaUvE\/k\/WbHyqo2NcQ\/gr4NS6Q5doysCwyo1zh9bLCjJKUmrwFH2c+LsF4OUJq46OVFUGLXC1HKFEVnPhYufysep8MeUF1hiVkKdzYhctwGfmZIkATcA2wALS3yvelptj7RDsIDeqy2BcU1cQHbENY508WcD1Nh4CxZ+ul4jPir3\/5U7O\/mGnOauyOUU1+97ht2jRgk80RU2wtAsdV2A28gUQ3Q9D59COiVucLelse\/6Zem2k5HLQxqKFci+BK9F8FOoCD1MvEfw91+1WB0jk6aFPSYzNhGztkcIHrOfHsJuMj2jQ1D5zNUBpYrmKwUTIiikAX8LYqw3u\/WruBkaI1nhoWAauATB6fIZtiMlyBqrNhEqcV8g4wuXtLTdsuAU4r4D\/jEoQbcTa7xCRgmTfMFDEmCjFOaWMUx+adCwJcidOjekOEw5u2dwU7t1Rmzdb0nasignNOP0+F+3wwpUoww80siSuZWETlAi8JYCHoAqorBldzqBvXtArXN9KSx5c+28g48TAZgmWGgbdwTvacVS+eKf\/+57v5Nz\/rNO8Xly0+ErR9\/VDQ9s8OBG1fPG3TUXOwwZXkviKwU6BvV5RLlVUTIlyjyIbeIHPh+8UF\/gnbSDZ8ugjggr6ngJ\/hysQndta24XjOlEqwY0DMquG0baBf0+TDZxoVAV8E\/ws1rnNy\/6Z\/Vf5Xi3MGLLjxahLOUZWfRBangfCuRDioeDZYT3xcP\/YygURWYwxrqjRlISJP66PZ2C8inCCieiFny\/r7\/huAKdAXcSKDb+LeWcDNp1\/j9XOF30uT5MKmT3E+SOD0qC4TIe5V8LUN3UkSRTzzYU+0T\/XuaWmQp+YQrM5stkccV+qTquD1+cA8kAUhmjcaSVQkiXA5sNIi8RFNctw2hVHwDJyYxmuinBSdmVbAXOWrP\/1APghaE72avqRP01tP28w\/69HMhmFNpCNWfgfOSD4APIPybpQFt3Y\/1Y6oLgC+MKLpqw8GC9KHgzYZ00QYjUnFlQF2qPIrtYzUHezfp7OjXQRagFsEbZsibno1w1j4gpcWGBJhUmq0hPXjqFKED39KSNhGq33q5ePW3qsI3Wpq+5mpagNwKc7Rjo3ZBMM2SSGc9smnkccJQnbKGSP9apl1923Fg3HjSsb\/Bjfa6\/fm01\/t93Cl10eitl9hcE7KUuA+hZaiVO4AqDvZlaGIc1DTULU0U6mUSgogwYsz69OKUdogK3h9pnQ\/FMjfWePR9\/OJQBsui72kqJ43YNP02HRY+52OA+9ZGLZz4KCqJJse65KN27sSBCwb1OQXT9rG\/6lPk1uHNH7NlHqhbfj9HPqBpxB2I4xrhN8JCSQBrMuqf\/8HxXlL3iguMkOaDOs6nAReVvgbVU7ZSFXann+e\/2U76IfB5RsskhixaQZsQxidAwt0o\/SpUqxl4bMyomRxmbVyybj776JhXW9nYgX2C7wNTKDR3fM+j86OdnC270XAfFAzaNMMaYpi+J9TGYvTrdit0BMo+lxERTnPlTs2P6T5nD+mlp+D\/jUuSfIhKclxU\/w4l\/v9JKTmj5A4cKcoN3uKuadCPku9J7sCBC6LnMaVHFRrZwlwwiB235aV09rEb3+0CxExuJer0qW9tvTjGdH48w+smjNT7itJZ0e7j1PtvNoiTeOaoDtoCmuPzDjwHnA0EAqdFeppqXU2uc3cR1ls4Ooism5cva8VMKsCSCgSGWvlY+RwI6P+TuGUCHZnBOdi733yr0ACX9Eb8+p\/97htXf56cakZCaeyP7iszHsIP8by7u5vrap56+hc6HxyG9YFwxcCtwLNBfU5bTOMa2K2L+\/jKG5ffVeVPhH0uRrfV5\/\/ZTvW1acKzsEWRbDIR8PCw82EKr\/BBUZ0Z40K1ZUcbF9cguYKIFnAY1DTJUHWUO6Nn0QeOIjyAhDsqtHn9WkYg4IZRe0OhFZgK25vRIBGyXKrf4y8+uwP5kUpeHKuCLBIXW\/2vmcfWNVfiV8aSks9gqT4KINdrTNAcZHeGb3xquqB+rjevUqunvIhmbGWZJXuSU3x\/OPt4II3FwEXBnixYU3Tr5kwGhoB7h16DxiOcsayWty9vYu7t3f5orSJsgnlHyv8yxzmoSzeZUUkGWEHu4ATkPkpynsUKUbRwd799I+wphCzcElBvYf6bOPtrxWWJY\/ZJoJwHp8BrprkGYE9xlAPbn4MFRGEBMIq4HoFxjXOaZsp9daHauuyOJXqDxAma93BBrjza1vBBf7jOLtKFSgiFGbWFlcNLC4b+BJuHFSoXqYKU9YiugBXbWfGbYIemyYbnfydxenIvCbC\/sietjNgw9f\/FInZAEM38CiwAzhd\/nNBaTWTXOX3sMIbJXTzbCqHAA3A1apcvfGxroqUNIXSSogekgCJ8aESZlUo4DZxuf1vD01ra1Atm\/CiuHKZ84EfXT9hdlHBR1kKXKnI\/Jx6MmAbGLXVLJg4a3K4nqaDAlN754AxOBM2be\/yFBYAtwj8M+D\/CvwJcIdCm4bwAZ8DijM0dyi8oMLorm9Hrx947xPtGOvFULO6qN4\/GtL0F98NFqUO2daw5tMsbu7pLuAJlG6vto38aSGl4C9O7HNlgGFYU\/Rpmjxe2BbeFG5e9FHmSD92iXJ7TFD+3gFCyEUfy4mP9xTeC4oEIXuXKo3BaRpcDswrYhjUNGPEo9SbksepwL9iDX3PzVHdinVf2gpqC6CHgV\/gKtBGyn9eVhy\/0jvNQjNRy45jHBc0ulGUtju3z7xkPDLhprCydnsXqDWIlHuHqrWv5nEHsJiYCNMwpn7zrdWUZlgbXF95QOV6ygVn9BWhLoA1HazRhCAXAGuAxkmN02sbGCcWNsu5rMz5tipHqD\/vT+W6jqOyeLKYsaqXB8g64EsK1yk04gzLqNtliuvD\/pU60a2eKPYDd3Y8DIqPsizAu29Mk1\/pCuYtOBDMC6uSODjBnt8CHQLvGqHw6znSW3huqAGZjxvbsiyvHoM2xYjGCZAwBVAU11t\/FBcED82FnX\/EgHqU90OFohpUnbp4SG9EgMsAviLCIDU80\/z5x9vLLRfzgdWKpHMao982kFc\/KodY2W55C3gfe6bI3hzEFsDEp0DfBPkF7tneDqQEpUHyrPQGGdUkExpjJHytNZWg\/E5fhbLSdwKGMwpu1p3sGSKClLJOZWXxau0vRdAcYN2BNG1DttyT7eOykZWYk13+veCCAfVRTtNAkEacaueqAEkM2xS9Nk1WQ7dsi7jM5bvAwM4H52Y0+JPY8JOuDws5AiHeMFFcBWxQuEfhNmAx1d03zieKq67ZCzyK8MHuLasimn0TT0UXWmTjuI3\/g6NB6+r3igu8AVvJAQwVJYdr1egQ+J0IY94cmLsyHRQ8QZcAFykmM6kJBrWBKQ2ltmA\/bl8dIrS+ZWXZ++QjqKsQ93GBR6MIQanKQNCw9vtmcZMU3gDye\/6wNh1swL2JSgJYirAcMFmNMaKpkl5MJF5VBbqBV4DjSPSCwZVk3Vf+CZ0dD1uDDCjsU9drvxBXqeAZLM1mitXeAIM2RTZoIxfuypLpILh54RcDlxg4iGsnmDahs9ajhhG3Uq3iU11DWUCs++gZoAoi5Ua0PJVzsgPcoTPlSfgbqULKAuAqYFlOY7FezRBSsaUscAQ4VJR6D2iZ+x47RNGqCVQSQJuP3h4gX1W4xboKhdB6bNNA+SiTugN4ddcDq6Zm+6KmQ2fHw4Irg7wtq\/Gv9timqw4E85M9mgnj2gN3748Dfwc8r9D73AN1sbNPYnfHDxFoALkYWGWR5ITGGdVEGJ0Di8uMHkWZClOK\/XyiRUF8VEUTuASAAcGqKd2UUK5BcAHGA8CRWp+zjGCAZpwzsiRQw7jGGbWJsGpVfBJ53PN6S5VhLc6N9fVZrNv8fYDghY5tpyyyS930hVZgCWBiBCwyY1zs9zOqCU7aTJSe99kSB5YDlwEvbdreNbZzBsmCupM9QxIJ1amsUZzBXM23zeCyF3lmYhk4u8Ir\/VslDbOyk12wlhj1EuKzZu8T7eAa5RcDFys0T2jC9NsGsuGTnbC4kqsPgO7OLXXjHmDT9i7JK0mBxSJcYeHLAbJB4AJ14hq1dDKVHezXgEcF9qh+1M8VPUxK4Ioi5suDtuGWrqCtuds2Sk5D+8iGKam4CxwxUt9rPw1PPVGkDeESgbaCejJk04zYJEGpFDlEZIFDCCdEKOoc2VnVflgQ\/qFN5ZTFTZgdbMUFRN4S4bTUeFbUGhWQZoRlQHMRw6hNMqqJMK6jT6NX4FWF4yLkd32nhisPzpE7Nj9UeKFj27sB7ACZB9yLE7eTlOS50Bti2KaY0BghHmM5ExbhMvhLEE4wg5Lx0FoNUeHZr6xGlSRufJdSvVB4M65MNzeTzzSiKi7YkqSyQZdyP7Zq\/T07J9SIIDTistgrFYkN2TQDNh3GGa55XBZtP66kcU5z9\/YuNu3oigHLVblb4c+B\/0GcqNnlpd7rWlsPE8CbCDtE+LUIvTsfjGawpbNjmwd6IXDvhE3eedy2LDhmm824xsNaohrgghu\/AN5RmHrmgXq7xqdhRYw6x+Bi0MZAPRnXBFMaC5uhWG69OCgwYKR2R0F9nPV\/8F1wWewMJQG08viuEI8PygOHgPdUGTEhK4moNCr4CEuBNQKNBfUZ1SSTGotSdOEDhTcEhqXGn9d0uGPzQ1kbmN+APobrW5+idJ9aZJKL\/T4u8EZISYhX5fRJ4Ko0LkBJbXq0a9pfsdaMvVlCyqMmqkkcGBNXnjvtDeIMpdUWPlL0rBSunF2kvoGdA4p6KizCLfKWIkZO20aGwxkxdE62chhlcrYvZrZYu71L7t7elQAWoGwA\/kLhX1j4noVrazB7XWYKeBPYrvCEFU6ZSJdKSiuwoYi556RtWnkoaIsN2lRYjfsirmfspwIveabeh30WCK4U8AKBxJTGGLRpJgmlk90LvIvW\/CioT\/r6idJoUThzhFd4t9ARXKC5Gyj8OoLjCs8N8dSVEC8BTUxqjCFNMUUsrMHIj6PAb8TpHUyhc219nR0bvvq9vKrsBH0Cl0z58GxfaMa41OtjoZnAj1Jo5ey5ArhCIWNB1v1kekrj9XLxSuAkL4XqGtFFcb3ORTOzTxVcGch8Kutkx3CBBytza\/RIJYjjFMUvB9JTGuO0bSCnXhhPgjHg\/VJJTX62L2Y22LSjK46yCDcS6AvABmAVMI\/a3mNzONGYH4vQIXDyuW9GVegMOju2xYEbBP7BmE1dcTRoTfTYhrCODQpwTtjTAk+LMPjMN+sZ7M+is6Md3N56Bc458KeIMagpcuGrECoAx4AunZPCoRLHZZM8gABDVj0K4VyL4BTg38apEdekx3Em4tbRJcBSgdiQJumz6bDaKB\/HAqeA3wB9niGo\/aDIDFBGEH6JS\/rMp1Q27mNd2bimGbWJWiwb94F1Aj8GTplpfrVaNgCrhqI5cRrC1TwBplSJA0WdWZS7qM4hbq3w9XulHxUI7trRxd76OJmzQlxlwaXAGoV4TmOMaTys2bQR4D2E08wB46LMpke78AxiYT7KTepGXWxQuBbXSxhKqeJKIRAovAw8gvIcLoMTSQd7n3O+KKILQL+lyM2nbFPmqG2VSQ3duDz4aPTMiyL8RFxPYSTvfZURXJvV5UCzIpJVn\/HS6K6QMY7LjPYD9pk55wSIuFFreBZh3CYY1hT58OoifICbZz4xR7KiSdwIvDZQ069pBjRFMbyVBmcygXOwDyjk6g72Z7P+K1t1z5PtR0X0xyCXAWtxQRZSkudSr5cBm+atYGGYx1tOBwUuU1iN8P50xQzrTvYMuXNHlwDWKmmqN+dWgSxIHNVg35bpbRJ3PXaYwJryLM5Eha\/d4ozuwIjWHeyzpLNjm4C2ljazRSCSV7+0UENnCFrc\/NYDgTKxZ0ttZ9JufKyLmCJpJYaSVuVqga8q3ITrt55P9dtGqo5AVuBF4H9X2Icw8FxEBe+e73gEiwqQEuRORTdPaqK5y7ZKt63UoIWKUt6vyyJzrz77wKq5Pd\/1LChlsQ1O0GYpEMurz5CmKAdSQrS7Km5fPQRM7KzxffXjdHa0l1tkE4BXVE\/6NUO\/zWBLJYMhowi8Km4MVOG5adpjUeCjdaStwOWCpHIaZ8A2MKHxKEQXygJ1e0Xpfi6i2iHVZPfjj6CWIsKrYvS\/gKwELqS0ZbaYSa7xu+mzDRzRptm+3EoTE9iglmd3f2vVtARFIxF2CjNWRa3KJNUNWCjOwYkhMu1nGFgB5xScLv1Uco8sAEPiooYhPBfDisRAFgIXAPEAIY9fmt4SqiNMcdmW94CePRF1ss6WTT\/pkqaAZEpZCazD9Vv\/\/yz8kbrI7kJq38G2QB\/Qoci\/VtglwsDOCD97RbEQs07F\/4EAb36\/bZC+oCGspW8F4B1gh1p+Lc7Ar3N2JHEVQssAGdc4p2wDE\/hhe9IF4JjAkbn4fEXxUBqABgWZ0DjHgmaGNRG25wRuTzwBvI4w4tXwmLXnH2+n1HCdArkUZJVFzKBNM6KpMFaDfBJZ4CDKG2qZmO2LiQIbvvo9V4+KTKHyXEkIbaz854KyyIxyXewUzZKPSk\/+2SC4xOnFGFZP95fUM9kzR3CiRtU2sC1uw5jhG60WxAmsuF61Sr0TU0C3woBGtIx0lojxUd8LipQGoYfu7Fbc6KAPSv+sKTb+tAsUEfdT7pG\/HlcWfifCpbi1Yqj9IJIK5ASOKPxK4T+J6tt5KJ4IiqF7Mc8Wl5VRI07s7HaF23LqmwHbwHg4DfoA16fbobATj9Fn6hVCZ0tZ4HM10GwRJjTOZCn7FrJnPQl8oMop5qCTrZAq7a8rA0x8UFP02AamNHTmarmq5C3g1HO1XlGiIIpRmI9wNWDy6tNnGxnX+Gxf3dkQ4ILEbyAcK+brdunZsuFrf8buX\/5lgNEeEfkZzh76Mi5wiS8BK8wQF3uDvBksDHNbx7niA4sErtrw4679u7997mu8Zu7ErOFMzATVFX0SXLS7IKKJu3ZMT\/Vu35ZVCFIu+X0V6KFy3twITvm2T5krEz4rQhznYH9Yd6MCQcisQJzxdxLXNzg12xdTSTZt7zIS0CCWpSg3q1MK\/9fAvwL+GLiGj0R5wvdkKos16Gic4LdpKW5rkOAHwBtYLTz\/4Co98u2LZ\/v6ZoQiKXWl\/hsCzPwxTdJjM0xo6FrqFWcgPgP8HcqxXfVRXeeC4MbnLRPwAjWMa5ypcOYZhoGDCP21Pm\/5ExHagBsVVuY0Fuu3GUY1EcbKkgCnRfEyyuBsX8z5xhpQIYFwAXClIjKpcfo1zZTGwvd0\/j45XAvGWwLDnX9cD1CeCxu+9meoNTlV9gM7cBVVCmBQmiTL5d5pVphR\/PAlhaaLwdniK4yhZTq\/IJQnTFS4Y0cXVhXAKzmr1cpml3qyyakSs86AmNZbbUStVRlW52S\/jFNETs3w+iaBd0BeAx2xc0MIpEKoD5LCLe5AUM8CxXBFBssR\/KMo3VGdiQywaXsXgBEFDAalVZ0y+GXADcCtwEqcYFKS2neqwX1JNWjRx\/YmJdibpvjztAR7PUzPjx64qlbWc1kI6xqFK7Iai\/XYRk7ZRrJ4hKzycxjYA\/xCYb+auankPwPKUzQWA14RwwRxsuF0DnoFDogwauaYk73nZ39lIFgOXA3SNmETpjdoJBu+oBeUx1fCfoTx2b6Y846RUtWmrha4sKgiI5qgv6QqHsJqu48zinMM30fqpeLTYcPX\/kz3PPXwKCqvgezE6VssAZfNXuiNcbH2M6oJ+m0q\/G\/E5+PhnOxlCPM3\/KxrYPcfnFtwu+5kzxAjGAUPrXrZqHXthCIz8WH3PrCK23d0ZUXlPWAXTqb\/yhl8lyKuR2kP6DsghRe3TLudYQ4igstmG3ARQtHSP2f70j7C4vqxTxCxUvFNj5aqPgSDu8+NQLMK81EuB67DlUKtwc3TbaD8N+YAAvjYICnBWIbCB82S+1Va8h0FYu81URz9H75xaw2cm7\/3dduANQX15\/fZjHQFrQxqCkuoHniAK0n9KfCqKGO75pgY1kzY+0Q71oovRpcAi0FNEZfJzofPObDAURWOANlQXdl5pvPJdkGDJuAqYJVF4kOaplczYZ2PPY7LjB4RmQtj1rS8X14KLC7gyaCmGNAUBUyY9stPojy2602B40aYlohVHVh\/3\/eDvR3bjis8h7OTvgA0OfXQPMvMCD2mkXGNhbHF41wRII0TzJwvAYfg3N6dyN+B2eSFB1Zx52P\/f\/b+NMiu87zzBH\/Pe87db67YFxIbV4laLYkkSICLZJVFaLVEULJcXeUyKdndM1E9MTHdERM9E9Ff5sN0TESPq8q2mPTUeKq7LIKyJZFMUBZJkEhABCWK4r6BABL7mvtyt3PO+8yH914QokkJS+Y9J2+eX0QKi4jMc8\/ynvfZ\/v\/DoATa3plsZxcm4gTQrvBNvO\/eDXbzjuFzIE\/hBJzyuGrepX6mANc+9TPgCdCzz21fv5j2CVeMQtgUuzlfwfBRclgMmhRxkZZH7zsijMd9MBfDXTuGjbh5dx8XOK\/FJZQ24TZ1n8B1cWRxi2qWRMVZ808GS0mCerfUj\/dK41dLpPpYn1T3KpyxmMa\/\/8Yfxn2Ic4qHZi2yPsTcMKalnoPREjkW9VDVRAlhRcCrwH8F9gLjLCKrvLnCoL3qulNWACZQj4pmk+a7rLhq2zsoI09vX7ie85f14Q2+KFcDn1JY0lBPTtsS48lsFW+JQL6J89Dt7Hlsh8FVLq+zSN+sZmXElpjRbNKSkh9EBWex9pbClCQss7bQEHc+X2kG2uuAjwFZH8sSM8s6M845W+SUlpP47F4qRVwH1ApRCl98ZDj4+SVooaRB9hVi3XbHxwWm7Xxw86B1oOGKn1fGc9s3BJt3DL+Lyv8Pl5W9FxeEXGyLbA04jAuw\/4sRfXvvvQu3jTgOnh\/8AQHa0Auq2QJkxGKFJC1WETAicFKEWtwH80HcuWPYjVAoWTEsF2U5LoF0DS6g3tD88yqgl\/cSSok5ye2g1SHRLQ2Wm8pYn1Rf6ZHariWm8uQKmXzjo\/7h2XfCDfqlr3437kOdcyL1Vjfwbj6npU1vhctz+6MlTCZrQ29xOhk\/Bf4Zl9iKdt2XzhJeClu+8gB7Hh\/wcRulLsC0BiKM+0NSdtwhrtp2kA7TubgYRDUPcg1wvcWUpjTPSduV1GpYA6dJchiYfvJbnd9ZIpBpjlJttEhhWvNM2AL1ZCWqPowR4GXgCNBIvbGvjNu3fU\/3PD4wgvAcrvN1Nc0EZkEC1niTnLZdTGpuoYji\/S4yuL3iUiCnlziem8jVawGSwW2IAppqe\/NMSym1AUQicxPLPrd9Q3jrDw8fEvjfEE4DX8PNpS7lX3qAX3iTjeF8W58GHkd1\/97tl+cplyIWdy\/5NM+3J5a6ekna\/Ic4sbwxYla\/\/UJT9O+pezfw+R3DIkLWKl0KOYQNAh9HuQ5Xud6Em6\/O44Lq8+d4sSEoRQnploZdbabDVWbqSFkaPy8QPNVrqi8u88ZP31z8ZUCjm433\/E9xH+6c83c\/eaL7mK1snbSFO\/ZHS1Yetd1mWnNJ6RRpUce1ie9BOIMS7epgD975RIUJXICdFyDCUMcnStbkfQMXBByFxdB+\/H6kG9dtcHWoXnbUlpjQfFLbNqZxldFFca327hxAlT7gI4KubKjvu+tTINIF0Sp+BPi1KOdIO4HmhC1ffiAcGnzwAMizOGeiHqAoKH1SYYM3zjlboq5+Usc9LoUlwDKEQtTUS7rYf5gG2VeKqrr3tNRpb0K8qWysc2qgrK4j+Zio\/gSRI7h5i824lpBC8+cGuBeLxb1o9gIvqMirwJl929cvqja3ueKWbd9naHDAo5k8wZ1fI9iktTXWgHdVOEFMs01f\/NEwVhFVjAjy+UeGyyjXWWUTcL3AH6BchatSd+OSUolUz2knAmQlYoXM6hozXbnKmzi50ky\/mCX8iSf6Up76ibKMVT4tf61y55G4D3fOuMsJ3PHM9g38m0feWPNyVLvTROF3zmr54xM2VwwwkqAkVosqcETgmIHGk2mAfVk4qzYArsJ1gElDPWY1lzRByRngEHBqsflj7xt80A9cNexGYFlNM+acLTOriZ3aGcUJnp3mEmc0FyIRIoJeBXxEoLuiWTllu5PW+fNhzAJvo+wPQ+q7v5uuo3OHziqyT97TsskBXkYi1ngTXGW7GNUCU5pNlqrQpdOPK9Rc8h4yDbKvEGn2mqnLbrRrE69AA1UDBHMZ2T\/\/nfUA0a0PHxoV5BlgDy6w7sG12l6La52YAX0d5CQwqaIToPV9qa3MFaFO+ayCC2TVDd0bMrhcTkIWqiouuTJi26x+++UfD1MLyYSWboFehR6Uj6tLBF2N88FdiQuqLYvDx\/pDUVoLU0QWywpT4WpvYnaZmTm00ky\/0i3VpzOEPwfGs0R1D2v\/YNv\/GPdhXxF3NrsbmuGTQfFxbV7mCzsObxnR6AtT1r+jov51AaZAcu+PGnBOhGnS6suV0FKRXwNkQAjUZ1pzhMmqsIwB+1FG9RIqJZ1AaCWLYR2wQZH8tOY4a7uoa2LNgE4Ar8si0UgQVcHN3V6rSG5Kc3LKdlFL7vVp0RLi\/Q3CyO7vpvvTuWTrtu\/r7sGBEwiPodyC63otAJSlxiZvlOO2h9koQ5jY1+xF4QPrUXLgXGkutqssDbKvEE9UIzXTuAxOO4cPFJFulJrOw7Kx776NilugQoDNOw5XgDPAPtymxeI2AgKqouhzaaXlijGodXriGMADIWrODiYoY1zHtV\/V2rG9uPuHw0YMGcCrBGzAJXquUZf0uUVdl4WHW9wvXNMSVf5vN85vJaTPVFlmZoO1MtW4ypvYn5XwmaI0nstJ8LJxldJQiLDAzdv+u7gP+7K5e8ewATzr1qW8Cn2irMNloT8mcIdFV9cxa2ua6bXIHKhZzCs1nPbBLIkZG16QCC4xvAwwEQYVQRUiBJOcU3tG4IAYJllk19sa+sTNdq5VyIxpkTHNJ3VjrsCwKm9hk6lJMpcMDT6IsxblFpA1IcY\/a8uctcWkjdd8EFXgLXHz2B1\/reLgjm0P6DP\/9J9f9HLBj0E+TlPHSYA13gSbojHO2BIzyeoauhyuw7WNX1ICNA2yr5DQmlbAqbiT366NfQSUPF\/Z8835D26bKuER\/\/IGW1SbgfnkucEHsUgrZxIBRCo01Mc0ReQT8EqLcBWXMyj6zBwmVlotvdq6w4SsGJYCy9S16tyCEy1reTOuYJEH0h+EQclKxBqZYa2Zaqz0ps+uNNOHl5jpoRAZzGAPh5iRLdu+t2C9lu\/+4TCANB+IPEIfrlrZK8pShJvFsh73UrwGd78UALXN5FUCnqXfReudQqR46Sz25dFsFc\/iWsUVIFSPujbNOZLz9qrjBM+OGSFcTMJMQzsHfGB100Kxt6YZjkddjNp8Ujq3LkRx77+3RRiNQrST24+bz4+H0zL5uEJu0hY5GfXSwCQpQfVBtBTgXwQOPZ2uofPCsz\/5zyCEas3DYvQ24Fs0Y0sP5Tr\/LMO2l4NRX5IKRZdKq\/C1Ngoxu\/\/k4kWd0yD7ihEBbSmLh7Snmm1xL+VG05ZowW6WU95j87bvMTQ4YHBdEQJOoKeqmST5UIbApEBD5NJUFj+MO344jDgtLh8hI4YMwrXiAuqNODGcj+DaPf3m+VnwadG5xs1bh7pEqtH13mjjKjN5rMdUX+qR6it5CfZZvFczEkzfds9fLth5z6ZqfAEooOQRNuLmONfj7o8bBTaiGFxGPcvCTMQI0Ad8HFh3947hmoFQnQqIArrrvrT18SIQ3HrRh5t5Xt5QT2Y0RyNZgk3TwEGFkcXWKt5swdwEXGsxhQlbYFwLSa2StpIh7+7a3vnuKWIRhF6F2xDWBuqbM7bMWVtK5tX5bWo4jYNXjVkYVqMLkTu\/\/mfsHXxQFakoPIzbq33c\/b9Kt9S4yTvLOVtiQnNxH+7l0tK+WudlKOOsFi+KNMi+UtQKIj7tFb\/Q5s8LraVEGmR3Ejmcj7Moom5DmKWuiYkT3GIj9Ckcu5xv8OUfD9OIkNCe1zLowrVzrhXYiHALrjVnGW7Gp5v2jmIsOAyqJQnqK8zs2PXeyJGN3ujzZanty0l4wMMesZGZvP2r9y+4zfvdre4GwYjSi7IRceJ2CB\/FBdf9cL6S3SnvNMGJ9n21+fl2KhxQ1zo+DYzetWN4trnRddINEKkSeU3BbBGw2hR2cEH5nB\/k3f\/grs+u7yS6SlSg2SpuEWpkmDo\/j52IPEWr4nYEmH1yEVWx9z46gHXr\/3XA2kC9zKiWmdJ8EqteFpgE3sBdq45H3ZjWauCTFinNaI5TtotxciTk2fkwLE6c7mXg4JPfWlye8+2mSkQOrw7yFrALN8LXA+BLxEpvknXRBNPR8qQmz34fBvceWY6LudIgu12IqAUJ1c1+tDMSsoBnVYqQZuk6iDwuqMwoorPkZFSL1JLzqBqgS5V1M+t49VL+4V0\/HhYJyVcCSrhkQi\/KJoRPiJuzvg7X2tvV\/Cc+acX69+KhQVmCMyvM7OsbvPFfrPcmnu03s+\/4ElZAa7fd85cLcoNx18PDouALLBXlE8AWhBtw98nVuGSUct5poeMwuHb3LwI3qRPwmcQJI043BRJncZvJs8BxEUYtGBGMQq35XpoBZu5+eDiC8x24rhq+\/ber4U1LPHmqKWB51w+HBcFH8BBCY4lwInJFBAPUsdTv\/uFwHkNeQNQlgKueoY7iqyLW\/ZTICtGz29tXgfewEmHKuCA711CfEVvirC1RS47\/ssFdywkWgR1Ui6HBByHCQ1nVfK576urLiC1R0fc7hiaCEJcMeRPlTNwH0w7EBRbXKXwkUD83qiWc4JmXvKvz2wS49fJV3NqYMo\/84ba\/ZGjnQNR8Lp4DPoMb7\/MNSpfUudqb4ITtZkQLcR\/u5SC0dH+Evrt2DJ955iI7WRLzllmoqBpXRXCts+06n+fXN03gmyjliijjqrqlUA2jtsgZW6aWnEq2j2vh\/kL5CAfu\/Ifhd4yHbe2an9m+QT\/\/8DBARoWSCsZYRIXlhKxFz89TbwQ+JsJKoIjLeibWryWp+NiZsgSv9Un9yaVUn+3T+qurOT0mksGThn72S\/8+7kO8LP50xwE5o5Qj+DTwx8AWXEWlm8U1LiC452NT86v1hES4ALqK2\/z7uARdAzijynHgFC5wq+KC83O4hOxU89dzdz8yHAj0K5RRrFVmRQg\/\/8hwH8oSdd\/XAlmUbhW6eC\/55QEGg497dk0zwJ4FZqw9L5w5C0whHBPnKzw7lyforkeGnfymB89+470q8B07hmVn47D5o+y7BZBSRbPmpO1hf7SEk7ZMIzkjODTPZ1kFufNHwzy7CKrZioj1tACyCfc+yE5rjnPNBEgC66QNnKr4AWMuvpK1UNnz2IAougT4uGI2zmo2czrqYtwuiCCpDrwLvKkuyZgy34ioEs2Iyusgz+MKJisBchKy0kyz2ptiKszSWJATXHi4xH6XoalFfBGkQfaVIuc3G1ma1eU2\/FRDc\/MjEG15ZJg993b+S3mR0AMsV6Qwo3k5YXsY1xxRcmIKg6sKfQ3oNx57gQMCZxWiux8ZXq7KStxiVBZlpQqrgWUovbi23pW4YKlFgva6ycdl82yYl+hcWRpDZYIflwh\/mUVPfu8b9yz40ZHfPPE35u8q00vGo64tNbzvqguw++jcivXF8P7P7eM6Prre9\/eKay+\/gdYmwLWPV4ARXHBdx72vyih1dUJONZy+R1mVQvPfhrhz3hphKdKyj2yJ17vnOMJtZKPW9wAy6trazwGTCJO4deKFu3cMv04zASCGWWMI1aJPfWsDdw0OIwFIw2kqqaC+gcjiKXjNZLZVUCxZccdbAgITUvn8juGSuiRlAYh+HVwdRZr9WJ9Urq+SKZ61ZTlpy8xooqZPFJd4vEOUQyivsTgq2kaRJeI0FVaGGBnTIuOaT9L77kKquDbxYZulGvfBzDcq5EA2ADeFmCVjWjSnbFfSnp0PPHRcd89LwGFNxynbwtYv3c+uJ\/5T6GvmJPAC8FncuyhrsPSYKmvNFKdNF+dsMYlJtN9HEfdu8y+luJkG2VeKqiBicBuSKu3xym5VzS1u5G5OBKhS4mPPowMgGEVXgVwVYQrHbK8cjXqpJi+r7+FEprbhFtIJICeQR8+L9uRxi1Iv792rHgtThCoxZIm0KOFUN8Fbvab2aEmCn6nKwTzRzP\/9m7cvWCGeF3f+B3pNnTFbyr\/SWHOdYO8W9Ou4SnaZxRtcXyrCe+fqwmctwwcntlpWjK3\/vhXdXPh3v+\/cZ3DP+\/vpft\/PvAv4Lm6m9ZfAS2p53SonFKK7HhnOy6zrUmgG1BGgkaVbnZNAAcUCXQIbEPqbHyTTTOAtaWo8NJrHnQ8whVejFX0ZoqUWKTXUI0heACc47Ykv4sRMn7h7xy\/XgbEAAIAASURBVPCbwNld2zd0bIAg7r2wBjcK0V9Tn1O2xIRmk2g8bXEJqkPA6K6vdb7ooApLBT6lcE1Fs4XTtouzWqKRvOfn\/QTA27h57Ckv3Ru3jbu\/9N8xtPOhGVRfx6m6XwOsFpCCBKw00yyVChPkF8J99H5a3WJFUTKff3g4ePoidE7SIPsKUQVxlYIa7RU\/8wFB1EuD7A7AiAHtAfmYRdafjHqyb4bLGbEFbDIXIw8XQPfAb7mL2ebvE3nQCxE3DKT0SS1aKtUTvab2bJ\/UflSW+nN1zUzUxbf\/wzfuWrDP\/97Bv6Wh6p2ICl2jtnz7WVv64ynNbgkwV2sqeDdXXBh8X8iHJb7ma29QxLkGrMN1KBxSZRQ3e98aAwhxm5llQJ+6PyturVnKe23xrXl8DxfoC+\/9t62\/l5p6WnMfMcmJGh8n4vdtYCswLLD78zuGn1HDQetTe\/brHRfY5XAjIFdbTH5KC4zbImFyRqMuJMS1ih\/EdWh0NEM7\/w7UbgA+YzGrz0Vl\/3jUw4zNJlGQ7kJaXTu\/RjmAEHbaQ5N0tt5zf7Rn8KFjiv4K+BxOVyTvYek1FVaYaU7YLhoLT2lccAn\/gsrFF4vSIPsKsZFGnpHW7Fk7A4sc4CvSdHRJWcgYsblQzcdCNZ8d1XLPi8EajkbdNPCSfnXfv3lP5A5pIeJjyUmkJQK92kxVV5rpV7pMfWefVB5b4p1755PdP6j\/ZPT\/wZ99\/StxH+pl89zgDwAyAd6Kima\/eM6Wvnvcdn96VPPdASZN1HQmWVxL93JcwA0uaA5wwfKFqletpN37d\/a53\/G930+io4IL8HGjNCtxnsS3ALdjecQ02H33I8OjVrCdMK+996cDcoGq+LpQPX\/clpjSfFLVh6vAO7hKdse3ioMWcDZMN9U103PY9pnTTR2DhBPhRlH2YjgnFr2YamPK3LJl2\/3TQ4MPvgTyKk7UNguYkjRYa6Y4Kr1Umta0CwjBvbMArF7kMpUG2VeItaqee7AN7WkVb9H0gJUqSAK7q1Iult\/s\/Ct\/Ur01M5r7wqgtf\/rVcGXhgO2nRuLaxFPmHSFLRI+p0Se1cIlUZzZ5Y+f6ZPapjESP5k3wSreZPvvZ\/IuRbHkNWLgBNkCIeB66NlDvnnFbvP9w1H\/9Ududr6qfyJ12yryR5YMD5AW1C5tDfNyc9r8CulSoA8+KMvP5R4b16QWuwaJGPVRWIlwP9NTxZcwWmNXsefn7hDEDvAacQAnjPpj5RzcCWxRZO2rL\/tGohxnNJL2KDa6K\/TquXbyRBtjx4cNwCL\/AJQv7gKyPZbk3zQo7y2ktE+iCWt4F6EdoAJGkQXZ7eOFfb2LzjsMWtxlo5x0jQN6oVo2kodhCZeTFa+WxE2uXVTR\/V0Uz9xyK+lYNR31mAWSMU+YIg5LBkhXLUqmw2puO+qUy3mcqh1eYmVeKUn9crTzvGTuelaBhFJW7\/j7uw75innnk70EbKyORP6rjf++k7f7IwajPXwDCOikp7cDgZto3i3IW4QDwjnbAaJg1khHYAFwraL5is4zaYlJVxQEmEF4U92vHFjV+Ofi3BJiMdRZMm4GuuvoykVwxugtR4KzAr4AR0hbPWNm87XvB0OMDuxC+hKtmZxSkLHWuMhMMSx9V9RdC4uZCfFHyCNHF3l1pkH2FbH54WHCV7AZOEbTYhh+rzZ+VQzS7594NtbjPQ8rFc\/eOYQDTJ4H8D4dra3zsVxTdPqPZm0Y1b0I8OmAflfIhtF4pGSw9UqdHqvSaul1jpqLl3vR0geDlvAQvlKTxG8H+KmhkDwOy5Rt\/3jE3xbOPPSQQdCN8oaH+d07Znhv2R0v9Mc2nd35KynsIrq36cyh\/oIaDz3xrYYuh7R4cEHHK9NcBqxQxE1pgTItJbR9189jCGwiNp7\/ZmdXRvYMPEUBG0fUoW4E1CiYjIUHyx9bAjZu8o8KvBGoLvdtjoTP0+AAIIyr6mKjcjptnRlDWepMsj2YZtQUaCyfIVqChcBVKuGv7xd1faZB9hagigkaI1Gmf8FnLRsUo0gOd79nYCdztEjIZlLII\/TPq31iNSl8zYm+JVDY18HLuRbYAXmcpF0XrSnooPpasROSwLJEqa71JeqUa9JjqVI9Uz5al\/q6I7jLoyxmiw4qcuW3b92vv+1YdgRjNAZst8vUZzX7icNiXPWNLSZ3HTEmJE8G1W64XpfvuR4ZHdi3gAEIEg7IMZ93V21CPs7bIpOaSWNWKgDPAvkaOmb1fWbjn\/fdhRQXoRvks8AeAsU3\/vwIR1WSHC4pzOXlZ4ICRznpfLkS2fvkBdu98UEXlZZyl1xqaI7U5AtZ74xyOehaSAJriEm69l\/KPEv3ULASsVfU8Y3ECLe1MwyouyF4wd+hi485\/HEYUwXm8dqmwSpSrcR62NwfIzSHSj5qypoJhHYF7swtec7vooZRNgz6p0StVeqWmq81U1G9m677YMxnCt7ISve6hLyL6G1RHVKRa00xw97bOqVxfyNBjD\/moXoPwlYZ6nzlju8uHbQ\/T2k5Ji5SUBYUCRSwlcR7AC3dt0PPWXTcqUpzRHKNapIJ3XuUuIbSKGYdVeK2TA2z3adWAlIC1OH9jFCHC0CUNxjWX5JsuwInSvazKGGmQnQwUizKC8AxwG85NAF8iVpoplpsK01HiFevf+zRN9wq1ZHHdxL+XNMi+QhpVq4Uu0\/ISbdf5PG+RJKr+1n88xNA3N8Z9KlKa3PHTYTF1chLRj8t6XSdwM+o8A4FN6mwNWvZrKQscxT2QRUJKpkGJgG6ps9RUWWZm6JJaUJLGREnqE75ERwV+hfIbET0GOoyYMUUisLr1nu\/F\/XHmF2P7Qe5W5PZZzS0\/FvWaKc2TPgopKb+TLIJZyNHDLwd\/QAPy6mY0N1qVzIQtMmELRGqStgIoTvDsXVEOx30w8404R9oWwXt\/r+Skne60l8UU8CpwSIXwyQ5Q4O8EfFArVBTewgkHrgA8g1KSOqvNFEejbuoLo8bUGtOti1AkDbLbQ6F8\/uYIca1FF3oGzxctX2xXzdbUJztO7vyHYUTcNTdCQetswlnTfBRng3EDrt2vgLOeSdheIuVSESBLRE4iPJQeqbPCzNAtVbpNnV6phktMxeYkqKnKIU\/su4K+C7ypoi+jnACpq5WGYqI7v\/LncX+keWfo8QF8UT9ErgfutsiGMS1mTthuqskVPEpJSQIhLuBbsPorv3jsQQIVg7AU+AjQE+DJuBaZSWaruMV1DbyFcirug5lvPFRDJGp+7hBcgG2wvLfdTNw1anEG+A1wsnn8KQnAQ1EkAE4ovIIT1FsCkCNkiZmlR+qc1XZIWc0JrmNZKADjF\/MP0iD7CjEGsaqBs9KiTvtWoVY1O6MWn\/bNg6c0ufNHw25oCXIoXQjXK9yJW0iuAa7GidakLFDcQ2bxUYwoPkq31Ok3VbqlRq\/UtF9m6TE1soRBRux4lvCcL\/Y06FuKvIFwBOEk6ImGVxv3bMYiEEnIF\/7o\/xj3R2znyZRQZSnC54CbAvVKp6IuGdHCQlCuTUmJCwWmgRO4QHtB5qOaegt5lPUI1wJS0SwjtkS1aVeZsBDOCZ7BW3qRG+qFjAcaunurNf5oDRgD+Lh3X5C0K+SwwEHgNYUJq2mQnRRu2fZ99gw+ZBUdw1WzD+NGEcQXS79UWWZmGYsKhMm8ty5EcPdapHLxG5Y0yL5CfE8JIhOo0qC9gW6u+eVbNYm\/OzsRcbNly4GPItwN3A1sxKkoZlm8Hq8LDsWp8bRmqQ1KQUK6pEGX1ClIQJ\/UWGZmKEtdsxKFeQlqeQlnM4SBwEmFVwTdryqHVTmoyBFEahgbhaYRfP5f\/R8W5OZ4Ltj70wGsa3e9HrjdIisnbVHO2C7quiCUa1NS4iICjqtwEKjGfTCXS7MbvCyuVXxNhDBl84zbfBL9cluJjbeAQ8jFtYYuZG7e9n2GBgdC3Bx6DXffNYNsiy82idcJYAxXxT4i0Nh9karPKe1hy7b7dWhwYAY40Py6Fug2KOVmwaJgA6aTb90pza9A1HV6XAxpkH2FrFoW6pFTWXABVTuD3SJOLMtysa7oKXPGlx45lA2UTRb+EPga8Gmcp2nrQUxJMK1A2iLkiChLg5JpUCSgKAF9UqXfVClKg4IEYUnqjbwEkaA1gTMChwU9IcJhlFdAjwIz6mbDZjWSILSeAnz+G\/fH\/XFjRw0G6AE+BtwYqlcc1RLjWkhim2hKSlJQoALsF8sxIEpmnPP7EbdHWoKz7loSqifjWmCSPBGStFVAcev828CILNDugcv41FWEoPn5VVA8IkQSazodAu8CL+HUxdMqdiKxDZBjIG8DtwBdgkpeAvqlQlFCZjSb1HusRSvGq+ISURdFGmRfIf+w5To27zjs4bJ+rXmWdrwGs7ggO1RV+7G\/3s9r\/+11cZ+OjmfP4ENmVEvZZxujHz0adX99SjNftch1QD7uY0v5YC7cvLUC6ryEFCWkV6r0SZUuU6foqtZRl9SijEQGmBD0lEFHgBHgOPAmcBQYVdEzCqNyXgBDFdCtX+5w4bLLQcQHvQr4JLC8jiejtkhFM2jSttcpKclBcXPBryKMAPrMwrXv8oBVOCHQrqpmOKdFpjSR6sIWOKTK2yzgFv1LRSxV9Qhw10oMSlbC5kR24q4RuATUSyj7gdqu+xbss9HRbN32fd3z+IMjKrwDnAJWArmMRPQ2R+\/GyBMkv\/lTgKpA9IVHhnnqItbiNMieA1SIRKnRlHdv448uAYiodC1N7W\/mm6GdA3mUVT1SuXm9Gds2ZvObZzRzlW16\/6XEQ+uBu3AL4KFksBQkIENEUSJWmFn6zCxFArpMXbukZstSNwZVQUd9sacNdhZkVNH9wDDIKWBchOOietwiEWgEhHfc871FsfGaIwq4UYrrgGJVs4zaYip4lpLyu6ngqqkvKkw\/s7BbYT1gPbDeIvlpzTFmi9Q0kcrCEU21ai5SRbgT2PLVB8KhwYEK51+n7j3qkcj2vFYC6iXgFDatYicZiUxFfR3GidN9FMh6WOlx2jZ4yR1HuBArMIOcdxv8vduXNMieE7QC0lqI27UWKbAENMC9EFLmkd2DA2WUjyv6dQPbuqS+1seWNZ27jo3W6pbBkhGLjyWDpSgBK2WWLlOlLAHLzYztM7MCqI+te9gZX+yoh60pcg70BeC0IiOKHBPhFCqjoKDUbWjqasXe9cf\/Lu6PvGBR0RJwPbAOyExqnhEtLITMdUpKXES4GcafAQdkAb\/n9w3+gBBKCjcKuiZQz5vUIlOaS6roYQ34pQpngWixZAKHHhsQhbPCe5blvrj3qmriwuw67vl4G2F213c2LJKrtDC5\/Wv3657HBg6oYRjXcl0GKEmDJVIlT0Qt+SGpUaEqnB+p+L0k\/hMlnc07huG9KrZP+4IuBZaCyHPb16cZvHlkaHAAYBPw58A2YFlRGkZJ7JxSR6K4CnVWLKqQk4glpkIPNcqmQYkGq7xZ7ZVZAWxOwpm8BDNAQ9BA4ZDA6wJnFU5aMS+LctZdRWmA1oA6iIrAlk73q24TQ4MPAtqLs+5aqogZt3kmNEeIQdKnKCXl\/SgwDDyO8jNVpp\/59sIMIn7x2INYi0FYgXADUA7wZdwWz89hJix8i4BjwPNAxYLuXgRtyLt\/+neoKmL1DE5DwwewCKF61JOXDBkBXkA5suu+DRctRJUSH2oYBd7AjWAsBSQnAd2mii9R0ocyLBCg1FWoP32RYztpkH2FPLd9A5t3HM7iMhsV2jeTrUAgQvcd\/3hIdn9zY7Jvz4VNDrgR2AosA4yb323gNcWzUuYWpx6nGOezSFkCeqVKSQLK0qBPqvSZKl2mRp4wyktYLUmtKigWc1jQ4zj7ldPAKUReFdVzCpGVaNyoV8MYS2RVjYpi9c4v\/UXcH7tDkQxuFnMTUAjUY6oZYCf9rZqS0mYsrkJ3CNgBPKrCkWfuW5gBNkDkhFlb79CrFTEzNseoFmkkbwuqOAGtoabWhi4WtWq1BvEjg+Dh9rKEeIzZIuOaR5EkJUQDXBLqFRaBvVqnIBajwm8QTgBXAUYR+qRGn9QYp9Cy+ksidVxip7Hr3otfjxO3wi1IVN2iJFKjfUF2CFRRXRpGTgAt7tPQweRwyuFdgJGmGMhKM8Ow7V0IcySJpLVKmfN\/EnwsOYmatlkhZQJWmWl6TIWChFqURlSSRlCgoUa0pjDsYZ0QGXJEkQOCHsPZr0xrJGfu+Or9laGdD4GI3HHP\/fo7DiVljtn76ABWySOsoZm5ruMxo7kkv0xTUtqG4tbADFEAcjbEvGThH1XYAxw35uKVbJOIOuHwMnC9wLIII5P6nnVXwlaBAFfF\/jVKYzEJad35jT9jaHDAw+lnjABhTX3\/tC1zzhZI2GuyAuwH9mMXrq3dYkMNFndvvQH8AU09o6I0KEkDgyZ1X6C4GGtGLzHTlAbZc4NF5AKxiLbhK9KD82tOg+x5YOjxgdZvZ3H2TMsByRGyykyxTCpUtTutZl8STi8iiyUnIXkishLRJQErzTTdUqUkDe2VWtRlapoltMCMET3lYU+LU\/t+V5HXBcYUGQdGUUYwzKJ4JsTe\/rUHzo9RbL3nfkjYLmGRIEAvyjUIfQBVzTCjWawmzrYnJaXtFIjoN9VaieCdEDNY1exPJ8m+U8GbVQif\/ubCDfSao1bgOsBuErQnVCPjWmBac0l8b9aAAyhvsQj3VIJkFO0FNMREk1rwT9puKvhJulIRrkPtDeBM0Fi4WgWLiaGdDwEoqhWcqGANKApKRkL6pUY22eJnATAjemn3WxpkzwGeTyOKaOAe\/nZt5D1chdVHUqPseUVpNO1TTgLXAHgSsczMsMkbY1zzTGou7qNMNAJkJGoKk4X0SI1+cdYNXVLXpaZCj1TEiDY87JgvdsJgJwTGgIM4hd0zwAlUjipMgkQIVtBwy7YHLtQlWHSbowRjgH6EDTSFTiqapaKZJG6wU1LaggB5QpabClebiel+U\/11URo\/WiKVn5WkfvQHtVujCp4+u3Dtui7Ex7WGbgTJVTTLaS0xrrmkZT1breJvqXAiWmSey0\/\/6O9RGl3AdYqsr2vGH4nKjNpi0tbqCvC2wOvA1J5\/0xHPSMez9Z77XdFKqOP2cseBfgAfS7ep4ROhyUrotFCcWNsIruB20aRB9hWyeccwkdOetLgW1XbRMkbPiGh+yyPD1T2d8UJOFFu\/\/AC7BwdCnOLmIVyLS1mAkqmzyRtlXAu8ES2lpolcHGKh5W3goXRLg36p0mcqLDezLDOzlKVOljDISTiZk3BG0CrOP3E\/cBiXqT6MC7CnVVSBuigBKrbVNLL1y\/fH\/VFTPoS9jw6gbr6vD1fJygHMNIPshPqupqTMG81koy6RWnStNxpuMqPHukzt53kJnyib2gsZiUZu\/tJfdlJwJ0ARZ923OsR4k5pnwrrZS5OsMDvAbfzfEhjfvX3hzsFfDplM4KOsRviYwsqKZr1ztsR08goIE7hK6AEWkb1aR6DgiiN6DjgC3AQYTyx5nN7OVPKSb60jnwXOkQbZ7UUVRDDOSkvaPRuiCL5CJrpIz7aUyyIS9CTwMsitOCsi8bAsN9N8yj8JwP5oCTO6MC2zf9eNc7GhkEHxseQlJC8RS6TKKjNNn1S111SjHqnWy6ZunRc1+8UF0CfVLbbDoMdAZhWtqOiMNVHg26y2DvCObQ\/EfZpSLg0BsrgAuw+QCENVM6TOdymLDYNqUYLGajMzcr03cnSDN\/pcr6k842Pf8sSeuvWev+i42VIr1ojKUkFuAHoa6jNmS0xrNkkiWi1mcYHbEVzAvbjwtKup\/n5tpKY4Zguc1C4qydrTKC4Z\/xuEk2jatbbgEI2ASVyXYhUoAU6DRwIMNom2foorop6jKQp4saRB9pWi5wOUWZG2thcJUEIl285R8Dt+fAiA3d\/Y2MaPGi93bHtAdz8+MCaie0E\/DrIUWAKILxFrvAmyElGSgLfDpYxpPqniDR+IQSlISJaICHFehSr4TYuyCDn\/ZXFztB6Kh8WI4qlSloaz0zI17ZOaXWWmbK+paoZoysMeyUh0wog9g8proPsVxlRlCpFxRCeAhnuQlDu2pdZZnYIKBVyQ3Q0QqsHi4TXr2InbZqekzAMC+Gi1WxpvbPDGn7jGH\/nnfjPztkc0oyrhrfd0VPX6PMZKDpH1wCZFshXNMq4FaskK3FqcA97CdVEtvuBNWAF8Ari6TiZ7xpYZswWC5AQ8ynuCZweNUF9A26wUYOtXHmBo50MW1Vlcy\/gkUGrNZRtJ7M7Z4jSZzuFmyS+aNMi+QvZ9ewO3PnxYRWjgFuaApmLePCNAf3ObOu8v6Lt+PCyNgEwYYlTJbn54uAfIIRKoyAwwJarBc9vXt+Gjt587vvxAsPuxgbdE+FHzZbQFFziIwbLMTPMJ31KUBm+FSzljyziDr2TjoSw3FdabcZaaWTyxRCpYPAL1mNUs05pjRnNU8QElQ0ROQgoSUpSAZTLLEjOrBQlqBQnGChKM+UQTgu4HXhD0iKqcUOS0uIUqagbU0dZtDyT9FKVcJqEXYNTPINJDM1utSHPOJb3sKXNH624SOG8MZ5t3mSRgMKGZrJyd1tyvhqPef7gz\/+a7PjYC+IM\/+u9jPrp5RCgD1wqsDlW8Gc0xbos01Iv9mnwAJ4B3gHF0cc1jP\/nkXwkN1gE3KbJ02ua9c7ZMFT9JK3WEq2K\/InD2yW+l45ELFIvzyT5H0yZPUPGxZLH4YgmTJ36mOKu4Ebg0t4c0yJ4LjBsYBaZFtZ1tRlkgqzJ\/d+TmHcOoUqwHshq4GuVG4HqEEu5mmxLV48DroPtvf+TQ2a6yDZ740jVtPA3t4Y6vPFAdenxgCCWH61rYjGuD9QyWfjPDRyWgSIOXwtWctF00kpMF\/hcoQk5CNnpj3OSdZomZJSchBkuAR0N96upTx6ehPrY5QSeuiq15CWtlqQdZCRtN66y3BD0AHETkNZRToIEiNVQiDUW3fv3P4\/7YKW2i4dc1H\/oGZwmTh1ZFr5ljad5NKQufC6\/khZvy+b66guu0yWApS0BeAvKEmKYEbF19pjVHTf3YxZsiJJrWzOxMtKT6P01\/WZ+8t\/O7wRTpFzePvTTCMxM2z7jmk1QdvZB3BQ4izMoiywJmG9kc8BHgWkWK47Yo41pIWrBTx42YvaLKVNwHk3J5bL3nfoYGB6q42foKEAn4GSxFwqSWpiyuvX2ESxwlSYPsOUDUKlADmaa9w4YZYJmoRACbdxxmLivJm3ccEqBfRG4F7gZuwb0wC7gbrZXtrQJnQV6yKs9OTnv7bnvk8FFB63s7T4ytAjyDSzDMAnfgbL18g9ItNa7zz5KTiF+GV3E86krqhgKAHGG41kzUlphZshJ6Cn6E8Q0qBWloQRqIG4qIQPwIEwEnDPYErq3ugCJvCnoIOCfKWWBiy7b77Xv2LcrWr6Tz1IuNL\/6r\/xNDgwM+zl8+3\/r7CJrPRBpgL3Qu8HjGCGjTlq1VSba4ZN5vB7huE3UlV99DyUlEDqf9sNyboU+qlKROWRr0SI2sBJyzZV4O1\/J2tISKxr7dMYBRwY9YHI4gIqxGuRa0q44nI1piKpnWXRHwugrHBQKTuMObX0S9pQifBFaEarwjto9xLSRtNnYGeEOEN8WkgmcLGqGOMoabc1aArIR4EiW1haTl7z0CqYVX23lu+wa99eHD0+Kk6dt5Tg1wNW7xmdP0z+YdwwKsAvkm8GXgU7g55A9adfuA1Th7q0+C3qDKPyrm9c07jtSf276ujadkftn65QcYenxgSpHdgk4CZ4Gv4a6DAShIwDX+OfIS8kuu4nDUSy2B+TmD2kC9fYr854xEXbjrd13zy1dkAqgohCARcErQl4HTtmnBICJHUOdN7TUITITeeq8LqLemQmUpjjzNZ6OiWUa1SD2Bz0PKxdMKrvukTo\/U6DU1ytQoiCVQjxnNMqsZZslSV48G3nlNhwghRAjVwyJ4aLNHRpuBuTTbvlvBuGv3DjH4WHqkznIzy1JT0dVmSpebGZOTAB9LToLzowiKsNpMMWnGGY56mY3fGiYP+M37PqF7yTlG2QRsAClUNSOnbZGZ+JMd\/\/IondjZ6yhTCvrzzisOfChDgwMZXBX7YwrlKhk5GPVR0USt0Ra353g98jjTKC+S56dTEdNA7ShuxNYDyOK6KOMf7vlAAlx7+xiXGGslbrVbiGx+5IjrWnOt4jVcpbcdhEAetPDc9g1zktnbvOMQIAZkBfBvge8AG3E2HL+PMk6SfymwDPRvi\/noN3SYvtHWLz8AUNnz+EP7gKMqegz4c1yQmgHXErvOGyVDSEnWcCDqb2bwE4MqTFbwdx0M+\/\/pI\/7pGm7f7OHWhdXASoQiyqSqnBAnUIZCYEVrlexUsO0L\/5fW97uk7F5K5zM0OODWRdfpUrNI6ZTt5mTUTaBe3IeX8gG02r7dl16w4VE8oNgMZrulwVpvkqUyS4+p0is1uk0VH0tFM1Q1S1WzTYErFzhPa5aa+lTxmdEsM5ohwpBvDqJECDX1qOBTJKJbGohYQgRRoUsCuk1VS1KP+qUy02eqk0VphIJOKgwLiMJ6Ra6j6ckOkJUAT2yzyh7rq8gHMqLYXR1uD7XrZ3+NF\/kF4KPAyhDjjdsik1o4n0RJEBXgVRWOP3PvhkUleNZco3uBzwDrAvXN8aiXKfykBTuzOG\/sd57948V1jToSawV3Tau4OCarIuSac9mXpCw2\/0Q0W8V3bd9wSfPYkAbZc4KiiGJwok6zuMru\/P9Yd3NaFVbj5hvmABGQPlx19gFcsJW9hG+QAdYAXwXCSs37q807hvc\/t31DxwVhW758v+55dOAEwn9BqCD8a1zFvzl\/qqzwpvmMHKMgAW9HSxm1haS0ykXAKavy6ovR6qn\/Zdtt5zd9zTbvKZyKJ4pa0PP5gVT9O+WisBiEDIIqhDOa43DUy6gWk\/IMLEpczVjOW+61roSH4omlgLPg02bI3S918tIg4yxWdIWZ1n6paKt6nJFIWhUIBVOQgKIEuAYrh8XQUA\/bHBMQFF8iGmqoapawWd3MSUBOQup4hOpjnOpslCUMDRoEeCc97JtZiQ542GFVeU1dN1FWoYTwUeBPgK2AbxECjLPajPvEuzXXB+QLjwzzVAdXS401Brd3uF6hVNcMY7ZERTNJuA4XEuEqVK+gTMZ9MO1k76MDWHc\/rgVuskj3jOY4EfVikzWL3bpGL6pyLO6DSZkDXLxUQxjHVYmzVoWM2LgToR9EgHvHjF\/OP06D7DlAw0jFeM77rb13iAEKorIcePNKv9mtDx8GFyB+EvgubvG9nHvE4KrZfwQcBvn72x8ZPrP33s7L3m\/56gM69PjACMI\/4hIs38XNrncB4hOxzMzwCf8kRWnwZricE7abiFg3fU0NAQ6KMPz0+6oqzTZvy2JpaUyZH1yAfRWwKVSveDrq4bQtU02r2G2j9WD7KL5YtPn7Mg0KElCSgAwReQlZZirkmz6lOSxlU6ckNayKRpgoI3YmSziZlXDUiL5rVX4hkFO4RpFNwEpcQlYVciBe88\/dghZycr4AZWm2CfoSeS4gx\/Keamu2ACDM4JLHY8BR4EWf6EWBk4KesipjKGFzCFwEPBXOAlcBNwCrFWioScpCZnFJ6AyuY6jjEs8AQ48\/CJYcIjcAa0EyFc0waovUk9cqHtBUFTd6QVZoEaCuDtCNcCOwMcL441rkrC0lLQka4p7\/l0QYjftgUq4csVg1NHBidh5wvnMiYSZe2jzGlt3YJZO4FW8h8vx3NrF5x+EQF7g4rZf2CKs6zRkobPnRsOz51uUHsZsfPgSiPshK4C7gD7iy+8PgKtr3ILxokYnP\/uh47YVvrZ3n09J+tn75Abt7cGBU4Oe49pcqzuKrH8DDstTMUJSAPqnyRrSC4aiPmfi8QhVXqX5HlVNxn7+UzmNo8Aeg9AKfBT5Z0WzxWNTDhCamk6MjcR72753hLmnQY2oUCShKSFnqdEuNLmmQlZCc+zvNE+C6qUWN2ECgLq57JVDhNE3lZUEPqvDrED1ohEhVBMg1v3zcWNHa5le\/QlGgG8UgZHFt3H3N\/15wrbrV5r\/1ce\/PCm59msYJzQwDryqcEDQCAgXbHNs5z+7HB1TchrzW\/B7NGXDT9GWPPcfbUtrP2oRE\/fOBioio9uDmfJdZxJvSPKNaJEyWkBa4e+8wcFjMpVnzLHTUkEFYhZvFXllTn3O2xITmk9YqPoMrIh2wftI6iVMuh+a4v+ISqx64jI9FaSQrCW9xwfVhce+iSyYNsueAWx8eRkWsqIa4amY7vWkEyFklj3thXO63Edx89\/Ugn+ECNeArIAOsQ7kZ4bWshnU6bD67xR3bHoiefeJvzxjrPYl7KGeBbTS9tAFKUuc6\/xx9pkqfVHmn2T4ew8bDAqPAO3qZLTApKR\/G0OCDADmEa4HbBFZPad47YbuZ1UzSNnALjpbomGkGjgJkxAmClaVOXgJ6pU6\/VClKnbyEFCTQIoHNu\/lko0jdoBOCnWpejwYw0mzfazS\/RoF3gXcEzoCORsaOipoAo2pR7vyjvzh\/XM0xEwMcwK39BkAVT5QcUEDwcJsqbVagvWYA3loEKygzzT+bpqjitBpX9d36O0ZVxL1ZPIRc8+c329MNviiiGve95wNOuFqSUlyfe0TwFVktrpugGKjHuC0wrVksiWjbb6G4d\/VB4LRIZ3YWfCiGHMp64EaL6ZuyBU7ZMlNkkrRJawqu8orCCIkVn065FAQximZwCdEqkHERtxf3Gv1+QtyowkHVtF08XqxtIDKJy8C36y5pVQ7KqnJFQbYaI6h2C1yPa7ebK1YANwIrFc5tfuSwPnfv+jadnvZy55f+QoceH5gAdiN6HOQgcB+wHreIiMGyzExzk6801AkAxeBF2cDZbx0TIRURSZlbRAzQj\/I54KYIkxnTAhOacyJWcR\/fAqGlrW0uqMJmsOfbvAsSUMS1efebWRdM07AladiCC6YVV5Ee99Ax0Fl1gfMhg4wAFZyDwAgu2TYDRM1otQacVWVW1aiNTHTX1\/7d79x7XzBmUm9+ATD02ACiiFi4\/WsPnP8euwcHRCwiVhRFt3z9fgD2PDYAClsu2fbPKmIi3hNvRIFIBXuBtViMCBApbocZ76HMI0peYB1OhC47qxnO2DIzyZvHbuDakPcDk09eQSfgQuOXgz+grtoFci2wKVC\/OKZFxm2BSBN1lULc9XlVoCKL5gp1OIoRwWtKZQQAEYZIPTJiCZKjCRDhRpbOwuV1UaRB9hyw774NbN5xWHEtapdkVH6F+DTbz7hCf25RFVx786bmr3O10maAq1GWJe0NOx9s\/fIDDA3+oA7yNvA3wCHg2zj1zl7AMyi9UqMojThaGFut4m8Bx4h935nSSex9dACr+MAq4A9AVp2fx0xfN5dEHktJGpQkIC8hZWmwVCr0mCoFCeiiZrtMzWbEClARdMqgYwadwXXSvNv8mgJG1AUUZ4FGs9UqFKRm0HoECmpQ7NZt35vTNWGrC5b\/xfe8Y9sD+kF\/f+nBdevnfF93Dz5oBSlxXnzStYsnZM6vldDMagfPZIOWQTYAqyLEn9YcI1qgQaLaQME9I8PAUZXF1YYcOQeZ5bgCyIqaZrwxW2JWs0ka52ntVV5qugdET2\/vXLHAxYRiFRWaHUuqCIF6hOqdt25MCHXgOHBC0iA7dgzupRk0vy5FkftKfmaWZkB868PDsu++y83GqoCUcYJlc9EqfiFLgIJB\/b33XroE\/kJj67bvA9ihwYEzoIMg48C9wN24yr4RLHUMYXNJafNrbQYn9jJFGmSnzC2CUkS4DreBKwbqMavZpkJVygdhULJE+KLksawwMywzM\/RIlW5Tp1eqtiw1ERQjOuqhY4LO4p7hU6DvgpwERlU4BjIsqq3xnECFRmSiCFU1kS+guvXL\/6L1esEHfeLK8N00W9INVhrn19lE3H9ZnFhcBwfZ0kczWd9Q34xpiWnNJfFFM4Grkp4UXVzz2KGYLKrrgU0C5UnNy9mm+nuCGvpD4BTwCjCRBtidgzWRNeoJSAYwCgR41H\/L7yIRzAKHBE6JXF4BNQ2y5whVVRGp4y5Ku4JscCrWJYUMIpfdESeKqqgH4nOFVfEPwABd6ubyFtHLTC0wAvokUAXpBe4ESgGGqmbi8Ay1wGlxFfbpuM9QSkfSA1wLrACVCKGO13T06ixai21rwXQDg+95S8sF\/51TqlQMbkhZFbJYlpgqPVKjLA2WmIouMzNSlrrmJAyyRGMZCacFrStyCCfSdAo4K8iIiu5H9RwgqlSwpqZW7J1f\/3fsGRw4\/\/O33PPABx12R7Fn8CFceYR86yL4ElHHczZecR\/ge51nplOnJoZ++pAPugbYqEhXXTMyYQtU4xP5\/F2cw3kvj9KxCY8PRlW7xHmYrwOyI7bIiBabM7GJQHHFgNdxGg\/t7BBNmWcamYbNN4o5XPySAYjUuNGeuA\/ut5kFhhXG9TLXiDTIniNUCUSYhbbbQPQD3QKoiN728CF+cd\/GS\/4m4rxsa7yn8jpXSPP79TqXlcVDU6RH9zw6UFPDMHAIYQu4rJ3Fcw0E7UWBE6ocwV3vhLxTUzoEAUo4j9xy010Jo0KnzdNlsZRNg9akeUM96uoh4oLrCzcLHpa8RJSlQV4C8kSsMLP0SoW8BLYgQb0gwUyOsJKRqK7wuqDDuNnpowrDoKdBagghItOK1Ld+6X4d2vkgAHds++026y3bLq\/teqFiURFEmslNHxAPS6geUTJUrVtjXSEduu6KaEFhA7BKITOrWcZtMWmKwS2OCLyNMCsdej0+iKHBAcEp\/H9OYGVNM+aU7WJSs0kZqwB3PU6hPI+zT1o012cx8MU\/\/PcMDQ6UcF1HPggBHjU8ouTMY4PTK3kdmNbLvAfTIHvusLigpUZ7+20KQA9oQ\/Ty1yFj1KqaSdU5D7JbtiVlINjyo2H2fGtxtf0YFItkVSjSbMUP1QXYMbw5LHAEZ8uTZodT5hrBZadXAnnFiXXlJcLI5b6mkoWH0iUB13mjrPImKRDgoUQYGuoTNtuTg2a5skRAl6njEeGhFCUISlIPMhKKIhOCHjXoQUGPKLyioq+JSkORuiBTBq2CNCLUtXnf89tt3u\/\/82JFFHE2lE5wHZyYjo+gyRBzMsCsKnUbEX32b4Z54S87612ohj5cF8syVfGnNM+E5pNm3dXyvj2kcNgIQSLujjaw96cDWPdsXAV8RqE4ZQtyTktJ8zC3uHn5V4AZ6WShwMWLjxubEVWoaYaKZpI0VhbgxioPAcHlVtgT9VQtZMRDFK2KyhTtDV5CYLkK\/r57L18dM7IGXIIgYu63wj6QM6JmsQXY+x5\/0FW0nEdsH80xgrC5GY9hTrAhwqu4Vjn79L2L63qkzB97Hx2gKeJcAJbRDHQK0qAsNQwWkid+dEn4qK4ys3zKPyHrvTHKUicjUdObWgnxCNT9yRMlQ9gQVCKMATlrsGeAMVyG\/AjYl0BOASPWmmMK0+JF6iwVrW7Z9v0L1+J0o\/kh\/OKxB0HBOievSnO9JVQPH5uUOb8QOCYwVpkk6rQAe\/fggCisELgO6IkwMhqVmNJcUs5\/C4vbPL++a\/uGStwH0y72PP4gihqQHuATwOpIDee0zJTNEzWdDBJCFXhNYb9RGk9\/u7OelcXO0OCAcyBxGlC+Rag2g+yEaGdY3Hv6JWBy1xXoAaRB9hzRbIWs4YRoKri5xHYQAf2isgSnHHtZNGfZFOQ0bjOQm6PjaynI5lXpw804LBo8YwnUM7iAIw\/OuzVobsvba6mOxbVenTBNheGUlLni9q8+0PJKbuCSSQqIL5arvEkOR30c1R6C5v2eiFfpJSCo7ZPa2OcyxyrXeWeXZCVUQatAwyIeSEnQQk7CEeCMutGhBsgpgx4GPYWzzjsHHJaIM+ohoI2t2773\/nmv9PG8BHyjBEirayoDbkwhUA9PbDzykr+N4t7P7yBMxn2+5gNxe4ZrgHWKZCua4Yx2UUtWq3jLBWa\/OHeNRUOzmSODa+f\/rAIzmuNE1E1N\/SStxxFwBHhFhMmn70sD7A4kj0vEdwMmxImjJsiBoIHTP3nnSgJsSIPsuURBQtpv4yW4DW3fLT88JM9\/e+Nlbc6MKKomBM7q3N8XHlBSZK5VyxPP5+75C4YGB3zcYtIDYBHq6tFof964gWvBGgH0qbSKnTLnqOG89YqEQMbDsspM8gn\/NIRwVkvU1SNsWisJ\/FbK6bfFwxKD9dBTZWn8sCT1n2QkGBO3WV2De659YBplxDmTEIqzzRoFGRG0roqqldn6RLHxxf\/mT+L+PB3Fzdu+36qO5HCBhFUwrbb9Vgo5RgLc2jsM1Dqtit2khAuyVyv4U+Q4pQWCZLWKW5wn\/JuqnIj7YNqLCG5s71pgg8UwoXnOaIk6Xhx2oh9GBXgNJ3gWXuH3SkkmRVyQXVZE6uonKci2uAT5O7j1+opIg+w54rntG7h1x2HEXZwa7kK16+3iKfQhkuEy1butGkQQVYI5Pm5pfr88YG5\/ZJi9iy+483AvtywQWhU\/xNDQtraLK66LYL\/CqSevYLQgJeV3EOHarPYDN9OsKuYk5Br\/LEWpc8z2MWYLVPGdZJhCVlxoXVePac0yrVnC5CjdWuBciNl5XLseEoneMW5dO0BrpswlWSMRlebfWR9tdBHYCXKAsOXL98f9OTodg9u8tVws8hYhcKPscR9bBfdMHNfLtIJJMs0ExzJckN0TqCdjtsSsTZTvMrig7SzwrgjjcR9Me1EPpB+nKn5VXX3OaYlJzTWTnbE\/Iy3GcW26J1lkqu+LgWa3WxduvSgqQkWzjNkiQTJEzyzOceBtcdpFV0QaZM8h4sQ0xmlvkN1qkesRY7JcvkWWqGKa\/34EWDXHx+jjgswO9gf9UDzcotJqoSXAI2h\/1m4aOIJSj\/uEpHQsEXAG5JfAZtyGzheUkjTY4I2x0swQ4DVNvSw1fAL10Kaz0Tlb4uVwJcdsV1IEk6rAq8DjgZoj\/+Yr32qNwPzWWrt750Mowh33pMF0HAgiynmvqIY0g+wwGdZxY8CbwDnRznr\/\/fzJ\/xUNNCsqVwFXK5KtkuOcLSetig1uj3YcJ2a0qEbXQDzQVcB1FtMzqznGbIlqsgTPFDiu8DLONilhjk4pc4DHe\/PYWYvIlOabyZ5ErBcBzibzTTWMXuk3S9TTtdDxjFYjKy2f7HbhA3mBLKr+rY8cYt+9l27hhSqIWNyGcpK5DbJb\/qAFazEsziC7u3kOjCLU1Keuba3UhbhZ0GOkLVgp88TWbd9jaPDBaeB54Me4iu81uAojvkR0SwXANrs4TBet5nD3NOSkzknbxRktEcaf2Q5wFZXngNdGjlH9sP8wDa7jxbq+oCwX6Im4TZvBi1fZPgSOC7yDMvX0fZ3VRZSvFQ1GunHP+fIIw4zNMmHzSRExupBZ3KzliaBx2QWJBce+x39A6Eb2rhHYFKlXmLQFxmyx2aKbmFuyCrwuruujlkbYHUkGV8XuA0ygHtOao4afhLtQccWoA8BR1SvfK6dB9hyiBoulhmsZb9f94uE2FgVo9iVexs+2bpgywm0q5zoIzuM22X4zkF807B4cQAUjSh53rYyHpY6hgdfOTUgVt7k4zuJLcqS0EzURztf5fxORYUXvBpbgqkieIkWagie49Wa5wlUg+VbLYgJeti0quNmsl4DRV\/\/Pi27UZcFgLJGa82ubAKiKyx\/He2hVXOX0mDEdmOA0xgNditMo6AnVMGELTGk+Sc8xvNcGeggYG\/rTzkp2\/C5CNUZhCcINwPIGnoxrgSnNEWkiOj2gqb6Pq2JP7tq+eK7PIqMletajiDTwmNFcUrrWLK6K\/SpwWuyVL2FpkD2H2BCjohOiMo0LZDJX+j0vki7cpjXTFLe45Bvj+fs26OYdhyNcC2QDt+DN1f3RmskWG\/9sXFsR1KCSw12jHCAWmNFsu9vFq7gX2AhpC1bKPLL1y\/fzi38aaGhGDqlwAngM6EHpgeZIihDiYp9e4A+BPwWuUcScsyVO2C5qyWhjnMCJ8OwXZdHY\/SxERLHq3jPNd6FTGI+QOBc8xd1DBxTOPnnvho5LcCqaE1gLbFQo1\/EZ1wKzmiH29MZv0wCOAgdxhZBFg\/UwoqwDrhe0q6oZGbFFZjRRM\/M14G2Et9X9PqUzaVl8dgHSaIqeJcQfO8Qp2+\/HVbSvmETsYjoI2\/TJrtPeauESnLKnd2U5SbVNReBG8\/jn6v6IcAFmSdzmp+M2Gh+Kc47J0LSWsQjTmmfcFoi0rYtKDZehmyJRhcKUTuS2P34A3H1WGxocqClMCohYUSx2y9fvZ2jngKiSE8VHuBNYP6P57Enbw7jmiYh9ix7guj9cVjsds0g0t3\/1gXBocCCk1TWFu3\/qeO1eay8kxK27w3TuDHAOp7K\/GiTXEjGqaSLaPy+khmsDPQKLS5dE3PNwA66lvzCpOc5oiUqyrtEk8BrKEdOB4oAp5+nGjaN2WUQqmmVGs0kYDQMX+7wmwkHmKNGTBtlziIpRUW3gsqTtDCTzQElEPUA27zjEc9svfS5blZrIvFiQvbeOSyKyVW3DWMEasgg5IBuqz+moh3EtErVXWfwMbqPXzlGGlBS2bnsAPqB7Yus9D+iewQGrrkc8E6rHWdvFCdtDPRm+rWeAX+Aq2TNPpX6tiWZo54CgtOwSDTi7xIpmsPG1IlZx6+4ROrQ6J2628npglUJmyuaY1HwSRc9mgLdQzrCIEmZDgwOgZIBPAatDPG9MS4zZQlJadOG9Nt3XgXOeLKJCzOJjObAJ6IlUzJjmGdd8EirZiuv03KfKSRGip+fACSkxT1hHoKrqMqQjuCC7XcGMATapiqfacsy6nMOnhttYVuf42Fv+4TVZTFVsQERFXJdBP5Cf1iyHbR9Tmmu3KMxJ3GZvrq9tSsplsffxBwXoEfg4sKlKJnPcdnPGltuZgPowItzs5hBwRBfRpnwB41+goKd19Tke9TCuhThbYqdw7cmn6dx7qBs3j91vEXNaS5xNXpBtgTFxolpTskjegXseGwC3IewHPgXaVdOMjNgSs5qN+\/AupIp7Tg4C1Z9\/K01odjArgLUChQjDmC0wlYyxhRCnB\/AaUFOdmzUiUavggkcVVCdxQbZH+7odBbgR125z2eNnz397A6gO42Z351J5cwY4iOpJVDt1o\/GBWJEcwmpgVYiXP2O7OGa72z9vqoyinEIJFsf2IiXpWEQU1gObI\/WWjtmSHIt6mNZ2SVn8TiaA3cBrNmLWpk9N4lHFV3Xv3YZ65mjUz8vRSiqaifPinQPebq6\/nZpgXglcCxQD9WXcFqknQ0\/hQgLghCrvKjSeXkRdKaIUgE8A6xXjTdkCo7aUtCTIOdxYzkk6NxmV4liOS\/p4FmFC89S17Xa276elnbEbV2i0u7bPzRqRuJVwISNiAI1wA\/NTuAxvO7AAqnoNcG7flbxARM4BLwBfoClMcIXHFvGe59z4vnsXj2Lk0OCAUecF+DngmklbkONR7\/msnbRv6zeFq8pNA7prEW0wUpLJ0OAAuDGXzyh8epaMfzzqYdSW4j40cAnGNxQeBUae\/c7iWbMWKkM7HxLQPCq5hnrBcdsjvwlXc84W4wywA5qezEaoPjVHm7aksPfRAaxHDlgNrFTEn9Y8E1pIit9ti5YtzztRxOjuP+ms6\/BhDO18CFUMsAT000A+UI9xW2AmWVXsEFfBfhVlMt2fdCb7Bn9AiCnqBfPYUzbPpE2EC0HrHtynSvDMHN6DiVoJFz4K7pyO4awi2nXvKBBhzA2YK7uk6irNQ82vK1XTVVwV+w3gNVGdE7W+hcDenw6AksNl+G8O1Vt11pY5ZbtoqN\/OADsCToiw3wj19AWWEjd7Bh8CkQwi1wO3BXhXjdiyOWx7mNRsO5+NDyICTgoMasDLzL0+Rcocs3fwQTFq8yibGnibz9qulW+GKzlie+IeO6jgVGqPS4cJOe151LUhi7IM+CjQE2EYbypWJ2DTfCEBcAJ4c\/efbFg8VVJVQLOgVwMfUfCqmuGslpjRbPzNue9RBd7FFQIWlSDdYsKqGFyr+NVAMcRjQkvMast5OL5Dw8Vsv1ZlOGrMrRlFGmTPITayqGqEqxwGtC\/IFiArqv2i9kr7LiKczcWPcPMJV9LiVgfeAp4FDj23fWNHbTR+F+qLEWGZwM2KXD+t+dyxqIcRLbRb4KEBnEA4I7E62aSkOARFlG5RblHkplnNFY7bHka0FLf4icW1jP0CZacqoW0kLV5IuZBf\/HgAVckA60L1vjgalb74TrR06cGoL24LOAXGcdWRsXhdxObhwxlFBV\/dpnkdUGiox5gtUtVMu\/VGfueh4vYhJ3D7mkWDuGtQwM3Lr7OIN61ZRm2BmnpxJzNbKK4g9SZwNkwFzzoWVfFR1uDWi3yghinNUyV2hfs6LsnzvAgzQ\/96bgtRaZA9hzz\/nY2ISIjLzE3T\/ipIHjfrcNm4VnOtAC8Cj+CC5MvJ\/kY4RdXHgSEVHW3zuYgVxWYUNoFuDtUsO2fLnNFyHBu\/Gm7OaSopb9WUxY4aRa9WdEug3lVno7J3JOpl1sZeXanh1rsngHd2\/+kGdv9p2vmRZKIMngorFbm7QubLx2zvpgPREuOEJWMlpNkqDlSf7DQhJ0HUUELYBKxRRGqabaqKxz5feSGK06o5gHsPLhoUFaAXp9ezMlDPjGuBES3QSM7Wvw4cUOFtYHpoezqa04kMDT4kVsipsAboV8SvaZYRW0zCPPYkrqD4BvMQs6Uz2XOMupnsSUFO0T4lbYPLWC4B6QfOXuH3s6BnQHbiPEe\/i2t7vthBngj3Uvsh8BPgyL57NyyKKvbQ4IOAoiplET4JfLyqmcJJ28WYLcZhmdHaYLRzfCEl5UNR6AE+p8gnZjTXddT2ymlbjnvjF+I24c+i\/DJVE08+Q4M\/EJx91G3AVwP1Pjqm+eyU5ghbdbx4UFw32zu4CmrH3UuKGJwzwEZgSYQwpTkmNI+Nz5P8g2h1pxxFGY\/7YNqLCsgK4DpF+uqakQktUiX2ZOaFzADviHJEO2ykIuU9FDUi9OOsu7ojhGnNMaW5uFXFQ5zQ82+A43YeOikSk87qFBoVa0VlHDeP1a4UjQA5oAzkN+8YvqLr+pwTaAlwlk9\/D\/w\/gV04Bcgq7sa0\/HbQps1\/MwE8D\/wH4O9F9F1PdJHN2YgvwjXA7YpZMaZF76jtZjKeWbUx4LAqU09+K80Sp8THUz\/\/Dzz7xN8YVdkEbIkwa87YLv9o1Bt3ay+41t5fArsUju+6L31Wko5arwB8Fvgm6GcCpKuqftwjB+CSzKPAAZTxuVKpTRi+wBLgKqArVI8JW0jCpvn9WGAE5TgwG\/fBtPWDi83hkiBXK+RmNceELTQrh4lY3loBzksCZ5+5d0NHjVSk\/Ba+OlXxDQpdgfqM2hITNk\/M89hjuK7d11WYDuzcPxix72w6jVzRA9cCU8e1H+ba9aNxauDduIpz7Uq+WTPQDjfvGD6F8jDIPoTbgFtx7UdrcFWETPOznsEtmL8GngB9XYUZhegXc2DovmAQEZQycDPwsapmMqdtN+O2RISJo2N7FNfZkGaJU2IlE+QEoRvR2xT53LTNdR2M+uWsLcUtUNUA3gaeRHhDTCq+k3T2PjogVnQFzgXjFqA3Uk9C9UFjrWKDu5+OAfvFVbQ7DnF7jDW4ylS5rj5TmqemXjLCt\/cIgCMIh1GqcR9MO\/Gs16vCdYIut3heS\/k9UC\/u56NFHTdSuF8tM3EfTMr8IUIOZRWwBiRXU59xG\/s8tuLuvxeAY6IEv5gHYeA0yJ5zFJAGrTlY1xrZDgo4u6gukDmroD\/nZmTqmx8ePoTz\/35BkY0C651yJXWQGWBa0GGaVlGqRPs6M4P\/oewe\/AGK9QRZA7LZIqvGbVFORj1U1CeG7HEVOIxLgHRcy2LKwkIgj\/IRkNsa6q84aXvNcdtDPf4ZzmO4Tp1fiTLupdoFiebJn\/+\/UZdC7gNuAJYIeIrBJqM5r4qbxz4m0rEJmxxO9Gwp4M+SYcQWqGrsIkbvJwSOC5wTs7gSzWqkH9VNQHeoxkxqnmnNxp3QPH94vDfKdsLaVPCso1FKwHpgjUJ2UnOc0HJzXxwbdeA1lJeBcdX5EadMg+w5xyp4dd6rHirt6YfweK+KbTbvGJbn5lZEIkIZR2RcnBJki4KIghIAoRHVPfdubMPHTSIionSDfAq4qaF+4bQtc8KWaRBL9ngCp5o4Cp2lbpuysHj6Z\/9RiOgHtljkU7OaLR2K+piMX6CqgWsTfwY4phD+vNNEqjqQMBOKsZ4VZCmum4qG+lQ0k4QgYhrYj3DcZjo2sCsB1+A8bzPTNse45mnEnzB7P6HASRGmWETvwKHBAVHVdeK0dEoNPBmxJWY1m5R2\/gCX3HwdGHv2T9LxnM5Ge0E2AMtC9bwJzTOlubjX6uPAcwhHgUbjSg2LP4Q0yJ5jntu+ic07hi3IFG4GKKJ953k50Adznx567rfbKM4viJsfHq6o\/ov\/f1EiIgCrUW61yKopzZuTtptJYgskargX2TSLaIORkjwyYa6A6PUgmxvqrzlhe7xjtjtuZVEFXsE5ILyJ09FIN3sJ5w+\/+O8ZGhwQXPK6HzAWoaaZJATZbgYYDqNMNbo79n4q46yhegGZ0SwVMkkJ4Fo4+y45P4\/dqdfig8iJS4KsBvFrmmHEFqnFr+TcogYcUddpt6ja+Bcnspym6FlFs+as7aaiWWKcx24Av1TYhytG6S\/+bH5imET0VnUa6qq6082vdt5FzfYtsQCbdxya9x\/43H0b0gC7icX6KDcKenOoXveILctZWybU2B6zWVyQXWVxbTBSkoboCpAtwMcmtZA7HC5h0ubj3pRPAU+g7MEyhsV2qEhVJ+LhAux+QEI1zJKlpn7cHs0NXOBwCKjtvbvz7qddO\/9jK7lxNZAL1GNcC01\/7EQRAcdRfgPUnlpM2jAu+fExoD9CzITmOKvFuBNQFzIJvG5g2LhnJqVD2fvoQBbXKr5OkcKM5hmzRRrx6TdEuHHeXQoHg3kepUwr2XPMLT8cRkRaKtuTtDeRYYA1Lp5SfW77Ym3bbj+7d\/5AUFYAN4NsqKrvn4i6GbXFuA4pwHn+HgGCNHhIiYNnnvhrRCWLcgNwW4C39kTUbQ7bnrhbSxvAL1T4KXA6qhMN\/TfpM7IQGBocANcivgbXtkyNDNOaI8Br23zWB9Cy7noTOLFr+4aOmzMdeuwHYMkiuhFkLeBVNce4lmgkp0raogEcVzj79L2Lpx252eWxElfJLtSbSs7Tmo1DePWDUJxTzSuqnE2dHDqXocGHxEI36LXAckXMWdvFmC3EmfCZBl5Q4TfP3rth3jUz0kr2HPP8tzegIkZF6jh5+Ha2wgTAVSBL0gC7vYhKVpBPAp8MMaUxLXFay1TjyWMpMI5yEKWya25n81NSLhrP+saotwrkZkWuGY3KmeO2h5l47OxaNHBaBT\/24U2EMA2wFxSCa1deB4giTNocZ2yBOibOWl2E02J5F+1MVXGjRkRNFyrrgV5FqJBhOjmzvi0U18l1mEXUxfXsj\/8\/oORxrbmrLcbMaJ5RW4r70C6khrsuw1HUscKAKYCinqJX4QQqu6qa4YTtYoZcXB1Hzm0AnhXlcDt+YBpkzwfWqqhO4wSn5mmc\/gMxuM3Hss07DiXqjdfJPPXD\/wJIL+ICiapmMmdsF+Oaj2sQOsL5\/p4lVRVPiRXJg3wUuK2mmWXHol5ORt0E8b16Ipza\/lPA7ifv3VB7ZnG1kXYCBufasQaQCGEyGUI6AXBU4C2Rtr7328LeRwdQwajQjdN\/KShCQz1q6ictyLa4itVxFlGQbTxrcK381wKlUA3TNsek5uM+tBYWtzd5Azij8+BLnJIMhgYfRCAvcB1wg8XkxmyRU7ZELZ4RSouLyX4N\/NpYJtvxQ9Mge36IcBXsCVzWrl0LieDUxZeDpKMAbSJTDjxgHcqnFVk2rXlzKuqmopm4DinEdVGMQGqNkRIPQ4MPGpz68G0R5iOjtlQ8YnsZJ7ZZ7NYG7wXgZ7iMdsrCw+BmTlcCpqE+05pPghWcs0wUTop0bHLTB5YgLKW5fwwwWJW4Z+Hfj8Xtv06yiEQ\/RdQHVgPXKVJq4DOuBWaS0yoeAScF3hSYHvrTNMHZifxq8AcIiFMV50ZgbV19\/7TtZkpzcb3\/68BB3JjY8FPfbk+HZxpkzwP77tuAupbEMVwlu12LvEezkg1SiPs8LBrEdgOfADZFKrkRW+SUluOcUYuAaYQpZPFsMFKSg5ublQLwMUG31DSz5JjtNae1TCM+IcA6rk385wgv7dq+IRXcWWA89\/iDiAv0VgIrFJFZzTGuReqaibtVfAwXPJx+qjNngAU3C78MVy3FAoF6ZNCkBHEtFJf0iIyQmDLuvH9o91nXAKsVMg31mdI81fgS\/u+nBhxUZb8qtbgPJmV+cL6Fkm3qNnzEIl2TtsDJqIe6+nGsFIpbn18EXjKW8Xb94DTIni9cu\/gI7bWF8XFCMF1A\/tZHDsd9FjqeocEBI+ha4LPAiipZ76TtZtzGlq0DtxmypK3iKTEwtPMhEAzQJ3CbxXxqxJayh6M+Jm1ss1gRcAIYAn6hHiNxn6eUy0JwVewbgOUWkVnNMmVzzRGEWAI9ZxUFR4FDHRpguw8q5ICluHZ9rBoUISsRJllBtgWmxc1lJ6rEPs+UENbjrLuyFc0wmRz\/8lZ3wVsinEwFzzoXK2LUrREfATY11DNntMzppsJ9DA9kFXgNeBY48vR9G9q2N06D7PlCtYZTF59t408VXJDdj6top9d3Hvn5P\/+vADlcO8zHIkx5whY5Z8uE8Z76LO7ap63iKTGgTphK+JzCbTM2Vzoa9clpW6IRz3PRUn1+ATeLffiZP+485efFgLUCShm4WqAnUo8pm2dac0Qay+YN3ru\/3sXNAHcqikvkd9FUdVekGWgnDsXNZM+qXTzdXCr0AFcBvRYxU5pn0uYJ4useupAQOAW8JsJY3AeTMn8o0nJ\/+GSEWTWlBY5H3UxqLKNiiit47gFeVGmvKGUinrxOxHgiCOdwmbt2VhR7cKIkRRRz6w\/n3yt7sZKxeaNoP\/BRYG2gnj9qi0xpjpiT5x7gKfgK\/p0PD8d9qlIWCUM7\/w5UPJRVKHeH6l17xnbJ0aiX2Xg1Cl7HzWG\/prbzRKkWC2pUVFoezVpsqC+tmVMb33bG4loRD+CEdTqS27\/6gPuNq2bnWn8ficQtOPdBGEAUrC6ikSlxYxTXugSUmCnNMaPZJFyfltr7IeDgU\/emozodjWoeuEbgY3X1e09H3ZyxXdTjGaGsAy+gDKGcVW1v8SkNsucPRTmDE9oJ2vhzi7hAuyiaPOPKTsKonxVkPXCjIt2zmuO07WY2XnsicBH+EoEuAc8srna5lDgRK4j2CHzKIrdPar7viO3jtJYI47NXmgKeQXgeYUz8xbPp7iT2DD6EFfHU2RNtFMhWyDBiS1Q0E+eaG+JGEQ6gTMd9nuYV1yyQx1W0LUCoQpC0ZnH3zhMVKiqLo6NraPBBwYmeXQ1aCDFy2paZbk7Mx4ziOjv3Qzqq08kMDT5oUFkKfMIi10xqIX\/U9jKmhTiq2BY4i\/ITVV4D6s9ub6\/YXhpkzxOqKGgVZxfToH3DYh6wVqFLRYyaNM6eN1S7cK3imxTy05rlnC1ST0Zr1jqaIwMa+\/s1ZbGgofFQNgJfaKh\/9UnbY47EW8W2tGaxlOMC4a5vpYq2CxFFRZCyINcASy1iJm2ecxrbGEKLlnXXYZEOF3Ny6mYebhRJfYkIMUlpR34\/oSijLJqxKcmDbgRWKvgN9ThtS9TVS0ICJMK1iu8XOtNDPqWJSA7hJkE\/W9fMklNRt5yyZartFzxrdU88g7BXDNMuLmsviVwZO4gaziamnZVsATYJFI2AbxKwvHYogi4BbgLWhHiZc1rinBaIkvFYlVVYrYKPwF2PpC3jKfPL0OCDiIn6gFsscvu05ruPRr1yVktxigBWFX6s8JpCzcbwkk2ZMwR0CegngR6rRqqaoaJ+3JW6EDiJMCYdXjVVt3HNNL9EUCqaIcAjYQ1TDeAcMCaL55nvxiWgeixGZjTHtMYmNPl+QuAQygFVqnEfTMr8sPcnA6B0A5sVufGcLeUORf2MaSGOkYUAN8LzQ1yCxz7z7fYn2BMRDXQiz7mWhCpwFnex23mH9YGuUVWsVTbvSAOs+UFW4yrZfTXNyIgtUSUWe4IPwhdlK4vIIzQlXqyxAvIRgbusmnVjtuidsWVq8U2thMA7Ao8Dowo2Ic9myuVhQNeAXgvkFMhIRAaNM4kDEAicEie01dHrrVgNcK3iBcBUNctIcqqlFxLiZjFndrW5PTQO9jw2YHBaPKuAfEMznLbdSbLuCoD9CMfpXA\/5RY9m8IAbBb1r1uZXH4qWmGO2m6r6cRzOGWAn8BxQj2sdiOWTLwY2O7Epwc2hnMQp7bUrqWFBPqnK3wHsu2993Kejo3jqn\/8KP8oWUa4BrrJIZlZzTGoeTU5vtgVWiOUa9Rh5Jm2RTZlHnt35AxGVFcAXFD5Zx8tOWCdIpcRS41JcJesnwMgz21O7mIXM7scfElWKItwIrMXN25KRiJwEoLFZIVtccH0WaDx1b+eus3seG5ALHqKcxXA66mFUi0np3mqhuC7C2q5F8NzveWxAEMrA9cByRaip7\/YjcR+cw+K0id4SYfLpDn5GFjNDOwdElT7gG4H6G4\/aXu\/tcBkzmm33obScBZ4HHlNl9pn74rvn0iB7nlBVBFGEEVyQbWlPkN1aV5crulRUTsV9LjqNXCNvVGQZwrVAf4gnE7bAtM0l5aUGLTs34WbgN7j2uZSUecFYk0P4JHCbRVZOa96ctD1UNBNXgD0LvAoMiaZq4p2AoEWcerLQ\/B+DJUvYHBWOhQg4g3CU9o6FtZVdT\/wnQg3x1Mu72V9ydfU4YXuYSk5LcosIN\/d7Ou4DaQuKqAuy1wE9EcKM5pi0sSWe3o8Tn4L9Vjtcs2ARMjT4IACimlfkcyHmX5223b2vhas4o8U4uowC4C3gKZT9z9wXr11notKPncS+b28EkQjXMj4Obdvote7oohiu3fft9XGfio5DDRmEtTiV23KgHpM231S4Tcxmo+WZfqNY1sR9MCmdjQpdOH2CdSEmO2qLnIzPFzsEjuF8Md9++r4NaXviAkeMguDhNuwzNJPJHkpBImL0cwiAIygH6OAg29eMeHh5YCNO6DM7pXmO225q7Rc0+n1EOEu1RRFkq8EHlgFXA4VQPSa1wJTmScic\/CxOfPKULBoRusVDs70lY5FrG+p9e8SW178WrvLejfrjUhM\/DTwD7EOYifv8pEH2PKKoKlpRd9HbWU3xgV5RWbN5x6FUXnwOGRp8CEVyuBfaVUAuUI9ZzcblAfhhCM7ObQPwkbseHk67VlLmDUGXAR9TZGnF5sxJ280UubhmZWdxvtgvqKRKtp2Btv6ngktcI0AGS0ZCjNg4Ar1Wx8SwwlQUyyG0DQP0g\/wBcH1DfU7bLs7ZWASNfh8hzq\/8XNwH0g5UyCKsBtYpUgzwmNEs1WQ0ql5o3TVF+1x2UtrAr3\/214B4Vs3qmmb+aMR2bX0jWJV9O1pKI551YQr4JfAscJgEJD7TIHseqc2GFpUZcVnVOu1bYAxOmKRfxeuN+zx0GCJIAScw0q+I11CfGc0SkDjxlxwuEXCDCEvvTgXwUuaYPY8NMDQ44IGsA66NVEpjWpRTtptGPLY+Lc\/iXwP7RanHfY5S5gBVxbX9T9GshhksnkQYLDHt3QPcKNg7gMY59zfvqPiorAE+aZFV05rndNRNLTlCnxcS4NqTx+I+kDaRA1YAyxWyMzbHWVuO2zu+RQM4ocIBFYLFIEK3mKjYrLFilsyS33rS9n7l9XDlyjejpTKl2ThC7BA4CDwFvIZSScL9lgbZ88hLf3YtIlLBZVTb6dfoA93AcnFezilzhKBes2p3DdCjiNTIMKuZJGb0PZzi6E24ea3ESI2mdAwGZTnwSUXW1Mh4J6IeztliXKMTU7hZ7JeAkV3bN3S02vNiYeu274NoAzTAbdyjViW7SES2\/T0TikucH21+JSCemR\/2PjogKGXcO++GUL3ymC0yqkVCNUl767VEj47gxvQ6HnGjOuuApSB+RbPM2GwSvMsV13VyWJTji8hKbVHw4uB\/NDM2v+SM7br9YLTkm6+HK296K1qaHY9HcE9xCc8nEfYijOyKeRa7RexPYecT1XGVlWnaNyDTahXuA7o270hbhecKhYw68Z11QDFSoaIZasmMXwWXbLkBuBYox31AKZ2FNeQRrgc+HWJ6x2yRY7ab2fisY07jqtgHkFRkp5NQJASZxL1LVYGsWDISYdA4xM+mgcPiqqYdizV4wEqUjwmsaeCbcVtkyuaSmFi2OE\/cVnty5+MUnTcC\/VYxU5pjihxhMrb3VZTTKBOkQXbHcOaf\/2dz1PYvPRb13vZGsPJPXglW3vZu1N89qTmJaUSsAvwK2KnKIdX428RbJOIp7GjEsypyFrfgt\/PCl3FVzF6QNMieO7LAUmAJ4IV4VDRLTb0kiZ5dSAYn0PZpYNXdacIlZY7Y++gAAj3AJxVuqGmmeMr2MGpjURQFt76+A7yscDbSVGSnk8hiA3HViojm3kVQauoRNsPsNmJx3WkHVRmTDq5ki0gG4SqEG4DeGc1yRktMx9E\/8PsJcC2j79Kc3V8ELMNpr5QjxByzXYxpbHoYF9LSLDjX\/DWlA9Cnvy+76x9ZdiBafsc70bI\/3W+Xbjlpu\/pnNWNifO\/vF\/ixEV7FUquOJmc9ToPseUZQRHUaV81uZ2WlgFt8SyjeLf\/1UNynolPI4c5rD2BaQXadRImevZ8lwOeA64DS3Y8Mx\/72TVn4qOADa4BPWcyacVvwjkS9572xY+A0zhvzgEBt9yLwyF1MBBhRJ6IUNb+I1DCtORrtF520wBmUYWBGO\/hOU2dCfj2w0SL5SZtj1BaoaSLztXWUd1FOonS8q8DQ4EAWWI\/TXskG+IxrgVAToQ+juAD7CDCTbjoWPqP\/\/D+bH8\/effVh2\/\/Vw1Hvnx2Jeu4asfmldTwT0\/0W4d77TyjsFmHqmW9v4Pm\/jH8Wu0UaZM8zvkQWl8VrZeDbdS8KTpyrF9Q3RtI1bm5oBdldgIlUqKlPkIyX2odhgM8Atyj0KZg7fpSKoKVcGSp0Ax8HbqxqtnzC9sgpW47LtssCB4BnEM6opFXsTkPlfJlkCrCKUMdnRnNE7b\/nImAY4YgI9Q5\/uRaBTwi6tqF+ZkTLTJHYVvEJgZeaYrMJfiVfOXseHQBn07kW6I8wMm5LTGkhCVVscEJU7+A8i2c1bRdf0Dz\/TwPyi\/p1647Y3j87HPV8\/6Qtb53UbF+ExBVHtvQXfiXKT0U5++S3kpdYT4PseWb3tzaBah0XZE+3+cdfjZsfNipwyw\/TavYc4OFebFmaM\/YBQpCMl9rvIgf8sQg3CmS8xC1FKQuJnU\/\/LyB6FbAZ2DBmS\/6x81Xstj8LLZuYfcAbotTjSqunzCOKUSirG4HJRAgzmqNCJo6gIgBeRTiBEHZqCnvvTwcMygrgY0BPTTMybotU49Nc+F1EwAkMb4ihvquT1d4dPspaXIdaMVTDuBaToioOMAL8CuEwEGoqQblg+dnjf+9P+9nrjka9\/7e3wuX\/9qjt\/viUZkuWWFe+BvAm8FMVXiYBdl0fRCL7fTqJm\/\/3Q6hSFeEUrnVmXRt\/fBa4HpEsqjz\/7Y1xn44Fze7BAVEw4s6rUZAQj1ky2IWRr7oK5TsqvEmHK+KmzB\/P7vwbpC5F4BPAZ+ua6TsS9cppW45LbKcOvIWyZ9d9Gypxn5+UuWf34AC44HopTszRa6jPOVuipj7a3tROK6nzBsLU0wmsnswFewYfQiEL2nSnEG9KC4zZAkH72\/N\/HwrMAG+pMvx0h4+K7HlsAIRM0x97tSJ+jSxjtpgEVXGAUIVXgZeBmWc6\/Hp0Ir9+7D9RJStTWsiN2uJHR7X4P74SrfrDU7bUXcOL+yaLcD7YjwNP7tq+oRH3+fow4j5RHc8vv7sRca3aM8AZ2pttUeB6lH7p1FR7e\/GAXtyMs28x1NSnEt8M6qWSAW4V5S7ap3Sf0mEY9TxRbx3IrRazZsSWveO2O65Z7JYA1b5mNjulMxGczsgKgbIi1DTDpM0Ttn8pqwOvA8ewnTn3u2fwISwqivYBnwR6QjWM2wKTmk9KO\/KFtGYzX437QNqBemLUSDctVXGEWZtl3BaSIsA6K\/BrgePSPuvalDnihZ1\/Tc1kTUVyfeMUtx6J+v6vzwdXf+W4LffU4w+wFffO\/xnwBAl3d0gr2W1BLcgozlqigquEtgMDdKnoWhXeIa1cXim+uCC7n+Y1jIB6MjLHF0Pr+vd1shpuyvwx9MTfgbWtKvatdfW6j0W9jNhiHCMTihOTPAS8oAl\/2aZcEQY3G7wcKFmEqmZcF9EFw9ptoFUxfRvXDtux66hBsgpXgV4HZGr4jFjXjmxJVJb2vB8zTpeh4xuTVdUTpw1zLdAXqWFK80wno1VcgVOiPI8wwiK4Hp3C3sGHAAg18GrqrZiw+TtP2q4\/2R\/133XO5vMJ0WGYBvbgqtjvkvD7a8FEBwucCGQG91Kepb0v5qIgG0UlF\/dJ6AB8nPd4v\/u90sCjhp+EF9vvwwITOC\/BfalnZcqlsmfnQ4iqB6wGblfk+nFbzBy0fUxqLo4KisWtqS8KvKkJf9mmXBGCE5tcBhQiNVQ02wz42nrfXVgxrdChQba6KnaxGWBvUEQmNc9pLVLFT8ZW+7eZAQ6iHF8M7zZxtqz9OM2dQh2PcVtgOp51+EIU91y8qvCGKjWTwJsl5YMRFIhyNc1eO6P57Wds1\/eGo747T9tSMSG+660uoh8BrwCVXduTrb2QVrLbwHPbN+itjxyuinIKl4Wx0BbPJ4PbmKwR6Ln14eHqvjaJgXzpif3MVDImioTntq+3tz9yyAAtjXOrit1778KZEd\/z6ACKCkgeJyLm06ymhOqRqLz+v6RVffkN8BPg9aQvTCkJRM8HOp8CPldTP3\/C9jSr2CaOJ6CO88R9XuHY7vSe7mR8cVXsq4FSgMekFpjRtns114B3xakmR0937D2ngpt9vxZkaaiGSZtvnu\/EVWdaIyPvNn9dBGgBp+9ztUK+rhkmNZ8EK1EnPgcvqDAlij75rU59RjqL5wYfRCGnmGuqZL9x1pa\/cdj23XjCdhUaeM0APFZCXKfKj3Eip+MsgCRnGmS3jylcBnwKtxC1YzU8P8eG26CcZZ6rPV978oCMjHvFyWn6QcpA1+Ydh3uskgPqooyCngFGbttxqPGL7RsT\/5A0EbHiqaGAu3aiKqgasskvoDVwi9PjCL9QYTbuA0pZWLww+LfUUV+dL\/Zmi2watSWO2V5miUVp2OLGb54DXrVR250bUtpIU2xyPbBRoFBXn3FbYLa9avYty5i3FU4gyV\/4LweXUMbD7RmuB3pqZJhQpyqewHSy4txb3hXD1CIZhSrgvLFXgGSmNce4FqjHbyVaBw4gvAFU02T+wmD3E38LVn3QtVXN\/dFZW\/76cNT\/kaNRT342GU4CioufBptfp4BwIdxfaZDdJkRtHcxZnMJ4u4QgLgyy+0A85iHI3rzjvOdy\/ty43IDzZP4IsAGXbS3jWojGgRFFjgNvgby2ecfhQ6CjoOFz25Nb2VZjAZN355ECQIihQQZNQo7vw4lwSuI\/A55BOffMvanSZ8qlUVNPWr7Yiny2qtnek7aH07aLQL04Nt4V4JcCTwHHMtlUXKfDyeCCvl7Ar6vPrGYJMO1cey0uUf2WwlhHB3NKAWE9cLUifq1ZKW0kc8vYwFWxDwO1BCYB5gHtArkK6FXwxjXPmOYJ4u8xmALeFGXYmGRaKqX8SyT0jDW6sqH+F8\/Z8jcOREtuOGj78jGNgb2flpvDM8A\/GeGgKo2FsvgmcsXsRIwxaq0eaQqgtVORNI+zPVkKWrj1h8PBvm\/PXfbn1h8dAaseLvj8PPANnBrpVTihmtazIPBbu5Jp4AVgEORpkHdv\/eGhilrL839yTRtPz8VRy1Y1HxQNSAG34cM2g+uEj4CN4kQifoYw3KlquCnziwoesFrgcyGybsIWzEnbxVQ8IkgWeAPYqfC6CJUnv5n8jHbK5THk7LuywCqgG9RMa45JzbXbrqiKE9kbFqjvurdj7zkR6FYnqrXCqsisZpnWXNOiL1HvO8Ul718DTqsSPrkAqltXwtDggOC0Ca4HeiKMjNkCFfXjVn23uCLS2yqc81JV8QXBs4\/9fzGm0R\/ifWHMFu87GC35xMGovzhu8yRA6Kw14\/8ibtTxLYGGCDy5QNbfNMhuE5EKxjCmlhFcS01Xm360wS3Iy0UkM+fbYcXHbX6+AvwpcBOuct36QR\/2A7uAW5r\/di3wXzHmdRGptem8XBJf\/OJ\/z9DgQLb52XKtj6YqSViIPowpXID9Y+ANlOqu+9IqdsqlMbTzIVDNAjeCfq6ufv8Z28U5W4qrij0N7MS1ik+odmbbbsp5WloANwI9AnJWi4xqod2+7GPAW7i2xY4NINSAQAlYKVAO8WRK80zbHGF7ldwvloPAm3SwEF2LvY8OYBUfYRlOgDJT1SzjtkQjfu\/yCu5aHEKp\/HyBBEGLnYxpFCPMllmb+\/Yhu\/TT+6OlpVFbkCj+rghwsdJbwD8K\/MIzTP98gc34p0F221CsEiLypqhWcS+DdryvWlnP1aBlRMeZo5bxW354SFBdCnwR+LfAx3CV84ulCNwA9Kn7\/f8LYw6R3A1Mtvn5fEAFFRXb7o3exRLgsn+PAM8DE6TBSMrlYRC5WlQ3W8y1kzafPWJ7GNFiHAkmCwwBTyCcBMIOriimOFqJ3OuAXNBUUq5o210dTuI6KEY7eS1VwSisE7gBtBxhZNrmmNUMNnnvuirwMnAYXRTtyU6QTtmEsMT5Y7uujgQERWM45efjsCiuxYJnaPBBiZDP1jTzbw5H\/Z97PVxeOmeLkpA9bYgbAXkM5WcKIz\/\/1sIrEqVBdpsQtYCEuEzfDO0LssFVX68DKc3lzzRGCrjAehvwcc5XeC\/t1AArBL6hImeAv7r1kSNj++5dl7yHSRD0PcE6g2IRbPJ8shU3o\/ZDYEiUMVHsU3M4JpCyeHC2XfIJ4DMN9XvO2G45a8vU2185CYGTKP9V4U0s9WfSe7qj+dXOv6WuZNVZFS1VhGmbZ0rzcSQ3DyEcFKgkW4bjihHc+V4NZCMMs5qlnjyrSsXZUr4sMIZgO1ftvfmBjRjQpbhW\/q5QPSbUCQDG3CoOTvvlFZxuQVILJSnA7p\/+Z8QPBLgxwvz5Sdtzx2\/C1T2nbSkpAbbi7Dl\/DvzYKkenxhfmPZUG2W3DgNsktqwmbmzjD\/eBTar4qjon78nbdhwGV4G+E7iVywuwWwiwRFS\/rSL7UX2Y9s6t\/152Dw6gim2q3BpAWhF3RmzSmtROAP9F4THgzK77NnRs1SVl\/ti98wcAWGxJ1Hxe0BtmNJc9bnuZ0Hxbs4Q0Zy8FHkXYOzPG7K\/+orM31IudfY8\/SGgRnODeNUCXIkyq8wO2SDtlzyaBXwGHPKGx0FoWL5bdbv7d4ALs5QJeTX0mm8rVCcMCRwR+bYTKQpnRvFyGBgdQ1Md1Jq6i2dUxZp13eZvX4\/ejuJb919Uy\/cy3F17FcbEw9NjfAdZDzYpI5Ptnbde2F4M1vUdtd5JGH6eA3Sj\/pB5vP7t9w4IMsCFxdoedjEUEEWefdIj2ttMosAwjnxbPXHFiZcuPDoGQBTYCf4Bb9K8UA6wU1S+iuq6N5+aiEIsRpY67bhacbXAGSyY5CbYIJzzyCPDDEE7X59myLaWTEYAsyKeBTwX43adtF8dtF\/X2zmIrMAu8ovAoytk0wO58rBUixMcFfDcCNNRjwhZotPf+a+B8WX+JMrkQWxYvhqHBAQREhD4RbgK6I0Sm7P+fvT+Pkqs883TR5\/12DDlqHkFISoGYMbYBg1JIYDB2GXkElAK7XFVdbexyVXd1rdN91jnd5\/a9p8\/t033X6tPdp7qqTpctV9ldLtsoU2AzCMygAQmlmEHMkpAiNYDmnKcY9vfeP94IUmDASMqMiMz8nrXCAUKO2HvHHr7fO\/zeWrp8RSoHPo5SFnunwrHHJ8HEDAVRq0pcCpynCEOaoldrKl3Gr9hIpVeAY5vvDEH9auXJh38EUZzA+XPzuN8\/Hjd85eX8udP3xtOrRWCXnvU7gH8Ant98R9O4bj2oqrvmRKa9ZQmKqJpQO4qV1JQLB9SL6gXO+dH4zQXroT4fWMjozPwWLBu+VEQ+1dyaqaqweSGZU3WqWFVAZBusJKSAVsW9iTyWwV4v8Hc+wYFtLU3aPsHL5wJjh6gg6qaJyi0Ki\/p8OnHIT6Vba8pdmpjHApOPo7wmSq7SxyYw9nhRUUirMg+YWxIVnVpbzlFSpbLFBwV2y8TvNY1QzkFZCCTzGtGraQYp6zzyT0IBe969ivVlT3gEcQJTsMktU2N19PgaujWN14pmsbOYV8GrmEAKVCFbH\/k7HCQE5uc1+mKnr295K55z3u54pgyPyhJ+VMgBLwI\/E+VphMFKb9DZEkR2GVF8yY7+HUxolyv6qpgwXOg9543SJ9YD52JzS0eL0iiwJpDR\/Nyz5qbf+zMVlQSn9NILSoIY0YovP\/JYP9SvgR+KsHvLbSGaHDhzntrwI8RKEy8Abopx0zu1Xt6Jp5ErrwdBqTrjaWCrjzkevAUmB96JIDQiNAHzPMKgpuh5rx97zB+fpfmsTwHtCl0bWyZ8xjSFPdfrASnNIy9UXxP6EOZvsweZLEG390rFF2Gu75jre0X7sUvXyMsoeyeJ+dy4RLyPUJmT18SNXVp35754xmW74lnJHk1VetNK5DDjvF8Am1Xoliqfj\/tJCCK7jOywkqYsFhkvjfIqB6Us8VxRWXjdPfvONmwlQK3a\/O36UdxOV\/y8ucD0a362r0yH53ez7aG1YA+UPiyKrk6UGomZ4vKVXILkMAfGB4CfAq8+sXp8l9cEKk+MRIrMAZYrsmjApxMH4mkc87XlzmgNYb1+W1TYs+VbTVXl1RAYU0RhmkITMCNWR5+m6dcUcXnKh0oVFJuAA5smvMBWAWqx8vx6j5AlyYCmqqWU9FR6gbeAg1Jl\/i1jSBLrxW4CGrLFKoNhEpWsMihVFLyC50QYEVqdPLlhrRN0RgG3rMfX3tYRT7\/6zXh2zXFfVw2GeWBr6\/1AK8ojqhxT8BvXjP+AehDZZUdzmPnZEaCcM6EjLOu8wDl3tsK4dCOtLb5Gi5LIng1MTaSkmoz5pNiT3Ydl18Sh1JAnTZ4KFWtlMRO9XwH3KLyhoQc7MAqIBeUuU1ie12jKCd\/Au34K2fKWlXms128H8JLz9Fb6uATKhwgOmCVwrqB1OSK6vc1rjhnzec0e6MLGID4vSk+lj8fYI4BOBV0MOkVVGNIkg5rEq1RbLvsYJrJPoNVjijLGpDDX95lA1EeKo1rHYOVc30v9s3uAtwuFyVJRML54\/PG\/xEncUMBd1edrvnkonrbs7XjW1KPaUC0+CwocBO7FjE3fEYg3T5BWx6o4wpOJ9pamApbFPoZlacp1f0wCM7AsccNnf\/L2GX9Q7B1qEUxh9Ec11GPR2jkipJvXZcp0eD6eyGrCh7HfLAtWLl4jBeolT7L82jYP7MZuTK3Aq1GC7ES5MQUqx5MP\/r3DFnJXKXLJoKbS7\/opnPB15V7M9WP9WVuBQxvXhAqNSYWSEOs\/XQzUZosu10PlydwNAbuAduDAxjXj1932NBCQ2SAXgkyLERnSJIMkqyXbVSLGsl77gH6fry71P4bUY2az8wSifk3Ro2lylXN9t5GKsBPl3a3fCVnsaqQ2V5tC3eWDmvrmu37qDbviWbNL5qVVgMe00MPAvQL7NrU0FTZNgAx2iSCyK4B6PQEcwrKi5VJnAjRiAnZaqj55FleYwsg4sq5R3s4UVq42DyRNRf08Rmhe9b2SwVkW66v3AGkpMEWGSUmhnE\/6GCuh\/SWwHnjDKUNP3DZxbkyByuEiX4s52F5V0GjecV\/vMvE0+jRZzs3wWBvEEyiv4ce\/AUrgtElgAnueQLJXaziutQzpmGfuFOgEngdeFKW70geiTDhgDjBH0MjjGNIUw5qotvKoPiwA8i6Q3\/ztSfPcq8fuy9PzGrkuX8egr6ghXakv\/lUZ\/XVgYBTY\/tCPQDk\/p8lvHveNN++JZ8096Ke4ofI+yz+KGNMQjwP3oLzh4olXDRFEdgUY6I37FDmAjaAo5\/NrOuYGPtOJJpvvOdOeZ1XQASya3MfoZuMFM15ZjDlpVoXIBhBPHou6vRccSVFgmgxTJ\/lyXUwxVp61DrhfYY+H4ScmUOQvUFlUdQbwGUUu7Nd0zbt+Kp1aR1zex0UfsAXYpnCiEFfbOj8wlmzdsLbUH3whMEPA9WqKTq2hDHfaYeAtFZ5W4aBMHjMnwSrdZgCu5CxuQY2qeQyXSpT3Y4ZbE\/6+8NQDa9n24NoUynxgkUAyR6I4HztZyTR+P7AL5W3VyeHwPp547Jc\/w8PsWNyaTl\/\/td2F2edl4qnJAa3oOVPCY\/rnKUxgvxQXGHz8rom3jg0iuwI0Tk+IiO7DojjlNO0oOYfORkkickZPzvaWJWBRzAOYS\/poR5+mY3NRGxHcmQcDRhe1fT7KiPkZCfHMcv1Ml2HKEO8vYJHjnwJtKHtFyW6Z8IY8gXLxxKN\/5awnk6ti5NxjviG5P55GmR\/MpfP8foEOJ8RbJ0+2KmCUWhYuAeqyJOjydQxqqhznYTfwgiivi9I\/idzsSwHuqQJugCTHtI7+SjRDfTQxZrSVwSrKJsOzrzQy9SKKo+yGNUmfpsmXd9LDqZTKfN9AOOL9pDGfGxds2\/BjSTfkalWkZUDTq9+I5yzeFc9M9Wq6Glo\/So70z2JO4u1A35MT9BkfRHYFiPBelKPYw6LcvV6LsXLsFEBz6xkKWE8OiybvHYN9cMAVxe2snnNU8Yz8bgWwvuypbphzXC+1UhjL21ceeBtYq8rfqScDZIObZ2A0SeVrpoN8Frh8wNdMOeCnyTGtK6dBSmku8aPYWJjcxuAzMKnYseGHJeO9xZjocwM+TbfWktOoHIZnh4BtKuxXN6nEg8Mq3RoEZEiTdPraaundLJEF9qIcRMltmgT3BgVRoQG7FqbECN2+FhNMFVseDWPGc28BA3EVRWEmO5t+8\/+IF1+H46YciT\/cVZh7wWuFOanu6hDYYMmq54GfCzweCd0TeR1bPQJmErF19RIUHcT6ass1xqvEDOB8oAYRzrQau\/3OJo\/oEeB1rH9ttC+Sc4DLUarJYVxBDmOBhWxpn+skx8Kom9luEDc2gfVh4BXgh6L8nYMThRxxvtxnTmDiI1wArFRYeNRPSb4TT2WovFlsjzkGv4bSq1VmaRwYe+LYCUoDcCkw3SMyqCn6NF2OloUhzGzvDYFBHaMbepUi2HioOlAZ0gR9WtGe3w9jGAvCTYpScQB1RAhzEZYAdXmN6NbaYlVHxX6bXuBZlH0ohW2\/P\/GDHeOBrY\/8HYk4Uacqnx7W6PsHCjOveKkwL9WlNdUisPPYxIZfquNR7+h9fPXEFdhAVQmYSUNzawbsYbEHOI4J33JdAQJ8tvidh9vPsNT4xvv3UcjT75V92EPv3FHezgj4HMjP2+9sqhLTIwErUduJZTtm2J8qc1wfS6MTdPsaOrVmtFZm6mBA0Oc88j8UHty4pikYjARGna0bfghILfA54LPDmmrI+Ol0am25H842912sQmYyZKoCI2x7cC0qOLV7axOQymuCk1pHv0+jjOmDUrES2E3A0U0TfPFXYuuGtTBijHoOkPA4BjXFEFVhkFRCsT7gY0ySKq4nN6xFrepwgcAiIMpqgl5NkyMa6+vho\/CY6dxzMLGzkOOJrQ\/\/GFRrFbkiq8k\/PBJPueHp\/IKaI76hWgR2ybD3H4FHRTi56faJf+6ETHalsFPrJDaGopwl4w4TxOeramLZGY7I2vL1JfgYRXU\/VsY82sYXCWAOQlNz676qqFcT8YAWgDeBlzEDFgBqJM+S6CQXRJ3UydlXGDo0n0CPpPC\/TqD\/yYk+sKmlqbPSxyAw8dj68FoQSSBcBKz0uLnHfWN0IJ7CwNg7OZ+KYkGsjBOOn5ljRGA8owIqpBEWYuXiktUEPb6GLGNeKj4MvCmwQ+yfJxMRNi5tqhRNz\/o1RU6rKg9TwFysj1NeL5vKYbPi64uj7KZ7hD6todOXWngqolEGgJ2qvBn7iecGPR7ZsmEtoj6tqhcNa\/LrR\/yUW96I5za+o42MaRPjJ6eA6YS\/x1rBjk4GgQ1BZFeE9pYmFDw2GqSD0ReoH4dgoyCuFBF3ht5nth9rmvKIvItdPKPtMu54zwDNVUU4fcVXvocTHwt6VMwV8QDFkjWHMt0NcmniKOe7TlJyZpVsDvU1xD11Eu9slMLaGvH\/KSH6ZCqKuyu9\/4GJx7Mb\/hZRBGQKKlcDVw9rouZgPI2e8peYKVaGeMgrA0wOU6PAKaggaq7iC4FzPCLvmTyNragojZN5IU5weOPkM5NMY5UDCQUGNEm\/pqutHrskssttGFsxRHEy0uI3PVZHn6bp0xSxSiXkUwF4V+AZJ3Q+edeku06qEgdJRRblNHHrMd946+541nlvxbNksDqCZKW59j8BHlTl3Xy27F5UFaMqfoHJiCKxCL3AQeyh0UD5Kn9qgSYRna8qZ5bKLiLooCJvFfdhFhYRHw2i4nbWOSFJlWQWrl\/1fd328I\/7VPVZTGifC0wFSBJzjushSnrqC3l2xTP5pGYTAtRJIV9P7kitxE+n0fudyMYTvuYEIoX7blta6V0PTECydrkmRVmk0BzjFnT6ejngp743j7iMC7kYOAK8pSa2A5OMYsy3EWUBMC1WJ72k6dJa8mNrwOWxZ9h+l682bTnmlNyrFwIJRRjQFAOarI4c2Ag57DfqpPyGsZUiwtZVC4GGPBF9741VKzulSqM3VNkZysQrz3Mb\/pZBSbiIeM6wJm86qfWr9sUzlu4tzIyq5PotYAL7Z8AvgcPiyG\/7zuRpAwsiu0JIJIpqP8oBrPzpPEZPoH7sV2O\/+2yPa4oH82clshNJ+vJ59mEX0pJR3oc84BVNr2jL9G1bXR0XZhxFeVfI7wXZgEWYlwM1AEkpcE7UTYMMMz\/qoSOezlHfSI+mGdYEcfG2Zz+CJyGeGgrMlKHBqS77Zg2FR+soPDqV3Ms\/uO1LQWgExhQdGZV0lSKfHtJk4h0\/hePe5mKX2Xcsi43mOSCQ21Ql13ugjCgOmA2cL+iUGEefT9OvKWLGNHOn2IIwp0KC0R9LWe00YgHjRKzCACkGbQBJNVES2T1MGpGtETAXZL6gqUFNcszX00uqEn22HgtwvCyO6pirOsnJ4SRBPC2v0YoeX3d7Rzzj8r3xzNrO6jA6K00gagN+jnII8JPNZyWI7Aqx445FNLd2DGEmHsewBWZdmb4+BcwX1fNcbaKeU3qLTxcRPKIHUNnNKWJzFCjN0qu6qLUr5AAGItgYI0lMM38Oq0bAFcd6XSjHmef6Oe4bOBY30q21FNThJMaJJ4nXaTJcmOkGTtZS2C7wQEJ8e73kD37tq3cG7\/BAOUhiAb5rY3WLun0dR3wjgyTQ8nrXKraAfgO7H062bGLAEGAusABzUpYBTTGs0VifjcJI9VQ9k0tkCzANmC8QxTjsmCcqv0x\/P1nsHtHLpLk\/SBoL5J8HkhzQFN2aJleZsWo5rEXuVS90V\/rITHa2PrQWxdehct2AptcciKd9dk88q+G4ry\/nyM2PIou1wt4PrMPRsemOpklyzb6fILIriKoWxHqaD1NekR1hfT4XiMicz\/50b+bFPzr\/jD6okAeBTkX3g5zEIuKj9WzuFNGTVNmCZ+Wq7wOw+b6fDrhUYZOIgj38P4dlYWoEdTWSJy0FZrp+LoyOUcCR1QR5InVoLiXxyTSFNyOJN6jKZpSOFHHf9V+9u6qCCoGJybYH14oqDQgXCfrpHNG0Y76B476e\/NjPI\/4gChxWYRfm7xCYnAgwH5gtkBwkyXFfz4CmxlpVOSzgVCsyaoHi8YJg1SxzQKM8jn5NkdUEVWaL4DGBPYRMbJH91ANrSzucxCoEZ8Y416s19JdnlN0HUaAbC4LuEz85euKrGiWlIp8Z1tR3DsbTVrwVz5522De4XOUFdg4bc\/sgyjpV3trc0jRpz5cgsivIjjVNvrm14wgmsgew3t5yXCEOmAKcI6rT0jUuwRkaiRTyiktIFpvjvB8rORuNOrMCVjr6DlUmskt8\/rY\/YssDf9dNpJvESv5vBJqByyj+loJGEaqReElCskbyA1g57JuCPiuim4E9keigw8fX3vqDqlrVBCYu3hGJ9b5epciCfk25I76Bbq15r62hjMTAHvHFSQVhPvakozhKKglcjgntqF+THNfaknfAWOKwKqy0KNzQmuHJyVPWWKoemMGpzuJl6V47LRKYSWyOKlP\/Y4EKDmU2whJBU3mN6PJ1DGiqEjvvMcOznZhvxoQ\/\/tXK25v+V7pyc91ggfPzJH\/\/mG+86bXC3OkH4qkuWxzrVkFKJmcbBFqBNzbd2VSV6\/dyEUR2xdF+kFew0uhzyvjF9cAChLkisouzcOtUpSAi+7DRVlcwOnO\/jwFPq8o7Ilq1UbAbv\/ZPFeja+vCPtwO7VXWjwFIs2DAXmIMt3hToFvRNYBfKHq9uv\/cymEzGGiMsu\/X7ld6dwCRCIIVwqaCfzmtiapev54TWMVyZUsRB4GWEQyhxpVcKgYogWHByKdCgiAxp6j2X6zEO+wh2n3be\/NeEySMkHBbUmCYgORL0F93cq6hcXLFqv2PA4KbJ4P4u1AlcpLBQEZcjQZ+myVZmPrYHdim8KlZNMPGPf5Wyd\/CyKKvRgjxuTZ+v+dIr+XNmdfjpbrjyQTGPtRP8mqLAxq7ZSU0Q2RVH8sAeoB87SctV65HC+t4WALXN6zJD7WfgFvn0t5awbF3GAycwt+1mLEt+pmO3FHMSfwR4FrRfVXRby+IyHZYzY+Wt3y05Ix\/ZumFtO7ZYnAFME0RUOKGxdErknZd40OMLN335T8ODKlARnnpgLV6ZgnANcNGwptLHfGMxi132crMCVrHykkJfQdBtkyeLGBhBsHvmXCDKq6NPU+XIYpdIAzVi0ywcVeYFMoYI5svQCLjhYiY71oqXnZ5KjI3vOoEZok5oitO50hSDHx6RXl9Dt9YSa0WCH33AToSMQjaqoujLZOGi1sP8nzXPRm8W6hcManR7jqjlQDx1wTu+weUrXyIeYwL758B6hF3eMbz59vAcDyK70qiCyDHgBeDTlPc3WQRcIFCPSFfzPRltv\/P0L4oda5pobs0MgDwLbMSyuDM5s2DrEPA88FPMOCEeb0HTlavuLvUvdZ\/654\/\/8ucA3HLXtyu9iYFJjhci4ALgGoGZvZp2R3xjpUoR+7H73x6BXBDYk49tD64FpVaFizCR7QZJ0a115MpnwFUHNIqCjLeHztnhgMVAvaDvzSWvAnfiUylgvieTYka2d4hYFdxlAlNjdfRqjc3HLv\/vomIlwK+o0oXgH78j3KPLSeeD\/4E7hgaj9dmlC5L42xS+00\/ygn5NJarAnMAzMqbrHhEyQHZTENhAENmVx7nS7ME9qA5h0ctyUQtcqjAL1XfORGCXUHEeOCiqbdgi6WtYZPwTfwRWhvQisFZVXxbRQnvLkjIejrEliOtANXBK7+vnMOfaxEmt4bCvr4RrrWIVIM8AXZOiDDTwPrY9uBZAUKYAlyBMVZz0+xq6fS0x1pxaBlJAnUL\/ppbJ4YR7yr1gse2\/MESS\/mKwrYpkdh7zPenZ1NI0oSsMnrTfJFIz\/1sMpPMk6C2OAVWk3JYVXm1dtlsguzGMViwbT276fzMQN8hf93+udpEMLOrR9F29pG4r4JYWbLJNpVFMYP8c+AfggPcUNq8J50iJitcYTHa8V1S1gOpezOir3FwCLBQh1dx65qMPd6xehGicBd0J\/CXw98X9+V0PxNJ80neAB4C\/UZHHdqxpGppIAjsQqB5UQGeANgPT+7VGjvgp9FKRLHYO2A28RpUaHAbKgkOYinAuEBVU6NcUQ1rWdeRw8TVY6YNRDooC22FeMNMBl9cRZ\/EqEtilFrJjTI57RMkf4Fxglgf6NcUJX8+wViQv1i3CZoGjqpOqwqOivP7IfyE3uDhxaPCSc3q15gt5if5NlujuHNFFBaQahtjH2Br\/Zwj\/iHBACQL7g4RMdoV5es1ilrXtzyscF9U9mOgt1wgRh812XqrIZqxU+4wpiuKh5nWZlxDpAt4CbgIuBeZhfcqluSBZrM+nFysLfwx4UkXe2LF60aiM8Lm+zYIGT60OYj0QAJutiZJCuBD0So+ke7WGk76BfPl7\/UptFa8pdMSToAw08JEkMKE3B3AFIgaK\/dhlOicL2JSP3Ztams7qOTjOSAFNWAWdDJNkSFOVyJb+LmJsrTChs9gAMjK3\/HJgvsfR79P0+jRx+X+XPLBHYacThlyZSkomO2\/++q95N25Id2ndJV2+7ksDmvx6vyY+M0yU1uooMCn1YP+DwD8CHSrEm0OVw28RRHYVoLEviJNj2Gy5HsonssH60C4DncrouUYWMOF8H\/AScDmqFwHnIJLEbtylyPQbwCsKhxHp3bF60Vm7ETb\/4m0kcqIqAsjy1o5IkWRx1wpAob1l8YR\/WAcCp7LtIStDBOYoLAOZm9eEnIzr6fVpKmCoPAzsAnYKdG0NpeKTmYSa6dlMEJfXosguT\/uCUjJ2stdkQbCWsUUU14ICzJQh5sogJ7S2WoZRCxaU72VyBOIEM4+dJ1CXVyddWkMPaQrlLT4tGdo+I8rxJyZJC0WlefAvf8VRd7KuX5NXHYsb7jrkG2857BsW92kqUQUPSMWqSTqAdViZ+L6Nq8Oz+6MIIrs68GIlaseATmA25SvlrwUWgDSBHmIUVtntVi5SaG7ddxykE3gdCxzUoFoPkkDIAT2g3armFrqjZfFZf\/f16ztElaQqU0Bn2b6xFHQ2dow7gLeL88nz2EO79F5ob1kcHiSBCYkXRazMbCFwhSKpQU1yQuvpH5XR9qfNSWAHFmibTNnDwCmo5WXqEBYCsxVcnogBkuSJKEPgp4A9e19C6aj08SgzDdgzMgGQlgLnRD0s8t30xSmGKjPO78PoxX6jCe8szkgJ\/\/lAXVYTdGotvZosxyi7U8liiZ\/nEAYqfVAmA1sf\/jtRPTklq8kVnb7+O\/viGSsO+Slz+jUZVYGKLbVt7AHWA+uc0PFEENgfSxDZVcDTdzaxvC3TpyoHgKNY+VY5S8bPAS4Gnm9uzQy0j5K7b3vLklK\/dT\/Qv2xdRlBEVfFe\/bPfHt0y7pX3ZiT2TFHlImA5yE1YyVUaM3epwTJ5MRah3Y3dMHYXX5nm1o5u7EF+qgCP20chABAIVBKbCkM9NlGgKUaiPk1z3NcVF9Nlz2K\/BmwHDurkyFAFPoSiyJ4l1io1U0AKCEOaoFCeWc1ZLPj6iggnKn08yohg5qSzi\/+Mw1MnOabIEGkKDFV+9m6JHmyEV\/6W9RkmuLt1hBmeLVYkNaAperWGQvl\/iz7gDYG3RBiu9EGZ6Dzx6F8Jsa93wsouX3f3nsKs5v1+6rR+TUVV4PSvwADwJpbBvg\/l4BMtTeG5\/TsIIrtKEBhSOIS9Si7j5biyHFamtwTrhxsz87UdNod7TFbyy9fvpxDrXGAF8BVgJadE6D+Eemw26Ocx0e2xhf+7jIjukgg\/1Nza0V\/878MiufPLOgAAgABJREFUPt6+ekkQ3YHxRqnXb6nC3Lw616k1HNdackTl7vV7B3gSeBXo3xxKxSc7jdhUinpBxSPkiMoxrshjFRWvI+ztPW9SGGsBIIgCOUU7sQq6OsAl8dRLnlrJ06upahnlNQAMi1RLBfvYsO2Btaj1yS8UmBIj0qc1JrLL65kRY1MfdiocdJOgF75SHHj8P3A4P90NFhINMXJjr6\/7kz2FWdfviWfU92jaVcH1V5r8sxNoFXjQRxzcfHt4Zn8SgsiuEp5a3eSXt3YcVIuo92EmYeW4uoSi+RnIXMzMYFzdUG+4L0M+7+chcivQAlxN0S31d+x3VHyVLGzrMBFyMbb4Kr06MTGwGdimKruWt3b0qI99+53nV3r3A4HT4RwsYzhjWJPS7WsZ0pIXYVkoVbc8D2wWM5saV\/ebwOixzYz4REWTIFOBlKDiVchpAtUxfwTmsMDyywrHnrtuQmdIP0hpfN4L2Di\/WUBdUmLqJUuNFHBotYjsQbGXr4qtGQO2PbAWBCfKeSp8CrQhVid9WkN\/+YMdA8DbWJJhwE2uufFl5XB+pnT72ilDmlzer+nv7YlnrnizMLu+W2ukSq69HuBp4F7MoPgdX5FBJOOTILKrCdGTqOzDHHfnU76+7DSW9V0M+gYWtRo3eCWNyPXAHdhiYSpnfuzch\/x\/a4GZwFLgCpAHFJ5E5CRM7Mh6YAKhuGLf6yJFaodISY\/WkqOs43oKWMnZo8ButVLdwGTFhjFHoqIqlkm1PxLQkpPymJ6dw9j5+Loo\/ZU+HOVkxarvsvWhtQMIu7Dg+meAuoiYOslTS4EIrYY+Do+Jvj5VYj9Bl\/cqIEIKW\/vNU8QNk6Tb1zKoiXLPLS956RxUIffoxC7PrxhbHmrj9Xxt44AmrhrQ5F0H\/dRlB31jw4BWjYrtFas4uwfYChzdOMHn1I82QWRXEXFM3jleZfRcvj8pCSzDdQFIbXNrpq99HJVvxjFLgC8AV2KunKMdnCi5sJ6Pza5cCkwRcQ9e39Zx8qnVwSwtUP2IMkeFy4G5iiSGNEmfpilo2RxrPdZX+ZTaq3fLKPk\/BMYxSoTQSDE4qsU+7AhFx1ZWKObN8YLCAZ0cM5jfhyugPsFxhONYwMsLuHrJUSt5IlFEK57GzKHExd9HN07QObzqEJQ6zO19liIyoCm6tZaClm2UXYmDwKsCxyT4ZYwJ+tB\/4D\/k5k3r1PS1Q0R39Wrq1mO+blqZHeQ\/cvMwL6XfAD9HeFqsrSYI7NOkKn7NgFGcQdiBlVCWW7hNAy4AnQPV43byyXCfA67Dss1jue0lsX0N8KcKNyrUrVjfURU1PYHA72Aq0CTQGKuTXl9Lr9YQl+8xMISZnT0mZnYWHtiTnBVfvRuP+OK50ADWKOwRCrixfgjmgVeAlwV6JmNJ7PXfuBvQHmA\/Nn0DgDqXIyUxoNVwUHJYxcEQE\/g3EgQVpiNcAcy0e3QNvVr20V0FbOLDGwh9UZUNTJ8I\/B\/3bk\/8u+wN5xz0Dd845Bv+5ICfcuth3zC1gKuGtaRi1bQPAH+rsM0rJ\/JK\/ESYg33aBJFdfQwCWyj\/w6QeuBxkIUrUvG7M\/M9GlebWDgG9DrgAyjaHKMJcy+9U5eLY45pbOyp9KAKBj0WFJcCFoHUxIj2+lv7ylaV5LHi4CeEphOEnQxY7AIhTxUrFU5wisuPiawzJCmwTyAgUqmF1WxFUhlH2FP9NAJLE1JOvlgWiR8irY0jHPO5SSVTEEgXnCtTmcdKjNfRputz92F3Ay8AhVfKPhVLxUeX\/uPepxj5NfuqgNv7ZYa378y5Nf2FQE7O1SvSYQLeDDQj\/WYVngG4BH57XZ0YoF68qBCyi\/xZmxnJpGb9csTKlKxF5pr1lcdX3ShaF7XSsn7yOsrYskQKuBT6PagYrpQkEqo4nN6wFSCvMF5ijSCJPgkGS5MpTKq6YecozKjy5eXVTuFYCAGy1czOJ3b\/7AWJ1DGiSLA67pY9JGMgDJxCeoNietXESZmm2bvgR2OL+BDY+dBHFarAZbqjcEwc+jJJRYlYUv2mCLvSL10EKG9\/apJAY0iSdvpbh8o5XLAC7VXgdGNg8Ca+JseCv79tIvybdIIn5h7WmuVvTt\/do+sYcboZHkmf\/DaNCDBwVeMip\/jdRXs9HIpvDHOyzIojsqkIBsYc\/PIu5XJcrulUqhb4EmN28LtPZvqap2qPGESawGymvwIaRcUjXIvK4c9pFMEELVCelebhzgFpFZFgTDGiqXGWIWUbMzl6v9MEIVA8KIiYuain2RBeI6Nc0OR2zsXKlcsiNqnSIUJiMAvv9h0MGsT7cZaU\/rZWqibOXjM8m8mJfsGrCJmCGR6RX05zQOrKUrR+7FAx9WWDfptVhBvJo8MtfbeCgT6S7SF98zNeu6iF164Amryzg6rX869aPojRl4Vcg\/7C7M3qr4wcLYWJfc2WhKsoTAka7RWk9tgB4GzhW5k1IAxcBixBJNN9T9SXjKcywraFC35\/EnEDPUaVaopHvo7k1Q3NrRppbO6Lm1v2RldcHJhMCkcA5YkG7dIwwqCmGNDHWxlJg97MjwEbgGVW6K308AtWFWpVFA5BU0JxGDGiK\/NjZa+SAvSibUbKTWWCvXPU9iuv8ArbeeM\/8TVDqq8PzKg8Mo7ibfln1a5KzYRrW9jatoE76NE2vpsoxK75EAXgHeNFZoidwFuiD\/4Udv\/6l7PeNU97V+hsP+YY\/P661\/6RPU9fkcQ1VIrAVGBJ4HeGnCD9R0V0dP1gYxPUoETLZVYf34PoxA7SDwFzKdzEmsJ6gi1DdgVS922oKm+1ZKYEbYYvDuaqSokrGES1v60C9CpAUZIpaBrMRW0B1Nrd2DGIP1Pwp73F7y+JKb3pgbEgD5xVfqVgjBjVFrjwx1j7gGSyLfWjLOJpaEBh7xGNPN0tZO8XJICn6xq7KouSau1OElwjmeyVKzv9dwFyvQqwRdZKvDndx274UY9g\/UEkEdYrMA5YoUjekKU76egY1Wa7dVexe\/Raw64nVTVWxlhmv\/O\/3buff5zQZI\/OPa+0Xj2ntt\/s0dUUeN02rx1jYCwwIvAqsAx70cGDT6qqvYB1XBJFdZbS3LNHm1swQyLvY7MpLKG+mdgZwMU5mKlLuUWKniThQxUrJCpT\/fHZYL2F9cblYcZa3dQiQRmQ28Bk11\/XFwFzQ87CyzHeA3cXXnuL7kebWjjzvF96F9pYwnmwCUIMF66YC4hGyRBTGfr0aY2Xiv8bcaocqfSAC1UUxepxSmCpQV1BHj6+ly9eRH5uxRQXgXWxs16FIQouPEqvgciB9wIACORL0aA1DJKthASCYwI4mau2lqNQUjSnnAtEwSXq1hlz5SsVLlQyvY9dH4Az51\/c97Xo1mlJQuaxPU7d3kf5GvybP8UgpSFQNxMAJtbbUNoFNDj26cfWSEHQcZYLIrkp0GOQIlsnuw3p1ynVx1gHno1wAeoiqnh3qcyA9mHFNnvKfz4IJ7UHQikd+m1s7nCrTgMuAVdjs8EXY7PAkI1mA+cBnsexA6XWS94vu3cC+5taOLkaEd46Q9R6P1GAVH\/WU3Jt1zJ2bFXMTfxjhKYrmUpU+EIHqQp0KMBtkKeiUPBFdvpY+TY\/V+dmHCYm3gNzjk7hUvERPQ6ef1j87phhc9Tjt07Qc9o30aLkGdnwkgiUZ6pFizcMEvI+o0oCwFJgpEBXUMawJ4vIYU4JV4e3HxnZ1Vfp4jDf+bP1OAHK49BEvi2NYMazR1\/o0uTxLNKPS2\/cBSm0BW4A2DztUpXtLS8hgjwUTNC44vmlvWaKgJ7CS8XIPgE9g5htLgcZrWw9U+nB8JMkEQ9jx6aIywYAYKz083N6yuKLNa83rMg7VWcCNwD8D\/gC4EhNXp0ZQBStXSmJlxLWY+DoP+DzwXeD\/B7QBO4BNwN8B\/xr4JnAhULfy3r3VEpEN\/G5KxlIRoCOrVBkrmV0qyd0A\/FqVIwrxpiBoAqewbcOPsWokWQAsEagd1JQc1wb6SY7V2KLDwAtAh2h1NBxXmq\/d8G\/Angc1gOQ0ocd9A0d8Q9HZuuLUY\/cuVzV5wFFk64a1ToVZwBKg3uElJQUiKYNjhlEqFX8T2C1WGRj4hPyr9S\/hEcnhpg4RXd+ryT\/p1PSfd2n6C1UosGOB\/QIPAT8DtgNd7yYKQWCPEUFkVy8nMbe\/E1j2sFw4bCzWBcAMR\/lCqafLk7c1eVT3Y1nXLsrfX1fAfp\/jlT4WzkktItcBv49lsOdxepn9D4rvOsyI5WLgK8C\/AP4j8P8R9OuxdwuXt2aq0uwt8H6KPWC1FL0LIjwpiUkRE41NUmgIeAl4WIWMeAphFEzgg6ide2ksoLsgRpJdvpajvp4hHZOipAJWqfMScFw09GMDbH3kxwI6DThHkcYerZVD8VS6taYcxoifhAioEyUlHrl53QQzP1OSCAuxqrO0R0gTU0eehPhypO2HMYH9DMIhV9715rjmP923TXJIuoAs7NfE7X2a+PMBTdw5pIlLY6S20tt3KgI+gb4doesi9GcR+gzQs7mlSXfffkGlN2\/CUrUCKoAH3QUcwm6C5SyRagAuM0diTRbnUVclLpU4DDyJ9XwOUt7jlMWckys697e5NeO80gTcivVgT2P02gscJtZrsUXAakX+T1X5U0UuW97Wkb7p\/gm26JlgiJLHstlJQJIS0yA5aiQ\/FiOSckBG4T6FZ71nYNOdQWAHPhTBArqfBmYOa0qOaQNdmh6rRulO4BWsQqzi7T3VgihpkCXAJR6ZejhukEN+SnH6QNUwSwXVCdhDL6IOe742UHxup6VAg+SIxj7M4bG2xAcUdqjSG1ooPhk\/\/tUTHNHaacO4awY08af9JP5iSBM35XFzq8jcrEQs6FvA3zr4H07YiWNgUzAiHVNWrN8nQWRXKcVxXh2Y81+5xWMKKxm\/FMs0VC1PffM8dY5ngPuxnqJylQCW5pm\/CZXuYXIRSDM243QmYxs8c5jYbgFWoyzM5STx5Yf3VfYQBD4aL53Y75YExOGZKkNMlSyJ0fXr85hpzuMITyCcKKUrA4EPIjb28FzgMo\/U9WkNx+OG4nzsMWEP8IIKJ1SInwjBH0OZC1wLnN\/va9Lv+il0ac1YubufKbMQChrBxjUT63cTKIh5Vvjiv9vk8uL\/jiGlefEbVHgMeFd9aKH4pLzhpy\/s0dRX+zTxr3o1cfeQRpcWkGoZzVVCxfTDix75t7Hyi1jZF8cMP37HkvBsHntcVd1FA+\/HCVlgG3YjLOcFIVi58aUiOtWJVtNN47dwTgex\/s82LDBRjnKnLPAa8DTWf1pBNAF6CxYYKUcJt8N6uL+u8HmFht4BV9XnyGTGI4OgeYrBF0WY6oZY7LqZQh43ereWY5iZyq80ZnchS+HJIGQCH8LWDT9CRacAVwmcF6uLunwtnb5uLMXdc8CrovRLCP4A8ODm\/whWrn89MLdT66NjvpFcdfRilzB3caVWyjg0ulx4JFbowYL1qsCQJunSmrHuic8DW1B+imcvSn5LuF9\/Iv6ne5\/\/zElNf79LU3\/RpakvDZKY7pGqumgA76ArQp908L8Bj3iR43mkkJMJdxlVKxLcxauU5a0dqCIC+9Sy2ZeUeRNqgCtVpUnNZbxq8V5UhCOq\/ByLBrcAF2EZ+TH5SqyMfxPozvaWpopEf4tl\/IIZw3yGU8rNykCEGbV8XZXXUW2vxDEIfDxbH\/4haAw2quPbpT+P8JyfOM4xbWCwMI8BPatRPYq1TDwK\/ALlxS13NoW+vsCH8uSGtWBeH\/OATyk05EjISV9HD+mxyN8pJmCeUc+h7CBx+x8HMbHl4b9FBqVB0WuAT3mk9njcQLemiasri61AjDJz05qJ5YD85Ia1FMeQd4mNbCUm4qTWc0LryeFGMwh6KgXMZf+\/IbyOJ94cBPZHctOvDlFDQZp8T02Kwi1Hfc0f9ZK6dlijuXH1iWsEvEOPRPBoWvxPpkt+xwFfU9jcEn7jcrFi\/T5UJYjsauWUhUYeaAe+jM25LRcOWABcjvWxdVf6mHwUT92xmOZfvB1LwnUg8iNVXgS5HXPanoX1FCcwYXi2N8QCcBS4F9gYOTorvPsJTOyWU2CXSGPjwpqBXVj5fKCKEO9Qqzt8EWunmF\/6b7WS57OJgziU1wqz6dUUMQ79hJ3aAipoTpHDarOwfwW8vGlNU4UrOwLVjJXDSlosg3qRQqJfkxzVegY1MRYCewB4Bnhrcwj+ALD14bVgQegLMR+PhoJGDGuCbHX1YoP9hg4p6\/qnLEQx+Eid7aPEgB\/wKY7EU+j1NWP1QC9gpro\/VeF5gbj6ZGJ18Ifr3wSgEA+kHLpkiOi2o5r+dr8mF+Zx9VVWGg6Ag3yE7o3QBxLQVq\/xzp+uviS0AVQAVQnl4tXKKXOIc9gN8e0yb0LJZfxKkJnN6zJVfa60f+sCEGLQ4yCPAf8KuBP458B\/xXq2X8Uybt1YifcQFsT4JNHx0mLtNeDHwM9QfbtQqLhDbZrylYl\/EIcFfi4WJ7O+\/HB1jvVqbu2gms37xhLxxZcyCDzIKYEQQZnihvl04hDXJzu4JHGCeW6ARslRIzEpiUmKJ8IXpTc4lASeRsn76TJ8slEKm2sl\/t8F\/sYrz2cH6a30PgeqG7HRRI3Ap4AmjyT6NUW3psmPfgY1xnwCtohQ1RVZZcUiaaXf4FIFlyOBl6p0FrNycUh9oS1Tlc+YM8ULoJJGZYnAwhgXdWot7\/pGBjXBGHQJFrBg673AQ1JgcNPqJsJ4xd\/mO+vfoqDO5dTNLKjcPKjRvz2mNf+6W1MX5XHV1nuNgDq036E7HfqTBPrTCF7+RctFIbBYAbbdsQTl9Eb8BMqMiKqq5LHZnq9iWeVyGpHVAZeALsUWKFXtyLp99RKwp1KhubWjG8ve7WQkg53AROGFp7yWAuczkvGOTnkvrfiGMAfOl4GHRNgInFRx+R2rF1VylwVzJT2ngtuQBGaqMqun3+2jMvPKP5TmdRlBiAQSCtLc2hFZi4x6LLhSAArtLYurLHEzelz\/tbvZ+vAPPSpdIFuwNoovY+e7RHimuSEukxznaS+9vpZhTdKvKfo0xQApBjVikCQOYYYM0SjZOCH+oFd3f1aT\/9inqdfe8DPyBSTe\/kdhsRb4eOJ8JC7hZwFLBabF6mRAUwzpqMcJS\/PaXwOe8756q7EqQClA2gRMByGvEQVkxHmr+iiNlpw4c5xt8vc04DMKi3OacMd9Pce1jhyjbgDosXGjm4D7EA5tuiu4S3+Qv2h7iVopSK\/m0r0km7IkvphTuSOH+1wOGasWxLMlFjgZwTOCrvPwZB6OPtByfshgVxYfRHYV89TqJq5r3Z8X9Bjwhlgf8Pll3IQUcA7IRaBPN7dmsu3jpKejKJxiTpmdXcxm9gDvAFsZEd9pYC7vF9+LseXGPqySoAN4RYS9AkMi6LY7Kiqwi5tHCrQGc5CcTvmjqylgKsgUqJ5pBSaomQYsUjNpWwxcAFqPLTTexuarH2xu7ejDBHf+lPf4lGqSiUAW9A2QX2KLrc9jpeMpQUlJgVnSxyzXhyLkNCKrSfJYNiUlBU0QUyAaUuT1CH+vqNwLZDblLowftwBXIPA7cU5T2ISCRaA1BRz9mmJYk4yyusti9++ngD2b11TGO6NKKd0f51JMtijFkq7qk11S3N4676lhIolsS0DOB7nSI7N6tUaO+kb6z84j48MoTUPZDNwr8Jb66gmIVwv\/su0l6SOR7NHUzGGia7IafT2HW5lDmgpV2HsNIJAX9JDAZg\/3KW6Hh+5NLRPLv2B84uMgsqucvqNDfsrcmt6iKcZhbHFSzt9tFnApyNzccNxDNT6CPyFF0aQUM5ilPy+KrE5MdEWnvJKYiM2L0K+xz6qi2+8qZ5zj4\/AU+7gGsBEg51ZgI5L20lJQo+Isb+uoUeUCYAVwA3A1I73IVvU8sqbsw66t3cXXnuL7kebWjizvF96F9pbF4+7BtfLW7wPotg1re4Edau0Su4GVWCVHAxYsSQAJQVNpKURpKSgwjFVyZIF3lPxTAhsdPF8j+WNXr\/rTcXc8ApVF0Dq1YPFcIGEiOz3amTuPmZ29CDyjFlgLjBBhJfvTAAdaLONXEqLkquspH2FGrCmkukp0zxaNXVIif7Ggl8caNXT5Ojnh60fb3V2x9cEL2BSWl5zQ\/\/g4SZiUi7va3kq8q0xRZEkO98Us7qsF5JIYafRjOxb1jBHIRuieBP6hBPrrlPhXuzQ1FOZfVwkiGkR2lfP6P7+Y69r2D4rqQSybehmWsSwXdViJ6dJUOtqPLbonFEXx7Yuv9\/pXmlv3i4gHVLdXZ6ZORRhQ5QQmFguUvzc7xhaznZRndNpHYuXh0qjK1cDXgZuwxXztx\/zfaoHZwKcZOQc81rv\/NiOiezfwdnNrx3GQIdDh8Sa4V6y62wM9Wzesfa64Pw9hGf7FmMnhPExwO6zsv1B87yoeh1cEOlBOXv+VuyfcfSBQNmqw820q4Lw6CppglItwBjHDzk0Ke3whZO1ORVHEpssksFm6CEoST4qYIarK\/MxhzzVV8De0ZnhyAgjErQ+tBfxsLAh8XpZE8ohvpEtr8aOr6YaA1xQewKo6Tj6+OoiwEv\/03tcZ9FF6UKNFHrlO4fcKuOsLyHxfxS21EZpLoi8m8K0J1ccS+H0Nhdzw+m9dVOlNCxTxaBDZ44GnVy\/KN6\/LHERkL7bgncLZu2R\/UhLYIvwiEZ5f0ZY5um2S3KDbWxZV9X62tzSxvLVjGGsjeAcb81ZukZ3F3NZ7Klle3dy6D5QGYDlwF+YsP+8THA9hJLt9KnVYZcAKTHTHWCDjWdANwFPLWzs6VHWofZyNlVm56u4Y6Ny6YW03Fkiow4INKRVEVAFJFo9JDNqN3XcKgK78yveq+roIVC\/bHlzrsPNtXvFdQPBEo1kjVcCqUzYBz4rQ9eS3Jscz65OjxVYqiyIDJIlJSwFXjdZnI2LHuWruGj8NVEgBlwpc6XH1PVojGT+FHh3Vtt88FlD9tQiPq3A49tVRcVZpvnXvHpwWJKfMyOKuyeNuKiA3eLhEkaozNishoAk0l8BvTqL\/I4nfmhI9NkPyhb9a86lKb17gFJ5evaR6ozSB3+IoI2OSzqV8IluAmcAVCnO8yonPte0rPFudmd1Jh6oWgD2IvARcic3MLmfv0ABwDBOgFUQiEVmiIxnseWd5HEp9gKd+Rh1wM2YWdKnC\/Yg839za0TcezdNWWmZ7qPh6j60bfuQcHgFdvur7426\/AtWLjzyikgKZDkRarP8VdLSkk2LPyMcFHgcOySmtQQFDxedFoywjQUZSxNRInqR4RLU4T6AqsBFeUBDFa9Vs1pmz6ZH\/B\/FMAa4BmrKaTByNp9Dra8\/2o09FMcPWBxAeKf5zfusEqAI4W1a0drhu72tq0EWxyq053BcLyOUema2VmdTyiRAoJPHdteLvd+jfA69GogMJ1P\/VHVdUevMCH0IQ2eOE9jVNuWVtmbdE5RBwMdZDWa7HTS1Wpt6ksDcSqeiiZeX6fVEhlgQiHqRQ7RnnsaR9TZNaCTObsHEss7BKh3KcGzFWVn0Qc\/GtINKoNq97GVb+PVaBhjrgUkzEz8IW8M8ygdooVq76XlWmsgITAsUMhIptCYKgRPjRyp8OAJsFWoG3RMg9EcYT\/RY33voD3bph7QAjAQiNxEuj5KiVAg61MFt1kMfMR99Q6Bcd\/1lsrA\/+XJCrFJndr2l32E9hcHT1XTfWg92G8jZCbvMd4Vq4uTVTE+Hnx3D1sEbfKSCf9sgsb20sVXPSfwCN0CEHex08NKzuJ060owafv+eOiyu9bYGPIYjs8cVbwJtYCWtjGb83whyaPy2i7WL9bmV50DW37qN03xOYpsjCgmcaQo2Vuulwc2vHINAD2onSr2gehR13To5se3vL4sLyto6XVFkPLMHEdjmisf3A6yBvYOdEBZEZoLdgrQ1jve8OE9i3AsMinFje1rFr++rFoQwvEPgYRB1Y0LYWrEY8IZZBdWf\/RMkBm1HWqo1bHNoYsnYfiUNOeLSLopeGQ5kqw6Srq5o4j7VDbVF4Q4X85gnwmyY02YAlLpbGSE231nDUN5DXUevFzgK\/QfipWLl4buMkDTZd8uP9zKy1EF4qyRyFa4HPx8o387hzMR1UreIaAIf2pdDnEvi2IaJf55Djaby\/d\/WFld60wO8giOxxhMKQwHas53RWmb9+BmYONdc5Ttzw6308+Y2xFbFFgR2B1AKXFUuBL8QcUaeATsMyiO8Cb4O8iPCcKG8hlTXhKjfbVy8eWt7W8Yh6Egj\/Csu2jmW1g8cWP1vBv04FTc9sNJvOYCT4VK4H5jTg91TZA\/xdc2vH8Qk29isQGFUUELsvxRR9EJLETJchaqTAkJ6Rw7gCWRWeEOUvvbIdgtHZ78LhT3jkCEWRIUCDZJkiuWqxUs5hZq\/3O+GnMXRPlBIbUZmv6DXAfFWJBnyaXq0ZjeoBxY7bdhX+SmCnQrxpkgrsm9ZlRNBEwZNIR3pdjHxZ4XoPV3qkrtLb9wlQh55IohvTxG3nyNATAr1\/tfrKSm9X4BMSRPY4wikOy2a\/BCykvL+fAy5UlU\/ls7r76buWjOkiZtm6DlRJi3AecAvwXSyb3oiV9ZSIsTFE12Djmt5A5Akn+sj1bZl3npokJm0AGvs+RH4tIh2qrMZ6k5cUj1fE6IlPj42T2wRsmz09Pnn\/LRdUZJ+Ls89LbsXlDjyBlabfBDyDaljcBwIfwdYNPwK7D+WxaQQx4CLxzHIDzHd99MUp4k9+m1KBvEKPwBMK\/12F57fc2RSuwd\/Btg1rKdgz\/TD2e6iCJPDMdAOIaKWtxYaxqr0HgHueWN10sNLHbLTYumFtUtGLsIqzBo+gAkkpgJ5VEZZi1WUvA\/8F4aVNdzRVVVlCObh5XQYEUagRmA3alIzkCx5uVVs3z\/BIlcSRPhqB4SR+f43Ev0qoPuiEV\/969ZUV9r4JnC5BZI8jRFCUPoUdmHvyzDJ+vQPmAFe5SJ7C3FvHhOZ1GQFqEC4BVgN\/gPXAftiNsWROVYNl2y8BlnmVy0B+\/vlfZ17Y\/I3x5f58prTfuYTlbR1DqvoiyAmQ50CXA5djYrseu+ajU95Pt3c5xnqwHwLWo7r7\/lsuqORyTLDAy6IKfX+EBXkuFZGdza37OttbJkebQiBwOpwinfsVeiiOHBSUaW6IC6KT9GoNR3z97xTaEeoT4ntE2QPyaF6kTVV2b2ppylZ6P8cDXnypdP8AZqo6C0DEM90NUk+ebFn9Mw2xwEmfoE975NcKjyHsrfTxGmUasGdyE1bVQYKYxNmV6ZdmYT8PrAW2iWfSXAs3rctAaUqIkEJZiPBpteTLjYpeDKQZH5rHR2hfUvzLdcTr66TwmxT+4I9XXzFpfs+JxHg44QIlVBRzAt6Fjd6ZQflKYwUTaZcDTcvWZY7sWDP6GYNbHswwOESNql4BsgZoAc45jY+Iin\/\/NtCabE60uTWzs72laVKUj6uqYlmAtymW2hWPSS0mRC\/8wOs87D7wQfFdCmho8eWLn7sHuAd4DNjdvqapwr3YOExkn8t71ahl\/\/5a4FyFRpAuKp0D+gAr792LVxFVcapSWjkXxtuc78D4ZsWq77Ftw9pYzZzsCPZeK0CN5FkSdRLjkMJcDvuG90pnHdYvrEACZapk8\/WSe1dEtju4P09y8zu+tuvxlqbgIv4JySWGSRVqY1HpwYT2xUDkUKbJEOdEfXQVasp2I7NRDlqI0KMRPKZwbx5eyEdybPPtE67UuQFLWDQA4lASxLiin\/sZHHPFglbPAb8ENqrSt3nNxK\/i+3xbRkRJYMeyEWWewjUI12E97xdg69aqz1wDCMRJ\/NG0+PY0\/r46iTfVSHzyb+\/4VLi3jVOCyB5H5AsJElGcQ\/Qg8ApwBeZ2XC7SWPT1M87Jq5\/\/1b7Ozd8c3azd4DAJRRYgfAkzlpp\/Bh8TFf9\/twBdIN3NrZl97S0TP6PdPmIK47HS5RxAc2tHHzba5mVGMtgRMBXLxJZE91LswTQLy1p3F189WJvCoyK8IcLJOTMK1RC4cNhDdEpxX9MV2IYUtmiqw8rQKl6id\/P9GbI5capEcax1COeqyoLiceoHDja3dpzAson5U9\/H4ziywPhARUwQqL6CibvpQBThmeoG+ZS8y+Kok2O+kZO+jgFNkiVh5SqS0ykyPJSmsNuhjzp4qEbkpT\/6+q0Dld6v8cYtX\/wXbN2wFsyw8gAWvG9wQJ3kmO\/6OCBT6dG0jVcbQyJUa6UwUEfh9bT4X3ncw4Oa6KgV+tfffuFEvBeVvFIEUCcqKfHUUiDCUzg9PVgS2M8AbcBjOE5uvmPiCuwbf50BIMqRUuUcbN1yPnApwlWY+WkjtjYeF+Ia3gs0nUiJf7ie+Jf1UnihRuLeRCQT9recDASRPY549lsLWHZPpiAix4A3sLLdCylf9s5hPaiXq9f5ubz0MMqCQlWmAldjJlbnceajmBJYdvNGrLfrGFZONSkpCqeYD\/xeza0dvZhx3FOMCO+SaFyMPay6RHQ\/yhFFBkWI0ymv991UmT7sD1B6AGWx33d2BbahvviiGkxKV\/1mL739klKYpXAZyA0on8HaS6YX3yOsTHQP5j67u\/jP+4sBmfcJbyAO4jtwtqy89btsfXhtH8JOzKBsPjAXcA6lVvLUSIHpboicRsSICuojNOvQY4o8rfBoUv3T9WQ7rvvqn0yY0XnlRwsgJzGR3QU0gFIjeea5Pua6AQbi5On0yJ8WDqWOQjzF5Y5Nlez2qWTbaiV+8rjWn0Tq4p\/dfvHEvN8IWZQuLCisgkqKmLSc9lKqJLB3YCPrHgfe3TRBBfZNrRlESWiOGqGYsYbrsYz1YqylMFX865V\/EJ8mCurhWE5dez\/y\/AzJ9v7V7cHgbLwTRPY4w4kqSK\/CXuAdrNe2HOOaSkwFLkdkqfe8veyejnjHnYtH8\/PPxWYdX8T7Dc7OhBR2870G5IXme\/a90X7nkgn5ADpTisKpwMi81JKZWBdWcg4QO+e9jx2C8lRVzdpUDzJQ3N4BKiOyE5jAH7TtqSxdvVEDFny7BXPkvwy7lpK8f\/ExBcsAfBGrfPAUs9y8X3jvBo40t3YMYaI7B5ID79tbJuaCLjB2rLz17njrQ2vfBH6C0I8FVOcCDQr1oHVJCiSlMAD0CHocOwe3gDwt6EGH773uK39S8YqR8czKVd\/TrQ\/\/uA\/VPVhr0TwgmcAzQ8yI7qivp1dTZ\/dFH0CAtBSYJcODc6V\/1zTJPlIn+funMvzaFB0cqpW5+t9u+2ylD8+Y8NjP\/hH12S4R30uxvSkqBjaSUjhdZdiHTZv5JfCkKEc3TsAS8Zt+mUGtU2SWCkuAT6slTz6FPe+nMDG0jHgkn0P685DbxZRKb09gFJgIJ+akYvuaJTS3ZbKoHMQWwFdQfmGxCLhCHM\/FsX+XUepBvfYXmQS26L+MkWzb2SDYmKXLgYsROcgkzmZ\/UopjqEqiq6ppb2nyy1s7ehWOYwIx5uzPm9OlNEZusNLZ3uZ1mQasEuQ24EtYkOmjVsmO3y6nq8VaBa7EjmXpPOjEgi6vAs+CvgCyHyszDQROi5Vfubuw9aG1L6G8g\/A41qayAPPTaMACZoeBY4rsU9HXQY+KkgV881f+ZMKJicqg\/VjAfi\/23J0hKI2S5TzXxTuukcE4cbolzB+KicmCTpfh3ALXe2yu6984VYY31FJ4ulbzR9JaKHzptu9U+oCMPaoFhAHseaWA1EqeRsmRlviTzMpWsXXMJoWfAe3AiY1rJoaT+IqfZhCHJNNE4oi8Z5YIV2Pzra\/GztNZjMy3HndZ64\/AF\/dFGUdl7oGPJ4jscYhHC473RHYnZoBWLmEhWDb7U8CCKHLHGKUZyckkDV65AMtmj1ZvbQ0m3C9H5IXm1o7+YPg0sVDVPkR2YdmYxdgivZz0YYKgoqODbv3N29LdKxcB38T8DBZy+lUupUWL4\/3PhzqstPdqLIvwJPCr5a2Zl9Rrb\/udS8I1FTgtVn7lbp56YO1xFdoxV+QkSoQwrE5rgMiL9qv4QS\/eO+9A4PO3\/qDSmz5hyLusT\/hkRtS9gF3bU4BEQmLmRb0s0U56tIZOf+YznG3+dl5nyWB2jhs4tsD1vDI\/6n2wXrJbHPHB+kJhuPkb35sUQZMvfuf32frQWofSVRTaXsGlpcB0GSJNgf6Pv2WrwDGx6R4\/QXhFlYFNE8Rv5qa24mQZZYbCOShXInwRM+Y7B1t7TlTdotjzugYl8XhVVQwGzpSJerJOaJ5evYQV6\/f1xN69hAmLBbzXE1oW0tiorAuBXc3rMj3to1OmlMIE9jRGN5I3B8tmnwscWda6b3hHGLM0YWhf05Rd3tbxslqP50WYOV+57m0ey6JXXGR390YzsdLbldg9YTTbSAQ7po1Y9cyFwHWKrMXJhuVtHUe3r148ITIpgfJx\/dfuVsxP4b3xNNseWIvE0rfia3dXevMmPDf\/3j9j64Yf9YA+D3ID5oMyBZAGyXF+dJIuX0tWZ9GvqU9cshahJPCkJWa+68\/Pd31HZ8vAzllu4MkZbuCJWsnvSkXdQ1fN\/JHKNW9\/wk+dGKh3eXH+Hcx0ztvx8sxyg0x1Wbrjmo\/qgy8AHWL91\/9DoQMhfxo\/S1XyhXsyqM1uS6EswqqoPgOsUEvm1PH+iScTFcGe2YkJk5sPBJE9Xtl2x5JC87r9byK6B\/gsdiMqpwHaOcBVKNsU6f3s37+tL\/7x2RlheSWHlYk3MLo31DRwFXCxoG84kSxVNmYpcHZsX734xPK2jla1SogZlG+8XR\/wGmYeVGG3dbcU9AY+vkR8NLBsg11TMVba+8jyto7u7auDOVrg7Ajiuux4hDdRNmMZw4sozi+f5fq5InGEPBGZeDp9mvqtHqJSfatF4Tz1kmeqZP0MGcotiboGZ7iBF2uk8ESjDO+YJoOv1Uiu+4pb\/2JCZF7PBIl8jBmWHcWEc0pQZrp+Frhejvl6+nUkPiqgSbQf9KUYuc8j96q1J3k8bP569WU8v3SvOYA\/Why\/dlNrRrR4ogioKoKSEEe9hxRKDcoKhJswYb2UYrCn0vtSRt5r31KIv3hvhscm3vi6SUcQ2eOY9jWLDjevyzyDyJcob8k42A3wKoRFeD2UrIlG4aEpBewmMxYCYSFwveK2qtLT3Lpf21sWlfFwBcpABvgR1lf8e4x+RcQHUWA\/sBU4RAVHd5lZnV6MOa42Up7FicOyDrerkgGeb27tyBd7+gOBwDhg5arvsfWRtX3AYyiXYCZ0swBJ4DnX9eASSqPk6Iin0+vTFBBTS9grQpkuw8x1A0yXwYGZbujwfNezt16yjwk8lcDvr3W5kw5fuOLWv6j0LlcUiVEcJ1TYDXyh9Od1kuPC6BidWsuBeAoFIhXI1xAfqSH+TYx7cIhohyKdv169tOzBzBvvMeG85c4mrm7N0AgJOwvIb2pp4gutmaRXkghSiM3P46bWTBohjdIoSkotez9XhKUIU7AEyLkIn8JMfOcy+cT1qXhABAqVt1ANjAZBZI9jlrfuE2CHmiFRuUNeDrspLhMnLz1z5+KzMhRrbu0QrOT9CBbdHW3HdAcsB71EVQ+qJ4x+mWCoosArqP53RDqBm7Hr4mxd6j\/06zA\/hHaB7Yp2V8ppu+gGn8ZKPedR3mBbDdAMfAHVfVh2JhAIjCcUDxxAaEVpwu6dNQAJiVkQdTPdDXFhdIIuX0efphgmUWwijZkpQzrdDQ6lpJCppfBSneSeT+C3eS+7klEhJ+oL19z6p6HKBWwlIvRiY1iPUBSVgjI36uNaDjDfTff9PtWXFr+7hviXXVr7cKMWDhxnytB\/LdNYp+sfzxBlcdEQU1EiVbLOMf\/m1sxUHTEdiwG9qTVT62EqMtK2qPYsWoCSLv7deQIXYEmUGAuGNxRftZjALLdpaTVRKghJC6QeX92UPdsPDFSeILLHOQrdmLvkMixzVy5KBmhXgy5dsX7fi9vuOIvxWE5BiVHJYM6ZtWOwzXOAL4O8LI6DhJLxCUV7y2Ka12WyCM+LcFiVl7ARVtdiC8YE9hAvvZ9ptNwDJ4CNwH1Apr2los6uDju351L+RUrJwb8ZYZPASU4ZBxcIBKqflbfezdaH1+ZV2Qn8VKxt6yqKYsocx4dojIY410VkSVAg0gg\/WCv5ngh\/qKBuuxN9zqFvouyVPP1Eot47rv\/q9yu9i9WDVQDkgTcxw79zKZp1Jok5N+rJznH9+wWeT0r+wQFNb+6X9ImWVWvG7Bnz+V9mQIqGl4Kg1NDFZWJB6lnAAhHmqTIN3hPNrrjds7H9GcIE9By1Z0Jx3CNpLGlSKocurbs+6Aw+mQU22LrCAWnVMW33CpSRILLHMYoodmN7CdiHmUWUs8wmDVyEyOUe2YWNpDgj6pPoYI5hRd\/FnNNnM7qlvoL1rS8TYbkI9y9v6xjcvnpxGQ9XYKxpX9Okza0dw6rsAw6C3Ac6DzPquhDr9boQWzxM4f2iu\/T+ceSwsvQngDYRXlSvAxXe7Qi7XmZV6PuTwHkgCxFepgpF9vK2fRRvjaLqQqtIIPABVt56t27ZsLZPRB9VOCEq3zaPB5kPJIrrDReJ9\/Vk38VMV\/cr8gLwbFL8O4r0q7rBlV\/5p8EE8SNYseputm34UUFtBOJvGJnaUAscdPiXasQ\/JehWRXfNcP2Dt976B2OSELihNYNYeXIKZQawAOEyhJVYi918TDDPxO7zOUaelaW15qmi+VRSfLgh72QtBf9dlMxFBcFd9TcZXviz0JM93gkie\/yTw0yXXsRMS+rK+N2lxf3VqrSvaMvs3bb6zEZJRA5UyYJ0YLN4L8RE0GiSxGZ836rKa6i+zjiYBR04PYo9wQrkmls7clhlxF7gMeycjbAFzXmMiO\/SawEWPPqg4HZYad9zwBYRNmKBrfwoOeufDUnMk2G0r5dPisPuO+eoUtfcmhmsVOn8B2n+5V7EOYdSo1AP4kALxRL7GMu2FIBCe0twRw9Mbm5cdbdu2\/DjPkW3Y\/fMy+G9ftlSO9deRY5hUxU6EDkGZEU9sxjUi7\/yLyq9G1VPjFcR1y3KRuAkyEWgHuQoFsTdJ9B1\/arvj8k96aa2TClLk8aE9KcQrgVuAC7FnilJftsf58Nar4JoHh1KWX6niouCOpsQhJ9xHNPe0kRzayYGPQ7yGuY4eT7lu+kJMB3lCoGLPXIIy6yfNr\/5ahPNrZkCNgrpZeA6Rt9lHMwU6ipszNF+TIAFJihFwe2Lr\/fcv5tbO\/qwku9XGBHeEdYCcT4muC\/AyrD7gd1AB6oHEcmo0lM989bFgSYw0Zhl9GbMf+INAOpAZoz8a2VZsb4DVZwqDWpVC5dh702Y+3qMBSf3YL\/t3ubWjmOY4M6f8h5Xz+8cCIw9K1Z9l20bfpxX\/DsgR4AtvP85LAKxojkgXnlrcIM\/XW5c9ScAhS0bfnhEVJ4Q0S1AhKiqSjYuJAqf\/\/o\/GZPvvqEtIwpJgeli1Y9fwtZbF2HPv4k+Kquasb50wTVOfc+4PzCOCSJ7\/KOYUHwLWzAuZGzH93yQFNCkcCWqLzSvywyfcWbPoXi6MUOQXVimsWGUt9dh2ffLEFlQ\/K7AJKO9ZbFiQut9mYLm1o5eLFjVznt92+JFFBRVyKMat6+ppjIuXwAZxO4Dw5RfZAPUgOaL31\/RhUFzaweqJFSZrxZM+xI25nAhdj9RbDFTei8FYI4yIrp3F\/95f3NrRw\/vF94FTHyHBVBgQrJi1XfhQ4KT2zb8qPjfv1fpTZwQ3Ljq+wrkn3z4b\/MAKsqNt\/5gzL7v9tY90aD6qXlxS73weZQvYgHI6Yy+2Wzg9ClVD4hKENkTgcqnHAJnzfXrO5z3LAW+D9yFuTqWkyywAfjPoM+B5ttblpzRBzWvywiwEJE\/AP4QyzyNdmS1H+up\/UsVbd+xuilX5uMVGEcUS4up1tFUt2\/aw+ETycuBHwC3Y9n3ct7bFTM8+38Bfw9UbIxX87oMQA0iFwLfAFZhGZpGfvd9xH\/IaxA4yIjo3oUZFh0AekR8fvvqszB8DAQCgTLwb3+1I3kobji3U2uahzT6aowsV3tWpAhaoFroAv5vbBTp0U1V0nYVOHNCJnsCEMfei8gRkJ1Y5qZkUlEuUlg09GKQN1S0+0w\/qGhcdRjrfW3GAgb1Z\/p5H7O9M4AZopLG+toDgQ+lWsV1iXtvWkrzusxxRDLYWLGZlPfertji4F1AK3m8oogo9lwIfBsT2Yv45IvIkvvtqdRi94orGMnqHQeeBH1IVZ5d3po5orHPtd91fsX2OxAIBD6KH\/76kfQe7y7J4b4Uw60KV+rknkddraQpVkppPmSxJwKh92ICsGPNEkD6sQzLXij7DGjBzDM+C8wFOatRDO0ti3PFUSIvYqJhtHsik5iBx2QfGRGYOJwAnsXaRvopb5lZjAnPo2X+3t\/CKzNAbgFuxQR2adzMmVIaVZNgxC13MbAa5H8B+QNFLiKKaq5f31HJXQ8EAoH30f7wf5eNG35SX0C+POCTf96vyX+S1eiaGAkCuzrJozi0OEotMO4JInuCYM64msF6jDv5QK9pGagHPgcsFZX0snsyZ\/Vhqv4YsBXLjuXP6sN+GykeHw\/o8tZ9ZT5UgcDo0r6mKRZhJ\/AIZug32tfMx9EPvA0co8Ju\/apyOfB5xt6bog64Evh94DZggSqJlfee3X0vEAgERoOnH\/6baMin5\/b42n9ywE\/7l8e17utDmrggRmoJArtayWHPLedCCmhCEET2hEJPAjswh+5yi+wIG\/NhruAicvXP957xhz1955LYiTwDPI31fI92hqxfoM+Jxi5cBYEJwHnz8j0i\/AZ4GBu1Uw7B64EOkHaQk9gs3Qoi12Mjh+oZ+4VkEnOgXwPcDNSphsVrIBCoHC8+\/Dc8veFvo2Ffs6TL139vZ\/6c\/2lvPPWaHk1NL5xllWFgTOkD9iKcRMhqeJJMCEJP9gRCVTzoSyKyE5tvWU6XcbDxD83AA6r++PPfPvMexeVtGRTfK8J6VfkSZl40mrwLvCuiuW13nJlJWyBQTZzsjqhJ+0NDw+7HmMD8p1g\/sWPsBGcvsAP8U8BAe0tlXNeL5nQR6NVY60q5FpMRNvLtTlXe8ritFTkAgUBg0vP8w3+NR5ODmlx63E\/5o92F2X\/8Yjx3xqAmJcT\/qo+ifXgMdABPYePyngR6gunZxCCI7AmGiPQB24FbKE8251Qc1q\/YHEXudWDgTD8oEiVWQZUO4HFgAaM3zqsbeF0t21fujH8gMCY8\/tUlALq8NdMB\/FeE7apyFxb4moPd7xOMXgXTILYgeMSJdDy1uqLzpAU4BxvPV+7nWhIzfvyCer8Lu68EAoFAWXjh4f8G4mRIUzVdvu6yY3HjtzriGWtej2fPHNA0YRJUdSFAAq8p8f0R2p7H3Tek0TMi7NMUfZu+Xk0jQgNnQyiUnUDEOUU9eZQXgVcwl8Jy4oBZwHWqctHytgNnLPC33rEEJ6gIPdhCfg+jU\/6aA94EeR2kP2SxAxONKPJenB5TlceBfw\/8b8DfAL\/BjNE6gR4sCDaM9W+fzirMY27iDwM\/RfVZ73WowrudwPqw6yrw3YIFAD+NyLkr78uE52ogECgLuzb8ZxwqvXFt\/bF4ymcPxDP+cFc8+44341nzu4PArjqSeKbLcLzI9Zy8Knr3uZuSe9ddnTi0IXbu1Y2rm4LAnmCETPYE4tnvLGHZLzMekVJv9nWUf2Z2DXAx6Ke9929j5aRnhAiKZxgTBluB87DxRGcq3j1mzvSEqu7Eer0DgQnF1tvPZ8X6fWDn9y5s4sCvsdLmJBYIuxBYWny\/EJtHP634dxKnvJdKzT1W9dEPvAM8BqwH3kKkp72lollsMBfxc4vvlSACpgPzCgXSQKWDDu\/RvG4fgCBi70jSJkCopzgupr1lcViJBwLjkE6td1lNNnZqw2feiad+q8NP+\/L+eOo5XVoT6sOrBAUcynTJ+rluoG+2DOw+x\/W2z4t6f+Pwz18q+e5\/980bK\/0MDYwBQWRPMMShCL1YJvsNrHyynGYXSay0+1on8vTKezve2nr7mS3At97eRHNrpgAcAp7AhMCNQCOnL7RjbMzRFuARVX9YxIWFZWBCckqFhseqN3LwXu9yN5DBrqmo+KrFROqFH3jNxwTjISxAtR\/lKRGeRegGcttXV4NAkyRoI3adK+V3z42ABpBy328\/luWtHQLUqN0zZ2LtPItB09j9cC9wqLm1o1TRUCi928SKQCBQrWx\/+Ieuy9dN6\/G1170bT7kz46d\/4R0\/ZW6fJkM1TZUQodRLnvmuf3CB69092\/U\/NVMGn5wmg0\/XkDuSd1F846rvVsEzNDAWBJE9wWhf00Rza0cWW0S\/jDntzirzZkwBrlDkU4WYQ9fds6\/36TvPrCy7vaVJm1szfSDPYZm2eixDX38aH1MS6puAXzrRV9rvXBKihoFJR3vLYjDh7TllzFdza0cfJrpeY0R4R0AjyFzQFGiXiBxV7\/sQKYCwffXiSu9SEQULJPRhQrvcz7ZioEKTlL9N50NZ3tYRqTIL6xdfAazESuqT2P2zNMqnG9gH7MbacnYDe5pbO47zAeGNie9w7wwEKsxLD\/+1OxQ3zjym9de\/G0+962A89cYjWj9zUBPOB5OzipPA0yC5eJ4M5hZF3YfnRz1bGiS3YYoMvdzgBg6nXXb4M7\/3L4O4HgesuH8vcUEEX8zMKSrgsPIwr+BFVdvX\/HapfxDZExKNsazTqyAdWBljubPZi0GvAJ51TgY4C4Ox9pYmv2L9\/uPe6+NqJbBd2KJxNh\/tK+CxvzuELRofBf2NCq850TM2ZAsEJiLFcuGYD1ynza0dvdhIQAW0OrLWv42IDqtKF9aeUqD8zzbFRH5n8b2iNLd2JFXfq\/z5CrAMc5oXfjvLXwvMBa5lJAATA0cZEd0lAZ5pbu3owe6tWSCXShb8lm9eUOldDgQmFfvjmXOP+ClfOBBPbTnopy474Wtn5IgqPUNx0pPAM1VyfrYbGDjX9R5a5LpfmO36Hq51+adTUji6KOoemu6GtOaWf1fpTQ18Ala0ZZzPST0wE2WaQL2KzkSZigWfj2BJzaPX3bMv+\/SdS953CYZw1wTl+rZM0qt8BvgLYBWWXS4nMbAR+L+AbSDD7S2LzvpDl7d21ClcAtyAuSZfiDknT8X6MWPM1OkoVgpps7ZVdwPH2tc0hT7sQGCCsWJ9xsVergL+OSYqp5d5E\/JAO\/Bv21sWb6vksWhel0kgshT4BvB1LJN9JpMmSoEXf8prCFtQPIMZUr4gwjuo5raHkTOBwJjy4oa\/AeBAYebCAzrt6wf81NWH\/JQru3xNYx4X1vMVwqEkxWs9eea7\/qFzXW\/HHNf\/\/Ew3sHWqG9raoMMHIlfIzUse0fm3\/MdKb27gE9C8LoM6akWlCbgK+HTxdSGW3OvHjGOPA6+hukXhRUSOKZJ9umWRQshkT1i8UlDloAgvA5\/D3G\/L2acTAVdgJ+Vr4I8wCjaX21sWDza3duwUOKTwDOglKIuBOYgo5pjcAxwE3QnsUmUYiHesCYvAQGAiUijgRbQDkVexjOwUylu9k8PK7U9W8jg0t2YQkemqfBH4JnA5lqk+E2zSzPupwwKaS7B7+2MoD2H+H8OV3PdAYKLTpzUuj2vK+Bnf2uen3\/aOb7ywT1O1cdHVMFA+zMwMaqTAVMkWZstgf1PUdXy2699eL9lNdZJ9KS2FTI3LD1795T8La89xxLJ1GQfMEJXrgS9ja4omRnTUqb+nAjcgskbgCYVWhz6zvDVzMpn0cRDZExTrZd5\/EngZNIPNkD3TxdaZMhO4HtiCyglO6QE9u31bXLjh3n3HCrF0qfIKVp7uBFJApEIe6AMZQvNeBNpblpZ51wOBQLnYcWcTzW37T6D6JBZUnIsJ7XIsPhXL8L6DtbJUkoQqnwJuAS7Cpj2M+ndgpefLgIsUloL8aHlbx3PTp8TDD33p\/AofgkBgYrHt4R\/LSV+f7FVd\/EY87+634xnfOOLrFg6RSIX+6\/IjQK3EzJJBneP6u+e6gcy5rvelWa7\/0aQUXoT4qJN40Iv4a7\/8p5Xe3MBp8HuP7KO3T+YDXwNasGThNN4ftJcP\/LPD1hxfEfPAmg7yRKEQHQ0iewLT3rIot7yt4xW1udmXY+XU5cxmJ4HPAFcj7Gpu7cgXjZfOmidvX1LqgXyv\/\/H61oxEkSKCbrktzL8OBCYT7asX6Yr1HS\/Fnp9jLtpXUJ6RXnlgP8hOrIqmgrg08AXQKzmzEvHT+jJsQfENrJS8v6s3epUqMX4LBCYCr2\/4v+W1wtT6Lq277IRv+OO34+nfOOrrZmWJgoN4mUmgpKXADBnW86PO7Cw38PoUGX5mpgy2T5XB9oSPD2kUFRD02lt\/UOnNDZwBvQPRTNCvA3djpeElg9DfhWBifCUW3B4GfhNE9gQnjv0J59x2LLMxu8xfL8Xv\/AKwUUX7lrVldMfqprP82A\/nqdATGAhMarbdsTh\/fVvHo16pB\/4cm66QZmzFZi\/wLOgzVHA+to1n0zR2r59D+crlG4BbVHkbONrc2nE4zN0OBM6eR+67R57JN0zv0vR1J7XujzJ+2tdP+NpkKA8vLw5lmmSZ7QYL86S\/d0l08sgUN\/xImsL2Osm9kZL8QUEHo0HzDr3qzn9e6U0OnAHX3ZMRvF4P\/AHm\/XQmQfo64DqFHpSOILInOCIuVmVnsTf7Qk5v9NVokASuUNEVwP4dq4PxWCAQGDu812GEh0AGgNswg8QFjE1WexDYCTzmnO596o7KBPqK888d1qKzBGudKSezMHH\/AqonMefxQCBwhvzjA\/fJYY3OPeQbfu+Yb1hzQmtvPOrrEkFdjz2KRSgdnmkuyyLXU5jr+k7OloFds93A8w0ue5+i+9IUelEdum7VD8JYw3HMsnUZsED8fOCLwJWc3XohDTQrfDWI7ImPInoSZBs29moJ5S0Zd8AsUVkJPNXcltnVPkaZ7EAgEMB7lcj1IbpRlQPFMu4vYQ\/OFLZ+Spzyfib3Q8Vmcj8P\/BzV7ZGruLBMA+dTGUPTCHu2fBaRF5tb9x1pbwktO4HA6bB1w49ABYRUTNf53b72m4d94zeOad2VJ3xtENhjjhDZfGumSVbnRP35C93Jrqlu6Lk6yW2vI\/dsgnhnpNrlnKrD6zWrQs\/1eEcEAepBrsJMzs7Wy0QwT5jmILInODvWLGZZa2YYeBnLuCxgbMxwPoriycvlwLV49hNcaAOBwBjRftf5LG\/b50H6TGDLG6BrsfvQBVhFT+l1ARa9PlV0R5QSGe9HsftZaYb0JuB+YItLRCeevG1hJXdbsN6xxZQ3iFrCYWVyizDTl2NYn3ZVUcz4F41qxLcXx6wEApVmx4YfUgCnQgNwaYS\/o16yt85x\/UumxNlUFzXEweRsTLAbgmemDDPX9cfzXH\/\/ua736DlRz6uCfzyBf1aQg74gndlc0t\/c8k8qvcmBUWLl+n3EnoQiCxhJRI4GCeDcILInA6IxKu8A27EozbmUd0Z6EnM3\/xzCCyvaMm9uW91UdQuwQCAwMdi++r3nZFx8DTe3dvRhMy2fZURIJ7AS66W8X3w3YQ7aEXavzGGGXnngVeBx4CkR3oycDmy9vaICm+I21mEOp5W6tyYZcVZNcIopZaVpXpcRhBqBqWrmNEnQ\/ubWjgFGftfSexx6ygMVQLDxeMuAO4EbUxLPneP6Uouibjq1lm4th4\/j5MChJPHU2gguFrjeeL7r7ZruBndPc0M7G2V4myBPe\/QwseRXfO27caW3OTD6FDRyoDOAq7HWsmmj9NER0BhE9iRAY1FEe8RmyL6OLcSSZdwEwRaynwX5lFcOUXEX3kAgMJkoCqcCp7hfFzObPcB+YDMj4rsGCwxeiGWH64EjoLtA3gVOiNAjQn7r7dXQ\/iLwntGZ9gCNFdiImuL31pQ3hvvRLG\/rEFXSWAXXtWqO8+cCC7EKhkHgbWA3sKf4fqi5tWOQ9wvvAia+K71LgQmMIrOAzwM3A\/Mc6hokywLXw2HXyECcJF+RQpWJgWWslVrJM1OGdJYbjOe5\/uFzop7uRhl+PYXflib\/clLiN72Xd5Z\/9e5KtwAFxpDm1gxFs9ALgBuxsZej+fBKBpE9CXj6ziaWtWXyiu4VlRcxx935Zd6MJJYdugbYubx1\/8D2lkVh1EsgEKgYRdHki6986c+LWe+TwBuMlF\/HInhUVWPvVZXt37qg0rtQxCtIDujGesVLpe3lJMKy18OgFc\/6NLd2JFSZhWUovoZlCM\/FeuWi4jFS4DJGzgGPBV0yjIju0ut4c2vHqRUNeZBCKDkPjAbLVn1ft25Y2w3vJSHmAiQlZk7Ux3naw3FfR6fWoFUSxBoPlDLWKYmplzzzXD\/nuN7cdDfUOV0GDzRK9o205LcJ+oKDI6J05\/M1uRu+8Yfhup74RChzsQrfa4Dpo\/jZCpUxSAlUAPHOI3oMeAGb4zab8v\/+M4HPKlwC+k5za6a3PYzdCgQCVUYx610qNa962luadHlbR58qJ7CRYgXKW60EJjyPA93tLYsretya12WSWLb6i8AdwGcYEdclhPf6s99HLTYC7RreL76PMSK83wBeBd3V3JrpbG9pGhfnSaC6ObjjwuPnLdu9HQsILcDG40mDZFniTnLc1TMQJxkOS\/cPRbGL2d6VRskzQwaZ4YZ0pgzl57ve\/DQ3dCwlhZ0piV9KEO8U\/CuCP+yQvKC++St\/Etakk4DP3bMPcDWglwLLsefFaI69VCAfrtRJQvuaRVx3T2ZYnLwu8ApWFjGrzJuRxGbPfRZ4WZX+z\/18X\/zst4MLbSAQCJwN6nUYkX1YFvYiRq+37JMyhBnC9VfyODS37gNkDuYo\/y3g05ze6EphpG3gVBZjC7Ebi\/u6F3gM5OHlrR2vq2pP+5ogtgNnzrf\/\/Q3s2PDDV\/K4x7EKi0uASFBmuQGaEp0c03qO+Hp8yGa\/hwIJlFopUCd5Gskxyw0yx\/UzTQZ7p7nhY40yfCgp8SvA08AuUX1HoFORvNcEHrjhq9+t9K4EyoRz4hSdL5Z0\/Cyj32KlQH8Q2ZMISWlMzGFUnmGkwb8S2ezlwGZB3nWOoUofl0DgbLjxF+\/NWNQt36qG\/tzAZKR9TVOhubXjDaAdm+ZQT3mz2X3AEazPuYJIDTau7ctYD3bdaH0wI+I7hS3MLsF6vf8RkUebWzuOVDqLHxjf5JE86BPFcULzMQNGSUmeC6KTdPo6+jVJn6aZDCnXUt9LaV8dICiJYrdHJMpcN8BMGWSaDOssNxDPdv1SJ7lOh76alPiNBPGbwEuK7AIGFfJeiG9cdXeldy9QIZyQRLkKqxqZw+hmsQGywMEgsicRO25bwvJ1+3sRfVbhJaxHekqZNyPCFkDXIrziIoaX\/XKf7rgrZLMD44+b1mUAalVJqae\/+e8zcfsfB6EdqBi9wKPAxVhL0GzKM9IrCxwAOqi4yHazQG\/ABHY9Y9ubXgtchx3jYeA3y9s6uravDu7kgTNj5arv6ZMb1h4WeADzz7kaSCtCvQxzSeIYJ7WW3YWZ5EZdF1QPEUqEgigoOLHe6mkyTIPkqJGYOTLAnKiXWvK+RgqDtZI\/UiP5kw7\/KrBN4G2FIwJHE6qDCpoTxw2rQsZ6MtPcmkGQaQpfwAKlYzHWuBd4PYjsScb2NYu0uTWzH+QprNm\/ntGP4PwuGoHfExuDc7L9riUh8h8Yr9QhXCbCF8TRnW7goc+3Zt5R8FtagtgOlJf2lsW6vK0jo8o6LDp\/M1axNNa1pSeB54C3QIYrexR0HlbSPY\/yPNtqMSHUBexX5bnm1o5ccCIPnAU54Hngfqw3+zyKwbJZrp8roqN0+xoO+8YJNztbgAbJM1\/6meKGASVJzBw3RJ1kSUlB6yRfmCJD2ZTEKmgX8FqE7hR0n4dnFA4CWTx5QWIUve5r36v0rgWqBcUpejHIcszsbLQD0YpVdT0bRPYk43O\/3ItXhpzI86BvYX1mtWXejAjLMqxyjlcYJ+ZCgUCJG1szYCWjlwF3YeZKeYE5KD8ToeP61ox\/KgjtQLlR8gLPq+rfIuKBW7D5u2OV0c4DbwJbQDvaWxZXZE53cRybw4ILVwDlHCpch7VgrQIy7S2L363EMQhMDMR0cxewAbgIpYViz2iCmEVRJ8Oa5Kn8Qo7raHVDVHifgTQxs2SISxLHWRR1Ui85aiVfqJWcj3GRR7oi\/CHQ4wKHgf2gWwWOKBxTpGvlqrvzWzf8CIAVXw3COjBC8RkBUIPqSoRFjE3L7BD2THwjiOxJxrN3nU9z635AO4BtWF\/ZQso\/7qVW4Yvey6aVvzi0deu3FoTyusC4oFgiXhLYq4GvY9mGAnBn8Ur6ZRIyN92TyW+6MwjtQPnY3rKY5nv2DSGyXYQDqjwJchvopzAxmGCkt\/hs7\/s5zGn719jkikqWigsmRM6j\/IFjwSoGlgNbm9dlTravaQozdgNnhjUhe+AAynosGXIDRUGQlgIXJI7jgR35RZzQmnFlhFbqsR6ZW13Qesnnz3W9\/vLoaHpO1DtUJ7ljEb4TJKtwwuEzzkwdDwJHRXlbRY8CCUUKoLqy2GO9clUQ14GPJAIWIHItY1MmHgPvAu2g7waRPTlRB0MKTyvchEX+y70oSQDnKXw5n8y\/hbnSBgLjgSTKBQh3AF9lJEhVmgXfAjiBXyC8TajUCJSZ9juXaHNrZlhV3wZ5B2vNuRzrP7uw+FqM3fdLgvtU8f278JjR2WvAz4FHUT3SvqaiASXBMvYLKvT9CWARsFREnsX61KuKFev3ArDtjvMrvSmBj2Hll+9m68NrFRhE2IlyL2aCdjHgBKVOslySOMoUyfJy4Rz2+6kMaYRH8AiKFGX3SP7ibOdrl4Tx+z\/PPv\/9\/2TiWVB8cTsS4nEoKWIiFIcyyw3pNBnKJvAHGyXXsSjqPDIn6t2fwJ8E7VekE\/QYyGGgG\/DqdPCGL3\/v1GsrX+nfKzCuSGLPiJlj9Pk5bMzjM0DX+Al9BUaVFW0Z8SrzFL4D\/DPspCv3+TCAOeH+V9CN7S1NuUofl0Dgo7hpfQaNiUQ4D\/g2cCewlN8uS81jEff1KD8XYc\/GlqawEAhUhGLlkmNEQJde9cASRkT3hdj5fA4jgvuDWe8YG9F1AHhOhPWqPAv0trcsLlR2PzuSmAj5Z8DdlP95BtaH9xPgh6AH21uaKlI6\/2Esb82UZoJHAIqkiv8eY\/esQqVK\/QMfzbYNP04q2oQ9b34fu2bfC4QViDjp6zkUT+WYb6BH0\/RrCq+OtMQ4oIAwrBEDJMlrRFI8qaIUzxIxXBTnFin2JMSTU0e2WEmbwFMjBTxCTh15ItJ40hIjeAo4YoQ0Soo8kXgSgMOEdb3kmCpZkhJTQ4GZbpAZbiAWtBPkOYc+msBvb5Th\/UmXy3t1TpFYYXgo2Z+ryzUAyMqvfC9UPAbOmGVt+xHVKdh4x\/8F+Ayj20alWBb770T4z060L2SyJynbVjfp8rZMJyovYOV+8yjvuBew0sULgWUgb37+15n9m7\/RFG6igapEPZE4zkW5HVvwXMCH930mi\/\/tjxCmK\/zDTW2ZV3yCwS3fDKXjgfLS3rIILPPsOSXr09za0QccxwzLTs1mz8DE9qnCey7WI7oHOATsAp6LnB5UlXjbHdXgpi0ONI21cgxT\/uossPLD2bYNriqSGDfcl6EQS0qV6cC5gi5QZAlWgRNjv+duINPc2tFFUXCf8l5ob6mG33dysmLVd\/NbH\/7xPlRbsWv4m1gwqQ6sR3u262OaDFEgwsZaeQrq6Nc0OU0Sq0NQnCgxkNWIYU3hiwOxHN7+nIi8Rgj29yOxPy+oQ97LjptwFlFE7RQX8STx1BCTKArvCKiXPPWSJZIYj2iSOJ+iMBSJ5kH3K\/KowONO\/RtJjU\/ifJzHkRPl5lu\/\/8FDEc7BwFmiqBChJMTub6N9TmWBXaA7VOmvq0ODyJ7EqErxhOB54CpgVpk3QYrfeRXwTDbvjl+3ft\/A03eEcV6B6uEmMzlzqszGFjh\/jInojwtKOSwj+E2svPznUYEXvtCW6X9idQgkBSpPUTi9L\/tcNIbpxfoet\/D+udD1gBPRfpReIDd3ZjV1QmgpiNCPlbJXQmTXY4GKPGjFr\/ObH9gn2aw0olwKrABuUOQz2OjOGLuHOUy8DWNmUruLrz3F90PNrR39vF9454E4OKiXh5W3frewdcPat4F7gE7MYO9T2PqpxqGkJU+afCmY5hBcvfx2caBNl5YReVEMBcXqfqvcGyAulp+X\/iwh9gkFdXiECNWUFHB4iXF4dUTiCw4\/DHg1G7djWDDnJNYa+DboiyLsAjoRyV136w8qfr0EJjh2Sy6ITcAY7cpZD5wA2kV4Zftqq2IKIntSo6DF0SsiK7Gh7OU+J2qBi4CrUH1LkA5CD2ugSrj+f2QAIoQ5ArdjAvtCPvl1Mhv4MibSI4XnPn9vpm\/z7UFoB6qPomgqLdTfoyi+O0WURBTrk7ddUOlN\/RC0ANKHZdwH+e0W0nJxFBP6FS29bl6XYWhYZmOGWV\/FRPa5fHRwsA4zb7uIkXPAY0GXDkZEd+l1tLm1YwAYFjS\/vSXc08aSlavuLjy5Ye1+MZPBDmxs3AKsmqrU\/jEFM\/+rAbygcfG\/1QENQEogBs0Xr4xk8e8mIvF5IC5eME7tcyVpUzN8MYjli20GiaTEWdA+YEiRlCLi0MNO4neAYUX6QQ\/bS45jwYEe4DAiJ1GNTfSorlj1fQKBsWZHSxPL1nVkEfqwe3Se0RnzqFj76xvAUyDHSv8hiOxJTHtLE83rMllEdmIlgxdiJmjlXJiUMn7XAM8KHF3elunfvjqU1QYqT7KGCJiHsgr4A6xM73TumxFmWPPl4r8XxPP88sczA9tvCed4YHxQFN9VLaLaW5q0ubWjG8uYdfLxgnKs6AfeASo6J\/vmB\/YxNMQc4FZgDSbIZvC7+w\/dh\/ydWixYeBUjwrsA7APZBPq4IjuXt3YcV+\/z7XeGSrSx4oZVd+cf\/Yd\/fLd2xmCnijwjEImSRqhTE9k1jDyfStUnNZjITmNru4gRcV1b\/PNC8eXU\/n912HnQBwwWM9w1mAjvBXoVYhCHMiTCUbVrzmNJkiFUB1S0CyiIikPJr\/zq3SGBEqgozlFAOaywHzu\/R8Nh3GO92JtV5E09JVEYRPYkJ5dVn0zLcRG2Ypns6dhNtpzUAp8GPovKG4gOUuEsQCBwU1smQjkHmzP8+9jIrjO5NhwmtL8G1KLkart58QttmewTIZgUCIweqr2IvIq1QTVhmdlyBY0Vy6If5gNl+OUmm5N0cUTNbcDnisfhTA1+SsLsgxmfy0DnYo71GxQeRaSD4PY8pnzpD34frLR\/GGD7gz8SFAS0uTgX+skNa0WUlFgbdgEoXP+1u3XrhrVJoE4hKZ4YlSG8ZEn6WpAG0ISiwyp+wDufS8apetDaYpXIUFE8CGhKEC3+e+xUYy+CCk49HsXfEGZUB6qQ7asX++WtHYeAtzBPkmmcfTC2C3gW2OLwR09pxhhHg\/UCY8ayezIOJ4sF\/gwTE7Mp\/7kRA1uB\/y\/wNDAU+r0CleSmtsxclC9jDvyfw7ICZ3td9ANbEP4SYYc6BjbfFoR2IDBaLG\/tmKY2v\/5PscBYubLZWWxsy78BnmtvWVyxaRnNrR0XYM\/z2xhxix8rcsBebJTbz0U4uH314pCxnKBs27CWkoZYEeZRB8Yhy1oPiBN\/hSr\/K\/B7nF0wNsb8S34EPAb0nGoUOZrW5YFxyo47mzwihxF2YCUUlYjCR8DnUL0R1UZVlWX37Kv0oQlMQm5el5GbWzNTUVZii\/WrGR2BDdYXdwvK\/yyez7sC02620TqBQGAU2N6yuFuEh7HZ4F2Ur8z9BPAcyCGQimayQa4AlmPtX2NdsZjC+rj\/EDPkmr68rSPc0yYoK1bdzYpV3wsCOzBu2dGyUIHXRPg51kc9zJk9JxTzR3gUdId5FPj3fU4Q2QEAdqxeNCTmMv4Mlm2rBPWIrBFhceSQZJU0M1zflpHmdR3Rsnsydc3rOqY0r+uo9CYFxoibWzOo0KBwPTYLexlmJjOai8Y0cL3CnwNfUmHqza0ZuXldptK7HwhMCLavXvwO8DfAP2CzqwuMrdjOA68Dm8EfA1+xdqfm1g4BvRy4lA8fMTgWOGx+87dUuVqVZNEsLxAIBKqO7asXe+fYjGWgX8J0z+k8IxTr6X4YeAzlCErc3vJ+T4oqkTGBSrO8LYOqHgPZhgmLTzM6rnuny7mKfNfHuu+pO5ecqNjxWN9hcy5UUwoLES4QkZlYZmBhcQFxBMhg\/X+Z9pbFPZXa3sDZU8wo1yMsQ\/k+JrSnjdHX1QLNCmkUUfjNpjVN3ZU+BoHAhEH1AMJ\/AXkD+AZm3DUbW\/eMZoKhgPX3PSbwksJQe0tlWkCKz6WpWIl4fZm\/PgKuAL6A6pvAAarcLC8QCExObnkww3BWhwQeUWQIuAubwDCT351UKWBGZ78B\/lFgj6p+qOljENkBALyPEYlyoK+APAMsxk62cpMGrhMntyxr29+2Y\/WispfdNbdmUCWFmVXdjMoNwFJsXMY0rDxuqPjqxRYTzy1r63hcVF8GeV9PRqD6uaktI6rUAdcVBfYKbLE6VmWPgjm4Xg38MyB1c2vmoY0tTZ2VPhaBwARBRTgKer+q7MWu6WVYafMMbP0TnfIecfrXexYrN1wP\/EZVj7evqajHgk1DsP2rBCngakQWO9F3CSZogUCgCnn8q01c+4uMIpyQiEdE5KiovgV8EasCqv2Q\/5vHWpB2ARtA7wMyCrmPmqoQ+mYC73Hd+n3i1E0pmj39K+BKyh+IUay37X4V+a+i8ZvtLUvKJlhXrt8nsZdaRS5T4Q5RbgXOw3ppPyqzX8Bm5L0N3Af8SkX3JkRy2+5YXObDFzgTbmrL1KJcA3wfG7c1jfLdH4eB14CfAr92Me8+cVeYORsInC3FzG7RHVuSoAkskDsPG1l56msxFvj6MPFdQk95DQA7MIG9ReDA9gqanRX3Nw1ch5mvfbECmxBjWf3\/IMIDqtpfqaz+bx2boseLRAAiqhKBCKhvbwlGbYHAZKbZKhmngFwD3ARcjo2BnIJVBfUAe4CdwLOgzwLHVFHvlWfuCiI78Am4fv3+yHu9BOsXbcGyeeUmi53IPwS9T7XQvWPN0vLsf2tHjUc\/A\/JPMROXmdhi65NcK1lMaN+LcI\/AnihfKGz91gUVOISB38UND2SIsiCelAqfwTLKX2FsM9gfRRYT2j8XeABh\/8bVTRU2TwoEJh5F4e0YEdClVz0mtEuie2nx\/dzif89hC60h4DiqWxDZDOwWoasaHLWbWzsasAXiv8Qy9+W+jyk2P\/u\/g\/4E6KyGKSHL2zpAcYomBKYqnAMyGzsPjjHSt58\/9b29ZXEYJRoITCKaWzuSwCxgIXbvrwUKiBxH9ThwAvREe0vTJ6rSCeXigffx1B2L4uVtmQOq8hRwLTYCpdy92SlssbMM5BWR5MuMseP5irZ9KESqLAL5JmbrP4fT691LAxcAX0U5qUJXIZE4SuhLq0qkACqkED4FfBf7zSshsMHOnUuAOxUilPtvXpfpAPIbK1t+GghMKIqizxdf7y2Umls7+jDB9QL\/f\/b+O0qqO83zhD\/PjXQkRiAJeUEGyKtK3kBgREYiWypZMpBUKtNVPdPd0z0z27M7O7Pn7L47O2ff856zM3N2es20r+oqVUlkRCJT8gIyESZA3iMJibyJQHhvksyMiPu8fzw3yIQCBJk3TMLvc04ocYq498Y1v+9jvs+R4nsCdl+\/yG4NulGELlV2YVUouZWt1dIeJIAGQA8WuGuowAaMBh0NUvGgA8DM9m5RpUHhfJAbFGZjAZSzgfPDnweAtVimam346kqku3dxlPDGxHeVfN8OhyNKsqmm3Iy2rs3AVhHeHduQK+zpaxAP9URUV7TGTynw5kS24w9R9qP6DiLvYI6hY8q8BYItbG4CbgW+SaS7t5UyIp4n5gl6DnAHcCfWjz0Uc5x6rOcvifKJiuzBFmKOKmJuxpdCgXqsJOgnWIn42VS2umdUuD22DcLzKD5WgulwOEpIKJwKHHW9JdLd+4CNIB6oghY0wBZaqlS4B\/soghzIPizj3k\/5RTbYc3MfaMWfe4l0twQBE7D76v3A3cBkBtoCivf78ZhZ3GwGAjB9wGYGRHdRgG8IAzJ57BjnQHKeV9AV86ac5JY5HI5qZeX8KQCDxXTx2XDKOJHt+AMUUQQf6MSMma6j\/OKjFpiKzfr8GFs09JXqw0S1DisNbAk\/dzjus6OwAME0Uf0qkfY3ZVOnFv1ylI45C300oMFTrlCbg30fltGo9EjDohnadUC92jWwsLnN98Uj19FaTYt5h+PMIBTfI6J1Y3Sj9h\/skZ3ATqysfSzlfXYHWK\/6JiBXyVLxRJsvqJ6DyCzsPj8Hq047VmVe2Ld\/xN+NwvoxL8eCsEXxvR9Yj5kffQS8A7pGVXZx5MLc4XCc4VR6UemoQrKpJjxP+0VYBawG9lRoU8ZhmexbgXOnZ9aX5Hydnu4SrEz4OszsbbiZe8Gi4nOxB3RtIu1mIFcD9y308Qo0qAns+cDDWO9NNQUc67E2jT9B+Ll4XI3SkHRztB0OxwlYdP8URXUzZj62nfIHBwrALqzHuaLEYtQhchs2mudOzOzuVFvfPOzZUIdVBTRiQv1m7Pnxb4H\/GXhclStnpP2GxG\/XVnrXHQ5HleBEtuOY1FAIUN0KLAW6qMwoDsF6s2cBcVGtL4lYVanBHsDXYnNUo4j8x7Ce9vtU5bx8Tp3JYBXQF1CsWHgIeAArHayt9HYdgxgm\/n+K8kfANSqMas74knzeiW2Hw3FssvPju4DlwIfYiMly9g\/nMYG9vcyfewSJtC+FgMlYefh0rP0sqmdwMetdh1VAzQX+N5D\/SZFpUl83etZC3z3vHQ6HE9mOY7N03mUEgR4C3gfeovwP6yJ1mFvq7cBZgniz2rsi\/QCxz5iEZZ0bI3zrUcAPRJhWW+eNuv\/1aLfbcWok035MlamYuH4UE9t1ld6uEyBY1iQF\/ETgGlEatA9pXuCEtsPhODZjGoOPRWgDPqd8niDF8Zsfg2yv7BHwAO92IIE5BZfSvLXoIXM\/8BNVrg4CqZ3znLtHOxxnOk5kO05EAGwAOoBuKmfANB74MTAFIRZotKetCIqViJ9NtFlND8uUPqAql+7a63mJtBPaleCedl\/ExjE8jPXnXU11ZrCPxsNM+FqBnwGXC8TE5UkcDsdxeOP+KYEIbwK\/Aj7BhHapg+R5TNSvAK1UUD5EAZ2DucLXl+lDx2Nl6T9AmZjLu7u0w3GmU019iI4qQzwPzGzsPWAZZgg2vkKbcyXwJCJfY2NWImGmje4KwuVAHdFHvBuAaaBzQTeHiw9HmWhJ+6gg\/Tbv\/AngMSyDPZLufcUe\/yeAmMB\/XjI\/7qI1DofjmNzxnE8Q6AGQFzHF+RjWR1yqCQoBVia+RETfVyWXTZXfqDGcgQ4DkxrGlWh\/j4Vg5eP3KXxIoK9QmTY7h8NRJbhMtuO4mDOoBqDbMZG9hspls2uAmYHq7ECDyEp8AwVVKV4HpRBegvV73wnyffBGkrg7HRCUswmYD\/wIE9ilzmwU59Tuw0a8RMUEIKXCv2vO+DfMes31\/Tkcjj\/kzYfjLH80roLuEPQ5Ef3fgL\/DnuG7sbnQhzAROFxH7BywEUij+rrAzmwqXsk50h7m5TKW8q9xa4A4MBN77jscjjMYJ7IdJySbiqNCrwqfASsxQ5NKEAMuEuVeUZkybUFXJOeuDvz3YPiKOoggWDb7WszA7ZwZbS4JWWqSbT7JNl+wyov7gD+nPAK7gI2veRb4a2AVtqCNYtEpWCbqIVH+tHYf19\/xtF\/KXkOHwzGC8bxAxdM9mK\/K\/w7cg7We\/Dvgb4FF2PznXdiYzINYaXme775nafjvP8LK0v8R+DIoVHzcWR0msisxI7w4hvEKRC6Y85xflWvsRNoPX92V3hSH47TGZdUc38mq1nhhemb9ZkRXoNyKZdTK1edURLDI9M1AUkS2JNJde7KpKcPbt9QUprf5ORG2AN9gYnhUxNtegxlY3Q6ySoUdVK4i4LRnVtpHFU9ggppp3r\/AevNK3YNdADYDLwG\/DX\/9GZYxuh0T\/MPNPheF9p3AnlgNfXMz\/leLW+OVXtg6HI4qY\/m8qcVfFhLp7h7sXrQFWMHAXOh67Pl0xVGvydgzt2bQvxUsOdOHzYp+B1gk0CnC1gApZOc3VXq3G7D2mkoFIGuwe\/15\/TkasKqmqiDR5gtCTJAGDZ+HifR6wnhKHqtKyAP5Ss44dzhOF5zIdpwUo2oLB\/v6vU\/UMnNXYqVQ5S5XrcVcwO8QkY+wGd7DFqtBQfOxGtmKldLNwB7SUe\/baMxsa5qKtxYTYI4SUAMxhHOBOcDPsdnnpRbYAbAVeBVYoPAhSp\/I4ZLMfqySYUI0u8jFWFZqR6Bkkml\/Q0cqPtyyT4fDcZoSiiYlFFHFP0+ku\/djmeyvgNcYENSjseftFdjkjSnhn20C1mJB6bUidGNCUisvzATsXl8H2hPub7nXKTXAGJDxUD3mZ4l0dwx7\/lymFnSeBEwFPRerYujCvte1wKZEurufI4V3Lptqcs8Yh+MUqJobgKP6SaT9epA5wL8B7qD82Wywm\/064FciPAVsWtnaNPx9a\/NHIzIX+NeY0C7FaKcebO74f0N1aXZ+\/GC5DtqZQrLNjyFMxATtk0Azlo0pNduAl4GnUN5FOXDIQ8cUkEKMCdj18vPw5xiGf+9V7Hx6D\/gn4CUvYPvix8pvNuRwOE4\/EunuYtY6NuiF\/ZmKIH0aBP1AkH1seBVl0W63PwHkh1iL0E1UJpn0MfD\/A57Nppqi9OUYwvHoFhHqw\/GVSSz4fAMWqI1hAWIJfxZfu4GvGRDdX4W\/38lRwhvLeleyB9\/hqFpcJttx0niFoK\/gee+LSCcD5WSViBJPAlpU+UKEJbc\/u\/HAW49cMqw3Vc\/rAd4X1eVYlPfSEmx7I\/Zwuw2RzxJp\/1DWZR8jY3baL5ZSzwTmYzNSx5Tho3cDS4CnFd5FONA5\/7DxjwK7WtL+YrX+xR5gLpZRGM61U+z9uwF4BNhWiLEU+wyHw+EYFqFwKnBUtdiMtM1\/XlnxrPWx8YSeQNmJZWfzlH+dW8BML7dXXGCbL8lYVW7GxlcmMWO2xu\/4Xxux0ZEzGBDe\/VirwWDh\/SXgJ9Lrd4oEvaNH9effuP\/KSu6yw1FVVKUpg6N6ESsrWwZ8ihmkVAIbzyGSUOQSL58f9kN0VetkFdUtwGLgfUonVs7FRotcDDIS5jSPCJJtvtTAWZiwTmGZ7FKNqylSNP55E\/g1yluiHOg8hrPuklR8vyhLgf8b69nexvBdfQUbUTMdM0O7pjnjV6K6xOFwnCGsTMVZWYHxXCeLBuRQ3Yj1jEdlOnkq9AM7sLVSRRGRRuA24KeYyL6S7xbYYM+WGFZ6X4+tuc7C2gbuBf4l8F8xg88FoP9GVW492FM\/IdHmzDgdjiJOZDtOmhWPTwWRAvAFJiw2M3yhMFTOR3U2qjcJnJVID3+c0fixhZzn8aEIaaw\/uxRR6KLz6VmqxKY945f3qJ2GzLHvfiwWdX+M0MWd0t7fFFvArQR+qZAF9nfMP+Homn6EdwV+ifVuRyG0Cff1rvB1cXPGLXIcDseZiSoB4GOmbBso\/6zqXsyfY08lj0Mi7XsIlwI\/xDLYFzL8rL4Xvkcd5l0zAbgF+OfAXyrchcjERLrbaQuHAyeyHUNAYJ9AJ\/AhlXPO9IDvY6W3k0BqE+nhCdZX7p1KTSw4oMoKrHd6D6WJgp+Lcq6gNdVjizJy8YQGFW4B\/ghowZxySyk0iwL7A+BXCssVDnTMP3F2Z8n8OB2t8V7gbUxoL8fKCqM4xy4FHhBlGjC+OeNmaDscjjOP7GNxENmPJQJWYhnlciUDgvDz1mPl6hVEGtSeBzOB8yndM7EGc3O\/B\/gFFuQeMyPTXdnddziqACeyHadENtWEonk187E3sIhtpcZRNWLGVtOxslkvkR7eDOqlD09REd0s8DpmXhJ1NluBBoQxiOSdyB4ecxb4NSjfF4ukz6H0GWywEvEPgX9EeB2PvUtT8ZMWykGBQxrwNjZH+32iOccECzr9QJRJotQkhxl0cjgcjpFINtWknkcX0I6ZQ5arta0H+ALkA5ADFT4Mjdiox6mUfrrG4Gqyn4hwXRk+0+GoepzIdpwy2VQc0P1YlDhL+cuxighwCdZrdBXgRdGCu7I1nlP0Q2ycyVaizWYX+3j3A4ey86u3t20k4HlcDfwJVip9NqW\/p\/ViwvjXnvCCxtijsVM7Pzofj5MbQx\/CKoG\/wloTosi0jAJmAwmBRk9gbsYJbYfDceaxYl5TToS3sN7hFZgALmVGWzFjsGUQfAhBxUzPEulusHFrs7EERLnC+Y3ADFVaVbk43A6H44zktt91iXMXdwyVAHQDyKvAdVgWrRJBmxg2puNBkK+yqaatw33DsOx8H2bwdjPW0xSVS3UO68Xd7cZeDI2kCccYcDnKnwAPAuMp\/UKiH3gXeBrhlf4Ce5e1Di1IsuL+OM0Zv0+FFaL8Evj32EiV4TIReFitJP39Ja3xSlWZOBwOR0XRQtCLyJviyTeq+hB494NeiwnQGqIroVbsub4Y6KyvY1vnQ5UJoIfCtg5rITqX8k+AGYeVjK9AdRuVayl0OCrGdPMKmuAy2Y4hkU3FVcQ7ICLvYg+WSjlpFh2W7xJhzoxM97ADR5apJw90YSXxX4S\/Hy4K9GHZ8Qr3a408ku0+cxb4aIFalKkovwAepfQu4mDf23vA0wKvibB12TBnUne2xlWUYkXIm0RT0lgHXAvMVWWUKxl3OBxnKtnHpiCe5lR1Hcivgf8I\/BfgOazlZyfmvXIAOIQFwU81210ANgILgadR\/bzzoYqO5hSsqilO+QU2WLLlYmwCzPjhtvA5HCONOe3rEKFekGtcJtsxZJouOlDo3jR6MyYQbsbGJ9VVYFNqgLgqD4F8ND3zzZerWicNK0ucTcV1emb9XlFdDVyDOXMON9NYwEZ7rEF12Bn3Mw5FPI86rMfsCWw+9HmUJ4P9BbAAeF1hU8e8aBZRWkNe8nyDXUM3cLjtYcgINmrlDqATK5d0FRMOh+OMZGXrFGZkugqqso0BM7RY+BoLXIGNproifF3GgHlmzVE\/i8+aAAu8H8SczBdg7WXrsvPjlc7cCpapv7SCn1+LrZnGg1TSt+cPSLT5iEBNTSCFgucFKrW2yVoA8q7C0DFc+jXmoZwHzHEi2zFkfjfjWmak\/R5BPlJYgo2mmkxloqfhPEh9FPhbTMwOi1Wtk\/Mz0uu\/UfR1TNjdjT28hkKxF\/szIKvKpgocoxFL8wJfUOqxxdAj4WsSpW9R6Md6pp9CeAnYiEbnQVCoQ2vyHAg\/Yw12DZ3MHNMTUYdlMRLhe+4r8TFyOByOqmVl6xSwZ3AufBXLqvdhfdSDhXcd1nZzxVGvyViGeFf4\/+zCnudLRFgjsLe2VivlTzMIEdAGrMKvD5tzXW7qMBPSsSAeVSKyw9Fi9Qpj8vnY+WrPyfNAc1g1wjeJdPc+7BzJD\/pZcOK7coQjegUIwkrTamcUcCMw14lsx7BYmYoHiYy\/FSSLchOHb6xlJ4ZFTmeK6vuJtL80m4ofGv7+Te6Znln\/rqhmsDEYtzK0bH0\/5sj+JvCxKgcrcIxGJMmMLygNwBSsP\/5RLNtQ6vtXHugG2hEWCmzyhNyiIfZhH4tl98dpafNzKmzFzo892A16OIGqGLZIvEZhUnO7v6Yzosy7w+FwnA5kU01gwjvPoHawUHzvZmCCSlF8N2JrjHOAPkE3A1sIgh6Jeep5aKX6sI9ENczM9mFtaeMqsBGjOPwck6oQpzMy3XWqnI\/5BzUr3Ia1mo3Gqr\/qsf7xDcBa4Kvw51pgUyLd3cuRwjuXTTW552rETGv\/BtGAWk9jhQLjFC4AaQwL8mKJNh9gv8IOlL2q5FY\/fvLTXUrJdPMLqgFtArkLuNGJbEcU9Ct8LubgeRUW9S3lnOLj0YCZsM0F+WZmxv9iRQTGT6taJ+9NpP03BImp3YRvxwIJJyuEerEb9XPAK6Cbq+WmMEKoxSLODwCtwJWUfjxIDnvYPgtkgA0KwaJ5JVlEBZi43oL1BirDrwYZDVwpyhUa8DXlG2HjcDgcI5ZQfAfh63BmOpHu3g9sBxERDURUV8yboomnvkRzsOLHV1Z600NUsf7y3Vj1XBTPk1NFsCqBA2EZdkVJpLtHq3IVNtLsfmyd2IhVwg0+No1YEOU67PsvhD93Yx49RdH9FfBVIt29AztH+oB+0Hz2FMZ5Oo4kke5CVWtAJ+YLcgvWhno5cDHIWUAeYSfwjcCnwNsi1VGtNzPjE6h4WODmDmy88Dg3pdcRCdMz62tE9RbgXwH3YZHBSpDDDE3+GngRdGcUN70ZGR9UzlErwX0YG41xCZbVPtF1tC\/cnudQfQXoRugfISUvFacl7ceAJjUH8ceA72ER8lKSxwT2CwL\/KAGfL36stC7dybQ\/BngS+HMsUDXcAKgCXwN\/rfAMwtbOVvfwdzgcjtOdGZnusar8APiXwC2U3yunB\/g74K+yqabuSh6LRJs\/GpGbsXXbPVhF3KkeD2Ug8FJ85YHNwCcgq0BXAV+IsGdlq8twnwq3Pb0OEYjFvEYV7xpRTQFJzAdpPFZlIFjQox9LGuzF\/BBeA30RWIfSD1CJ0bgzMt1gyY3bVfnvgLnAKOcu7oiEVa2T81h\/0lLgG6Jx4x4KtVjkKwlcBdKQiMBhWQAR3S2wFOFvgH\/C3Kb3YBd9ftCr2PfVBbQD\/1VFnlHPW5edH3cC+yRpafMF5QKFe7ES8WspvcAOsIzy68BTKqwttcAGQI94eEchhgWLqF4qMBapiE+Cw+FwOMqMBnqIgazrgQpswkHsOVpRE7hEugtEpmBVcD\/AvHWGEnAQrDqzFhN8o7BqxsvsffXPsYDG3apcmGjzK1HJOWKprfUkFvNGA7eK6v8A\/BFwPdai2cBAIiuGHfsJmH\/NHcB\/D\/L\/BXkw\/PexSsxnVyEWIBcrMhczsW2A0vc0Os4oCvuF2BK1cupJVC6bPQ6YAXyJZSQ3MkzjjRXWhxskMt37gfdV5AtRzQh6lSrTEJmE3bzHATnQD0A+Aj5T6Ea1d5UzzjhpWtp8NMY4Ah4AHsfKt0otsIv0YgGSbQL5uxf6vP5oaQMjKniijEYOl7BFQbH0bYwExDj10TQOh8PhGGFk58fziXT3WswD5jpgDOXLZitWXr2ZircpyXhgOja3+1KibzPzMDEVxyobbwR+g0g6ke7uzqaaKpVsGjEkFviiyijgepA\/xpIqJ+sj4GH+M3cCExAZBbwOuj2R9stmknZbuhtBxwC3oszFxL6AE9mOiFF0A0g7cBNW2luJc8zDbnhzgQ88kW33vbbu0Cv3TB32G2dbm8Cy1ftmZvx9qvjAu6ieK0JBkV7sAZNHNSdB0Bvr7w+W\/\/TqChyGEU2dBMxT+Cl2HjVSnr4yD7tBzsFKkToKAbsp4RiscJZ1PcIV2AMjKpFdC5wnVsLkMtkOh8NxhpBNNR2Ymel+OVAuw55pF1L6aRzA4WkZ67D1UAXxLgVtxjLYpXZZr8X8iH4B9IrwzIxM91ZXOn5ivJjUBMpUIIUJ7FM1ThYsiDQNy3TvBulQ1bKZC9eKxjSQ72GtslcwKJjjysUdkZFNTaXG05ygbwNprGeiUtnbWkzoP6zKpL37Yl7YMxEZYXa7H9gEfCLCZxCsg2Cnqu5VtGfl41OdwD4FWjK+tGT8BhXuUfgzrGSoXAK7yFisDOlPUJoDGJvM+KX7fCGG9R7dyqkZ6n0XNcD5ak44hTkRtE04HA6HY2SworVpO\/APqC7A1il5SrsmU6xycDmwLhyNVRGsZFgnYT464ynPGkKwUW+PqHKrKg2VKF0eKSTafAlULwDuwnx3zmbo31MDVrXwJIMyyWVBZSKW1JvJUWs4l8l2REo+EAXZqyJviOodQAuVO8\/GAPer8AXwq0C8nVF\/wEorR1EqF0w4LZi7wAdBVBmH3Sj\/Z6zMrdQu4sdjNDBToRGlUYSXsbmokRFmsAXlXMyJ8iqiDXwqFr33FGSp8wJwOByOM4ZQ4G0A\/gHYjjlrX4OJzqiTbIo9I98CloHuqJTTdrjfdcAFWAC7nD3SHjYm7C5gDapduFatI7jzJZ\/ePggCxqjKbOARrJx\/uMI4hvkxPYDK\/8ug6QClYNozPiJSr8hs0GKZ+BHXlctkOyIlm4qjIgWgKywbX0flBKgAE1DuU+Q6Ua2f1v5NpQ+R4xgEHhIIExRmqxmIXE\/lBHaRBiy7\/K8VHm\/O+BfPWehHcs+c87yP2Pk5GhtT8SDR95wXgBxKvbhycYfD4TijyKaaQLWAsE6E3wD\/CSSNTZ7YjU0\/6cFGUA3HtyYAtgGLgQyqa7OpeCX7kW3tV36BXfzsUdja4Wqk7M7uVU9fHwQFRmnA7dja53tE8z0JVvk4Vzy9LJHuKum6x\/OoEdErQH+ABa\/+4Lt2mWxH5KxqnawzMt0HgLcVOrE+07MrtDm1wPWimlKRzaK6FhdVrCqSad\/DTPJuB36EmZRUy4OpFrgG5WcCo6TAsy1t\/jcI+SXDyAx7eUSFUSjXYVHcG4g+6BlQdHfV4Rn\/ORwOh2PkkZ0fJ5H2c6q6BeRVYAkW3L0U6x8tvi7HSp3rMMFTM+jniZ5N\/UA3NpHjeYF3tDKO5oOJYWvOCyr0+TXAecBkEWlMpP3eapsqM7O9C1UBxFMVsqnJZVkX3\/qrrykUqAWZivAgVrk4JsKPqAUuArkZ5CtKNOkoke4CmAByF7Z2HccxkhlOZDtKgkBehW9QFgNXY6YEpTaeOM6mcBbQLKprUd2eaPN3VmKOnuNImtt8YjFEA8YCNyvMw3qhT9X4otQ0YOPDHgc8hIWqdDPEyH8y7QsBo8P3TGG9PFE78Su2+NkBHOyYH4\/kATrrVevrXn6vu34cDodjJJAdaGvLAblEursH2Al8ggnS4msMJrYvZ0B8X4aJ1eK\/ARMugo0wXQV0ilgf9srWpv5K72+4nWdh0zWU8ldyCbZuuEiVxvA4VTy5M2uhT+FQDqmt8TSQUWrHqBE0H54TBQbG0OaBfDYVrXFbrLE2FmhwqaAPINKMBSOiTDB42Hk8UQNtoAQBn3AscKMJee7F3OWPqaedyHaUhBWtTTrDxl19jI2RmIyN9apEi0IMi9rOReRj0OWYAHFUEBEkUMZg5dLzsTEM51V6u461qVj517XAk2rBorbmNt9Xj9zS1pMXnLPTviiMFRv18SjmRnkRpemPOwRsJaKHTDLjoz2W1Zj1qt\/vhLbD4XCMPLI2TrTAUYHiRLp7H\/bMWMWAqK4FzmUg230xJsDWCfq1IluBTarsi1qQDR0R0Fi4nT1Y5r7cjALG27ZUvlvrjmd9AkWkvm60mpv3zdj3eQkwBROmG4GvsPnqXwHdiXT3Xo4U3jmgkB3CSNpZ7V1eIdDzwuzvA+HnRt0WKFhAw0NonN7mH1gVYVLtjvYu8kqtqkzF1m\/Xc4LKSyeyHSUj0EJBiG0CVmI9F2dz8vPvomYUZqR1J0h3Iu13VcqUwwHNz\/oieUapcgOWzb2T0ojNKKnH+m7+AuFqhKdFeS+Z9vcA\/Z5HIKCL5v3hDb253UcC6jBjjFuBH2IGHRdRmvuwAgexPrme4b5ZMu2DUiMBl6PcXLufA8mM\/25M2OxB4fV5TnA7HA7HSCYUTnkGldiGJmJ7sJGWi0E8IBAJAgFFtQAEK6uqHDoogPSE232QyojseqAftJcqMMbNF6RWlQuwdrwfYi1qFzMw4lOx9c1cTKQW2802MiC614avTYl09yGOFN45kCCbmnzcbQjUm4CZIacwTdBA9BGIYgAJiVjAX\/1XX5DTWAx0YngcZ\/MdrbBOZDtKxqrUVOYsXNfTX\/A+AVmGRc2upjLnnWBZ0hbsJrGbiN2iHSePBDRgN\/kfAfdQGYOSoRDDPAYeEOUqzHNgOfC5BnyrwsGWjA9KDPBUEBRFOSvc3zuwMQ\/fwxxeS7XPATZCbwu2yBgyd6R9FDyB8SgPAH8M7Ed5taAsKQgfNy\/0d3U+Gk1JusPhcDiqg2yqCQZE12G35pYXvgJgyYOXV3oTj7HN8Vwi3b0HW+MdojIl4zlsbFrvULK+UZJo8xtUuQLzf7kfq0oYzZFJDeEPkxyjMBH5PQbOgQIDQZe1wJfA58BnoJtnZLr6VrZOOWItkEj7AjSqcjvwBHAbpQt8WIJBdQ8RV6yOPbtWgkAbRbheLDEU5zsSQ05kO0rK0kenaiLdtQ1YCnItlsk7l8pkLOuAK4EHQb5JpP0saE82NaXSh+mMYm7GrwuU7yn8FOtnuZDS34uifMgWXcG\/H277LcCnCm+hbAj\/vlYghiJYadZtWG\/bpdj5Xxvh9hyLHBaB7mKY5eKeByiNqtwsFhCZjD1sz8XGjr0gAZ3NGX9zZ2tFHWUdDofDUQaqUVwfgepORNZh5e8XUF5PIMWc24uzySvGnOd8rz8nl2EteY9iwvBk1x\/CscV3I3ZMbw\/3bw\/wPuiLqvLmjHT3eg2C3uxjU8LggtSEn3s\/tl4qZWVBAGxF+BY4FGUNQU2dVwvEUZIIN3EShm1OZDtKTjY1pTCt3V8jKotF9ftYyXhDhTZnDGbC5oNsxiJxJZ2l5xjgjhd8L+jjGuBnlE9g9wL7sQfLWKLLHtdgD5oLsLKhf4EZjW0B9qt93qUIZ2EPqmKPWzki6j3Yub1Obf+HtZ9iwYH7sb70mnAfLgHORrlahVsFMi0Z\/32Fgwja4UrIHQ6Hw1EZ9gm8q\/ARFhieSPmSOwG2FtjM8EajDZtcnvFYBd3dQBPRTG4ZvJ6pxTLe94F8D7heYQGe98GMTPcBTwItBIc9bRKUftJQDvOCWifQF5XGTqR9EZFzVbkDK6m\/gJM4n6q5\/9FxGrF6XjwHvAKyCCvhqVRpqWA32yRwO8i4GRm\/8q4UZwDJtC+xPi7DMtgPYyXipRbYeeAzIAO8TOkfeudipVXTsYjt+VhAqZ4BcVpqCsAGgfeBzSrD218JmIAyDXtQTxi0D8WM\/lWi\/Azl\/1TlvwduQBnd3O57yYxfht11OBwOh2OAcILMV8CLWDlzOXujD2Jl1BUX2apyFTAHyySXcjSqYMH4h7CS8KvCz4uJrYu+H\/59KdsCFTvmb6GyRZW8RLDimragC5BRqlyPtZxexkkeSyeyHWXDEz0oQjs2NqKS7t6C9aT8ALhSlbrQkt9RApILfOakfU9NVD+B9QWdT+nvP4o9XDPA\/yPKfwR+jfUSnc7u8r3AKoUPgQNLh2HwNyftxzAzlPuwKPixHpCCVYhcB\/wC5d+g3CvKRUCsxV1bDofD4SgzK1NNfSKswNYA5axa3ACyEmQLSKW9Sm4GbuI4c5wjxsMyvD\/AKt8mqhnlnYVVE5SyTFyx1rjngLeAg6qiURjyiYgXbv9DwIxT2Q9XLu4oCzPbuwEU0a9UeQqz7q9kU089VuK7FuRb0A1UwRzD04mb076paCXmmahuxUT2pZT+Zq\/ABuBp4HmUriBGDvjPErAdK1e\/htJGdiuBAtsQXgT8jtb4kKPozZaFvgQtVn0whhN\/bzVYIOVh4BqU5wUWquBj5jMOh8PhcJQNVXYD7ZgA\/OeY+W4p27YOAG+BrgDdW6kpNqErvIeVaV9K+fSeYG2AD6ryKfASJrLPo7R98b2YuP570O0IQRSju2bYOmisKvdgFQFncwrnjstkO8rCinlNAKiq1AaqAACAAElEQVTSj430egnrk60k47GI250g41w2O1rGAmPsxn4Jlr3+MVayVGqBHQDfAk8BzwJ+x\/x4rnNeHE\/ZK0Ib8A\/AGk6vfnwF9qrQrvCBytCFbWKJD9AgykystWIiJ\/e9eViU9wbg3yr8DcqPkhn\/8mTGb7xnoWvNcDgcDkd5yKaaEHS7oE+J6J8B\/w9W4bYPE2Y5oikj1\/D93gReEmFdNjX0IHcECJZVnkj0s6i\/Cw9b67VoQBzr2S5lFrsXq5D9O9BvQINsBBnsRPt6FKlT5HZsDTuJU9TNLpPtKBsr5jUxva07ALaL8CrWu9pM5c7DGiyj\/hBWQryc07uMuGwkF\/ig1CJchHAv8BMGTLNKSYAZj2WAf1TYmB8kpGs9NB+wHeFltbFaxTKmkR5wVCxb\/I4HaWBnMMTKjFltPrU7qcWc+JNYa8WpRqA9LM4yHbgUG93xYn+B95MZf6vGyHU+4ozRHA6Hw1Fa6uvzGgSyN5+PvaXWp\/17rL3pSuz5NoWBkZo1g356nFxwuYCNhV2BtaSt0kArnUSqAS7C1jjlRjAvmu+JyCS1isEaSjNKLQesA14AlmdT8b6o3jjIB554MknMmf17DCET70S2o6ysmt+kibR\/CPgU5Hksy3l1BTepEbgVeBhkQyLtVzr6OOKZbXOVa8RKh+\/FSsSvo\/Sl2XlsXMfvFf5alPUCwfJBJUOvPRoHKCQz\/rfAq5iBxTxMEI5UihH0T4HfqvKZJ+RjQ4zNex6Cci42BzKBLT6G+mCswUrVHsR6uhehvI6Z0blxXw6Hw+EoKR3huLFEujsPsh1YDrqKAYfsBmy9csWg1+VYAL6BY4vv4szovcB6oFMgHYr4fdn58Uq3H9ZimexSZpBPRAwYG3rx7Af6MEEc5TqwgI1J6wBeA90Z1RtPz6wX4DxRfQBzEx9ST7sT2Y6yk03Fg0Ta3wX6Nshy7EYwoUKbI3BYUHSBPJVI+zsq1UdzOlAzYH5xD\/A4ZrxR6hmVecxV8iWUf1RhXecJHnJ9+8nVjeZrEToxI4vv6jeuZvowU5eFAh0xj943hjE+S8IINFZlMonhl5rFsJK1O7CgxvVS4JVkxs8KfLukNe6qRxwOh8NRUrKpJrCgdJ5BQd5Euns\/sBML\/sYGvcZiZc+DxfcUoB7EB90IbET1PUTeAXZ6QmFFa1MVrB+lBrQx3N+A8lfrCdAIcnZ4nLYRvcjeA6wGXgO+yqbikbT\/zW73paA6WpVbgQewHvMhHT8nsh0VQvtB1gGLsZtWAssqVwIv3IZHsLLx1xNpvyeKno4zjTlpX1AuQLgHSGG9uaNK\/LEFLIO9CHga4eOlqe+OIofznNeJshZ7kJa7bykK+rDI+fPAS6pseWPe0AJESfMk8NQyz\/cCt2HfXVTBh1osm30Ryg3AIoVFybT\/gcL2IE\/uzSfcNedwOByO8pFNNSm2jjiiijGR7t6HtZ+9zRHiW8ZhArxXhF2q7Ec1ryKsbG2q9O6EaLHCbT\/WBtlQ5g3wgEZQwbLNG8PtaSSaNcVBbB72a6Afgh6MYqNnLOwin6cB9PuIPIC1OQ55behEtqMiZFNTNJHu2gOsBmnCIkVXUtn+7OuAh0A2gH7E6WWKVRYEzka4CysRvwnLEJcSc9OGJcACET7yTqIMeeXP4zS3+RCwCaEbu\/mPNJFd7EV6Eesx6+qYHx9OCbYHjBflNsx5\/9wSbXcdVoo3AcsMvC7QEYvxNc6F3OFwOBxVQCi+j856A+w18ai6srU6qx490d5AZbdta0VEdvHYbcME9pdYMmQ8w5+VXcBK9N\/AjJS3Z1NTIinP10Bq8eQSlLnALIZZZetEtqNimND2N9moA7kOG\/N0DpUr2x2DXVRfgmxPpP0N2ZPIiFaSWe3miL58XpzpbV2CzSRErDxIsxGMMDhZkhm\/EaUZKxEvx1zGIwQ28K4qBxadZKm\/gCL0YyM3DjCy+rL7gK+x0STPAWvx6B3qm82yLHY95o9wDzC1xNtf7Be7AxPcN4uQaUn7q1B2B0oBhc7HXWbb4XA4HNXBoJLzqhTXRWpryff1sw2btFJc35RzbV00g9sEuh\/kQ2yiy6UMb61VXPctspduBI0kIZZI+x4q5wAzsT7sSxlmQMCJbEelKWB9MEuwhf1oSl9efDwEM2K7D1gHsjeR9is25\/BEzG7vkkLg1QZKTGFUItM9AWUMUINqP7BDhL0z0n6fiBZWtE4p6fYkrUx8OvBzbKZyqW\/oCuzA2g0WAG8j7O04lajywNYVTTlK4XxZCvZh10wb8KrCeoG+jmH0YdcINapcJBZkmkZ5HEnDni0uAy5WuAXrrXpB4BM89s5t8wsAi8sYLHI4HA6HYyTT+VBcE23+JkQ+wnxnzqH03jiDyWNrtO0qFIC1onQA12BVq0MVr73AO1iL3BdAbzYV1fpWGrGK1rvC7Ry2FnEi21FRsqk40zPd+0E6RfVyrGx82NGjYVALXM\/hsV7yIVU21iuR9hvygVwETEK5DDOpuiTc9jwiiuouRT4DPlWVrxNpf5sG9Pb1FPT9n19Wis2KDfpZS2lNNhQrgVoGPAOsEthT753ayCrP3ihQC\/QM9V442FSkHAJ9C5DFstedClsV8p3D9A8QE7s3YAaAF5VpXwYzCrgKaze4EuFFUZYqrEfopcqzBg6Hw+FwVBPZ+fH9iXR3FjOfnQScR3me7cWRohuAnaKiKrIXdBGWTDsXM0M91W0JMJPXp0A\/AHqIaG2QSPs1WMD\/PiwoMSGKY+VEtqPirGpt0umZ9RtU5DlRvQKLuFXS7Xk0MAczQduYSPtbqqVsfEZm\/bmqejtWZnsbJrCLIybqKIpbEbAo4pfAmyCvi\/BhfWNsPyUQLH0HydeNYpV4\/F34R4nwOJbiOzyACexfiZBF2asQvPLoqQlN8VBV+tDDIzyGQj92nAvA2SXa56KQ\/wh4HXgFM\/zYL6DDFdjJtB9DiWNu4jcM41gMF8EWAS1AkwpXABmUz5oX+AeAoPMxl9F2OBwOh+NkqKvVr3M5eUYtiF0ug+ECsBHkXWAXwKrWyYVE2l8P8itMe87DWkRPVofmsTX508AbIPtAic6gWM7BkgwtWLIvkkTfSCiNdJwhTM+srxXVh4D\/hGWzyz1yYDDFiNl\/Ak0DByrpNj6z3ScIOAvkcezmdD0m6r7rGBWw\/pUVKE+BdgIHStGr3bzARzzGA0ngn2F9LVGLzhwmsP8vYKknJjQXtQ5tf5Jpfwzw\/wH+nKE9fIqC\/xUsCnoLdu6Ox7KzQx1XUXQ77cGy9s9hPUgfY6PKch0RnI\/NbT4CYxB+jn1n11DZ627w\/vcDX6D8BjNHW485iuoSVz7ucDgcDsd3MmuhX1MoyAzg32PrskZK+5zfCzwL+lfAJ+AF2dRkAKa3+TERuRib5pPC3LsbMVF79Fqx2MLXi619Mqr6O2DLqvnRtXHOzPi1qtKitha8iQjL6l0m21EVJNLdoJoHOoGFwL+gchk1sBtQHPgRyHrQ5dMWdPWvfqy0vc1\/cFza1yMoqjSKcJ8qf4GV25zssYlhUbkfIJwFckhFVsDQTbKOh8QAZR\/2Heaxm+NsouuxzwEfAn+jHkuCOg7W9sPrQ+xFTqb9Yk9wsdR+KNRhgrobSGMi9Vasr+cK7BwajZ1PMQbKygdHSYuCuviAOYiNvFgPfIXwPMpnIuwFepdE5GYaCuyacJvnYmPsqkFgEx6LeuA6hP8FmKl2X1iBsnXGP\/m9K3\/mhLbD4XA4HCeicCiXp6ZmJZ73H4CHsef9FQyI2yjpxdZpr8U81i6fd2QVqIgUMDO2Bdga5x5szTSZgZGhiq33DmGC\/Q3Mt2nVqvnxrVFs5Ix0NzWxAoXA81RlksJ8bC0Uad+6E9mOqiCbamJme7eqshd4SpUpWG9ElIPrT5U6LKr1BMgeET5JpNf1Z1OlNl42prX5oAGK1IFcDvwEdKhjzkZhpUJ\/IaqaSHevgqAnOsMI6GiNM+cZP5AYe8WyuwVMbCcZvtDOYSYX\/80TXkM52PnAsEWWYH03FzD0bHss\/P+vUWG1B1mUT9XKoC7CRPaU8N+cj\/UijcW+w\/ygY9SPma99i0Vsu4C16vG1CAc0QE\/J1O1kdl4QrBriUawyopJBreNuJmbC1hIez6sQXq+t511KEChyOBwOh+N0IvvkFcxI+4VwNO0ORT7F1mU3Axdj65HYoJ\/FhMCpoFhl37vA71BdHhT+8BmdTTWRSPsFYJuqvAb6npjgvwK4EJHRWNJDgW5BVyqySYVd+ZqGSGZhz8r4KEq+EBMdWAPdSwkmzDiR7agaVsxrYlZ7dz5QfOB32MV\/E5UzQRPsomsGNovIPvC6MGFUlg+3fmGdiEUeZzD0a1awjOodQB9oALI6kfYPRVkGv9RGLgXNC\/y9IiwLTasOYL0uQzGSUNte1gL\/oMLLi1vjByLaXA8z35jI0DO4HjaqbLIo5yxJxXcCO4GdybS\/BntYnBO+zgbGCnhq+1XLwLm9U8EXOIiCxtgnBXKd80rqbN+IBV7mYgGAasliH41gx\/gWoAm4wYvxakva75CArsWPxavKmNDhcDgcjmpCRBWkV1V8kA2gz2GJpAkMiNzia0r458cS34PXcDroZ3Gs1gvACkS2aaDHXL+Ea85g+gLfzNGEDcCbwDjQ0Vi75n6QHtCCCJqNMMkQqICoIHoWKnOAxyiRKZzryXZUHTPbu2OqXKrKj4BfYGUklRQAfVh28e9Bnwd2lGOsV6LNBxNCtyDyL4EHGXpZc5EAuxm+Avr3IO8D\/eHsx0hJtvngMRrlNuCnmNA+n5MPmiiWrfxCYIHC08T4tuPRaI59Mu3XAT\/E+rsvZOj3w93AS8D\/DXzQkYrnv+NzBaFWwBMhv3ie\/fs5NquapSXu\/Z+zwAfwPI9rgf8ReIDyz9AcDgWsnH4J8CrwtgZs6nRi2+FwOByOkyKR7oaBVrbYoF+PwtZERdF9efhzEpasAVsX92BVeF2YL01WhK9EOLBiXtMprdPC9a4hRGho9ofMzPgSqDRi5sF\/gWWxSzI62GWyHVWHiBZUZQvQgZlJ\/RDLBFaKemyu3z0g3aArsF6Rkh8KrIR3EtY3HEWgoZi9bQHZAbJLRNdRgux8x\/w4yYzfA7zHgHnF3eG+nMy95xDwOZBWoU0CNi+JTmATbsPFWDnycARmLeaG36hyuAz8+MfFAjR\/IAhLLa6LeB6eKudgDvozqayT\/1CIYaXjP8Qi7leKxxstaf8zlAPOFM3hcDgcjhMTJleC8JUr\/nki3X0Aq8j7nCNF+FismmwqluneC\/qViKxX5YAIB4HcinlNp74tZXpuz2rvIlDqBa5USzDMoIStck5kO6qO5Y\/GmbXQ7wsC+UKVRVgU7VYq2589DpgOdINsTKT9tdlUvBxl46MwURxlpjGGicsHQHcATyfS6zZlU1Mjz853tMZ1ztP+\/liMd1QO9yDfz3cHDYoCux14QQK+FS\/SQIBg4nISw78Pjsa+nzrR6harRbM3EW7DorfVXCZ+ImJY+f2tmJv7tYSzw5Nt\/g4g6HBi2+FwOByOUyKbaiqasR6x5kqku\/cDW4F3sDVUQUQLWrCycAWyZTYHPlUClRpVuRQzXLsLS+CVbN3mRLajKln+aFxntnfvVeVdYAVWMn4xlc24XYgJxC3AgkTa\/7YM87NHIzKR6Edh1WBZwB+pcghiC29\/pmvLW49PiVxoL30irsD+ljb\/HRX6sHvxA1g28lil432YydkLwMtizt35xUMc03UcioZaFzF8kSkUo8GKNj\/t0\/lE1Qq8OiwSncTMzkpSIlUmJNz+JuB8hRsROlBeAN5PLvB3iZB3mW2Hw+FwOIZHKL7zw36jCjG7vUsKgUzEKvjuxNYOJdXBIzGD4ThDWDGvKQD9BngdeBvYX+ltwvpSfgJyp4p3Vik\/SExS1zIwczlq6rCRBT8G7o\/F5IJEuqtk94Ql8+OHxOM9gb\/Bxjd8wx+WqReArzGB\/QKwdkkq3lcCoeRhmdDziSZ4UQOogEqV5rKn\/b0PVuI1HSuRKkULhgL7gF0coyS+RBRHsV0OpBD+LcJP8Pg+wtgwe+9wOBwOh+MMpRB4Y9TMlO8Fvk8ZkgxOZDuqmmwq3gv6Hia4vsCynJXmCmCeqN40PbO+cUZmfUk+RATEoziyoFQO67XYTOcfgdwJ3sQZme7SCe158fySVPxT4G+B32KGGblB\/2QDsFDgeVG+8oISCTXrnb6A4TmLF8ljffuCIFKld9XGcYwCrsJml19OadovDqmwBOFfA3+FXbO9DLiQlpLiSLbpwB8Df6q2r+c0L\/Bjs3\/rD+vNHQ6Hw+FwjDwSab9OLal0H2Z4NlwvnpOiSpeDDscA2VR8H+hrmJPwFso0QusE1GIX6aOiXIZSOzMT\/QJ+RWtcBdmLCZRSXqsN2Hikx4CbURpnZrpLffPpxkT2bwEfy3ruAl5AWIjwJR69ix+L3sX9zoyPWD\/2ZUTTj1Pcxn6FoGrLk4ULMbOz2zCPgai\/4xyw3oO0wO+B\/wr8B+B5YCP2HZdabBdLyK\/AHO3\/D+AvRLimpo6GlozLajscDofDcWYhlwAPYSNLL6RM7dJOZDtGBNlUfBtoGliJzV0uR2bseBQzZveCPgQ6UVW8We3dkX9QoNIDfIVlA0vJaGAa8EMVLgoQmV6iDD1ARypeEFgnym+x0vEvgRexUvIvFHqXRDgX8SiK39+VRCM2i+6bvVQ+AHRMkml\/NBZImYP5G5TiAbMTWKLKSlX2A1sUXlHhr7BgyqeUt4S8Hotc\/znC7SI0OIXtcDgcDseZwfS2LhJpfwzQgk0kaaKMJsrO+MwxIkjYyKWvgN9ghl23UNnz18McsucBvgiZ5fOaIhXCs9u7UA1ygcpbWnqRDVY+M1uRFaiuX5VqKllpfkubD0pBhW71+H9R1lJghcTYAAQd0ZqcHebOjI+aABuNRTOjGN3gYfMiezrK4zh\/0sx5xkc8BHNRvxcTnfUl+Khe4GOE54EtHa1xnZPxFdgvwjvAWpSVWHZ5OnAe5XnQFYC1wGcCPYtLF7hxOByOspNsP1xFJyrEUAqd89x9znFmMyOsLlUlBnIN8HNK1yZ3XJzIdowIsqk4ibSft\/5seQYTSJOorNt4DJii8COUzYm0vyybikeWqVMVAhXUSm3fxoILpUSAi0Q1oaqrprf5XatKVPpcLKluzvgByjbg6c4SlIYfC7Vy\/3OAc4nm\/OkDNlO+LO1JI4KIjRebiZmdTSjBx+SxANgbCp92tsZzAEsHAiWFOWl\/F9bu8Y7AAwKPYO7mE7HvoxQosBXl18Da4Mjef4fD4RiRJBeYgBAPCPBUGAtcIso4bPTlnkpvo8NRKaY\/04UGIEIdyBRMYN9ABcYAu3JxxwhCFXt4vAG8hpWNV5Kiq\/E0hX8GckMi7UcWuIp5AYgqaA\/wJvBtGfZnFPA9EZksUvogXGdrvPgql8AGu9Gei7mLRyGye4G9gDY\/Uz3mWsm0j3jUIXwPaMUqL6L+Totu4quBFQK7j\/WPlqbiLE3FAxF2IDyH8J+xEvJPsJnopeAgsFztfrFHtaItJg6HwzFskm2+INQijAYuUGhG+VOU\/wnlPwDzku1+KaqVHI4RQaxGQoHNZKza9CGiqVo8ZVwm2zFiyKamFLPZ60EymHFVkspmswXLFCaAb0AOJtL+2mwqPuys2dJHp5JId6mKt1+UdzCx8AhW1l0qajDxOQXkfUw8njaEpeKNqkwiOnfJXmC\/gHo1CJX1CwBMYGOVFucDd2FZ7FI8ZA4BHwGdwLpaOXG2uLM1HjS3+7tQspiT\/BeY2+csrIQ8qms5h\/X5LxRhkyqFzmo1pHM4HI7jcOtfW+B23NkWBFdhInAxcJXauuN6rLLvHOAAyvowsPhNpbfd4Sg3szJdBEoNcL4idwLzsYq5iuAy2Y4RRTYVB+gF\/Qh4GsuEBRXeLA8TM\/cAPwC5OJH2Ixm5lU1NASSnQhfwClY2fpDSCTkPGAMyMSxGO21ItvlogKgyEbia6By2DwrsAHqrZUa26uHgzwzM7KMxon0dTICVyS8F3kHY8\/pJ9AJ2zotrR2u8NwdfB0KbCv875gK+CNjG8M3j8uF2LQJWADknsB0Ox0gjmfFlzDnExpzNaBW+p8KjwJ8D\/yvwH4EfY2WwF2NB1NHA5QI3t2T8spfGOhyVJl8QT5GzFUkAD2CTRiq2lnWZbMeII5uKayLdvRtYgkVvf06FLySsr3QKJrQ3A68l2vwd6nm6qnXysN5YRdQLgrAkV87GjKtuxh6oUROWwOsoAW9mxpcVp5dZVC3K+QgXEV0v8F5MHJbDnO47CbPYDZjJx13YbOxSsA94G2EZsBkhfyr\/8\/JUXIGeZNr\/GNiE9RLeA9yBVakMJTAwuHx9MVa+fjqdvw6H4zRmbsYnUGLAGJSJAlMQbsOe+VMwQX0Wx16\/1wOXoFwFvIXdVx2OM4JE2kfFG4fqLVjV562UzvPlpHAi2zEiyaaaCjMy3d+q8gZwKZaVvJDKlo6Pwkq37gfZhpAF9g\/3TVfPm0Qi7Rc8YbMqr6oFE2qBG4m+BFixTOIBEVVOP4FSh5UOjSe6c2UPsEOEXqrjeBUrK5KYk\/eoEnxGAKwHOgQ+VTjUMW9o2eKOVFyTaX8nsEJho5gb+APYPO9TLenvA9YBS1E+7dlL7+p\/7rLYDoejekku8AXP3MHV\/EKuBq4FbsKEwkWYgK7H2oCOh4e1e12ucHEy7W\/viKB1zeEYITSI6rVY9d50ol3nDQknsh0jmbwIX6vyOhAHZmMlspW6qIrzl2djmc2tAmtmtnf3r5jXNKw3DsvkC3c82\/1tviAvqmoMe9heR7RCOwD2CGwFcitKNEqrQhSN3SYSXak4wC6sXLxaFjPjsADMXErjwK9YhngFsAJllyfDa9noSMUDYP+cjL8G2CjKuxxuv+AqrGrjZCpVtgFZLMO+xwlsh8NRzbSk\/Xq1YOJ44HpVZgPfx9Y0E7Hn+6ncw8dh98zLgK9mv+zvWfYDdx90nN7Mbu+SfCCXAfcDc7BEQ6VbHvudyHaMWFa2NjGrvbsngHdDoX0JNge4kr1Igl3cjwDbBN0NbGx+3i90PjT8B92bjzQFwLeJjL8QldpwX6Pc5zwmoLaHvz59sGXKGOz7GUM04jMvJux2ySmWS5eCO572BZiKCexSzMRWzOzsk9Al3NeAYElEwZilrfECsDuZ8d9B+RpYhTmDNmMBg1Ec\/3s7iHk0vAl0UYUj1RwOx5nLrJd9Yr0IikqeBvFoUmvruQ5oFuUKTHCPwpJgQ3lG1WDVfZcDq2oOsp\/h+1w4HFVLIt0lBZXzgDvD12QqXCaOXXObnMh2jGiWz2vSWe3dOwJYrMplmEPxBVQ2giVY6fofA5tVea6vn12JtK9hRnrYZFvjW2ak\/ecVmYBl+ZqI5qZyCOhWpVuD006kCFaKNxmreIiCg5jIPgDooiGWTEeFF+McrExqOuZXEPV1UAA2qvAG8GHnvHhfKfajozUeJNP+LlVWiLAF+BqLUN+ALUKP3i8FujGfhg+A\/R2p08pLwOFwjGCSad\/jII0qNEjAZXgksD7ry7Hy8KLHShTB34nA94DzUTbPecYvLH3cZbMdMDPjiyK1QC7maX1QYLwqdRpOSQF6s\/NH2rNTGlWlBXgYuJJTr\/4oBbuAZU5kO0Y8y+c1FWYt9NcVCvIcZgySpDRuyqeCAJeq8pfAPpDXVHU\/0fbsbgAymJh6hOGXx+SxWdxvI2zQ4LSLfgtmGhMnuvNjP7BNhJ5K7xyACDdjkdwplKai4wDwvgevUuLxbh2puM7+rd9TU8engI+NCkthpWCTsCx98TvswZz3V6BsVq18VYHD4ThzSWZ8Ag8oUCPWRhYHrhDlDoQbsD7rCZRGENRhAcmpwOeeR\/\/cBb4ufswJ7TOVGZkuRLzGIJBLRfQSVbkhX+ASIIZwCNiB6kYRPpvV7vs1MT1YX6fBaz+YWulNPy6JNh+gDuRm4KfYOT+aygvsg1iw\/\/dOZDtOC5Y\/Gs\/Nau9+qxDwayybfQPRl8qeKoL1Rf0C2CWiyxPprj4byzV8VqbihRkZ\/0tVeQbLZCcZnsnVDmAZaCdwcNXpF\/kWrMphItH5UezFSusrbnqWTPsXAHdj2ZFSeBPksdnTrwNrpAztBMuejIP5BOxPpv2OoMBKL8a9wI8wQ6ALsAqO4oi7rxD63Mguh8NRCe5s96UQUIvSIAFjxAwcb8f6pK\/DSrk9TmxgNlwEC0ROQ1gqOnwDVsfIJZHuElWZpMocIKnK7aAXYGuWIPyZR6RXYX0hIFtQea0\/z0czM\/5eQKvNn+fmX69DVWpFmAr8DAu+11J5ga1Y5d3vQbNOZDtOG3J4vSL6GnCOqP4bTOCW8kF2MtRiYuDH4O1WkY+J0CDLE8kpfBQoT2OC44Yh7HOAGZ0tBhYGBb5Y\/fhIKxc6MYPGWp1PdJHOPFYqvkeEoFKl4nOe9vFi1AnMVJiFlcRHXSYehPu6GGGpQn9UfdgnS+hC3oeJ\/C6sfPxeLMDUASwD9nVE1JJxqsyxc0yWpuI6I+3jgcSg1rPrMdeRiufnPu+DIhLgEQBCodItBg6HY+g023WPZ8+U0UHABZjAvUaUuVg5eHGiRTn7RGuAaZhXzdbFj8VPt8o0xwmYkbHzUlVimFP9nwBJ0CZObJZ7EXA5ylUKbWrP292V3p\/BTM+sB6hFdTIwHysTr4a58AE2Nu81lKUo25zIdpw2rJ43iemZ9YeA11Rkqqj+FMtqV7psfBxm3LRL4G+BL6J68+Xzmkikuw+CvgY0gvx3WKnwyZagFbAS8eeA51B9f\/Xj8dOtF5vwWIzFRHZUI636gI0KOws6PHftoZJs81GbqTpJzYn7SkrzsMlhPc+fANs6KhTV7hiYrf0p1vP0KdZjvxLYEbqUl4w57T6iIAHSMT+uc9K+CDSG5aB1CkEy409AuQCrpClm+zWZ9r2gnzxwSOCgWHBm+53tfh67DoPiz0XzSrsfDodjeDz8Dz4HxiAFu+4bVLkS4UYsW30DZjxZNNisRLDfw7Lmtyt8jDM\/O2OY3d5FoIjaOvBq4F9iQelz+O51YS2WsEkC40EKoK8m0v6BqDyFhsOsjE+gWgNcorZPKdvOiqPAPmwt8nsR7Vo5P15wIttxuhEA20T1BSyC+wPMKKmSxLCb1j0oO2Zk1v8yCHTzqvlNkbx5NtWkM9L+boSMwmaUH2HGV8V+rxqOfMhbaZCZnH0FtAOvqsjaVammQxU+VqXkbOyciKoHbh9WPr01qECpeMsCHwVPhHMQ5gIzic41\/Wg8LEN+I8qG5oy\/RmHv0tbKVDx0pOKF2U\/7G4CNeMR0HIXaA6X9DpJpXwioQxiFUJ9M+2dho9Imh8fmAjGjobEcWbZWj1VPKNZesEett32\/BuzAqkgOv0TYOrfd3xko\/R2tbsatw1ENhNVQdKTizEn7sT0wXizrN1VgOsJNmKi9kMqOEh1MI5BQ89D4utIb4ygPBfUEdIwq38d6le\/j5AR2kWJS4jYgBhIAryXS\/sFKC+2C4mGVIXOAecAVFd2gAQ4BH4JmgM9ra7QXquMm4HBEyvTMehHVs7Ds8Z9hJbRRzpIeKr3AZ8A\/qZLRQLdFXZY9PbO+XlSnhvt8O5bVvgDLpoNlJPdjC\/r3gFcFvkTYQaD9K0\/DXtZwcRQDWoD\/it2Uo8gsfA78H8DzHan4nnLvV0vaFzVRfRvw58APia7X\/GgUO383Au8ALyl05mHr8tPYxTs8dzyEMSiXYEZCUzFxfS12\/IuvRuy8skJwC0wUn7GDj9Hg524OK8XbiVW67AR2KmzGFsU+Vn62A3NMd6Lb4SgzLWlfAAk8YqKci3ITlq2+noE+6xgWXKv0bN7B9APvKfwXhN93uqDdaU8ivd4DHYedm\/MxU9yJDP287MXGYv7HINC3UAqrK+TXc8ezvuQLco4qSeAn2Dp33DDfNgrywFrgH0R4StBdK1qtGs1lsh2nHVIoWNmGJ6tALsYcpa+i8g+\/BmysxnwRdktMXkuk\/V3ZCEVKjKAP4csgYAtWtnIuMA5hPEgDJgD2KvIlQdAlQh9CXkR0xWkosAdRhwUcJhJd6d5urE+5IgsXtQXdJCyYdBOlvZ8LVmZ\/GZapuVbg9lp4MZnx31Nhb+e800dsJxf4gkcDVgVzGcos7BhPwTLX4xg4j4QjhfOx7jPHC2jXYi0t58FhJa6YW\/oWrET\/Syw491lL2l8nws66GL2vPHL6HG+Ho9q4Y4GPCOIJDWrlqBMl4CZgLtaWcwlWHVUNZkvHowa4WOB6gdVzM\/6mxRWqPnKUnkTaF9CzsGdVCqvkPH+Yb1uPCfYHPZFvAtWNldi3aU\/75POMUbgFCxzcRnSjWIdDgAXFXxT09yi7ausG2gedyHacdmQfm0Ii3RUAO0AXg8SxUpnh3myioHjDasUyyssTaX9PVEI7dIAsYP2quwASbb6nQr2gtR70rWi12caJBV2goAorq6DXpoQIlmm8lGj7lbdjmceyi+zkAt9DORvhFuAOrGyxHBSP5fWY2LwO5TVgcXPaXytwEEEr1bM9VIqloHrkuXIt1peWwI7vGI4cG1YqBCsvn4qN\/ZkG7AE2KKxR5YPePJ8mM363wjaBQx1u4exwDJu72n0CRQLFQxmrwmQsQH8jljW7AqtYqafypqonotgS1hO+GgMLFGymwlMwHKXhlqd8VGWsWNvCfOAeLCA+XAQ7d25A+J4XYxtWIVFWJCYNatUj84AZWICr0sEtxZ7NS4BMrIbuZY8c6afiRLbjtCSbmsKMtJ9H6AJ9WlXOBh7E+pQrzRisZ3o3yD7g3UR6\/cFsanJJHn7Z+fEA6xc5ot86+1g0o8RGCOMwoRTlwmgrFsgov6GMRz224JuDZVXK6Vpb5CxMAF4kylTgReBtlJ3JjF8YKUK7Je0XxXW9WKZ6Rvi6DRO5lWw18TDBPRpbMF2DLfbXonwowipV3p+T9rctTTn3YIdjqCTTfk0+YKzYs2IqQkJMXF+OTTAold9F1PRhAWAf+BLlbYSV4e+doeJpSCLtg9KIcCvwOHAntt6JqnqzFnsWXg3yAbb2KRszM35NoHI1aCsW+D6f6ghyHQDeBjKga5Y98ofPYCeyHactK1NxEumufpA1QBrrTZ6FLVgriWBl3ElMpO0BXUMFooNnAiqI6OFKhqjueQWsP3kvZRbZc9t8T+FCNaOzaVQucHR0CfmNQBrhZRXWz8n4vUCwtIrFdvNCXwhoQDkXuzfci5WjTQr3rZoW1R4mAMZiVQS3oTwg8JnAymTafwfha4W9quSXnt7VKQ7HkJmb8QkGejPqRDkPu49dE5aj3syAl0k5qleGS2\/42gK8D3wAfIawRj02S0BOFK3UeENH6Xioo4ttO6hHJAH8GGsfu5BoRWgMy2ZPBsYl0v62KNscT0SirctTlcmgD2HBg4upTFLhaPqxPuznMH+j3mP9IyeyHac12dQUEumvDkHt28BCTJBcT+WN0Dysp+sBrLd3byLtbwi0kF89\/7IKb9rphSc0qDIZWzRF9eDZjy1oesu9cAks43ozlsW+lMrfx2PYYvRm4GqUe1GeEegU2JRM+70dVWiO1tzuxyRgoirXYb1rSWwRMZrK+zecCMHaHiaGr8uxHrwPUJYJZIG1ybR\/qBqPu8NRSZrbfVGlAVsDnB86g9+IVQRdhQmUGqpfWIOVgn+DmSR+DKwC1gHbBfZ5kFt0GnllOP6QHTukHuQ24OfYmmAipVkT1GFCuxEbG5of3tudLHKewkNYj\/lUqkNgF7Dr7HmgA9h5vKBDpRdnDkfJyaYuJ5Hu3gW8gQmtc7Dyr0qf\/x520\/gZsEeQTI0X2z6nvStYOu+MKuUuKaKMUyutHo7D5tHsxUqmylp90PyML2pC8B7M1Taqmd9R4GEllTPEqgauBV5G+CCZ8XcrBJ1VktVOZvw6Ai7DhPUDmBP\/aKqjBO1UacDuIxeF+\/GZ2MieN5JpfwPQL0ogCosfq47j73CUm6RVrYxWZZJa1voGrHqlCVsTjKa6TczAyr1z2CL\/Y+At4EPgY5SvEA6F\/yZY4rLWpz23\/67LC5TrEP4Em55yDqV7htVgz5pRICUNQt+xcB39+RoBxiF6J\/AjqkdgK5ZgeQN4GdigqscNOFRaZDgcZSGbatIZme5NqryIZf8epTqMEwS7efwrFT2o8Gyfyr7pGV9XVYkgGemokEepJ9rsxE6s762spmcSowa4CysVP5fqzLjWA1djGaErgN8rLMrD+mlpv7C6gou\/ZNoX9WggYBrm0dCCZYLrK33QhkmMgVFil2A95Q8Dv8ci7d2B0JNs84OO03uKgMNxmOZnfM+L0YDQoAWuAqaLTfi4EXvuNmD30Gq8jw4mjwV2NwLfoPwe4RNgC8p2VQ4B2umu7TOGRJsvwPmI\/Bibg30WpT2PPaAAkkNK2yKnKniio9VMR38KfJ\/q0av7sck9vxdYi2jfiWaHV8tGOxzlIC\/Cl6r8DhuZcw+VLxsvMgWVP1ORAzHRl3N9QU+lN+h0ILnQR+2muAzLrM7FelqHI7YDLJK5p6NMZlNzMz4aICiXqdCK9QxXc9bVw4JY96DcIjCnFp6thfeaF\/obOh8t77zW5owPIApnScC9WGT8ZqId6VYt1GBlfTOwgOKNKryMskKVrTh3YcdpSEubTQjYdhOM3oQ0buEChIuBy9VG8E3DMn0Tsed+pQPsJ6LoDg7mCP4x8KEK71FgtQi7sOdQ3gXNziwS6S7CqZGjsfLweyiPL0sB8w\/al001lWTdk7BrWPKB1GOVJr\/AhHa1aNVe4B3gGVXeq4kFPcu+o+q0Wjbc4Sg5K1ubmJ5Z34fwIdAmqhdjF3I1lKB4wNWi+otAOejVeJ1z2rsOubLx4RF44OXJCbyn8I\/Y06kF6yEeKr1YRqF3GO9x0sx5xqdQQDyPczBjk+sYOZlXDwtozcOi0a9LgZebM\/4nHuxa0lr6IMWctI9YD9mFKjyMtWdczshxCx4qDVhZ7CXAjQgLRXiuJeP7Aj1uXq5jpNPc7tsYSpBAiQl4573PeSpMR7geuFHtflkcZVTtATUFDmJVUiauhRUon4uwEdgBBCg4cX1GU4e5fd+FtTuUmgBLVmzGHLVLgiIiaCOq1yHyM6ydq1pa4nLAFwrtIFnQfcvmTfnOZ6gT2Y4zilWtk3V6Zv1+UV0MOgrkL7HS1kpfC4LN37wV+JkIe\/Mqb1OBGcynE0sfjgMELW3+HoQVWOm4YC6VjQxNZB0ENlEmke15iMI4VWYiPMjIFIc1WOn4WcBUUV5T62nqKvUHi332JGC+KD\/FFifV3nsZFR52nl+HBRbmovxjAEvnZvxNnpB\/Y55brDtGHsl2H8LzW5RzFC5VuBlhNgMeBRMrvZ0nSR4TMWuBT8PXuwifAX149C6ZF3fjtxyE\/dDjsLaHayhPkqiArXnWYeufyJluWewGRK7BxpDdj1VkVQPFaTIvAK+p6s7V85tOKkhdaWHhcJSdVa2TNZH2d2ED5C\/Bej6aqHyU28NuKrOAfQo909rXfbx63lQ3\/3aYLJkf15Z2fz8FVqgcnhl+Lyb6TlVs7cPKxftKvd0tbT4q1Is5396Plf9We\/\/g8ajFxm+cje3Pbcm0\/yLCikIdO958MNrMapjlqhGlCSsP\/ylmGjdSj99wKAbxble7x8QD5SVVvryr3T\/4xgkciJNth8VMDbbYCDrmuyy4o3I0t\/lCwCiEy1FuA74vVg5+BVblU0vln+cny37gXWAR8BE2z\/rbHti\/2lWbOI5G8RA5GzvXzyvTpx4CvlBhTfjryBGRemxdkMLMSCdSHYFwBfYAHaALRdm4av7JV+A5ke04I8mm4kEi7W\/GIlPnAPOxG1alF+AednO5S1UOehr71YzM+jUrWye7GdrDZIkJiZ7mhf4qKdCDjT\/5AeaEfSo38z3ANsrjLF6DOeLPxHpsx5TgM4oLuXI80Ipi70osYHA9ymuxPl5LZvxPPdgbQNAxTNO\/u9t98kqtKlOBViwyfqYK7MHUY2OKnsDO+0ygvHVXu99zgoy2h52DkzHzpV3JNr8fy74dfnXMd5k2R5lQPCxTfR92bQ82MRtpHATWoLyB8LkovUvcteQ4PkXPjQsxR\/xSU\/SgeQu0ixKM7pqR8YvP6oew5MdFVMe1rFh5fBZ4pibG5yKntv9OZDvOYDQH8hXmwHsB1t9SDgOJ7yKG3WR+CPSq6u8Saf+LbCruhHYEqJD3YI3CL7EHxg+wB9bJZD4U65fbQYlL+af\/0keFsZgT7hwsCxy1EFYs2NCFPUyvoDw9UIItEL6HZbanorwSwHKEjc0L\/Vzno0MT2sk2n3xALTAFeAQT2XGq46FdDdRhpePjFARljwofw3EcY4UYkEB5MvyTXdiia\/Og15Zkm783fI8CYqZMQH9HygkGR7SIECD0MXAfGUV1ZL2GwlnARQijVMi768VxQgTBgu1nUXoNV8ASCh3Am6IcON486KEyq70rVghkMpa9fhDzEakGnyTFsvYfAM+o6NvLHo2fcoDBiWzHGUs2NYVEet0hiL0PPIcJ7dupDsfxGJbp+wFwACSfSPtfO6E9fJY+EqelzT8k5tZaFNb3YYGN7xLa\/cA3mMiOPKI7mIZG6jChOBszDWsswcccAt4T+Ae14MHdmAN7MTNU6oVrHdYvfQ6W3Z4EtGO9X0MNYtSqXTv3YSL7ivBzHAMIJkxGhSumYy6ckmkfLPt9C0ILtrjrw1om9gB7UfaEv94ObEXCP7cevk3JtL8Pu24Gv3IdES\/WHNVB8zO+4CF4aGdrXGelfak1HwwBFCHoGO4YP0ERdqN8BXyLBSBHihnk0dQDl6lwDfB5S8bftcSViTuOgyoFERTTb6UMHBewgOoyoB30q6gFNkAh8C7CBPbDWPC3Wp7VvcDnQBroJBia4ZsT2Y4zmmxqKjPS3XuBpWoL\/bMxM4lq6OeqwaJ6D2ElZc8l0v43QCFbwVnDpwNL5sdpftbvkYC3JaBf7Yb6CNajfzxhWezNWUvR5bWEiMe5WNBnGlbaG\/U5mceE0CtYpHqXwjdiAvdebMTVuSX43KPxsLFqk4FLUBoJhibuk2nfC7f5Duy6uZqRu\/guJQE26\/0LYCvHP5cFM9kZHICqx1paJh7+F8ZBTHz3MTCC6ACW6f5m0Gs9sC2Z9nuwQEoeE969QN6J7+on2e4LSm3o2p9TGKXCWaLUUTwjFC+Z9j2F+rAaIo+dH4eSaX9wq0GOU\/zeO1Jxmtv9Q6Ksw+5X18Cgzx5ZeMBkUa4VEzR7oLRziB0jFw00JzE5RGnPkTz2XFgK\/Ab0bSLsxU5Y8BaUc7C1RgqraquWipQc5o2wEDM626GqQ3ouOZHtOONZmWrS6Zn121F9QazX5edUhxEa2IL2GmAeyD6stH07btbtsOl8JA7Q15Lx3xPYq8p+rDc\/zrHvjQGWofsWOFRKMdDS5terfe9zsOhuKYTiXuBtoENhWyDksADCVlE+AR7FzNYupvRu3Ap8itCJCbFTrhKY\/ZQPyjiE27Cys+uo\/PgPZeC4FbBzSDj2vaWci4tDmDj5Ati\/6Pj92IK10FzAd98PR\/OHPYIBFujoPeq1B3Nr3RT++ttwe3Yk0\/7B8N8cKv4sltDOSPs0eGavC+gi54weKcni4ldsqHwQQwioFaUWoV+FRgm4SALOURgTmuidB5wvyjgGDMfOJgzQiQVaio7ENdg1sRULtqzHrvcNybR\/UKBPoV+VnFrLgS49TkBZlEL4\/36GzdIdT3U8s4fCGOA6tWBWdzLtF4ad7Xeclqx+fIom0t07gd0MBDSjfHYUnbQXA0+Bvg8cjCqxM21hFxTEA0Yj3MXAWNJKP6uLBNh95VXgFRU2CJJfNcSReU5kOxzAqtbJQaLN34KwAORszI24GozQwMp2bwT+COhR5bVpC\/w9oMHqx0bmHO3m533pz1GjKgFQCPJaF6uh3hMKIvTGYhp0PlyefVvSGs8nM\/5XAr9UW9g\/wbHLlgrYg62k\/dh3\/M4H4QJsRuRNWO9V1OdhHliL8jombvLhYjafzPg7gZVqi9dFwBNii9jzKV22aDewRJR3RNgT9vSeEjV11GKmXg9hDv1DcY6PggDrc+\/DjnMfds5sD38\/FquYOIidU6OwRXbxVQ6hsA8zW\/qaE4+iEyxjfS5DOwc97P51dAtOAWuByGFtEMW1yDbMH2Ad8HX4c11Yct6rgAYUAuGACPvvbPeL2Rwd9MKJ7xNzxws+Nf0IiqogotSoUIdSi52jDcBFUjhsrjRelKkoF2LiehxW+XU+FoQp3g9HMxCQK4Q\/jz5v+rHr49CgnweBDWqjqz4W4UuBDeGfH\/Ne0NEaZ27G3xMoH2PBmkmMXJHtYcGo7wMfBHXlGQ\/pGKnoJpDPsUD5OUR33isW+HoZkTTwfiBejxdE1xknhcMjyKYDv8DWONUisMGe0x0iZBTWgvRnU5OH\/GZOZDscIdn58UIi7a8HfoctHB4Kf1ZD+UoDcBsQE6EfWAKyJ5Hu0myq+oX29DYftaWS53mM7euXKdixnQpM8WqkX2FvoGwEPtCCdN3\/+rrCS3dPLcv2dbTGC3Mz\/npVFmAPmif4w17eAlZiu4sSlmqJUKPKjWGU92JKc5\/ejJUmrgL2Dh7JFDp75+ek\/R0ivAZ0odyN+QNcT2kyRm8Bryt8i5KPneIVl7RxXeeg3ENlBHYBO2+2YdUA3cAWFbrE+kZ7BGIIvSrsRDmAci72\/V6KCYRJWHDnckyI12GCxSvBvuwA1iBs4cRVA4IJqbOJNtAT49jOuBeEnzc9\/H3xvOwG1omdt7uAbRqwWS04sxvLhu8RYY8Ih+5q9wNVCBTCIr8A0I4hZiNGMs0ZXwDtbI2TTPujBEZpHzUKHkIjyvnAhShnAWMELlNlilr1zBgswDJe7fsqZs3q+O770vHuEXXha\/ygP1NMYE7HFvmfAssF3kum\/W+xMVd6dHa31iPfX2CNwlfADdg2l\/K6DzDhrxwZHIqCCdgEid97OfZS4nYkx8ilkOdgrIblDIz1jOJ5rFiAcyGwUAg+ETiUjTBgOf2ZbsSebbcBf4a1wpXCa2aoHMDWRc9poJ8DvRob3mPPiWyH40gKKGsQfoNlcJopzdikoVAD3Ar8ZSi0O1W9A9PbunXV\/KZKb9txSaS7AARPGoDrQgOlacC1DCzeDwH9Cj0o2wrKRzv31vxu+jP+B6rah8LqH5U2mNBQQ9CTZz0mtPNY28DlDDzA8liUczclMD2bu8BHBVG4EGEeVi5eChO+AvCOwCKEjRwnYLA0FWdOu58T5Ytwv7\/GDEpasP7pKBazAZaFeh6PD4C+JUN5qCs1KDOwQEA5M1p5LJuwHQsUrALWImzSGOuBXslRozJwjEXRJSZ49mCLmmK2z8PEx9VYP3zxGmki2qkHxXK4zwp2Lp+o7cHDAgGlqKY4HnKMX0\/B2jiAw8K5Dysz\/xb4VuBbVTaqsg1hD8pBtazpXiz40Zts84sl+wHmgq5gPb4ALW1+8fN0yQgS5C1pn0KNGYstfSTOnIV+nVfgHKAOBYFzkmn\/EuCcsMTbHK2VyzHzu1rCYEr46zx2DcUoz\/deHO3XiJ1vCeDnCisxU9IVHqy791l\/ryfoyw\/bd\/Pqo3HmPO1v9mpYht2bSkHx2t2FVfd8iT23ZmFBoaiowfpSv6d51s952mfpEyPnHHSUl0JeP4vVyEIsEzzcdUIeC2Q+BbwA+qUqvSsjbFm4Ld0FomNRuRWryryL6vJLyWPz6tuA1Yjsy6aahv2mTmQ7HIMIChAK2I\/EhPY4bLFbLTcDD7gR5F8BCroUi\/JXJYl0N9ixO1+EexgwuDiHI+8\/4wb9+grgJkGvJMY\/CfJSuI8l7UN\/6eE4ybRfADaIkFYlAP4Zlm2PYRmMzUBf1P1yybRPYAvNs7A+7LspncBeCyxW+MwL6F382PH3ZakJ3sIdaX+bwKsifCbKu9h4uRuxloqhClrFRN4iFZZ1zov3DeVNWtp8j4ApKoerD8ox\/qPYn\/8l9mBeIvCewj4CDnY8dsSoj2MGZMI+48PZqrAf9hDCu+G83DdVuRq7\/zRj\/ZrjGF5pXfGYfwpsfDMVP25FRjLtF8cjXVKmY\/pdHB3UacCuzakc1t0osA\/lW6zv92D42h3+3l4WXPoK2NuRimtLmw\/mSn82QkFgfzLti0KjKPWAinAgUA6i1IiEzuz2b\/eh9AP1IjSGIrUfZa8W8LwY9XjUq21dX8yjB4gFSoNCDXaf6YvVkFOlRgPqwp0pcIwRaC1h37Sah3c9yniUcV6BAsq5LWn\/Ki1wXvjdnQdcqCYGi\/fYs7DsdB1W5n0sIV0Na8MaTGw3ATMDeKE\/T0f4HR4+b70YoHyI8AkWAIyConHfTixA8wWW4fos\/P3U8BieT3SZc8HE+3Q8ltUoe0t6dB0jlphdnXngZexc\/AV27pwqxTnQn6jIP4nqEtBvQfuirJCcvdAnCGgIVG4HfoqZnVXLmhrsfvIlVsW6MgiCvVG1YlbDjdThqBpWPx5nelu3ep7sA1aq6jnY4uQ6qqffqwG4BfiFiPSBrkik\/Z5qcxyfkfFFlQZM+KQwU7FL+e4RDcWsxjSQsGRWFyXS3VuyqaaSltB1pOK0LPTzQcBGERag9GAPsKsxob8Vy45FStgXOQoLQDyKBSFKUfa4H3gTZSWwa\/FjJ2fe9qadW7kZi\/x1dXvZKAFvYZmjuVjGfTynnvHqxR5sizwrET0lmtt9JICwP\/Q+bEE+tgTH7GjyWCZ4EbBErSrgW4bpjH04m5rx89gCex\/CGpQXsOzePZiIuAlb3A\/FibWAbetnKuw+iX9vGc\/qufcdDxn0c3z4uhYbGQUDQZFdWKn8F8BvgSxwSAUPE6IPAFeE2V4V2I8cHt3SKEIDQm\/4Xv1i53wNQj3WM34o\/CxFiEkNnkJfKMJzQKEQoAy0ABSwjHxvIY9i32lN+Gc7gS9mP+9\/s+yhI84rARpE+R7KDxXOUpiIchkwQcO\/xxaxRTOygGO3HVRD8ORE1DIw4u9ihcliI\/6+HHQ0Auy+vAybxjDUe0Cxp78fM376GPgEeCf8uRfhkFi1W7\/an13P0MTN8RgNfF+Ea1FW4QxOHccgm4qTSPsB6FaQf8TuI09iAdGTxQKS0Kki\/w1YrSI9olqIugUxX\/AagFtBH8PWDGdV+hgOIjR602dAXgO2r35sSmTrTCeyHY6jCEuvg0Ta3w7yBrbgGs1ARrPSFMfqzMaMY3qwsrqqeiCrSi2WhXgQE9lNnPzxE6xM\/xagEeQcYOG0BV0bVz82paTjTZY8atnbO9v9TYHSrnZ8H8eCA9uI2PQsmfHBFuoXoTRjfXmlENh9wKcCixT8oHDq+7HyzjjJjN8PrMGyg19gUenZnFqZdg4zNuoA3qmRIYwHscm79Sjfx86xc0t03IoU+zHXYLMzOxC+DpSDb0boNL+kdaAqGtCWNr8f2KBCO7bwT2DVDreF+3wq9GKVDGtEv\/OYFysrKmUgFwXF7S46Xp+N3YcasCxQMOjvL8F8OKZja6PBFQiiJlILhGI5fO+a8P\/NYddXIfx9PXa\/OIjdPwJMMI4O\/589mCAvBhTHhZ+3K3wfCf9NpjbP3zHgzh1WfzMGE3gp7LqrCd+\/KBSPDnhVw3NrqBT391ZCod2c8X+tMd5Z+ki8XxTU7h8fYdUJN3Jq52uAfRf7sbaDrMIKoAthPbBLzcmcztY4dy\/0yRfYKfCRWtDrrIiOb7HX\/RLgWrXMfNVWqTkqS5hUySXS3T7wNHYeP4CtUxs48TWQY2BE1y+BzqPeNxJmL+wml9cG0OuwNdRciqMfq4MC1ur1sgi\/U9XNoJGuL53IdjiOQzYVzyfS\/gaQ57HF0ZNUj4NpMWNzF0geKNz22663336ytAL0ZLntt13FBfpt2ELkEk79uBXLVW\/AskyXe573T4l09yfZVFNPqfdh0by4tqT9ncBrWEnVFCzjGqnIFkXCzNlt2EMoysxIkWK2ZwnKWyIcXPrE0IRhR2tcgb45Gf8bMaG9VpQPsBLyWzDBcKIHfDGr+AGwFI8Nrw+hD1sK1GCVEXdS+tn2xYfxUmABwjvAdvXIvfloaStIwt7gPLC9eYG\/A\/hEhBUId2PX1tXYOfNdwkKx475GFF\/kO30FiuKmKN5OF4oGhjsJq1LEdrBYYVOPrY2iKGc8nqnP8bKtxd77PNav34AylkEi2zzBCRhwrh\/cPiCM3IDId1GDPUceEKVe8tQ0p\/23AzgkSh\/wDcIHwJUc21RvMMVgxB7sOH8JvC\/CUpT1WACqD6VwtFne64\/GSS7wD+DxORawihOdeVOxN\/4aFS5MtvkHO+bHS1q95RjZCJpD+FqRp1E2YxVPN2BiVga9iu1J+4H3gSVAB+gnq1qbIt+uae1dFALqROQa4CfhdlVTVVTxmf6Giv7GEzasbI1Hvn52ItvhOAGh0F4H0o4tjOYBF1IdN4piD9d9gNTUed70Nv\/dVfOH1tsaJbEaKS6IbsXMw4bTX1wbvlcr9uD4XSLdvTJAdq5OTS5tVjsVD5Jt\/g6EpdiDaR+2sI2EuWkfFRpQrsDE4veI3mio2Hf1Ljb7cnO4SB8WS1vjAbA3mfY\/wkYtrcYepPdioncMx17w92GL0w6ENfsnn\/rxDHtoRwPXq2X+S5ltLZZYv4QZw3yMZYSDzhIL7KPptPL+fXe3+6vzyhdqJaUPYj3bTZz4OsuF+\/FZocDekwiyFAN55RorVg4U++62Afs6UnFNtvmHG7qRw5noaqAAFFSPXKd1tMY12ebnEPbDYRfqahg1WQ487BnQAhwSO6c\/KBTojdWwBfgc882Ycoxjoti\/72HAxOxthI+x6pRvRMOgi8DiE2T0Oh6L55Jt\/sawD\/x2hta6cSyKwekrgalq1T6nXuXjOGNYmYpror37kChfImwC7cTWSxcCl6jKJQyM39yArQM+A7pAd2ZT8chNXAEkkAa1NssnMRf0i6ie9pQAuwesAH4r8P6KedELbHAi2+E4CTQfE1kbKM+pidq7sQd9NSxsikI7CRwSES+RWf9+reQPvjmvPOOvjrlRQiMmrq8gmj7Z4n42YwuaCR7akWjzv62rDXJLHyndvnbMjw\/OfEVKvhaRPBcIzGQgCxw1fVgZ5WsErFnyWLSZkdCYaV+yzX8fYWv4Wfdh4vcijuzBD8LjuBpYJbDjnVuHJFRr1BYRxSDOd\/X5DxXFFu0vAL8O4BOF\/jdbyyuuj+b1eXFtyfh7sDaRHZh4\/iEWpDlWFi\/AAkSfA+uWPnHiBUVowhbDFmdRlcNWA4qJlm1Y4MlUtRzuVy7FuLShUNyOw7O\/j\/rbfOgXsZ8\/zGaf7njYeZnEzv09sVq+Utgnenh83qUcWYlwCJtisA4TGKsUPkXYgbC3c178lH02glo2e3k+BbaE2xPVNTIKCxJcJcKHLW1+75L50bWjOE4\/svOaAPJ3LOzarcoeVT5XpEFhnIiOBWpAejCTxj4Rcp4n+WWPNkV+XiXausHE9DXAj7EWnAuoHr1ZrGB5C2gT0Xck4urEwVTLTjscVUs2NYWfv\/1l75fr6z9AyTDgAP1dZbHlojjL9m4gh2o+p7GPpmf8Q6taK\/ZwbsTGPF1EdC6SgpVTzsSya+MQXsoXvG5KMFKrHHgFRmFGVnOIbt7lYAqYoFgJZPP5kzK7GhId8+O5ZNrfgGV8v8YWtA9gWZlij1gf8D5CB7DeG\/rDbRxWEnczJ1cqPRQUW8S\/BvwG4eOClu5hfKosaY3rjH\/yD9Q28onArtB87TGObQBXwNoFPsFEwXdR7BW+ABPt1XCfiwLFSq+3YxlNCnLERVcsja\/0\/nrhthQ4xr1NlX6xheJuLDN\/JolssLXrJKz65xssK7Ud8LHS76IZYw5r8XkLq0T6FLsv7VTIFRRdPsSAWSxHoMIaLHB1BdGN+hTsWXANcB4eO+7M+LlFFQ7sOaqfNx+dAmFgblZ7V49YcGmrACKq+YLlhVaUoDwcYHq7D0p9WJn3GCawT8WMrRwcAN4DMogsL+DtraF0BZFOZDscJ8Evb7uSOS+u39\/Xq8tEGYMZDt1MacYsDYUY5kB8P6FbraisIcLS5lOkHhP+44g24180fQtNn+SSIND2RJv\/UXZ+fOSV1QVcifVhf5\/jl1cPh0NY5maxKN8se7K0QZcOGwm1L5n231PlCxEWAz\/CyjsvxLJJrwPvqXBg0VBmYgMqXIAFJ4omL1FTjHYvVzOV+ayzNV41ArvIyp\/FAfrveMbv9mLsEisH\/Ak2g3QiA\/qxaDT3BZz0aKAx2DVcLfe4KBBMlBbFKStScVrSvqcDpYw5SlcZcarbegAh1\/y8T+dDg64VpRCWix\/EhHg1BAbKTT3mR3A3yjoRVmOu4G8zMFpwNVYeuwHYrnAg30hh+f3DF6wFj8BTNmHCfSbRBqOKkyYmq\/J1QaonuOcYGSyfd1hwl4+C1KpwmZjAnoclWaqJXizY9iywVAh2rC5xIsqJbIfjJFn6w8nMyPj7EF5WlVFYpPxKquc6KjrkPoplP341va376\/6eQu69Pyp76XgNNnZlNKUpq2\/AIv0XIjIJeCqR7l6pqntWjRCjmDsz\/uiCcgeWeTyX0mSxN2J9R+\/B4VFEJeew2G7zVyB0YZmk+xC61MzDdsLQ+sLntvs1QUAcy2QPZ073iegFPlDhKeDd4LuduCvKm4\/HFdjbnPaXibAPZT\/wA+x+UINlbT8H1srJObkXe0PPw8TM6SLgig7hvfxhFUVRWFfL\/UOAQEC83OHScQA658c1mfH3oezDzNvORJENVrGRAD5D8YGNYqO8ulTZCmwUj5wqgSpB5\/zossFLW+M0p\/2DYgaO32JBxKiCM4K1wVwbmiz2cHqZDzpOIxJtPojUAJdhLuIprBqjGloqiwRYwmEhsAh0cyFiJ\/FjUU0HwOGoela2xinkOKABzwJ\/i\/WfVlOpsofd3H4M\/AlwTV2jVz9tQVfZNmDaAl\/UFn71fPcoieEyATPb+mNgmsCYRJsv09rLt7+nyqyXfOY855M3U5A7MXfaUmTOiqPdOoAdgVf+RVqH9RJuwnqa\/y+BX3uwzoOcN8St0YDx2LFrojRZ1gLmOPyC2PE78GaVzaA\/Hp2peA4zZvsn4FWsNDyH9ZV\/DGwWTqo2ruiBcC7VkdWNkgNYkKe3+Aeqh0VqNYnVWgQUgmNdKhqwE2tnKIrsM5ULsIDS1SrUBcL6Jan4io758a8QDqmS70jFIxXYRcJezq+w8WFRB+KsNUoZr+A126hHh6P6EKlF9XKsam0+9myuluQT2P2xGxPYb4BuAHKrW6OdB34squkgOBwjgtVPxPWB17\/eu3NfTVqtdPznWNlqtSzOBFt4\/EgEVeTXXsz7PNG+vi87b3LJP1wLqNRIH7b4K4eb5BhsTvN2RDaq6BpPJd\/87Nd0PnJZGT7+1Kg9hKhQL8qDmDNtKXpei4Zdq1A+R8l1PlYZodhhM6R3Acsj2THlUoRbsFLmUgSK9wBvqvJa2Os8sgSM0KfKJwK\/xspO7wa6xRzdexafXG+nYAL7HKrHETYq9mD96YfNrjyPIFSydVTPuqgBRYAelT88B4M8h2K1bOP0Htt1stwkcLcoHwI9LWlfl6TidJQ4OOaBBsI2lHewqQpR+rQIVq11JcrXwckFxxyOsjIj49eqMgWRJ4AnqJ4xt0UUC6o+D7SDrgf6o5wHfiJcJtvhGAI799egwg4VFgIZLFtXbYvxs4FWgZ+ieo2nWpd8dl1JP\/DW33Th1SBiy4zNlNC1cRDFPu0WYJbA2DovqDqBfXe7z9yML8BoUVoYmIldivuwYoLhUoRLEUYlF4z8TEhL2o+JcDnWw16K4EQeeFfgFU\/Y0JGKF0q9UI+ajnlxiNGnHh+q8EvgJZQ3VVm\/JPXdrRShs3gtFqgbS7TnZ6XvkXks+7szdMXnznYftVLCXLjf1bBAVGyb6oC+jmMERmIW+lhPaOBWJRzbDb0Mn6twD8plKGWr2Qms9qEXGwH2CdG3GkwA5iqMHSnVNI4zg2kLfKa3+bWqXImN6Xqc6hTYe4EXVPWvsWx22QQ2OJHtcAyJlfOaUNWCoN8A7cBzlGDE0zApjjp5COVJVb2mv+CVNEvzzk+mYAJb+zGH6ZNxMo5yX+9C5ZJ84FXTjR6AnK3k61CmYlnsayldBkqwftpHgT8FZiORud+WnTvDAIXCBDVDoFI8zAMsMLRE4QPRgXLikUbno3E8pU9sDvB\/UaFNTVyeDIIFMC4gWtfqABOEOzAn6OLrAOXrgy6O79pf\/INF8+KoEsPuITVUPhAAAy7oxwzyzHrKRy3LXTyWpbqPFMU+4c9+rBJgM\/a824oZCXVi3g+fYwHnzZi5XDkNu85V4Z7AK6PTenD4v5sxkR3l9AbBWq6u8eDaljb\/TK9WcFQRnie1InINyBOYyVm1CewAu1ctAf4e+FpVc+UU2FA9ZVEOx4hjVWucmRm\/T+FLhWewhek8opkLHRU1mPnRw4qIqv5dIu2vzZ5ERmsYKEgvNlrFx0Z5lePmW4+NUpkaqKydtqCrsPqx0vfcnMJBiYk5PieAaZTWtbk4guka4GKE64FFLW3+y8BnovQurlD5+FDQANSyek3hPkU1Fm4wPcA7wNsq7CKoCrE1ZJZY9rOvOe1\/qQBySkJsDFYqHqXp2QGsx30JtgCagFWgnMdA1nz0Ua+or5GDDJqRPYgYA+dUgcqvjYoBCW9uxm9Y3BrvPcG\/2xLxNis2leIAFowoZvm\/wIwU92Pi3scWsbHw\/8mHP2uwCp0pWMXJtdh1O57SBhXrgetFuaxQywcl+pwj6Jgf586MrwUzoPskPCZRVifVYIZqN2F93\/vKsV8Ox4lIpLvrMGf\/HwEPYtd6pe+ZgykK7BXAP+T7g3fffrIya8FqOigOx4hjRWtcZ7Z392jAx8BvMCFwH6VdUJwqxZmi80BqwIQ2Sn+2BGYw2VSc6W1+TkQ2YmZLN2AL9lLjYQvzy1VZLOJVanzZ8bdPGY+5xpZrtIWHiZkEcKUKNwIvKyxvXuB3i9DXUYJzIGoCxUMYi7n5l8pYYBv2UP7KC+gfSUGIE9E5ELk\/qaCB2n1rlJhoiVK47QXeFeFFVXZhVR01WIn2GITzseui+LoYC0o1YmK7Dru+z2JoGXbFRMo2OKpKQRGEABOX1RBcKW5LECgNR2\/v8h\/Hi2X9OczZ+mB4XKKgj+LYP+hS+Bphgyii9nf7xQIAufBciaEEouSXPBbXZNr3sHOnGEC5CpiDjZVronTrzlrsvLleCnzGoJ77UrKoNa7NGb9HlHXYjO4riO67iGGi\/VoVJmNC3uGoCDMyfrEa7ypMYD+MPY+rSUsqFgh8G\/gtqivefnJKxfwMqunAOBwjkhXzmjSRXncQvPdAGrAFYZLqEtrF8V6PgYxB9W8Q+TCR7u7Pppoi\/zARyYNsBf0QE3jjKL2BkmKL77NFqNFqWCoPPiZKgJV2dobHoxkLfpTjPuxhgY4kMAnhChFeEfgg2ebvrXqhLYcXm5djhlxR048Zg70P7Ai\/qzMSseumAaGBaM\/N\/dj5vy\/msXPRvIH5pMk230P5Ert31jMwmWAcwoXYdz4WEy\/nY+J7PBZAKr6+6x5TwDKwOzpS8cMTIe7M+ASKql0jJhorTzEzXECPvT2qqAg9WIlyD9EJO8GqkJ5R4VPCa0GtEkIV9Kge8SOma4S97oeAQ3PS\/jaBr8QWvKuxvs1plObZGMPOgyminIuVrZeFvr30N4xlM8IXwCyi8zKQ8L2mApcn2\/yujvnxg+XaL4cDYNqzG\/GCAmgQE5WpWA92KxYIrSZjzGIg9W3QZwR5c+X8eNlGlx4LJ7IdjgjIpqZqIt21H1gN0ohlXWZSXUJbMKF1DyJ54Deg79++cF3PW49GO0c7m2pi9kJ\/T74gb1GcZ20iv9Q+EAr0iRArRfBgOISzo7cm2\/zXET7HFp0\/AG7FhEOp78ceJkS+j30XNwBtAq8l0\/5WLVDofDxeZaGJw9Ri59BUohMTRRQTf+9h5Z650yWLfaok23wYMBIslotHgQJ7RdiOZUOPoMNm2\/dyVMY22ebHUNYg1HgCYiKvTq0i5AK1c+IC7Od54TaPZyDjPTH8GcMCKduxMsIjECEYFJRTTCQWwmNRE76KIjwqiiZhR7uDB+Hvzelcji2ygxxBrI4clsXeHx6HKLYvFu7vqEAhB7rSRPUp3xuW2mSB3nuf9df35fk9NmXgIBbsmxDx8Sx6CUxCuSiZ9jeHkw1KTvaP4yTb\/B1YBcAGop2Z3YBlC68E3p7ztN+z9ImqvU87TkMknxeFOkQuB34CPIYJ7Gry9Sr6WLwPtAFLQE\/Wh6RkOJHtcERENjWFRNrfK8IK1cP9hLcR7ViP4VI0CLsXyIPkY4XYR9Pbug+tmt8U6QctezQezF7or8sX5Hmsx\/NebIZ3KSOfvUA\/aP2s9i5ZPm9K1S1GOubH+5Np38fKZ7uxMsq5WJlhI6U\/V2oxQTJH4TqEu4G0eKxKtvnbPcgtnl91i7h6rBR0EtGacYGV3PrAh8Cuci3Mq5g6TJyeTXRZ3eIYt1Oa69wxP17gKPfsOzM+IuzGsq2x4kthlCrnqm37WAb6ys\/D7nmNwKdYufhhFrXGSab9PNZv3Ek46iz86zEMlKdfjImdxoiOSX94PHZj\/c992JqsWBq\/jqNGjQ3mzSfjJDN+L8pO7F4SZV\/2BGCiBzUrLTg4LF59JE4y7e9DWIVyFlaZcFuExxLCNgdgInI4QFQ288KaGL2FgM\/UzrFrsftsFPdywc7pqxAujtWwjTKVwjsGmJZej6ian7yohBYX9ntDqy2wH8l+P+MLyigRrkL5GfAIFtCrJoENFhj9AFggsAiRrStbmypekeZEtsMRIdlUXGc\/6+\/IFbzFotqALSJuInphMBw8TLA8gJX65bCFQeQ9zMsejednZvwPA5UctqC8DzPMKMX4JbBSoZ1Ario6K49DRypeSKb9HcBKlC6ET4H52Nzs8ZSnZLUWEx\/3AJeK8BqwSGFNMu3v6yitOd6pMgoT2OcR\/XOrBzN1+krLuCivUopC5TyiDw5ux4T2sBynF1lWNWDAkAuAOzP+fhF2AGs9odBQQ\/DCQ3GSab+RgQz3IY5RRhyWj7+bTPsfCoxXZayAiNCvwh4NGI\/wF8BPiU4Y7gNeAd5gwCG8Drs\/B1h2egOWnTkmWqBHPPZh9+6oRLaHBVjGKtTekfb7ohgf1ZGKazLj7waWYb3ZF2GVKVHe6+qw77oYVCnr9SzCN6p8gZ3nZxHd9TMOy2Q3KXzZkvb7l7iRXmUjscD3VLU+bKEZhVWCXYRdc1sxX4SdiXR3TrHuk9WnyffjxWQ0Vv32GCawL6J6kkZFejG\/gnbMWHOzJ0F+eG8ZDU5kOxwRs+yReDDzmS82B7H6F0HqsGzI1URXPhYFHlbSlgIaRHgq0ea\/m50fPxT1B9XUBL39Oe9TkD2YE24KK5GOeqRUcZRKt6ocDKi2ruwjCTOmh+Y84\/tejE3AKizw8TB2vhTLXEvNGOBmtYfn5cDzKNnkAn9bx2PxqnhQYYvMOJbRifKYFPvk1wCb80f1l56hNGLHOcrrU7HF6G6xhWnkLGqNK\/beR7x\/RyregwVSNnzXe4RiewdHjTsLhXrU2UMFfBXeEWWrKPmgQCEI0DefjNOc9mNhf\/xxg10SI4+yFxPsOaIp7y8GWiYADWIiP5J7aUdrXJNpfxMWXLgRy4iNi\/CYxrBgyjhVYrN\/68uyJ8tTmfLGvDjNC\/y8CO8gfIMJsSinIFwDXIOwWmF\/S9ovOKFdWua+tJ6eXhoI9BKxIMd1wEyQYiY3j1Wh7MXWHh+BviXw9fS27oMBErw1v1Q+naUnkfbHArdgCYD7sTVjtQnsHNamsQB4CdigSG75vOqYLONEtsNRAlY8fhXAlkTabwOJAf8MKweuNqF9PhahPBuRf0yku7Og+7IRlswufXgqQF8iva4LYm3Y\/Ox\/jhl\/TSA60bQPE0tfA31VrbAHHx\/rg+5Npv2vgV9hjuwPYn2Lk7EFbykfbIJltSdhZia3AS\/h8UpL2v9ElB2xHIXXn6zogm4M1moQdQVEHstsdgEHlrtFq2DHuujqHRV5ETYBe0RGnqmcQJ3afapYHhrFOTgKCEQ5CPQtOapFo\/MkyrRVUbEs2j6ic0Uv9jZfKFAX9Y2nIxUPkmn\/S6w0P4GV9kf1MYIFJyeIx6iaejxKFNQ5DgHWevIBJsjqIty30cBtKC8ibA5iZd2vM5JDh4LxqNyCtXMlsTaAYuBk8Pda9HFoEeQt4PcqrPBUtyUW+IXsCPP4mPaMj3iMBUlgAvsuqrNEXLH13gLgRVXdoKq5ahrdWm0HzOE4rcim4juIyT8Bf4fdDKrxwTgWuBP4U2AOyvhEmx+5qMumpmo21bQbgqXAvwL9T1iZ7iGGv0BULJqZxTKTQTZVPTfakyHMbO\/WgGXAfwP+FjNHOxDB8TlZ6oDLEf4M+F8VfhwI1+VqGde8wPfmPO1X6vCMoTROpgew6\/IbStAuMUIZhzCR6II7ChxAOYjSpwV00byRtehUPbxWivK+WBu+ehji9d2Ziqvq4b5tHer7HIMxwNkKXkluPEI\/wltYcCvqZ+IE4DyUWrTsTUOqwh7MTX030d63PeBGFa5WqCGAlkzF7senNYm0L9Pb\/NGq0owlBH6Mtf01MuAD4Q16xbBrZirwEPCXAg+K+QNUW+b3O\/a9S0QYJSKzgD\/CvHQuoDqmLhzNZuAZETIisj4W86pKYIPLZDscJWVG2zrI5\/epeBmQeuDPsH60agtwjcVmmcYQUaAjkfYPZEuS2ZM86BYsa9sN\/AyYjpUNDvW4bAFeQVgVSHBgdRUanp0MHam4JtN+H5aR\/wp4F5iHZf0vozzGaGDmS0XX86uBlxHeXPpEfGe5j0k4D3gcVn4Z9YO+BzsHt3VEYPA0khnkLD4ey2RHWXVzSJU6ILek2sfFHUWLHZd+taqHo53Ah3VMgAIFch2PD+2YJE1kHcJmNEeVYQf77s\/FrrtvI3pP2+a0TzgW7Fvs\/jY9yvfHMo1noxSCQplFtt2d+lDWYEHfJqJ91p8tyt2hf0bPktaRdS1VOz98fR2BIrv3ydkitAA\/xyq7xnNy15aHie3bgQsQxqh4v8J8Yqqa255eF\/5KxoonM7G16nTMn6HaAgUBVr3TDvobVb7Jppqqcs1XbQt9h+O0YuX8qagIwA7Q54GnsKxZtZVMFudxzsAy2ncBo2a2d0X+QYOE+07Q14C\/Al7AejZPFcX6oZ4HXhfVravnTam2Y3tKdKTixVcOWAn8e+B\/ATLAlxzltlxC6jFh\/yjCvxPhf2hJ+zOSaT\/KHsoTEgrsUZjYj\/pzC9i5swUlci+CEUoDA2OvolpYFfuc91Z654ZCQZBADs\/PjureEmC9zrUSY\/SQ3yQPGoAqnxPtQjgAzhc4N+pFYkcqXgxV5DAn9y0Rf0QOGK8eY6S2vGtcCUAse74N89iIWlwJcA3K91WrTviMaGZkuv\/\/7P15dBxneqeJPm9kYuG+iKRIbUSS1K4qqUobkVwkglLti0oiEpRKtstu2z3t7rHH4+u5febcnnvu3Dk95945PtNjXy\/ddttuV5VEJKAqSSWVNhIkRTJBitRCSuIikgiAkrjvxI7MeO8fbyQBqbSQROQGfM85WVBRVCIyMuKL7\/cuv5fT52Pxs+dj87G2qT\/D2hmmc\/n3loe1N\/22qD6aTHdeVerP92XE457E495MkIeA\/x4bQRv1mL0oyGLVis+g\/B1wKMr2xqhxItvhKDhZPCErIocQaVGb4Rf1xiIK8v1sy4A\/AWlUlVnLnylE6fhFh+ALoBuA\/wP4ZyyreKlYGaq58z6N6l4NdEyV\/LalEqgyCGwA\/hIrIc9gzsPFIH9N3AP8ocL\/G\/jXDWn\/roZmf+IDT\/sSCuFC\/\/5riL5UPIvNTD7JKB2vxwiFchbPTxaIuny2KCio2FoV1Uim8G3JAvFgFJMnvBiIICJcwByto8IjHIOWK8DIxTA4MISJ0ELMsp2OBYyKGnBta0rgDc\/r3Yu1okR5zQtWxl+PfT+OCFja2gl2H96tVh7+x8BdWFb6Su\/5OGYk+gSwbEm684qDaYVmWavviTAL5DvAHwHLseduuWnELFYB87yK\/o2q7i9ngQ2uXNzhKDiZ1E0A1Ld0DaJ6ANWfhiXZP8EydOUUKcwbH90PTEFlUi7HC8mWrsOZxvmRltOGQluBgWTa3wv8Dchh7KF0B5+\/iVBs434aWAv8k6q+DfS1l1k\/ThSsb0roymb\/ArAL4WO1UvJvYb1SiyjOOu5hUe3F5F3IhRdiMd7AsjaF2szm3YJnh78jyod+FjiNjn6s1JjAA5Qa7L6LauSgYr3uJ7CARllviL6A\/GitfN9zFGt2AAyO6o2G\/+M+lA+w8uQoEEykXuvZz0id1Tc8ntCGtJ9fx\/MzvqNsBVFRalSKf73FYzAYMAB0oryPmWVNj+jtPUz83AHc2NDsv9XWVN4io1xp+GUHuUBAkFyOGcAKVZowgTmbaJ41NZgr+QMKe5Jpf3+mTEZjJtM+Kh4gklOdBfoDrDz+HgoQWIuAIWxCxEsg\/yzKLo1r2U8DKbcohcMxZmlvnI\/mggGQ\/ao8BfwL0EV5jg2qAW5T+Fcq0gi6YEmLX51MR18+DpBJJXJBwMcKaeAvsNLot7CM\/wC2se3HBN1+YCPwl6j+H6huVdXu9jG82VjXlGBdUyKXHeS45mhD+QushPxnmHlQMURiPtO5EJuX+edYoOjmhrRf3ZCOvuIBe0ZNxDb6UVcp5DNpZynPe7Co2HYLsO85ytFDfZjIvkAFiuyNqQQSbRYbwtONCe0rft8268nNYf2JR4huHchnsucA8kAhqlWsL7svPPYo7+0clkmuiUvxzZpefixBIGSxZ9d7WBtUlM7vE7CpEzdj66LjChjIxiSnUp3NyaJA+Veq\/E\/Ad7DER1TaKO9xcRuwIPTlKRtEg5ho7lpUH0X5A+BuylNgZzGB\/WvgKZFgl2gs214BBpouk+1wFJGtjy8AGEw2+3tBnsIW4UewDES5LW41wG2oPgHUKPIscJDo58UCoAEqnpxUWCfoAazU6kbsoRfDNpDngY+AdzzRfYHSC+TKzVGyUGy0MVrZhmb\/MPCKQJda0OGbwFcoTolXHLgKy2rfipmypYG2hmb\/iMCAKLo2grElAnENy1aJ3oV4ACtVPV+A964oHg5ditU27bOI1mCvF+U41tpRkaiiCLkIz4lg62gPEHyj1efVK9wwiqJq1\/IZLCs8K6LjqwUmK9TI8OiyyPA8BsP1e4Bo778sFpD1cgGxiN\/7ktiwKqENLf55bG3uwPpzoxqJF8eeiTeHPzuL\/fkqnWSz76nqZFVuBx4HfkBhWpLA9lFzCa+B+ma\/r73E5o9LWzslCKgKj+kR4EnsWV5OI2bzKDZm8xXgGWDX4GAwuP3H15f6uC4JJ7IdjtIwJPCB2qJRDXwfm1NcbvfkBGzeZw1QBZJOpjv3Z1J1kW9ctj1xsU\/77MPPHzw7lJX3c4FUBwFxtQhwWLao5zKpRH+pT0wpabMS8m5spvZRYA\/Cj7BZnvl5loVuQ8iL7eXYeK07EJ5Tq0CIJmupCMIEoitfzhNgIqdbhez6Mu\/rKgbhHOip2PUT1WZLsWvhBKMYVVVKQs+BAeyeinJ9zoa93hKMQsSqvUcvJrK7iUZkg635cwRmq1UQRc0Q9rmjrhLIi+wcpTUH68ME9kFsUkNUI\/FiWDnzbQh1DWn\/SFsqMaa8SArJ\/U\/5AjINcw1\/AjN5nU3hRlTlS\/xnqQVazlBC49tk2pcgYCLDFWmrsGRGOQrsAEuq\/BqrbnwbvJ7tP64r9XFdMuW2oXc4xgWZpgQPPNPRlw28d1WpwjY038OiqeXWxlGF9ZVNBqah+rPkmo7dwECmQBnk136wEGyzlF3S3IGgbGkaH9nqS2WdlccPNKzxP0I4IcpbCBuAx9T6qmZiG4dCbzRrgVuwh\/QxoEuFHiLIIIWqIz+TNGqBpliwqyx65EqN2n5gJibSorxmzmMiuyId3AMQzwIy1UR7P3ka9neHTtFXen0HAv1q57mP6LwLqrDrYeJoggCfx9rGBA1pvwZ79kV5vQ1gfh0lbU9oa0zwUIv\/YaDsBB7Ayoaj2nNPwkTSIuD9lc3+yXVjuF0qSrwqbxKqXwWaMG+T2RT+GTkRqBYQ9Uq3vUumO\/JGondgAvt7lGcVJdi9ewx4EWgG3anKhfamGyrqOnci2+EoERsfWwDQm0x3vQWq2P34PawPrtyEtmCL8e8iMguRfxLR7Q88c6DHE2X9ozcW7Bc7cf3FtK1OKNC\/stk\/hJJWYQ\/wXeAhrKRwNPPHL5UYtrk9jtCtEW1uPY9coHgMG09FhRe+ApzIzpOfjRzlXFTFet6PY0K1ojZIQN4tOp\/FjvJaqcayudnRnJW2VIKGtN+PlYp3Y8HJqLJSk4EpMRPChagemhT+jiiziP0Mt4GU9N4eGKCvupq31fpJozSp9IAEtr7PUOEMzlfiS7n\/6Y6YqNZh7VXLKM4MaGV4XGSfqJbkmlzcvB+Q6VgG\/1Esg38d5akDAyzj\/5LAUwo7gYr03Sm3jbzDMe7IpOb3gu5A+RtsXvRRyrdHdDoWCPjXqvLgULZqRv9glZdsLugYJ8clsK4poQrdqrwF\/CPwd5j7+jEKez3lhdQWgdc9OB2PaHMrJsyGsEh71OV8+XOiK9YUxLStkhCgRpU5RDsjO79ZOgEMacVtkfIjnS8aTOXdxaNgJnZ9RxF86MbOcz6THQX5yoY5EvFG\/IG0T2imNgtrOYny\/fvgogdAyQNogXIQeJfoM+vTgLtQbkCpbljjnsFfhhf38uMol2EtTsUQmOGoUo4D\/ZlUXUk+e8yrmgayHOS3sD3c9UX6\/JeLYmvZCwJ\/I\/CmQHe5j+r6PMrxBDsc445MKjFw\/1P+zlhc\/hJblB\/BMtpFd0f9EgQb5fRNYAqicUE3YlHailwExxJtTQlWrPEHAF\/gCMI7aqYu38ayHoUwRhsC9gDPKny4rjERmaAXIUAviuyohXAcmKBQhRd9OWwFUoutOVHO380BcREmecI0YOjhFj+HrXG58KWvNZavS2wYGIgjkY+Qm4LNt+5HR33tZQVOqwnMqK7jOJZpnqKhw\/jGVDTfkycISi3wdaxFKsrnXA9wHC29B8CmJxM0pP1eYAvmXH1VhJ9VgLsQFim8rdC3+Oe+bv1x+d5LpUZU5oDeDSwg2gkKX0QOa184QYFMY7+IZNoXkEmqfA8zebsfC56VY5I1L7BfRfUvFPZ4HtlKjoA7ke1wlAnbnkgEyXTnPuA\/Y4vNj4h2nERU5MdSrMAW68mIPJtMd\/aUKkrrGGb96ovzx\/uAdx58yt\/jxdgUGqM9gG0wJhGNaM0Bh1V4BSFDxGO2Xl2VoCHtX2CUo44+h6nAJClMv3clMhGYR3TXBpiguFfh3+eUo3DxdUTgqAjHNCBoaParsQ1oP3YNDbSV2IE3jwjo8PmIR3huesT6NAMZ5QrflkqwMu0fxjJmUWZvJwOzBGpilhmO6j6pQrgV5Y7wd0R5b5\/FrrH+CI\/3itEYQ5JjN2ZSeRPRBhSmIywT+LXAmYlVpf+85Y3OwcZpzaB4+6peoAPkCEUW2WEP9gzQR0F+Dwpyv0WFYiM1XwX+CpH3M6m6kleijBYnsh2OskJzwB6Qv8cWwscojjHH5SLYpvweRP4XYJ7A0\/XNXUfbm+aXa6n7uMSLMQC0Yy6d72GlYvdjWcvRoFjWaLvAS22rEuejPvZw9vYpbKMS9aaoGpgmUFtCL5qS83CLn3cWn4YF9aLcF1RhFRQ3M+yAfQY4o3BGlbMIfZggOgwcRjkMHGlo9gcYIbox4V2MefAXWZn2wbKuQ9g5ikogKXBBYbqCtI1y3muDfYcnUU4RrbCcij1\/JralEidH+2YPrfFRIabKXMx0aiHR3tdDwAdAl8DQuhIHah58zkcs7HgKyAArMff+qPBQFos5jX+4rowrQkpNMt0Zx9oT5lE8J+28O\/ZWFT3c3lhXtCBIMt0pwDWgq0D+LVYeHrXJYFQolul\/SUX\/K\/BWe2Oi4gU2OJHtcJQVmVSCZLpzEHQ38A8gVZjQnlHqY\/scqrDM6L9RmCmizclmf1+maXyP2Conwoxg\/8pm\/yBwRoV9WLn\/Dxjd6I4hbDzNWoHdBTp8wQx9ThfgvRWYqzAzp8QYx8ZBavfxVeGrUJuwieHr2hF\/lh8\/1YcFbHowZ\/rz5EX3sPg+0tDsn0aoxsR3T\/7VliqM+F6XSrDSZojnMIEd1SbZPrdGI9zFnAYV29BHeS6EcE79g2nf25Aa3cY38PCw6qfFmMgebaBvJAqcFdgjwinKoB97ww8TrGj2VYQBYB+2TkY5LkqAqQrLUTZTwbPoi0ANFkgsViY3wCoqNgHtQS44W4wPuaSlE6BKlQSQAvk3DI\/1LEdymFHhr0H+SZTtmVRd0cvqC4UT2Q5HmZFJ1bG0xR8E3lPlr9Q2lI9hEdhyJI5FSRuBiYikk+nOd1S1rxLdIK+U+pYum+usKqjSvrq8IrHrmhIBcHLFGn8zwl4RNgE\/xMr+E1zeGI8AizxvRMlgYidywkZpDziCCbEo+4WrsOt2NkpVw9N+tu3xcZsJyjuLFzuY52Gb3smY+MiTY4SIZlh857PexzHH5o+Aww1p\/3T497pH\/De9baMUhQDheK0J2PUSVSAmb6AWyUiwwAMJLorsPqL7HgUTwtPEjvWKzucKC1TEUGYCSWw2751EWzo9COxXeCcW4YSD0RJYP8qQ2HezE+tDnx7hr5gAfAW4efmL\/puvf3fcrmGfSzLdBVALOg1b64rhKH4e2Aa8qCIfbFu9oKAVfslmH2KeqDIR9A5sRFkK8zwoV4aw++JlgacQfXtLY92YStA4ke1wlCGbGxM89HzH4MAQu4Mcf63IeWzBXEB5RiSrgPmYaJsINGMPmDEfWV\/S0iEaSFxVp4HMEaEKGFyS9lWEQO0cnFelD7xcJjW\/pMe7fnUi15D2j4myXoWPsOzKt7DN3ywubePbi\/UYrlPwIzBu+kzUVLaNBrN+0yhFdgwrh10A1OJV5hznKFD7n2rKp18v\/91M\/dRh5rCNWf7nECYqTzEsuj8CDgBvY5UWEZwcqpCLRm1R4GHneQiJ6HwLWZTzWDl+VBvrGqy6YYpALJn2hzKXYX627KcXHa+rgGtUWC7K94EH+eR3O1pyWNBvB1b5UDZmehttxFoOu0bfB7qIzsFfMNF4PfD1WB+7qdB59IVEJfBEJW+eOURh17gAq7zKAE+j7AiyQeStVCNJpn1QPAKdBtyL7RW\/RfkL7EMMz8He5Yn2lvqgosaJbIejTFn7gwUA2SVpvwNYg20kHsPmbRarp+hyqAJuwJzRrxKR6fXNnet7zgyd3vXfFW6OdqlY2tIp4hELAp2DcI\/A3aCLgDpEZir0qvIhttHfiW0A\/WS6sz+TKl5v1mfRlkrw0Bp\/AGGf2uZ0D\/B9zAF3Pl+cYcsBnWIGJTtF6FsXkevwp1GPgIABUc5hDvbziHaDNAO4RYUZmGFSWWS\/iklOIRSQEzHTs3JFsD3Lp\/ctipWg34pt3Pqx0ty\/JQqRLRf\/N0u0194AMCAQf7jV57VR9GWvX5VgZdpXoE+tRPUmLq8y5fOIYZnS6Qqxy3nDhhZfNMATqFX7br4jysOY+dK0CM9j\/lweAN4ATr46yh73qGlLJbShxe9G6QB87Bke1b0Ww6pAbpOAGx5M+\/s2FGg9rlQ0q0qMQUEuYM+RaymM0A6wgPArwM+At0DPbXuicBV99c0+IFUIs7HRZCmsWqQcvXzyDGL3wQtAC8ouhf5NqxaMueevE9kOR5kjwiDoflV5BttQPkZ0m6io8bDF\/ZvALBHmTJ5Z9fKSFv\/DLY2JMdPzmkx3iKpODHJyO8gPgQagDhNt+QBIDnMyHcSyS7tAnwfWJdOdH6M6lClhOf3a1QkFBh94yj8aq+K0KO+psB6lCViOZbA+a3TWWWCLwkbguKeF631c\/1iChhZ\/EOEkyjHMKCnKANNk4CZRFiF8uLzVH3q9zDboRUBQqrCNZ5TO4sU7\/mHxPQHLvnpY5cOo8QRVJaf2\/lFee4NATpV4oKMfIadCbkQmO0s0z4f8yMarBWKXUkLVkPY9YCLKdBHmAveL8hBWHj6P4ZnjUZHDhM2bwC4vKNvqqUEsc7cbm9U8kWjuNQ+rCrgJa\/vpwgJNjhBVVJBBLKB8jNF5kXzurwnf+0Xgn4E3VWSgvYAB9eWtBxnKSQ1wHbYHacQy2VMpz4pHsLWpE\/ilQiuqu9ubEmO2+sKJbIejzNncmGBZa0e\/wl5VWhRRbN7hIsp3IZ0E3Bf+nKnI88mWzv2KDsRAN5dJKd+Voio1CPcAf4A93D5LkOY3\/rVYmfO1WEn2EtBWhB1L0p2nVDWbKaEL7sYnEgCDDS3+EeBFhD0o38RK\/7+KZZ3yzwrFSh5fQ\/GBwULnfgX6VTmBleANEu3mKIZtTu8UeMfzOF7YT1OWCPYdX0f5rieXwxC2mR61GzaEc7KFvrCcPso9UzZ0LQ+iuIVUyIpyAWtPGcQCDlEwDZuVXa3AirTP+lSCB5+2PmsvRi2CaA4JRfUNWMDxZmyKwc3Y+ldLYa6vC8C7QEaFD9euTpTldIu2xkSwMu0fVasa+hjrdY9qLZuAnfebPHjn4af9o6+NX3+J32DbEwuob+7sR\/gQC0LchRnwRUWAfafPAT8F3QX0tzfWFfRz5TQ2QYSbsSq0x4BbKE7P+WjOUyfQikgL6F4NdEwHhJzIdjgqgE2rFgAMLG3p3IfqzxUZwoR2ISKyUVGLlQbWokwGWkXYrRXeM7a4pctDdSHwW8A3MIH9ZZvHfLZtHvB9kKuB5xRdj9CVTHcOlHrGeFujZY1V2C9wDuUjrHx8ObaBq8Ii9a+hbNeA80EObXuysJs5VbJYpuoIZmgVZbZVsM1WvSobsL7JstykFxCPMFtJ+W7OLoch7HqJxJFeLdMvWIY8qqoNASaFZzuS9\/TM+KxX7RruwbJZUXyfcaw66VoPVJVsQ9qfjWVNpwOTUa4Xj+sw4XgV5mY8j+iytZ9HFis73aDwtkZUvVAo4jF6hwLeRzmIBR8+q1LoSohh5\/wm4OpcjFNE6zJf8QRDQTZW5R1GeA8L\/kwlGg2Un7LxDJAG3ZdJJQYK\/XnqW7omq\/J10EeAb2PeIuW6FwQL0B8CfgqkRdT3hIHNjQtKfVwFxYlsh6OC2NxYN7Qk7R8U0X9UlV7gSazfrZby3CDXYJuJGcB0VP5R0feSab8fAs2kFpb6+C6Lpa2doqrTFXkE9NuYUdjlnHcP24Q+CMwDuR54HmH3kpbOni1FnKP5WYRCOydwBOF54N0A3hHlh1ip9jZgnQjH2h4vmnt6vgyvC8vSXao526VSA3xFhfslh9\/Q4p9sq\/BKi8sk39NZzj18l8MA1pccjdmQIgi12HUYZcvLJEwMDxKBF4AKigXHzhBtoKgWSIqVIMfDzNlkLHs6DctSz8D2k4pt9ItREaFYMGU9sFHgSDYo7wDZK48l9ME1\/j7PYzcWvIyyN30mcDsWEO1oaPazbeNouseXse3JBSSb\/dMgGeBrWBBoOle+5il2T+wBnsKy2F2gBQ1uJNO+qDBZVFdiLv3Lws9Sju2D+fM0hBlT\/hfQVuBDQYfGQtnUl+FEtsNRYWxJJYJlrf7RAE2rSg54AhvhMYHy3CTHMZfL3wIWgfy1wmYkfmZxS1dua2Np3bYvlWTaJwi0FuQu0EcZnSiZgJWs1QFfQ\/mFwqZk2u8CBi7HwTdqRgjMIeCDFa1+BzaqaylmeLYHpWhzLNvMnfccZmZ1EnPSjVJkx4B5ojyE8DZwoSHtD7SNH\/MgD8tiz6Q814\/LZQBzmI5yrFwsfN+oEEyonhEhqxFIoTBAljd26sOEdhR7vCqszeUr4XnwsI2zENEIsiukH2gHfi3wgQgDmyrgnvWEfpQ3EH6E3XdRiSMPKxe+UZXt2PXvRPYIMk2JwfqWrveAF0R1ESa2a67grQLsPtuF9V+\/hnIU8XKFrEhLpjs8YIao\/ABYjd2XM4j2eRg1\/cB+RP4FaFY4Iqq5zavGdgY7z3gIJDgcY45NqxIqwhHQZzAXy\/eIdhNYCCZh\/cv\/K7BaguCGWBDEl6Y7WJbuKPWxfSmeJwJyDfAjrEw\/is3RdKwk+z8A\/w5kCTA9mfYlmfZH9cZRsX5VIgu8L9AssBk4t674GZKA4ZFMA0S\/eZwILEb5Dso8wGtoLo\/zXwTyQbCoyotLzRBwXJXBB54a\/XcogsrFke2RlWMqkBOhGlCJ6KyL9Xh\/jI3Yi4p8q8uE8PPHsbUvTumulyz2zPupwFtAt1SOoAwQdmF95FGbgV4NLBZhlgjeyjJ5hpQT7Y3zu1F9DStb3sflP08UC\/ZuAP4T6C+DnB4eGgxymdQNBTnmZNonmfbj4F0Dshr4M2AJVhVXzgK7BwtE\/KMQ\/Az0sIqXK2USodi4TLbDUaF4aCAihwOlVS1a+PtYZLNcy4bssOFWgT8Kx1y1qnAg05goWmb0SljW6gNaA3I7sBLLQkXJ9djojRtAngI2ZFJ1ZWPC1daYyM95LQkBIHBUYC3WBx\/lvGzs7ZkDfA8bBfRLL87ZUn3eYtFgm\/Aq7PqbWOrjiYD8LO0+AQ1N\/a6Yh1p8NP+e5sAepcju0YBahGwUVRMNaR8VAqADxaO8N9+jIQAOqvAXAm0CPWsbK6csWgCUCyq8js0yjsqgLv\/2SRESwH4vehE\/Ngj0tMLPRDiOyO9ijtx5g8\/PSj7mKzdymHHXRqAVdCNo79bHC5OVXfaMBUmCQGqAhar8GPhDyj97DSaw38RmYP9yS2PiWKkPqBS4TLbDUaG8vmoBmxoTqkFwDNVngP+Elc+Vu1tjHDNo+QnwR8DdpT6gL0MVL1BmYyXec4g+g+OF7\/sQ8OfAHy9J+wuWuEwEYCdHbHO9A8sAFaL3UrC+81XAkpwy+YFfjvnz72HVFNcwNrLYOeC8CD1eBLubtY0JVPFUiWHrVlQ+BDmgD4muJ7ctlUAUEaVX4CPGpvHVAJbB\/ksRnlXoXttYNG+IyFBhCOvl3Un0a9l0Vb6tMKHiTkyRaF+dQIQLwKvAfwT+CmjDBHQPVgnSG\/7zaSxz\/QHwc+D\/BP5WRTZmUoneTKpwZc9BIBIEMg1Yqsp\/D\/wrovckiRrFvFO2AP+sIs+DHi31QZUKl8l2OCqczOoFmmw5cAaNvQByHstor8Ais+W6cY5h\/cg\/RuW6ZLrzp6AbM6lEJGN3CnS8M7CMX6EcPM1x2KoR6hS5Bfir+ma\/vb2pvDP9RcGydEdQ1mLnKErToDwTsBm2TaL0xrJspcLd8L8ED+vFHivO4llsQ3ya6MSLh\/VtxjCTsqjmPAdEvAcL07mDQAdjK4mimHP4TuDnorSuW1V4B+dCsK4pQUOzn0M4ggUN7yXacVJVWP\/8zUGcN6icMvqioqoqIhdA38DKxl9CuRELOF6FSA12f\/Yj7Ed5X6ya65Si59ob6wpWJZBM+6hIPEBmieoKoAl4gMI886IkwAwnM8B\/A14HOZZJLRi316AT2Q7HGCDTuIhkurMH2IRtNC8A36QwWdeoECyL9k3gepBEMt35q5hox6bGRLllYWKozMDMzgodRR7pQN4tQncy7e\/MpBLjtvSvLZXggbSvHvSIOZzvwDYdUT\/D8ud+JUoOyD3U4m9b21iZG\/rL+LzTKd914lJRLNN5TMyUKBqRLQhKPHy\/IaIR2XnH3QGRi\/3eURyrnQPlWPj+Y2GPl29V2QK0AGsDr3StK1GgoOE1uhsbQTad6IIiMeBqlMXk2MXYDhJeMe2rF0B4HybT\/knsGnsTC6JPB60WoV+RbmBIBEVREQ22FHD6RDLtC1AryoJwgskjWNBkaqnP2ZcQhOdwI\/AvqmzVQE9tffyGcSuwYWxFOh2OcU0mVacq2o2yDYsivoiNsin3qrFa4DbMffwngcrdS9Kdk5e2+GWz6VfIqa2XEynOuilY1DoJ8l3g2vDhO27ZmEogwiC2Kd2Ezc0uxAM8P3P2u8Af5eDBFa3+pAeeG5Ol4x7W3x6d0BvebO3B5qL2he+dfxWKfJniEWBobXQbYWXYUTtKsgByZe7Gn0lYLq5YNqnSeyADrGR3H\/AUwl8hvAycXF\/hI\/a8GIrQh61l+4hWCOerU25Hmb98nD83LoVMKkEmlcivTwPYvfOhKicyjXV9QFYhtyVVF2wurMAOK+bkHuB3sfLwu6kMgX0MeBHVv0F1I+iprcUb81m2jIUop8PhCGlvTOh9P\/PPx6tlK9abnQN+SPnPwM3P056sMFsgrSpb65s7z7c31ZX62AhHpeXFdbEis3HgWmA5yLvACaJ1Da5EcgjHsRE192BZ2EIYdnnYPfNdUWahzIsNsHZFq39UICsK6yp8ox+ansWwLFqUs42zwDsCrZjYngHMVTufM4DrgAV8cnxRFGtTvlQxn8WNBE8IAqtqyLtsR4FiZd2BKtVEJLJ0+H3PYiXzdVGdhyKTL\/vfCfwK4TUsYNM\/FkbrrVuVoKHFH8Sc4N8D7sfuiSjuA8HWxBtRbo2ZkB+rlTiRkmn67Gsr01hX8N+dTPseyBzMNfxH2Bz1uZS\/TguwGdjPA08h8g4w0J6qG9cZ7Dzl\/uU5HI7L5I0nE7qkxe\/FSmrPq8o5zMwp6vnCUSKY0K4DfqQmLn8KvLa4ufNUbigItj9ZyrmKqsA5kFMU17G1FjPj+irwVjLd0VVIo5Vyp60xwYpWv1fgfZR2zEBvIYW7ricDi7Fs73xRXsHmhF+g\/CtEvoz8Znxe+DOqIFwW2KOw1hMOATFVpghMDKtBYth1fRWQwL6\/hcCi8Od07NwOhu8Vx4IAX\/Yd5zBxeZwoTb+UIDyOaqKb3CDhZwxUowt+tqUSujLtZ9Uy+hfC81DO0yY+i\/OYydQW4CWEHcCZtgo0OPsi2hoT2mBlyvuwAMK1RNfvXw1cI7Y+vtGQ9j8eC8GJsYqN55L5wMNYUuQ+LCBZzokRIJxmYG0cazzRvSIM5rxKW3IKhxPZDscYZEtjgiUtHYOqsgf4W+AMZp5xE9E9yAtBvtStAbgWkQUCz8WrvYP1LV197Y3zSxUdVaAL2wz1YuKrGA9AD3vYLgBmgXzMOB\/Lsn5VImho8Y9ivV+3MZwhLRSTMFf5uaExzjMKW1em\/VMSMATo2tUVuYEVLHgwlwhLlhnObJwNlKGYx6DIxYkH+toqO1cNaT+OBQInfOo1DxPf8zAn3WvC17TwOGvDVw0mJvL3YRY4HZoTRXaPBDYOK98qEtU9n3crzyHRukvrsCfHOSyDWe473vzYtRwmrjdhAns7cKht7PohEBP6c8pBzNX6TuyajuIai2Hr4u1Y5cgJLGjlKCNWPOszNERVoHIn8BjmT3MT0a41hUCxdeYDoBkbZ3Zgc\/l56ZQcJ7IdjjHKlsYFALlkurMTWINtuBqxB+8kynsRrwZuFfT3gGsUfonqW\/XpzrOK5Lam5hf1YFRBRM5i46NOUNwxGhOw0trZKl4N41xkA7Q1JgZWNPvvibAWE9qTKayYqMYqQRqxMr4NCi+px3bgREPa7xPIihBE2AtcaPLju2YTrWN+DgtG9TAsqn8jONZmRn7d4esiDWl\/N3bNV414TcJE9w3ha374c07477zw93VgZcZRClcP2ytlMaESxVzjfEa\/h+jv5wEso3+hAO8dNf1YWfsRYDM293qv2v\/vaUuNrez1p3mtMaAepqoAAGYfSURBVBGsaPE7RXkXSGKBpKieK1OBW7AKkX0Nzf5gW1Nh16YVzxwkq54Ams0pQFyQ\/Oi7HBBkmipnpnkh+eaLHdLbJxNVuRv415jR6WwqIyjWB+zHRpr9ErQLAiewPwMnsh2OMU4mVRfUt\/hdgrSi9ACPY2Yak0p9bF9CHNtMPyowR60kaSMmcgsxJ\/kLUfud28WE9vXYJqYYgYo4lqmdKOr2J3mCgPNejPViLQZTsWulkM80YVhsp7Ay8m1Y1m0ncEA10tFRhSZfNTKLaHuNe7GqjyvKnLWlEoOf\/m8bzLypA8tu5jPYoQsw12HZ+GqUgwofqUYnLkUQtWx2juj8GPLtMT0KuQfTPhuiK+cNBLp1WGQr5RNQzWIi8iw2y3sP8LbARoQPUHoQBgWCSvc8uFQk4BzCm1ibQx3RiewYVoK+EBPvFyjg2rSkpcMbzEktMFHFmyyezkOZg2qMMJCiwqlki98rQv+WVWM7gPJ5fO+Vg1zo9uI9vTJXlRVqAvtOimeqOhoUu3d3Av8iwivAMVVymdTCUh9bWeJEtsMxDmhvTOQe+GXnoaGctKJ6AeX3MJFQCNOoKPGwLO73BK5XuFbQFxY3d3YCg1uLZIrW3pSgvvVQgOqHCr8Q1ZuwB2Mx1lAPExTdRNlrWuFsfDyhD6b9QyL8FOVq4FFMMBZjo1KDZYiuw\/rn9gI7FbY2pP2jWDa1R5RetcxicCVZpIdb\/E+ouoiz5F54vmYS3XUcYK0pJ1XQqFyg28z5dyB8Xcj\/eYO58e5ToUrM9WtQAwZVo+uXFwh02Bk9KgGUF76DoqhGKIHbUgkaWvzTKGewYEUpRPbIy3YQE5DdWAn7IWArsA\/lEHBQhX6Bi93p40VgjzhbuxB2A18n2taNuViry8sKRx582s9teDy6c5tMd4T\/5NWoch2WOb8H1cXY2phDZAjV88BZgcMgOzVgR31L1yEN9GyQ0+CNJ8bP9336XCw\/TeVRLOFxA5WhxRRrxWnHMtivxmJ6tu6aIf2XxTeV+tjKlnKJbjocjiKxpMWfrCr3AX8AfAPbZFcKJ4HnVCSN6rYg0PMoui3CjcMXUd\/SJZgw+R1R\/XOsXLUYvA38CehWYCjjTGwu0tDie8BilD8DHmJ4JFUpOIUZGe0ADmImaT5WXjcEDKlHIMoA0B+3cEAsGxALjzkQIatKFRAXYYqYsDwHaJQiuyHtTwJ+H\/hTbKMXxTnLAtsRfizQKREfcyl4uNWXXMDdwH8Avkc0QZwc8C7KvwMybRGX0Da0+FUofwL8MSZ2CnE\/KMPmfx52fZ\/FspaClYLvwUq\/DwNHULrU410JIIhbqfyGxyr7+oiClS1+lSrfB\/4T0X9fR4E\/F3jWE7rjMXjp0dGd82TaJxYTL2fhp6tB6jFX7HrgDoar5D59rwxi18KbwEvAK6gexsrIC3uSS8ji1kOEVWjTRPU+TFx\/DysPrwQUm9qwFmgB3YAFO9XtRb6YSoieOByOCMl6QbensklUzqNyAnOzvJbydR4fyVVASlSvA1q8mLdOA\/3w\/p915LYVx31cgTOoPoNll38XM2kq5LnLAicFToughZzTWWmsaPER+052qc2Gn4xt9krVCnEVNo7nVqzf9ijCUWyDcgQ4IeZMfhI4nQ3wZLhMMAsMqDIRy5LPUMtBbhLLHkRmABWWX0\/EMl0TiG5TPwScEKgRIs+8l4RccLGSJE50VRI5rId\/8rpUAXpU7R2PMjyjPKrvNxe+51lMTA9g1+1ezLyrF7u2Pw5\/fy8wKNArOc7m4lauXOje4EriG60+gVVe7FELps4j2r35TOB+hTaFnpcevfLrLcxcC1AbBMwC7zbQ72HjFBeFv+uL7pFqrK1nbvj35wFPZZoSHYxBLopr1Wpgjqh+CxvPdT\/2rKgEAiww8gzwC9A3M6lET6kPqlJwItvhGGdse2whyRY\/C\/I+wj+Hfdo\/wsRilAZIhUAwIZUEZonqNQitxL19FGGkUnvjfO5\/6kDWi8UOIfKP2EbyCWyTMYXoS5UVK7Pco3BAyt\/IqKiE5cjakPZ7gQwmrmuwTUypXPRjWA99fiZ0gAnuC5goyRtpVQFn1cqrs+GxX8Nwa0AVcFyVt1ByEu2VJVgf+9VEd8\/nDXGOyNhqa4hj15JgmbgozpcCg1ookyNBUD6Ei6Pmorh6AixQ9DImBk8AXaocFnNID4ABhP5cloFYHAW8sTZ6K2peXZWgodm34K3QTvhsi\/BXeEASZVGgnGhY4w+1XcE0BBPYUg3MA\/mqKstBH8Y8KqZw6deyYPfTHcA0RCYk053\/NZOqG3NCW1Q9bJ29VVS\/h2WvF1D+fjh5spjA\/inwCxH2bmlM9Jb6oCoJJ7IdjnFIpjGh9a1d\/aK6R4Sfq3IeWI05j5d7Rjs\/euirwCyBBXjyT4vX+G8AA3iiW1N1Bfvl255YRDLdmQM9AbwIchJ4BHgAE1VRBiqGMBOpnZ7omB1lM1raUongG63+qVzAqzosYu+nPJ5xHna9TvmMf\/d57QbTMGHeqeBnhdzr0fdjT8OyKVGK7G4s8NRPdCZhJUUhJiYghOF52aMlPwec5WlfXo84m61CVpRzWMY5SgaAXSi\/UDghHkFYSSIKrP\/Nz+EE9iWgSiBiwVTMtXkG0RqgzUVYqsIOyV1eAGzZM11kVYQgmIIZpj4MLMNEct7880oqJWLY8\/JR4Ewy3fnTTKruWAFOb0mob+mqAq4V1SRWLfgg9r2Wu3s42D3dD+wW679+QeFDkaB\/lO877iiHDYjD4SgB7avm6\/LWjr5c4O0FPQecB\/kJJrTzmZtypgrrJU0Jegue\/Ax4TpSjy1r87KYClqpmUnUk034O5IQqbcBHIrIf9AfY5iMKp9AA6\/HdCrzhysS\/mFdXJRQ4tTLtv6CWUf1X2Mam3M39PoscVmK+Q+BY1CJM7N6epFYqHqWZ13mx4x4zASHRi4ZcUa6HlvUFjVn\/faQzjCUAgSG1LFSOaPZ6+bFjExBEIVjfePG6HBMBlZIiDGAB1XcxY6xpkb2zBfhuB67XGPsu9T9Mpn0vCLRa4BqQh8Ln211YcDAKsRjHqnfqgbeSzf7ZTFPlz0Wvb\/FrQG8W67P\/DpYQmFzq47pEFAvwvgn8N0VfFOS0J5rdvKooLXljCieyHY5xzOu2aGaXtvofqfJTVbqA38Mi1V\/WX1UO5HtL7xIrwZqPyK8C5d1kuvN8JlVXsExKaPgR1Df73ai8owQHReR1LGr9EFYWNpkrEzGKlXq+C7wGeqC4p7WCUc4JvKaWGTqFfRdXU\/7X8kj6AR94X4W+KN+4odlHNSzZFGJE6yx+FisjjlQ0lhKBrFpFSZS9zQFhSb3Y+Y\/2fAmo0sdwwCMqx+pJWD9trWfnwonrCFi\/OsGKVj8rAScw48SjRDsisgaYL8rtgY3C+8JsdjLtA8RB5qpyH+h3gOWYIJ5AtGvpJOBG4FaQ9+772cHjbzxZeeOgwnJ6ASah8jVgFZb1X0C0jvGFJD8doh34uYq8BpxClS0uyH9FOJHtcDjYbFnA88k1nRsQ+hDOACuxh2ollDfVYuNDZoBeq9AKbHrwmYOnNjy2sKAbwXYz8QmAc8l051YsG\/E2FsGux0zlari8DVM\/ttn6NapvZJoSrkzrElnXlKAh7XdjFQD9mND+JpW12TkP7EXoJPr+ZsHu6auwbFmUmexTCKcYQ94BQ0Nk49UX+7Kj2jN5DK8H0Qd\/JOyPN5O9bqJz3J8KTNNwPVue9nnduQtHguTQ8Lm7Fwuw3YAJ2islCF\/92EzyvdiUgjhfsKY88AufXCDVQcDNwGPhaxHWJlGIQGXew+I6YHos7p2igPO8C0EyfRCQODAL5EEghY12jCrjXwxyWHBnLfCUCFszjfPPl\/qgKh0nsh0Ox0VyuaA7Fo9tA83Po\/0OUEdlPCiqMEH7Q2AhMH8oF3s5me7sgqG+TOrGgh9AJlWXW9riHw7wXkb1EJY1+A5WqvdlG6b8SJw+4C2gVeAl8ThaulNamQQxVAIuiLIdE9nHgEasDPNyAx6l4DjwvsBhTwqy4ZyIbQCnjPaNRhBgWezTjCGRHasBlBi2vkQlMuLY\/Z4ViT4bLAGKCalTatUFc4nmmq8CZghM1fK\/hyqKtqYEK9J+n9gzYx\/wNa5MZGexwMoZTFxvBbYDH2Bj9T43YLu8pYOhrDcB+AroE5gh6nUUvgpoOjAHG1kYW9J8MLelqTKy2cnhSQ0LQB7BztmNRNMyVgwUu2a6gOeAFpR3t6TqnMFZBDiR7XA4LrLtxwsAupe1dGzLqXcOe1A\/iWUBK+GBYeVacC+wUO1nC1S9saTFPz5j6mD2hW\/eXNAD2GxuumdWPnsw0zfg+Yi8j80jvxsLAkzE1t6RI4F6sezlcWxT9GvgTYXjnjemnJqLQjh7V1ek\/T6EvQLHUPZh5n5JbD5pNeUpFHLAIWC\/wvl49OZR+XtkNtG63OYEjomJuorKRH0RolSpIGJjlnJEk\/mvIjQX0gKcK7VC7n6Gx2xFJeQVG7s0RUBcFjta1qcSuiLtHxbYjTm5z+TSAtyKXUcnMTG9G9ilSjvwIUIPwiBCsH7V539nObxq0IVY9vr72POqGM\/9iViVRA0inpblsvybJNO+h2Wv78XKw7+FBS8rYa8Ew2aVHwDPgD6HysHB\/lzF98WXC05kOxyO32BT44KhZNp\/DzgJcgR4HBOslTJ6Inz48V2sH\/c5VVl3+ly1n2z2+zNNBZhN+ynWPbJQMeOhdH2zv01E7sVMYxaExzQR2wCfxzKtHwNvi8gOVT0FDIIGmx5zG9krZb2JgFxDs38S4XngPeAHwLcxg7q822s57erOYJvkj1AGXom+Fy5vhDSbaE3hhjBhkB8bNVbwxFYLj+jEqoeJol4gaFjjcyVjlT6PtsYEDa3+AAHnsE30ENEEBwS7ZyYqxFek\/aH1TmhHitj9sxMr3b2JzxfZ+WqFbkxcv4VlrPcAH3jCxzGPgVPH7Zrd8Udf\/D0l0x0EyAxBk0ADJrCLNWnEA2rD8FD4v+VLfUuXQFCNshDkYax67l4qx9wM7Po5DWxXYQ3QJsoRRLM7fqcyqggqASeyHQ7HZ5JJJfTh5w4c6RuI\/SxAPgZ+C1iBiddKidROwzKXVwMLQZ4BtVFfxeVDVM8gst2OSSagmgOyiDkNi3BCRM8LQTYgxpbG+aU+d2OGtqZQbKf9DmwkyV4s67AcuJny6tXuwjbZJyhMRtjGdwmzI\/zcAXAB4QjW7qBrx4hRjiiBysVscJTbfw8r3S1IQEICcmqb6FMR\/o78jONrBKpCF39HhLSlEtrQ4h9EeRf4OlYynr\/u8kGe\/GjHfVjgcAu2pp0N+\/AH117mRAIBD9XrseflQqIdRXkJaABcUMiVs8qub+mqBmaKShIL4i\/FAueVpKcUC4huUJFngI2gZ1QI2sfIul0uVNJF4XA4isxrP1zE0paOXg3kdYRuMeOU72I9fuU+TzvPBCxreS1wOyK\/qG\/peinIBh8GA9nc9p8Uvle7vSkRYBnrTxiJ1Df7MawMVTMuI1Rw2lKJ3P3\/xT86cSqvicdeLPPzMFZhMB\/LRJR6h3cQ2I3STWHcmwXrgZxFdCLbyg6VHrU+4zFDEJATW+mqiW7Ny2HrkgIqBQhZKgQIR8Ky8aiOO99qcL06Z\/FCcgpYDzyC3adgAY1+LMP9Kmau+b6AL8K5nKK5LIEGsOnJy3+WiFCtygIs6Bils\/mlMIhyFjglkM00ld+zsL6lC6wC6EZR\/TY233sBFsivtBWvC3gWeFZU3wK6M6k6dz8XACeyHQ7HF5LVGCaw9Q2s3\/I08GPMEKWSHi4zMMf0G0X1tlhMfhmfWPX20hb\/bKClEbntTYmK6V1NPtMFgGZVEFVBREBENF9u3V8Js7y3\/WECYLD+H\/yDsSo6qmt4EY8HsCqNezCxPZPSZLezwFsKHQiRl+I2NOdH8zAr\/IxROov3qhmEZdeNkYDR8p\/7iIdiAjtOtCI7piDrU4VZA6zulm7gWJhxjup6rsGundr1qcSFQhz7eObhFt8iL7BLrQR8MubV8QG2NrwscFKF0wh9batG3\/q0zH5nDTZNZBbFD6D3YC1TvcVo5bocFrceAhBUrxbVeqxX\/ZtYdVylJBryZDFjvX8CXhBh\/5bGOtd\/XUCcyHY4HF\/I1tR8AE2mO\/uA3SL6N6riA3+IuWbXlvoYLwPBggONwHyF51RZB3zIGDJripolaR9yGleRWqAGZS7CIoVpqtIvoj0Ch5e2+OeA44FKD6rqCWwuU8HV\/vtmjrYy7Z8GXlUru7wduB8rmfwaxe2xywIHgPcD6AkKl8WeiPVjR\/nZBrHy9jE1au71HydoSPtVWF9sD\/YdRbFvCjCjuILtwUL37wAz0YtqDne+ZH6mmCA7UajjH6+81phgRYsPwgVRfo5lrH1RdgB+IHgIgYC2rYpsbRVVya8LxfZdyWGly\/uJel78KHjwlz45hKEccVFdJKrfxVqM7sYqgSopwaCY\/8N7gv61IhuAo1sa65ypaoFxItvhcFwSmVQdy1o7hgKVj0CbsT7tnwDLKE30+0qJYZuJFcANIItA1yTTnXtQHSq3SHqpSTb7nirTEepQvUOEZSB3YMGVycAEVVG1h\/gBrAQ7A+xWy8CUzcbps1hnvYvdD7b4+wUOCbyh8Jwot2CZ7TuA6xk2CiuEH4FirQRvqXBoY2PBrkHBvrM5RLuZjgM3IHwHmBT2vh\/SgG4RqkWoDUdVDQCDawv3+SJHTWBXybBojYIgPBfx5f\/i8\/pvRx+ICnt7B1GOYcGBKHrKBbv+ZwDTH0z7suEye38dl4QC3SpsEGWrCufaUon8Ohp5MHhoSPFiEkeYSNF7sekDPgDZo0FQFlnVb7zQQf8gsSDHNE+Du7Cg\/HIgwehml5eCAGs\/eB30n4DXBe0JCMaSOWXZ4kS2w+G4ZDatWgCgybR\/HnQTSDfWI\/Yt4AaK\/4C+UjxMbNwBzAepR\/VpkLX16c6PRWQg0zh\/3G8ek2m\/BkiALMeCEoux3vb8ZlsY3rgHmBj9KrAEkdeBtUvSne8qDHhorjqeC9oeXVTqj\/WZbDDh1w983JD2DwPvAJuBW7Hr5G6sd\/t6op8bn8UCErtFOVmozyiCqDIBYRrRVqBUYf2JT2LllL3A+XDG+8cKJ0Kxd0iEow+1+D2YyLz4WtuYKMusiigSXuFRBley4TmKxavwKID5WUPaN9M2a\/E5io3eioIYJjRs5NIYq14oB9Zb242ZCdqroGx9YoEm051g12UxTU0Hsf7grUBnf08uW8Tf\/Zn8cO0BTp\/1agPlRlW+g829XohlrytNMw1iVXqvgP4jsEuEIU+ULaucg3gxqLQLxuFwlAeqwgWBHUBvaFryfeAWysup+cuIYQ\/PekTmAV8R4XlRfSdpZcTZ8WhI9o1fHeRCr1cDcifQhPWyL+KLs58etvm+FutXW6xW6bANeDmAHQO5+MfJdGcPqrlyrhhoSyX0m61+X1bpUOVjoB1owQz\/bsECCTcCdVhWeAqje572Y4ZnOz0b4VUQwmxyTO1YowyI5V2na7HvHoaztf3AoIZiWpXz2Li6D7HKgUMIHz7U4p9Ayakiapv9buBCW1OipNktFXJhFCnKueq58BWXGDEK5DAezuC+gAVwojr2GHa9X+3Z\/e5EdoVz\/887AB0EOYEFf6ZT+HJoxUaPbQI2IZx6+\/cLb0L6eTyxZT+DQ8LRE\/GZqtQrpDBTzNnYNV+J5eHvq8jzwAsgu9sb55dlIHMs40S2w+G4bELhqUDPkrT\/jiKngY+AVcB9WJajkqjGMnGPolyn8CJIG2gXtuEfV\/QNxuIifBX4PaxK4RouPXsr4d+twkT5LOAOkDdV2QzsEMFf2tLRvblxQdmWrL1i\/Y75Wca9wImGtH8Q2Cnm\/HuDwo0oCxDqMME9K\/zMtZgAudQZ3N1Yqb0vUhjR8nCrjyoewgSUaRS+6iQfdPl0eWUOuA0TZ\/0KAyj9asGFIwingTNh5vtoQ7N\/CiulP8ewQ39PW1OiKPelwoDYZ4lSZIu9NZ7aBj7yzW9bKsHKtK9AX3hu+4mmeiGOiewpgLc87fP6OAxEjjU04Jx4dACHsaqHQorKESXM\/ArYA0FJgjXJtA8gnR9TC3Iz8A1sgsrXqay513ly2Fq5HUgD64CP2xvnj7t9TDngRLbD4RgVW1KJIeBgstk\/jkgnsBpowIRZJa0xcWxz8W3gJnvJr5Np\/90gp6eH+nPBm79bukh7sfjmCwc53yc3CfpbDI9ru9LvUbCAy+1Y5vcB4C1F2lRlW7Kls1PgfFyCoY3WilDWtKUSwcpm\/7zn0R0oXSjbMCE9FXMlXxD+nI+1T1w14j+fgAmTvHN5H5Zl7MNKJj8ATr9W2H7lapRZWDCgVJmZfLnxp8V3FitvzAI5hCwmDE9jxkiHgSMoh4HjDc3+WWAAm2F9BjPhutAWoVv3StuABzp8\/Ud1zqowkT2oUrhRWOGYrb7w\/HQTXYvAJGCKwoQYhSl3dxSPbT9eQLLZH8ICfbuw8uiZBfp1+daYjaBrgDcEObcltaDolU3JtB8GhGU6ZnbZiM29nkf0LUHFYACrEGoDnhXYgerpTKrOmbqWiEraADscjjIm05S4UN\/c+boIZ7FNcV6sTqCySq2qsT7cG4FlIK1eTNbXTPL2L17T0Q0EW1eXvyC8Epa1+NLXT42oLsdK5a4hmh49D9vgJ8LXt4DtKM8DbVn1DiTTnb2VMKtzXdPFfsmAMAO5osU\/L8pRzAm4asRrJlZuODPMHteE4jHv8h3HsuSdwPtYdqdQiCo1mMCeUerz+BnE+c09iWIb3puwc51FGMKcvk9i\/ca9DIvsjxrS\/k7gXeBs22Wacq142gdg\/eOfyMzGBOL6Sf+B0VJLeP2IFnTedL5c\/Cy2AY+KqcA8sWu47O9ZxyWRw9ahTVg7zGSirXZR7L49AKxTkWeBXZ5qd9wrvglXMu3HQnG9AHgI+AEWDJ5MZe1X8vQA+4BfifALMbf2\/i2N5f9MHcs4ke1wOCIjO6R98Rpvp6iew+ZersJGIRV7LEgUxDGjq1lYH+4LnudtDz\/XmCy9UpBAmQfcifXWFsoEZxI2KmuOWg93K7ArFNqlPg2XzfrGRIBlYT\/hpN6Q9o8CMWx+tAgEArnANq81AAIDntCvEASFFVxg4m42ldPOIQyL75GZ77zJXsBw6XWAiYSfhT\/PcQkCMMxW1wBTFXIogytb\/BqFWlU8wEMJEIJLeb9LJF8iLijxlc3+0LrQo+DBtB\/3BE9sjQnWjWL2fFsqoSvT\/qDauegjnM8dwfHHsUBNPDt8\/h0VTKYpwdJnOi8EAdtR3sSqcWYzesGZD0bux7LXW4CMKIdVGFKg2FVMybQ\/AWQ+ZuT5fazCagbFNX2LCsWqfbYCL4C+psoh8WRo86q6Uh\/buMeJbIfDERnbn0wA9N\/f3PmBJ5wEDgr8a2AJMI3Ke4jVYJHu6Vhm+zVVfaZ+jX+gfXV5uiGPBoGYqszABHahDewmYBUD07joUqx7kumOgUxqbFQKhKXLnyjVezjtE4Oh11KJniIfjgAT1YzaKrHXcCQen72WTMY29YNcovAL\/9I15CtvhJgqWbj4AuE6rG0iygzXfKAeuF5h4sq0PyE0KutBOYewCzjxUIufXTsKoa2W4TqNZfwDohu1OAuYGbd9ZFmP6XNcGrWxXK4vFzuk1sd7J8Nr85WQd0c\/ArIB9AUR3sdaPgZBNTOK6\/pKSKa7RIUZqC7GKrWWYf4QlTaWayRHgWeB50HfBE6BBpujm6HuGAVOZDscjsjZ1lQXACcXp7teQfU9RH5X0Cew7FOUBkLFQLDe2qXALSLyACKt9c3+Oixjlm1vGhsPNDXhMg0rcy5GT5pgmewmrKT1v4AcTqY7cmNFaH+a10prEjUJE4sTS30eCkB+BNsxTFBeKoIFHr6DbbzzZa1Z7B6YzHAPdZTrVj1wF9aT3a\/DLt0ekFXlPyo8B5x7IO3rxiu\/broxkR2lsVQ8PGfl2HbguELWPrKQZNrvAclgweVrgeu4\/OB43mdiO6LPK\/q6J945gcHNq4pfvpxMdyLCRFWuF9XvA98EvoJl6ist8J9nEGvL+ynoL7FS8V5Ax+qzsxKp1IvL4XBUAFtT84fwpBP4W+B\/A7Zgm75KLC\/0sI3lCtA\/FZE\/FZEGgdn1azq9+jWdpT6+URMEBGoCbCrFDcLOBn4Xm8VdC5J3fXVEh2CCcS7RzsguJ\/qw8WD9XOoaY7I5xvDc9xosyJQXkVWf+JvRMREL3s3CMukLsDF5C4CFKFNFrWc7NorVsi2VCMT616Ncd\/MeCzNyAg+0uHt1rJBJJVQDPYqSBv4bZqR1qe1R+bFca4G\/Av73GtFfqOiJHLmBzavml8LcLI4FCh4G\/X8B\/w6rrCtkO1ShOQdkQP9n0L8D3gPtAdXxOHK0nHGZbIfDUQT0uMLziJwR1R9jYmp2qY\/qCokx7L56MyLPCbyAcIhPlQZXEvf+rANFRKzSIOqs3aVwNcjvqLJZA\/W3Pl6+c7QrjXB8VxUm6q6isipJLpUcw27kQdslbDZXtvgoxBAK3w3\/xYzc7CtWZjsDyAoXzfauiIa076mVlJ7FxFIUZlaKVUUkPJi6vjFxskTnrex58PmDAGz4wUJW\/uIAgQo5FS+83IJN5ThVQSRA9BDwNyDHMNftm7DgazWfrHIKsOuqD3MN\/xXwvAg7gyB7bv2qRSW5s0Ln8EkgXwG+p8o3gDvC469UcZ3F7uXXQP8RdBtIDjRw2evyxIlsh8NRUNob57N4jR+IyFlUX1WRD4FDgv4Imy0cVY9gMYljGailwM0Iy4HmZNrfDJwGHcqUYCTJaNj+5AKS6a44EID2Yg\/0Yj4jPCAhwjckxj8wRs3lSoSoXjQ9m17qgynUZ8SuofNc4kipMNIgasZM5bIOKdAnQi0g60aZmVJBRenBnOujuqfy7vgzRZny0Br\/1NrVLig2kod\/1cHAoHhD\/VTh4SVb\/Gl9WbkGqBEYQPScJ3oYE6dlRXtTHUCQTHceB54C3sOedV\/HpkPMCv9qPxa8OQnsR\/UVRN4T4diWxroo3ewvifqWLgABjaN6Dcj3sNLweiwoXqniWrHpAAeBX6HajOi7mdSCig3qjxecyHY4HAVn6+oEhD2T9emundjM213AE8A9DD+0K4l8aem1mEPpXSAvg74A3jvJdOdp9XSovaIMSDTAStHOYcKjmM8IweZIfwXkKqy31hEVQk04I3sqpalUKDSKbfjPcoll0WsbE6xo8QNRhOEKjnIg0IiqYtY3JnRl2s+pldHnDeGi+u6nATMC77JKisckS8KSeVUBNNbTx3SQecANBNyOGWzNwsbBDaJyLqdyMJnu3Al8gOqHg\/1B947fWVgu1yCZVF2w+Gn\/rAjtCHvFnnWzgUkIVSAB0Ivysap2IVwQCLY01pVgJFeXYNU6s4A7QVYBD2LHXGgTz0KSw57Hb6nIL4HXJNCOTJMT2JWAE9kOh6OotKfmB\/f\/vOO4F\/eeF+EY8BjQgJmiVeLDMC+264BVIAuAV4H1onKAyzNhKinxmA5mc3Iay3oNUnzX1SpgtorcgBPZUaKAhhnbswxnIvMmhJ9+VSIDmNnSpfdjY2lshnvUy0XgBMCQXnTdv3JWPOOjAX3YHPcoJyJUY4JmskrFZghHzT0\/86mqFk8hjmoVMAfkTmzm8i2Ywdb88HzF+KTxZy822moLIi9XT4htW5L2T25JJYouUj+PsG1nEFuPj0F+xjTVYVB2KNOUCOrX+KCQsSx40bjzP+9n4vSqGOgM4FaQh7Cg983YfV2p16ZiVQ4fAa+ryDPADuB0ZnX5XB+OL8aJbIfDUXQudF3QqQunnQe2ikVpjwA\/wKL9lSi0wdbTq4GV2AP+TpSXlqQ7dygcgf7+TOqWUh\/jF\/L6Y4kg2eyfRGQvsBzLLBdrk5KfiTxJVKeueNaX9Y+4EtQoeG1VgoYW\/zyQwQTcjPA1CyujnDHi52RMDIwU3B7lLb4VM\/Y6BOQupR\/7U8QwkV4u9AP9okxoaPbPtY2iJ1tsOz6IOaafx4zvoqAWWx+miFL10Bp\/cO3qSqraGT3JZj+myBRgNsp8kK8D92MB17nY\/VTL5987E7Fn3hzgBuwefJkyDzBmbDThJ8rc24v83Zsxpgp4E7Dxmssxc7N7sfNZqeIaLHt9GngXeElFXsJKxQfaG4tvHue4cpzIdjgcRWf3\/3wngN77047zsZrY24KeEBuH9RiQxDYn5byp\/zzyWe2FWPZimZrT6itI7c5kS+dRD+3f3FjG4lHkKBYxXwnMo7hBDyHMuuZyxBjnJahR0taY6Ae2hS8a0n4Nw87W+dc8LFCUF9zTMCEwHRPfHiZI869yEd+KCciPuYwy64fM+EzU7sZ8kKccyIWfKZLjEbN1OxsaoC0imv7zfHvHTCAeeBfv3THLvT8\/QFVVPC5oNcgshZvERPJXsLanBLZexhkOVH0ZVZggfxCYrIgk052\/huBEpfl6FIv6li5BgxqQuaCLQb6B9V3XUfmTEwaxYOEmFXkRC4weA4L2xvmlPjbHZVIuDxSHwzEO2f5bCwAGFz\/d4UtMjoO8DzyClXst4ouzAOVOHNt0rQJuRWkD2gLkvWTaP5dJlafQzqTqgmTa3wnSxnCwoFjfQQD0ic0JdiK7gLSlEgOYKP145J83pP38mK95ArNVqcbuw1nAXIS54b+fi\/Vn1vJJ0V0K8a1Y5ucYl2h6BhDkQDw8sR7ocjE+EyAmIOEM7dGfHCFAOY1l+3NEJ7Kvxnr8RSt1lb4EkukOgDjITGChIvdiweAEFpiaxeieVfnxevdjFQcnwNuUTPsXyvU5USqWtHRWK8wGuR34NhacqMMCPuVyD18JilWw7AReVJG1wB7gvMteVy5OZDscjpKz9fEFCnQvSfvvKHIG60P6IeZmOpPKfXjGsA3YYkysfg14DVifTPs+6ECZZitOAb\/GAh3fp3hjn7KYWOrWUg9VGqe0pRLdwIHwBUBDsw+2iZ2BfqK8\/CpgzgjhPZ3hEvRaLEsXD39WUbgSzgBzOD7BZYpsz4ri8z3q5SIV42rl66PuoW5rTNDQ4ucwgX0O28hHMcYLrNJhKlAjY\/RurW\/pEg3LukX1IeAbwF3Yn8WJ9pqeACzDvAU+AtmTTPuDbvYxJNPvIjJluipfAQ1Lw\/kKdv1datVAuZIDzjDce92OtdC58vAKx4lsh8NRNgg6hIiv6C9Q+QgrH38I28BXqtCGYWO064B7QRqAlxXZXN\/sd6nSr1l025Nls5nKge4DacY2fg9gfW6F\/g6GgCOInqWCZ46PNcKe4Avh61D+zxua\/TgwNRTeM0VAhKzCNJTrgPlqvaY3YEGmaZjAi494jTSCulIUK4U+w2WULG\/4cYKGtA\/DhlTlsKEV7J7rBQaDCCyORAnUMqTHsXLUqIgBN6hUfInuZ7K01ScIgskg9wNPMtxCU8h1cCq23m4EOkGGkukOHa9zkJPpjrCNw7tRlZWYSerd2J6galRvXh4MAL6KvACswYzweoCcKw+vfJzIdjgcZcNm20jk6lv946K8DHoApAsrIV9IeWWbroQ4NlLkO8Aiga8i8hqiO6Tm8kpdC0kmlSCZ9vtBMyBh+SI\/wvp2C5WNVCyD\/l74syzOhePzaWtK5CsPTo\/884da\/DjCBGCC2D07AZigMBflejXBfS0WuKkL\/30NJnTzryou\/V4PsLL3c1zZdRPHjJyiKqUeLQr0oASejL7XWUERzqGcGfH+l7uOBuE56g\/PVw9WcXSaCpqgcDkIVAtyp8LvYvOWZ1Kc508C+CqwGbhw0QN\/nLG0tbMmCHQONqP7EayC4DpsvajkfQAM+0jsUJEW4BksSJgDcAJ7bOBEtsPhKDvaVyUUGEqm\/b2e6H9Ulc0KvwMswYReVOWOpWICNuLleiApyMsa6Jr6Zr8DoV9DobC1hGWCmVRCk+kDFyC2DeQg8HMsw9KAbQBnYc+QqDY7A8DrwA5VuSB5O6oyZEm6Q0QQsZ5Z3bRqfGaZPo+1jYksw5nvizzU4tcgJrzVzLLOSo5BYAHmEHwj1qJwI5b9rmFYfAsmvGsYvubyP3NYhr2bKxOk+bLfchDYAFUCMeSiAdqoaEslWJn2+4BTat\/JVSP+tTIsupVhMd0Tno9BrHXgGHZ+TwOHVTgi1ud9VPTSZ5NXCsm0L7kcixAexda8YglssFaL+1H+MxTxt5YYcwwH7F6cEwR8HeQR4FvY+Z9AZbuGw\/A99jHwsoq0ApsYMarPCeyxwzi5dR0OR6WyJN0JUKM2Fuv7WK\/2rZhRzFggwDa0x4BfKPosKnvwtDsINLutqfQCbnlrB6riBcpMhVtAFmOC+w4sszDanrgs8LYIf67I1kzj\/LIYp7S8tQMFyQVeHDQGMgdkFqgH9HqipwUuxL2gb\/1jC13m\/QoIy7Xz48K8Ef88iU8K7znYPT8DK6kd+coCPwHWt6USl9zHvNJ6zatVeBD4f2D9sKVGMTH8vwj8lzYblxTFOa4Bvgv8P7H7tp9hMZ2\/dvdjUx4uYPPUD2LZ6iyWrb6gwtl4lrPZOHHRiwZ6Y4pQ7E0EeRz4E8xBvJgBmBywG9Ufqorfvrqu1KekoCxp6QQQVc071t8DshIzNruNyg+q58lh99t+FXkaeAn4oL1xvjP4HKO4TLbD4ShrtqTqSKY7BlS83SDnRPUQ8CjWHzel1McXAV74OSYCvy3IVxDWobLeE9l335qDPW+sXljSA3x91QKWpP0AOAXyBvAu6Asgd6uwUpT7GC7juxwzoLyj6kFE\/r8Q7PDQsti0J9O+ZANqMQftBWFf5s2g08PPNxionAM+zOViHyTTnR9hZfUngLOZVJ0T3ZdAONM6n00N4KIoHMRGyb3JJ+d1T8cqQK7Hrrl8kOcgl1sqrmG4xKooRorZIPyzgOGRTIqJzaHwOPIZ9fyfZxnu7SZ8v\/zmOT\/SKf85c+F\/G+OTGeT87+4RMz+LxJegLZWgocUPgC6UN7HM9IfAKRUuiNIJ7Av\/ehY4r0KPKP3hsXmi5NY1JUae37HsmRDDWhrupvA92J+FiTFhlqD+qN+tjEmmO1GlCnsG3gB8H+QhTFwXy3Cz0Ci2nh0BtqnIGszc7GR74\/yxfB+Ne8bCxetwOMYJ9\/63g8RrvIni8RWQ7wDfw8quiznLuZAotok\/BmxSeF5gq4oeb29M9JX64PLUt3QAYqOGVCZj5eNLsVmld3Bp87WzmCP0W8C\/iPDSgFSd37Hq2lJ\/POpbujzQmcDXRWkAVmAlzflxViOF1Hls8\/QRcBjLBu4BPkL1GHDeE\/pEyG5qHH1WcjwzIuud\/znypUC27TJbLBqa\/TjCIuAHCDeg5LDveCImrnIMl3JOCF\/VmBgeZLjMfKSDeo5h0VyLZeXj4d8fDI+3FsvCg2W3+sP3mRz+8z+1pRL\/v6jO3YNpX4BqgYlix+NhPew9DAtmATSWQ197vGxMGItOstmfCKxA5H\/ARnVNLOKvV6xqYAvo\/46yMdM0Nsd4JdN+GDSTBdj4su9jfdczGDvZ6wDrtX4fWB\/Ovn4X5xw+LnAi2+FwVBxPvLmbLn\/CVRpIA\/ZgXoZltMZSdU4O63\/cDPwCZQfCYZWgp71xQdmItfpm27wDV4lwE0g9Vkp+G+F4H4ZLgT2GNx37gS3AC6A7Yh79m1aVfjNZ3+J7IFcDD4nyGDZ+bTbDYu6LyPezHgf2AruBfWJZ1kOe6MebyihYMlYIxTeXK7ABGuz6jSNMCs3aqtCLmcssQg696IJerTb1a0iUfhWqMQGWF9292Pc\/CRPLVaFo70EYCv9sikBMlR7gPGLZeYFJan\/3nApnBM60pRInoj5XD4bnasOIcxWWzbOuafwK65Ekm\/2ZiDwK\/DtsHSumi7Vi6+MrqP5fwBtjSWQn0z6xmHg5lUkoN6K6GHt+J7Fn+KWss5XCENZ+0Qa8huo29bwjOOfwccNYuZAdDsc4o77F90RlKtaf\/V3Msftmipt1KDTmMgwdWHnZOmA78HEmVTfqGbpRUR9u0uMxRKFKA+Yq3B2WWC\/ASnwnhX\/9Q2BX+HpXAz3cvvrS+2gLSdL6\/2dj19NvY3PNp3FlTsz9WJb7TPg6iQUW3gJ2gnaC9pbpnPRxx8q0Dx7ieeBVoa983wTnylZfBBBBX3tshDBd44sqDA6im3\/H\/jycJy6qsH71sDBqaPZFgUBgY2r4zx9M++HUM1T0ooW0qtgF15YaO+Kqkkg2+3MReRL4N1jZeDHLxfOmWK2o\/j2wJzMGgh\/JdAeqEhNhAsgNmLB+ALgTO8eTRvULyou8z8ou4Beg64EDKN1jKWDi+HKcyHY4HBVLKO5qRGSeCktEeRIrW55I5buQjiTAjIj2YmJ7k6DviHB0c2P5GQ8l076ATFCYJWZYNVHRfuCkIP3AIOgFVRlsb6orm01HMu1Xg3wD+GOsfHEK0T0nFTOUOoBl8F\/Geo5Puv5th6M8WPy0j3jMEpHfwzLZ11LcZ0kW2An8vaDPqnKs0kV2fXOnJ6KTgOtB7gG+AdyDzbqeTPm4+kdBH9Y2tAn0WWyNPwEMZko4LcRRGpzIdjgcFU99S5cITACdD3wbZRXWqz2ZsSW2wQyZDgAbw9dOFT4W1d5MKlHWYm3xGst4e56QSdWV+nA+QTLdKaA3gfwpsArrCyzEtTOItQG8BbQAr4AezbispcNRchY\/7SPCJPHkjzBn8WKbRPQAvxL4axHdXo5B1MuhvtmvFZE64D4sc70EMy2sYXiawFjhDFZp9gLoWqxUfAA0yKRKPyXEUXzG0sXtcDjGOckW3wNmo1KPjfrK92rn5+yOFXJYZns\/1rPdhkXMT7ms6OWz4lmfwUGpURsD9cdY20Ghsyv9wLuo\/lfgV8DRTFN5B0kcjihY1uILwKbG8gwsJdOdE4AfA38K3ELxArUBZpr490Cr53Fk86rKW8\/v\/3mHxKq8KtCrQZYAD2Miu46xV2UGwyX+LwGtmNA+B4ECOIE9fhlLJkEOh2OcoxCIynFgLVay1YXN2rwde7iPFaEdw8abTAUSWHZgm8LaxWn\/LQJO5Po0u\/133cP9Ushm8RDmoNyPZa6KUb5YC3wNkd9WkdPA2vqWrrPOcdZRaSTXDE+Zyqy2ktjlrb7kAqqA7JZUIliS9qcoMgeIBcqQiHYvbfEHQPtUg2xOB3Vr022l\/igACJpTZD9wFFhI8aZXdAOvYhVKp4LgMkfSlZjQBHOCmHHkXSA\/xIwjr2Vsiuv8\/PjtwC+BdaA+DA5kUjeX+tgcZcBY2XA6HA7HReqbfVTxBKaLJ4uBxzH30msYdrseS+THvuzHerY3gL6tykdAf7szW\/lClrb4taqSVPhfgXsp7viYfhV5FvgL0HdFdcD17jkqgWXpDnIqnipxEZunrXAdnneNqMaBiSgzEOZiAcGrMYOrKqws+jCwV0XeF9QXMwoMtjTWlfRzPfhLX4aycoMqfwz8FjCLwj4zFOgWeBb4W0V3Ab2gWu5Z0GTaZ9aULGd6q6pzgSxA9S5gOdZ3PRaryMAy193Y2MYNIvxMlT2qel4kCDKphaU+PkeZMNYufIfD4fgED\/\/Kl95+rlOV72Hjvu7EHKSLOZalWGSxjWreXOslIAP0KaqK6tYy37SVgqUt\/hRV+b7CfwBuovgZlyPA\/wY85Qnn5kxT\/cU3nNB2lB\/JtC\/ZnBCLSZWgUwWdrSpXg96EyGLMy2AyJkynMuyLkQv\/OV9RlMVaXo5i\/gQvYhVIZzKp0pshhiaIy4F\/j7UdFSrwNhCeg5eBvxX4ANF+Ad3cWN5rQLLFj6FSi33ny4GHgK8DixhblWMjyWLBoe3AyyK8KMIJDTQb5JT2x93z1THMWLwBHA6H4yJLWvJjdWQGNpLpO1iP2M0UN2NZTLIMz2tuB36h6A5BTioMopprr3DH2qhYatfH1EDlJ8D\/Hat2KDY54FeI\/tvqOIc3\/Mh9N47yYklLJ0C1qk5S5DqxtfQWYB7mFL0Qy\/DFwtflBDF7sMDgc0Ggfwmc2rq6tPdAOM5vOlYF9T9iowijCL4ptvcewkYz7gG2oJpWj48EgkwZi+twoofneTJFleuArwCPAHdjkySinMhQTiiWvX4HaFORtSqyY+uqG\/pLfWCO8sX1ZDscjjHNFtuwaH1L52lgM8ghUX0X+B7mdjqr1MdYAOLYZmcKVrJ3jyDtimwA3S4iXVh5+bgnUATEwzIvpRwlkwBZOJjTI9iGzuEoC5a0dAowXZVbQRrEgpTXADMxITpa8TkJE2tzPE9qVfWvk2n\/UGnbJhSgG2QdZtj1JDZy6ko\/a4AFPi8AJ4HXsWqjD1R1XxDTCwDbVpVnJnRJuhNQASYrcpMq9wL12DP0GmztHGs912AXwgAWsF4LPIeNWDuyddUNg6U+OEd5MxajTQ6Hw\/G5LGvtkEClVlUWYn1j3wXuIprNYrmSw7JFXVj5+KsCbyqcFrRnS5mP\/io0yXTnDOD3sbm411P8Z2MOOAj8f2bPyP3jcw+XV0\/f0hYftU30JEUmovTFPD0P1KhSCwSBMoQylGlKZEt9vI7oSKa7YsBc0AeAH2GiagZ2PUR9n2Sx7O4\/gP4zBCdK2d+aTPsCUgt8FfhtLGM77xI\/t4avHDYn2cdGOu3Eqos6UT2TaUr0lOwDXso5WNMBQhUikwW5VmEFVj7\/VWA+ZuA4Vsli4xbfBl4QdJ3CR6DdmdQCFwh1fCkuk+1wOMYVm1YtUKAvme7cjUWn92FiewVW8jix1MdYAGJYf+QdwG3AKoU3QH+tyLZkuvMQqudEGNgyfuc1nwLOUTx38ZEolumaeL7bi2Obu5KSTPuoIB5UK1yjKrdhTvbXAHNygXjYXNhTWE\/pCdD+ZNr3QBQbUXYOu8dOZlJ1Q6X+TI7LY1mL7wWqs9Qy1z\/GxjBNLeCvjGPXVwPILvDWY3PlS0ImldBkurNfRXeKyt9j1\/MjWHVQLRaUHTnrWbEy8B7MG+MYNlrxPUxgd6jqxyJ0A5Ipc0PK+ubOODAb4WbgPoUHgVux6q+x6BaeJ28kugdYh\/XLvw10hzOvy\/p7c5QPTmQ7HI5xykCgUntSVDdi2ZPdWKamnmGznrGGYAJyJvAgyI3Au0A7IltBdy9r6TizqXHBOMtsay\/IR5hozFJ8kR1gm7rBbI5arPevZCTTHWA9tbNU5T7Mx+AOLAAxE5jA8PiaPqyccgi5KK57wj\/vw8TGiWS68wg2S7YLExwnMqm6gVJ+zkJy\/9MHERHxRMg0JXR5aweY+zaAiqCvP1aepcF5ciqTsH7rRzBDqylF+LUTMOOs+0DeT67p+DizunSiJpOq0\/oWvx\/YqapdiGwU+BYWrLwaG6U4BRNmJ7He8j3A26A7QU5hTuE9cG6wvemu\/FuXnVBLpg+iKiJ4nnp6Fcrd2FSOeuz+v4rhwMJYJF95cAzYADwvQjtwVFWHPFE2NZb3PesoL1y5uMPhGPck034MZBKqdYg8jInt27HNUyn7dIvBELap2I2VMW4H9gt6xBPtmTZhMHjhe7eU+hgLyrLWToKAG9XKxZ\/EymGL+Xzswc7933miL29uLG0JabLZr0ZYBPIj4IdYhccULDD\/Reclv0mFT27GB7EAxglMYL8BvBagO7emEn2l\/KyXS304E7p9dYIHnunwcoFUB0ocZNATVVUmK0wM+\/zz56RGhMkoHtAjwmkRPV8dD4bWPbKw7MQWwH0\/PyjxqtiNwB9i5l9XU7y18Bw2L\/qvUW3PNCXKove1vtkXPG+CqM4FbsCCTnOxnvLzwBHQQyg+winsXtByH8W1pKULwFPVCajOQOQu4NtYYCWBBdbG4jSOkWSx626nCs+J0iZCF9C9pbH0bveOysSJbIfD4Qipf7pDJObNwLI338FKyBcwtkvjRjKAzdreDGzCnFQ\/RLUn0zS2+7aXpP0JCo+C\/Ck25q2YlV6ngF8B\/9kTfXNzY6JkpdWLW7piorpQrDx4NbbJ\/jJxfTkMYn2OuxV5Hvi1qnaRCwa3PlG+QiTZ7AtQq8ok8bgepA6owaoQajChNQkrp56ACdIJWPZvBrZ+XACOCRwC9qpwQJEjwDnQofYy2cwn0z527PJN4H\/AMpnFnMSQxcZ6\/TWqvwrgzNYynoaQTHdWIdQImhNhMCbkNj5WvscLsPjpTgDEUwGmiMgNWLb6Yaznei52\/Y71itcAuy87gDbglyr6Lng9QK69cX6pj89RwYz1m8fhcDgumfbHF2gy3XlGVbfgeR+L6n6sNPBerA9trGe1a7DRZnOwQMN7QEaErUtb\/A6gd3NjefcRXikq0oeyRYWvinI11htarMBKN5bhPVxKgV3f3CkEOgvhu0ATVrYb9TmoxjbwswS9DrhG0BZi8n4y3dmXSdWV6uN\/Jsue8QGqcjmpA+4VYSVWKjx5xF+bignpHBaoqsYCc9XYJj4\/2sqDi3XCZ1DeEfRVbHO\/L9nceWFoIAi2\/3bJgw0CTMMMIRdS\/CxmHDu\/0xGpRVUow\/LqPKHfQMV4DtS3+B5KFcoEEe9G0PuA+7Ge+\/nYc2CsJ+HyruGHMDPQl4EtoEdBs05cO6LAiWyHw+EYQSZVp\/XNfg+wO+ZpRy5gC8gPMHO0m7DN9FheO6swkT0Hc5Bdqch7qmwDdiTTnftAj4j14+qWko7ZiQ6b5MXHwHOgVwPfBGZT+MBKFjMO68AyKiVhcYsvqE4E7hbkMaKbC\/x5xMPf8VjYyz0owr5lrZ0Dm1bVleo0jDgfHVSJJxowJVDuBxqBBsx9Pu+sfSnnJz83+tNMxzLE12FCtgXY6sXlAiUXlBLDrv1bwuMsheCqxcRelWfnOTfK9xv33P\/zDonFvUkoc4EbEZaA3otdf9dgmeuxTt6c7gLWGvUCsEmVAyJBnzM1c0TJWN4oOhwOxxXRbqWJCvTd+88d78SqeU\/i8rJYr3YDtimZztjPbFdjomIOVkK9HNgB0qYW\/S+ZKIya9sb51Lf4Q8A7ID\/Dno8PYxUMhRSbF4A3sZ74kvVieyoeNp7oIUxcFSN7GcdmEP8IK5k\/o8rHWOa3pAh4uYCZWHDtSUwQTyM6wSmYkLwRE7QzEYjF2ZpM+xcypXX5z5sjXk3penFrybvuWxDGcQUkm31BBBWdKDa28k4sY53EnmMTsO94rGeuwQKap7Bxia8BryLsQzmbywa5N35c8goSxxjDiWyHw+H4Arb\/ZAH3\/bQj68V5R8wpdhe28X4YEyXjoVe7Bst0XIVlt78PHFCR9fUt\/nZR9gFnQHKAllvJ76XS3pggme7oBbaAdAOHse\/6RmwzGvVGNAe8D\/wa4SClLTmNYf3XSyjsmKbP+r0LgUdVeR\/h1NLWrt7Nq0pXrplMdwjINCyg9nvAYqz8u1BCZDpmNJUDOQ36bjLtD2RKViUiMdBplNb4MT9fupeSZ\/Yrj2WtvuQCqUF1CnCdqDyIievbsMDWFMaHsM7TjY3r3AK8BPqGilwQIRv3ytuYzlG5OJHtcDgcX8Ibv7UAYDCZ7jgIfATyLsgOhh1Y5zI+Niw14WsWcIuo3gmSdyXfDOxW1ROLn\/YDQLc+Xnml5OFmqy+Z7ngD5AOQjdh82NuxfsUZWJavZpS\/KoeNtPoHoN1Dzwla6uxlHdaHXezsZQwL3nwrUN0J2r+4pSPYWrJxOVKNys3Y6KrFmKFZoZmAmS12AEeAI8m0H5REaGugiOTFdamCiBewftkenMi+JO5\/+iAAsZg3MQjkeiw4eC92XV2DBc\/Gi4lnngC7jtqAjUC75wWdKEOBQqax8p5RjsphPGwKHQ6HI1Lqm32AGkRuEliJvb6Gie2xXkI+kgBzi+7BBONmVNcr7BLkMMIgqtmquAYby3wm8GdhLstSjZXLJ7Ce\/LnhaxbDgns2luWfzJc\/VwMsq\/Khiv4nUZ4BzpayPDiZ7pTws\/wp8OeMPoBwJQTABwj\/Bng901hXkpLx8Fxch5WI\/z7WN14sFCtl\/eNcLnh12+MLit6HXN\/cAUitiHwD+PdYmXyxGQReBPmfgI5Man7J2wfKmfrmToBqUBGRWzETs3swgb2I4Sqc8bTnH8KmGLwLPI2NDTwEwQXXd+0oFi6T7XA4HJdJe1OC+nTnALAHmzG9EzPK+hbmzl1b6mMsEl74WWsxsXkzIqvESqDbga0I7+UC7zDm5FpRhFnEwWWtHR9h2cU3UYkB8UBlBjBPLUO0EPgKw9nufO+uhq+8cdNZoAvYBforUV5Voae99I7tgpWPzi3xMcxA+ZqKbgOKPj97WWsHQUCNmrDOm5IVm6uAb8Vi3o4HWw+c2LBqUVF\/eXvTApakOxW4oBYMylHcwGEAHAc2iwbHt4zx0YGXSzLdBUAmNZ\/kmg4QqQG9HpE6kCXY+K35DM\/vHk\/CGuz6OYONn2wDfQGkC6Q7k5rvzPMcRcWJbIfD4bgC2q3vOJtMd54A2kXwVdmCie1vYJnPvAvxeECwDOhsrK\/3duABkIzCxiUtnbtVOY9qrwY60NudDXb+wU2lPuZLYtOqBWBioxdgWYuPJ3oO+FChKoAJmOi+Jvzct2Ib3XnYRvcM4Iev90HfAu0AybWXQbmiioio5g2QhihNJhvsfrlJ7FwWXWQTBhsEblPLABZzNnT+99cCtyIszBI7RQlM4FQ1h8hx7Hq9gPWMF+VXA+cxI8CtsZiWzAiw3Eiu6UARNAg88USWtPgTVeVGhjPW9Viwz2P8GJmNRLE1Yw\/wCvAq6DvAeVAyqfKYQe8YXziR7XA4HKMgfHj3L2np6BKRw6ryFvAqltVeiont8dQHJ5g4mYMJ7vtV+X1gL7AZkW3isXvS1OqPk+nO7kyqNGXBo2GTCeP8\/OMhTHyfSqa7fNBdmCiZjgnsAOhR6Ae6FTmzNVVXCgH5+aiqgooJnAE+OQO6WAgmDvJ9\/6VAws9+DVaNUApiWEZ\/YYD3DnbdFJsslk1+BwuYFcsArR9z2f81qh+8vqr45fLlyJIWX1DiKJNBZgKLVGUF1qK0EAvmTSz1cZaIfPDzY6zn+kWBtxSOZFKuCsJRWpzIdjgcjgjY0rhAgcElLZ2HVTmHZYHyTuT3YuV7423NlfAzT8cM4uqAJCK7sB6595LpziOg50To29KYqOhNdViOeDZ8AZBMdxKIegBbG8t006eqiFzA5nUPYFmhUmTC+jBxVyqXdQEmqfXbl0q0xDGDqtmgNctaO\/rDSoqikWlKkEz750C2Y20fV2Nl7IW6JhQT2HuwucUbsOqPcUuy2RdVBPGqVJkDugjhNixjfR8WwJyABTTHW9YawuAl8CGwA3MM3wocQ6Qv01hX6uNzOMbdhs\/hcDgKypbGOk2mO7tF2A16CGSrKg8B38XKiKdhmbrxtDHKl5LPC1\/1wI+BD4A3QN5U5b1kuvMQtrkeqNQxYJ8m\/BzlKa5DVFU9kfPAR9jYpKspvoGfYqXJeaFfklOB7YumUNpsugCeKDWlWyWCQYh9ALyIZfaXUpjRbnkjwN3Ac8ALoF2ZpsoOuF0pybTvgdQCk0WYC3onVhJ+Gza\/\/mrsGh1Pz49P0495W7yJZa9fB\/WBIZe9dpQTTmQ7HA5HxITCKre0peOcKjs9T3YHAS9iLuQPA3di5dS1jM\/Nkodt2O\/CyumXYjNMdwLvoBxINvvHFb0gEmQzqeKaP403PA9A+2xkGQex0T\/FzuQOYXPJP6REIjunXoDQjTKAlUyXim7gPKL5ioKi95NmUgtJpg9eEIltUpVJoBOxDGpU8+LzPbRHgR0q8hw2w\/iIaDBY7M9bKuqf7gCgqgovF3jTFW7ASsC\/irmE34g5\/09hfO\/Z8605J7EqqHXANhH2x2N6fuOjJTePdDh+g\/F8wzocDkdB2WxzfhUYTLb4+xU5Jcp72NzlFZgj9XTGp9AGewZdFb5ux0rrjyC8D\/KWIO+Bd9BKyuV8JjW\/lMJnTKMBOfE4iPXh3gNcT3Gvy5NYkKWDEolsQUWRc1iW7DwmbIqNAqdF9ATDpfslIZNaqMl01yngVyIcVXgc5ZtYgDCfTb2UayTfN5vDxNIpTFwfAnaqyAbMs6EHCMJZ9WOaZNoXzyMe5KhVZHJW+QoWxMhnrOsY7oUfr8+HPP1YG8n7mKnZFlQ7UT2rAwPZjb9za6mPz+H4TJzIdjgcjiKQaUxkgeP1azpO4nl7BLZhme18tmImZvw0XolhpfTTMGfu+7Cs5l5gJ6pv1zf7HSKcAgZKOVd6rJFJLeDen3YQr+asiLRh576YfclDWCXDZuCQoiXpyY5LoNnA61XkINZXX4q59zmgE5WPEC352LtMaj5LW\/3zimxE+QBowwKEd2IjzmZg61Z+XF0Wm3M9ERtv2BH+PIO1I3yIndtzwAlV\/QjV83heANDeOL\/UH7lgJNOd+X+sBZ0bBDIf0VsFHkC5GQtezLB\/P26MMr+IHBaM2QlsUZG1KHvRoBcl177azbt2lDfjPTrmcDgcJSOZ7qgCWQzyLaxP+SbM0GY8jmD5LBTL5uU36O9hZnK7sc37UUV72p3gjoRkukNApoB8H\/i\/YdUFxQj8HAT+qyLNoIeUILu1RNnM+jWdMRFuQfgPwPcwh\/hicgj4j8AvgFPl5L6fbO30JNDJqsxH5HbgDoYzrmexe1WAM4ruFeQIlp0+pSLnPdGTKNkg0DgWWMm2N5V+hF0huX9NJwgxz5NaUa0WSKgFVu\/AAhU3Y4FFL3y5dX94YsMO4DVgG+h7wBmQHFxsyXI4yhp3MzscDkeJSKY7AKkBmYeZoi3HerbvoHTGS+VK3iDpFJYNew94OxyZ1aXKGZTB9tVje9NeaExoe1cBPwD+AOubry3Qr1PMaO1phb9DOagwtLWprsTnwJ8G8jjwZ8ACiptV\/DnwF1hp7GA5iYmlrR2oQhCIiEi+jNkDZqM6SWFQRE6r6JCqDnoaiyFBgBlSAfDgMwcB2PDYwlJ\/nIKxpNkHQK1a9FpErlVkoaB5Z\/CrGPbkcBnrYQJsPdinwssCbSidoKcZcQ05HJWCE9kOh8NRYu57qgOEWCwuc0XlNmAZJrjzPdtuI\/ZJAizTcQ4zy3ofKyncBRxE9UimKTFuzJOiJmkiYQoiDwGPAoux0uAoxbYCR4BfqujfA+9rINkyENhge6OFIH8CPIG1chQaxaoz\/gxYC9pbCS0RYQm0oIoC7U0Jvb\/ZzLy2NY393mo7B37+H2MgE0S1CrhZRb6GVSfdgQVRr8VKoIvdglDuBNhavhPYDPoC6Nt4sUCE3JbH5pf9feBwfBZOZDscDkcZsbTFF4UZqnI3JraXYGW7s3Cbs88ii5WknsVKyveiulOE97BZ5ccV6SfsGS2nzGC5kmz2EREBpqiVsy7H+nDvxvqUh7BzPoBdk5O5NAGe79nNYgGRZ1XkOSTY276qfARlKJomgNQD\/xZowEp6C7FnUqyH+TDwfyE8JXByS2Nd2ZwPxydZ8YsDBCpkczFRVLBrfy7IfMwdPB8gvQoLkhYjSFNpBNg60Ae8C\/wake2Cvk2QPZX\/S1ua3GQJR+XiRLbD4XCUEctaO8ip5ynUinIVJnIeAr6Duc7mDSvd+v2b5DDB0oMJ7t2YW\/ZOzFjrMGhOxHbGArqp0ZUgfh7JtC8gVdi4tZmYYJiFOY9fhYmLaqy1oUrgKrUy2NnYz6swEd4HnMYcu08B24FXVeQd4Fi5mV2FItuzzyvLgN\/BhNNVEf+qLJbB2wOsAZ4JJDi+tXFB2fRhOz7JknSnYNf7BIVJoIvMV4MbgUXhK3\/dO2fw30Qxt\/ATmBfDZlVeROjEk9Ptq+aXxPTQ4SgE7uZ3OByOMiWZPgjqVQHTELkBy2x\/C+uTvYrhMTqOT6KY4B7ABPcJ4ACwG3QXwgGBo6icUhgoJ3OpciZpAiOOzUquRhUgQEBgIshVmMCejYnxqTocFOoDPgb2gR5A6cs0JUrunv1F1K\/xPRGZjnAv8CPML+E6LLDwReSdtj2Gr8Usdq\/Gw\/9\/DujEAg4veR4bgoBedy2WF0tbfAFEw6CLqlyLZasXYOvwXdj1Ph0LOrlqo89GsQqYo1jmuh20DWWXIoOqmt26unyqWRyOKHCbM4fD4ShzVvzyAEPZeCxQZmKl40sxwX0HwzNrHZ+PYuWJPZjQO4AZp20Pfx4FsgpZUQ1ECDxR3dQ4PnpKR8vSlg5ELjojX3RJVpWYqtSGQnsItDuTqrxe+fqWzmqQ64B7RfVuIIGVzc9j2MDqLHABE9CCXW99mFlfN1Zhkb9PP0TZD+wHfReRDzOpOpfBKyOWtfixQGWiWpvALKyK6KvAQuz7T2DCOn\/Nu\/30ZxNgwc5TWFXRRjHX8N0xLzg5lBUb3eYMKx1jELcoOBwORwWw7JkOsoEnolSBTlVhkag0YJntW7C+2BqcSdoXkRfb+X7AASzL\/T7wFtbP7YvwEXDGEx1wQvvKWd5qBlivrxob5zCZ7qxh2Bl6VviaiWX2c1gZ7JD91FPAuXCbJYJewOZF96lSC+RU6RFhMNPkMnilYoTRnQCoUiUi12GGZQmGxfUN2KiySVhQxe2fvxhlOKj5PrAR2AZ0CXJ6S2p+xQXbHI7LxS0SDofDUUHY2C9QEU9UbEQMPIiVst4V\/v9JuLLFS0WxjOMpzO36oKDvK7yPygGEU+G\/HwCGUM05UeTIk0x3epjIrhF0yBPtm1idy3YPxD1ARAg2Nw5fL8l0J2GZPZkxPiO6HFlqYxMJxErAxQIeM8PXQpAk1l89B7gGC6RMCP9zt2f+cvI91z5WKbQZaAcOgfarkG1vdOunY3zgFgyHw+GoYOqbfQ+YLiILgXsxN\/J7MHMql3G5dHTEz3yp74dYFuYdYC+wH9UjhBlLEc16QqCKqsKWcTKyyOGoNO5f0ymeJ1WC1ghUATNV9CZUbmS4vzpfEeRhffeuKujSyTuFfwRsENgEvAt6COhWNADIpNwa6Rg\/uM2Xw+FwjAFWPuczMER1EHANcC\/ISuBrmNiegZWSuzX\/8sib9ZzFnLE7UT0AHEJkn8Ah4JjCCdCBSphr7HCMB+qbfRERzxP1AmQqcA3KPMy4bhG2Nl7LcBbbtdpcGQHWctOFtdw8D\/q+CKc8oU+E4PXHXMWGY3ziNlwOh8MxxrA+Q5kHfB0zSVsM3MbwaBnHldMHnMGy3IeADuBtLINzLvx3vVi2uz+TcvOOHY5Csby1g6zGREFrqwIZylIdBDIDMyWbga17N2Pi+nqsz\/rq8D93I7aujHy1z0msymcryBueRwaCC0FAAKgIbHEjEh3jGLe4OBwOxxhk8dMdIp7Uisg8FblZVO8F7sc2nPOwPkP3DIiOw5jg3hb+7AQOonoOc5YeUuiPeZoTIdg0RszAHI5SkEzvB6qqRLRW8ao0CKoFbkbkFixDvQgr\/74ay1LXAhNxa95oCLAA4lmsjeYlYLtadc\/J9qaEGz\/ncIzALTYOh8MxDkg2+xMQEiD3A\/VYuWQdlvFxI8CiQbFM9gC2Ge0E3QNyBHPZ3eOJfiSi5zB36RxWjs5m52LucHwuy1r9WC7wqnJD2aFY3JuOyNVYL\/UcROpQrccy19Ow8u8pWO+14va6oyXAxtD5wG7gdUXXCxyPxbzzQG7TY\/NLfYwOR9nhFh6Hw+EYB4SjajysP3EeNpZmCTZv+1Ys2+OIlgDr5T6PiW9frMz8OHBCTXgfxJzNz2ZSdW6sjWPcsvpX73AuW8tAEJeBIC4qqsA0ApkLTAVmo1yPcCdW+j2b4UBhvp\/alYBHQ8DFcXS8D7wO7FLRnRJIh4oO5OJZfePRG0t9nA5H2eIWIofD4Rhn1Df7AtSKMAvkeqx3exkmvK\/DRoC550NhUCzLfQIrMd+PlZZ\/hPU4ngVOh\/98HujNpOpcGaZjzLC4uQNBEEFEIBZDAyWmyiRVZolKFcIcRW5H9TpsTboaG601H\/NFmICrwCkEAXABCwQexMT16yCHxNMTOYLBrasWuPXI4bgE3CbK4XA4xjFLW3xPVaapbWDvBpLAfViGqAr3nCgWWSyj\/SHW0707\/HkE2\/R2h68eoDuTqusv9QE7HJdCfUsXgIgGChJDqVZhgkCNCFXAtQq3oVyD9VPfiM2onoKN0pqC9VQ7CkeArS17MSPHt4GtIrI\/CIJBkGx7kzNxdDguB7d5cjgcjnHMg88cZCjniSJVmDHQTJQbEV0CshQrJZ\/BsOB2z43Ck8U2vH1Y1vsIluke+Toe\/p2R4rsnk6obKvXBOxz3N3eIJ1IlIhNQqrGs8xQsE30DNungesz9O29ONg2rosmbMrp+6sKiWDn4WSygtxF4Q4S9gn4U84LejY8tdMLa4bhC3OLlcDgcjossfqoDLyZxhKkgC4B7sOz2ndjmeCpunmwxCTDRPTTiZ35298d8UngfxkrNP5H1BvoyqbpcqT+IY+ywrKUDgE2NC6hf0xHD82qBGrF95RSGS7xnA3Mwk7KFwOTwdVX49zxM7Hm4PWmxUGxt6AR2Ae3AFoGPQbuB\/i0p5xTucIwWt6A5HA6H4zdIpn0BiYnoZIXrFPkKsFSU+zGxPRkr5XSb49KQ45OiO4tlvk\/ym1nvY9gM70+L7wE3x9vxeSTTHYCMuLfFA63CMs2KyESUBFbaPQ0T0zdgxorTsIDcrPBVw3Bm2gXpik9+kkEv8AGwCXgD5V3QQ55HP4AIummVm23tcESB2xg5HA6H43NZ1tpBTkUUiXlW8lmHslRhKWaUdgO2oXYmRKVHGd5Mj8x8dwNH+U3xfQobNzaA9X2fZYTL+bLWjrxTcwDoplULnCAfg9SnOyEUvkJWIVYDUgtaA8RAYqDXgiSwe30GlpW+FhPSkxjOTk\/GrkOwNcHtM0tLFptscAQzWXwd9A2QLlU9gzLQvjrh7muHowC4xc\/hcDgcl8zSVj+mAdMUmY+J7Hsxw7TrsA33RJzgLjfyJecjM99DWHb7HFZifgQzXcuL7x4JR5CJ6AngTACK4jE83zuLSNZlw8uTZa0+AJtWJbj9\/9zHlHnVMfGIA1kr65ZpKkwRJZ+dngDMDAX1TEwwL8IEdQ2f7JueOOJXebjsdDmRr3I5jhko7sKMzN4APewJg55H8PpjTlw7HIXEiWyHw+FwXDFLW3xPIaFIEmUxcBdmbjQTcwR2z5nyJcewmV3+e1Jsc34UOC8muI8DJ9X+fi9wDPQoyBksS96PZcPzJeu9ngSBCKiKBNbdGQBBpumTG\/vlrdbb+\/qqBaU+F2VP\/Ro7V+2r7VzVt\/giauXcIqqqIqoaF6hBpAroFdEa4BpVZoHEMSE9G+uXno4J6SlYVroOmzMNw+XecYYz0874sLzpxwJmx4BdCBlgt6JdwNH2xoQzRXQ4iohbLB0Oh8MxKpa0+BIgU0CuEdWbMZO0u7FRPPOwTXxsNL\/DUXKGsLndPcAFM0iSakxYH2G47\/sQJtBjAn2K9qMMIJxS5KSYUM9hontIRFXQAVVBFUFEMVGnQKA5RbxP7FUUETKpulKfj8+kvsWyx+2Nl9bXet\/PTTi\/8WMTzktaOjxViQHZTCqh9c0d1SJSY\/3QBGFTc40qtQhTBKkC7Rd0uppR4Qw+6eQ9A\/NOyJd0T8NENuF3UBv+ed6AzO0LK4f8fTKEzbR+D3gXeEPgfRXOi0gfQnbLY\/NLfawOx7jDLaYOh8PhiJRkuqMG5HqUWxBJMpzdnstwdswxNshhWWzFSojz+4pTmNg+DToI0o2VG3cDJ7A+0Q9FdAClRyGOMohIH9YbfgQ4q6oTPKFWTf4NgJwF+kXA8zQeBFRrYDN+VUTbQ\/GdTPvx0Ol6aEtqWPAua\/VjgeVlc1tCIfxAa4fkAvEUVJUg05TgsVc\/4PiFuGd\/LjlARQOsP\/miIM0ybOQV\/jrU\/qKYkUFMYxpQFQQMAYMIcWC6ikwQJRvk9Jx4zBDhKuuDJgCNgdRg98pULPtcFZ6\/uZiRWFX4e6\/CMtA1mNiqwURzbfjKhcdahbvvxgo5LNh1DgtuvQa8DXpARLpU9ZwgAaBbyjQY5XCMB5zIdjgcDkfkJJt9gGpEZmMC+xYsu30nNs5nDi67PR7pZVgM5r\/\/Aawk\/SwwiInBSVim9ePw350DzYbZ80FM4J4K\/7xXEU+Gheb5\/J+DVKvIJFHV8Hd3CzqoiofIpBG\/fyAMBlRjo6gUyCoEKvSHfcvVdtwKSH6G+QzQGYAX\/tkF0KtUZJ4ocWBQIKeqMxGZh+27suFnn46JZA3\/f36e9FSsnNvDyu\/jmLCeHv63A+H5Gzm7Pj9yyZV0j03yJftHsaz1XuBNoA27b3pA+zJu9JbDUTa4hdjhcDgcBWPlsx2oItlAqrMBs1GuA7kD+BpwM5DABPfkUh+ro6R82oQpLxzzmdiRpcx9n\/pzMEF6AROgwafepxcT5rkR75N3Ys+LVhgWuYT\/zQCWDZ6BieDe8BXDxPGs8HdeCH\/\/jPDP+rFMo2DZ\/bxAH\/l5qhg2CewLf+fIwMPIPmjH+CRfCn4OE9LbsZnWu1E9ABxGJKuqIoJmUpfWouBwOIqDW7wdDofDUTSS6U4Py1LOwQT2ncDXsZLyvEO5w3ElBPxmJjcIXyMdsPMCO59BHvnn2fD\/j6yy0PA9Pl158VmBgfyf58W822c5LhUd8bMb6MCy1jsxcb1PRS4A59ob5ztncIejzHGLv8PhcDiKztJWH4W4KlNQZoJcB9yBie7bgesxg6baUh+rw+FwFJAAq7TowbwKdgPbgH3AXlX9UITzgGRSbuyWw1EpOJHtcDgcjpKTTHfGgSkC89Rm896GZbjvAG7gk6ZaDofDUankhXIO8w\/4GMtY71HYKuge4JyInB+KZQfeeHSRE9YORwXiNiwOh8PhKAuWt3YQKF6gVKEyAZGpmMD+KlZOfjvmpDwL63F1OByOSiFguF\/\/NJapfgszMdurio\/QI\/\/\/9u7kR67rugPw71Q350kWNct2REqxE8BGppXajrLJKossYpPKP5gFW5CRVdaBIFIBEsdBYMexBjY1WdZASSRbnLq7Thb3ldiSDMWhQzaH7wMeuusVq\/hekcB7vzr3nttjQbvTzx8XruEuJmQDcEd69oU3q7qXkxyo5JFOH0\/qe538WY1u5Ys53IvljFzTgDvNZsaydeeSvJnktYzO4L9K8nEll6r66ssnDAWHe4kbEgDuaH\/14hvZmlfN51lO1a5OHa5R4f5+Rpfy72UMMT8agRvYWfNMy8VlzLH+WZJ\/ywjX55J+J8l6d7a6u\/\/l74\/v9PECt4CbEADuKlOFeynJnnQOV\/U3O\/lOUt\/PmMv9VJLHkhzKGFY+u\/m\/DeBrzXOjM\/1HGRXqN5L8POmfVvJuUpc6vZ7kuuZlcH8QsgG4a\/1w9Ww6NetkltThrvpWdX8no8r9Fxmh+0jGGsTLubFkk+sfcLM6Yx31TzOq1R+n+5VU\/TTptyv1ZlWfT\/fVqqQqPavOP\/\/o6Z0+buA2cZMBwD1hZfVcdVVV9yzJUlUfSPKtTv40XX+SMaT8qSRPJPlGVLiB380iVC+W23p12l5P+r+rciadSzXL1Z7nejrz088f2+ljBnaQkA3APW3lhbWD3Xm4Ok+m8nRS38voVv5kRuO0\/Rnrce\/OqHQD97fOuEfeSnI+ydtJPsgI1r\/MmF\/9fqXfTfLp6ZPH8txP1pIkL\/2dcA0I2QDcw559Ydz41pgFWdsue3szOpQvGqd9J6PS\/VC+GLhVu+H+sKhSf5bkSka4\/teMYH02yWtJv5XUlXTnzPPHru30AQN3LiEbgPvKyuq5LC91urPUnX1JHujOQ935VqqOJflukuMZle7HkzyQMZ8buHdsTVtnzKs+m+StjKr1z6r6F921nuRi0pfOnBSqgd+dkA0ASZ5dPTerZF+SRzPW4D6WUe1+Ztp3NGN4+YFp2xXXUbhb9LRdzli3+pMk76fyejr\/3snbVflNJb9O51Kq591JsjU\/c\/KZnT524C7j5gAAvsYPVs\/tTfJU31iP+5mM4eWPZ8znXszpXnQvd22FO8NmxnrVVzM6gf9XkrVpe7PSv+zkvU5VOteS3prN0kvT\/JKXfmwNa+DmGP4GAF9jNptf7a7XKnmrk\/3dOZLOw0keTeXbSf1hkqdzY3j5g3F9hdup88Xh35cy1qo+l+TdjGZlr1byYSfrSX+a5LPT1qwGbhHftgPATVg5tbY7yaFUHkrq0SQPZywP9nSSbyd5JGOI+dGMed27dvqY4R7QGU3KkmQjI1B\/NG0fJvl5kl8k+U0qH3XyYXd9ulzzrek185dP6AAO3FpCNgD8P1lZPVcZgfqJbdtTGUPMH09yJMmhjLndhzPmgOtgDr\/dYimtZHT+vjBt6xmh+tUkr6XyQZK17pxN93oqW1XZ7OqtV358XLUauO2EbAC4hZ578ezu+bwe6K4nk3yzx7DyJzKq3X+QUfE+mDGve9+0GW7O\/WwjycWMudSXk7yZG0O\/f5PK2SRvVGc91VerciVVG5tb6RrdyvLK86rVwM4RsgHgFvvLF9Yqoyna8mKbJ\/u6882kjmd0M1+E7yczKt6LwL13209Vb+4Vi3nUGxnrUi9lrE39qyTvZQz9PpfKq0k+SOdqqi\/WLJ8uLfXGfKOSpA39Bu5EQjYA7JBnV9eWa6zVvT83QvW+JI+kavuQ80VTtQP5YvDel2R3XM+5s3VGVXojYz71RpL3M9amPp8x9Ps\/U3knnYtJLqVyoasvJLk+66q9S5v92N6L\/Q9\/8+c7fS4A\/ysXZQC4w6ycWtuTfCV870\/yxBS+t1e9H85Xq96GnLNTFstmzTIC9TsZVekPklzqqncr\/R\/pfJTuq516ryqfVvXVpGadmnd6nqRfOfHUTp8LwE0RsgHgDrdyai0Z1+ztgXvx+5FULUL39gD+QL463FyjNW7W9iZknVGNvpwRpPflxrzpzzIq0+9lBOx3MjqAr8+q3+7UJ0l2p3urO\/Mkfeb5Y3nuxTeSJC\/96OmdPk+A35uQDQB3qSl8L+er4Xt\/koe+VPV+JKOz+a6MRmuLDueHpseQjHnSNW2bGcO8F0O9l3JjmPdHSS4n\/XZSr2fMq15PcjHdn8y3+oPZ8qy7evbKiWPXdvqkAG4nIRsA7jErp9YqY672InDvTbJclU7qcJLHt3U5fywjbO\/OqH4\/OG2HkuyZ3nJR\/a6MkK4afndbVKIr499yPaPafG3aNjKWyhrdvMfz7yX9y6QuJdlK+kJSF5O+nOR6UstJb505eWxzp08OYKcJ2QBwn\/jhC2tVX+py3km6U506muTRjAZrD2eE8\/3T7w\/lxvreR6f9yRer6Psy7is6YwjxohoqkN8ei898oTPWlr6S8cXIckZgfj+jMn09I1h\/OO27mBGmP0jy1njclTH8+5OkriXdSdX42X3m5PFeWX09SXLm5DM7ff4AdwwhGwDuYz94YS09rS185uTxz\/evrJ6bZXQzP5rkgXTvyQhrB1I5nNSBjPD92PTzwYyKeU0\/j2QE8wMZgW+WEfR2ZVTNlzOCYU9\/5SKQfzko3q\/3Ktu\/rJhlDN2+njGce\/E5bWZUntcz5kfvyahCn8sI1Fem\/e+l82Hq83WnL3XVpUqfr+Ryd5Y6ud7d65uX5xu7Ds4qSarTZ05aIgvg\/+p+vXABADdh5dTaUlV2J9lVlaUeYfBKd+3KqIQ\/nM+Hm\/cUqms0aBvPPZIR3Bche5ZRGf9GxnD1xRD1zYz3XnRaX9p2GNtD++Lxdr\/v\/c1vC\/fbvwxYPN6+r6bz2f767e+xNZ3TbHwmmWcE3s+mP7c\/IyCfn\/YtQvaiwdii0rw5bR8l+XVGkN7syoXqfiepC0mWK309qfVOro0h3dXj8+rNJBtnTh7r535yNkuVHDl0Pf\/413\/0+\/\/nACCJkA0A3EIrp9b2VGVfKkvpbHZyZbr9eDDJY+k+nGRPalGZrT3Tcw8lOZzupSSVymwK69+Ynj+Q5Gq6N1K1lNG87WhGIL8ybZ1RVT+aUT1fn\/Yvqu2HM0LvpYwq8Sw35rJv5Ub37FlGyN81veeiIdj1jC8BDk6\/fzy9Znnat5lRUb4wfRzL0+s+yQjSixB9dTqGy7kxJ3oj3eupfJjUlXFc3ZV8UpWP512d9J7pM5vWn+5OKlVdSfr0iWOdJCura0kSVWmA20PIBgBuq5XVczcedI97kUqqMuvO0nR7MqrBYyj73lT2VWU5qc3ubCXpdB9M8kBVLfcIrNendz2Y9JFKzab9iyHWe6dtz7RvURFPRriequU1T3oE3c\/nnXdnBOErY15ydk8ncCnJ+WnfwaRnSS4mdX68f+8fY6\/raifXOrlWo\/69PE66N1J9uTrXx2iAns2SjdmsN1768fH+wepaJcnpk8e+XK0H4A4lZAMAd7SVU2tJpWaz7lklL\/3o+GL\/LEnNqjs173nPO9ldSS+nM6vqeVU2Xz5xvFdW31xK9+6kF\/uvvXzi+Hxl9dzudO+u8f5XDu3e2Pynv\/1uVk6t7a3KbL6Vja2t3uxO79pTiyHqi+DeZ04ey8rq2va55P351mM+dVXPk\/Tpac77yurZSuadbOTMyT\/e6Y8XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuHX+B3XfgU1HRS6uAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE2LTExLTI3VDE0OjM0OjUyLTA1OjAwYI+XGgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNi0xMS0yN1QxNDozNDo1Mi0wNTowMBHSL6YAAAAASUVORK5CYII=\">";
				strVar += "	<\/div>";
				strVar += "<\/div>";
				strVar += "<\/body>";
				strVar += "<\/html>";
				pdf.create(strVar, {
					"height" : "11.8in",
					"width" : "8.3in",
					"type" : "pdf",
					"zoomFactor" : "1"
				}).toBuffer(function(err, buffer) {
					res.setHeader("content-disposition", "attachment; filename=\"Something.pdf\"");
					res.contentType("application/pdf");
					res.send(buffer);
				});
			});
		});
	}
});

router.post('/updateRating', (req, res, next) => {
	mysql.fetchData('rating_id', 'ratings', {
		'trip_id' : req.body.trip
	}, (error, results) => {
		if (error || results.length === 0) {
			if (req.body.is_host) {
				mysql.insertData('ratings', {
					'host_rating' : req.body.rating,
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			} else {
				mysql.insertData('ratings', {
					'traveller_rating' : req.body.rating,
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			}
		} else {
			if (req.body.is_host) {
				mysql.updateData('ratings', {
					'host_rating' : req.body.rating
				}, {
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			} else {
				mysql.updateData('ratings', {
					'traveller_rating' : req.body.rating
				}, {
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			}
		}
	})
});

router.post('/updateReview', (req, res, next) => {
	mysql.fetchData('rating_id', 'ratings', {
		'trip_id' : req.body.trip
	}, (error, results) => {
		if (error || results.length === 0) {
			if (req.body.is_host) {
				mysql.insertData('ratings', {
					'host_review' : req.body.review,
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			} else {
				mysql.insertData('ratings', {
					'traveller_review' : req.body.review,
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			}
		} else {
			if (req.body.is_host) {
				mysql.updateData('ratings', {
					'host_review' : req.body.review
				}, {
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			} else {
				mysql.updateData('ratings', {
					'traveller_review' : req.body.review
				}, {
					'trip_id' : req.body.trip
				}, (error, results) => {
					console.log(error, results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results.affectedRows === 1) {
							res.send({
								'statusCode' : 200
							})
						} else {
							res.send({
								'statusCode' : 500
							})
						}
					}
				})
			}
		}
	})
});

router.post('/getLoggedInUser', (req, res, next) => {
	console.log("in session");
	if (req.session !== undefined && req.session.loggedInUser !== undefined) {

		res.send({
			'session' : req.session.loggedInUser
		});
	} else {
		res.send({
			'session' : null
		});
	}

});

router.post('/logout', (req, res, next) => {
	req.session.destroy();
	res.send();

});

router.post('/uploadProfilePhoto', (req, res, next) => {
	var profile_photo_collection = req.db.get('user_photos');
	profile_photo_collection.findOne({
		'user_id' : req.body.user
	}).then((doc) => {
		if (doc) {
			profile_photo_collection.findOneAndUpdate({
				'user_id' : req.body.user
			}, {
				'photo' : req.body.photo
			}, (doc) => {
				req.session.loggedInUser.photo = req.body.photo;
				res.send({
					'statusCode' : 200
				});
			})
		} else {
			profile_photo_collection.insert({
				'user_id' : req.body.user,
				'photo' : req.body.photo
			}, (doc) => {
				req.session.loggedInUser.photo = req.body.photo;
				res.send({
					'statusCode' : 200
				})
			});
		}
	});
});

router.post('/uploadProfileVideo', (req, res, next) => {
	var profile_video_collection = req.db.get('user_videos');
	profile_video_collection.findOne({
		'user_id' : req.body.user
	}).then((doc) => {
		if (doc) {
			profile_video_collection.update({
				'user_id' : req.body.user
			}, {
				'video' : req.body.video
			}, (doc) => {
				req.session.loggedInUser.video = req.body.video;
				res.send({
					'statusCode' : 200
				});
			})
		} else {
			profile_video_collection.insert({
				'user_id' : req.body.user,
				'video' : req.body.video
			}, (doc) => {
				req.session.loggedInUser.video = req.body.video;
				res.send({
					'statusCode' : 200
				})
			});
		}

	});
});

module.exports = router;