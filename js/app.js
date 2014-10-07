"use strict";

var app = angular.module("searchApp", [
	"uiControllers",
	"ngRoute",
	"ipCookie",
	"ui.bootstrap"
]);

app.factory("services", ["$http", function($http) {
	var serviceBase = "/taskman/services/";
	var obj = {};
	obj.getTasks = function() {
		return $http.get(serviceBase + "getTasks");
	};
	obj.setTask = function(data) {
		return $http.post(serviceBase + "setTask", data);
	}
	obj.getUsers = function() {
		return $http.get(serviceBase + "getUsers");
	};
	obj.loginUser = function(user,pass) {
		return $http.get(serviceBase + "loginUser?user=" + user + "&pass=" + pass);
	};
	return obj;	 
}]);

app.controller("listCtrl", function ($scope, $rootScope, services) {
	services.getUsers().then(function(data) {
		$scope.users = data.data;
	});
	services.getTasks().then(function(data) {
		$scope.tasks = data.data;
		var i = $scope.tasks.length;
		while (i--) {
			var t = $scope.tasks[i];
			var task = {
				id: t.task_id,
				assignedBy: t.task_assigned_by,
				assignedTo: JSON.parse(t.task_assigned_to),
				content: t.task_content,
				dateAssigned: t.task_date_assigned,
				dateDue: t.task_date_due,
				priorityLevel: t.task_priority_level,
				types: t.task_type
			};
			$scope.tasks[i] = task;
		}
	});
	$scope.addNew = {
		isCollapsed: true,
		task: {
			assignedTo: { "users": [] },
			assignedBy: $rootScope.currentUser.username,
			dateAssigned: getTimestamp(),
			dateDue: "",
			priorityLevel: 1,
			type: { "type": ["test"] },
			content: ""
		},
		messages: {
			"errors": []
		}
	};
	$scope.today = function() {
		$scope.dateDue = new Date();
	};
	$scope.today();
	function getTimestamp () {
		var currentDate = new Date();
		return currentDate.getFullYear() + "-" + (currentDate.getMonth()+1) + "-" + currentDate.getDate() + " " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
	}
	$scope.setTask = function() {
		//$scope.addNew.task.assignedTo = $scope.addNew.task.assignedTo.slice(0, $scope.addNew.task.assignedTo.indexOf(" ("));
		//$scope.addNew.task.assignedTo = $scope.addNew.task.assignedTo.split();
		console.log($scope.addNew.task);
		services.setTask($scope.addNew.task).then(function (data) {
			console.log(data);
		});
	}
});

app.controller("loginCtrl", function ($scope, $rootScope, $location, services, ipCookie) {
	$scope.login = function () {
		if ($scope.user && $scope.user.name && $scope.user.pass) {
			var user = CryptoJS.SHA1($scope.user.name);
			var pass = CryptoJS.SHA1($scope.user.pass);
			services.loginUser(user,pass).then(function(data) {
				var response = data.data[0];
				if (data.data != " Failed to login.") {
					var user = {
						level: response.admin_accesslevel,
						firstname: response.admin_firstname,
						lastname: response.admin_lastname,
						username: response.admin_username,
						id: response.admin_id,
						email: response.admin_email
					};
					$rootScope.currentUser = user;
					$rootScope.loggedIn = true;
					ipCookie("user", user);
					$scope.error = null;
					$location.path("/");
				} else $scope.error = "Invalid username or password. Check again?"
			});
		} else $scope.error = "Did you forget something?";
	};
	$scope.logout = function () {
		$rootScope.currentUser = null;
		$rootScope.loggedIn = false;
		ipCookie.remove("user");
		$location.path("/login");
	}
	if (ipCookie("user")) {
		$rootScope.currentUser = ipCookie("user");
		$rootScope.loggedIn = true;
	} else $rootScope.loggedIn = false;
});

app.directive("addUser", function() {
	return function($scope, $element) {
		$element.bind("change", function() {
			var user = this.value;
			if (user.indexOf(" (") != -1) user = user.slice(0, user.indexOf(" ("));
			var list = $scope.addNew.task.assignedTo["users"];
			if (list.indexOf(user) === -1) {
				if (user.indexOf("pick a winner") === -1) list.push(user);
			} else $scope.addNew.messages["errors"].push(" You've already added " + user + ".");
			$scope.$apply();
		});
	};
});
app.directive("removeUser", function() {
	return function($scope, $element) {
		$element.bind("click", function() {
			var list = $scope.addNew.task.assignedTo["users"];
			var n = list.indexOf(this.value);
			list.splice(n, 1);
			$scope.$apply();
		});
	};
});

app.config(["$routeProvider",
	function($routeProvider) {
	$routeProvider.
		when("/", {
			templateUrl: "partials/task.php",
			controller: "listCtrl"
		}).
		when("/login", {
			templateUrl: "partials/login.php",
			controller: "loginCtrl"
		})
		.otherwise({
			redirectTo: "/"
		});
}]);
app.run(function ($rootScope, $location, ipCookie) {
	$rootScope.$on("$routeChangeStart", function () {
		if (!$rootScope.currentUser) {
			var cookie = ipCookie("user");
			if (cookie) {
				$rootScope.currentUser = cookie;
			}
			else $location.path("login");
		}
	});
});




