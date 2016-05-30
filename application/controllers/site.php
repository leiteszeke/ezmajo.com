<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Site extends CI_Controller {
    private $data;

	function __construct(){
		parent::__construct();		

		// data basica
        $this->data['base_url']  = $this->config->item('base_url');
        $this->data['protocolo'] = $this->config->item('protocolo');
        $this->data['site_name'] = $this->config->item('site_name');

        // partes de la pagina 
        $this->data['head']   = $this->parser->parse("site/common/head_inc", $this->data, true);
        $this->data['footer'] = $this->parser->parse("site/common/footer_inc", $this->data, true);
        $this->data['menu']   = $this->parser->parse("site/common/menu_inc", $this->data, true);
        
        $this->data['titulo'] = $this->data['site_name'];
	}

    function error_404(){
        $this->parser->parse('site/error404_view', $this->data);
    }

	function index(){
        $this->data["carousel"] = array();
        $this->data["categorias"] = array();

        $carousel = $this->carousel_model->getCarousel(1);
        $categorias = $this->categories_model->getCategorias(1);

        foreach ($categorias as $key => $value) {
            $categorias[$key]["subcategorias"] = array();

            $subcategorias = $this->subcategories_model->getSubcategorias(1, $categorias[$key]["id_categoria"]);

            if(!empty($subcategorias)){
                $categorias[$key]["subcategorias"][0]["items"] = $subcategorias;
            }
        }

        $this->data["categorias"] = $categorias;

        if(!empty($carousel)){
            foreach ($carousel as $key => $value) {
                $carousel[$key]["active"] = ($key == 0) ? "active" : "";
            }

            $this->data["carousel"][0]["items"] = $carousel;
            $this->data["carousel"][0]["bullets"] = $carousel;
        }

        $this->data["carouselHome"] = $this->parser->parse("site/common/carousel_inc", $this->data, true);
		$this->parser->parse('site/home_view', $this->data);
	}

    function mostrarSubcategoria($link_categoria, $link_subcategoria){
        if(!empty($categoria = $this->categories_model->getCategoriaPorLink($link_categoria))){
            if(!empty($subcategoria = $this->subcategories_model->getSubcategoriaPorLink($categoria["id_categoria"], $link_subcategoria))){
                $this->data["categorias"] = array();
                $this->data["productos"]  = array();

                $categorias = $this->categories_model->getCategorias(1);
                $productos  = $this->products_model->getProductos($categoria["id_categoria"], $subcategoria["id_subcategoria"]);

                foreach ($categorias as $key => $value) {
                    $categorias[$key]["subcategorias"] = array();

                    $subcategorias = $this->subcategories_model->getSubcategorias(1, $categorias[$key]["id_categoria"]);

                    if(!empty($subcategorias)){
                        $categorias[$key]["subcategorias"][0]["items"] = $subcategorias;
                    }
                }

                $this->data["categorias"] = $categorias;
                $this->data["productos"]  = $productos;

                $this->parser->parse("site/listado_productos_view", $this->data);
            }else{
                redirect($this->data["base_url"]);
            }
        }else{
            redirect($this->data["base_url"]);
        }
    }

    function test(){
        require_once($this->config->item("base_path")."libraries/MercadoPago/mercadopago.php");

        $mp = new MP($this->config->item("MercadoPagoAccessToken"));
        $mp->sandbox_mode(true);

        $items = array(
            "items" => array(
                array(
                    "title" => "Pelota", 
                    "quantity" => 1, 
                    "currency_id" => "USD", 
                    "unit_price" => 30.4
                ),
                array(
                    "title" => "Botines", 
                    "quantity" => 3, 
                    "currency_id" => "USD", 
                    "unit_price" => 22.4
                )
            )
        );

        $preference = $mp->create_preference($items);

        d($preference);
        echo '<a href="'.$preference["response"]["sandbox_init_point"].'">Pagar</a>';
    }
}
/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */