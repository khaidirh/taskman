<?php
 	require_once("Rest.inc.php");
	
	class API extends REST {
	
		// Variables
		public $data = "";

		const DB_SERVER = "localhost";
		const DB_USER = "root";
		const DB_PASSWORD = "";
		const DB = "angular_test";

		private $db = NULL;
		private $mysqli = NULL;
		public function __construct() {
			parent::__construct();
			$this->dbConnect();	
		}
		
		// Initialization
		public function init() {
			$func = strtolower(trim(str_replace("/","",$_REQUEST["x"])));
			if((int)method_exists($this,$func) > 0) $this->$func();
			else $this->response("",404);
		}

		// Utility Functions
		private function jsonify($data) { if(is_array($data)) return json_encode($data); }
		private function checkSha1($s) { if(preg_match("/^[A-Fa-f0-9]{40}$/", $s) > 0) return true; return false; }

		// Database Functions
		private function dbConnect() { $this->mysqli = new mysqli(self::DB_SERVER, self::DB_USER, self::DB_PASSWORD, self::DB); }
		private function parseQuery($query) {
			$r = $this->mysqli->query($query) or die($this->mysqli->error.__LINE__);
			if($r->num_rows > 0){
				$result = array();
				while($row = $r->fetch_assoc()) $result[] = $row;
				$this->response($this->jsonify($result), 200);
			}
			$this->response("",204);
		}
		private function getParsedQuery($query) {
			$r = $this->mysqli->query($query) or die($this->mysqli->error.__LINE__);
			if($r->num_rows > 0){
				$result = array();
				while($row = $r->fetch_assoc()) $result[] = $row;
				return $this->jsonify($result);
			}
			return null;
		}
		private function getUnParsedQuery($query) {
			$r = $this->mysqli->query($query) or die($this->mysqli->error.__LINE__);
			if($r->num_rows > 0){
				$result = array();
				while($row = $r->fetch_assoc()) $result[] = $row;
				return $result;
			}
			return null;
		}

		// API Functions
		private function authenticateUser($user, $pass) {
			if ($this->checkSha1($user) && $this->checkSha1($pass)) {
				$query = "SELECT u.* FROM admin u WHERE SHA1(BINARY u.admin_username)='".$user."'";
				$result = $this->getUnParsedQuery($query);
				if ($result) {
					$stored_pass = $result[0]["admin_password"];
					if ($pass == $stored_pass) return $result;
					echo "Error: Password does not match.";
					return null;
				}
			}
		}
		private function loginUser() {
			$user = $_GET["user"];
			$pass = $_GET["pass"];
			$result = $this->authenticateUser($user, $pass) or die(" Failed to login.");
			if ($result)
				$this->response($this->jsonify($result), 200);
			echo "Error: Incorrect parameters." . $_SERVER["REQUEST_URI"];
			return false;
		}
		private function getUsers() {
			$this->check_request_method();
			$query = "SELECT u.admin_firstname,
				u.admin_lastname,
				u.admin_username,
				u.admin_email,
				u.admin_phone,
				u.admin_title FROM admin u";
			$this->parseQuery($query);
		}
		private function getTasks() {	
			$this->check_request_method();
			$query = "SELECT t.* FROM taskman t";
			$this->parseQuery($query);
		}
		private function setTask() {
			$postdata = file_get_contents("php://input");
			$result = $this->mysqli->query("SELECT COUNT(*) AS taskCount FROM taskman");
			$row = $result->fetch_assoc();
			$count = $row["taskCount"];
			$result->close();
			$stmt = $this->mysqli->prepare("INSERT INTO taskman
				(task_id, task_assigned_to, task_assigned_by, task_date_assigned, task_date_due, task_priority_level, task_type, task_content )
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
			if ($stmt) {
				$stmt->bind_param("issssiss",
					$task_id,
					$task_assigned_to,
					$task_assigned_by,
					$task_date_assigned,
					$task_date_due,
					$task_priority_level,
					$task_type,
					$task_content);
				$r = json_decode($postdata);
				$task_id = $count + 1;
				$task_assigned_to = $r->assignedTo;
				$task_assigned_by = $r->assignedBy;
				$task_date_assigned = $r->dateAssigned;
				$task_date_due = $r->dateDue;
				$task_priority_level = $r->priorityLevel;
				$task_type = $r->type;
				$task_content = $r->content;
				//$client_id = $request->id;
				//$user = $request->last_edited_by;
				//$date = $request->last_edited_date;
				//$data_json = $data;
				if ($stmt->execute()) echo "Change added to revision history: " . $revision_id . ". ";
				else echo "Fail!";
				$this->mysqli->commit();
				$stmt->close();
			} else echo "Failed to add update to revision history. ";
		}
	}

	$api = new API;
	$api->init();

?>