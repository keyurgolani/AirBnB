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
.controller('fileUploadCtrl', function($scope, $http, Random) {
	$scope.randomPassword = Random.randomString(25);
	/*$scope.data = 'none';
    $scope.add = function(){
      var f = document.getElementById('file').files[0];
//      if(f.length > 0) {
          console.log(f.name);
          alert("Hii");
          console.log(f.size);
          console.log(f.val());
//      }
       var r = new FileReader();
      r.onloadend = function(e){
        $scope.data = e.target.result;
      }
      r.readAsBinaryString(f);
    }*/

	/*$scope.readURLVideo = function(input) {
        if (input.files && input.files[0]) {

            var reader = new FileReader();

            reader.onload = function (e) {
                $('#myvideo')
                    .attr('src', e.target.result)
                    .width(270)
                    .height(200);

                document.getElementById('hiddenvideo').value = e.target.result;
            };

            reader.readAsDataURL(input.files[0]);
            alert(reader.readAsDataURL(input.files[0]));
        }
    }*/
	
	$scope.addMedia = function(){

        $http({
            method:'POST',
            url:'/api/addVideo',
            data:{
            	video: document.getElementById("hiddenvideo").value,

            }
        }).success(function(data){

            if(data.statusCode===200)
            {
                console.log("finally success");

            }
            else
            {

            }

        }).error(function(error){
            console.log('err');
        });
    };
    
    $scope.getVideo = function(){

        $http({
            method:'POST',
            url:'/api/getVideo',
        }).success(function(data){

            if(data.statusCode===200)
            {
                $scope.myVideo = data.result[0].video;
                document.getElementById("myvideo").src = data.result[0].video;
            }
            else
            {
                console.log("some other video");
            }

        }).error(function(error){
            console.log('err');
        });

    };
    
    $scope.addMediaImg = function(){

        $http({
            method:'POST',
            url:'/api/addImage',
            data:{
            	image: document.getElementById("hiddenimage").value,

            }
        }).success(function(data){

            if(data.statusCode===200)
            {
                console.log("finally success");

            }
            else
            {

            }

        }).error(function(error){
            console.log('err');
        });
    };
    
    $scope.getImg = function(){

        $http({
            method:'POST',
            url:'/api/getImage',
        }).success(function(data){

            if(data.statusCode===200)
            {
                $scope.myVideo = data.result[0].image;
                document.getElementById("myimage").src = data.result[0].image;
            }
            else
            {
                console.log("some other image");
            }

        }).error(function(error){
            console.log('err');
        });

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
