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
	function add(list, user) {
			if (user.indexOf(" (") != -1) user = user.slice(0, user.indexOf(" ("));
			if (list.indexOf(user) === -1) {
				if (user.indexOf("pick a winner") === -1) list.push(user);
			} else return -1
			return 0;
	}
	return function($scope, $element) {
		$element.bind("change", function() {
			if (add($scope.addNew.task.assignedTo["users"], this.value) === -1)
				$scope.addNew.messages["errors"] = " You've already added " + this.value + ".";
			$scope.$apply();
		});
	};
});
app.directive("removeUser", function() {
	return function($scope, $element) {
		$element.bind("click", function() {
			var user = this.innerText;
			var list = $scope.addNew.task.assignedTo["users"];
			var n = list.indexOf(user);
			console.log(list, user, n);
			if (n != -1) {
				list.splice(n, 1);
				$scope.$apply();
			}
		});
	};
});
app.directive("toggleDate", function() {
	return function($scope, $element) {
		$element.bind("change", function() {
			function getDateOffset(days) {
				function getDaysInMonth (month, year) {
					year = year ? year : new Date().getYear();
					return new Date(year, month, 0).getDate();
				}
				var currentDate = new Date();
				var currentMonth = currentDate.getMonth()+1;
				var currentDay = currentDate.getDate();
				console.log(currentDay);
				var newDate = currentDate.getFullYear();
				var daysInMonth = getDaysInMonth(currentMonth);
				if (currentDay + days > daysInMonth) {
					var newOffset = daysInMonth - currentDay;
					console.log(daysInMonth, newOffset);
					if (currentMonth === 12) newDate += "-01";
					else newDate += "-" + (currentMonth + 1) + "-" + (0 + (days-newOffset));
				} else newDate += "-" + currentMonth + "-" + (currentDay + days);
				console.log(newDate);
			}
			var value = this.value;
			if (value.indexOf("pick a date") === -1) {
				var currentDate = new Date();
				var newDate = currentDate.getFullYear();
				switch (value) {
					case "Sometime in the future":
						$scope.addNew.task.dueDate = 0;
						break;
					case "A day from now":
						getDateOffset(1);
						break;
				}
				console.log(value);
				$scope.addNew.task.dateDue;
				console.log("ok");
			}
		})
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




