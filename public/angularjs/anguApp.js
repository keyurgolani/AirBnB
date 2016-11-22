var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete', 'ngMessages', 'ngRangeSlider' ])
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
		console.log('$scope.emailSignUp', $scope.emailSignUp);

		$scope.signUpWithEmail = function(){
			$scope.emailSignUp = true;
			console.log('$scope.emailSignUp', $scope.emailSignUp);
			$scope.beforeSignUp = false;
		};
	})
	.controller('searchListingController', function($scope, $http, Random) {
		
		$scope.init = function(stringifiedArray) {
  		  var data = JSON.parse(stringifiedArray);
  		  console.log(data);
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
	}).controller('IndexController', function($scope, $http, Random) {

        $scope.range = { from: 0, to: 100 };
       	$scope.max = 100; 

       	var min,max;

       	$scope.from = function(){
       		min = ($scope.min);       		
       	}
       	$scope.to = function(){
       		max = ($scope.max);       		
       	}
       	$scope.click = function(){
       		
       		$http({			
				method: "POST",
				url : '/cart',
				data : {
					"obj" : x,
					"qty" : $scope.qty,
					"check" : "cart"
				}
							
			}).success(function(data){
				if (data.success == 200) {
					console.log("done");
					window.location.assign('cart');
								
				}else{
					alert("Please sign-in first!");
					window.location.assign('signin');
					
				}
			});       		
       	}       	
    });

 