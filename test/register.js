var expect = require("chai").expect;
var request = require("request");
var sjcl = require("sjcl");

describe('Test for new user', function() {
	it('Test parameters', function(done) {
		request({
			url : "http://localhost:3000/register",
			method : "POST",
			json : true,
			body : {
				"email"				:	"kalgi.bhatt@yahoo.com",
				"password"			:	"admin",
				"firstname"				:	"Kalgi",
				"lastname"				:	"Bhatt",
				"month" 		: 	"October",
				"day" 		: 	"8",
				"year" 		: 	"1993"
			}
		}, function(err, res, body) {
			expect(body.statusCode).to.equal(409);
			done();
		});
	});

})