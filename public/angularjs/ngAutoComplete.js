'use strict';

/**
 * A directive for adding google places autocomplete to a text box
 * google places autocomplete info: https://developers.google.com/maps/documentation/javascript/places
 *
 * Simple Usage:
 *
 * <input type="text" ng-autocomplete="result"/>
 *
 * creates the autocomplete text box and gives you access to the result
 *
 *   + `ng-autocomplete="result"`: specifies the directive, $scope.result will hold the textbox result
 *
 *
 * Advanced Usage:
 *
 * <input type="text" ng-autocomplete="result" details="details" options="options"/>
 *
 *   + `ng-autocomplete="result"`: specifies the directive, $scope.result will hold the textbox autocomplete result
 *
 *   + `details="details"`: $scope.details will hold the autocomplete's more detailed result; latlng. address components, etc.
 *
 *   + `options="options"`: options provided by the user that filter the autocomplete results
 *
 *      + options = {
 *           types: type,        string, values can be 'geocode', 'establishment', '(regions)', or '(cities)'
 *           bounds: bounds,     google maps LatLngBounds Object
 *           country: country    string, ISO 3166-1 Alpha-2 compatible country code. examples; 'ca', 'us', 'gb'
 *         }
 *
 *
 */
angular.module("ngAutocomplete", [])
	.directive('ngAutocomplete', function($parse) {
		return {
			scope : {
				details : '=',
				ngAutocomplete : '=',
				options : '='
			},

			link : function($scope, element, attrs, model) {

				//options for autocomplete
				var opts

				//convert options provided to opts
				var initOpts = function() {
					opts = {}
					if ($scope.options) {
						if ($scope.options.types) {
							opts.types = []
							opts.types.push($scope.options.types)
						}
						if ($scope.options.bounds) {
							opts.bounds = $scope.options.bounds
						}
						if ($scope.options.country) {
							opts.componentRestrictions = {
								country : $scope.options.country
							}
						}
					}
				}
				initOpts()

				function deg2rad(deg) {
				  return deg * (Math.PI/180)
				}

				function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
				  var R = 6371; // Radius of the earth in km
				  var dLat = deg2rad(lat2-lat1);  // deg2rad below
				  var dLon = deg2rad(lon2-lon1); 
				  var a = 
				    Math.sin(dLat/2) * Math.sin(dLat/2) +
				    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
				    Math.sin(dLon/2) * Math.sin(dLon/2)
				    ; 
				  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
				  var d = R * c; // Distance in km
				  return d;
				}

				// 37.35410789999999
				// -121.95523559999998

				// 37.5482697
				// -121.98857190000001

				console.log('getDistanceFromLatLonInKm', getDistanceFromLatLonInKm(37.35410789999999, -121.95523559999998, 37.5482697, -121.98857190000001));


				//create new autocomplete
				//reinitializes on every change of the options provided
				var newAutocomplete = function() {
					$scope.gPlace = new google.maps.places.Autocomplete(element[0], opts);
					google.maps.event.addListener($scope.gPlace, 'place_changed', function() {
						$scope.$apply(function() {
							//              if ($scope.details) {
							$scope.details = $scope.gPlace.getPlace();
							//console.log($scope.details.geometry.location);
							console.log($scope.details.geometry.location.lat());

							// $scope.place1_lat = $scope.details.geometry.location.lat();
							// console.log('$scope.place1_lat', $scope.place1_lat);

							// $scope.placeOne
							// console.log('$scope.placeOne', $scope.placeOne);
							// console.log('$scope.placeTwo', $scope.placeTwo);
							

							console.log($scope.details.geometry.location.lng());
							//              }
							$scope.ngAutocomplete = element.val();
						});
					})
				}
				newAutocomplete()

				//watch options provided to directive
				$scope.watchOptions = function() {
					return $scope.options
				};
				$scope.$watch($scope.watchOptions, function() {
					initOpts()
					newAutocomplete()
					element[0].value = '';
					$scope.ngAutocomplete = element.val();
				}, true);
			}
		};
	});