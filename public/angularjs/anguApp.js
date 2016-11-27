var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete', 'ngMessages', 'ngRangeSlider', 'ngMap', 'nvd3' ])
	.config([ '$locationProvider', function($locationProvider) {
		$locationProvider.html5Mode({
			enabled : true,
			requireBase : false
		});
	}])
	.controller("searchBarController", function($scope, $http, $window) {
		$scope.city = '';
		$scope.options = {};
		$scope.options.watchEnter = true;

		$scope.$watch('city', function() {
			if ($scope.city !== undefined && typeof $scope.city !== 'string') {
				$window.location.href = '/searchListing?where='+$scope.city.formatted_address;
			}
		});
	})
	.controller('homepage', function() {
		
	})
	.controller('login', function($scope, $http, Random) {
		$scope.login = function() {
			console.log($scope.email);

			$http({
				method : "POST",
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
	})
	.controller('viewListing', function($scope, $http, Random, Date) {
		$scope.init = function(retrievedData) {
			var data = JSON.parse(retrievedData);
			$scope.data = JSON.parse(retrievedData);	
			console.log('$scope.data', $scope.data);
				

		}
		
		$scope.requestBooking = function() {
			$http({
				method : "POST",
				url : '/placeBidOnListing',
				data : {
					"checkin" : Date.formatToSQLWorthy($scope.chkInOutDate.split("-")[0].trim()),
					"checkout" : Date.formatToSQLWorthy($scope.chkInOutDate.split("-")[1].trim()), 
					"bid_amount" : $scope.bid_amount,
					"listing_id" : $scope.data.listing_id,
					"userId" : 1,
					"guests" : $scope.noOfGuests
				}
			}).then((results) => {
				if(results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}
		
		$scope.instantBooking = function() {
			$http({
				method : "POST",
				url : '/instantBook',
				data : {
					"checkin" : Date.formatToSQLWorthy($scope.chkInOutDate.split("-")[0].trim()),
					"checkout" : Date.formatToSQLWorthy($scope.chkInOutDate.split("-")[1].trim()), 
					"listing_id" : $scope.data.listing_id,
					"userId" : 1,
					"guests" : $scope.noOfGuests,
					"trip_amount" : $scope.data.daily_price
				}
			}).then((results) => {
				if(results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}
	})

	.controller('profile', ($scope, $http) => {

		$scope.init = function(retrievedData) {
           console.log("here")
           var data = JSON.parse(retrievedData);
           console.log(data.listing_data[0]);

           // $scope.data = JSON.parse(retrievedData);
		}	
		
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
			console.log($scope.house_rules);
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
		$scope.signUpWithEmail = function() {
			$scope.emailSignUp = true;
			$scope.beforeSignUp = false;
		};

		// $scope.f_name
		// console.log('$scope.f_name', $scope.f_name);

		// $scope.$watch('f_name', function(){
	
		// 	console.log('$scope.f_name', $scope.f_name);
			
			
		// });
		// $scope.$watch('l_name', function(){
	
		// 	console.log('$scope.l_name', $scope.l_name);
			
		// });
		// $scope.$watch('email', function(){
			
		// 	console.log('$scope.email', $scope.email);
			
		// });
		// $scope.$watch('password', function(){
	
		// 	console.log('$scope.password', $scope.password);

		// });
		// $scope.$watch('month', function(){
	
		// 	console.log('$scope.month', $scope.month);
			
		// });


		$scope.signUp = function(){
			//sending new user data to node
			$http({

				url: '/register',
				method: 'POST',
				data : {
					'email'    : $scope.email,
					'firstname': $scope.f_name,
					'lastname' : $scope.l_name,
					'password' : $scope.password,
					'month'    : $scope.month,
					'day'      : $scope.day,
					'year'     : $scope.year
				}

			}).then(function mySuccess(response){
				console.log("Sign Up Done !!");
			}, function myError(response){
				console.log("Could not register !!");
			});			
		};



	})
	.controller('navBarController', function($scope, $http, Random) {
		$scope.getHomePage = function(){
			window.location.assign('/');
		};
	})
	.controller('lineBarController', function($scope, $http, Random) {

		$scope.options = {
            chart: {
                type: 'linePlusBarChart',
                height: 500,
                margin: {
                    top: 30,
                    right: 75,
                    bottom: 50,
                    left: 75
                },
                bars: {
                    forceY: [0]
                },
                bars2: {
                    forceY: [0]
                },
                color: ['#2ca02c', 'darkred'],
                x: function(d,i) { return i },
                xAxis: {
                    axisLabel: 'X Axis',
                    tickFormat: function(d) {
                        var dx = $scope.data[0].values[d] && $scope.data[0].values[d].x || 0;
                        if (dx > 0) {
                            return d3.time.format('%x')(new Date(dx))
                        }
                        return null;
                    }
                },
                x2Axis: {
                    tickFormat: function(d) {
                        var dx = $scope.data[0].values[d] && $scope.data[0].values[d].x || 0;
                        return d3.time.format('%b-%Y')(new Date(dx))
                    },
                    showMaxMin: false
                },
                y1Axis: {
                    axisLabel: 'Y1 Axis',
                    tickFormat: function(d){
                        return d3.format(',f')(d);
                    },
                    axisLabelDistance: 12
                },
                y2Axis: {
                    axisLabel: 'Y2 Axis',
                    tickFormat: function(d) {
                        return '$' + d3.format(',.2f')(d)
                    }
                },
                y3Axis: {
                    tickFormat: function(d){
                        return d3.format(',f')(d);
                    }
                },
                y4Axis: {
                    tickFormat: function(d) {
                        return '$' + d3.format(',.2f')(d)
                    }
                }
            }
        };

        $http.get('../analytics/admin/lineBarData.json')
        .then(function(res){
			$scope.data = res.data.map(function(series) {
				series.values = series.values.map(function(d) { return {x: d[0], y: d[1] } });
				return series;
			});
        });

	})
	.controller('adminSunController', function($scope, $http, Random) {
		

			$scope.options = {
			    chart: {
			        type: 'sunburstChart',
			        height: 700,
			        color: d3.scale.category20c(),
			        duration: 250
			    }
			};

			$http.get('../analytics/admin/sunData.json')
	        .then(function(res){
	          $scope.data = res.data;
	        });

	})
	.controller('adminPieController', function($scope, $http, Random) {
		console.log("from admin pie controller");

		$scope.options = {
            chart: {
                type: 'pieChart',
                height: 500,
                x: function(d){return d.key;},
                y: function(d){return d.y;},
                showLabels: true,
                duration: 500,
                labelThreshold: 0.01,
                labelSunbeamLayout: true,
                legend: {
                    margin: {
                        top: 5,
                        right: 35,
                        bottom: 5,
                        left: 0
                    }
                }
            }
        };


        //file to fetch admin analytical data from
        $http.get('../analytics/admin/data.json')
        .then(function(res){
          $scope.data = res.data;                
        });

	})
	.controller('adminBarController', function($scope, $http, Random) {
		console.log("from admin bar controller");



		  $scope.options = {
            chart: {
                type: 'historicalBarChart',
                height: 450,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 65,
                    left: 50
                },
                x: function(d){return d[0];},
                y: function(d){return d[1]/100000;},
                showValues: true,
                valueFormat: function(d){
                    return d3.format(',.1f')(d);
                },
                duration: 100,
                xAxis: {
                    axisLabel: 'X Axis',
                    tickFormat: function(d) {
                        return d3.time.format('%x')(new Date(d))
                    },
                    rotateLabels: 30,
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Y Axis',
                    axisLabelDistance: -10,
                    tickFormat: function(d){
                        return d3.format(',.1f')(d);
                    }
                },
                tooltip: {
                    keyFormatter: function(d) {
                        return d3.time.format('%x')(new Date(d));
                    }
                },
                zoom: {
                    enabled: true,
                    scaleExtent: [1, 10],
                    useFixedDomain: false,
                    useNiceScale: false,
                    horizontalOff: false,
                    verticalOff: true,
                    unzoomEventType: 'dblclick.zoom'
                }
            }
        };
		//file to fetch admin analytical data from
        $http.get('../analytics/admin/barData.json')
        .then(function(res){
          $scope.data = res.data;                
        });

	})
	.controller('searchListingController', function($scope, $http, Random, $interval, NgMap) {
		
		$scope.init = function(retrievedData) {
  		  
  		  var data = JSON.parse(retrievedData);
  		  // console.log("Data: ", data);

			$scope.data = JSON.parse(retrievedData);

			// console.log(" >>><<<  >>><<<  >>><<< ");
			// console.log('$scope.data', $scope.data);
			// console.log('$scope.data', $scope.data.results.length);

			var maxRange = 0;

			for(var j = 0 ; j < $scope.data.results.length; j++){

				if($scope.data.results[j].daily_price > maxRange){
					maxRange = $scope.data.results[j].daily_price;
				}

			}

			// console.log('maxRange', maxRange);



			$scope.range = { from: 0, to: maxRange };
	       	$scope.max = maxRange;


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
	.service('Validation', function() {
		this.validateTextArea = function(value) {
			if(value.length > 10000) {
				return false;
			} else {
				return true;
			}
		};

		this.validateTextBox = function(value) {
			if(value.length > 100) {
				return false;
			} else {
				return true;
			}
		};
		this.validateCount = function(value) {
			var count_validator = new RegExp(/^\d$/);
			if(value.match(count_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validatePrice = function(value) {
			var price_validator = new RegExp(/^\d+(,\d{1,2})?$/);
			if(value.match(price_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateDateRange = function(value) {
			var date_range_validator = new RegExp(/^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d\s-\s(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d$/);
			if(value.match(date_range_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateCity = function(value) {
			var city_validator = new RegExp(/^[a-zA-Z]+(?:(?:\\s+|-)[a-zA-Z]+)*$/);
			if(value.match(city_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateZip = function(value) {
			var zip_validator = new RegExp(/^\d{5}([\-]?\d{4})?$/);
			if(value.match(zip_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateState = function(value) {
			var state_validator = new RegExp(/^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\sHampshire|New\sJersey|New\sMexico|New\sYork|North\sCarolina|North\sDakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\sIsland|South\sCarolina|South\sDakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\sVirginia|Wisconsin|Wyoming)$/);
			if(value.match(state_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateEmail = function(value) {
			var email_validator = new RegExp(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);
			if(value.match(email_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateYear = function(value) {
			var year_validator = new RegExp(/^\d{4}$/);
			if(value.match(email_validator) !== null) {
				if(Number(value) > new Date().getFullYear()) {
					return false;
				} else {
					return true;

				}
			} else {
				return false;
			}
		};
		this.validatePassword = function(value) {
			var password_validator = new RegExp(/^[A-Za-z0-9_-]{6,18}$/);
			if(value.match(password_validator) !== null) {
				return true;
			} else {
				return false;
			}
		}
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
