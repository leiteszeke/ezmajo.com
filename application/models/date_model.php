<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Date_model extends CI_Model{     
		function Date_model(){
	        parent::__construct();
		}

		function getDate($format = 'Y-m-d H:i:s'){
			return date($format);
		}
	}
?>