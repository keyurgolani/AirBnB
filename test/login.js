var expect = require("chai").expect;
var request = require("request");
var sjcl = require("sjcl");

describe('Login test for user', function() {
	it('Test for invalid username and password', function(done) {
		request({
			url : "http://localhost:3000/login",
			method : "POST",
			json : true,
			body : {
				"email" : "kalgi.bhatt@yahoo.com",
				"password" : "admin123"
			}
		}, function(err, res, body) {
			expect(body.statusCode).to.equal(401);
			done();
		});
	});

})