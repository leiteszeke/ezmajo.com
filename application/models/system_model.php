<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class System_model extends CI_Model{     
		function System_model(){
	        parent::__construct();
		}

		function crearSesion($id_usuario, $isAdmin = false){
			$log = array("sesion" => true, "userId" => $id_usuario, "isAdmin" => $isAdmin);

			$this->session->set_userdata($log);
		}

		function chequearSesion(){
			if($this->session->userdata("sesion") === true){
				return true;
			}else{
				return false;
			}
		}
	}
?>