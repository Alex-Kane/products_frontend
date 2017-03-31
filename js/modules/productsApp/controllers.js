var productsApp = angular.module('productsApp', ['ui.router', 'ngFlash']);

productsApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});
	$stateProvider
		.state({
			name: 'main',
			url: '/',
			templateUrl: 'views/main.html',
			controller: 'mainCtrl'
		})
		.state({
			name: 'create_product',
			url: '/create_product',
			templateUrl: 'views/products/form.html',
			controller: 'createProductCtrl'
		})
		.state({
			name: 'edit_product',
			url: '/edit_product/{productId}',
			templateUrl: 'views/products/form.html',
			controller: 'editProductCtrl'
		})
		.state({
			name: 'login',
			url: '/login',
			templateUrl: 'views/user/login_form.html',
			controller: 'loginCtrl'
		})
		.state({
			name: 'signup',
			url: '/signup',
			templateUrl: 'views/user/signup_form.html',
			controller: 'signupCtrl'
		});
	$urlRouterProvider.otherwise('/');
});

var SERVER_NAME = 'http://localhost:8001/api';

productsApp.run(function($user) {
	$user.refresh();
});

productsApp.directive('appFile', function() {
	return {
		link: function (scope, elem, attrs) {
			elem.bind('change', function(event) {
				scope.$apply(function() {
					if (scope.product == undefined) {
						scope.product = {};
					}
					scope.product.picture = event.target.files[0];
				});
			});
		}
	};
});

productsApp.factory('$user', function($http, $rootScope) {
	var user = {};

	function refreshUser() {
		var config = {
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem('token')
			}
		};
		$rootScope.isAppInit = false;
		$http.get(SERVER_NAME + '/users/current', config).then(
			function success(response) {
				for (var key in response.data) {
					user[key] = response.data[key];
				}
				$rootScope.isAppInit = true;
			},
			function error(response) {
				flushUser();
				$rootScope.isAppInit = true;
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
							arr.splice(i, 1);
						}
					});
					Flash.create('success', 'Product was deleted');
				}, function error(response) {
					Flash.create('danger', 'Product wasn\'t deleted');
				}
			);
		}
	};

	var currentSortField = 'created_at';

	$scope.sortBy = function(field) {
		if (currentSortField == field) {
			$scope.products.reverse();
			return;
		}
		currentSortField = field;
		$scope.products.sort(function(a, b) {
			if (a[field] > b[field] || b[field] == null && a[field] != null) {
				return 1;
			}
			if (a[field] < b[field] || a[field] == null && b[field] != null) {
				return -1;
			}
			return 0;
		});
	};
});

productsApp.controller('createProductCtrl', function($scope, $http, $location, $user, Flash) {
	$scope.$watch('isAppInit', function() {
		if ($scope.isAppInit && $user.user.id == undefined) {
			Flash.create('danger', 'You must be logged in to create products');
			$location.url('/login');
		}
	});

	$scope.saveProduct = function() {
		var config = {
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem('token'),
				'Content-Type': undefined
			}
		};

		var form = new FormData();
		form.append('name', $scope.product.name);
		if ($scope.product.description != undefined) {
			form.append('description', $scope.product.description);
		}
		if ($scope.product.picture != undefined) {
			form.append('picture', $scope.product.picture);
		}

		$http.post(SERVER_NAME + '/products', form, config).then(
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

productsApp.controller('editProductCtrl', function($scope, $http, $stateParams, $location, $user, Flash) {
	$scope.$watch('isAppInit', function() {
		if ($scope.isAppInit && $user.user.id == undefined) {
			Flash.create('danger', 'You must be logged in to edit products');
			$location.url('/login');
		}
	});

	$http.get(SERVER_NAME + '/products/' + $stateParams.productId).then(
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
				'Authorization': 'Bearer ' + localStorage.getItem('token'),
				'Content-Type': undefined
			}
		};

		var form = new FormData();
		form.append('name', $scope.product.name);
		if ($scope.product.description != undefined) {
			form.append('description', $scope.product.description);
		}
		if ($scope.product.picture != undefined) {
			form.append('picture', $scope.product.picture);
		}
		form.append('_method', 'PUT');

		$http.post(SERVER_NAME + '/products/' + $scope.product.id, form, config).then(
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
	$scope.$watch('isAppInit', function() {
		if ($scope.isAppInit && $user.user.id != undefined) {
			Flash.create('danger', 'You are already logged in');
			$location.url('/');
		}
	});

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

productsApp.controller('signupCtrl', function($scope, $http, $location, $user, Flash) {
	$scope.$watch('isAppInit', function() {
		if ($scope.isAppInit && $user.user.id != undefined) {
			Flash.create('danger', 'You need log out first');
			$location.url('/');
		}
	});

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
