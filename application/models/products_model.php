<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Products_model extends CI_Model{     
		function Products_model(){
	        parent::__construct();
		}

		function getProductosBySubcategoria($id_categoria, $id_subcategoria){
			$sql = "SELECT * FROM productos WHERE id_categoria = ".$this->db->escape($id_categoria)." AND id_subcategoria = ".$this->db->escape($id_subcategoria).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$productos = $qry->result_array();

				$resp = $productos;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function crearProducto($nombre, $codigo, $moneda, $precio, $categoria, $subcategoria, $descripcion, $stock, $imagen){
			$sql = "INSERT INTO productos(nombre_producto, codigo_producto, moneda_producto, precio_producto, categoria_producto, subcategoria_producto, descripcion_producto, stock_producto) VALUES(".$this->db->escape($nombre).", ".$this->db->escape($codigo).", ".$this->db->escape($moneda).", ".$this->db->escape($precio).", ".$this->db->escape($categoria).", ".$this->db->escape($subcategoria).", ".$this->db->escape($descripcion).", ".$this->db->escape($stock).");";
			$qry = $this->db->query($sql);

			if($this->db->insert_id() > 0){
				$id_producto = $this->db->insert_id();

				if($imagen != false && !empty($imagen)){
					$imagen = $this->files_model->manipularArchivos($imagen);

					foreach ($imagen as $key => $value) {
						$this->files_model->subirArchivoProducto($id_producto, $imagen[$key]);
					}
				}

				$resp = array("error" => false, "message" => "El producto se ha creado correctamente.");
			}else{
				$resp = array("error" => true, "message" => "No se pudo crear el producto.");
			}
			
			return $resp;
		}
	}
?>