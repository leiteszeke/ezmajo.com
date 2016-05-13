<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Users_model extends CI_Model{     
		function Users_model(){
	        parent::__construct();
		}

		function getUsuario($id_usuario){
			if($this->validarUsuario($id_usuario)){
				$sql = "SELECT id_usuario, nombre_usuario, apellido_usuario, email_usuario, nick_usuario, password_usuario, rango_usuario, fecha_usuario, creacion_usuario, modificacion_usuario, estado_usuario FROM usuarios WHERE id_usuario = ".$this->db->escape($id_usuario).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$usuario = $qry->row_array();

					$usuario["fecha"]  = date("d/m/Y", strtotime($usuario["fecha_usuario"]));
					$usuario["rango"]  = $this->ranks_model->getRango($usuario["rango_usuario"])["nombre_rango"];
					$usuario["estado"] = ($usuario["estado_usuario"] == 1) ? "Habilitado" : "Deshabilitado";
					$usuario["color"]  = ($usuario["estado_usuario"] == 1) ? "warning" : "success";
					$usuario["icono"]  = ($usuario["estado_usuario"] == 1) ? "remove" : "check";

					$resp = $usuario;
				}else{
					$resp = array();
				}
			}else{
				$resp = array();
			}

			return $resp;
		}

		function getUsuarios($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $usuarios == 1)){
				$sql_add .= " AND estado_usuario = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_usuario, nombre_usuario, apellido_usuario, email_usuario, nick_usuario, password_usuario, rango_usuario, fecha_usuario, creacion_usuario, modificacion_usuario, estado_usuario FROM usuarios WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$usuarios = $qry->result_array();

				foreach ($usuarios as $key => $value) {
					$usuarios[$key]["fecha"]  = date("d/m/Y", strtotime($usuarios[$key]["fecha_usuario"]));
					$usuarios[$key]["rango"]  = $this->ranks_model->getRango($usuarios[$key]["rango_usuario"])["nombre_rango"];
					$usuarios[$key]["estado"] = ($usuarios[$key]["estado_usuario"] == 1) ? "Habilitado" : "Deshabilitado";
					$usuarios[$key]["color"]  = ($usuarios[$key]["estado_usuario"] == 1) ? "warning" : "success";
					$usuarios[$key]["icono"]  = ($usuarios[$key]["estado_usuario"] == 1) ? "remove" : "check";
				}

				$resp = $usuarios;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function crearUsuario($nombre, $apellido, $usuario, $email, $password, $nacimiento, $rango){
			if(!$this->validarEmail($email)){
				$fecha = $this->date_model->getDate();

				$sql = "INSERT INTO usuarios(nombre_usuario, apellido_usuario, nick_usuario, email_usuario, password_usuario, fecha_usuario, rango_usuario, creacion_usuario) VALUES(".$this->db->escape($nombre).", ".$this->db->escape($apellido).", ".$this->db->escape($usuario).", ".$this->db->escape($email).", ".$this->db->escape(md5($password)).", ".$this->db->escape($nacimiento).", ".$this->db->escape($rango).", ".$this->db->escape($fecha).");";
				$qry = $this->db->query($sql);

				if($this->db->insert_id() > 0){
					$resp = array("error" => false, "message" => "El usuario ha sido creado correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido crear el usuario.");
				}
			}else{
				$resp = array("error" => true, "message" => "Ya existe un usuario con este email.");
			}

			return $resp;
		}

		function cambiarEstado($id_usuario){
			if($this->validarUsuario($id_usuario)){
				$usuario = $this->getUsuario($id_usuario);

				$estado = (isset($usuario["estado_usuario"]) && $usuario["estado_usuario"] == 0) ? 1 : 0 ;

				$sql = "UPDATE usuarios SET estado_usuario = ".$this->db->escape($estado)." WHERE id_usuario = ".$this->db->escape($id_usuario).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "El estado ha sido actualizado.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido actualizar el estado.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontado el usuario seleccionado.");
			}

			return $resp;
		}

		function editarUsuario($id_usuario, $nombre, $apellido, $fecha, $rango){
			if($this->validarUsuario($id_usuario)){
				$fechaHoy = $this->date_model->getDate();

				$sql = "UPDATE usuarios SET nombre_usuario = ".$this->db->escape($nombre).", apellido_usuario = ".$this->db->escape($apellido).", fecha_usuario = ".$this->db->escape($fecha).", rango_usuario = ".$this->db->escape($rango).", modificacion_usuario = ".$this->db->escape($fechaHoy)." WHERE id_usuario = ".$this->db->escape($id_usuario).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "El usuario ha sido modificado correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido modificar el usuario.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado el usuario seleccionado.");
			}

			return $resp;
		}

		function borrarUsuario($id_usuario){
			if($this->validarUsuario($id_usuario)){
				$sql = "DELETE FROM usuarios WHERE id_usuario = ".$this->db->escape($id_usuario).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "El usuario ha sido borrado correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido borrar el usuario.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado el usuario seleccionado.");
			}

			return $resp;
		}

		function loginUsuario($user, $pass){
			$sql = "SELECT id_usuario, nick_usuario, password_usuario, rango_usuario, estado_usuario FROM usuarios WHERE nick_usuario = ".$this->db->escape($user)." AND estado_usuario = '1';";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$data = $qry->row_array();

				if(md5($pass) == $data["password_usuario"]){
					$this->system_model->crearSesion($data["id_usuario"], $data["rango_usuario"]);

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

		function contarUsuariosPorRango($id_rango){
			$sql = "SELECT COUNT(id_usuario) AS cantidad FROM usuarios WHERE rango_usuario = ".$this->db->escape($id_rango).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return $qry->row_array()["cantidad"];
			}else{
				return 0;
			}
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