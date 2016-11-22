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

router.post('/addProperty', (req, res, next) => {
	//	if(req.session.loggedInUser) {
	//		var owner_id = req.session.loggedInUser.user_id;
	var owner_id = 1;
	var property_type_id = req.body.property_type.property_type_id;
	var room_type_id = req.body.room_type.room_type_id;
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
		'room_type_id' : room_type_id,
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

router.get('/listing', function(req, res, next) {
	res.render('listing');
});


module.exports = router;