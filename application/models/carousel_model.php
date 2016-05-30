<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Carousel_model extends CI_Model{     
		function Carousel_model(){
	        parent::__construct();
		}

		function getCarousel($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_carousel = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT * FROM carousel WHERE 1 ".$sql_add.";";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$carousel = $qry->result_array();

				$resp = $carousel;
			}else{
				$resp = array();
			}

			return $resp;
		}
	}
?>