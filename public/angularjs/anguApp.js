var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete' ])
	.config([ '$locationProvider', function($locationProvider) {
		$locationProvider.html5Mode({
			enabled : true,
			requireBase : false
		});
	} ])
	.controller("searchBarController", function($scope, $http) {
		$scope.city = '';
		$scope.options = {};
		$scope.options.watchEnter = true;

		$scope.$watch('city', function() {
			if ($scope.city.trim() !== undefined && $scope.city.trim() !== "") {
				console.log($scope.city);
				//				$http({
				//					// Search Request!
				//				})
			}
		});

	})


	.controller('homepage', function($scope, $http, Random) {
		$scope.randomPassword = Random.randomString(25);

	})
	.controller('header', function($scope, $http, Random) {
		$scope.randomPassword = Random.randomString(25);

	})
	.controller('footer', function($scope, $http, Random) {
		$scope.randomPassword = Random.randomString(25);
	})
	.controller('listing', function($scope, $http, Random) {
		$scope.randomPassword = Random.randomString(25);
	})
	.controller('signUpController', function($scope, $http, Random) {
		$scope.emailSignUp = false;
		$scope.beforeSignUp = true;
		console.log('$scope.emailSignUp', $scope.emailSignUp);

		$scope.signUpWithEmail = function(){
			$scope.emailSignUp = true;
			console.log('$scope.emailSignUp', $scope.emailSignUp);
			$scope.beforeSignUp = false;
		};
	})
	.directive('ngEnter', function() {
		return function(scope, element, attrs) {
			element.bind("keydown keypress", function(event) {
				if (event.which === 13) {
					scope.$apply(function() {
						scope.$eval(attrs.ngEnter);
					});
					event.preventDefault();
				}
			});
		};
	})
	.directive('ngEncrypt', function() {
		return {
			restrict : 'A',
			require : 'ngModel',
			link : function(scope, elem, attrs, ngModel) {
				ngModel.$parsers.push(function(value) {
					return sjcl.encrypt(scope.randomPassword, value);
				});
			}
		};
	})
	.service('Random', function() {
		this.randomString = function(length) {
			var generatedString = "";
			var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
			for (var i = 0; i < length; i++) {
				generatedString += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return generatedString;
		};
	})

	
	.controller('sell', function($scope, $http, Random) {
	$scope.name = ["house", "apartment", "hostel"];	
	console.log('inside');

	$scope.property = function(){
		console.log("now in property function!");
		console.log($scope.property_type);

		$http({			
			method: "POST",
			url : '/property_post',
			data : {
				
				"property_type" : $scope.property_type,
				"room_type" : $scope.room_type,
				"rules" : $scope.rules,
				"address":$scope.address				
			}	

						
		}).success(function(data){
			if (data.statusCode === 401) {
				alert("Please enter correct details");
				// window.location.assign("/property_info");
			}
			else
				//Making a get call to the '/redirectToHomepage' API
				alert("Property listing is successful!");
				// window.location.assign("/home");
			
		}).error(function(error){
			console.log(data.msg);
			// $scope.result = data.msg;			
		});
	};
})

	.controller('login', function($scope, $http, Random) {
	
	$scope.login = function(){
		console.log($scope.email);
	
		$http({			
			method: "POST",
			url : '/login',
			data : {				
				"email" : $scope.email,
				"password" : $scope.password								
			}							
		}).then((results) => {
			console.log("Results", results);
		}, (error) => {
			console.log("Error", error);
		})
	};
});