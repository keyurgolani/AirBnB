var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');
var logger = require('../utils/logger');
var cache = require('../utils/cache');
var bcrypt = require('bcrypt');


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

router.post('/register', (req, res, next) => {
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
			if(results && results.length > 0) {
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
					}, (error, result) => {
						if (error) {
							next(500);
							res.send({
								'statusCode' : 500
							});
						} else {
							if (result.affectedRows === 1) {
								next(200);
								res.send({
									'statusCode' : 200
								});
							} else {
								next(500);
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

module.exports = router;