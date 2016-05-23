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
		$this->parser->parse('site/home_view', $this->data);
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