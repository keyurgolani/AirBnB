var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');
var logger = require('../utils/logger');
var cache = require('../utils/cache');
var NodeGeocoder = require('node-geocoder');
var GeoPoint = require('geopoint');
// var bcrypt = require('bcrypt');


/* GET home page. */
router.get('/', function(req, res, next) {
	cache.fetchItem('user', 1, function(userID, callback) {
		console.log('----------------------Missed Logic!!!---------------------------');
		callback('Keyur Golani');
	}, function(result) {
		console.log('----------------------Process Result!!!---------------------------');
		res.render('index', {
			title : result
		});
	});
});

router.post('/addProperty', (req, res, next) => {
	console.log(req.body);
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
		console.log(error, result);
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
	}, function(error, results) {
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
						'secret' : bcrypt.hashSync(secret, salt),
						'salt' : salt,
						'last_login' : require('fecha').format(Date.now(), 'YYYY-MM-DD HH:mm:ss')
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
				}
			}
		}
	});

});

router.post('/fetchPropertyListings', function(req, res, next) {
	var city = req.body.cityname;
	var state = req.body.statename;
	var query = "select * from property_details inner join listings on property_details.property_id = listings.property_id";
	mysql.fetchData('*', 'property_details', {
		'city' : city, 'state' : state
	}, function(error, results) {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				mysql.executeQuery(query,  function(error, results2) {
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						res.send({
							'statusCode' : 200,
							'property_listings' : results,
							'listings' : results2
						});
					}
				});
			} else {
				res.send({
					'statusCode' : 409
				});
			}
		}
	});
});

router.post('/fetchListingDetails', function(req, res, next) {
	var listing_id = req.body.listing_id;

	mysql.fetchData('*', 'listing_details', {
		'listing_id' : listing_id
	}, function(error, results) {
		if (error) {
			res.send({
				'statusCode' : 500
			});
		} else {
			if (results && results.length > 0) {
				res.send({
					'statusCode' : 200,
					'listing_details' : results[0]
				});
			} else {
				res.send({
					'statusCode' : 409
				});
			}
		}
	});
});

router.get('/listing', function(req, res, next) {
	res.render('listing');
});


router.get('/mapsTest', function(req, res, next) {
	res.render('mapsTest');
});


router.get('/searchListing', function(req, res, next) {
	
	var address = req.query.where;
	var guest = req.query.guest;
	var daterange = req.query.daterange;


	// console.log(location,guest,daterange);

	var options = {
		  provider: 'google',
		 
		  // Optional depending on the providers 
		  httpAdapter: 'https', // Default 
		  apiKey: 'AIzaSyA67uROXPqm2Nnfg5HOTHttn2C7QRn1zIo', // for Mapquest, OpenCage, Google Premier 
		  formatter: null         // 'gpx', 'string', ... 
		};
		




		var geocoder = NodeGeocoder(options);
		 
		// Using callback 
		geocoder.geocode(address, function(err, georesult) {

//			console.log(georesult[0].longitude);


			var longitude = Number ((georesult[0].longitude)*Math.PI /180);
			// console.log("<><><><><><><><><><><><><><><><><><><>");
			// console.log('georesult[0].longitude', georesult[0].longitude);
			// console.log('longitude', longitude);
			var latitude = Number((georesult[0].latitude)*Math.PI /180);
			// console.log('georesult[0].latitude', georesult[0].latitude);
			// console.log('latitude', latitude);

			center_lat = georesult[0].latitude;
			center_lng = georesult[0].longitude;


			var locat = new GeoPoint(georesult[0].latitude, georesult[0].longitude);

			var bouningcoordinates = locat.boundingCoordinates(10);

//			console.log(bouningcoordinates);

			var longitude_lower = bouningcoordinates[0]._degLon;
			var longitude_upper = bouningcoordinates[1]._degLon;
			var latitude_lower = bouningcoordinates[0]._degLat;
			var latitude_upper = bouningcoordinates[1]._degLat;

			// var query = "select * from property_details,listings WHERE property_details.property_id = listings.property_id AND property_details.longitude<="+longitude_upper+" AND longitude >= "+longitude_lower+" AND latitude<="+latitude_upper+" AND latitude>="+latitude_lower+"";
			// console.log(query);

			var query = "select * from property_details,listings WHERE property_details.property_id = listings.property_id AND property_details.longitude<=? AND longitude >= ? AND latitude<= ? AND latitude>=?";
			
			var parameters = [longitude_upper,longitude_lower,latitude_upper,latitude_lower];


			var centerLatLng = {
				center_lat : center_lat,
				center_lng : center_lng
			};

			mysql.executeQuery(query, parameters,function(error, results) {

				var data = {

					results : results,
					centerLatLng : centerLatLng

				};
				 console.log(error,results);
					if (error) {
						res.send({
							'statusCode' : 500
						});
					} else {
						if (results && results.length > 0) {
							// console.log(results);
							// res.render('searchListing', {data: JSON.stringify(data)});// 							
							res.render('searchListing', {data: JSON.stringify(data)});// 							
							console.log(data);
						} else {
							res.send({
								'statusCode' : 204
							});
						}
					}
				});
			});	

	
});

module.exports = router;