var express = require('express');
var router = express.Router();
var properties = require('properties-reader')('properties.properties');

/* GET home page. */
router.get('/', (req, res, next) => {
	res.render('index', {
		title : 'Express'
	});
});

module.exports = router;