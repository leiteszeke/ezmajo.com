<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Products_model extends CI_Model{     
		function Products_model(){
	        parent::__construct();
		}

		function getProducto($id_producto){
			$sql = "SELECT * FROM productos WHERE id_producto = ".$this->db->escape($id_producto).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$producto = $qry->row_array();

				$producto["archivos"] = $this->getArchivosProducto($producto["id_producto"]);

				$resp = $producto;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function getArchivoProducto($id_archivo){
			$sql = "SELECT * FROM imagenes_productos WHERE id_imagen = ".$this->db->escape($id_archivo).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$archivo = $qry->row_array();

				$resp = $archivo;
			}else{
				$resp = array();
			}
		
			return $resp;
		}

		function getArchivosProducto($id_producto){
			if($this->validarProducto($id_producto)){
				$sql = "SELECT * FROM imagenes_productos WHERE id_producto = ".$this->db->escape($id_producto).";";
				$qry = $this->db->query($sql);

				if($qry->num_rows() > 0){
					$archivos = $qry->result_array();

					$resp = $archivos;
				}else{
					$resp = array();
				}
			}else{
				$resp = array();
			}
		
			return $resp;
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

		function getProductos($inicio = false, $estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_producto = ".$this->db->escape($estado)."";
			}

			if($inicio !== false && $inicio > 0){
				$inicio = ($inicio - 1) * $this->config->item("limiteProductos");
				$sql_add .= " LIMIT ".$inicio.", ".$this->config->item("limiteProductos")."";
			}

			$sql = "SELECT * FROM productos WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$productos = $qry->result_array();
			
				foreach ($productos as $key => $value) {
					$categoria = $this->categories_model->getCategoria($productos[$key]["categoria_producto"]);
					if(!empty($categoria)){
						$subcategoria = $this->subcategories_model->getSubcategoria($productos[$key]["subcategoria_producto"]);
					}

					$productos[$key]["categoria"] = (isset($categoria["nombre_categoria"])) ? $categoria["nombre_categoria"] : "";
					$productos[$key]["subcategoria"] = (isset($subcategoria["nombre_subcategoria"])) ? " / " . $subcategoria["nombre_subcategoria"] : "";
					$productos[$key]["estado"] = ($productos[$key]["estado_producto"] == 1) ? "Habilitado" : "Deshabilitado";
					$productos[$key]["color"]  = ($productos[$key]["estado_producto"] == 1) ? "warning" : "success";
					$productos[$key]["icono"]  = ($productos[$key]["estado_producto"] == 1) ? "remove" : "check";
				}

				$resp = $productos;
			}else{
				$resp = array();
			}

			return $resp;
		}

		function contarProductos($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_producto = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT COUNT(id_producto) AS cantidadProductos FROM productos WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return $qry->row_array()["cantidadProductos"];
			}else{
				return 0;
			}
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

		function editarProducto($id, $nombre, $codigo, $moneda, $precio, $categoria, $subcategoria, $descripcion, $stock, $imagen){
			$sql = "UPDATE productos SET nombre_producto = ".$this->db->escape($nombre).", codigo_producto = ".$this->db->escape($codigo).", moneda_producto = ".$this->db->escape($moneda).", precio_producto = ".$this->db->escape($precio).", categoria_producto = ".$this->db->escape($categoria).", subcategoria_producto = ".$this->db->escape($subcategoria).", descripcion_producto = ".$this->db->escape($descripcion).", stock_producto = ".$this->db->escape($stock)." WHERE id_producto = ".$this->db->escape($id).";";
			$qry = $this->db->query($sql);

			if($this->db->affected_rows() > 0){
				if($imagen != false && !empty($imagen)){
					$imagen = $this->files_model->manipularArchivos($imagen);

					foreach ($imagen as $key => $value) {
						$this->files_model->subirArchivoProducto($id, $imagen[$key]);
					}
				}

				$resp = array("error" => false, "message" => "El producto se ha modificado correctamente.");
			}else{
				$resp = array("error" => true, "message" => "No se pudo editar el producto.");
			}
			
			return $resp;
		}

		function borrarProducto($id_producto){
			$sql = "DELETE FROM productos WHERE id_producto = ".$this->db->escape($id_producto).";";
			$qry = $this->db->query($sql);

			if($this->db->affected_rows() > 0){
				return true;
			}else{
				return false;
			}
		}

		function borrarArchivoProducto($id_archivo){
			$sql = "DELETE FROM imagenes_productos WHERE id_imagen = ".$this->db->escape($id_archivo).";";
			$qry = $this->db->query($sql);

			if($this->db->affected_rows() > 0){
				$archivo = $this->getArchivoProducto($id_archivo);

				if(!empty($archivo)){
					unlink($this->config->item("base_path")."data/upload/productos/".$archivo["archivo_imagen"]);
				}

				$resp = array("error" => false, "message" => "El archivo ha sido borrado.");
			}else{
				$resp = array("error" => true, "message" => "No se ha podido borrar el archivo.");
			}

			return $resp;
		}

		function cambiarEstado($id_producto){
			if($this->validarProducto($id_producto)){
				$producto = $this->getProducto($id_producto);

				if(!empty($producto)){
					$estado = ($producto["estado_producto"] == 0) ? 1 : 0;

					$sql = "UPDATE productos SET estado_producto = ".$this->db->escape($estado)." WHERE id_producto = ".$this->db->escape($id_producto).";";
					$qry = $this->db->query($sql);

					if($this->db->affected_rows() > 0){
						$resp = array("error" => false, "message" => "El estado ha sido cambiado.");
					}else{
						$resp = array("error" => true, "message" => "No se ha podido cambiar el estado.");
					}
				}else{
					$resp = array("error" => true, "message" => "No se ha encontrado el producto.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha encontrado el producto.");
			}

			return $resp;
		}

		function validarProducto($id_producto){
			$sql = "SELECT id_producto FROM productos WHERE id_producto = ".$this->db->escape($id_producto).";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				return true;
			}else{
				return false;
			}
		}
	}
?>