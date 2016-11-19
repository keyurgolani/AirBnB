var express = require('express');
var router = express.Router();
var properties = require('properties-reader')('properties.properties');
var cache = require('../utils/cache');
var mongo = require("../utils/mongo");
var mongoURL = "mongodb://localhost:27017/tpdb";
//var Binary = require('mongodb').Binary;

/* GET home page. */
router.get('/', function(req, res, next) {
	cache.fetchItem('user', 1, function(userID, callback) {
		console.log('----------------------Missed Logic!!!---------------------------');
		callback('Keyur Golani');
	}, function(result) {
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
});

module.exports = router;