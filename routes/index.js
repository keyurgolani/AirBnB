var express = require('express');
var router = express.Router();
var properties = require('properties-reader')('properties.properties');
var cache = require('../utils/cache');

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

module.exports = router;