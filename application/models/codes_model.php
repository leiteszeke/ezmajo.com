<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Codes_model extends CI_Model{     
		function Codes_model(){
	        parent::__construct();
		}

		function generarCodigoRecuperacion($largo = 10){
			$codigo = "";
			$caracteres = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

			for($i = 0; $i < $largo; $i++){
				$rand = rand(0, strlen($caracteres));

				$codigo .= substr($caracteres, $rand, 1);
			}

			return $codigo;
		}

		function almacenarCodigoRecuperacion($id_usuario, $codigo){
			if($this->users_model->validarUsuario($id_usuario)){
				$fechaHoy         = date("Y-m-d H:i:s");
				$fechaVencimiento = date("Y-m-d H:i:s", strtotime('+30 minutes', strtotime($fechaHoy)));

				$sql = "INSERT INTO codigos_recupero(id_usuario, string_codigo, creacion_codigo, vencimiento_codigo) VALUES(".$this->db->escape($id_usuario).", ".$this->db->escape($codigo).", ".$this->db->escape($fechaHoy).", ".$this->db->escape($fechaVencimiento).");";
				$qry = $this->db->query($sql);

				if($this->db->insert_id() > 0){
					if($this->users_model->bloquearUsuario($id_usuario)){
						return true;
					}else{
						return false;
					}
				}else{
					return false;
				}
			}else{
				return false;
			}
		}

		function getCodigoByString($codigo){
			$sql = "SELECT * FROM codigos_recupero WHERE string_codigo = ".$this->db->escape($codigo).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$data_codigo = $qry->row_array();

				return $data_codigo;
			}else{
				return array();
			}
		}

		function bloquearCodigo($id_codigo){
			$sql = "UPDATE codigos_recupero SET estado_codigo = '0' WHERE id_codigo = ".$this->db->escape($id_codigo).";";
			$qry = $this->db->query($sql);

			if($qry){
				return true;
			}else{
				return false;
			}
		}

		function validarCodigo($codigo){
			$sql = "SELECT * FROM codigos_recupero WHERE string_codigo = ".$this->db->escape($codigo)." AND estado_codigo = '1';";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$data_codigo = $qry->row_array();
				$fechaHoy    = date("Y-m-d H:i:s");

				if(strtotime($fechaHoy) < strtotime($data_codigo["vencimiento_codigo"])){
					return true;
				}else{
					return false;
				}
			}else{
				return false;
			}
		}
	}
?>