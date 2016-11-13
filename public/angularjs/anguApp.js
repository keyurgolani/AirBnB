var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if' ])
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