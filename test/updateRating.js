var expect = require("chai").expect;
var request = require("request");
var sjcl = require("sjcl");

describe('Test for updating rating by traveler', function() {
	it('Update Traveler Rating', function(done) {
		request({
			url : "http://localhost:3000/updateRating",
			method : "POST",
			json : true,
			body : {
				"rating" : 5,
				"trip" : 2,
				"is_host" : 1
			}
		}, function(err, res, body) {
			expect(body.statusCode).to.equal(200);
			done();
		});
	});
})