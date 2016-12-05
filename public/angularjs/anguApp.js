var airBnB = angular.module('airBnB', [ 'ngAnimate', 'focus-if', 'ngAutocomplete', 'ngMessages', 'ngRangeSlider', 'ngMap', 'nvd3', 'naif.base64', 'ng.deviceDetector', 'ui.utils.masks', 'daterangepicker' ])
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
			country : 'usa'
		// types : '(cities)'
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
	})
	.controller('login', function($scope, $http, Random, deviceDetector, $rootScope) {
		//		$scope.checkIsAdmin = false;
		$scope.global = $rootScope;
		$scope.deviceDetector = deviceDetector;

		$scope.login = function() {
			if ($scope.checkIsAdmin) {

				$http({
					method : "POST",
					url : '/adminLogin',
					data : {
						"email" : $scope.email,
						"password" : $scope.password
					}
				}).then((results) => {
					if (results.data.statusCode === 200) {
						window.location.assign('/adminDashboard');
					} else {
						window.location.assign('/');
					}
				}, (error) => {
					console.log("Error", error);
				});

			} else {
				$http({
					method : "POST",
					url : '/login',
					data : {
						"email" : $scope.email,
						"password" : $scope.password,
						"user_agent" : deviceDetector
					}
				}).then((results) => {
					console.log('results', results);

					// console.log('results.data.statusCode', results.data.statusCode);
					// console.log('results.data.statusCode === 200', results.data.statusCode === 200);
					if (results.data.statusCode === 200) {

						$scope.invalidLogin = false;
						$rootScope.fetchLoggedInUser(function() {
							window.location.assign('/');
						});

					}

					if (results.data.statusCode !== 200) {

						$scope.invalidLogin = true;
						console.log("<><><><><><><><><><><><><><><><>");
						console.log('$scope.invalidLogin', $scope.invalidLogin);

					}


				}, (error) => {

					$scope.invalidLogin = true;
					console.log("Error", error);

				});
			}
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
				if ($scope.currentIndex === $scope.data.photos.length) {
					$scope.currentIndex = 1;
				} else {
					$scope.currentIndex = $scope.currentIndex + 1;
				}
				$scope.currentPhoto = $scope.data.photos[$scope.currentIndex - 1];
			};

			$scope.previousPhoto = function() {
				if ($scope.currentIndex === 1) {
					$scope.currentIndex = $scope.data.photos.length;
				} else {
					$scope.currentIndex = $scope.currentIndex - 1;
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
	.controller('profile', ($scope, $http, $window, MonthNumber, $location, Validation, $rootScope, NgMap, $timeout) => {
		
		$scope.address = '';
		
		$scope.showPropertyPage = function() {
			$http({
				method : "POST",
				url : '/check_host'
			}).then((results) => {
				if (results.data.statusCode === 500) {
					window.location.assign('/');
				}
				else if (results.data.statusCode === 200) {
					window.location.assign('/property');
				}
			}, (error) => {
				console.log("Error", error);
			})
		}

		// console.log('$scope.address', $scope.address);
		$scope.options = {
			country : 'usa',
			types : '(cities)'
		};
		$scope.options.watchEnter = true;
		$scope.$watch('address', function() {
			if ($scope.address !== undefined && (typeof ($scope.address)) !== 'string') {
				// $window.location.href = '/searchListing?where=' + $scope.address.formatted_address;
				console.log("No Response");
			}
		});
		
		$scope.initializeMaps = function() {
			$scope.active_tab = 'listings_tab';
			for(var i = 0; i < $scope.data[4].length; i++) {
				NgMap.getMap($scope.data[4][i].listing_id).then(function(map) {
					$timeout(function() {google.maps.event.trigger(map, 'resize')}, 1000)
				});
			}
		}


		$scope.init = function(profileDetails) {
			$scope.data = JSON.parse(profileDetails);
			console.log("Profile : ", $scope.data);
			$window.document.title = $scope.data[0][0].f_name + ' ' + $scope.data[0][0].l_name + ' | Profile';
			$scope.st_address = $scope.data[0][0].city + ', ' + $scope.data[0][0].state;
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
				$scope.birth_month = $scope.months[$scope.data[0][0].month - 1];
				var index = $scope.years.indexOf($scope.data[0][0].year.toString());
				$scope.birth_year = $scope.years[index];
				$scope.birth_date = $scope.dates[$scope.data[0][0].day - 1];
			} else {
				$scope.birth_month = $scope.months[0];
				$scope.birth_year = $scope.years[0];
				$scope.birth_date = $scope.dates[0];
			}
			
		}

		$scope.deactivateUserAccount = function() {
			$http({
				method : "POST",
				url : '/deactivateUserAccount'
			}).then((results) => {
				if (results.data.statusCode === 200) {
					$scope.account_deactivated = true;
					$http({
						method : "POST",
						url : "/logout"
					}).then((result) => {
						$scope.redirecting = true;
						window.location.assign('/');
					}, (error) => {
						console.log("Error", error);
					})
				}
				if (results.data.statusCode === 401) {
					window.location.assign('/');
				}
			}, (error) => {
				console.log("Error", error);
			})
		}

		$scope.updatePass = function() {

			if ($scope.new_pass !== undefined && $scope.old_pass !== undefined
				&& $scope.confirm_pass !== undefined && $scope.new_pass.trim().length > 0 && $scope.old_pass.trim().length > 0) {
				// statement

				if ($scope.new_pass != $scope.confirm_pass) {
					$scope.invalidLogin = true;
				} else {

					$http({
						method : "POST",
						url : "/updatePassword",
						data : {
							"old_pass" : $scope.old_pass,
							"new_pass" : $scope.new_pass
						}
					}).then((result) => {
						$scope.success_update = true;
					}, (error) => {
						console.log("Error", error);
					})
				}
			} else {
				$scope.all_fields = true;
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
			$scope.no_first_name = false;
			$scope.no_last_name = false;
			$scope.no_cc_no = false;
			$scope.no_cc_month = false;
			$scope.no_cc_year = false;
			$scope.no_security_code = false;
			$scope.no_first_name = false;
			$scope.no_last_name = false;
			$scope.no_postal = false;

			$scope.card_success = false;


			if ($scope.cc_no === undefined || $scope.cc_no === null || $scope.cc_no === "") {

				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_cc_no = true;
				console.log('$scope.no_cc_no', $scope.no_cc_no);
				$scope.no_cc_month = false;
				$scope.no_cc_year = false;
				$scope.no_security_code = false;
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = false;

			} else if ($scope.cc_month === undefined || $scope.cc_month === null || $scope.cc_month === "") {

				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_cc_no = false;
				$scope.no_cc_month = true;
				console.log('$scope.no_cc_month', $scope.no_cc_month);
				$scope.no_cc_year = false;
				$scope.no_security_code = false;
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = false;

			} else if ($scope.cc_year === undefined || $scope.cc_year === null || $scope.cc_year === "") {

				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_cc_no = false;
				$scope.no_cc_month = false;
				$scope.no_cc_year = true;
				console.log('$scope.no_cc_year', $scope.no_cc_year);
				$scope.no_security_code = false;
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = false;

			} else if ($scope.security_code === undefined || $scope.security_code === null || $scope.security_code === "") {

				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_cc_no = false;
				$scope.no_cc_month = false;
				$scope.no_cc_year = false;
				$scope.no_security_code = true;
				console.log('$scope.no_security_code', $scope.no_security_code);
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = false;

			} else if ($scope.first_name === undefined || $scope.first_name === null || $scope.first_name === "") {

				$scope.no_first_name = true;
				console.log('$scope.no_first_name', $scope.no_first_name);
				$scope.no_last_name = false;
				$scope.no_cc_no = false;
				$scope.no_cc_month = false;
				$scope.no_cc_year = false;
				$scope.no_security_code = false;
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = false;

			} else if ($scope.last_name === undefined || $scope.last_name === null || $scope.last_name === "") {

				$scope.no_first_name = false;
				$scope.no_last_name = true;
				console.log('$scope.no_last_name', $scope.no_last_name);
				$scope.no_cc_no = false;
				$scope.no_cc_month = false;
				$scope.no_cc_year = false;
				$scope.no_security_code = false;
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = false;

			} else if ($scope.postal === undefined || $scope.postal === null || $scope.postal === "") {

				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_cc_no = false;
				$scope.no_cc_month = false;
				$scope.no_cc_year = false;
				$scope.no_security_code = false;
				$scope.no_first_name = false;
				$scope.no_last_name = false;
				$scope.no_postal = true;
				console.log('$scope.no_postal', $scope.no_postal);

			} else {



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

				}).then(function(result) {
					console.log(result);
					if(result.data.statusCode === 200){
						
						$scope.data[1].push({
							"card_id" : result.card_id,
							"card_number" : Validation.maskCard($scope.cc_no),
							"exp_month" : $scope.cc_month,
							"exp_year" : $scope.cc_year,
							"first_name" : $scope.first_name,
							"last_name" : $scope.last_name,
							"security" : $scope.security_code,
							"postal" : $scope.postal,
							"country" : "United States"
						});

					$("#payment_model").modal('toggle');
					$scope.card_success = true;
					}

				}, function(error) {

					// $scope.room_types = [];
				})

			}

		}

		$scope.details = '';

		$scope.$watch('details', function() {
			if ($scope.details !== undefined && typeof $scope.details != 'string') {
				console.log($scope.details);
				var length = $scope.details.address_components.length;
				$scope.streetAddress = $scope.details.address_components[0].long_name + " " + $scope.details.address_components[1].long_name;
				$scope.city = $scope.details.address_components[0].long_name;
				$scope.state = $scope.details.address_components[2].long_name;
			}
		});

		$scope.updateProfile = () => {

			console.log('$scope.data[0][0].f_name', $scope.data[0][0].f_name);
			console.log('$scope.data[0][0].l_name', $scope.data[0][0].l_name);
			console.log('$scope.data[0][0].gender', $scope.data[0][0].gender);
			console.log('MonthNumber.getMonthFromString($scope.birth_month)', MonthNumber.getMonthFromString($scope.birth_month));
			console.log('$scope.birth_date', $scope.birth_date);
			console.log('$scope.data[0][0].email', $scope.data[0][0].email);


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
				$scope.profile_updated = true;


			}, (error) => {
				$scope.all_fields = true;
			})

		}

		$scope.updatePass = function() {
			if ($scope.new_pass !== undefined && $scope.old_pass !== undefined
				&& $scope.confirm_pass !== undefined && $scope.new_pass.trim().length > 0 && $scope.old_pass.trim().length > 0) {
				// statement

				if ($scope.new_pass != $scope.confirm_pass) {
					$scope.invalidLogin = true;
				} else {

					$http({
						method : "POST",
						url : "/updatePassword",
						data : {
							"old_pass" : $scope.old_pass,
							"new_pass" : $scope.new_pass
						}
					}).then((result) => {
						if (results.data.statusCode === 200) {
							console.log("Success");
						}
					}, (error) => {
						console.log("Error", error);
					})
				}
			} else {
				$scope.all_fields = true;
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

		$scope.updateHostReview = function(trip, review, photos) {
			$http({
				method : "POST",
				url : '/updateReview',
				data : {
					"review" : review,
					"trip" : trip,
					"photos" : photos,
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

		$scope.updateTravellerReview = function(trip, review, photos) {
			$http({
				method : "POST",
				url : '/updateReview',
				data : {
					"review" : review,
					"trip" : trip,
					"photos" : photos,
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

		$scope.room_type = "";

		$scope.$watch('room_type', function() {

			console.log('$scope.room_type', $scope.room_type.room_type);

		});

		$scope.photos = [];
		$scope.page = 1;

		$scope.remove = function(index) {
			$scope.photos.splice(index, 1);
			if ($scope.photos.length === 0) {
				$scope.show_upload = true;
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
			$scope.noroom_type = false;
			$scope.noGuests = false;
			$scope.property_type_val = false;
			$scope.no_street_address = false;
			$scope.no_city = false;
			$scope.no_apt = false;
			$scope.no_state = false;
			$scope.no_house_rules = false;

			$scope.propertySuccessfullyAdded = false;

			if ($scope.room_type === null || $scope.room_type === undefined || $scope.room_type === "") {

				$scope.page = 1;
				$scope.noroom_type = true;
				$scope.noGuests = false;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_apt = false;
				$scope.no_state = false;
				$scope.no_house_rules = false;

			} else if ($scope.guests < 1 || $scope.guests === undefined || $scope.guests === null) {

				$scope.page = 1;
				$scope.noroom_type = false;
				$scope.noGuests = true;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_apt = false;
				$scope.no_state = false;
				$scope.no_house_rules = false;

			} else if ($scope.property_type === null || $scope.property_type === undefined || $scope.property_type === "") {

				$scope.page = 2;
				$scope.noroom_type = false;
				$scope.noGuests = false;
				$scope.property_type_val = true;
				$scope.no_street_address = false;
				$scope.no_apt = false;
				$scope.no_state = false;
				$scope.no_house_rules = false;
				$scope.no_house_rules = false;
			} else if ($scope.city === "" || $scope.city === null || $scope.city === undefined) {

				$scope.page = 3;
				$scope.noroom_type = false;
				$scope.noGuests = false;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_city = true;
				$scope.no_apt = false;
				$scope.no_state = false;
				$scope.no_house_rules = false;

			} else if ($scope.apt === null || $scope.apt === undefined || $scope.apt === "") {

				$scope.page = 3;
				$scope.noroom_type = false;
				$scope.noGuests = false;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_city = false;
				$scope.no_apt = true;
				$scope.no_state = false;
				$scope.no_house_rules = false;

			} else if ($scope.state === null || $scope.state === undefined || $scope.state === "") {

				$scope.page = 3;
				$scope.noroom_type = false;
				$scope.noGuests = false;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_city = false;
				$scope.no_apt = false;
				$scope.no_state = true;
				$scope.no_house_rules = false;

			} else if ($scope.zip === null || $scope.zip === undefined || $scope.zip === "") {

				$scope.page = 3;
				$scope.noroom_type = false;
				$scope.noGuests = false;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_city = true;
				$scope.no_apt = false;
				$scope.no_state = true;
				$scope.no_house_rules = false;

			} else if ($scope.house_rules === null || $scope.house_rules === undefined || $scope.house_rules === "") {

				$scope.page = 5;
				$scope.noroom_type = false;
				$scope.noGuests = false;
				$scope.property_type_val = false;
				$scope.no_street_address = false;
				$scope.no_city = false;
				$scope.no_apt = false;
				$scope.no_state = false;
				$scope.no_house_rules = true;

			} else {


				console.log('$scope.details', $scope.details);
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
						$scope.propertySuccessfullyAdded = true;
						$scope.page = 1;
//						window.location.assign('/');
					}
				}, (error) => {

				})


			}

			// $scope.hometype="selectpicker dropdown-box listing box-size";






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

		//		$scope.is_bid = 'true';
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



			$scope.no_room_type = false;
			$scope.no_guests = false;
			$scope.no_number_of_bedrooms = false;
			$scope.no_number_of_beds = false;
			$scope.no_number_of_guests = false;
			$scope.no_number_of_bathrooms = false;
			$scope.no_title = false;
			$scope.no_description = false;
			$scope.no_dates = false;
			$scope.no_price = false;
			$scope.sale_type = false;
			$scope.successfulListing = false;


			if ($scope.room_type === null || $scope.room_type === "" || $scope.room_type === undefined) {

				$scope.page = 1;

				$scope.no_room_type = true;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;


			} else if ($scope.guests < 1 || $scope.guests === null || $scope.guests === undefined) {

				$scope.page = 1;

				$scope.no_room_type = false;
				$scope.no_guests = true;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;


			} else if ($scope.number_of_bedrooms < 1 || $scope.number_of_bedrooms === null || $scope.number_of_bedrooms === undefined) {

				$scope.page = 3;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = true;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;

			} else if ($scope.number_of_beds < 1 || $scope.number_of_beds === null || $scope.number_of_beds === undefined) {

				$scope.page = 3;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = true;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;

			} else if ($scope.number_of_guests < 1 || $scope.number_of_guests === null || $scope.number_of_guests === undefined) {

				$scope.page = 3;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = true;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;

			} else if ($scope.number_of_bathrooms < 1 || $scope.number_of_bathrooms === null || $scope.number_of_bathrooms === undefined) {

				$scope.page = 3;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = true;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;

			} else if ($scope.title === null || $scope.title === undefined || $scope.title === "") {

				$scope.page = 5;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = true;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;

			} else if ($scope.description === null || $scope.description === undefined || $scope.description === "") {

				$scope.page = 5;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = true;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;

			} else if ($scope.dates === null || $scope.dates === undefined || $scope.dates === "" || $scope.dates < 1) {

				$scope.page = 5;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = true;
				$scope.no_price = false;
				$scope.sale_type = false;
				$scope.successfulListing = false;

			} else if ($scope.is_fixed_price === false && $scope.is_bid === false) {

				$scope.page = 6;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = false;
				$scope.sale_type = true;
				$scope.successfulListing = false;

			} else if ($scope.price < 0 || $scope.price === 0 || $scope.price === null || $scope.price === undefined || $scope.price === " ") {

				$scope.page = 6;

				$scope.no_room_type = false;
				$scope.no_guests = false;
				$scope.no_number_of_bedrooms = false;
				$scope.no_number_of_beds = false;
				$scope.no_number_of_guests = false;
				$scope.no_number_of_bathrooms = false;
				$scope.no_title = false;
				$scope.no_description = false;
				$scope.no_dates = false;
				$scope.no_price = true;
				$scope.sale_type = false;
				$scope.successfulListing = false;
			} else {
				
				console.log($scope.is_bid);
				
				$http({
					method : "POST",
					url : "/addListing",
					data : {
						'property_id' : $location.search().property,
						'room_type' : $scope.room_type,
						'title' : $scope.title,
						'is_bid' : $scope.is_bid,
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
						$scope.no_room_type = false;
						$scope.no_guests = false;
						$scope.no_number_of_bedrooms = false;
						$scope.no_number_of_beds = false;
						$scope.no_number_of_guests = false;
						$scope.no_number_of_bathrooms = false;
						$scope.no_title = false;
						$scope.no_description = false;
						$scope.no_dates = false;
						$scope.no_price = false;
						$scope.sale_type = false;
						$scope.successfulListing = true;

						$scope.page = 1;
					}
				}, (error) => {

				})
			}

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

			$scope.signup_successful = false;
			$scope.signup_error = false;
			$scope.no_email = false;
			$scope.no_f_name = false;
			$scope.no_l_name = false;
			$scope.no_password = false;
			$scope.no_month = false;
			$scope.no_day = false;
			$scope.no_year = false;
			$scope.email_already_exists = false;

			if ($scope.f_name === "" || $scope.f_name === undefined || $scope.f_name === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = false;
				$scope.no_f_name = true;
				$scope.no_l_name = false;
				$scope.no_password = false;
				$scope.no_month = false;
				$scope.no_day = false;
				$scope.no_year = false;
				$scope.email_already_exists = false;


			} else if ($scope.l_name === "" || $scope.l_name === undefined || $scope.l_name === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = false;
				$scope.no_f_name = false;
				$scope.no_l_name = true;
				$scope.no_password = false;
				$scope.no_month = false;
				$scope.no_day = false;
				$scope.no_year = false;
				$scope.email_already_exists = false;


			} else if ($scope.email === "" || $scope.email === undefined || $scope.email === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = true;
				$scope.no_f_name = false;
				$scope.no_l_name = false;
				$scope.no_password = false;
				$scope.no_month = false;
				$scope.no_day = false;
				$scope.no_year = false;
				$scope.email_already_exists = false;


			} else if ($scope.password === "" || $scope.password === undefined || $scope.password === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = false;
				$scope.no_f_name = false;
				$scope.no_l_name = false;
				$scope.no_password = true;
				$scope.no_month = false;
				$scope.no_day = false;
				$scope.no_year = false;
				$scope.email_already_exists = false;


			} else if ($scope.month === "" || $scope.month === undefined || $scope.month === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = false;
				$scope.no_f_name = false;
				$scope.no_l_name = false;
				$scope.no_password = false;
				$scope.no_month = true;
				$scope.no_day = false;
				$scope.no_year = false;
				$scope.email_already_exists = false;


			} else if ($scope.day === "" || $scope.day === undefined || $scope.day === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = false;
				$scope.no_f_name = false;
				$scope.no_l_name = false;
				$scope.no_password = false;
				$scope.no_month = false;
				$scope.no_day = true;
				$scope.no_year = false;
				$scope.email_already_exists = false;


			} else if ($scope.year === "" || $scope.year === undefined || $scope.year === null) {

				$scope.signup_successful = false;
				$scope.signup_error = false;
				$scope.no_email = false;
				$scope.no_f_name = false;
				$scope.no_l_name = false;
				$scope.no_password = false;
				$scope.no_month = false;
				$scope.no_day = false;
				$scope.no_year = true;
				$scope.email_already_exists = false;


			} else {


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
					console.log('response', response);

					if (response.data.statusCode === 409) {
						console.log("Could not sign up...!!!");
						console.log("User already exists.");
						$scope.signup_successful = false;
						$scope.signup_error = false;
						$scope.email_already_exists = true;
					} else {

						console.log("Sign Up Done !!");
						$scope.signup_successful = true;
						$scope.email_already_exists = false;
						$scope.signup_error = false;

					}


				}, function myError(response) {
					console.log('response', response);

					console.log("Could not register !!");
					$scope.signup_successful = false;
					$scope.signup_error = true;

				});

			}

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
				callback();
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
				$scope.not_signed_in = false;
				$http({
					url : '/check_host',
					method : "POST"
				}).then(function(result) {
						
					if (result.data.statusCode === 200) {
						$scope.not_yet_host = false;
						window.location.assign('/property');
					}else{
						$scope.not_yet_host = true;
						
					}
				}, function(error) {

					console.log("some error");
					
				});
				

			} else {
				$scope.not_signed_in = true;
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

	

	.controller('searchListingController', function($scope, $http, $location, Random, $interval, NgMap, $window) {

		$scope.init = function(retrievedData) {
			$scope.data = JSON.parse(retrievedData);

			$window.document.title = 'Listings for ' + $location.search().where;

			if ($location.search().daterange) {
				$scope.daterange = $location.search().daterange;
			}

			if ($location.search().guest) {
				$scope.guest = $location.search().guest
			}

			$scope.entire_home = true;
			$scope.private_room = true;
			$scope.shared_room = true;
			$scope.min_price = $scope.data.results[0].daily_price;
			$scope.max_price = $scope.data.results[0].daily_price;
			$scope.instant_book = false;

			for (var i = 0; i < $scope.data.results.length; i++) {
				$scope.data.results[i].currentPhoto = 0
				if ($scope.data.results[i].daily_price >= $scope.max_price) {
					$scope.max_price = $scope.data.results[i].daily_price;
				}
				if ($scope.data.results[i].daily_price <= $scope.min_price) {
					$scope.min_price = $scope.data.results[i].daily_price;
				}
			}

			$scope.range = {
				from : $scope.min_price,
				to : $scope.max_price
			};

			$scope.nextPhoto = function(index, currentPhoto) {
				if (currentPhoto === $scope.filteredResults[index].photos.length - 1) {
					$scope.filteredResults[index].currentPhoto = 0;
				} else {
					$scope.filteredResults[index].currentPhoto = $scope.filteredResults[index].currentPhoto + 1;
				}
			}

			$scope.previousPhoto = function(index, currentPhoto) {
				if (currentPhoto === 0) {
					$scope.filteredResults[index].currentPhoto = $scope.filteredResults[index].photos.length - 1;
				} else {
					$scope.filteredResults[index].currentPhoto = $scope.filteredResults[index].currentPhoto - 1;
				}
			}

		}

		$scope.updateFilters = (when, guests, entire_home, private_room, shared_room, min_price, max_price, instant_book) => {

			$scope.filteredResults = $scope.data.results.filter(function(elem, index, array) {
				var whenValid = true;
				var guestsValid = true;
				var room_type_valid = true;
				var price_range_valid = true;
				var instant_book_valid = true;
				if (when) {
					if (typeof when === 'string') {
						var filter_start = new Date(when.split(' - ')[0]);
						var filter_end = new Date(when.split(' - ')[1]);
						var start_date = new Date(elem.start_date);
						var end_date = new Date(elem.end_date);
						if (start_date.getTime() > filter_end.getTime() ||
							end_date.getTime() > filter_end.getTime() ||
							start_date.getTime() < filter_start.getTime() ||
							end_date.getTime() < filter_start.getTime()) {
							whenValid = false;
						}
					} else {
						var start_date = new Date(elem.start_date);
						var end_date = new Date(elem.end_date);
						if (start_date.getTime() > when.endDate._d.getTime() ||
							end_date.getTime() > when.endDate._d.getTime() ||
							start_date.getTime() < when.startDate._d.getTime() ||
							end_date.getTime() < when.startDate._d.getTime()) {
							whenValid = false;
						}
					}
				}
				if (guests) {
					if (guests > elem.accommodations) {
						guestsValid = false;
					}
				}
				if ((elem.room_type === 'Private room' && !private_room) || (elem.room_type === 'Shared room' && !shared_room) || (elem.room_type === 'Entire home/apt' && !entire_home)) {
					room_type_valid = false;
				}
				if (elem.daily_price > max_price || elem.daily_price < min_price) {
					price_range_valid = false;
				}
				if (instant_book && elem.is_bid) {
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
			for (var i = 0; i < cardNumberString.length - 4; i++) {
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
	})
	.controller('adminPageController', function($scope, $http) {


		$scope.init = function(receivedData){

			$scope.data = JSON.parse(receivedData);
			console.log('$scope.data', $scope.data);


		};

		$scope.topTen = false;
		$scope.cityWise = false;

		$scope.getTopTen = function() {
			$scope.topTen = true;
			$scope.cityWise = false;
			$scope.showPendingApprovals = false;
		};

		$scope.getCityWise = function() {
			$scope.cityWise = true;
			$scope.topTen = false;
			$scope.showPendingApprovals = false;
		};

		$scope.showPendingApprovals = false;

		$scope.getPendingApprovals = function() {

			$scope.showPendingApprovals = true;

		};

		$scope.closePendingApprovals = function() {

			$scope.showPendingApprovals = false;

		};

		$http({
			url : "/getPendingHostApprovals",
			method : "POST"
		}).then(function mySuccess(result) {
			if (result.data.statusCode === 200) {
				$scope.users = result.data.users;
			}
		}, function myError(error) {
			console.log(error);
		});


		$scope.approveHost = function(user_id) {
			$http({
				url : "/approveHost",
				method : "POST",
				data : {
					"user_id" : user_id
				}
			}).then(function mySuccess(result) {
				if (result.data.statusCode === 200) {
					$http({
						url : "/getPendingHostApprovals",
						method : "POST"
					}).then(function mySuccess(result) {
						if (result.data.statusCode === 200) {
							$scope.users = result.data.users;
						}
					}, function myError(error) {
						console.log(error);
					});
				}
			}, function myError(error) {
				console.log(error);
			});
		}
		
		$scope.logoutAdmin = function() {
			$http({
				method : "POST",
				url : "/logout",
			}).then((result) => {
				//alert("Admin Logged out!!");
				window.location.assign('/');
			}, (error) => {
				console.log("Error", error);
			})
		}

	})

	.controller('adminBarController', function($scope, $http, Random) {
		

		$scope.init = function(retrievedData) {
		
			$scope.obj = JSON.parse(retrievedData);
			
		
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
						axisLabel : 'TIME',
						tickFormat : function(d) {
							return d3.time.format('%x')(new Date(d))

						},
						rotateLabels : 30,
						showMaxMin : false
					},
					yAxis : {
						axisLabel : 'REVENUE',
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


			$scope.arr = [];
			
			for(var k = 0 ; k < $scope.obj[0].length; k++){
				$scope.arr.push([new Date($scope.obj[0][k].checkin).getTime() , ($scope.obj[0][k].revenue) * 100000]);
			}		
			

			$scope.data = [{
							    "key" : "Quantity" ,
							    "bar": true,
							    "values" : $scope.arr
							}];


			};

	})
	.controller('cityWiseBarController', function($scope, $http, Random) {
		

		$scope.init = function(retrievedData) {
		
			$scope.obj = JSON.parse(retrievedData);
			console.log('$scope.obj', $scope.obj);
			
		
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
						axisLabel : '1 Year Time',
						tickFormat : function(d) {
							return d3.time.format('%x')(new Date(d))

						},
						rotateLabels : 30,
						showMaxMin : false
					},
					yAxis : {
						axisLabel : 'City Revenue',
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
						axisLabel : 'TIME',
						tickFormat : function(d) {
							return d3.time.format('%x')(new Date(d))

						},
						rotateLabels : 30,
						showMaxMin : false
					},
					yAxis : {
						axisLabel : 'REVENUE',
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


			$scope.arr = [];
			
			
			for(var k = 0 ; k < $scope.obj[1].length; k++){
				$scope.arr.push([new Date($scope.obj[1][k].checkin).getTime() , ($scope.obj[1][k].revenue) * 100000]);
			}		
			

			$scope.data = [{
							    "key" : "Quantity" ,
							    "bar": true,
							    "values" : $scope.arr
							}];


			};

	})
	.controller('TopTenMonthBarController', function($scope, $http, Random) {
		

		$scope.init = function(retrievedData) {
		
			$scope.obj = JSON.parse(retrievedData);
			console.log('$scope.obj', $scope.obj);
			
		
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
						axisLabel : '30 Days Time -> Thickness indicates the longest continuous sale',
						tickFormat : function(d) {
							return d3.time.format('%x')(new Date(d))

						},
						rotateLabels : 30,
						showMaxMin : false
					},
					yAxis : {
						axisLabel : 'Host Revenue',
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
						axisLabel : 'TIME',
						tickFormat : function(d) {
							return d3.time.format('%x')(new Date(d))

						},
						rotateLabels : 30,
						showMaxMin : false
					},
					yAxis : {
						axisLabel : 'REVENUE',
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


			$scope.arr = [];
			
			
			for(var k = 0 ; k < $scope.obj[2].length; k++){
				$scope.arr.push([new Date($scope.obj[2][k].checkin).getTime() , ($scope.obj[2][k].revenue) * 100000]);
			}		
			

			$scope.data = [{
							    "key" : "Quantity" ,
							    "bar": true,
							    "values" : $scope.arr
							}];


			};

	})
	.controller('parentController', function($scope) {
		$scope.init = function(retrievedData) {
			$scope.chartData = JSON.parse(retrievedData);
			console.log('$scope.chartData', $scope.chartData);
		};
	})
	.controller('adminPieController', function($scope) {
		
		$scope.arr = [];
	
		if($scope.$parent.chartData && $scope.$parent.chartData.length > 0) {
			for(var k = 0 ; k < $scope.$parent.chartData[0].length; k++) {
				$scope.arr.push({ "key" : $scope.$parent.chartData[0][k].property_id , "y" : $scope.$parent.chartData[0][k].revenue});
			}
		}		
	
		

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

		$scope.data = $scope.arr;


	})
	.controller('cityWisePieController', function($scope) {
		
		$scope.arr = [];
	
		for(var k = 0 ; k < $scope.$parent.chartData[1].length; k++) {
			$scope.arr.push({ "key" : $scope.$parent.chartData[1][k].city , "y" : $scope.$parent.chartData[1][k].revenue});
		}		
	
		

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

		$scope.data = $scope.arr;


	})
	.controller('TopTenMonthPieController', function($scope) {
		
		$scope.arr = [];
	
		for(var k = 0 ; k < $scope.$parent.chartData[2].length; k++) {
			$scope.arr.push({ "key" : $scope.$parent.chartData[2][k].owner_id , "y" : $scope.$parent.chartData[2][k].revenue});
		}		
	
		

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

		$scope.data = $scope.arr;


	})
