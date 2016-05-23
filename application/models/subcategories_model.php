<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Subcategories_model extends CI_Model{     
		function Subcategories_model(){
	        parent::__construct();
		}

		function getSubcategoria($id_subcategoria){
			if($this->validarSubcategoria($id_subcategoria)){
				$sql = "SELECT * FROM subcategorias WHERE id_subcategoria = ".$this->db->escape($id_subcategoria).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$subcategoria = $qry->row_array();

					$resp = $subcategoria;
				}else{
					$resp = array();
				}
			}else{
				$resp = array();
			}

			return $resp;
		}

		function getSubcategorias($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND publicado = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT * FROM subcategorias WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$subcategorias = $qry->result_array();

				foreach ($subcategorias as $key => $value) {
					$categoria = $this->categories_model->getCategoria($subcategorias[$key]["id_categoria"]);

					$subcategorias[$key]["nombre_categoria"] = (!empty($categoria)) ? $categoria["nombre_categoria"] : ""; 
					$subcategorias[$key]["estado"] = ($subcategorias[$key]["estado_subcategoria"] == 1) ? "Habilitado" : "Deshabilitado";
					$subcategorias[$key]["color"]  = ($subcategorias[$key]["estado_subcategoria"] == 1) ? "warning" : "success";
					$subcategorias[$key]["icono"]  = ($subcategorias[$key]["estado_subcategoria"] == 1) ? "remove" : "check";
				}

				$resp = $subcategorias;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function crearSubcategoria($nombre, $id_categoria){
			if($this->categories_model->validarCategoria($id_categoria)){
				if(!$this->validarSubcategoriaByNombre($id_categoria, $nombre)){
					$fechaHoy = $this->date_model->getDate();

					$sql = "INSERT INTO subcategorias(id_categoria, nombre_categoria, creacion_categoria) VALUES(".$this->db->escape($id_categoria).", ".$this->db->escape($nombre).", ".$this->db->escape($fechaHoy).");";
					$qry = $this->db->query($sql);

					if($this->db->insert_id() > 0){
						$resp = array("error" => false, "message" => "La subcategoria ha sido creada correctamente.");
					}else{
						$resp = array("error" => true, "message" => "No se ha podido crear la subcategoria.");
					}
				}else{
					$resp = array("error" => true, "message" => "Ya existe una subcategoria con este nombre para esta categoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "La categoria padre es inexistente.");
			}

			return $resp;
		}

		function cambiarEstado($id_subcategoria){
			if($this->validarSubcategoria($id_subcategoria)){
				$subcategoria = $this->getSubcategoria($id_subcategoria);

				if(!empty($subcategoria)){
					$estado = ($subcategoria["estado_subcategoria"] == 0) ? 1 : 0;

					$sql = "UPDATE subcategorias SET estado_subcategoria = ".$this->db->escape($estado)." WHERE id_subcategoria = ".$this->db->escape($id_subcategoria).";";
					$qry = $this->db->query($sql);

					if($this->db->affected_rows() > 0){
						$resp = array("error" => false, "message" => "El estado ha sido cambiado.");
					}else{
						$resp = array("error" => true, "message" => "No se ha podido cambiar el estado.");
					}
				}else{
					$resp = array("error" => true, "message" => "No se ha encontrado la subcategoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado la subcategoria.");
			}

			return $resp;
		}

		function editarSubcategoria($id_subcategoria, $nombre_subcategoria, $id_categoria){
			if($this->validarSubcategoria($id_subcategoria) && $this->categories_model->validarCategoria($id_categoria)){
				$fechaHoy = $this->date_model->getDate();

				$sql = "UPDATE subcategorias SET nombre_subcategoria = ".$this->db->escape($nombre_subcategoria).", id_categoria = ".$this->db->escape($id_categoria).", modificacion_subcategoria = ".$this->db->escape($fechaHoy)." WHERE id_subcategoria = ".$this->db->escape($id_subcategoria).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					$resp = array("error" => false, "message" => "La subcategoria ha sido modificada correctamente.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido modificar la subcategoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado la subcategoria.");
			}

			return $resp;
		}

		function borrarSubcategoria($id_subcategoria){
			if($this->validarSubcategoria($id_subcategoria)){
				$sql = "DELETE FROM subcategorias WHERE id_subcategoria = ".$this->db->escape($id_subcategoria).";";
				$qry = $this->db->query($sql);

				if($this->db->affected_rows() > 0){
					/*
					$productos = $this->products_model->getProductosBySubcategoria($id_subcategoria);

					$deshabilitarProductos = $this->products_model->deshabilitarProductos($productos);
					foreach ($productos as $key => $value) {
						$sql = "UPDATE productos SET estado_producto = '0' WHERE id_producto = ".$this->db->escape($productos[$key]["id_producto"].";";
						$qry = $this->db->query($sql);
					}
					*/
					$resp = array("error" => false, "message" => "La subcategoria ha sido borrada.");
				}else{
					$resp = array("error" => true, "message" => "No se ha podido borrar la subcategoria.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado la subcategoria.");
			}

			return $resp;
		}

		function getSubcategoriasByCategoria($id_categoria){
			if($this->categories_model->validarCategoria($id_categoria)){
				$sql = "SELECT * FROM subcategorias WHERE id_categoria = ".$this->db->escape($id_categoria).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$subcategorias = $qry->result_array();

					$resp = $subcategorias;
				}else{
					$resp = array();
				}
			}else{
				$resp = array();
			}

			return $resp;
		}

		function validarSubcategoria($id_subcategoria, $estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_subcategoria = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_subcategoria FROM subcategorias WHERE id_subcategoria = ".$this->db->escape($id_subcategoria)." ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}

		function validarSubcategoriaByNombre($id_categoria, $nombre){
			if($this->categories_model->validarCategoria($id_categoria)){
				$sql = "SELECT id_subcategoria FROM subcategorias WHERE id_categoria = ".$this->db->escape($id_categoria)." AND nombre_subcategoria = ".$this->db->escape($nombre).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					return true;
				}else{
					return false;
				}
			}else{
				return false;
			}
		}

		function getCantidadSubcategorias($id_categoria){
			$sql = "SELECT COUNT(id_subcategoria) AS cantidad FROM subcategorias WHERE id_categoria = ".$this->db->escape($id_categoria).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return $qry->row_array()["cantidad"];
			}else{
				return 0;
			}
		}
	}
?>