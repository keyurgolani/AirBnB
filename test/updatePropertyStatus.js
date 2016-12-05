var expect = require("chai").expect;
var request = require("request");
var sjcl = require("sjcl");

describe('Test for changing property status', function() {
	it('Update Property Status', function(done) {
		request({
			url : "http://localhost:3000/changePropertyStatus",
			method : "POST",
			json : true,
			body : {
				"status" : "activate",
				"property_id" : "1"
			}
		}, function(err, res, body) {
			expect(body.statusCode).to.equal(200);
			done();
		});
	});
})