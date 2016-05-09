<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Admin extends CI_Controller {
    private $data;

	function __construct(){
		parent::__construct();		
		
		// data basica
        $this->data['base_url']  = $this->config->item('base_url');
        $this->data['base_path'] = $this->config->item('base_path');
        $this->data['protocolo'] = $this->config->item('protocolo');
        $this->data['site_name'] = $this->config->item('site_name');

        // partes de la pagina 
        $this->data['head']   = $this->parser->parse("admin/common/head_inc", $this->data, true);
        $this->data['footer'] = $this->parser->parse("admin/common/footer_inc", $this->data, true);
        $this->data['menu']   = $this->parser->parse("admin/common/menu_inc", $this->data, true);
        
        $this->data['titulo'] = $this->data['site_name'];
        $this->data['sesion'] = $this->system_model->chequearSesion();
	}

	function index(){
		if($this->data["sesion"]){
			$this->parser->parse('admin/home_view', $this->data);
		}else{
			redirect($this->data["base_url"]."admin/login");
		}
	}

	function login(){
		if($this->data["sesion"]){
			redirect($this->data["base_url"]."admin");
		}else{
			$this->parser->parse("admin/login_view", $this->data);
		}
	}

	function recuperar(){
		if($this->data["sesion"]){
			redirect($this->data["base_url"]."admin");
		}else{
			$this->parser->parse("admin/recuperar_view", $this->data);
		}	
	}
}
/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */