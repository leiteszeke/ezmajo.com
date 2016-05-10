<?php

	class Admin_Ajax_controller extends CI_Controller {
	    private $data = array();

		function __construct(){ 
			parent::__construct();
	        
	        $this->data['base_url'] = $this->config->item('base_url');
		}

		function loginUser(){
			if($this->input->post()){
				$user = $this->input->post("user");
				$pass = $this->input->post("pass");

				$login = $this->users_model->loginUser($user, $pass, 1);

				$resp = array("error" => $login["error"], "message" => $login["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function recoverUser(){
			if($this->input->post()){
				$username = $this->input->post("user");

				$user = $this->users_model->getUsuarioByNick($username);

				if(!empty($user)){
					$recover = $this->users_model->recuperarContrasena($user["id_usuario"]);
				}else{
					$recover = array("error" => true, "message" => "No se ha encontrado al usuario.");
				}

				$resp = array("error" => $recover["error"], "message" => $recover["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}
	}

// END OF FILE
?>