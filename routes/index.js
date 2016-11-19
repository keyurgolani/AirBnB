var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');

const winston = require('winston');
var logger = require('../utils/logger');
var crypto = require('crypto');
var uuid = require('node-uuid');
var Chance = require('chance');

var cache = require('../utils/cache');

var passport = require('passport');
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

router.get('/signup', function(req, res, next) {
	logger.log('info','inside /signup get');

	

	res.render('signup', {title : 'Signup'});
});

router.post('/signup_scccess', function(req, res, next) {
	logger.log('info','inside /signup_scccess post');
	var first_name = req.body.firstname;
	var last_name = req.body.lastname;
	var email = req.body.email;
	var get_password = req.body.password;
	var month = req.body.month;
	var day = req.body.day;
	var year = req.body.year;
	// password salt hash
	
	if(req.body.password == null || req.body.password == undefined){
		res.send({"statusCode" : 401});
	}
	var genRandomString = function(length){
	    return crypto.randomBytes(Math.ceil(length/2))
	            .toString('hex') /** convert to hexadecimal format */
	            .slice(0,length);   /** return required number of characters */
	};

	var sha512 = function(password, salt){
	    var hash = crypto.createHmac('sha512', salt); 														 
	    hash.update(password);
	    var value = hash.digest('hex');
	    return {
	        salt:salt,
	        passwordHash:value
	    };
	};
	
	var hashed_pass;
	var get_salt="";
	
	function saltHashPassword(userpassword) {
	    var salt = genRandomString(16); /** Gives us salt of length 16 */
	    var passwordData = sha512(userpassword, salt);
	    hashed_pass = passwordData.passwordHash;
	    get_salt = salt;
	}

	
	saltHashPassword(get_password);
	
	// var query_string = "INSERT INTO users SET ?";

	var chance = new Chance();
	var user_id = chance.ssn();
	console.log(user_id);
	
	var JSON_query = {
		"user_id" : user_id,
		"firstname" : first_name,
		"lastname" : last_name,
		"email" : email,
		"password" : hashed_pass,
		"salt" : get_salt,
		"month" : month,
		"day" : day,
		"year" : year		
	};

	console.log(JSON_query);


	var statusCode = 0;
	// insert signup data into DB

	var query_string = "INSERT INTO users SET ?";



		mysql.fetchData1(function(err, results) {
			console.log("here!");
			if (err) {
				statusCode = 401;
				throw err;			
			} else {
				if (results.affectedRows === 1) {
					logger.log('info','signup was successful');
					statusCode = 200;
				} else {
					logger.log('info','signup failed');
					statusCode = 401;
				}
			}
			res.send({"statusCode" : statusCode});
		}, query_string, JSON_query);

});

// facebook -------------------------------

		// send to facebook to do the authentication
		router.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email'] }));

		// handle the callback after facebook has authenticated the user
		router.get('/auth/facebook/callback',
			passport.authenticate('facebook', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));

// facebook -------------------------------

		// send to facebook to do the authentication
		router.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

		// handle the callback after facebook has authorized the user
		router.get('/connect/facebook/callback',
			passport.authorize('facebook', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));

	// google ---------------------------------

		/*// send to google to do the authentication
		router.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

		// the callback after google has authenticated the user
		router.get('/auth/google/callback',
			passport.authenticate('google', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));*/

	// locally --------------------------------
		/*router.get('/connect/local', function(req, res) {
			res.render('connect-local.ejs', { message: req.flash('loginMessage') });
		});d
		router.post('/connect/local', passport.authenticate('local-signup', {
			successRedirect : '/profile', // redirect to the secure profile section
			failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));*/

	
			
	// google ---------------------------------

		// send to google to do the authentication
		/*router.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

		// the callback after google has authorized the user
		router.get('/connect/google/callback',
			passport.authorize('google', {
				successRedirect : '/profile',
				failureRedirect : '/'
			}));*/

	// locally --------------------------------
		/*router.get('/connect/local', function(req, res) {
			res.render('connect-local.ejs', { message: req.flash('loginMessage') });
		});
		router.post('/connect/local', passport.authenticate('local-signup', {
			successRedirect : '/profile', // redirect to the secure profile section
			failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
			failureFlash : true // allow flash messages
		}));*/	

	function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/');
}	


module.exports = router;