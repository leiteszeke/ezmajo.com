<?php

	class Admin_Ajax_controller extends CI_Controller {
	    private $data = array();

		function __construct(){ 
			parent::__construct();
	        
	        $this->data['base_url'] = $this->config->item('base_url');
		}

		function crearUsuario(){
			if($this->input->post()){
				$nombre     = $this->input->post("nombre");
				$apellido   = $this->input->post("apellido");
				$usuario    = $this->input->post("usuario");
				$email      = $this->input->post("email");
				$password   = $this->input->post("password");
				$nacimiento = $this->input->post("nacimiento");
				$rango      = $this->input->post("rango");
			
				$crearUsuario = $this->users_model->crearUsuario($nombre, $apellido, $usuario, $email, $password, $nacimiento, $rango);

				$resp = array("error" => $crearUsuario["error"], "message" => $crearUsuario["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getUsuario(){
			if($this->input->post()){
				$id_usuario = $this->input->post("id");
				
				$usuario = $this->users_model->getUsuario($id_usuario);
				$error = false;

				if(empty($usuario)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $usuario);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}	

		function borrarUsuario(){
			if($this->input->post()){
				$id_usuario = $this->input->post("id");
				
				$usuario = $this->users_model->borrarUsuario($id_usuario);

				$resp = array("error" => $usuario["error"], "message" => $usuario["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}	

		function editarUsuario(){
			if($this->input->post()){
				$id_usuario = $this->input->post("id");
				$nombre     = $this->input->post("nombre");
				$apellido   = $this->input->post("apellido");  
				$fecha      = $this->input->post("fecha");  
				$rango      = $this->input->post("rango"); 

				$editarUsuario = $this->users_model->editarUsuario($id_usuario, $nombre, $apellido, $fecha, $rango);

				$resp = array("error" => $editarUsuario["error"], "message" => $editarUsuario["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function crearProducto(){
			if($this->input->post()){
				$nombre       = $this->input->post("nombreProducto");
				$codigo       = $this->input->post("codigoProducto");
				$moneda       = $this->input->post("monedaProducto");
				$precio       = $this->input->post("precioProducto");
				$categoria    = $this->input->post("categoriaProducto");
				$subcategoria = $this->input->post("subcategoriaProducto");
				$descripcion  = $this->input->post("descripcionProducto");
				$stock        = $this->input->post("stockProducto");
				$imagen       = false;

				if(isset($_FILES["imagenProducto"]) && !empty($_FILES["imagenProducto"])){
					$imagen = $_FILES["imagenProducto"];
				}

				$producto = $this->products_model->crearProducto($nombre, $codigo, $moneda, $precio, $categoria, $subcategoria, $descripcion, $stock, $imagen);
			
				$resp = array("error" => $producto["error"], "message" => $producto["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function editarProducto(){
			if($this->input->post()){
				$id_categoria     = $this->input->post("id");
				$nombre_categoria = $this->input->post("nombre");

				$categoria = $this->categories_model->editarCategoria($id_categoria, $nombre_categoria);

				$resp = array("error" => $categoria["error"], "message" => $categoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function borrarProducto(){
			if($this->input->post()){
				$id_categoria = $this->input->post("id");

				$categoria = $this->categories_model->borrarCategoria($id_categoria);

				$resp = array("error" => $categoria["error"], "message" => $categoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getProducto(){
			if($this->input->post()){
				$id_categoria = $this->input->post("id");
				
				$categoria = $this->categories_model->getCategoria($id_categoria);
				$error     = false;

				if(empty($categoria)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $categoria);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function crearCategoria(){
			if($this->input->post()){
				$nombre = $this->input->post("nombre");

				$categoria = $this->categories_model->crearCategoria($nombre);
			
				$resp = array("error" => $categoria["error"], "message" => $categoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function editarCategoria(){
			if($this->input->post()){
				$id_categoria     = $this->input->post("id");
				$nombre_categoria = $this->input->post("nombre");

				$categoria = $this->categories_model->editarCategoria($id_categoria, $nombre_categoria);

				$resp = array("error" => $categoria["error"], "message" => $categoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function borrarCategoria(){
			if($this->input->post()){
				$id_categoria = $this->input->post("id");

				$categoria = $this->categories_model->borrarCategoria($id_categoria);

				$resp = array("error" => $categoria["error"], "message" => $categoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getCategoria(){
			if($this->input->post()){
				$id_categoria = $this->input->post("id");
				
				$categoria = $this->categories_model->getCategoria($id_categoria);
				$error     = false;

				if(empty($categoria)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $categoria);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function getSubcategorias(){
			if($this->input->post()){
				$id_categoria = $this->input->post("id_categoria");

				$subcategorias = $this->subcategories_model->getSubcategorias(1, $id_categoria);

				$error = true;
				if(!empty($subcategorias)){
					$error = false;
				}

				$resp = array("error" => $error, "message" => $subcategorias);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function crearSubcategoria(){
			if($this->input->post()){
				$nombre    = $this->input->post("nombre");
				$categoria = $this->input->post("categoria");

				$subcategoria = $this->subcategories_model->crearSubcategoria($nombre, $categoria);
			
				$resp = array("error" => $subcategoria["error"], "message" => $subcategoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function editarSubcategoria(){
			if($this->input->post()){
				$id_subcategoria     = $this->input->post("id");
				$nombre_subcategoria = $this->input->post("nombre");
				$id_categoria        = $this->input->post("categoria");

				$subcategoria = $this->subcategories_model->editarSubcategoria($id_subcategoria, $nombre_subcategoria, $id_categoria);

				$resp = array("error" => $subcategoria["error"], "message" => $subcategoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function borrarSubcategoria(){
			if($this->input->post()){
				$id_subcategoria = $this->input->post("id");

				$subcategoria = $this->subcategories_model->borrarSubcategoria($id_subcategoria);

				$resp = array("error" => $subcategoria["error"], "message" => $subcategoria["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getSubcategoria(){
			if($this->input->post()){
				$id_subcategoria = $this->input->post("id");
				
				$subcategoria = $this->subcategories_model->getSubcategoria($id_subcategoria);
				$error     = false;

				if(empty($subcategoria)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $subcategoria);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function editarRango(){
			if($this->input->post()){
				$id_rango     = $this->input->post("id");
				$nombre_rango = $this->input->post("nombre");

				$editarRango = $this->ranks_model->editarRango($id_rango, $nombre_rango);

				$resp = array("error" => $editarRango["error"], "message" => $editarRango["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function borrarRango(){
			if($this->input->post()){
				$id_rango = $this->input->post("id");

				$borrar = $this->ranks_model->borrarRango($id_rango);

				$resp = array("error" => $borrar["error"], "message" => $borrar["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function getRango(){
			if($this->input->post()){
				$id_rango = $this->input->post("id");
				
				$rango = $this->ranks_model->getRango($id_rango);
				$error = false;

				if(empty($rango)){
					$error = true;
				}

				$resp = array("error" => $error, "message" => $rango);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function crearRango(){
			if($this->input->post()){
				$rango = $this->input->post("rango");

				$crearRango = $this->ranks_model->crearRango($rango);

				$resp = array("error" => $crearRango["error"], "message" => $crearRango["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		function cambiarEstado(){
			if($this->input->post()){
				$id    = $this->input->post("id");
				$tabla = $this->input->post("tabla");

				switch ($tabla) {
					case 'categorias':
						$estado = $this->categories_model->cambiarEstado($id);
						break;
					case 'rangos':
						$estado = $this->ranks_model->cambiarEstado($id);
						break;
					case 'subcategorias':
						$estado = $this->subcategories_model->cambiarEstado($id);
						break;
					case 'usuarios':
						$estado = $this->users_model->cambiarEstado($id);
						break;
					default:
						$estado = array("error" => true, "message" => "No se ha podido ejectuar la acción.");
						break;
				}

				$resp = array("error" => $estado["error"], "message" => $estado["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function loginUser(){
			if($this->input->post()){
				$user = $this->input->post("user");
				$pass = $this->input->post("pass");

				$login = $this->users_model->loginUsuario($user, $pass);

				$resp = array("error" => $login["error"], "message" => $login["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}

		function recoverUser(){
			if($this->input->post()){
				$username = $this->input->post("user");

				$user = $this->users_model->getUsuarioByNick($username);

				if(!empty($user)){
					$recover = $this->users_model->recuperarContrasena($user["id_usuario"]);
				}else{
					$recover = array("error" => true, "message" => "No se ha encontrado al usuario.");
				}

				$resp = array("error" => $recover["error"], "message" => $recover["message"]);
			}else{
				$resp = array("error" => true, "message" => "Acceso Denegado.");
			}

			echo json_encode($resp);
		}
	}

// END OF FILE
?>