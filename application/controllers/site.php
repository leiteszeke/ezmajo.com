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

	function index(){	
		$this->parser->parse('site/home_view', $this->data);
	}
}
/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */