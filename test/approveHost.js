var expect = require("chai").expect;
var request = require("request");
var sjcl = require("sjcl");

describe('Test for approval of the host', function() {
	it('Host approval', function(done) {
		request({
			url : "http://localhost:3000/approveHost",
			method : "POST",
			json : true,
			body : {
				"user_id" : "1"
			}
		}, function(err, res, body) {
			expect(body.statusCode).to.equal(200);
			done();
		});
	});
})