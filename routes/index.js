var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');
var logger = require('../utils/logger');
var cache = require('../utils/cache');
var bcrypt = require('bcrypt');

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
	var room_type_id = req.body.room_type.room_type_id;
	var title = req.body.title;
	var is_bid = req.body.is_bid;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;
	var daily_price = req.body.daily_price;
	var bedrooms = req.body.bedrooms;
	var accommodations = req.body.accommodations;
	var active = true;	//A listing is active by default at the time of adding new listing
	
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
		console.log(error, listing_insert_result);
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
					if(error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if(listing_details_insert_result.affectedRows === 1) {
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
		if(error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if(results && results.length > 0) {
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

router.post('/fetchAmenities', (req, res, next) => {
	mysql.fetchData('amenity_id, amenity', 'amenities', null, (error, results) => {
		if(error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if(results && results.length > 0) {
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

router.post('/fetchPropertyTypes', (req, res, next) => {
	mysql.fetchData('property_type_id, property_type', 'property_types', null, (error, results) => {
		if(error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if(results && results.length > 0) {
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

router.get('/viewListing', function(req, res, next) {
	res.render('viewListing');
});

module.exports = router;