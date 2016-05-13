<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Admin extends CI_Controller {
    private $data;
    private $isAdmin;
    private $isModerator;
    private $isUser;
    private $sesion;

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

        $this->sesion      = $this->system_model->chequearSesion();
        $this->isAdmin     = $this->system_model->isAdmin();
        $this->isModerator = $this->system_model->isModerator();
        $this->isUser      = $this->system_model->isUser();
	}

	function index(){
		if($this->sesion){
			$this->parser->parse('admin/home_view', $this->data);
		}else{
			redirect($this->data["base_url"]."admin/login");
		}
	}

    function agregarRango(){
    	if($this->sesion && $this->isAdmin){
        	$this->parser->parse("admin/rangos/agregar_rango_view", $this->data);
        }else{
    		redirect($this->data["base_url"]."admin/login");
    	}	
    }

    function listarRango(){
		if($this->sesion && $this->isAdmin){
			$rangos = $this->ranks_model->getRangos();

			$this->data["rangos"] = $rangos;

		    $this->parser->parse("admin/rangos/listar_rangos_view", $this->data);
		}else{
    		redirect($this->data["base_url"]."admin/login");
    	}
    }

    function agregarUsuario(){
    	if($this->sesion && $this->isAdmin){
	    	$rangos = $this->ranks_model->getRangos(1);

	    	$this->data["rangos"] = $rangos;

	    	$this->parser->parse("admin/usuarios/agregar_usuarios_view", $this->data);
    	}else{
    		redirect($this->data["base_url"]."admin/login");
    	}
    }

    function listarUsuario(){
    	if($this->sesion && $this->isAdmin){
	    	$rangos   = $this->ranks_model->getRangos(1);
	    	$usuarios = $this->users_model->getUsuarios();

	    	$this->data["rangos"]   = $rangos;
	    	$this->data["usuarios"] = $usuarios;

	    	$this->parser->parse("admin/usuarios/listar_usuarios_view", $this->data);
    	}else{
    		redirect($this->data["base_url"]."admin/login");
    	}
    }

    function listarCategoria(){
    	if($this->sesion && ($this->isAdmin || $this->isModerator)){
    		$categorias = $this->categories_model->getCategorias();

    		$this->data["categorias"] = $categorias;

    		$this->parser->parse("admin/categorias/listar_categorias_view", $this->data);
    	}else{
    		redirect($this->data["base_url"]."admin/login");
    	}
    }

	function login(){
		if($this->sesion){
			redirect($this->data["base_url"]."admin");
		}else{
			$this->parser->parse("admin/login_view", $this->data);
		}
	}

	function recuperar(){
		if($this->sesion){
			redirect($this->data["base_url"]."admin");
		}else{
			$this->parser->parse("admin/recuperar_view", $this->data);
		}	
	}

	function salir(){
		if($this->sesion){
			$this->session->sess_destroy();
		}

		redirect($this->data["base_url"]."admin");
	}
}
/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */