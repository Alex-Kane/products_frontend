var productsApp = angular.module('productsApp', ['ngRoute', 'ngFlash']);

productsApp.config(['$routeProvider', '$locationProvider', function($routeProvide, $locationProvider) {
	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});
	$routeProvide
		.when('/', {
			templateUrl: 'views/main.html',
			controller: 'mainCtrl'
		})
		.when('/create_product', {
			templateUrl: 'views/products/form.html',
			controller: 'createProductCtrl'
		})
		.when('/edit_product/:productId', {
			templateUrl: 'views/products/form.html',
			controller: 'editProductCtrl'
		})
		.when('/login', {
			templateUrl: 'views/user/login_form.html',
			controller: 'loginCtrl'
		})
		.when('/signup', {
			templateUrl: 'views/user/signup_form.html',
			controller: 'signupCtrl'
		})
		.otherwise({
			redirectTo: '/'
		});
}]);

var SERVER_NAME = 'http://productsapi.frb.io/api/login_check';

productsApp.factory('$user', function($http) {
	var user = {};
	refreshUser();

	function refreshUser() {
		var config = {
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem('token')
			}
		};

		$http.get(SERVER_NAME + '/users/current', config).then(
			function success(response) {
				for (var key in response.data) {
					user[key] = response.data[key];
				}
			},
			function error(response) {
				flushUser();
			}
		);
	}

	function flushUser() {
		for (var key in user) {
			delete user[key];
		}
	}

	return {
		refresh: refreshUser,
		flush: flushUser,
		user: user
	};
});

productsApp.controller('navigationCtrl', function($scope, $user, $location) {
	$scope.user = $user.user;
	$scope.logout = function() {
		localStorage.removeItem('token');
		$user.flush();
		$location.url('/');
	};
});

productsApp.controller('mainCtrl', function($scope, $http, $user, Flash) {
	$scope.user = $user.user;
	$http.get(SERVER_NAME + '/products').then(
		function success(response) {
			$scope.products = response.data;
		}, function error(response) {
			$scope.products = [];
		}
	);

	$scope.deleteProduct = function(id) {
		var isSure = confirm('Are you sure?');
		if (isSure) {
			var config = {
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem('token')
				}
			};

			$http.delete(SERVER_NAME + '/products/' + id, config).then(
				function success(response) {
					$scope.products.forEach(function(item, i, arr) {
						if (item.id == id) {
							item.deleted = true;
						}
					});
					Flash.create('success', 'Product was deleted');
				}, function error(response) {
					Flash.create('danger', 'Product wasn\'t deleted');
				}
			);
		}
	}
});

productsApp.controller('createProductCtrl', function($scope, $http, $location, $user, Flash) {
	if ($user.user.id == undefined) {
		Flash.create('danger', 'You must be logged in to create products');
		$location.url('/login');
		return;
	}

	$scope.saveProduct = function() {
		var config = {
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem('token')
			}
		};

		$http.post(SERVER_NAME + '/products', $scope.product, config).then(
			function success(response) {
				Flash.create('success', 'Product was created');
				$location.url('/');
			},
			function error(response) {
				if (response.status == 400) {
					$scope.validationErrors = response.data.errors;
					return;
				}
				Flash.create('danger', 'Product wasn\'t saved');
			}
		);
	};
});

productsApp.controller('editProductCtrl', function($scope, $http, $routeParams, $location, $user, Flash) {
	if ($user.user.id == undefined) {
		Flash.create('danger', 'You must be logged in to edit products');
		$location.url('/login');
		return;
	}

	$http.get(SERVER_NAME + '/products/' + $routeParams.productId).then(
		function success(response) {
			if ($user.user.id == undefined || response.data.user.id != $user.user.id) {
				Flash.create('danger', 'You can\'t edit this product');
				$location.url('/');
				return;
			}
			$scope.product = response.data;
		}, function error(response) {
			Flash.create('danger', 'Can\'t load products info');
			$location.url('/');
		}
	);

	$scope.saveProduct = function() {
		var config = {
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem('token')
			}
		};

		$http.put(SERVER_NAME + '/products/' + $scope.product.id, $scope.product, config).then(
			function success(response) {
				Flash.create('success', 'Product was saved');
				$location.url('/');
			}, function error(response) {
				if (response.status == 400) {
					$scope.validationErrors = response.data.errors;
					return;
				}
				Flash.create('danger', 'Product wasn\'t saved');
			}
		);
	};
});

productsApp.controller('loginCtrl', function($scope, $http, $location, $user, Flash) {
	$scope.login = function() {
		$http.post(SERVER_NAME + '/login_check', $scope.user).then(
			function success(response) {
				localStorage.setItem('token', response.data.token);
				$user.refresh();
				Flash.create('success', 'You was successfully logged in');
				$location.url('/');
			}, function error(response) {
				if (response.status == 401) {
					$scope.validationErrors = [response.data.message];
					return;
				}
				Flash.create('danger', 'Can\'t log in user');
			}
		);
	};
});

productsApp.controller('signupCtrl', function($scope, $http, $location, Flash) {
	$scope.signup = function() {
		$http.post(SERVER_NAME + '/users', $scope.user).then(
			function success(response) {
				Flash.create('success', 'You was successfully signed up. Now you can log in');
				$location.url('/login');
			}, function error(response) {
				if (response.status == 400) {
					$scope.validationErrors = response.data.errors;
					return;
				}
				Flash.create('danger', 'Can\'t sign up user');
			}
		);
	};
});
