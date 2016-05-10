<?php

class Ajax_controller extends CI_Controller {
    private $data = array();

	function __construct(){ 
		parent::__construct();
        
        $this->data['base_url'] = $this->config->item('base_url');
	}
}

// END OF FILE
?>