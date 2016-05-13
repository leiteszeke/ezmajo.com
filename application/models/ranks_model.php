<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Ranks_model extends CI_Model{     
		function Ranks_model(){
	        parent::__construct();
		}

		function getRango($id_rango){
			if($this->validarRango($id_rango)){
				$sql = "SELECT id_rango, nombre_rango, creacion_rango, modificacion_rango, estado_rango FROM rangos WHERE id_rango = ".$this->db->escape($id_rango).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$rango = $qry->row_array();

					$rango["cantidad_usuarios"] = $this->users_model->contarUsuariosPorRango($rango["id_rango"]);

					$resp = $rango;
				}else{
					$resp = array();
				}
			}else{
				$resp = array();
			}

			return $resp;
		}

		function getRangos($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_rango = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_rango, nombre_rango, creacion_rango, modificacion_rango, estado_rango FROM rangos WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$rangos = $qry->result_array();

				foreach ($rangos as $key => $value) {
					$rangos[$key]["estado"] = ($rangos[$key]["estado_rango"] == 1) ? "Habilitado" : "Deshabilitado";
					$rangos[$key]["color"]  = ($rangos[$key]["estado_rango"] == 1) ? "warning" : "success";
					$rangos[$key]["icono"]  = ($rangos[$key]["estado_rango"] == 1) ? "remove" : "check";
					$rangos[$key]["cantidad_usuarios"] = $this->users_model->contarUsuariosPorRango($rangos[$key]["id_rango"]);
				}

				$resp = $rangos;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function crearRango($nombre_rango){
			if(!$this->validarRangoPorNombre($nombre_rango)){
				$fecha = $this->date_model->getDate();

				$sql = "INSERT INTO rangos(nombre_rango, creacion_rango) VALUES(".$this->db->escape($nombre_rango).", ".$this->db->escape($fecha).");";
				$qry = $this->db->query($sql);

				if($this->db->insert_id() > 0){
					$resp = array("error" => false, "message" => "El rango ha sido creado correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido crear el rango.");
				}
			}else{
				$resp = array("error" => true, "message" => "Ya existe un rango con este nombre.");
			}

			return $resp;
		}

		function editarRango($id_rango, $nombre_rango){
			if($this->validarRango($id_rango)){
				$fecha = $this->date_model->getDate();

				$sql = "UPDATE rangos SET nombre_rango = ".$this->db->escape($nombre_rango).", modificacion_rango = ".$this->db->escape($fecha)." WHERE id_rango = ".$this->db->escape($id_rango).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "El rango ha sido modificado.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido modificar el rango.");
				}
			}else{
				$resp = array("error" => true, "message" => "No existe este rango.");
			}

			return $resp;
		}

		function borrarRango($id_rango){
			if($this->validarRango($id_rango)){
				$sql = "DELETE FROM rangos WHERE id_rango = ".$this->db->escape($id_rango).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					return true;
				}else{
					return false;
				}
			}
		}

		function cambiarEstado($id_rango){
			if($this->validarRango($id_rango)){
				$rango = $this->getRango($id_rango);

				$estado = (isset($rango["estado_rango"]) && $rango["estado_rango"] == 0) ? 1 : 0 ;

				$sql = "UPDATE rangos SET estado_rango = ".$this->db->escape($estado)." WHERE id_rango = ".$this->db->escape($id_rango).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "El estado ha sido actualizado.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido actualizar el estado.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontado el rango seleccionado.");
			}

			return $resp;
		}

		function validarRango($id_rango, $estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_rango = ".$this->db->escape($id_rango)."";
			}

			$sql = "SELECT id_rango FROM rangos WHERE id_rango = ".$this->db->escape($id_rango)." ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}

		function validarRangoPorNombre($nombre_rango){
			$sql = "SELECT id_rango FROM rangos WHERE nombre_rango = ".$this->db->escape($nombre_rango).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}
	}
?>