var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete' ])
.config([ '$locationProvider', function($locationProvider) {
	$locationProvider.html5Mode({
		enabled : true,
		requireBase : false
	});
}])
.controller('homepage', function($scope, $http, Random) {
	$scope.randomPassword = Random.randomString(25);

})
.controller('header', function($scope, $http, Random) {
	$scope.randomPassword = Random.randomString(25);

})
.controller('footer', function($scope, $http, Random) {
	$scope.randomPassword = Random.randomString(25);

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
.directive('ngEncrypt', function(){
    return {
    	restrict: 'A',
        require: 'ngModel',
        link: function(scope, elem, attrs, ngModel) {
            ngModel.$parsers.push(function(value){
                return sjcl.encrypt(scope.randomPassword, value); 
            });
        }
    };
})
.service('Random', function() {
	this.randomString = function(length) {
		var generatedString = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < length; i++ ) {
			generatedString += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return generatedString;
	};
})
.controller("searchBarController",function ($scope, $http) {

    $scope.result1 = '';
    $scope.options1 = null;
    $scope.details1 = '';



    $scope.result2 = '';
    $scope.options2 = {
      country: 'ca',
      types: '(cities)'
    };    $scope.details2 = '';
    
    
    
    $scope.result3 = '';
    $scope.options3 = {
      country: 'gb',
      types: 'establishment'
    };
    $scope.details3 = '';
})
.controller("testController",function ($scope, $http) {

    $scope.result1 = '';
    $scope.options1 = null;
    $scope.details1 = '';



    $scope.result2 = 'hello';
    console.log('$scope.result2', $scope.result2);
    $scope.options2 = {
      country: 'ca',
      types: '(cities)'
    };    $scope.details2 = '';
    
    
    
    $scope.result3 = '';
    $scope.options3 = {
      country: 'gb',
      types: 'establishment'
    };
    $scope.details3 = '';
});