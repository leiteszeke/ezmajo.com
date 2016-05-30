<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

	class Paginator_model extends CI_Model{     
		function Paginator_model(){
	        parent::__construct();
		}

		public function generarPaginador($nPagina, $totalPaginas, $url = false){
			$paginador = array();
			if($totalPaginas > 1){
				$linksPaginas = array(
					"base_url"     => $this->config->item("base_url"),
					"url"          => $url,
					"ultimaPagina" => $totalPaginas
				);
				$mostrarPrimera = ($nPagina > 6) ? array($linksPaginas) : array(); 
				$mostrarUltima  = ($totalPaginas > 6 && $nPagina < ($totalPaginas - 5)) ? array($linksPaginas) : array(); 
				
				$paginador = array(
					array(
						"base_url"       => $this->config->item("base_url"), 
						"ultimaPagina"   => $totalPaginas, 
						"mostrarPrimera" => $mostrarPrimera, 
						"mostrarUltima"  => $mostrarUltima
					)
				);
				$pag_inicio = (($nPagina - 5) > 0) ? $nPagina - 5 : 1;
				$pag_final  = (($nPagina + 5) <= $totalPaginas) ? $nPagina + 5 : $totalPaginas;
				$paginas    = array();
				for($i = $pag_inicio; $i <= $pag_final && $i <= $totalPaginas; $i++){
					$activo = ($i == $nPagina) ? "active" : "";
					$pagina = array(
						"base_url" => $this->config->item("base_url"), 
						"n_pagina" => $i, 
						"active"   => $activo,
						"url"      => $url
					);
					$paginas[] = $pagina;
				}
				
				$paginador[0]["paginas"] = $paginas;
			}
			return $paginador;
		}
	}
?>