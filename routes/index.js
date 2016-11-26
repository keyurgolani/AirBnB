var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');
var logger = require('../utils/logger');
var cache = require('../utils/cache');

var uuid = require('node-uuid');
// var bcrypt = require('bcrypt');

var NodeGeocoder = require('node-geocoder');
var GeoPoint = require('geopoint');


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

router.post('/addListing', (req, res, next) => {
	//	if(req.session.loggedInUser) {
	//		var owner_id = req.session.loggedInUser.user_id;

	// Listings Table Fields
	var property_id = req.body.property_id;
	console.log('property_id', property_id);
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
		console.log('error, listing_insert_result', error, listing_insert_result);
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
					console.log('error, listing_details_insert_result', error, listing_details_insert_result);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (listing_details_insert_result.affectedRows === 1) {

							
							//automate task to inactivate the listing after end date!

								var end_date = new Date(end_date);
								console.log('end_date', end_date);
								var current_date = new Date();
								console.log('current_date', current_date);

								var time = end_date.getTime() - current_date.getTime() 
								
								setTimeout(function (){

										mysql.updateData('listings', {											
											'active' : 0											
										}, {
											'listing_id' : listing_insert_result.insertId
										},function(error, result) {
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

								},30000);							

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
					'statusCode' : 500
				});
			}
		}
	});

//	} else {
//		res.send({
//			'status_code'	:	401
//		})
//	}
});

router.post('/addProperty', (req, res, next) => {
	//	if(req.session.loggedInUser) {
	//		var owner_id = req.session.loggedInUser.user_id;
	var owner_id = 1;
	var property_type_id = req.body.property_type.property_type_id;
	var house_rules = req.body.house_rules;
	var longitude = req.body.location.longitude;
	var latitude = req.body.location.latitude;
	var st_address = req.body.location.st_address;
	var apt = req.body.location.apt;
	var city = req.body.location.city;
	var state = req.body.location.state;
	var zip = req.body.location.zip;
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

//	} else {
//		res.send({
//			'status_code'	:	401
//		})
//	}
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
						'salt' : salt,
						'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
					}, (error, result) => {
						if (error) {
							res.send({
								'statusCode' : 500
							});
						} else {
							if (result.affectedRows === 1) {
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
				}
			}
		}
	});

});

// Facebook Authentication

// Authentication Request to Facebook
router.get('/auth/facebook', passport.authenticate('facebook', {
	scope : [ 'email' ]
}));

// Post Authentication Logic
router.get('/auth/facebook/callback', passport.authenticate('facebook', (error, userObject, res) => {
	if (error) {
		res.redirect('/');
	} else {
		res.redirect('/');
	}
}));

router.post('/fetchRoomTypes', (req, res, next) => {
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

router.get('/viewListing', function(req, res, next) {



	console.log("here");
    // var listing_id = req.body.listing_id;
    var listing_id = '0000000002';

    var query = "select * from property_details,property_types,room_types,listing_details,listings WHERE  listings.listing_id = ? AND listing_details.listing_id = ? AND listings.room_type_id = room_types.room_type_id AND listings.property_id = property_types.property_type_id AND listings.property_id = property_details.property_id";
    var parameters = [listing_id,listing_id];
    mysql.executeQuery(query, parameters, function(error, results) {
        if (error) {
            /*res.send({
                'statusCode' : 500
            });*/
        } else {
            if (results && results.length > 0) {
            	console.log(results);
            	// res.render('viewListing');

            	results[0].start_date = require('fecha').format(new Date(results[0].start_date), 'MM/DD/YYYY');
            	// console.log('results[0].start_date', results[0].start_date);

            	results[0].end_date = require('fecha').format(new Date(results[0].end_date), 'MM/DD/YYYY');
            	// console.log('results[0].end_date', results[0].end_date);
            	console.log("Rendering!");
                res.render('viewListing', {data: JSON.stringify(results[0])});

            } else {
                /*res.send({
                    'statusCode' : 409
                });*/
            }
        }
    });
});

router.post('/placeBidOnListing', function(req, res, next) {
	var listing_id = req.body.listing_id;
	var checkin = req.body.checkin;
	var checkout = req.body.checkout;
	var bid_amount = req.body.bid_amount;
	var no_of_guests = req.body.guests;

	//TODO Get user Id from session
	//var userId = req.session.user.userId;
	var userId = 1;
	mysql.insertData('bid_details', {
		'listing_id' : listing_id,
		'checkin' : checkin,
		'checkout' : checkout,
		'bid_amount' : bid_amount,
		'bidder_id' : userId,
		'no_of_guests' : no_of_guests
	}, (error, results) => {
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

});



router.post('/placeBidOnListing', function(req, res, next) {
	var listing_id = req.body.listing_id;
	var checkin = req.body.checkin;
	var checkout = req.body.checkout;
	var bid_amount = req.body.bid_amount;
	var no_of_guests = req.body.guests;

	//TODO Get user Id from session
	//var userId = req.session.user.userId;
	var userId = 1;
	mysql.insertData('bid_details', {
		'listing_id' : listing_id,
		'checkin' : checkin,
		'checkout' : checkout,
		'bid_amount' : bid_amount,
		'bidder_id' : userId,
		'no_of_guests' : no_of_guests
	}, (error, results) => {
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
	//var userId = req.session.user.userId;
	var userId = 1;

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

			var receipt_id = uuid.v1();
			console.log('receipt_id', receipt_id);

			//TO DO
			var cc_id = 1;
			console.log('trip', trip);
			console.log('trip.insertedID', trip.insertId);
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
					res.send({'statusCode' : 200});
				}
			})


			
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
				req.session.loggedInUser = userObject;
				res.send({
					'statusCode' : 200
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
	res.render('property');
});

router.get('/listing', function(req, res, next) {
	res.render('listing');
});

router.get('/searchListing', function(req, res, next) {

	var address = req.query.where;
	var guest = req.query.guest;
	var daterange = req.query.daterange;

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

		var query = "select * from property_details,listings INNER JOIN room_types ON listings.room_type_id = room_types.room_type_id WHERE property_details.property_id = listings.property_id AND property_details.longitude<=? AND longitude >= ? AND latitude<= ? AND latitude>=? AND listings.active != 0";
		var parameters = [ longitude_upper, longitude_lower, latitude_upper, latitude_lower ];

		var centerLatLng = {
			center_lat : center_lat,
			center_lng : center_lng
		};

		mysql.executeQuery(query, parameters, function(error, results) {
			var data = {
				results : results,
				centerLatLng : centerLatLng
			};
			console.log(error, results);
			if (error) {
				res.send({
					'statusCode' : 500
				});
			} else {
				if (results && results.length > 0) {
					// console.log(results);
					// res.render('searchListing', {data: JSON.stringify(data)});// 							
					res.render('searchListing', {
						data : JSON.stringify(data)
					}); // 							
					console.log(">>>>>>>>>>>>>><<<<<<<<<<<<<<<<<");
					console.log(data.results);
				} else {
					res.send({
						'statusCode' : 204
					});
				}
			}
		});
	});
});

router.get('/profile', function(req, res, next) {
	// var listing_id = req.body.listing_id;
	var owner = req.query.owner;

	//get property details of that user..
	mysql.fetchData('*', 'property_details', {
		'owner_id' : owner
	}, (error, property) => {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (property) {
				//get listing details as well..
				var query = "select * from property_details,property_types,room_types,listing_details,listings WHERE  listings.listing_id = ? AND listing_details.listing_id = ? AND listings.room_type_id = room_types.room_type_id AND listings.property_id = property_types.property_type_id AND listings.property_id = property_details.property_id";
				var parameters = [ owner, owner ];
				mysql.executeQuery(query, parameters, function(error, listing) {
					if (error) {
						/*res.send({
						    'statusCode' : 500
						});*/
					} else {
						if (listing) {
							//get trip informations. 
							var query = "select * from trip_details,property_details,listings WHERE trip_details.user_id = ? AND trip_details.listing_id= listings.listing_id AND listings.property_id=property_details.property_id";
							var parameters = owner;
							mysql.executeQuery(query, parameters, function(error, trip) {
								if (error) {
									res.send({
										'statusCode' : 500
									});
								} else {
									if (trip) {
										//get users info who made trip on that owner's property.
										var query = "select * from trip_details,property_details,listings WHERE property_details.owner_id = ? AND listings.property_id=property_details.property_id AND trip_details.listing_id = listings.listing_id";
										var parameters = owner;
										mysql.executeQuery(query, parameters, function(error, tripped_user) {
											if (error) {
												res.send({
													'statusCode' : 500
												});
											} else {
												if (tripped_user) {
													var result = {
														property_data : (property),
														listing_data : (listing),
														trip_data : (trip),
														tripped_user_data : (tripped_user)
													}
													//transection is comleted here!
													res.render('profile', {
														data : JSON.stringify(result)
													});

												} else {
													res.send({
														'statusCode' : 500
													});
												}
											}
										})

									} else {
										res.send({
											'statusCode' : 500
										});
									}
								}
							})
						} else {
							/*res.send({
							    'statusCode' : 409
							});*/
						}
					}
				});
			} else {
				res.send({
					'statusCode' : 500
				});
			}
		}
	})

// res.render('profile');
});

module.exports = router;