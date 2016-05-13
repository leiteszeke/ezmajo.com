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

		function getCategorias($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_categoria = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT id_categoria, nombre_categoria, creacion_categoria, modificacion_categoria, estado_categoria FROM categorias WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$categorias = $qry->result_array();

				$resp = $categorias;
			}else{
				$resp = array();
			}
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
	}
?>