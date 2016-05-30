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
        $this->data['head']    = $this->parser->parse("admin/common/head_inc", $this->data, true);
        $this->data['footer']  = $this->parser->parse("admin/common/footer_inc", $this->data, true);
        $this->data['menu']    = $this->parser->parse("admin/common/menu_inc", $this->data, true);
        $this->data['header']  = $this->parser->parse("admin/common/header_inc", $this->data, true);
        $this->data['sidebar'] = $this->parser->parse("admin/common/sidebar_inc", $this->data, true);
        
        $this->data['titulo'] = $this->data['site_name'];

        $this->sesion      = $this->system_model->chequearSesion();
        $this->isAdmin     = $this->system_model->isAdmin();
        $this->isModerator = $this->system_model->isModerator();
        $this->isUser      = $this->system_model->isUser();

        if($this->sesion){
            $userdata   = $this->users_model->getUsuario($this->session->userdata("userId"));
            $this->data["log_nombre"]   = $userdata["nombre_usuario"];
            $this->data["log_apellido"] = $userdata["apellido_usuario"];
            $this->data["log_rango"]    = $userdata["rango"];
            $this->data["log_desde"]    = $userdata["desde"];
            $this->data["log_nick"]     = $userdata["nick_usuario"];
        }

        $this->data["esAdmin"] = ($this->isAdmin) ? array(array()) : array();
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

    function agregarCategoria(){
        if($this->sesion && $this->isAdmin){
            $this->parser->parse("admin/categorias/agregar_categorias_view", $this->data);
        }else{
            redirect($this->data["base_url"]."admin/login");
        }
    }

    function agregarProducto(){
        if($this->sesion && $this->isAdmin){
            $categorias = $this->categories_model->getCategorias(1);
            $monedas    = $this->cash_model->getMonedas(1);

            $this->data["categorias"] = $categorias;
            $this->data["monedas"]    = $monedas;

            $this->parser->parse("admin/productos/agregar_productos_view", $this->data);
        }else{
            redirect($this->data["base_url"]."admin/login");
        }
    }

    function agregarSubcategoria(){
        if($this->sesion && ($this->isAdmin || $this->isModerator)){
            $categorias = $this->categories_model->getCategorias();

            $this->data["categorias"] = $categorias;

            $this->parser->parse("admin/subcategorias/agregar_subcategorias_view", $this->data);
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

    function listarProductos($nPagina = 1){
        if($this->sesion && ($this->isAdmin || $this->isModerator)){
            $productos      = $this->products_model->getProductos($nPagina);
            $totalProductos = $this->products_model->contarProductos();

            $totalPaginas = $totalProductos / $this->config->item("limiteProductos");
            $totalPaginas = (is_double($totalPaginas)) ? floor($totalPaginas) + 1 : $totalPaginas;

            $this->data["productos"] = array();
            $this->data["paginador"] = array();

            if($totalPaginas > 0){
                $this->data["productos"] = $productos;
                $this->data["paginador"] = $this->paginator_model->generarPaginador($nPagina, $totalPaginas);
            }
        
            $this->parser->parse("admin/productos/listar_productos_view", $this->data);
        }else{
            redirect($this->data["base_url"]."admin/login");
        }
    }

    function editarProducto($idProducto){
        if($this->sesion && ($this->isAdmin || $this->isModerator)){
            if($this->products_model->validarProducto($idProducto)){
                $this->data["producto"] = array();
                $this->data["ejecutar"] = array();
                $producto = $this->products_model->getProducto($idProducto);


                $categorias = $this->categories_model->getCategorias(1);
                $monedas    = $this->cash_model->getMonedas(1);

                $this->data["categorias"] = $categorias;
                $this->data["monedas"]    = $monedas;

                foreach ($this->data["categorias"] as $key => $value) {
                    $this->data["categorias"][$key]["selected"] = ($this->data["categorias"][$key]["id_categoria"] == $producto["categoria_producto"]) ? 'selected=\"selected\"' : '';
                }

                foreach ($this->data["monedas"] as $key => $value) {
                    $this->data["monedas"][$key]["selected"] = ($this->data["monedas"][$key]["id_moneda"] == $producto["moneda_producto"]) ? 'selected=\"selected\"' : '';
                }

                if(!empty($producto)){
                    $this->data["subcategoria_producto"] = $producto["subcategoria_producto"];
                    $this->data["producto"][0] = $producto;
                    $this->data["ejecutar"] = array(array());
                }

                $this->parser->parse("admin/productos/editar_producto_view", $this->data);
            }else{
                redirect($this->data["base_url"]."admin/productos/listar");
            }
        }else{
            redirect($this->data["base_url"]."admin/login");
        }
    }

    function listarSubcategoria(){
    	if($this->sesion && ($this->isAdmin || $this->isModerator)){
            $categorias    = $this->categories_model->getCategorias(1);
    		$subcategorias = $this->subcategories_model->getSubcategorias();

            $this->data["categorias"]    = $categorias;
    		$this->data["subcategorias"] = $subcategorias;

    		$this->parser->parse("admin/subcategorias/listar_subcategorias_view", $this->data);
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