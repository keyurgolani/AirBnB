var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete', 'ngMessages', 'ngRangeSlider', 'ngMap' ])
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
				// console.log($scope.city);
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
		// console.log('$scope.emailSignUp', $scope.emailSignUp);

		$scope.signUpWithEmail = function(){
			$scope.emailSignUp = true;
			// console.log('$scope.emailSignUp', $scope.emailSignUp);
			$scope.beforeSignUp = false;
		};
	})
	.controller('searchListingController', function($scope, $http, Random, $interval, NgMap) {

		// var vm = this;
		// vm.positions = [
		// [54.779951, 9.334164], [47.209613, 15.991539],
		// [51.975343, 7.596731], [51.97539, 7.596962], 
		// [47.414847, 8.23485], [47.658028, 9.159596],
		// [47.525927, 7.68761], [50.85558, 9.704403],
		// [54.320664, 10.285977], [49.214374, 6.97506],
		// [52.975556, 7.596811], [52.975556, 7.596811],
		// [52.975556, 7.596811], [52.975556, 7.596811], 
		// [52.975556, 7.596811], [52.975556, 7.596811],
		// [52.975556, 7.596811], [52.975556, 7.596811],
		// [52.975556, 7.596811], [52.975556, 7.596811]];

		// vm.dynMarkers = []
		// NgMap.getMap().then(function(map) {
		//   var bounds = new google.maps.LatLngBounds();
		//   for (var k in map.customMarkers) {
		//     var cm = map.customMarkers[k];
		//     vm.dynMarkers.push(cm);
		//     bounds.extend(cm.getPosition());
		//   };
		  
		//   vm.markerClusterer = new MarkerClusterer(map, vm.dynMarkers, {});
		//   map.setCenter(bounds.getCenter());
		//   map.fitBounds(bounds);  
		// });

		// console.log("===================================");
		// console.log($scope.data);

		
		$scope.init = function(retrievedData) {
  		  
  		  var data = JSON.parse(retrievedData);
  		  // console.log("Data: ", data);

			$scope.data = JSON.parse(retrievedData);
			// console.log('$scope.data', $scope.data);

			$scope.range = { from: 0, to: 100 };
	       	$scope.max = 100;


	       	var min,max;

	       	$scope.from = function(){
	       		min = ($scope.min);       		
	       	}
	       	$scope.to = function(){
	       		max = ($scope.max);       		
	       	}

	       	$scope.$watch('range', function(){
	       		
	       		console.log();
	        	// console.log('$scope.range', $scope.range);

	        	// $scope.data
	        	// console.log('$scope.data', $scope.data);

	        	$scope.propertyArray = $scope.data.results;
	        	// console.log('$scope.propertyArray', $scope.propertyArray);

	        	$scope.filteredResults  = $scope.propertyArray.filter(function(elem, index, array){

	        		return (elem.daily_price >= $scope.range.from && elem.daily_price <= $scope.range.to);
	        		
	        	});
	        		// console.log('$scope.filteredResults', $scope.filteredResults);

	       	});
		
		}
		
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