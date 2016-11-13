var express = require('express');
var router = express.Router();
var properties = require('properties-reader')('properties.properties');
var cache = require('../utils/cache');

/* GET home page. */
router.get('/', (req, res, next) => {
	cache.fetchItem('user', 1, (item_id, callback) => {
		callback('Keyur Golani');
	},(result) => {
		res.render('index', {
			title : result
		});
	});
});

module.exports = router;