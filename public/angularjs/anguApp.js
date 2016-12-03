var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete', 'ngMessages', 'ngRangeSlider', 'ngMap', 'nvd3', 'naif.base64', 'ng.deviceDetector', 'ui.utils.masks', 'daterangepicker', 'angular-carousel' ])
	.config([ '$locationProvider', function($locationProvider) {
		$locationProvider.html5Mode({
			enabled : true,
			requireBase : false
		});
	} ])
	.controller("searchBarController", function($scope, $http, $window) {
		$scope.city = '';
		// console.log('$scope.city', $scope.city);
		$scope.options = {
			country : 'usa',
			types : '(cities)'
		};
		$scope.options.watchEnter = true;
		$scope.$watch('city', function() {
			if ($scope.city !== undefined && (typeof ($scope.city)) !== 'string') {
				$window.location.href = '/searchListing?where=' + $scope.city.formatted_address;
			}
		});
	})
	.controller('homepage', function($scope, $window) {
		$window.document.title = 'Welcome to the World of Trips!';
		$scope.show_guests = false;
		$scope.today = new Date();
	})
	.controller('login', function($scope, $http, Random, deviceDetector,$rootScope) {
		$scope.global = $rootScope;
		$scope.deviceDetector = deviceDetector;
		$scope.login = function() {
			$http({
				method : "POST",
				url : '/login',
				data : {
					"email" : $scope.email,
					"password" : $scope.password,
					"user_agent" : deviceDetector
				}
			}).then((results) => {
				$rootScope.fetchLoggedInUser(function() {
				window.location.assign('/');
			});			
			}, (error) => {
				console.log("Error", error);
			});
		};


		$scope.host = function() {
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
	.controller('viewListing', function($scope, $http, $window, Random, Date) {
		$scope.init = function(retrievedData) {
			$scope.data = JSON.parse(retrievedData);
			
			$scope.nextPhoto = function() {
				if($scope.currentIndex === $scope.data.photos.length) {
					$scope.currentIndex = 1;
				} else {
					$scope.currentIndex = $scope.currentIndex + 1;
				}
				$scope.currentPhoto = $scope.data.photos[$scope.currentIndex - 1];
			};
			
			$scope.previousPhoto = function() {
				if($scope.currentIndex === 1) {
					$scope.currentIndex = $scope.data.photos.length;
				} else {
					$scope.currentIndex = $scope.currentIndex + 1;
				}
				$scope.currentPhoto = $scope.data.photos[$scope.currentIndex - 1];
			};
			
			$scope.currentIndex = 1;
			$scope.currentPhoto = $scope.data.photos[$scope.currentIndex - 1];
		}
		$window.document.title = data.title + ' | House Rentals in ' + data.city;

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
					"guests" : $scope.noOfGuests,
					"daily_price" : $scope.data.daily_price,
					"accommodations" : $scope.data.accommodations
				}
			}).then((results) => {
				if (results.data.statusCode === 200) {
					$scope.data.daily_price = results.data.updated_base_price;
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
				if (results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}
	})
	.controller('profile', ($scope, $http, $window, MonthNumber, $location, Validation, $rootScope) => {
		
		$scope.init = function(profileDetails) {
			$scope.data = JSON.parse(profileDetails);
			$window.document.title = $scope.data[0][0].f_name + ' ' + $scope.data[0][0].l_name + ' | Profile';
			$scope.st_address = $scope.data[0][0].city +', '+ $scope.data[0][0].state;
			$rootScope.fetchLoggedInUser(function() {
				$scope.isSameUser = ($rootScope.loggedInUser.user_id === $scope.data[0][0].user_id);
			});
			$scope.active_tab = 'profile_tab';
			$scope.genders = [ 'Male', 'Female', 'Other' ];
			$scope.months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
			$scope.dates = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31' ];
			$scope.years = [ '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005',
				'2004', '2003', '2002', '2001', '2000', '1999', '1998', '1997', '1996', '1995', '1994', '1993',
				'1992', '1991', '1990', '1989', '1988', '1987', '1986', '1985', '1984', '1983', '1982', '1981',
				'1980', '1979', '1978', '1977', '1976', '1975', '1974', '1973', '1972', '1971', '1970', '1969',
				'1968', '1967', '1966', '1965', '1964', '1963', '1962', '1961', '1960', '1959', '1958', '1957' ];

			$scope.get_month = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ];

			$scope.get_year = [ '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027',
				'2028', '2029', '2030', '2031', '2032' ];

			if ($scope.data[0][0].month !== null && $scope.data[0][0].year && $scope.data[0][0].day) {
				$scope.birth_month = $scope.months[new Date($scope.data[0][0].month)];
				$scope.birth_year = $scope.data[0][0].year;
				$scope.birth_date = $scope.data[0][0].day;
			} else {
				$scope.birth_month = $scope.months[0];
				$scope.birth_year = $scope.years[0];
				$scope.birth_date = $scope.dates[0];
			}
		}

		$scope.updatePass = function() {

			if ($scope.new_pass !== undefined && $scope.old_pass !== undefined
				&& $scope.confirm_pass !== undefined && $scope.new_pass.trim().length > 0 && $scope.old_pass.trim().length > 0) {
				// statement

				if ($scope.new_pass != $scope.confirm_pass) {
					alert("Password mismatch!");
				} else {

					$http({
						method : "POST",
						url : "/updatePassword",
						data : {
							"old_pass" : $scope.old_pass,
							"new_pass" : $scope.new_pass
						}
					}).then((result) => {
						alert("Success");
					}, (error) => {
						console.log("Error", error);
					})
				}
			} else {
				alert("please enter in all fields!");
			}
		}

		$scope.propertyDeactivate = function(property_id) {

			$http({
				method : "POST",
				url : "/changePropertyStatus",
				data : {
					"status" : "deactivate",
					"property_id" : property_id
				}
			}).then((result) => {
				if (result.data.statusCode == 200) {
					angular.forEach($scope.data[3], function(property, index) {
						if (property.property_id == property_id) {
							property.active = 0;
						}
						$scope.data[3].push(index, property);
					});
				}

			}, (error) => {
				// $scope.room_types = [];
			})
		}

		$scope.propertyActivate = function(property_id) {
			$http({
				method : "POST",
				url : "/changePropertyStatus",
				data : {
					"status" : "activate",
					"property_id" : property_id
				}
			}).then((result) => {
				if (result.data.statusCode == 200) {
					angular.forEach($scope.data[3], function(property, index) {
						if (property.property_id == property_id) {
							property.active = 1;
						}
						$scope.data[3].push(index, property);
					});
				}

			}, (error) => {
				// $scope.room_types = [];
			})
		}

		$scope.listingDeactivate = function(listing_id) {

			$http({
				method : "POST",
				url : "/changeListingStatus",
				data : {
					"status" : "deactivate",
					"listing_id" : listing_id
				}
			}).then((result) => {
				if (result.data.statusCode == 200) {
					angular.forEach($scope.data[4], function(listing, index) {
						if (listing.listing_id == listing_id) {
							listing.listing_active = 0;
						}
						$scope.data[4].push(index, listing);
					});
				}

			}, (error) => {
				// $scope.room_types = [];
			})
		}

		$scope.listingActivate = function(listing_id) {

			$http({
				method : "POST",
				url : "/changeListingStatus",
				data : {
					"status" : "deactivate",
					"listing_id" : listing_id
				}
			}).then((result) => {
				if (result.data.statusCode == 200) {
					angular.forEach($scope.data[4], function(listing, index) {
						if (listing.listing_id == listing_id) {
							listing.listing_active = 0;
						}
						$scope.data[4].push(index, listing);
					});
				}

			}, (error) => {
				// $scope.room_types = [];
			})
		}

		$scope.add_card = function() {

			var newCard = {
				"cc_no" : $scope.cc_no,
				"cc_month" : $scope.cc_month,
				"cc_year" : $scope.cc_year,
				"first_name" : $scope.first_name,
				"last_name" : $scope.last_name,
				"security" : $scope.security_code,
				"postal" : $scope.postal,
				"country" : "United States"
			}
			$http({
				method : "POST",
				url : "/addCard",
				data : newCard
			}).then((result) => {

				$scope.data[1].push({
					"card_id" : result.card_id,
					"card_number" : Validation.maskCard($scope.cc_no),
					"exp_month" : $scope.cc_month,
					"exp_year" : $scope.cc_year,
					"first_name" : $scope.first_name,
					"last_name" : $scope.last_name,
					"cvv" : $scope.security_code,
					"postal_code" : $scope.postal,
					"country" : "United States"
				});
				console.log($scope.data[1]);

				$("#payment_model").modal('toggle');
			// $scope.data = result.data.room_types;
			}, (error) => {
				// $scope.room_types = [];
			})
		}

		$scope.details = '';

		$scope.$watch('details', function() {
			if ($scope.details !== undefined && typeof $scope.details != 'string') {
				$scope.city = $scope.details.address_components[0].long_name;
				$scope.state = $scope.details.address_components[2].short_name;
			}
		});

		$scope.updateProfile = () => {

			$http({
				method : "POST",
				url : "/updateProfile",
				data : {
					"f_name" : $scope.data[0][0].f_name,
					"l_name" : $scope.data[0][0].l_name,
					"gender" : $scope.data[0][0].gender,
					"birth_month" : MonthNumber.getMonthFromString($scope.birth_month),
					"birth_date" : $scope.birth_date,
					"birth_year" : $scope.birth_year,
					"email" : $scope.data[0][0].email,
					"phone" : $scope.data[0][0].phone,
					"city" : $scope.city,
					"state" : $scope.state,
					"description" : $scope.data[0][0].description
				}
			}).then((result) => {
				alert('Success');
			}, (error) => {
				alert('Error');
			})
		}

		$scope.updatePass = function() {
			if ($scope.new_pass !== undefined && $scope.old_pass !== undefined
				&& $scope.confirm_pass !== undefined && $scope.new_pass.trim().length > 0 && $scope.old_pass.trim().length > 0) {
				// statement

				if ($scope.new_pass != $scope.confirm_pass) {
					alert("Password mismatch!");
				} else {

					$http({
						method : "POST",
						url : "/updatePassword",
						data : {
							"old_pass" : $scope.old_pass,
							"new_pass" : $scope.new_pass
						}
					}).then((result) => {
						alert("Success");
					}, (error) => {
						console.log("Error", error);
					})
				}
			} else {
				alert("please enter in all fields!");
			}
		};

		$scope.updateHostRating = function(trip, rating) {
			$http({
				method : "POST",
				url : '/updateRating',
				data : {
					"rating" : rating,
					"trip" : trip,
					"is_host" : true
				}
			}).then((results) => {
				if (results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}
		
		$scope.updateHostReview = function(trip, review) {
			$http({
				method : "POST",
				url : '/updateReview',
				data : {
					"review" : review,
					"trip" : trip,
					"is_host" : true
				}
			}).then((results) => {
				if (results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}
		
		$scope.updateTravellerReview = function(trip, review) {
			$http({
				method : "POST",
				url : '/updateReview',
				data : {
					"review" : review,
					"trip" : trip,
					"is_host" : false
				}
			}).then((results) => {
				if (results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}

		$scope.updateTravellerRating = function(trip, rating) {
			$http({
				method : "POST",
				url : '/updateRating',
				data : {
					"rating" : rating,
					"trip" : trip,
					"is_host" : false
				}
			}).then((results) => {
				if (results.data.statusCode === 200) {
					console.log("Results", results);
				}
			}, (error) => {
				console.log("Error", error);
			})
		}

		$scope.barcpp = true;
		$scope.piecpp = false;

		$scope.barpc = true;
		$scope.piepc = false;

		$scope.barlsa = true;
		$scope.pielsa = false;

		$scope.barpr = true;
		$scope.piepr = false;

		$scope.barug = true;
		$scope.pieug = false;

		$scope.barbi = true;
		$scope.piebi = false;

		$scope.showBarcpp = function() {
			$scope.barcpp = true;
			$scope.piecpp = false;

		};


		$scope.showPiecpp = function() {
			$scope.barcpp = false;
			$scope.piecpp = true;

		};


		$scope.showBarpc = function() {

			$scope.barpc = true;
			$scope.piepc = false;
		};

		$scope.showPiepc = function() {
			$scope.barpc = false;
			$scope.piepc = true;

		};


		$scope.showBarlsa = function() {

			$scope.barlsa = true;
			$scope.pielsa = false;
		};

		$scope.showPielsa = function() {
			$scope.barlsa = false;
			$scope.pielsa = true;

		};


		$scope.showBarpr = function() {

			$scope.barpr = true;
			$scope.piepr = false;
		};

		$scope.showPiepr = function() {
			$scope.barpr = false;
			$scope.piepr = true;

		};

		$scope.showBarug = function() {

			$scope.barug = true;
			$scope.pieug = false;
		};

		$scope.showPieug = function() {
			$scope.barug = false;
			$scope.pieug = true;

		};

		$scope.showBarbi = function() {

			$scope.barbi = true;
			$scope.piebi = false;
		};

		$scope.showPiebi = function() {
			$scope.barbi = false;
			$scope.piebi = true;

		};

		$scope.uploadPhoto = () => {
			if ($scope.data[7]) {
				$http({
					method : "POST",
					url : '/uploadProfilePhoto',
					data : {
						"user" : $location.search().owner,
						"photo" : $scope.data[7]
					}
				}).then((results) => {
					if (results.data.statusCode === 200) {
						$rootScope.fetchLoggedInUser(function() {
							
						});
					}
				}, (error) => {
					console.log("Error", error);
				})
			}
		};

		$scope.uploadVideo = () => {
			if ($scope.data[8]) {
				$http({
					method : "POST",
					url : '/uploadProfileVideo',
					data : {
						"user" : $location.search().owner,
						"video" : $scope.data[8]
					}
				}).then((results) => {
					if (results.data.statusCode === 200) {
						$rootScope.fetchLoggedInUser(function() {
							
						});
					}
				}, (error) => {
					console.log("Error", error);
				})
			}
		}
	})
	.controller('addProperty', ($scope, $http, $window) => {
		$scope.photos = [];
		$scope.page = 1;

		$scope.remove = function(index) {
			$scope.photos.splice(index, 1);
			if ($scope.photos.length === 0) {
				$scope.show_upload = true;
				angular.element("input[type='file']").val(null);
			}
		};
		
		$window.document.title = 'Become a host | Add a new Property';

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
					'photos' : $scope.photos,
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
					window.location.assign('/');

				}
			}, (error) => {

			})
		}

		$scope.$watch('photos', function() {
			if ($scope.photos.length === 0) {
				$scope.show_upload = true;
			} else {
				$scope.show_upload = false;
			}
		});

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
	.controller('addListing', ($scope, $http, $location, Date, $window) => {
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
		
		$window.document.title = 'Become a host | List a property';

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
	.controller('signUpController', function($scope, $http, Random, deviceDetector) {
		$scope.emailSignUp = false;
		$scope.beforeSignUp = true;

		$scope.signUpWithEmail = function() {
			$scope.emailSignUp = true;
			$scope.beforeSignUp = false;
		};

		$scope.deviceDetector = deviceDetector;

		$scope.signUp = function() {
			//sending new user data to node
			$http({
				url : '/register',
				method : 'POST',
				data : {
					'email' : $scope.email,
					'firstname' : $scope.f_name,
					'lastname' : $scope.l_name,
					'password' : $scope.password,
					'month' : $scope.month,
					'day' : $scope.day,
					'year' : $scope.year,
					'user_agent' : deviceDetector
				}
			}).then(function mySuccess(response) {
				console.log("Sign Up Done !!");
			}, function myError(response) {
				console.log("Could not register !!");
			});
		};



	})
	.controller('navBarController', function($scope, $http, Random, $rootScope) {
		
		$scope.global = $rootScope;
		
		$rootScope.fetchLoggedInUser = (callback) => {
			$http({
				url : '/getLoggedInUser',
				method : 'POST'
			}).then(function(result) {
				$rootScope.loggedInUser = result.data.session;
				if(callback) {
					callback();
				}
			}, function(error) {
				console.log(error);
			});
		}
		
		$rootScope.fetchLoggedInUser(function() {
			
		});

		$scope.logout = function() {
			$http({
				url : '/logout',
				method : "POST"
			}).then(function(result) {
				$rootScope.fetchLoggedInUser(function() {
				window.location.assign('/');
			});			
				
			}, function(error) {
				console.log(error);
			});
		};

		$scope.host = () => {
			if ($scope.loggedInUser) {
				window.location.assign('/property');
			} else {
				alert("please signin first!");
			}
		}

		$scope.getHomePage = function() {
			window.location.assign('/');
		};
	})
	.controller('lineBarController', function($scope, $http, Random) {

		$scope.options = {
			chart : {
				type : 'linePlusBarChart',
				height : 500,
				margin : {
					top : 30,
					right : 75,
					bottom : 50,
					left : 75
				},
				bars : {
					forceY : [ 0 ]
				},
				bars2 : {
					forceY : [ 0 ]
				},
				color : [ '#2ca02c', 'darkred' ],
				x : function(d, i) {
					return i
				},
				xAxis : {
					axisLabel : 'X Axis',
					tickFormat : function(d) {
						var dx = $scope.data[0].values[d] && $scope.data[0].values[d].x || 0;
						if (dx > 0) {
							return d3.time.format('%x')(new Date(dx))
						}
						return null;
					}
				},
				x2Axis : {
					tickFormat : function(d) {
						var dx = $scope.data[0].values[d] && $scope.data[0].values[d].x || 0;
						return d3.time.format('%b-%Y')(new Date(dx))
					},
					showMaxMin : false
				},
				y1Axis : {
					axisLabel : 'Y1 Axis',
					tickFormat : function(d) {
						return d3.format(',f')(d);
					},
					axisLabelDistance : 12
				},
				y2Axis : {
					axisLabel : 'Y2 Axis',
					tickFormat : function(d) {
						return '$' + d3.format(',.2f')(d)
					}
				},
				y3Axis : {
					tickFormat : function(d) {
						return d3.format(',f')(d);
					}
				},
				y4Axis : {
					tickFormat : function(d) {
						return '$' + d3.format(',.2f')(d)
					}
				}
			}
		};

		$http.get('../analytics/admin/lineBarData.json')
			.then(function(res) {
				$scope.data = res.data.map(function(series) {
					series.values = series.values.map(function(d) {
						return {
							x : d[0],
							y : d[1]
						}
					});
					return series;
				});
			});

	})
	.controller('adminSunController', function($scope, $http, Random) {
		$scope.options = {
			chart : {
				type : 'sunburstChart',
				height : 700,
				color : d3.scale.category20c(),
				duration : 250
			}
		};

		$http.get('../analytics/admin/sunData.json')
			.then(function(res) {
				$scope.data = res.data;
			});

	})
	.controller('adminPieController', function($scope, $http, Random) {
		// console.log("from admin pie controller");

		$scope.options = {
			chart : {
				type : 'pieChart',
				height : 300,
				width : 350,
				x : function(d) {
					return d.key;
				},
				y : function(d) {
					return d.y;
				},
				showLabels : true,
				duration : 500,
				labelThreshold : 0.01,
				labelSunbeamLayout : true,
				legend : {
					margin : {
						top : 5,
						right : 35,
						bottom : 5,
						left : 0
					}
				}
			}
		};


		//file to fetch admin analytical data from
		$http.get('../analytics/admin/dataPie.json')
			.then(function(res) {
				$scope.data = res.data;
			});

		//file to fetch host analytical data from
		$http.get('../analytics/admin/dataPie.json')
			.then(function(res) {
				$scope.hostData = res.data;
			});

	})
	.controller('adminBarController', function($scope, $http, Random) {
		// console.log("from admin bar controller");
		// new Date(d)
		// console.log('new Date(d)', new Date(1136005200000));


		$scope.options = {
			chart : {
				type : 'historicalBarChart',
				height : 300,
				margin : {
					top : 20,
					right : 20,
					bottom : 65,
					left : 50
				},
				x : function(d) {
					return d[0];
				},
				y : function(d) {
					return d[1] / 100000;
				},
				showValues : true,
				valueFormat : function(d) {
					return d3.format(',.1f')(d);
				},
				duration : 100,
				xAxis : {
					axisLabel : 'X Axis',
					tickFormat : function(d) {
						return d3.time.format('%x')(new Date(d))

					},
					rotateLabels : 30,
					showMaxMin : false
				},
				yAxis : {
					axisLabel : 'Y Axis',
					axisLabelDistance : -10,
					tickFormat : function(d) {
						return d3.format(',.1f')(d);
					}
				},
				tooltip : {
					keyFormatter : function(d) {
						return d3.time.format('%x')(new Date(d));
					}
				},
				zoom : {
					enabled : true,
					scaleExtent : [ 1, 10 ],
					useFixedDomain : false,
					useNiceScale : false,
					horizontalOff : false,
					verticalOff : true,
					unzoomEventType : 'dblclick.zoom'
				}
			}
		};
		$scope.hostOptions = {
			chart : {
				type : 'historicalBarChart',
				height : 300,
				width : 375,
				margin : {
					top : 20,
					right : 20,
					bottom : 65,
					left : 50
				},
				x : function(d) {
					return d[0];
				},
				y : function(d) {
					return d[1] / 100000;
				},
				showValues : true,
				valueFormat : function(d) {
					return d3.format(',.1f')(d);
				},
				duration : 100,
				xAxis : {
					axisLabel : 'X Axis',
					tickFormat : function(d) {
						return d3.time.format('%x')(new Date(d))

					},
					rotateLabels : 30,
					showMaxMin : false
				},
				yAxis : {
					axisLabel : 'Y Axis',
					axisLabelDistance : -10,
					tickFormat : function(d) {
						return d3.format(',.1f')(d);
					}
				},
				tooltip : {
					keyFormatter : function(d) {
						return d3.time.format('%x')(new Date(d));
					}
				},
				zoom : {
					enabled : true,
					scaleExtent : [ 1, 10 ],
					useFixedDomain : false,
					useNiceScale : false,
					horizontalOff : false,
					verticalOff : true,
					unzoomEventType : 'dblclick.zoom'
				}
			}
		};

		//file to fetch admin analytical data from
		$http.get('../analytics/admin/barData.json')
			.then(function(res) {
				$scope.data = res.data;
			});

		//file to fetch host analytical data from
		$http.get('../analytics/admin/barData.json')
			.then(function(res) {
				$scope.hostData = res.data;
			});

	})
	.controller('searchListingController', function($scope, $http, $location, Random, $interval, NgMap, $window) {

		$scope.init = function(retrievedData) {
			$scope.data = JSON.parse(retrievedData);
			
			$window.document.title = 'Listings for ' + $location.search().where;
			
			if($location.search().daterange) {
				$scope.daterange = $location.search().daterange;
			}
			
			if($location.search().guest) {
				$scope.guest = $location.search().guest
			}
			
			for(var i = 0; i < $scope.data.results.length; i++) {
				$scope.data.results[i].currentPhoto = 0
			}
			
			$scope.nextPhoto = function(index, currentPhoto) {
				if(currentPhoto === $scope.data.results[index].photos.length - 1) {
					$scope.data.results[index].currentPhoto = 0;
				} else {
					$scope.data.results[index].currentPhoto = $scope.data.results[index].currentPhoto + 1;
				}
			}
			
			$scope.previousPhoto = function(index, currentPhoto) {
				if(currentPhoto === 0) {
					$scope.data.results[index].currentPhoto = $scope.data.results[index].photos.length - 1;
				} else {
					$scope.data.results[index].currentPhoto = $scope.data.results[index].currentPhoto - 1;
				}
			}
			
			$scope.entire_home = true;
			$scope.private_room = true;
			$scope.shared_room = true;
			$scope.min_price = 0;
			$scope.max_price = 500;
			$scope.range = {
					from: 0,
					to: 500
			};
			$scope.instant_book = false;
		}
		
		$scope.updateFilters = (when, guests, entire_home, private_room, shared_room, min_price, max_price, instant_book) => {
			$scope.filteredResults = $scope.data.results.filter(function(elem, index, array) {
				var whenValid = true;
				var guestsValid = true;
				var room_type_valid = true;
				var price_range_valid = true;
				var instant_book_valid = true;
				if(when) {
					if(typeof when === 'string') {
						var filter_start = new Date(when.split(' - ')[0]);
						var filter_end = new Date(when.split(' - ')[1]);
						var start_date = new Date(elem.start_date);
						var end_date = new Date(elem.end_date);
						if(start_date.getTime() > filter_end.getTime() || 
								end_date.getTime() > filter_end.getTime() || 
								start_date.getTime() < filter_start.getTime() || 
								end_date.getTime() < filter_start.getTime()) {
							whenValid = false;
						}
					} else {
						var start_date = new Date(elem.start_date);
						var end_date = new Date(elem.end_date);
						if(start_date.getTime() > when.endDate._d.getTime() || 
								end_date.getTime() > when.endDate._d.getTime() || 
								start_date.getTime() < when.startDate._d.getTime() || 
								end_date.getTime() < when.startDate._d.getTime()) {
							whenValid = false;
						}
					}
				}
				if(guests) {
					if(guests > elem.accommodations) {
						guestsValid = false;
					}
				}
				if((elem.room_type === 'Private room' && !private_room) || (elem.room_type === 'Shared room' && !shared_room) || (elem.room_type === 'Entire home/apt' && !entire_home)) {
					room_type_valid = false;
				}
				if(elem.daily_price > max_price || elem.daily_price < min_price) {
					price_range_valid = false;
				}
				if(instant_book && elem.is_bid) {
					instant_book_valid = false;
				}
				return whenValid && guestsValid && room_type_valid && price_range_valid && instant_book_valid;
			});
		};
		
		$scope.$watchCollection('[daterange, guest, entire_home, private_room, shared_room, min_price, max_price, range, instant_book, data.results]', function() {
			$scope.updateFilters($scope.daterange, $scope.guest, $scope.entire_home, $scope.private_room, $scope.shared_room, $scope.range.from, $scope.range.to, $scope.instant_book);
		});

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
	.directive('starRating', function starRating() {
		return {
			restrict : 'EA',
			template : '<ul class="star-rating" ng-class="{readonly: readonly}">' +
				'  <li ng-repeat="star in stars" class="star" ng-class="{filled: star.filled, low_rating: ratingValue === 1, high_rating: ratingValue === 5}" ng-click="toggle($index)">' +
				'    <i class="fa fa-star"></i>' + // or &#9733
				'  </li>' +
				'</ul>',
			scope : {
				ratingValue : '=ngModel',
				max : '=?', // optional (default is 5)
				onRatingSelect : '&?',
				readonly : '=?'
			},
			link : function(scope, element, attributes) {
				if (scope.ratingValue == null) {
					scope.ratingValue = 1;
				}
				if (scope.max == undefined) {
					scope.max = 5;
				}
				function updateStars() {
					scope.stars = [];
					for (var i = 0; i < scope.max; i++) {
						scope.stars.push({
							filled : i < scope.ratingValue
						});
					}
				}
				;
				scope.toggle = function(index) {
					if (scope.readonly == undefined || scope.readonly === false) {
						scope.ratingValue = index + 1;
						scope.onRatingSelect({
							rating : index + 1
						});
					}
				};
				scope.$watch('ratingValue', function(oldValue, newValue) {
					if (newValue) {
						updateStars();
					}
				});
			}
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
			if (value.length > 10000) {
				return false;
			} else {
				return true;
			}
		};

		this.validateTextBox = function(value) {
			if (value.length > 100) {
				return false;
			} else {
				return true;
			}
		};
		this.validateCount = function(value) {
			var count_validator = new RegExp(/^\d$/);
			if (value.match(count_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validatePrice = function(value) {
			var price_validator = new RegExp(/^\d+(,\d{1,2})?$/);
			if (value.match(price_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateDateRange = function(value) {
			var date_range_validator = new RegExp(/^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d\s-\s(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.](19|20)\d\d$/);
			if (value.match(date_range_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateCity = function(value) {
			var city_validator = new RegExp(/^[a-zA-Z]+(?:(?:\\s+|-)[a-zA-Z]+)*$/);
			if (value.match(city_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateZip = function(value) {
			var zip_validator = new RegExp(/^\d{5}([\-]?\d{4})?$/);
			if (value.match(zip_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateState = function(value) {
			var state_validator = new RegExp(/^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\sHampshire|New\sJersey|New\sMexico|New\sYork|North\sCarolina|North\sDakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\sIsland|South\sCarolina|South\sDakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\sVirginia|Wisconsin|Wyoming)$/);
			if (value.match(state_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateEmail = function(value) {
			var email_validator = new RegExp(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);
			if (value.match(email_validator) !== null) {
				return true;
			} else {
				return false;
			}
		};
		this.validateYear = function(value) {
			var year_validator = new RegExp(/^\d{4}$/);
			if (value.match(email_validator) !== null) {
				if (Number(value) > new Date().getFullYear()) {
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
			if (value.match(password_validator) !== null) {
				return true;
			} else {
				return false;
			}
		}
		this.maskCard = function(cardNumber) {
			var returnString = "";
			var cardNumberString = String(cardNumber);
		    for(var i = 0; i < cardNumberString.length - 4; i++) {
		    	returnString = returnString + 'X';
		    }
		    returnString = returnString + cardNumberString.substr(cardNumberString.length - 4);
		    return returnString;
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
	})
	.service('MonthNumber', function() {
		this.getMonthFromString = function(monthString) {
			if (monthString === 'January')
				return '01';
			if (monthString === 'February')
				return '02';
			if (monthString === 'March')
				return '03';
			if (monthString === 'April')
				return '04';
			if (monthString === 'May')
				return '05';
			if (monthString === 'June')
				return '06';
			if (monthString === 'July')
				return '07';
			if (monthString === 'August')
				return '08';
			if (monthString === 'September')
				return '09';
			if (monthString === 'October')
				return '10';
			if (monthString === 'November')
				return '11';
			if (monthString === 'December')
				return '12';
		}
	})
	.controller('horizontalMultibarController', function($scope) {
		$scope.options = {
			chart : {
				type : 'multiBarHorizontalChart',
				height : 350,
				width : 550,
				x : function(d) {
					return d.label;
				},
				y : function(d) {
					return d.value;
				},
				showControls : true,
				showValues : true,
				duration : 500,
				xAxis : {
					showMaxMin : false
				},
				yAxis : {
					axisLabel : 'Values',
					tickFormat : function(d) {
						return d3.format(',.2f')(d);
					}
				}
			}
		};

		$scope.data = [
			{
				"key" : "Series1",
				"color" : "#d62728",
				"values" : [
					{
						"label" : "A",
						"value" : -1.8746444827653
					},
					{
						"label" : "B",
						"value" : -8.0961543492239
					},
					{
						"label" : "C",
						"value" : -0.57072943117674
					},
					{
						"label" : "D",
						"value" : -2.4174010336624
					},
					{
						"label" : "E",
						"value" : -0.72009071426284
					},
					{
						"label" : "F",
						"value" : -0.77154485523777
					},
					{
						"label" : "G",
						"value" : -0.90152097798131
					},
					{
						"label" : "H",
						"value" : -0.91445417330854
					},
					{
						"label" : "I",
						"value" : -0.055746319141851
					}
				]
			},
			{
				"key" : "Series2",
				"color" : "#1f77b4",
				"values" : [
					{
						"label" : "A",
						"value" : 25.307646510375
					},
					{
						"label" : "B",
						"value" : 16.756779544553
					},
					{
						"label" : "C",
						"value" : 18.451534877007
					},
					{
						"label" : "D",
						"value" : 8.6142352811805
					},
					{
						"label" : "E",
						"value" : 7.8082472075876
					},
					{
						"label" : "F",
						"value" : 5.259101026956
					},
					{
						"label" : "G",
						"value" : 0.30947953487127
					},
					{
						"label" : "H",
						"value" : 0
					},
					{
						"label" : "I",
						"value" : 0
					}
				]
			}
		]
	})
	.controller('donutChartController', function($scope) {
		$scope.options = {
			chart : {
				type : 'pieChart',
				height : 350,
				width : 550,
				donut : true,
				x : function(d) {
					return d.key;
				},
				y : function(d) {
					return d.y;
				},
				showLabels : true,

				pie : {
					startAngle : function(d) {
						return d.startAngle / 2 - Math.PI / 2
					},
					endAngle : function(d) {
						return d.endAngle / 2 - Math.PI / 2
					}
				},
				duration : 500,
				legend : {
					margin : {
						top : 5,
						right : 70,
						bottom : 5,
						left : 0
					}
				}
			}
		};

		$scope.data = [
			{
				key : "One",
				y : 5
			},
			{
				key : "Two",
				y : 2
			},
			{
				key : "Three",
				y : 9
			},
			{
				key : "Four",
				y : 7
			},
			{
				key : "Five",
				y : 4
			},
			{
				key : "Six",
				y : 3
			},
			{
				key : "Seven",
				y : .5
			}
		];
	});