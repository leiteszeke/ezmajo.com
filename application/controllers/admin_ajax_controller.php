<?php

	class Admin_Ajax_controller extends CI_Controller {
	    private $data = array();

		function __construct(){ 
			parent::__construct();
	        
	        $this->data['base_url'] = $this->config->item('base_url');
		}

		function crearUsuario(){
			if($this->input->post()){
				$nombre     = $this->input->post("nombre");
				$apellido   = $this->input->post("apellido");
				$usuario    = $this->input->post("usuario");
				$email      = $this->input->post("email");
				$password   = $this->input->post("password");
				$nacimiento = $this->input->post("nacimiento");
				$rango      = $this->input->post("rango");
			
				$crearUsuario = $this->users_model->crearUsuario($nombre, $apellido, $usuario, $email, $password, $nacimiento, $rango);

				$resp = array("error" => $crearUsuario["error"], "message" => $crearUsuario["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getUsuario(){
			if($this->input->post()){
				$id_usuario = $this->input->post("id");
				
				$usuario = $this->users_model->getUsuario($id_usuario);
				$error = false;

				if(empty($usuario)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $usuario);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}	

		function borrarUsuario(){
			if($this->input->post()){
				$id_usuario = $this->input->post("id");
				
				$usuario = $this->users_model->borrarUsuario($id_usuario);

				$resp = array("error" => $usuario["error"], "message" => $usuario["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}	

		function editarUsuario(){
			if($this->input->post()){
				$id_usuario = $this->input->post("id");
				$nombre     = $this->input->post("nombre");
				$apellido   = $this->input->post("apellido");  
				$fecha      = $this->input->post("fecha");  
				$rango      = $this->input->post("rango"); 

				$editarUsuario = $this->users_model->editarUsuario($id_usuario, $nombre, $apellido, $fecha, $rango);

				$resp = array("error" => $editarUsuario["error"], "message" => $editarUsuario["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function cambiarEstado(){
			if($this->input->post()){
				$id    = $this->input->post("id");
				$tabla = $this->input->post("tabla");

				switch ($tabla) {
					case 'rangos':
						$estado = $this->ranks_model->cambiarEstado($id);
						break;
					case 'usuarios':
						$estado = $this->users_model->cambiarEstado($id);
						break;
					default:
						$estado = array("error" => true, "message" => "No se ha podido ejectuar la acción.");
						break;
				}

				$resp = array("error" => $estado["error"], "message" => $estado["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function editarRango(){
			if($this->input->post()){
				$id_rango     = $this->input->post("id");
				$nombre_rango = $this->input->post("nombre");

				$editarRango = $this->ranks_model->editarRango($id_rango, $nombre_rango);

				$resp = array("error" => $editarRango["error"], "message" => $editarRango["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function borrarRango(){
			if($this->input->post()){
				$id_rango = $this->input->post("id");

				$borrar = $this->ranks_model->borrarRango($id_rango);

				$resp = array("error" => $borrar["error"], "message" => $borrar["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getRango(){
			if($this->input->post()){
				$id_rango = $this->input->post("id");
				
				$rango = $this->ranks_model->getRango($id_rango);
				$error = false;

				if(empty($rango)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $rango);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function crearRango(){
			if($this->input->post()){
				$rango = $this->input->post("rango");

				$crearRango = $this->ranks_model->crearRango($rango);

				$resp = array("error" => $crearRango["error"], "message" => $crearRango["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function loginUser(){
			if($this->input->post()){
				$user = $this->input->post("user");
				$pass = $this->input->post("pass");

				$login = $this->users_model->loginUsuario($user, $pass);

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