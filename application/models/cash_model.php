<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Cash_model extends CI_Model{     
		function Cash_model(){
	        parent::__construct();
		}

		function getMonedas($estado = false){
			$sql_add = "";

			if($estado !== false && ($estado == 0 || $estado == 1)){
				$sql_add .= " AND estado_moneda = ".$this->db->escape($estado)."";
			}

			$sql = "SELECT * FROM monedas WHERE 1 ".$sql_add." ORDER BY tipo_moneda ASC;";
			$qry = $this->db->query($sql);

			if($qry->num_rows() > 0){
				$monedas = $qry->result_array();

				$resp = $monedas;
			}else{
				$resp = array();
			}

			return $resp;
		}
	}
?>