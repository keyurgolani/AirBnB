var express = require('express');
var router = express.Router();
var mysql = require('../utils/dao');
var properties = require('properties-reader')('properties.properties');
var logger = require('../utils/logger');
var cache = require('../utils/cache');
var mongo = require("../utils/mongo");
var mongoURL = "mongodb://localhost:27017/tpdb";
//var Binary = require('mongodb').Binary;
var bcrypt = require('bcrypt');

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

router.get('/fileUpload', function(req, res, next) {
	res.render('fileUpload', {
		title : 'fileUpload'
	});
});

router.get('/fileUpload', function(req, res, next) {
	res.render('fileUpload', {
		title : 'fileUpload'
	});
	
});

router.post('/api/addVideo', function(req, res, next) {
	 mongo.connect(mongoURL,function(){
		 var coll = mongo.collection('videocollection');
		 console.log("mongoURL : " + mongoURL + " Collection is : " + coll);
		 var videoStr = req.param("video");
//		 var invoice = {};
//		 invoice.bin = Binary(videoStr);

//	 console.log("VIDEO : " + invoice);
		 coll.insert({"username": "ishaG", "video":videoStr},function(err,data){
	          if(err)
	          {
	        	  console.log("Error : " + err);
	              json_responses = {
	                  statusCode : 401
	              };
	              res.send(json_responses);
	          }
	           else
	          {
	        	   console.log(data);

	              json_responses = {
	                  statusCode : 200
	              };
	              res.send(json_responses);
	          }
	       });
	    });
});

router.post('/api/getVideo', function(req, res, next) {
	mongo.connect(mongoURL,function(){
		 var coll = mongo.collection('videocollection');
		 coll.find({"username":"ishaG"}).toArray(function(err,data){
           if(err)
           {
        	   console.log("Error : " + err);
               json_responses = {
                   statusCode : 401
               };
               res.send(json_responses);
           }
           else
           {
               if(data.length>0)
               {
                   json_responses = {
                       statusCode : 200,
                       result:data
                   };
                   res.send(json_responses);
               }
               else
               {
                   json_responses = {
                       statusCode : 200,
                       isMediaPresent:false
                    };
                   res.send(json_responses);

               }
           }
        });
    });
});

router.post('/api/addImage', function(req, res, next) {
	 mongo.connect(mongoURL,function(){
		 var coll = mongo.collection('imagecollection');
		 console.log("mongoURL : " + mongoURL + " Collection is : " + coll);
		 var imageStr = req.param("image");
//		 var invoice = {};
//		 invoice.bin = Binary(imageStr);

//	 console.log("VIDEO : " + invoice);
		 coll.insert({"username": "ishaG", "image":imageStr},function(err,data){
	          if(err)
	          {
	        	  console.log("Error : " + err);
	              json_responses = {
	                  statusCode : 401
	              };
	              res.send(json_responses);
	          }
	           else
	          {
	        	   console.log(data);

	              json_responses = {
	                  statusCode : 200
	              };
	              res.send(json_responses);
	          }
	       });
	    });
});

router.post('/api/getImage', function(req, res, next) {
	mongo.connect(mongoURL,function(){
		 var coll = mongo.collection('imagecollection');
		 coll.find({"username":"ishaG"}).toArray(function(err,data){
          if(err)
          {
       	   console.log("Error : " + err);
              json_responses = {
                  statusCode : 401
              };
              res.send(json_responses);
          }
          else
          {
              if(data.length>0)
              {
                  json_responses = {
                      statusCode : 200,
                      result:data
                  };
                  res.send(json_responses);
              }
              else
              {
                  json_responses = {
                      statusCode : 200,
                      isMediaPresent:false
                   };
                  res.send(json_responses);

              }
          }
       });
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
					}, function(error, result) {
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
});

module.exports = router;