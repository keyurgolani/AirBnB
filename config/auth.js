// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

	'facebookAuth' : {
		'clientID' 		: '216117032127209', // your App ID
		'clientSecret' 	: 'a59cde63d75c962abaa9689f7e25d13e', // your App Secret
		'callbackURL' 	: 'http://localhost:3000/auth/facebook/callback',
		// 'profileFields': "[id, displayName,'email']";
		// 'profileFields': "['emails']",
		// 'enableProof': 'true'
	},

	'twitterAuth' : {
		'consumerKey' 		: 'your-consumer-key-here',
		'consumerSecret' 	: 'your-client-secret-here',
		'callbackURL' 		: 'http://localhost:3000/auth/twitter/callback'
	},

	'googleAuth' : {
		'clientID' 		: 'your-secret-clientID-here',
		'clientSecret' 	: 'your-client-secret-here',
		'callbackURL' 	: 'http://localhost:3000/auth/google/callback'
	}

};