<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Categories_model extends CI_Model{     
		function Categories_model(){
	        parent::__construct();
		}

		function getCategoria($id_categoria){
			if($this->validarCategoria($id_categoria)){
				$sql = "SELECT * FROM categorias WHERE id_categoria = ".$this->db->escape($id_categoria).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$categoria = $qry->row_array();

					$resp = $categoria;
				}else{
					$resp = array();
				}
			}else{
				$resp = array();
			}

			return $resp;
		}

		function getCategoriaPorLink($link_categoria){
			$sql = "SELECT * FROM categorias WHERE link_categoria = ".$this->db->escape($link_categoria).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$categoria = $qry->row_array();

				$resp = $categoria;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function getCategorias($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_categoria = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_categoria, nombre_categoria, link_categoria, creacion_categoria, modificacion_categoria, estado_categoria FROM categorias WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$categorias = $qry->result_array();

				foreach ($categorias as $key => $value) {
					$categorias[$key]["subcategorias"] = $this->subcategories_model->getCantidadSubcategorias($categorias[$key]["id_categoria"]);
					$categorias[$key]["estado"] = ($categorias[$key]["estado_categoria"] == 1) ? "Habilitado" : "Deshabilitado";
					$categorias[$key]["color"]  = ($categorias[$key]["estado_categoria"] == 1) ? "warning" : "success";
					$categorias[$key]["icono"]  = ($categorias[$key]["estado_categoria"] == 1) ? "remove" : "check";
				}

				$resp = $categorias;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function crearCategoria($nombre){
			if(!$this->validarCategoriaByNombre($nombre)){
				$fechaHoy = $this->date_model->getDate();

				$sql = "INSERT INTO categorias(nombre_categoria, creacion_categoria) VALUES(".$this->db->escape($nombre).", ".$this->db->escape($fechaHoy).");";
				$qry = $this->db->query($sql);

				if($this->db->insert_id() > 0){
					$resp = array("error" => false, "message" => "La categoria ha sido creada correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido crear la categoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "Ya existe una categoria con este nombre.");
			}

			return $resp;
		}

		function cambiarEstado($id_categoria){
			if($this->validarCategoria($id_categoria)){
				$categoria = $this->getCategoria($id_categoria);

				if(!empty($categoria)){
					$estado = ($categoria["estado_categoria"] == 0) ? 1 : 0;

					$sql = "UPDATE categorias SET estado_categoria = ".$this->db->escape($estado)." WHERE id_categoria = ".$this->db->escape($id_categoria).";";
					$qry = $this->db->query($sql);

					if($this->db->affected_rows() > 0){
						$resp = array("error" => false, "message" => "El estado ha sido cambiado.");
					}else{
						$resp = array("error" => true, "message" => "No se ha podido cambiar el estado.");
					}
				}else{
					$resp = array("error" => true, "message" => "No se ha encontrado la categoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado la categoria.");
			}

			return $resp;
		}

		function editarCategoria($id_categoria, $nombre_categoria){
			if($this->validarCategoria($id_categoria)){
				$fechaHoy = $this->date_model->getDate();

				$sql = "UPDATE categorias SET nombre_categoria = ".$this->db->escape($nombre_categoria).", modificacion_categoria = ".$this->db->escape($fechaHoy)." WHERE id_categoria = ".$this->db->escape($id_categoria).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "La categoria ha sido modificada correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido modificar la categoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado la categoria.");
			}

			return $resp;
		}

		function borrarCategoria($id_categoria){
			if($this->validarCategoria($id_categoria)){
				$sql = "DELETE FROM categorias WHERE id_categoria = ".$this->db->escape($id_categoria).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$subcategorias = $this->subcategorias_model->getSubcategoriasByCategoria($id_categoria);

					foreach ($subcategorias as $key => $value) {
						$this->subcategories_model->borrarSubcategoria($subcategorias[$key]["id_subcategoria"]);
					}
					
					$resp = array("error" => false, "message" => "La categoria ha sido borrada.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido borrar la categoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado la categoria.");
			}

			return $resp;
		}

		function validarCategoria($id_categoria, $estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_categoria = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_categoria FROM categorias WHERE id_categoria = ".$this->db->escape($id_categoria)." ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}

		function validarCategoriaByNombre($nombre){
			$sql = "SELECT id_categoria FROM categorias WHERE nombre_categoria = ".$this->db->escape($nombre).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}
	}
?>