<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class System_model extends CI_Model{     
		function System_model(){
	        parent::__construct();
		}

		function crearSesion($id_usuario, $rango_usuario){
			$log = array("sesion" => true, "userId" => $id_usuario, "rango" => $rango_usuario);

			$this->session->set_userdata($log);
		}

		function chequearSesion(){
			return ($this->session->userdata("sesion") === true) ? true : false ;
		}

		function isAdmin(){
			return ($this->session->userdata("rango") == 2) ? true : false ;
		}

		function isModerator(){
			return ($this->session->userdata("rango") == 3) ? true : false ;
		}

		function isUser(){
			return ($this->session->userdata("rango") == 4) ? true : false ;
		}
	}
?>