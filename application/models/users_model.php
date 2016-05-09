<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Users_model extends CI_Model{     
		function Users_model(){
	        parent::__construct();
		}

		function loginUsuario($user, $pass, $isAdmin = false){
			$sql_add = "";

			if($isAdmin !== false && $isAdmin == 1){
				$sql_add .= " AND rango_usuario = '1'";
			}

			$sql = "SELECT id_usuario, nick_usuario, password_usuario, rango_usuario, estado_usuario FROM usuarios WHERE nick_usuario = ".$this->db->escape($user)." ".$sql_add." AND estado_usuario = '1';";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$data = $qry->row_array();

				if(md5($pass) == $data["password_usuario"]){
					$this->system_model->crearSesion($data["id_usuario"], true);

					$resp = array("error" => false, "message" => "Te has logeado correctamente.");
				}else{
					$resp = array("error" => true, "message" => "La contraseña ingresada es incorrecta.");
				}
			}else{
				$resp = array("error" => true, "message" => "El usuario ingresado es inexistente o no esta habilitado para esta sección.");
			}

			return $resp;
		}

		function bloquearUsuario($id_usuario){
			if($this->validarUsuario($id_usuario)){
				$sql = "UPDATE usuarios SET estado_usuario = '0' WHERE id_usuario = ".$this->db->escape($id_usuario).";";
				$qry = $this->db->query($sql);

				if($qry){
					return true;
				}else{
					return false;
				}
			}else{
				return false;
			}
		}

		function getUsuarioByNick($username){
			if($this->validarUsername($username)){
				$sql = "SELECT * FROM usuarios WHERE nick_usuario = ".$this->db->escape($username).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() < 0){
					$user = $qry->row_array();

					return $user;
				}else{
					return array();
				}
			}else{
				return array();
			}
		}

		function recuperarContrasena($id_usuario){
			if($this->validarUsuario($id_usuario)){
				$sql = "SELECT id_usuario, nombre_usuario, apellido_usuario, email_usuario FROM usuarios WHERE id_usuario = ".$this->db->escape($id_usuario).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$user   = $qry->row_array();
					$codigo = $this->codes_model->generarCodigoRecuperacion();

					if($this->codes_model->almacenarCodigoRecuperacion($id_usuario, $codigo) && $this->mails_model->enviarRecuperacion($user, $codigo)){
						$resp = array("error" => false, "message" => "Se ha enviado un enlace para recuperar su contraseña al e-mail con el que se encuentra registrado.");
					}else{
						$resp = array("error" => true, "message" => "No se ha podido procesar tu pedido. Vuelve a intentar.");
					}
				}else{
					$resp = array("error" => true, "message" => "El usuario ingresado es inexistente.");
				}
			}else{
				$resp = array("error" => true, "message" => "El usuario ingresado es inexistente.");
			}

			return $resp;
		}

		function validarUsuario($id, $estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_usuario = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_usuario FROM usuarios WHERE id_usuario = ".$this->db->escape($id)." ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}

		function validarUsername($username){
			$sql = "SELECT id_usuario FROM usuarios WHERE nick_usuario = ".$this->db->escape($username).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}

		function validarEmail($email){
			$sql = "SELECT id_usuario FROM usuarios WHERE email_usuario = ".$this->db->escape($email).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}
	}
?>