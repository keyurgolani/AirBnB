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
	.controller('viewListing', function($scope, $http, Random) {
		$scope.randomPassword = Random.randomString(25);
	})
	.controller('profile', function($scope, $http, Random) {
		$scope.randomPassword = Random.randomString(25);
	})
	.controller('addProperty', ($scope, $http) => {
		$scope.page = 1;
		$scope.fetchRoomTypes = () => {
			$http({
				method : "POST",
				url : "/fetchRoomTypes"
			}).then((result) => {
				$scope.room_types = result.data.room_types;
			}, (error) => {
				$scope.room_types = [];
			})
		}

		$scope.fetchPropertyTypes = () => {
			$http({
				method : "POST",
				url : "/fetchPropertyTypes"
			}).then((result) => {
				$scope.property_types = result.data.property_types;
			}, (error) => {
				$scope.property_types = [];
			})
		}
		$scope.addProperty = () => {
			$http({
				method : "POST",
				url : "/addProperty",
				data : {
					'property_type' : $scope.property_type,
					'house_rules' : $scope.house_rules,
					'location' : {
						'longitude' : $scope.addressDetails.geometry.location.lng(),
						'latitude' : $scope.addressDetails.geometry.location.lat(),
						'st_address' : $scope.addressDetails.address_components[0].long_name + ' ' + $scope.addressDetails.address_components[1].long_name,
						'apt' : $scope.apt,
						'city' : $scope.addressDetails.address_components[3].long_name,
						'state' : $scope.addressDetails.address_components[5].long_name,
						'zip' : $scope.addressDetails.address_components[7].long_name
					}
				}
			}).then((result) => {
				if (result.data.statusCode === 200) {

				}
			}, (error) => {

			})
		}

		$scope.$watch('addressDetails', function() {
			if ($scope.addressDetails !== undefined && typeof $scope.addressDetails != 'string') {
				$scope.city = $scope.addressDetails.address_components[3].long_name;
				$scope.state = $scope.addressDetails.address_components[5].long_name;
				$scope.zip = $scope.addressDetails.address_components[7].long_name;
			}
		});

		$scope.fetchPropertyTypes();
		$scope.fetchRoomTypes();

	})
	.controller('addListing', ($scope, $http, $location, Date) => {
		$scope.page = 1;
		$scope.fetchAmenities = () => {
			$http({
				method : "POST",
				url : "/fetchAmenities"
			}).then((result) => {
				$scope.amenities = result.data.amenities;
			}, (error) => {
				$scope.amenities = [];
			})
		}

		$scope.fetchRoomTypes = () => {
			$http({
				method : "POST",
				url : "/fetchRoomTypes"
			}).then((result) => {
				$scope.room_types = result.data.room_types;
			}, (error) => {
				$scope.room_types = [];
			})
		}

		$scope.addListing = () => {
			$http({
				method : "POST",
				url : "/addListing",
				data : {
					'property_id' : $location.search().property,
					'room_type' : $scope.room_type,
					'title' : $scope.title,
					'is_bid' : Boolean($scope.is_bid),
					'start_date' : Date.formatToSQLWorthy($scope.dates.split("-")[0].trim()),
					'end_date' : Date.formatToSQLWorthy($scope.dates.split("-")[1].trim()),
					'daily_price' : $scope.price,
					'bedrooms' : $scope.number_of_bedrooms,
					'accommodations' : $scope.number_of_guests,
					'description' : $scope.description,
					'bathrooms' : $scope.number_of_bathrooms,
					'beds' : $scope.number_of_beds,
					'checkin' : '2:00',
					'checkout' : '11:00'
				}
			}).then((result) => {
				if (result.data.statusCode === 200) {

				}
			}, (error) => {

			})
		}

		$scope.fetchRoomTypes();
		$scope.fetchAmenities();
	})
	.controller('signUpController', function($scope, $http, Random) {
		$scope.emailSignUp = false;
		$scope.beforeSignUp = true;
		console.log('$scope.emailSignUp', $scope.emailSignUp);

		$scope.signUpWithEmail = function() {
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
	.service('Date', function() {
		this.formatToSQLWorthy = function(dateString) {
			var date = new Date(dateString);
			var day = date.getDate();
			var month = date.getMonth();
			var year = date.getFullYear();
			return year + '-' + (month + 1) + '-' + day;
		}
	});