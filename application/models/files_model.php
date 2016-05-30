<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Files_model extends CI_Model{     
		function Files_model(){
	        parent::__construct();
		}

		function manipularArchivos($archivos){
			$res = array();
			
			foreach ($archivos as $key => $value) {
				$archivo = $archivos[$key];
				$i = 0;
				foreach ($archivo as $key2 => $value) {
					$res[$key2][$key] = $value;
				}
			}
			
			return $res;
		}

		function subirArchivo($directorio, $archivo){
			$path         = $this->config->item("base_path")."data/upload/";
			$archivoFinal = array();

			if(!file_exists($path.$directorio)){
				mkdir($path.$directorio);
			}

			if(!empty($archivo)){
				$nombre = date("dmY_His")."_".$archivo["name"];

				if(move_uploaded_file($archivo["tmp_name"], $path.$directorio."/".$nombre)){
					$archivoFinal = array("nombre_original" => $archivo["name"], "tipo" => $archivo["type"], "peso" => $archivo["size"], "nombre" => $nombre);

					$resp = array("error" => false, "message" => $archivoFinal);
				}else{
					$resp = array("error" => true, "message" => "No se ha podido subir el archivo.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha recibido ningun archivo.");
			}	

			return $resp;
		}

		function subirArchivoProducto($id_producto, $archivo){
			$path         = $this->config->item("base_path")."data/upload/productos/";
			$archivoFinal = array();

			if(!file_exists($path)){
				mkdir($path);
			}

			if(!empty($archivo)){
				$ext = explode(".", $archivo["name"]);
				$ext = array_pop($ext);

				$nombre = $id_producto."_".date("dmY_His").".".$ext;

				if(move_uploaded_file($archivo["tmp_name"], $path.$nombre)){
					$archivoFinal = array("nombre_original" => $archivo["name"], "tipo" => $archivo["type"], "peso" => $archivo["size"], "nombre" => $nombre);
					$fechaHoy = $this->date_model->getDate();

					$sql = "INSERT INTO imagenes_productos(id_producto, nombre_imagen, archivo_imagen, tipo_imagen, peso_imagen, creacion_imagen) VALUES(".$this->db->escape($id_producto).", ".$this->db->escape($archivoFinal["nombre_original"]).", ".$this->db->escape($archivoFinal["nombre"]).", ".$this->db->escape($archivoFinal["tipo"]).", ".$this->db->escape($archivoFinal["peso"]).", ".$this->db->escape($fechaHoy).");";
					$qry = $this->db->query($sql);

					if($this->db->insert_id() > 0){
						$resp = array("error" => false, "message" => $archivoFinal);
					}else{
						$resp = array("error" => true, "message" => "No se ha podido subir la imagen.");
						unlink($path.$nombre);
					}
				}else{
					$resp = array("error" => true, "message" => "No se ha podido subir el archivo.");
				}
			}else{
				$resp = array("error" => true, "message" => "No se ha recibido ningun archivo.");
			}	

			return $resp;
		}
	}
?>